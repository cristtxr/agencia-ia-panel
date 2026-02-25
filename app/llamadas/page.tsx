"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface Llamada {
  call_id: string; agent_id: string; start_timestamp: number;
  end_timestamp: number; duration_ms: number; call_status: string;
  call_cost?: { total_cost: number }; recording_url?: string;
  transcript?: string;
  call_analysis?: { call_summary?: string; user_sentiment?: string };
  from_number?: string; to_number?: string;
}

function fmtDur(ms: number) {
  const s=Math.floor(ms/1000), m=Math.floor(s/60), sec=s%60;
  return `${m}:${sec.toString().padStart(2,"0")}`;
}
function fmtFecha(ts: number) {
  return new Date(ts).toLocaleString("es-CO",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
}

function AudioPlayer({ url }: { url: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dur, setDur] = useState(0);
  const toggle = () => {
    if (!ref.current) return;
    playing ? ref.current.pause() : ref.current.play();
    setPlaying(!playing);
  };
  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-2.5" style={{ background:"var(--elevated)", border:"1px solid var(--border)" }}>
      <button onClick={toggle}
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs transition-all shrink-0"
        style={{ background:"var(--accent)" }}>
        {playing?"❚❚":"▶"}
      </button>
      <input type="range" min={0} max={dur||100} value={progress}
        onChange={e=>{ if(ref.current){ref.current.currentTime=+e.target.value;setProgress(+e.target.value);} }}
        className="flex-1 h-1 accent-indigo-500" />
      <span className="text-xs shrink-0" style={{ color:"var(--text-3)" }}>
        {Math.floor(progress/60)}:{String(Math.floor(progress%60)).padStart(2,"0")} / {Math.floor(dur/60)}:{String(Math.floor(dur%60)).padStart(2,"0")}
      </span>
      <audio ref={ref} src={url}
        onTimeUpdate={()=>setProgress(ref.current?.currentTime||0)}
        onLoadedMetadata={()=>setDur(ref.current?.duration||0)}
        onEnded={()=>setPlaying(false)}/>
    </div>
  );
}

function sentBadge(s?: string) {
  if (!s) return null;
  const m: Record<string,string> = { Positive:"badge-green", Negative:"badge-red", Neutral:"badge-gray" };
  return <span className={`badge ${m[s]||"badge-gray"}`}>{s==="Positive"?"Positivo":s==="Negative"?"Negativo":"Neutro"}</span>;
}

function LlamadasContent() {
  const sp = useSearchParams();
  const agentId = sp.get("agent_id");
  const [llamadas, setLlamadas] = useState<Llamada[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandida, setExpandida] = useState<string|null>(null);

  useEffect(()=>{
    const url = agentId?`/api/llamadas?agent_id=${agentId}`:"/api/llamadas";
    fetch(url).then(r=>r.json()).then(d=>{setLlamadas(Array.isArray(d)?d:[]);setLoading(false);}).catch(()=>setLoading(false));
  },[agentId]);

  const totalMin = llamadas.reduce((s,l)=>s+(l.duration_ms||0),0)/60000;
  const totalCost = llamadas.reduce((s,l)=>s+(l.call_cost?.total_cost||0),0);

  return (
    <div className="animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color:"var(--text)" }}>Llamadas</h1>
        <p className="text-sm mt-1" style={{ color:"var(--text-3)" }}>
          {agentId?`Agente: ${agentId}`:"Todas las llamadas recientes"}
        </p>
      </div>

      {!loading && llamadas.length>0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            ["Total llamadas", String(llamadas.length), "var(--text)"],
            ["Minutos totales", `${Math.round(totalMin*10)/10} min`, "var(--text)"],
            ["Costo total", `$${totalCost.toFixed(4)} USD`, "#fbbf24"],
          ].map(([l,v,c])=>(
            <div key={l} className="rounded-2xl p-5" style={{ background:"var(--card)", border:"1px solid var(--border)" }}>
              <p className="text-xs uppercase tracking-wider mb-2" style={{ color:"var(--text-3)" }}>{l}</p>
              <p className="text-2xl font-bold" style={{ color:c }}>{v}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_,i)=><div key={i} className="rounded-xl h-16 shimmer" style={{ border:"1px solid var(--border)" }}/>)}
        </div>
      ) : llamadas.length===0 ? (
        <div className="rounded-2xl py-20 text-center" style={{ background:"var(--card)", border:"1px solid var(--border)" }}>
          <div className="text-4xl mb-3">📵</div>
          <p className="text-sm font-medium" style={{ color:"var(--text-2)" }}>Sin llamadas registradas aún</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background:"var(--card)", border:"1px solid var(--border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom:"1px solid var(--border)", background:"rgba(255,255,255,0.02)" }}>
                {["Fecha","Duracón","Estado","Sentimiento","Costo","Grabación"].map(h=>(
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color:"var(--text-3)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {llamadas.map(l=>(
                <>
                  <tr key={l.call_id} className="cursor-pointer transition-colors"
                    style={{ borderBottom:"1px solid var(--border)" }}
                    onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.02)")}
                    onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
                    onClick={()=>setExpandida(expandida===l.call_id?null:l.call_id)}>
                    <td className="px-6 py-4" style={{ color:"var(--text)" }}>{l.start_timestamp?fmtFecha(l.start_timestamp):"—"}</td>
                    <td className="px-6 py-4 font-terminal font-medium" style={{ color:"var(--text)" }}>{l.duration_ms?fmtDur(l.duration_ms):"—"}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${l.call_status==="ended"?"badge-green":l.call_status==="error"?"badge-red":"badge-blue"}`}>
                        {l.call_status==="ended"?"Completada":l.call_status==="error"?"Error":"En curso"}
                      </span>
                    </td>
                    <td className="px-6 py-4">{sentBadge(l.call_analysis?.user_sentiment)||<span style={{ color:"var(--text-3)" }}>—</span>}</td>
                    <td className="px-6 py-4 font-terminal" style={{ color:"var(--text-2)" }}>
                      {l.call_cost?.total_cost?`$${l.call_cost.total_cost.toFixed(4)}`:"—"}
                    </td>
                    <td className="px-6 py-4">
                      {l.recording_url
                        ? <span className="text-xs font-medium" style={{ color:"var(--accent-2)" }}>🎵 Ver</span>
                        : <span className="text-xs" style={{ color:"var(--text-3)" }}>—</span>}
                    </td>
                  </tr>
                  {expandida===l.call_id && (
                    <tr key={`${l.call_id}-detail`}>
                      <td colSpan={6} className="px-6 py-5" style={{ borderBottom:"1px solid var(--border)", background:"rgba(99,102,241,0.03)" }}>
                        <div className="space-y-4">
                          {l.recording_url && (
                            <div>
                              <p className="text-xs font-medium mb-2" style={{ color:"var(--text-3)" }}>Grabación</p>
                              <AudioPlayer url={l.recording_url}/>
                            </div>
                          )}
                          {l.call_analysis?.call_summary && (
                            <div>
                              <p className="text-xs font-medium mb-2" style={{ color:"var(--text-3)" }}>Resumen IA</p>
                              <p className="text-sm rounded-xl px-4 py-3" style={{ color:"var(--text-2)", background:"var(--elevated)", border:"1px solid var(--border)" }}>
                                {l.call_analysis.call_summary}
                              </p>
                            </div>
                          )}
                          {l.transcript && (
                            <div>
                              <p className="text-xs font-medium mb-2" style={{ color:"var(--text-3)" }}>Transcripción</p>
                              <pre className="text-xs rounded-xl px-4 py-3 max-h-48 overflow-y-auto whitespace-pre-wrap font-terminal" style={{ color:"var(--text-3)", background:"var(--elevated)", border:"1px solid var(--border)" }}>
                                {l.transcript}
                              </pre>
                            </div>
                          )}
                          <div className="flex gap-4 text-xs" style={{ color:"var(--text-3)" }}>
                            <span className="font-terminal">ID: {l.call_id}</span>
                            {l.from_number&&<span>Desde: {l.from_number}</span>}
                            {l.to_number&&<span>Hacia: {l.to_number}</span>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function LlamadasPage() {
  return (
    <Suspense fallback={<div className="text-sm" style={{ color:"var(--text-3)" }}>Cargando...</div>}>
      <LlamadasContent/>
    </Suspense>
  );
}
