"use client";
import { useEffect, useState } from "react";

interface Cliente {
  slug: string; nombre: string; tipo: string; phone: string | null;
  agent_id: string | null; n8n_workflow: string | null; sheet_url: string | null;
  llamadas: number; minutos: number; costo_usd: number; ingreso_cop: number;
  costo_cop: number; ganancia_cop: number; margen: number; alerta: boolean;
  ultima_llamada: string | null;
}

function fmt(n: number) { return n.toLocaleString("es-CO"); }

const TIPO_ICON: Record<string, string> = {
  odontologia:"🦷", estetica:"✨", taller:"🔧", abogado:"⚖️", otro:"🏢"
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState<string|null>(null);

  useEffect(()=>{
    fetch("/api/clientes").then(r=>r.json()).then(d=>{
      setClientes(Array.isArray(d)?d:[]);
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);
  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color:"var(--text)" }}>Clientes</h1>
          <p className="text-sm mt-1" style={{ color:"var(--text-3)" }}>
            {loading?"Cargando...":`${clientes.length} recepcionista${clientes.length!==1?"s":""} activa${clientes.length!==1?"s":""}`}
          </p>
        </div>
        <a href="/nuevo-cliente"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150 hover:opacity-90 active:scale-95"
          style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo Cliente
        </a>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_,i)=>(
            <div key={i} className="rounded-2xl h-28 shimmer" style={{ border:"1px solid var(--border)" }}/>
          ))}
        </div>
      ) : clientes.length===0 ? (
        <div className="rounded-2xl py-20 text-center" style={{ background:"var(--card)", border:"1px solid var(--border)" }}>
          <div className="text-5xl mb-4">🤖</div>
          <p className="text-base font-semibold mb-2" style={{ color:"var(--text)" }}>No hay clientes aún</p>
          <p className="text-sm mb-6" style={{ color:"var(--text-3)" }}>Crea tu primer agente y empieza a generar ingresos</p>
          <a href="/nuevo-cliente" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
            Crear primer cliente
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {clientes.map(c=>{
            const open = expandido===c.slug;
            const margenColor = c.margen>=70?"text-emerald-400":c.margen>=50?"text-amber-400":"text-rose-400";
            return (
              <div key={c.slug} className="rounded-2xl overflow-hidden transition-all duration-200"
                style={{ background:"var(--card)", border:`1px solid ${open?"var(--border-hover)":"var(--border)"}` }}>
                {/* Header row */}
                <div className="px-6 py-4 flex items-center gap-4 cursor-pointer"
                  onClick={()=>setExpandido(open?null:c.slug)}
                  onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.02)")}
                  onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                  {/* Icon + name */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ background:"rgba(99,102,241,0.1)" }}>
                    {TIPO_ICON[c.tipo]||"🏢"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <p className="font-semibold text-sm" style={{ color:"var(--text)" }}>{c.nombre}</p>
                      {c.alerta ? (
                        <span className="badge badge-red"><span className="dot dot-red"/>Margen bajo</span>
                      ) : c.agent_id ? (
                        <span className="badge badge-green"><span className="dot dot-green"/>Activo</span>
                      ) : (
                        <span className="badge badge-yellow">Sin desplegar</span>
                      )}
                    </div>
                    {c.phone && <p className="text-xs font-terminal mt-0.5" style={{ color:"var(--text-3)" }}>{c.phone}</p>}
                  </div>
                  {/* Metrics */}
                  <div className="flex items-center gap-8">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs" style={{ color:"var(--text-3)" }}>Llamadas</p>
                      <p className="text-lg font-bold" style={{ color:"var(--text)" }}>{c.llamadas}</p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-xs" style={{ color:"var(--text-3)" }}>Ganancia</p>
                      <p className="text-lg font-bold text-emerald-400">${fmt(c.ganancia_cop)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs" style={{ color:"var(--text-3)" }}>Margen</p>
                      <p className={`text-lg font-bold ${margenColor}`}>{c.margen}%</p>
                    </div>
                    <svg className={`transition-transform duration-200 ${open?"rotate-180":""}`}
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </div>

                {/* Expanded detail */}
                {open && (
                  <div className="px-6 pb-6" style={{ borderTop:"1px solid var(--border)" }}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 mb-4">
                      {[
                        ["Minutos de llamada", `${c.minutos} min`, "var(--text)"],
                        ["Costo Retell", `$${c.costo_usd.toFixed(2)} USD`, "var(--text)"],
                        ["Ingreso mensual", `$${fmt(c.ingreso_cop)} COP`, "#34d399"],
                        ["Última llamada", c.ultima_llamada||"Sin llamadas", "var(--text)"],
                      ].map(([k,v,color])=>(
                        <div key={k} className="rounded-xl p-3" style={{ background:"var(--elevated)", border:"1px solid var(--border)" }}>
                          <p className="text-xs mb-1" style={{ color:"var(--text-3)" }}>{k}</p>
                          <p className="text-sm font-semibold" style={{ color:color as string }}>{v}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {c.agent_id && (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-terminal" style={{ background:"var(--elevated)", color:"var(--text-2)", border:"1px solid var(--border)" }}>
                          Agent: {c.agent_id}
                        </span>
                      )}
                      {c.n8n_workflow && (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-terminal" style={{ background:"var(--elevated)", color:"var(--text-2)", border:"1px solid var(--border)" }}>
                          n8n: {c.n8n_workflow}
                        </span>
                      )}
                      {c.sheet_url && (
                        <a href={c.sheet_url} target="_blank" rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                          style={{ background:"rgba(52,211,153,0.1)", color:"#34d399", border:"1px solid rgba(52,211,153,0.2)" }}>
                          Ver Google Sheet ↗
                        </a>
                      )}
                      <a href={`/llamadas?agent_id=${c.agent_id}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        style={{ background:"rgba(99,102,241,0.1)", color:"var(--accent-2)", border:"1px solid rgba(99,102,241,0.2)" }}>
                        Ver llamadas →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
