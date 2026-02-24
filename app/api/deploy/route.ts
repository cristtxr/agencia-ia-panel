import fs from "fs";
import path from "path";

const CLIENTES_DIR = path.join(process.cwd(), "..", "clientes");
const RETELL_BASE = "https://api.retellai.com";
const RETELL_KEY = process.env.RETELL_API_KEY!;
const N8N_BASE = process.env.N8N_BASE_URL!;
const N8N_KEY = process.env.N8N_API_KEY!;
const CALCOM_KEY = process.env.CALCOM_API_KEY!;

async function retellFetch(endpoint: string, method: string, body?: object) {
  const res = await fetch(`${RETELL_BASE}${endpoint}`, {
    method,
    headers: { Authorization: `Bearer ${RETELL_KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Retell ${endpoint}: ${res.status} - ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

async function n8nFetch(endpoint: string, method: string, body?: object) {
  const res = await fetch(`${N8N_BASE}/api/v1${endpoint}`, {
    method,
    headers: { "X-N8N-API-KEY": N8N_KEY, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`n8n ${endpoint}: ${res.status} - ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

async function calcomFetch(endpoint: string, method: string, body?: object) {
  const sep = endpoint.includes("?") ? "&" : "?";
  const res = await fetch(`https://api.cal.com/v1${endpoint}${sep}apiKey=${CALCOM_KEY}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Cal.com ${endpoint}: ${res.status} - ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

function leerConfig(slug: string) {
  return JSON.parse(fs.readFileSync(path.join(CLIENTES_DIR, slug, "config.json"), "utf-8"));
}

function guardarConfig(slug: string, config: object) {
  fs.writeFileSync(path.join(CLIENTES_DIR, slug, "config.json"), JSON.stringify(config, null, 2));
}

function buildCalcomTools(eventTypeId: number, duration: number) {
  return [
    {
      type: "custom",
      name: "check_availability",
      description: `Verifica horarios disponibles para agendar citas. Duracion: ${duration} minutos. Usala cuando el paciente quiera agendar.`,
      url: `https://api.cal.com/v1/slots/available?apiKey=${CALCOM_KEY}&eventTypeId=${eventTypeId}&startTime={{startTime}}&endTime={{endTime}}&timeZone=America/Bogota`,
      method: "GET",
      speak_during_execution: true,
      speak_after_execution: true,
      execution_message_description: "Revisando los horarios disponibles, un momento...",
    },
    {
      type: "custom",
      name: "book_appointment",
      description: "Agenda una cita cuando el paciente ya eligio fecha y hora. Necesitas nombre, telefono y horario.",
      url: `https://api.cal.com/v1/bookings?apiKey=${CALCOM_KEY}`,
      method: "POST",
      body: JSON.stringify({
        eventTypeId,
        start: "{{start}}",
        responses: { name: "{{name}}", email: "noreply@agencia.ia", smsReminderNumber: "{{phone}}", notes: "Agendado por asistente virtual" },
        timeZone: "America/Bogota",
        language: "es",
      }),
      speak_during_execution: true,
      speak_after_execution: true,
      execution_message_description: "Agendando tu cita...",
    },
  ];
}

function buildWorkflow(slug: string, negocio: string) {
  return {
    name: `Recepcionista ${negocio}`,
    nodes: [
      {
        id: "webhook-node", name: "Webhook Retell",
        type: "n8n-nodes-base.webhook", typeVersion: 2, position: [200, 300],
        parameters: { path: slug, httpMethod: "POST", responseMode: "responseNode" },
        webhookId: slug,
      },
      {
        id: "set-node", name: "Extraer Datos Llamada",
        type: "n8n-nodes-base.set", typeVersion: 3.4, position: [450, 300],
        parameters: {
          mode: "manual",
          fields: {
            values: [
              { name: "negocio",        type: "stringValue",  string: negocio },
              { name: "call_id",        type: "stringValue",  string: "={{ $json.call_id }}" },
              { name: "duracion_min",   type: "numberValue",  number: "={{ Math.round(($json.duration_ms||0)/60000*10)/10 }}" },
              { name: "telefono",       type: "stringValue",  string: "={{ $json.from_number }}" },
              { name: "nombre_cliente", type: "stringValue",  string: "={{ $json.call_analysis?.nombre_cliente_llamada || 'Desconocido' }}" },
              { name: "motivo",         type: "stringValue",  string: "={{ $json.call_analysis?.motivo || 'No especificado' }}" },
              { name: "resumen",        type: "stringValue",  string: "={{ $json.call_analysis?.call_summary || '' }}" },
              { name: "agenda_cita",    type: "booleanValue", boolean: "={{ $json.call_analysis?.agenda_exitosa || false }}" },
              { name: "sentimiento",    type: "stringValue",  string: "={{ $json.call_analysis?.user_sentiment || 'neutral' }}" },
            ],
          },
        },
      },
      {
        id: "respond-node", name: "Respuesta OK",
        type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1, position: [700, 300],
        parameters: {
          respondWith: "json",
          responseBody: '={ { "ok": true, "negocio": "{{ $json.negocio }}", "call_id": "{{ $json.call_id }}", "duracion": {{ $json.duracion_min }} } }',
        },
      },
    ],
    connections: {
      "Webhook Retell":        { main: [[{ node: "Extraer Datos Llamada", type: "main", index: 0 }]] },
      "Extraer Datos Llamada": { main: [[{ node: "Respuesta OK",          type: "main", index: 0 }]] },
    },
    settings: { executionOrder: "v1" },
  };
}

// ORDEN DE PASOS (resuelve dependencias):
// 1. Cal.com  → obtiene event_type_id ANTES de crear el agente
// 2. Retell   → usa event_type_id para incluir tools de Cal.com en el LLM
// 3. Numero   → requiere agent_id
// 4. n8n      → genera webhook_url
// 5. Vincular → actualiza agente con webhook_url

export async function POST(req: Request) {
  const body = await req.json();
  const { slug, prompt: promptEditado } = body;

  if (!slug) {
    return new Response(JSON.stringify({ error: "Falta el slug" }), { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        if (!fs.existsSync(path.join(CLIENTES_DIR, slug, "config.json"))) {
          send({ paso: 0, estado: "error", msg: `❌ Cliente no encontrado: ${slug}` });
          controller.close(); return;
        }

        // Guardar prompt editado si el usuario lo modifico
        if (promptEditado && promptEditado.trim()) {
          fs.writeFileSync(path.join(CLIENTES_DIR, slug, "prompt.md"), promptEditado);
        }

        let config = leerConfig(slug);
        const negocio = config.business_name;
        const prompt = fs.readFileSync(path.join(CLIENTES_DIR, slug, "prompt.md"), "utf-8");
        send({ paso: 0, estado: "ok", msg: `Iniciando despliegue: ${negocio}` });

        // ── PASO 1: Cal.com ──────────────────────────────────
        if (!config.calcom_habilitado) {
          send({ paso: 1, estado: "ok", msg: "✅ Cal.com desactivado para este cliente", saltado: true });
        } else if (config.calcom_event_type_id) {
          send({ paso: 1, estado: "ok", msg: `✅ Cal.com ya configurado: ${config.calcom_event_type_id}`, saltado: true });
        } else if (!CALCOM_KEY) {
          send({ paso: 1, estado: "error", msg: "❌ Falta CALCOM_API_KEY en .env.local" });
        } else {
          send({ paso: 1, estado: "corriendo", msg: "Configurando agendamiento en Cal.com..." });
          try {
            const calEvent = await calcomFetch("/event-types", "POST", {
              title: `Cita en ${negocio}`,
              slug: slug.replace(/_/g, "-"),
              length: config.appointment_duration || 30,
              description: `Cita agendada por la recepcionista virtual de ${negocio}`,
              hidden: false,
              locations: [{ type: "inPerson", address: config.address || "Consultar" }],
            });
            config.calcom_event_type_id = calEvent.event_type?.id || calEvent.id;
            guardarConfig(slug, config);
            send({ paso: 1, estado: "ok", msg: `✅ Cal.com configurado: ID ${config.calcom_event_type_id}` });
          } catch (e: any) {
            send({ paso: 1, estado: "error", msg: `❌ Cal.com: ${e.message}` });
          }
        }

        // ── PASO 2: Retell (con tools de Cal.com si disponibles) ──
        config = leerConfig(slug);
        if (config.agent_id) {
          send({ paso: 2, estado: "ok", msg: `✅ Agente ya existe: ${config.agent_id}`, saltado: true });
        } else {
          send({ paso: 2, estado: "corriendo", msg: "Creando agente en Retell AI..." });
          try {
            const tools: object[] = [];
            if (config.calcom_habilitado && config.calcom_event_type_id) {
              tools.push(...buildCalcomTools(config.calcom_event_type_id, config.appointment_duration || 30));
            }
            if (config.forwarding_number) {
              tools.push({
                type: "end_call",
                name: "transfer_call",
                description: `Transfiere a ${config.professional_name} (${config.forwarding_number}) cuando el cliente lo pida o sea emergencia.`,
              });
            }

            const llmPayload: Record<string, any> = { model: "gpt-4o", general_prompt: prompt };
            if (tools.length > 0) llmPayload.tools = tools;

            const llm = await retellFetch("/create-retell-llm", "POST", llmPayload);
            const agent = await retellFetch("/create-agent", "POST", {
              agent_name: config.agent_name || `Recepcionista ${negocio}`,
              response_engine: { type: "retell-llm", llm_id: llm.llm_id },
              voice_id: config.voice_id || "cartesia-Hailey-Spanish-latin-america",
              language: "es-419",
              ambient_sound: "coffee-shop",
              responsiveness: 1,
              interruption_sensitivity: 1,
              enable_backchannel: true,
              backchannel_frequency: 0.8,
              reminder_trigger_ms: 10000,
              reminder_max_count: 2,
              voicemail_detection_timeout_ms: 30000,
            });

            config.agent_id = agent.agent_id;
            config.llm_id = llm.llm_id;
            guardarConfig(slug, config);
            send({ paso: 2, estado: "ok", msg: `✅ Agente creado: ${agent.agent_id}`, agent_id: agent.agent_id });
          } catch (e: any) {
            send({ paso: 2, estado: "error", msg: `❌ Retell: ${e.message}` });
          }
        }

        // ── PASO 3: Numero telefonico ──────────────────────────
        config = leerConfig(slug);
        if (config.phone_number) {
          send({ paso: 3, estado: "ok", msg: `✅ Numero ya asignado: ${config.phone_number}`, saltado: true });
        } else if (config.comprar_numero && config.agent_id) {
          send({ paso: 3, estado: "corriendo", msg: "Comprando numero telefonico..." });
          try {
            const numero = await retellFetch("/create-phone-number", "POST", {
              area_code: config.area_code || 305,
              inbound_agent_id: config.agent_id,
              nickname: negocio,
            });
            config.phone_number = numero.phone_number;
            guardarConfig(slug, config);
            send({ paso: 3, estado: "ok", msg: `✅ Numero comprado: ${numero.phone_number}`, phone: numero.phone_number });
          } catch (e: any) {
            send({ paso: 3, estado: "error", msg: `❌ Numero: ${e.message}` });
          }
        } else {
          send({ paso: 3, estado: "ok", msg: "✅ Numero omitido (desvio activo o falta agent_id)", saltado: true });
        }

        // ── PASO 4: Workflow n8n ───────────────────────────────
        config = leerConfig(slug);
        if (config.n8n_workflow_id) {
          send({ paso: 4, estado: "ok", msg: `✅ Workflow ya existe: ${config.n8n_workflow_id}`, saltado: true });
        } else if (!N8N_BASE || !N8N_KEY) {
          send({ paso: 4, estado: "error", msg: "❌ Faltan N8N_BASE_URL o N8N_API_KEY en .env.local" });
        } else {
          send({ paso: 4, estado: "corriendo", msg: "Creando workflow en n8n..." });
          try {
            const wf = await n8nFetch("/workflows", "POST", buildWorkflow(slug, negocio));
            await n8nFetch(`/workflows/${wf.id}/activate`, "POST");
            config.n8n_workflow_id = wf.id;
            config.webhook_url = `${N8N_BASE}/webhook/${slug}`;
            guardarConfig(slug, config);
            send({ paso: 4, estado: "ok", msg: `✅ Workflow activo: ${wf.id}` });
          } catch (e: any) {
            send({ paso: 4, estado: "error", msg: `❌ n8n: ${e.message}` });
          }
        }

        // ── PASO 5: Vincular webhook ───────────────────────────
        config = leerConfig(slug);
        if (config.agent_id && config.webhook_url) {
          send({ paso: 5, estado: "corriendo", msg: "Vinculando webhook al agente..." });
          try {
            await retellFetch(`/update-agent/${config.agent_id}`, "PATCH", { webhook_url: config.webhook_url });
            send({ paso: 5, estado: "ok", msg: "✅ Webhook vinculado al agente" });
          } catch (e: any) {
            send({ paso: 5, estado: "error", msg: `❌ Vincular: ${e.message}` });
          }
        } else {
          send({ paso: 5, estado: "ok", msg: "✅ Vincular omitido (falta agent_id o webhook_url)", saltado: true });
        }

        // ── LISTO ──────────────────────────────────────────────
        config = leerConfig(slug);
        send({
          paso: 99, estado: "listo",
          msg: "🎉 Agente listo para recibir llamadas",
          resumen: {
            agent_id: config.agent_id,
            phone_number: config.phone_number,
            webhook_url: config.webhook_url,
            calcom_event_type_id: config.calcom_event_type_id,
            n8n_workflow_id: config.n8n_workflow_id,
          },
        });
      } catch (fatal: any) {
        send({ paso: -1, estado: "error", msg: `❌ Error fatal: ${fatal.message}` });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
