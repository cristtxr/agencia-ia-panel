"use client";
import { useEffect, useState } from "react";

interface Cliente {
  slug: string; nombre: string; tipo: string; phone: string | null;
  agent_id: string | null; llamadas: number; minutos: number;
  costo_usd: number; ingreso_cop: number; costo_cop: number;
  ganancia_cop: number; margen: number; alerta: boolean;
  ultima_llamada: string | null;
}

function fmt(n: number) { return n.toLocaleString("es-CO"); }

function StatCard({ label, value, sub, color, icon }: {
  label: string; value: string; sub?: string; color: string; icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background:"var(--card)", border:"1px solid var(--border)" }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color:"var(--text-3)" }}>{label}</p>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:`rgba(99,102,241,0.12)` }}>
          <span style={{ color:"var(--accent-2)" }}>{icon}</span>
        </div>
      </div>
      <div>
        <p className={`text-3xl font-bold tracking-tight ${color}`}>{value}</p>
        {sub && <p className="text-xs mt-1" style={{ color:"var(--text-3)" }}>{sub}</p>}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_,i)=>(
          <div key={i} className="rounded-2xl h-32 shimmer" style={{ border:"1px solid var(--border)" }}/>
        ))}
      </div>
      <div className="rounded-2xl h-64 shimmer" style={{ border:"1px solid var(--border)" }}/>
    </div>
  );
}

const TIPO_ICON: Record<string, string> = {
  odontologia: "🦷", estetica: "✨", taller: "🔧", abogado: "⚖️", otro: "🏢"
};
export default function Dashboard() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clientes").then(r=>r.json()).then(d=>{
      setClientes(Array.isArray(d)?d:[]);
      setLoading(false);
    }).catch(()=>setLoading(false));
  }, []);

  const totalLlamadas = clientes.reduce((s,c)=>s+c.llamadas,0);
  const totalMinutos = clientes.reduce((s,c)=>s+c.minutos,0);
  const totalIngreso = clientes.reduce((s,c)=>s+c.ingreso_cop,0);
  const totalGanancia = clientes.reduce((s,c)=>s+c.ganancia_cop,0);
  const margenGlobal = totalIngreso>0 ? Math.round((totalGanancia/totalIngreso)*100) : 0;
  const alertas = clientes.filter(c=>c.alerta).length;

  const margenColor = margenGlobal>=70 ? "text-emerald-400" : margenGlobal>=50 ? "text-amber-400" : "text-rose-400";

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color:"var(--text)" }}>
            Buenos días, <span className="text-gradient">Cristian</span> 👋
          </h1>
          <p className="text-sm mt-1" style={{ color:"var(--text-3)" }}>
            {new Date().toLocaleDateString("es-CO",{weekday:"long",day:"numeric",month:"long"})}
          </p>
        </div>
        <a href="/nuevo-cliente"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150 hover:opacity-90 active:scale-95"
          style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo cliente
        </a>
      </div>

      {loading ? <Skeleton /> : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Clientes activos" value={String(clientes.length)}
              sub="recepcionistas" color="text-indigo-400"
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
            />
            <StatCard label="Llamadas totales" value={String(totalLlamadas)}
              sub={`${Math.round(totalMinutos)} min`} color="text-sky-400"
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.28 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>}
            />
            <StatCard label="Ingreso mensual" value={`$${fmt(totalIngreso)}`}
              sub="COP estimado" color="text-emerald-400"
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
            />
            <StatCard label="Margen global" value={`${margenGlobal}%`}
              sub={alertas>0?`${alertas} alerta(s)`:"Sin alertas"} color={margenColor}
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>}
            />
          </div>
          {/* Clients table */}
          <div className="rounded-2xl overflow-hidden" style={{ background:"var(--card)", border:"1px solid var(--border)" }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom:"1px solid var(--border)" }}>
              <div>
                <h2 className="text-base font-semibold" style={{ color:"var(--text)" }}>Clientes</h2>
                <p className="text-xs mt-0.5" style={{ color:"var(--text-3)" }}>{clientes.length} agente{clientes.length!==1?"s":""} desplegado{clientes.length!==1?"s":""}</p>
              </div>
              <a href="/clientes" className="text-xs font-medium transition-colors hover:opacity-80" style={{ color:"var(--accent-2)" }}>
                Ver todos →
              </a>
            </div>

            {clientes.length===0 ? (
              <div className="py-16 text-center">
                <div className="text-5xl mb-4">🤖</div>
                <p className="text-sm font-medium mb-1" style={{ color:"var(--text)" }}>Sin clientes todavía</p>
                <p className="text-xs mb-6" style={{ color:"var(--text-3)" }}>Crea tu primer agente de voz en minutos</p>
                <a href="/nuevo-cliente" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                  Crear primer cliente
                </a>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom:"1px solid var(--border)", background:"rgba(255,255,255,0.02)" }}>
                      {["Negocio","Llamadas","Minutos","Costo","Ganancia","Margen","Estado"].map(h=>(
                        <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color:"var(--text-3)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map(c=>(
                      <tr key={c.slug} className="transition-colors cursor-pointer"
                        style={{ borderBottom:"1px solid var(--border)" }}
                        onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.03)")}
                        onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
                        onClick={()=>window.location.href="/clientes"}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">{TIPO_ICON[c.tipo]||"🏢"}</span>
                            <div>
                              <p className="font-medium text-sm" style={{ color:"var(--text)" }}>{c.nombre}</p>
                              <p className="text-xs capitalize" style={{ color:"var(--text-3)" }}>{c.tipo}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium" style={{ color:"var(--text)" }}>{c.llamadas}</td>
                        <td className="px-6 py-4" style={{ color:"var(--text-2)" }}>{c.minutos} min</td>
                        <td className="px-6 py-4" style={{ color:"var(--text-2)" }}>${fmt(c.costo_cop)}</td>
                        <td className="px-6 py-4 font-semibold text-emerald-400">${fmt(c.ganancia_cop)}</td>
                        <td className="px-6 py-4">
                          <span className={`font-bold ${c.margen>=70?"text-emerald-400":c.margen>=50?"text-amber-400":"text-rose-400"}`}>
                            {c.margen}%
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {c.alerta ? (
                            <span className="badge badge-red"><span className="dot dot-red"/>Alerta</span>
                          ) : c.agent_id ? (
                            <span className="badge badge-green"><span className="dot dot-green"/>Activo</span>
                          ) : (
                            <span className="badge badge-yellow">Sin desplegar</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
