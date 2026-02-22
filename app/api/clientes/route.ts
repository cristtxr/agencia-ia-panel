import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CLIENTES_DIR = path.join(process.cwd(), "..", "clientes");
const RETELL_KEY = process.env.RETELL_API_KEY!;
const COSTO_MIN = 0.07;
const TRM = 4200;

async function getCallsForAgent(agentId: string) {
  try {
    const res = await fetch("https://api.retellai.com/v2/list-calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RETELL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ limit: 100, filter_criteria: { agent_id: [agentId] } }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const carpetas = fs.readdirSync(CLIENTES_DIR).filter(
      (f) => f !== "plantilla_base" && fs.statSync(path.join(CLIENTES_DIR, f)).isDirectory()
    );

    const clientes = await Promise.all(
      carpetas.map(async (slug) => {
        const configPath = path.join(CLIENTES_DIR, slug, "config.json");
        if (!fs.existsSync(configPath)) return null;

        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        const agentId = config.agent_id;

        let stats = { llamadas: 0, minutos: 0, costo_usd: 0, ultima_llamada: null as string | null };

        if (agentId) {
          const calls = await getCallsForAgent(agentId);
          const minutos = calls.reduce((s: number, c: any) => s + (c.duration_ms || 0), 0) / 60000;
          const costo = calls.reduce((s: number, c: any) => s + (c.call_cost?.total_cost || 0), 0) || minutos * COSTO_MIN;
          const ultima = calls[0]?.start_timestamp;
          stats = {
            llamadas: calls.length,
            minutos: Math.round(minutos * 10) / 10,
            costo_usd: Math.round(costo * 100) / 100,
            ultima_llamada: ultima ? new Date(ultima).toLocaleString("es-CO") : null,
          };
        }

        const ingreso_cop = 200_000;
        const costo_cop = Math.round(stats.costo_usd * TRM);
        const ganancia = ingreso_cop - costo_cop;
        const margen = Math.round((ganancia / ingreso_cop) * 100);

        return {
          slug,
          nombre: config.business_name,
          tipo: config.business_type,
          phone: config.phone_number,
          agent_id: agentId,
          n8n_workflow: config.n8n_workflow_id,
          sheet_url: config.google_sheet_url,
          ...stats,
          ingreso_cop,
          costo_cop,
          ganancia_cop: ganancia,
          margen,
          alerta: margen < 50,
        };
      })
    );

    return NextResponse.json(clientes.filter(Boolean));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
