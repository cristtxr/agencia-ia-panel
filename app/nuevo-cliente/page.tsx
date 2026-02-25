"use client";
import { useState, useEffect, useRef } from "react";

interface Servicio { nombre: string; precio: string }
interface Faq { pregunta: string; respuesta: string }
interface Voz { id: string; nombre: string; descripcion: string; genero: string; proveedor: string; recomendada: boolean }
interface PasoDespliegue { paso: number; estado: "corriendo" | "ok" | "error" | "listo"; msg: string; saltado?: boolean; resumen?: any }

const TIPOS = ["odontologia", "estetica", "taller", "abogado", "otro"];
const PAQUETES = [
  { id: "basico", label: "Básico", min: 300, precio: "$500.000/mes", desc: "~10 llamadas/día. Ideal para inicio." },
  { id: "estandar", label: "Estándar", min: 600, precio: "$700.000/mes", desc: "~20 llamadas/día. El más popular.", hot: true },
  { id: "pro", label: "Pro", min: 1200, precio: "$1.100.000/mes", desc: "~40 llamadas/día. Alto volumen." },
];
const PASOS_LABELS = ["Información", "Servicios", "Preguntas", "Técnico", "Despliegue"];

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-3)" }}>{label}</label>
      {children}
      {hint && <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>{hint}</p>}
    </div>
  );
}

const INPUT = "w-full px-3 py-2.5 text-sm rounded-xl transition-all";

export default function NuevoClientePage() {
  const [paso, setPaso] = useState(1);
  const [voces, setVoces] = useState<Voz[]>([]);

  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("odontologia");
  const [profesional, setProfesional] = useState("");
  const [direccion, setDireccion] = useState("");
  const [horario, setHorario] = useState("Lunes a Viernes 8am-6pm, Sábados 8am-1pm");
  const [duracion, setDuracion] = useState("30");
  const [metodosPago, setMetodosPago] = useState("Efectivo, Nequi, Bancolombia");
  const [email, setEmail] = useState("");
  const [reglas, setReglas] = useState("");

  const [servicios, setServicios] = useState<Servicio[]>([{ nombre: "", precio: "" }]);
  const [faqs, setFaqs] = useState<Faq[]>([{ pregunta: "", respuesta: "" }]);

  const [voz, setVoz] = useState("cartesia-Hailey-Spanish-latin-america");
  const [comprarNumero, setComprarNumero] = useState(true);
  const [areaCode, setAreaCode] = useState("305");
  const [numeroDesvio, setNumeroDesvio] = useState("");
  const [whatsappDueno, setWhatsappDueno] = useState("");
  const [paquete, setPaquete] = useState("estandar");
  const [calcomHabilitado, setCalcomHabilitado] = useState(true);
  const [gmailProfesional, setGmailProfesional] = useState("");

  const [slug, setSlug] = useState("");
  const [promptPreview, setPromptPreview] = useState("");
  const [desplegando, setDesplegando] = useState(false);
  const [pasosDeploy, setPasosDeploy] = useState<PasoDespliegue[]>([]);
  const [deployListo, setDeployListo] = useState(false);
  const [resumenFinal, setResumenFinal] = useState<any>(null);
  const [error, setError] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetch("/api/voces").then(r => r.json()).then(setVoces).catch(() => { }); }, []);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [pasosDeploy]);

  function puedeAvanzar() {
    if (paso === 1) return nombre.trim() && tipo && profesional.trim();
    if (paso === 2) return servicios.some(s => s.nombre.trim() && s.precio.trim());
    if (paso === 3) return faqs.some(f => f.pregunta.trim() && f.respuesta.trim());
    if (paso === 4) return voz && paquete;
    return true;
  }

  async function irADespliegue() {
    setError("");
    const serviciosObj: Record<string, number> = {};
    servicios.filter(s => s.nombre && s.precio).forEach(s => { serviciosObj[s.nombre] = Number(s.precio); });
    const faqsLimpios = faqs.filter(f => f.pregunta && f.respuesta);
    const body = {
      nombre, tipo, profesional, direccion, horario, duracion, servicios: serviciosObj,
      faqs: faqsLimpios, metodos_pago: metodosPago, reglas, email, voz,
      comprar_numero: comprarNumero, area_code: Number(areaCode), numero_desvio: numeroDesvio,
      whatsapp_dueno: whatsappDueno, paquete_minutos: paquete, calcom_habilitado: calcomHabilitado,
      gmail_profesional: gmailProfesional
    };
    const res = await fetch("/api/nuevo-cliente", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!data.ok) { setError(data.error || "Error creando cliente"); return; }
    setSlug(data.slug);
    setPromptPreview(data.prompt || "");
    setPaso(5);
  }

  async function desplegar() {
    setDesplegando(true); setPasosDeploy([]); setDeployListo(false); setResumenFinal(null);
    const res = await fetch("/api/deploy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, prompt: promptPreview }) });
    if (!res.body) { setError("Sin respuesta del servidor"); setDesplegando(false); return; }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split("\n").filter(l => l.startsWith("data: "));
      for (const line of lines) {
        try {
          const data: PasoDespliegue = JSON.parse(line.replace("data: ", ""));
          setPasosDeploy(prev => {
            const idx = prev.findIndex(p => p.paso === data.paso);
            if (idx >= 0) { const n = [...prev]; n[idx] = data; return n; }
            return [...prev, data];
          });
          if (data.paso === 99 && data.estado === "listo") { setDeployListo(true); setResumenFinal(data.resumen); }
        } catch { }
      }
    }
    setDesplegando(false);
  }

  const tipoEmojis: Record<string, string> = { odontologia: "🦷", estetica: "✨", taller: "🔧", abogado: "⚖️", otro: "🏢" };

  return (
    <div className="max-w-2xl mx-auto animate-fade-up">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>Nuevo Cliente</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>Despliega un agente de voz profesional en minutos.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center mb-8">
        {PASOS_LABELS.map((label, i) => {
          const n = i + 1, active = paso === n, done = paso > n;
          return (
            <div key={n} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                  style={{
                    background: done ? "var(--success)" : active ? "var(--accent)" : "var(--elevated)",
                    color: done || active ? "white" : "var(--text-3)",
                    boxShadow: active ? "0 0 0 3px rgba(99,102,241,0.25)" : "none"
                  }}>
                  {done ? "✓" : n}
                </div>
                <span className="text-xs mt-1.5 font-medium hidden sm:block" style={{ color: active ? "var(--accent-2)" : done ? "var(--success)" : "var(--text-3)" }}>{label}</span>
              </div>
              {i < PASOS_LABELS.length - 1 && (
                <div className="flex-1 h-px mx-2 mt-[-16px] sm:mt-[-26px] transition-all duration-500"
                  style={{ background: done ? "var(--success)" : "var(--border)" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Card */}
      <div className="rounded-2xl p-7" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>

        {/* PASO 1 */}
        {paso === 1 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>Información del negocio</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Nombre del negocio *">
                  <input className={INPUT} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Consultorio Odontológico Dr. Pérez" />
                </Field>
              </div>
              <Field label="Tipo de negocio *">
                <select className={INPUT} value={tipo} onChange={e => setTipo(e.target.value)}>
                  {TIPOS.map(t => <option key={t} value={t}>{tipoEmojis[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </Field>
              <Field label="Profesional / Dueño *">
                <input className={INPUT} value={profesional} onChange={e => setProfesional(e.target.value)} placeholder="Dr. Carlos Pérez" />
              </Field>
              <div className="col-span-2">
                <Field label="Dirección">
                  <input className={INPUT} value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Calle 5 #12-34, El Bagre, Antioquia" />
                </Field>
              </div>
              <Field label="Horario de atención">
                <input className={INPUT} value={horario} onChange={e => setHorario(e.target.value)} />
              </Field>
              <Field label="Duración de cita (min)">
                <input type="number" className={INPUT} value={duracion} onChange={e => setDuracion(e.target.value)} />
              </Field>
              <Field label="Métodos de pago">
                <input className={INPUT} value={metodosPago} onChange={e => setMetodosPago(e.target.value)} />
              </Field>
              <Field label="Email del dueño">
                <input type="email" className={INPUT} value={email} onChange={e => setEmail(e.target.value)} placeholder="dueno@gmail.com" />
              </Field>
              <div className="col-span-2">
                <Field label="Reglas especiales">
                  <textarea className={INPUT} value={reglas} onChange={e => setReglas(e.target.value)} rows={2} placeholder="Ej: Menores de edad deben venir con acompañante." style={{ resize: "none" }} />
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* PASO 2 */}
        {paso === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>Servicios y precios</h2>
              <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>El agente usará estos precios exactos. No inventa datos.</p>
            </div>
            <div className="space-y-2.5">
              {servicios.map((s, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input className={`${INPUT} flex-1`} value={s.nombre}
                    onChange={e => { const n = [...servicios]; n[i] = { ...n[i], nombre: e.target.value }; setServicios(n); }}
                    placeholder="Nombre del servicio" />
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-3)" }}>$</span>
                    <input type="number" className={`${INPUT} w-36 pl-7`} value={s.precio}
                      onChange={e => { const n = [...servicios]; n[i] = { ...n[i], precio: e.target.value }; setServicios(n); }}
                      placeholder="50000" />
                  </div>
                  <button onClick={() => setServicios(servicios.filter((_, j) => j !== i))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-colors hover:text-rose-400"
                    style={{ color: "var(--text-3)" }}>×</button>
                </div>
              ))}
            </div>
            <button onClick={() => setServicios([...servicios, { nombre: "", precio: "" }])}
              className="text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--accent-2)" }}>
              + Agregar servicio
            </button>
          </div>
        )}

        {/* PASO 3 */}
        {paso === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>Preguntas frecuentes</h2>
              <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>El agente responderá estas preguntas automáticamente durante la llamada.</p>
            </div>
            <div className="space-y-3">
              {faqs.map((f, i) => (
                <div key={i} className="rounded-xl p-4 space-y-3" style={{ background: "var(--elevated)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Pregunta {i + 1}</span>
                    <button onClick={() => setFaqs(faqs.filter((_, j) => j !== i))}
                      className="text-xs transition-colors hover:text-rose-400" style={{ color: "var(--text-3)" }}>Eliminar</button>
                  </div>
                  <input className={INPUT} value={f.pregunta}
                    onChange={e => { const n = [...faqs]; n[i] = { ...n[i], pregunta: e.target.value }; setFaqs(n); }}
                    placeholder="¿Atienden niños?" />
                  <textarea className={INPUT} value={f.respuesta}
                    onChange={e => { const n = [...faqs]; n[i] = { ...n[i], respuesta: e.target.value }; setFaqs(n); }}
                    rows={2} placeholder="Sí, atendemos pacientes de todas las edades..." style={{ resize: "none" }} />
                </div>
              ))}
            </div>
            <button onClick={() => setFaqs([...faqs, { pregunta: "", respuesta: "" }])}
              className="text-sm font-medium transition-colors hover:opacity-80" style={{ color: "var(--accent-2)" }}>
              + Agregar pregunta
            </button>
          </div>
        )}

        {/* PASO 4 */}
        {paso === 4 && (
          <div className="space-y-6">
            <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>Configuración técnica</h2>

            {/* Voz */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-3)" }}>Voz del agente</p>
              <div className="space-y-2">
                {voces.length === 0 && <p className="text-sm" style={{ color: "var(--text-3)" }}>Cargando voces...</p>}
                {voces.map(v => (
                  <label key={v.id} className="flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all"
                    style={{
                      border: `1px solid ${voz === v.id ? "var(--accent)" : "var(--border)"}`,
                      background: voz === v.id ? "rgba(99,102,241,0.08)" : "transparent"
                    }}>
                    <input type="radio" name="voz" value={v.id} checked={voz === v.id} onChange={() => setVoz(v.id)} className="shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{v.nombre}</span>
                        <span className="text-xs" style={{ color: "var(--text-3)" }}>{v.genero === "F" ? "♀" : "♂"} · {v.proveedor}</span>
                        {v.recomendada && <span className="badge badge-blue">Recomendada</span>}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>{v.descripcion}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Número */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-3)" }}>Número telefónico</p>
              <div className="space-y-2 mb-3">
                {[
                  { val: true, title: "Comprar número nuevo", sub: "Número USA dedicado  $2 USD/mes" },
                  { val: false, title: "Usar desvío de llamada", sub: "El cliente redirige su número al agente" }
                ].map(opt => (
                  <label key={String(opt.val)} className="flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-all"
                    style={{
                      border: `1px solid ${comprarNumero === opt.val ? "var(--accent)" : "var(--border)"}`,
                      background: comprarNumero === opt.val ? "rgba(99,102,241,0.08)" : "transparent"
                    }}>
                    <input type="radio" checked={comprarNumero === opt.val} onChange={() => setComprarNumero(opt.val)} className="mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{opt.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>{opt.sub}</p>
                      {opt.val && comprarNumero && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs" style={{ color: "var(--text-3)" }}>Área:</span>
                          <input value={areaCode} onChange={e => setAreaCode(e.target.value)} className="w-16 px-2 py-1 rounded-lg text-xs text-center" placeholder="305" />
                          <span className="text-xs" style={{ color: "var(--text-3)" }}>305=Miami · 212=NYC · 404=Atlanta</span>
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              <Field label="Número para transferir urgencias" hint="El agente puede transferir la llamada cuando el cliente lo pida.">
                <input className={INPUT} value={numeroDesvio} onChange={e => setNumeroDesvio(e.target.value)} placeholder="+573001234567" />
              </Field>
            </div>

            {/* WhatsApp */}
            <Field label="WhatsApp del dueño" hint="Recibirá un resumen por WhatsApp después de cada llamada.">
              <input className={INPUT} value={whatsappDueno} onChange={e => setWhatsappDueno(e.target.value)} placeholder="3001234567" />
            </Field>

            {/* Paquete */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-3)" }}>Paquete de minutos</p>
              <div className="grid grid-cols-3 gap-3">
                {PAQUETES.map(p => (
                  <label key={p.id} className="flex flex-col p-4 rounded-xl cursor-pointer transition-all relative"
                    style={{
                      border: `1px solid ${paquete === p.id ? "var(--accent)" : "var(--border)"}`,
                      background: paquete === p.id ? "rgba(99,102,241,0.08)" : "var(--elevated)"
                    }}>
                    {p.hot && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-xs font-semibold text-white whitespace-nowrap" style={{ background: "var(--accent)" }}>Popular</span>}
                    <input type="radio" name="paquete" value={p.id} checked={paquete === p.id} onChange={() => setPaquete(p.id)} className="sr-only" />
                    <span className="text-sm font-bold mb-2" style={{ color: "var(--text)" }}>{p.label}</span>
                    <span className="text-2xl font-black" style={{ color: "var(--accent-2)" }}>{p.min}</span>
                    <span className="text-xs mb-2" style={{ color: "var(--text-3)" }}>min/mes</span>
                    <span className="text-sm font-bold text-emerald-400">{p.precio}</span>
                    <span className="text-xs mt-1" style={{ color: "var(--text-3)" }}>{p.desc}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Cal.com */}
            <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "var(--elevated)", border: "1px solid var(--border)" }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Agendamiento via Cal.com</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>El agente agenda citas directamente durante la llamada.</p>
              </div>
              <button onClick={() => setCalcomHabilitado(!calcomHabilitado)}
                className="relative w-11 h-6 rounded-full transition-colors shrink-0 ml-4"
                style={{ background: calcomHabilitado ? "var(--accent)" : "var(--border)" }}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${calcomHabilitado ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
            {calcomHabilitado && (
              <Field label="Gmail del profesional (Google Calendar)" hint="Se usará para conectar Cal.com con su calendario.">
                <input type="email" className={INPUT} value={gmailProfesional} onChange={e => setGmailProfesional(e.target.value)} placeholder="drperez@gmail.com" />
              </Field>
            )}
          </div>
        )}

        {/* PASO 5 */}
        {paso === 5 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>Preview y Despliegue</h2>

            {!desplegando && !deployListo && (
              <>
                {/* Resumen config */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["Negocio", nombre],
                    ["Tipo", `${tipoEmojis[tipo] || ""} ${tipo}`],
                    ["Profesional", profesional],
                    ["Voz", voces.find(v => v.id === voz)?.nombre || voz],
                    ["Paquete", `${PAQUETES.find(p => p.id === paquete)?.min || 0} min/mes`],
                    ["Número", comprarNumero ? `+1 (${areaCode})...` : "Desvío activo"],
                    ["Cal.com", calcomHabilitado ? "Activado" : "Desactivado"],
                    ["Servicios", `${servicios.filter(s => s.nombre).length} configurados`],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl p-3" style={{ background: "var(--elevated)", border: "1px solid var(--border)" }}>
                      <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: "var(--text-3)" }}>{k}</p>
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{v}</p>
                    </div>
                  ))}
                </div>

                {/* Prompt editable */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-3)" }}>
                    Prompt del agente <span className="normal-case font-normal">(editable)</span>
                  </p>
                  <textarea value={promptPreview} onChange={e => setPromptPreview(e.target.value)} rows={12}
                    className="w-full px-4 py-3 text-xs rounded-xl font-terminal resize-none"
                    style={{ background: "var(--elevated)", border: "1px solid var(--border)", color: "var(--text-2)" }} />
                </div>

                {error && (
                  <div className="rounded-xl p-4 text-sm" style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)", color: "#f87171" }}>
                    {error}
                  </div>
                )}

                <button onClick={desplegar}
                  className="w-full py-4 rounded-xl text-white font-bold text-base transition-all duration-150 hover:opacity-90 active:scale-95"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 24px rgba(99,102,241,0.35)" }}>
                  🚀 Desplegar Agente
                </button>
              </>
            )}

            {/* Log tiempo real */}
            {(desplegando || pasosDeploy.length > 0) && !deployListo && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-3)" }}>
                  {desplegando ? "Desplegando..." : "Log de despliegue"}
                </p>
                <div ref={logRef} className="rounded-xl p-4 space-y-2.5 max-h-80 overflow-y-auto font-terminal text-sm"
                  style={{ background: "#040410", border: "1px solid var(--border)" }}>
                  {pasosDeploy.map((p, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="shrink-0 mt-0.5" style={{
                        color: p.estado === "error" ? "#f87171" : p.estado === "ok" || p.estado === "listo" ? "#34d399" : p.estado === "corriendo" ? "#fbbf24" : "#6b7280"
                      }}>
                        {p.estado === "corriendo" ? "◉" : p.estado === "ok" || p.estado === "listo" ? "✓" : p.estado === "error" ? "✗" : "·"}
                      </span>
                      <span style={{ color: p.estado === "error" ? "#fca5a5" : p.estado === "ok" || p.estado === "listo" ? "#6ee7b7" : p.estado === "corriendo" ? "#fde68a" : "#6b7280" }}>
                        {p.msg}
                      </span>
                    </div>
                  ))}
                  {desplegando && (
                    <div className="flex items-center gap-2" style={{ color: "#4b5563" }}>
                      <span className="animate-spin-slow inline-block">⟳</span>
                      <span>Procesando...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pantalla de éxito */}
            {deployListo && resumenFinal && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <div className="p-8 text-center">
                  <div className="text-5xl mb-4">🎉</div>
                  <h3 className="text-xl font-bold text-emerald-400">¡Agente listo para recibir llamadas!</h3>
                  <p className="text-sm mt-2" style={{ color: "var(--text-3)" }}>Todo desplegado y configurado correctamente.</p>
                </div>

                {resumenFinal.phone_number && (
                  <div className="mx-6 mb-5 rounded-xl p-5 text-center" style={{ background: "var(--elevated)", border: "1px solid var(--border)" }}>
                    <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--text-3)" }}>Número del cliente  comparte esto</p>
                    <p className="text-3xl font-black font-terminal tracking-widest text-emerald-400">{resumenFinal.phone_number}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 px-6 mb-5">
                  {resumenFinal.agent_id && (
                    <div className="rounded-xl p-3" style={{ background: "var(--elevated)", border: "1px solid var(--border)" }}>
                      <p className="text-xs" style={{ color: "var(--text-3)" }}>Agent ID</p>
                      <p className="text-xs font-terminal truncate mt-1" style={{ color: "var(--text)" }}>{resumenFinal.agent_id}</p>
                    </div>
                  )}
                  {resumenFinal.n8n_workflow_id && (
                    <div className="rounded-xl p-3" style={{ background: "var(--elevated)", border: "1px solid var(--border)" }}>
                      <p className="text-xs" style={{ color: "var(--text-3)" }}>Workflow n8n</p>
                      <p className="text-xs font-terminal truncate mt-1" style={{ color: "var(--text)" }}>{resumenFinal.n8n_workflow_id}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 px-6 pb-6">
                  <a href="/clientes" className="flex-1 py-3 rounded-xl text-sm font-bold text-white text-center transition-all hover:opacity-90"
                    style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                    Ver todos los clientes
                  </a>
                  <a href="/llamadas" className="flex-1 py-3 rounded-xl text-sm font-medium text-center transition-colors"
                    style={{ background: "var(--elevated)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
                    Ver llamadas
                  </a>
                </div>
              </div>
            )}

            {deployListo && pasosDeploy.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer transition-colors hover:opacity-80" style={{ color: "var(--text-3)" }}>Ver log completo del despliegue</summary>
                <div ref={logRef} className="rounded-xl p-3 mt-2 space-y-1 font-terminal max-h-40 overflow-y-auto"
                  style={{ background: "#040410", border: "1px solid var(--border)" }}>
                  {pasosDeploy.map((p, i) => (
                    <div key={i} style={{ color: p.estado === "error" ? "#fca5a5" : "#6ee7b7" }}>{p.msg}</div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        {paso < 5 && (
          <div className="flex justify-between mt-8 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
            {paso > 1 ? (
              <button onClick={() => setPaso(p => p - 1)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                style={{ background: "var(--elevated)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
                ← Atrás
              </button>
            ) : <div />}
            {paso < 4 ? (
              <button onClick={() => setPaso(p => p + 1)} disabled={!puedeAvanzar()}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                Siguiente →
              </button>
            ) : (
              <button onClick={irADespliegue} disabled={!puedeAvanzar()}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}>
                Generar agente →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
