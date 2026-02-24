"use client";
import { useState, useEffect, useRef } from "react";

// ── Tipos ─────────────────────────────────────────────────────
interface Servicio { nombre: string; precio: string }
interface Faq { pregunta: string; respuesta: string }
interface Voz { id: string; nombre: string; descripcion: string; genero: string; proveedor: string; recomendada: boolean }
interface PasoDespliegue { paso: number; estado: "corriendo"|"ok"|"error"|"listo"; msg: string; saltado?: boolean; resumen?: any }

// ── Constantes ────────────────────────────────────────────────
const TIPOS = ["odontologia","estetica","taller","abogado","otro"];
const PAQUETES = [
  { id:"basico",   label:"Basico",   min:300,  precio:"$500.000/mes",   descripcion:"~10 llamadas/dia. Ideal para inicio." },
  { id:"estandar", label:"Estandar", min:600,  precio:"$700.000/mes",   descripcion:"~20 llamadas/dia. El mas popular.", recomendado:true },
  { id:"pro",      label:"Pro",      min:1200, precio:"$1.100.000/mes", descripcion:"~40 llamadas/dia. Alto volumen." },
];
const PASOS_LABELS = ["Info del negocio","Servicios","Preguntas","Config. tecnica","Despliegue"];

export default function NuevoClientePage() {
  const [paso, setPaso] = useState(1);
  const [voces, setVoces] = useState<Voz[]>([]);

  // Paso 1
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("odontologia");
  const [profesional, setProfesional] = useState("");
  const [direccion, setDireccion] = useState("");
  const [horario, setHorario] = useState("Lunes a Viernes 8am-6pm, Sabados 8am-1pm");
  const [duracion, setDuracion] = useState("30");
  const [metodosPago, setMetodosPago] = useState("Efectivo, Nequi, Bancolombia");
  const [email, setEmail] = useState("");
  const [reglas, setReglas] = useState("");

  // Paso 2
  const [servicios, setServicios] = useState<Servicio[]>([{ nombre:"", precio:"" }]);

  // Paso 3
  const [faqs, setFaqs] = useState<Faq[]>([{ pregunta:"", respuesta:"" }]);

  // Paso 4
  const [voz, setVoz] = useState("cartesia-Hailey-Spanish-latin-america");
  const [comprarNumero, setComprarNumero] = useState(true);
  const [areaCode, setAreaCode] = useState("305");
  const [numeroDesvio, setNumeroDesvio] = useState("");
  const [whatsappDueno, setWhatsappDueno] = useState("");
  const [paquete, setPaquete] = useState("estandar");
  const [calcomHabilitado, setCalcomHabilitado] = useState(true);
  const [gmailProfesional, setGmailProfesional] = useState("");

  // Paso 5
  const [slug, setSlug] = useState("");
  const [promptPreview, setPromptPreview] = useState("");
  const [desplegando, setDesplegando] = useState(false);
  const [pasosDeploy, setPasosDeploy] = useState<PasoDespliegue[]>([]);
  const [deployListo, setDeployListo] = useState(false);
  const [resumenFinal, setResumenFinal] = useState<any>(null);
  const [error, setError] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/voces").then(r => r.json()).then(setVoces).catch(() => {});
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [pasosDeploy]);

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
      nombre, tipo, profesional, direccion, horario, duracion,
      servicios: serviciosObj, faqs: faqsLimpios, metodos_pago: metodosPago,
      reglas, email, voz,
      comprar_numero: comprarNumero, area_code: Number(areaCode),
      numero_desvio: numeroDesvio, whatsapp_dueno: whatsappDueno,
      paquete_minutos: paquete, calcom_habilitado: calcomHabilitado,
      gmail_profesional: gmailProfesional,
    };

    const res = await fetch("/api/nuevo-cliente", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) { setError(data.error || "Error creando cliente"); return; }
    setSlug(data.slug);
    setPromptPreview(data.prompt || "");
    setPaso(5);
  }

  async function desplegar() {
    setDesplegando(true);
    setPasosDeploy([]);
    setDeployListo(false);
    setResumenFinal(null);

    const res = await fetch("/api/deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, prompt: promptPreview }),
    });

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
          if (data.paso === 99 && data.estado === "listo") {
            setDeployListo(true);
            setResumenFinal(data.resumen);
          }
        } catch {}
      }
    }
    setDesplegando(false);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Nuevo Cliente</h1>
      <p className="text-gray-400 mb-6">Configura y despliega un agente de voz especializado en minutos.</p>

      {/* Barra de progreso */}
      <div className="flex items-center gap-1 mb-8">
        {PASOS_LABELS.map((label, i) => {
          const n = i + 1;
          const activo = paso === n;
          const completo = paso > n;
          return (
            <div key={n} className="flex items-center gap-1 flex-1">
              <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium flex-1 ${activo ? "bg-blue-600 text-white" : completo ? "bg-green-800 text-green-100" : "bg-gray-800 text-gray-500"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${activo ? "bg-white text-blue-600" : completo ? "bg-green-400 text-green-900" : "bg-gray-700 text-gray-400"}`}>
                  {completo ? "✓" : n}
                </span>
                <span className="hidden sm:block truncate">{label}</span>
              </div>
              {i < PASOS_LABELS.length - 1 && <div className="w-2 h-px bg-gray-700 shrink-0" />}
            </div>
          );
        })}
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">

        {/* PASO 1 */}
        {paso === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Informacion del negocio</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Nombre del negocio *</label>
                <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Consultorio Odontologico Dr. Perez" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Tipo de negocio *</label>
                <select value={tipo} onChange={e=>setTipo(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                  {TIPOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Profesional / Dueno *</label>
                <input value={profesional} onChange={e=>setProfesional(e.target.value)} placeholder="Dr. Carlos Perez" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Direccion</label>
                <input value={direccion} onChange={e=>setDireccion(e.target.value)} placeholder="Calle 5 #12-34, El Bagre, Antioquia" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Horario de atencion</label>
                <input value={horario} onChange={e=>setHorario(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Duracion de cita (min)</label>
                <input type="number" value={duracion} onChange={e=>setDuracion(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Metodos de pago</label>
                <input value={metodosPago} onChange={e=>setMetodosPago(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Email del dueno</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="dueno@gmail.com" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Reglas especiales</label>
                <textarea value={reglas} onChange={e=>setReglas(e.target.value)} rows={2} placeholder="Ej: Menores de edad deben venir con acompanante." className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
              </div>
            </div>
          </div>
        )}

        {/* PASO 2 */}
        {paso === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-2">Servicios y precios</h2>
            <p className="text-xs text-gray-400 mb-4">El agente usara estos datos exactos. No inventa precios.</p>
            {servicios.map((s, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input value={s.nombre} onChange={e => { const n=[...servicios]; n[i]={...n[i],nombre:e.target.value}; setServicios(n); }} placeholder="Nombre del servicio" className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" value={s.precio} onChange={e => { const n=[...servicios]; n[i]={...n[i],precio:e.target.value}; setServicios(n); }} placeholder="50000" className="w-36 bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <button onClick={() => setServicios(servicios.filter((_,j)=>j!==i))} className="text-gray-500 hover:text-red-400 text-xl px-1">×</button>
              </div>
            ))}
            <button onClick={() => setServicios([...servicios, {nombre:"",precio:""}])} className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-2">
              + Agregar servicio
            </button>
          </div>
        )}

        {/* PASO 3 */}
        {paso === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-2">Preguntas frecuentes</h2>
            <p className="text-xs text-gray-400 mb-4">Las preguntas mas comunes que recibe el negocio. El agente las respondera automaticamente.</p>
            {faqs.map((f, i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400 font-medium">Pregunta {i+1}</span>
                  <button onClick={() => setFaqs(faqs.filter((_,j)=>j!==i))} className="text-xs text-gray-500 hover:text-red-400">Eliminar</button>
                </div>
                <input value={f.pregunta} onChange={e => { const n=[...faqs]; n[i]={...n[i],pregunta:e.target.value}; setFaqs(n); }} placeholder="¿Atienden ninos?" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
                <textarea value={f.respuesta} onChange={e => { const n=[...faqs]; n[i]={...n[i],respuesta:e.target.value}; setFaqs(n); }} rows={2} placeholder="Si, atendemos pacientes de todas las edades..." className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
              </div>
            ))}
            <button onClick={() => setFaqs([...faqs, {pregunta:"",respuesta:""}])} className="text-sm text-blue-400 hover:text-blue-300">
              + Agregar pregunta
            </button>
          </div>
        )}

        {/* PASO 4 */}
        {paso === 4 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-white mb-4">Configuracion tecnica</h2>

            {/* Voz */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-3 block">Voz del agente</label>
              <div className="space-y-2">
                {voces.length === 0 && <p className="text-gray-500 text-sm">Cargando voces...</p>}
                {voces.map(v => (
                  <label key={v.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${voz===v.id ? "border-blue-500 bg-blue-500/10" : "border-gray-700 hover:border-gray-600"}`}>
                    <input type="radio" name="voz" value={v.id} checked={voz===v.id} onChange={()=>setVoz(v.id)} className="accent-blue-500" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-sm font-medium">{v.nombre}</span>
                        <span className="text-xs text-gray-500">{v.genero === "F" ? "♀" : "♂"} · {v.proveedor}</span>
                        {v.recomendada && <span className="text-xs bg-green-800 text-green-200 px-2 py-0.5 rounded-full">Recomendada</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{v.descripcion}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Numero */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-3 block">Numero telefonico</label>
              <div className="space-y-2">
                <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${comprarNumero ? "border-blue-500 bg-blue-500/10" : "border-gray-700"}`}>
                  <input type="radio" checked={comprarNumero} onChange={()=>setComprarNumero(true)} className="accent-blue-500 mt-0.5" />
                  <div>
                    <p className="text-white text-sm font-medium">Comprar numero nuevo — $2 USD/mes</p>
                    <p className="text-xs text-gray-400">Numero USA dedicado para este cliente.</p>
                    {comprarNumero && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-gray-400">Codigo de area:</span>
                        <input value={areaCode} onChange={e=>setAreaCode(e.target.value)} className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs" placeholder="305" />
                        <span className="text-xs text-gray-500">305=Miami · 212=NYC · 404=Atlanta</span>
                      </div>
                    )}
                  </div>
                </label>
                <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${!comprarNumero ? "border-blue-500 bg-blue-500/10" : "border-gray-700"}`}>
                  <input type="radio" checked={!comprarNumero} onChange={()=>setComprarNumero(false)} className="accent-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">Usar desvio de llamada</p>
                    <p className="text-xs text-gray-400">El cliente ya tiene numero y redirige al agente.</p>
                  </div>
                </label>
              </div>
              <div className="mt-3">
                <label className="text-xs text-gray-400 mb-1 block">Numero del profesional para transferir urgencias</label>
                <input value={numeroDesvio} onChange={e=>setNumeroDesvio(e.target.value)} placeholder="+573001234567" className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
                <p className="text-xs text-gray-500 mt-1">El agente puede transferir la llamada cuando el cliente lo pida o en emergencias.</p>
              </div>
            </div>

            {/* WhatsApp */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">WhatsApp del dueno</label>
              <input value={whatsappDueno} onChange={e=>setWhatsappDueno(e.target.value)} placeholder="3001234567" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
              <p className="text-xs text-gray-500 mt-1">Recibira un resumen por WhatsApp despues de cada llamada.</p>
            </div>

            {/* Paquete */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-3 block">Paquete de minutos</label>
              <div className="grid grid-cols-3 gap-3">
                {PAQUETES.map(p => (
                  <label key={p.id} className={`flex flex-col p-4 rounded-lg border cursor-pointer transition-all relative ${paquete===p.id ? "border-blue-500 bg-blue-500/10" : "border-gray-700 hover:border-gray-600"}`}>
                    {p.recomendado && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full whitespace-nowrap">Popular</span>}
                    <input type="radio" name="paquete" value={p.id} checked={paquete===p.id} onChange={()=>setPaquete(p.id)} className="sr-only" />
                    <span className="text-white font-bold">{p.label}</span>
                    <span className="text-blue-400 text-xl font-bold mt-1">{p.min}</span>
                    <span className="text-xs text-gray-400">min/mes</span>
                    <span className="text-green-400 text-xs font-medium mt-2">{p.precio}</span>
                    <span className="text-gray-500 text-xs mt-1">{p.descripcion}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Cal.com */}
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-white">Agendamiento via Cal.com</p>
                <p className="text-xs text-gray-400">El agente agenda citas directamente durante la llamada.</p>
              </div>
              <button onClick={()=>setCalcomHabilitado(!calcomHabilitado)} className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${calcomHabilitado ? "bg-blue-600" : "bg-gray-700"}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${calcomHabilitado ? "translate-x-7" : "translate-x-1"}`} />
              </button>
            </div>
            {calcomHabilitado && (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Gmail del profesional (para Google Calendar)</label>
                <input value={gmailProfesional} onChange={e=>setGmailProfesional(e.target.value)} placeholder="drperez@gmail.com" className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>
            )}
          </div>
        )}

        {/* PASO 5 */}
        {paso === 5 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-white mb-2">Preview y Despliegue</h2>

            {!desplegando && !deployListo && (
              <>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    ["Negocio", nombre], ["Tipo", tipo], ["Profesional", profesional],
                    ["Voz", voces.find(v=>v.id===voz)?.nombre || voz],
                    ["Paquete", `${PAQUETES.find(p=>p.id===paquete)?.min||0} min/mes`],
                    ["Numero", comprarNumero ? `Nuevo (+1 ${areaCode})` : "Desvio"],
                    ["Cal.com", calcomHabilitado ? "Activado" : "Desactivado"],
                    ["Servicios", `${servicios.filter(s=>s.nombre).length} configurados`],
                  ].map(([k,v]) => (
                    <div key={k as string} className="bg-gray-800 rounded-lg p-3">
                      <p className="text-xs text-gray-400">{k}</p>
                      <p className="text-white font-medium text-sm truncate">{v}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Prompt del agente (editable antes de desplegar)</label>
                  <textarea value={promptPreview} onChange={e=>setPromptPreview(e.target.value)} rows={14} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-3 text-gray-300 text-xs font-mono focus:outline-none focus:border-blue-500 resize-none" />
                </div>

                {error && <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-400 text-sm">{error}</div>}

                <button onClick={desplegar} className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg transition-colors">
                  Desplegar Agente
                </button>
              </>
            )}

            {/* Log en tiempo real */}
            {(desplegando || pasosDeploy.length > 0) && !deployListo && (
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">Desplegando...</h3>
                <div ref={logRef} className="bg-gray-950 rounded-xl p-4 space-y-2 max-h-80 overflow-y-auto font-mono text-sm border border-gray-800">
                  {pasosDeploy.map((p, i) => (
                    <div key={i} className={`flex items-start gap-2 ${p.estado==="error" ? "text-red-400" : p.estado==="ok"||p.estado==="listo" ? "text-green-400" : "text-yellow-300"}`}>
                      <span className="shrink-0">{p.estado==="corriendo" ? "⟳" : p.estado==="ok"||p.estado==="listo" ? "✓" : p.estado==="error" ? "✗" : "·"}</span>
                      <span>{p.msg}</span>
                    </div>
                  ))}
                  {desplegando && <div className="text-gray-500 animate-pulse">Procesando...</div>}
                </div>
              </div>
            )}

            {/* Pantalla de exito */}
            {deployListo && resumenFinal && (
              <div className="bg-green-950/50 border border-green-800 rounded-xl p-6 space-y-5">
                <div className="text-center">
                  <div className="text-5xl mb-3">🎉</div>
                  <h3 className="text-xl font-bold text-green-400">Agente listo para recibir llamadas</h3>
                  <p className="text-gray-400 text-sm mt-1">Todo desplegado y configurado correctamente.</p>
                </div>

                {resumenFinal.phone_number && (
                  <div className="bg-gray-900 rounded-xl p-4 text-center border border-gray-700">
                    <p className="text-xs text-gray-400 mb-1">Numero del cliente — comparte esto con el negocio</p>
                    <p className="text-3xl font-bold text-white font-mono tracking-wider">{resumenFinal.phone_number}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {resumenFinal.agent_id && <div className="bg-gray-800 rounded p-2"><p className="text-gray-400">Agent ID</p><p className="text-white font-mono truncate">{resumenFinal.agent_id}</p></div>}
                  {resumenFinal.n8n_workflow_id && <div className="bg-gray-800 rounded p-2"><p className="text-gray-400">Workflow n8n</p><p className="text-white font-mono truncate">{resumenFinal.n8n_workflow_id}</p></div>}
                  {resumenFinal.calcom_event_type_id && <div className="bg-gray-800 rounded p-2"><p className="text-gray-400">Cal.com Event</p><p className="text-white font-mono">{resumenFinal.calcom_event_type_id}</p></div>}
                  {resumenFinal.webhook_url && <div className="bg-gray-800 rounded p-2 col-span-2"><p className="text-gray-400">Webhook URL</p><p className="text-white font-mono truncate">{resumenFinal.webhook_url}</p></div>}
                </div>

                <div className="flex gap-3">
                  <a href="/clientes" className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold text-center transition-colors">Ver todos los clientes</a>
                  <a href="/llamadas" className="flex-1 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium text-center transition-colors">Ver llamadas</a>
                </div>
              </div>
            )}

            {/* Log de exito */}
            {deployListo && pasosDeploy.length > 0 && (
              <details className="text-xs">
                <summary className="text-gray-500 cursor-pointer hover:text-gray-400">Ver log completo del despliegue</summary>
                <div ref={logRef} className="bg-gray-950 rounded-lg p-3 mt-2 space-y-1 font-mono max-h-48 overflow-y-auto border border-gray-800">
                  {pasosDeploy.map((p, i) => (
                    <div key={i} className={p.estado==="error" ? "text-red-400" : "text-green-400"}>{p.msg}</div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* Botones de navegacion */}
        {paso < 5 && (
          <div className="flex justify-between mt-8 pt-4 border-t border-gray-800">
            {paso > 1 ? (
              <button onClick={()=>setPaso(p=>p-1)} className="px-5 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors">
                Atras
              </button>
            ) : <div />}
            {paso < 4 ? (
              <button onClick={()=>setPaso(p=>p+1)} disabled={!puedeAvanzar()} className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors">
                Siguiente
              </button>
            ) : (
              <button onClick={irADespliegue} disabled={!puedeAvanzar()} className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors">
                Generar agente y continuar →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
