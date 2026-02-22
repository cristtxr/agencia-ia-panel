"use client";
import { useState } from "react";

interface Servicio {
  nombre: string;
  precio: string;
}

interface FAQ {
  pregunta: string;
  respuesta: string;
}

export default function NuevoClientePage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; slug?: string; message?: string; error?: string } | null>(null);

  // Campos del formulario
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("");
  const [profesional, setProfesional] = useState("");
  const [direccion, setDireccion] = useState("");
  const [horario, setHorario] = useState("Lunes a Viernes 8am-6pm, Sabados 8am-1pm");
  const [duracion, setDuracion] = useState("30");
  const [metodos_pago, setMetodosPago] = useState("Efectivo, Nequi, Bancolombia");
  const [email, setEmail] = useState("");
  const [reglas, setReglas] = useState("");
  const [servicios, setServicios] = useState<Servicio[]>([{ nombre: "", precio: "" }]);
  const [faqs, setFaqs] = useState<FAQ[]>([{ pregunta: "", respuesta: "" }]);

  const tiposNegocio = [
    "Odontologia",
    "Clinica Estetica",
    "Taller de Maquinaria",
    "Abogado / Consultorio Juridico",
    "Medicina General",
    "Peluqueria / Barberia",
    "Otro",
  ];

  const addServicio = () => setServicios([...servicios, { nombre: "", precio: "" }]);
  const removeServicio = (i: number) => setServicios(servicios.filter((_, idx) => idx !== i));
  const updateServicio = (i: number, field: keyof Servicio, val: string) => {
    const nuevo = [...servicios];
    nuevo[i][field] = val;
    setServicios(nuevo);
  };

  const addFaq = () => setFaqs([...faqs, { pregunta: "", respuesta: "" }]);
  const removeFaq = (i: number) => setFaqs(faqs.filter((_, idx) => idx !== i));
  const updateFaq = (i: number, field: keyof FAQ, val: string) => {
    const nuevo = [...faqs];
    nuevo[i][field] = val;
    setFaqs(nuevo);
  };

  const handleSubmit = async () => {
    setLoading(true);
    const serviciosObj: Record<string, number> = {};
    servicios.filter((s) => s.nombre).forEach((s) => {
      serviciosObj[s.nombre] = Number(s.precio) || 0;
    });
    const faqsLimpias = faqs.filter((f) => f.pregunta);

    const body = {
      nombre,
      tipo,
      profesional,
      direccion,
      horario,
      duracion: Number(duracion),
      metodos_pago,
      email,
      reglas,
      servicios: serviciosObj,
      faqs: faqsLimpias,
    };

    try {
      const res = await fetch("/api/nuevo-cliente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setResultado(data);
    } catch (e: any) {
      setResultado({ ok: false, error: e.message });
    } finally {
      setLoading(false);
    }
  };

  if (resultado) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Nuevo Cliente</h1>
        </div>
        <div className={`bg-gray-900 border ${resultado.ok ? "border-green-700" : "border-red-700"} rounded-xl p-8 text-center`}>
          {resultado.ok ? (
            <>
              <div className="text-5xl mb-4">✓</div>
              <h2 className="text-xl font-bold text-green-400 mb-2">Cliente creado exitosamente</h2>
              <p className="text-gray-400 mb-2">{resultado.message}</p>
              <p className="text-sm text-gray-500 mb-6">
                Carpeta: <code className="bg-gray-800 px-2 py-0.5 rounded">clientes/{resultado.slug}/</code>
              </p>
              <div className="bg-gray-800 rounded-lg p-4 text-left mb-6">
                <p className="text-sm font-semibold text-white mb-2">Proximos pasos:</p>
                <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
                  <li>Ejecuta <code className="bg-gray-700 px-1 rounded">python scripts/deploy_full.py {resultado.slug}</code></li>
                  <li>Compra un numero en Retell o importa uno de Twilio</li>
                  <li>Prueba con <code className="bg-gray-700 px-1 rounded">python scripts/test_webhook.py {resultado.slug}</code></li>
                </ol>
              </div>
              <div className="flex gap-3 justify-center">
                <a href="/clientes" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm transition-colors">
                  Ver clientes
                </a>
                <button
                  onClick={() => { setResultado(null); setStep(1); setNombre(""); setTipo(""); setProfesional(""); }}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg text-sm transition-colors"
                >
                  Crear otro
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-5xl mb-4">✗</div>
              <h2 className="text-xl font-bold text-red-400 mb-2">Error al crear el cliente</h2>
              <p className="text-gray-400 mb-6">{resultado.error}</p>
              <button
                onClick={() => setResultado(null)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg text-sm transition-colors"
              >
                Intentar de nuevo
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Nuevo Cliente</h1>
        <p className="text-gray-400 text-sm mt-1">Configura la recepcionista IA para un nuevo negocio</p>
      </div>

      {/* Pasos */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => setStep(s)}
              className={`w-8 h-8 rounded-full text-sm font-bold transition-colors ${
                step === s
                  ? "bg-blue-600 text-white"
                  : step > s
                  ? "bg-green-700 text-white"
                  : "bg-gray-700 text-gray-400"
              }`}
            >
              {step > s ? "✓" : s}
            </button>
            <span className={`text-sm ${step === s ? "text-white" : "text-gray-500"}`}>
              {s === 1 ? "Info basica" : s === 2 ? "Servicios" : "Preguntas frecuentes"}
            </span>
            {s < 3 && <div className="w-8 h-px bg-gray-700 mx-1" />}
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        {/* Paso 1: Info basica */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-white mb-4">Informacion del negocio</h2>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Nombre del negocio *</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Consultorio Odontologico San Pedro"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Tipo de negocio *</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Seleccionar...</option>
                {tiposNegocio.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Nombre del profesional/dueno *</label>
              <input
                value={profesional}
                onChange={(e) => setProfesional(e.target.value)}
                placeholder="Ej: Dr. Juan Garcia"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Direccion</label>
                <input
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Calle 10 # 5-20"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Duracion de cita (min)</label>
                <input
                  type="number"
                  value={duracion}
                  onChange={(e) => setDuracion(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Horario de atencion</label>
              <input
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Metodos de pago</label>
              <input
                value={metodos_pago}
                onChange={(e) => setMetodosPago(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Email del dueno (notificaciones)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dueno@negocio.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Reglas especiales</label>
              <textarea
                value={reglas}
                onChange={(e) => setReglas(e.target.value)}
                placeholder="Ej: No atendemos menores sin acompanante adulto"
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setStep(2)}
                disabled={!nombre || !tipo || !profesional}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* Paso 2: Servicios */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-white mb-4">Servicios y precios</h2>
            <p className="text-sm text-gray-400">Lista los servicios que ofrece el negocio con sus precios en COP.</p>

            <div className="space-y-3">
              {servicios.map((s, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <input
                    value={s.nombre}
                    onChange={(e) => updateServicio(i, "nombre", e.target.value)}
                    placeholder="Nombre del servicio"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="number"
                    value={s.precio}
                    onChange={(e) => updateServicio(i, "precio", e.target.value)}
                    placeholder="Precio COP"
                    className="w-36 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                  {servicios.length > 1 && (
                    <button
                      onClick={() => removeServicio(i)}
                      className="text-red-400 hover:text-red-300 text-lg w-8 flex-shrink-0"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={addServicio}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              + Agregar servicio
            </button>

            <div className="flex justify-between pt-2">
              <button
                onClick={() => setStep(1)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2.5 rounded-lg text-sm transition-colors"
              >
                ← Atras
              </button>
              <button
                onClick={() => setStep(3)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* Paso 3: FAQs */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-white mb-4">Preguntas frecuentes</h2>
            <p className="text-sm text-gray-400">Agrega las preguntas que los clientes hacen mas seguido y sus respuestas.</p>

            <div className="space-y-4">
              {faqs.map((f, i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-medium">Pregunta {i + 1}</span>
                    {faqs.length > 1 && (
                      <button onClick={() => removeFaq(i)} className="text-red-400 hover:text-red-300 text-sm">
                        Eliminar
                      </button>
                    )}
                  </div>
                  <input
                    value={f.pregunta}
                    onChange={(e) => updateFaq(i, "pregunta", e.target.value)}
                    placeholder="¿Cuanto cuesta una consulta?"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                  <textarea
                    value={f.respuesta}
                    onChange={(e) => updateFaq(i, "respuesta", e.target.value)}
                    placeholder="La consulta tiene un costo de $50.000 COP..."
                    rows={2}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={addFaq}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              + Agregar pregunta
            </button>

            <div className="flex justify-between pt-2">
              <button
                onClick={() => setStep(2)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2.5 rounded-lg text-sm transition-colors"
              >
                ← Atras
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-8 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                {loading ? "Creando..." : "Crear recepcionista"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
