import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/Sidebar";

export const metadata: Metadata = {
  title: "Recepcionista IA 24/7 — Panel",
  description: "Panel de gestión de la agencia de recepcionistas IA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ background: "var(--bg)" }} className="min-h-screen flex">
        <Sidebar />
        <main className="flex-1 ml-56 min-h-screen" style={{ background: "var(--bg)" }}>
          <div className="max-w-6xl mx-auto px-8 py-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
