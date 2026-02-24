import { NextResponse } from "next/server";

const VOCES = [
  { id: "cartesia-Hailey-Spanish-latin-america", nombre: "Hailey", descripcion: "Voz femenina latina, calida y natural. Recomendada.", genero: "F", proveedor: "Cartesia", recomendada: true },
  { id: "cartesia-Sofia-Spanish", nombre: "Sofia", descripcion: "Voz femenina espanola, profesional.", genero: "F", proveedor: "Cartesia", recomendada: false },
  { id: "11labs-Rachel", nombre: "Rachel", descripcion: "Voz femenina ElevenLabs, muy natural.", genero: "F", proveedor: "ElevenLabs", recomendada: false },
  { id: "11labs-Daniel", nombre: "Daniel", descripcion: "Voz masculina ElevenLabs, profesional.", genero: "M", proveedor: "ElevenLabs", recomendada: false },
  { id: "openai-Shimmer", nombre: "Shimmer", descripcion: "Voz femenina OpenAI, clara y amable.", genero: "F", proveedor: "OpenAI", recomendada: false },
  { id: "openai-Echo", nombre: "Echo", descripcion: "Voz masculina OpenAI, formal.", genero: "M", proveedor: "OpenAI", recomendada: false },
];

export async function GET() {
  return NextResponse.json(VOCES);
}
