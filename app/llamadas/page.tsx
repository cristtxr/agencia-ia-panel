"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface Llamada {
  call_id: string;
  agent_id: string;
  start_timestamp: number;
  end_timestamp: number;
  duration_ms: number;
  call_status: string;
  call_cost?: { total_cost: number };
  recording_url?: string;
  transcript?: string;
  call_analysis?: {
    call_summary?: string;
    user_sentiment?: string;
    agent_sentiment?: string;
  };
  from_number?: string;
  to_number?: string;
}

function formatDuracion(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatFecha(ts: number) {
  return new Date(ts).toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function estadoBadge(status: string) {
  const map: Record<string, string> = {
    ended: "bg-green-900/50 text-green-400",
    error: "bg-red-900/50 text-red-400",
    ongoing: "bg-blue-900/50 text-blue-400",
  };
  return map[status] || "bg-gray-700 text-gray-400";
}

function sentimientoBadge(s?: string) {
  if (!s) return null;
  const map: Record<string, string> = {
    Positive: "text-green-400",
    Negative: "text-red-400",
    Neutral: "text-gray-400",
  };
  return <span className={map[s] || "text-gray-400"}>{s}</span>;
}

function AudioPlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  return (
    <div className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-2">
      <button
        onClick={toggle}
        className="w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-700 rounded-full text-white text-xs transition-colors flex-shrink-0"
      >
        {playing ? "II" : "▶"}
      </button>
      <div className="flex-1">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={progress}
          onChange={(e) => {
            if (audioRef.current) {
              audioRef.current.currentTime = Number(e.target.value);
              setProgress(Number(e.target.value));
            }
          }}
          className="w-full h-1 accent-blue-500"
        />
      </div>
      <span className="text-xs text-gray-400 flex-shrink-0">
        {Math.floor(progress / 60)}:{String(Math.floor(progress % 60)).padStart(2, "0")} /{" "}
        {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, "0")}
      </span>
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={() => setProgress(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}

function LlamadasContent() {
  const searchParams = useSearchParams();
  const agentId = searchParams.get("agent_id");
  const [llamadas, setLlamadas] = useState<Llamada[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandida, setExpandida] = useState<string | null>(null);

  useEffect(() => {
    const url = agentId ? `/api/llamadas?agent_id=${agentId}` : "/api/llamadas";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setLlamadas(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [agentId]);

  const totalMinutos = llamadas.reduce((s, l) => s + (l.duration_ms || 0), 0) / 60000;
  const totalCosto = llamadas.reduce((s, l) => s + (l.call_cost?.total_cost || 0), 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Llamadas</h1>
        <p className="text-gray-400 text-sm mt-1">
          {agentId ? `Filtrado por agente: ${agentId}` : "Todas las llamadas recientes"}
        </p>
      </div>

      {!loading && llamadas.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-xs text-gray-400 mb-1">Total llamadas</p>
            <p className="text-2xl font-bold text-white">{llamadas.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-xs text-gray-400 mb-1">Minutos totales</p>
            <p className="text-2xl font-bold text-white">{Math.round(totalMinutos * 10) / 10} min</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-xs text-gray-400 mb-1">Costo total</p>
            <p className="text-2xl font-bold text-yellow-400">${totalCosto.toFixed(4)} USD</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400">
          Cargando llamadas...
        </div>
      ) : llamadas.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center text-gray-500">
          No hay llamadas registradas
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-800">
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3">Duracion</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">Sentimiento</th>
                <th className="px-6 py-3">Costo</th>
                <th className="px-6 py-3">Grabacion</th>
              </tr>
            </thead>
            <tbody>
              {llamadas.map((l) => (
                <>
                  <tr
                    key={l.call_id}
                    className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer"
                    onClick={() => setExpandida(expandida === l.call_id ? null : l.call_id)}
                  >
                    <td className="px-6 py-4 text-gray-300">
                      {l.start_timestamp ? formatFecha(l.start_timestamp) : "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {l.duration_ms ? formatDuracion(l.duration_ms) : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${estadoBadge(l.call_status)}`}>
                        {l.call_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {sentimientoBadge(l.call_analysis?.user_sentiment) || (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {l.call_cost?.total_cost
                        ? `$${l.call_cost.total_cost.toFixed(4)}`
                        : "—"}
                    </td>
                    <td className="px-6 py-4">
                      {l.recording_url ? (
                        <span className="text-blue-400 text-xs">Ver grabacion</span>
                      ) : (
                        <span className="text-gray-600 text-xs">Sin grabacion</span>
                      )}
                    </td>
                  </tr>
                  {expandida === l.call_id && (
                    <tr key={`${l.call_id}-detail`} className="border-b border-gray-800 bg-gray-800/30">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="space-y-4">
                          {l.recording_url && (
                            <div>
                              <p className="text-xs text-gray-400 mb-2">Grabacion</p>
                              <AudioPlayer url={l.recording_url} />
                            </div>
                          )}
                          {l.call_analysis?.call_summary && (
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Resumen de la llamada</p>
                              <p className="text-sm text-gray-300 bg-gray-800 rounded p-3">
                                {l.call_analysis.call_summary}
                              </p>
                            </div>
                          )}
                          {l.transcript && (
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Transcripcion</p>
                              <pre className="text-xs text-gray-400 bg-gray-800 rounded p-3 max-h-48 overflow-y-auto whitespace-pre-wrap">
                                {l.transcript}
                              </pre>
                            </div>
                          )}
                          <div className="flex gap-4 text-xs text-gray-500">
                            <span>ID: {l.call_id}</span>
                            {l.from_number && <span>Desde: {l.from_number}</span>}
                            {l.to_number && <span>Hacia: {l.to_number}</span>}
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
    <Suspense fallback={<div className="text-gray-400">Cargando...</div>}>
      <LlamadasContent />
    </Suspense>
  );
}
