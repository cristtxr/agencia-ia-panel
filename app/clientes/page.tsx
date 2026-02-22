"use client";
import { useEffect, useState } from "react";

interface Cliente {
  slug: string;
  nombre: string;
  tipo: string;
  phone: string | null;
  agent_id: string | null;
  n8n_workflow: string | null;
  sheet_url: string | null;
  llamadas: number;
  minutos: number;
  costo_usd: number;
  ingreso_cop: number;
  costo_cop: number;
  ganancia_cop: number;
  margen: number;
  alerta: boolean;
  ultima_llamada: string | null;
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [seleccionado, setSeleccionado] = useState<Cliente | null>(null);

  useEffect(() => {
    fetch("/api/clientes")
      .then((r) => r.json())
      .then((data) => {
        setClientes(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
          <p className="text-gray-400 text-sm mt-1">
            {clientes.length} recepcionista{clientes.length !== 1 ? "s" : ""} activa{clientes.length !== 1 ? "s" : ""}
          </p>
        </div>
        <a
          href="/nuevo-cliente"
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          + Nuevo Cliente
        </a>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400">
          Cargando clientes...
        </div>
      ) : clientes.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-400 text-lg mb-4">No hay clientes aun</p>
          <a
            href="/nuevo-cliente"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors"
          >
            Crear primer cliente
          </a>
        </div>
      ) : (
        <div className="grid gap-4">
          {clientes.map((c) => (
            <div
              key={c.slug}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-600 transition-colors cursor-pointer"
              onClick={() => setSeleccionado(seleccionado?.slug === c.slug ? null : c)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{c.nombre}</h3>
                    {c.alerta ? (
                      <span className="px-2 py-0.5 bg-red-900/50 text-red-400 rounded text-xs">Alerta margen bajo</span>
                    ) : c.agent_id ? (
                      <span className="px-2 py-0.5 bg-green-900/50 text-green-400 rounded text-xs">Activo</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-yellow-900/50 text-yellow-400 rounded text-xs">Sin desplegar</span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">{c.tipo}</p>
                  {c.phone && (
                    <p className="text-gray-500 text-xs mt-1">{c.phone}</p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-6 text-right">
                  <div>
                    <p className="text-xs text-gray-500">Llamadas</p>
                    <p className="text-xl font-bold text-white">{c.llamadas}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Ganancia</p>
                    <p className="text-xl font-bold text-green-400">
                      ${c.ganancia_cop.toLocaleString("es-CO")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Margen</p>
                    <p
                      className={`text-xl font-bold ${
                        c.margen >= 70
                          ? "text-green-400"
                          : c.margen >= 50
                          ? "text-yellow-400"
                          : "text-red-400"
                      }`}
                    >
                      {c.margen}%
                    </p>
                  </div>
                </div>
              </div>

              {seleccionado?.slug === c.slug && (
                <div className="mt-6 pt-6 border-t border-gray-800 grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Minutos de llamada</p>
                    <p className="text-lg font-semibold text-white">{c.minutos} min</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Costo Retell</p>
                    <p className="text-lg font-semibold text-white">
                      ${c.costo_usd.toFixed(2)} USD
                    </p>
                    <p className="text-xs text-gray-500">${c.costo_cop.toLocaleString("es-CO")} COP</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Ingreso mensual</p>
                    <p className="text-lg font-semibold text-yellow-400">
                      ${c.ingreso_cop.toLocaleString("es-CO")} COP
                    </p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Ultima llamada</p>
                    <p className="text-sm font-semibold text-white">
                      {c.ultima_llamada || "Sin llamadas"}
                    </p>
                  </div>
                  <div className="col-span-2 lg:col-span-4 flex gap-3 flex-wrap">
                    {c.agent_id && (
                      <span className="text-xs bg-gray-700 text-gray-300 px-3 py-1.5 rounded">
                        Agent: {c.agent_id}
                      </span>
                    )}
                    {c.n8n_workflow && (
                      <span className="text-xs bg-gray-700 text-gray-300 px-3 py-1.5 rounded">
                        n8n: {c.n8n_workflow}
                      </span>
                    )}
                    {c.sheet_url && (
                      <a
                        href={c.sheet_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs bg-blue-900/50 text-blue-400 px-3 py-1.5 rounded hover:bg-blue-900 transition-colors"
                      >
                        Ver Google Sheet
                      </a>
                    )}
                    <a
                      href={`/llamadas?agent_id=${c.agent_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs bg-purple-900/50 text-purple-400 px-3 py-1.5 rounded hover:bg-purple-900 transition-colors"
                    >
                      Ver llamadas
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
