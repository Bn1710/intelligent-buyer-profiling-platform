import { NextResponse } from "next/server";
import { loadWorkspace } from "@/lib/data/workspace";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return NextResponse.json(await loadWorkspace(), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { console.error("Workspace read failed", error); return NextResponse.json({ error: "Cannot load the database. Check the Supabase environment and apply the pending migrations, then retry." }, { status: 503 }); }
}

