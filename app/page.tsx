"use client";
import { useEffect, useState } from "react";

interface Cliente {
  slug: string;
  nombre: string;
  tipo: string;
  phone: string | null;
  agent_id: string | null;
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

function StatCard({
  title,
  value,
  sub,
  color,
}: {
  title: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <p className="text-sm text-gray-400 mb-1">{title}</p>
      <p className={`text-3xl font-bold ${color || "text-white"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clientes")
      .then((r) => r.json())
      .then((data) => {
        setClientes(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalLlamadas = clientes.reduce((s, c) => s + c.llamadas, 0);
  const totalMinutos = clientes.reduce((s, c) => s + c.minutos, 0);
  const totalIngreso = clientes.reduce((s, c) => s + c.ingreso_cop, 0);
  const totalGanancia = clientes.reduce((s, c) => s + c.ganancia_cop, 0);
  const margenGlobal =
    totalIngreso > 0 ? Math.round((totalGanancia / totalIngreso) * 100) : 0;
  const alertas = clientes.filter((c) => c.alerta).length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">
          Resumen general de la agencia
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="text-gray-400">Cargando datos...</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Clientes Activos"
              value={String(clientes.length)}
              sub="recepcionistas en servicio"
              color="text-blue-400"
            />
            <StatCard
              title="Llamadas Totales"
              value={String(totalLlamadas)}
              sub={`${Math.round(totalMinutos)} minutos`}
              color="text-green-400"
            />
            <StatCard
              title="Ingreso Mensual"
              value={`$${totalIngreso.toLocaleString("es-CO")}`}
              sub="COP estimado"
              color="text-yellow-400"
            />
            <StatCard
              title="Margen Global"
              value={`${margenGlobal}%`}
              sub={
                alertas > 0
                  ? `${alertas} cliente(s) con alerta`
                  : "Sin alertas"
              }
              color={
                margenGlobal >= 70
                  ? "text-green-400"
                  : margenGlobal >= 50
                  ? "text-yellow-400"
                  : "text-red-400"
              }
            />
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Clientes</h2>
              <a
                href="/nuevo-cliente"
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                + Nuevo
              </a>
            </div>
            {clientes.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No hay clientes aun.{" "}
                <a href="/nuevo-cliente" className="text-blue-400 hover:underline">
                  Crear el primero
                </a>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-800">
                    <th className="px-6 py-3">Negocio</th>
                    <th className="px-6 py-3">Llamadas</th>
                    <th className="px-6 py-3">Minutos</th>
                    <th className="px-6 py-3">Costo</th>
                    <th className="px-6 py-3">Ganancia</th>
                    <th className="px-6 py-3">Margen</th>
                    <th className="px-6 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((c) => (
                    <tr
                      key={c.slug}
                      className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{c.nombre}</div>
                        <div className="text-xs text-gray-500">{c.tipo}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-300">{c.llamadas}</td>
                      <td className="px-6 py-4 text-gray-300">
                        {c.minutos} min
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        ${c.costo_cop.toLocaleString("es-CO")}
                      </td>
                      <td className="px-6 py-4 text-green-400">
                        ${c.ganancia_cop.toLocaleString("es-CO")}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`font-bold ${
                            c.margen >= 70
                              ? "text-green-400"
                              : c.margen >= 50
                              ? "text-yellow-400"
                              : "text-red-400"
                          }`}
                        >
                          {c.margen}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {c.alerta ? (
                          <span className="px-2 py-1 bg-red-900/50 text-red-400 rounded text-xs">
                            Alerta
                          </span>
                        ) : c.agent_id ? (
                          <span className="px-2 py-1 bg-green-900/50 text-green-400 rounded text-xs">
                            Activo
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-900/50 text-yellow-400 rounded text-xs">
                            Sin desplegar
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
