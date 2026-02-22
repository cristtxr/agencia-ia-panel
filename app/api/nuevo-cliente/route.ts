import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CLIENTES_DIR = path.join(process.cwd(), "..", "clientes");
const PLANTILLA_DIR = path.join(CLIENTES_DIR, "plantilla_base");

function slugify(str: string) {
  return str.toLowerCase()
    .replace(/[áà]/g, "a").replace(/[éè]/g, "e")
    .replace(/[íì]/g, "i").replace(/[óò]/g, "o")
    .replace(/[úù]/g, "u").replace(/ñ/g, "n")
    .replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nombre, tipo, profesional, direccion, horario, duracion, servicios, faqs, metodos_pago, reglas, email } = body;

    if (!nombre || !tipo || !profesional) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const slug = slugify(nombre);
    const carpeta = path.join(CLIENTES_DIR, slug);

    if (fs.existsSync(carpeta)) {
      return NextResponse.json({ error: `Ya existe un cliente con ese nombre (${slug})` }, { status: 400 });
    }

    fs.mkdirSync(path.join(carpeta, "logs"), { recursive: true });

    // Generar config.json
    const config = {
      business_name: nombre, business_type: tipo, professional_name: profesional,
      address: direccion || "", business_hours: horario || "Lunes a Viernes 8am-6pm",
      appointment_duration: Number(duracion) || 30, services: servicios || {},
      faqs: faqs || [], payment_methods: metodos_pago || "Efectivo, Nequi, Bancolombia",
      special_rules: reglas || "", owner_email: email || "",
      voice_id: "cartesia-Hailey-Spanish-latin-america",
      agent_name: `Recepcionista ${nombre}`,
      agent_id: null, llm_id: null, calcom_event_type_id: null,
      phone_number: null, webhook_url: null, n8n_workflow_id: null,
      google_sheet_id: null, google_sheet_url: null,
    };

    fs.writeFileSync(path.join(carpeta, "config.json"), JSON.stringify(config, null, 2));

    // Generar prompt.md
    const serviciosTexto = Object.entries(servicios || {})
      .map(([s, p]) => `- ${s}: $${Number(p).toLocaleString("es-CO")} COP`).join("\n");
    const faqsTexto = (faqs || []).map((f: any) => `- Pregunta: ${f.pregunta}\n  Respuesta: ${f.respuesta}`).join("\n");

    const prompt = `Eres la recepcionista virtual de ${nombre}, el negocio de ${profesional}.
Tu nombre es Sofia y trabajas como asistente telefonica las 24 horas del dia, los 7 dias de la semana.

## TU PERSONALIDAD
- Eres amable, calida y profesional. Hablas en espanol colombiano neutro.
- Usas expresiones naturales como "Claro que si", "Con gusto", "Dejame revisar", "Un momentico".
- NUNCA suenas robotica.

## INFORMACION DEL NEGOCIO
- Nombre: ${nombre}
- Profesional: ${profesional}
- Direccion: ${direccion || "Consultar"}
- Horario: ${horario || "Lunes a Viernes 8am-6pm"}
- Metodos de pago: ${metodos_pago || "Efectivo, Nequi, Bancolombia"}

## SERVICIOS Y PRECIOS
${serviciosTexto || "(Sin servicios configurados)"}

## PREGUNTAS FRECUENTES
${faqsTexto || "(Sin FAQs)"}

## REGLAS ESPECIALES
${reglas || "Ninguna"}

## FLUJO
1. SALUDA: "Hola, bienvenido a ${nombre}, hablas con Sofia. En que te puedo ayudar?"
2. ESCUCHA y entiende lo que necesita.
3. INFORMA con los datos exactos de arriba.
4. AGENDA usando check_availability y book_appointment.
5. DESPIDE amablemente.

## REGLAS INQUEBRANTABLES
1. NUNCA inventes precios ni informacion.
2. Si no sabes algo, di: "Voy a tomar nota y ${profesional} se comunicara contigo."
3. SIEMPRE pide nombre y telefono antes de agendar.
4. NUNCA des diagnosticos. Solo agendas e informas.`;

    fs.writeFileSync(path.join(carpeta, "prompt.md"), prompt);

    return NextResponse.json({ ok: true, slug, message: `Cliente ${nombre} creado. Ahora puedes desplegarlo.` });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
