import { NextResponse } from "next/server";
import { generarPrompt } from "@/app/lib/prompts";
import { guardarCliente, supabase } from "@/app/lib/supabase";

function slugify(str: string) {
  return str.toLowerCase()
    .replace(/[áà]/g, "a").replace(/[éè]/g, "e")
    .replace(/[íì]/g, "i").replace(/[óò]/g, "o")
    .replace(/[úù]/g, "u").replace(/ñ/g, "n")
    .replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

const MINUTOS_POR_PAQUETE: Record<string, number> = {
  basico: 300,
  estandar: 600,
  pro: 1200,
};

const INGRESO_POR_PAQUETE: Record<string, number> = {
  basico: 500000,
  estandar: 700000,
  pro: 1100000,
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      nombre, tipo, profesional, direccion, horario, duracion,
      servicios, faqs, metodos_pago, reglas, email,
      voz, comprar_numero, area_code, numero_desvio,
      whatsapp_dueno, paquete_minutos, calcom_habilitado, gmail_profesional,
    } = body;

    if (!nombre || !tipo || !profesional) {
      return NextResponse.json({ error: "Faltan campos obligatorios: nombre, tipo, profesional" }, { status: 400 });
    }

    const slug = slugify(nombre);

    // Verificar que no exista ya
    const { data: existing } = await supabase
      .from("clientes")
      .select("slug")
      .eq("slug", slug)
      .single();

    if (existing) {
      return NextResponse.json({ error: `Ya existe un cliente con ese nombre (${slug})` }, { status: 400 });
    }

    const paquete = paquete_minutos || "basico";

    const config = {
      business_name: nombre,
      business_type: tipo,
      professional_name: profesional,
      address: direccion || "",
      business_hours: horario || "Lunes a Viernes 8am-6pm, Sabados 8am-1pm",
      appointment_duration: Number(duracion) || 30,
      services: servicios || {},
      faqs: faqs || [],
      payment_methods: metodos_pago || "Efectivo, Nequi, Bancolombia",
      special_rules: reglas || "",
      owner_email: email || "",
      owner_whatsapp: whatsapp_dueno || "",
      forwarding_number: numero_desvio || "",
      comprar_numero: comprar_numero ?? true,
      area_code: Number(area_code) || 305,
      paquete_minutos: paquete,
      minutos_incluidos: MINUTOS_POR_PAQUETE[paquete] || 300,
      ingreso_mensual_cop: INGRESO_POR_PAQUETE[paquete] || 500000,
      minutos_usados: 0,
      calcom_habilitado: calcom_habilitado ?? true,
      gmail_profesional: gmail_profesional || "",
      voice_id: voz || "cartesia-Hailey-Spanish-latin-america",
      agent_name: `Recepcionista ${nombre}`,
      agent_id: null,
      llm_id: null,
      calcom_event_type_id: null,
      phone_number: null,
      webhook_url: null,
      n8n_workflow_id: null,
      google_sheet_id: null,
      google_sheet_url: null,
    };

    const prompt = generarPrompt(config as any);

    await guardarCliente(slug, config as any, prompt);

    return NextResponse.json({
      ok: true,
      slug,
      prompt,
      message: `Cliente ${nombre} creado correctamente. Listo para desplegar.`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
