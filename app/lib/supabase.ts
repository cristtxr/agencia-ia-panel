import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

// Cliente con service_role (solo server-side, nunca exponer al browser)
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export interface ClienteConfig {
  business_name: string;
  business_type: string;
  professional_name: string;
  phone_number?: string;
  agent_id?: string;
  llm_id?: string;
  n8n_workflow_id?: string;
  webhook_url?: string;
  calcom_event_type_id?: number;
  calcom_habilitado?: boolean;
  comprar_numero?: boolean;
  area_code?: number;
  forwarding_number?: string;
  voice_id?: string;
  paquete_minutos?: string;
  appointment_duration?: number;
  address?: string;
  ingreso_mensual_cop?: number;
  [key: string]: unknown;
}

export async function leerCliente(slug: string): Promise<{ config: ClienteConfig; prompt: string } | null> {
  const { data, error } = await supabase
    .from("clientes")
    .select("config, prompt")
    .eq("slug", slug)
    .single();
  if (error || !data) return null;
  return { config: data.config as ClienteConfig, prompt: data.prompt };
}

export async function guardarCliente(slug: string, config: ClienteConfig, prompt?: string) {
  const update: Record<string, unknown> = { config, updated_at: new Date().toISOString() };
  if (prompt !== undefined) update.prompt = prompt;
  const { error } = await supabase
    .from("clientes")
    .upsert({ slug, ...update }, { onConflict: "slug" });
  if (error) throw new Error(`Supabase error: ${error.message}`);
}

export async function actualizarConfig(slug: string, partialConfig: Partial<ClienteConfig>) {
  const existing = await leerCliente(slug);
  if (!existing) throw new Error(`Cliente no encontrado: ${slug}`);
  const merged = { ...existing.config, ...partialConfig };
  await guardarCliente(slug, merged);
  return merged;
}
