import { NextResponse } from "next/server";

const RETELL_KEY = process.env.RETELL_API_KEY!;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agent_id");

  const body: any = { limit: 50 };
  if (agentId) body.filter_criteria = { agent_id: [agentId] };

  try {
    const res = await fetch("https://api.retellai.com/v2/list-calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RETELL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) return NextResponse.json({ error: "Error Retell" }, { status: 500 });
    const data = await res.json();
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
