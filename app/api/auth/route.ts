import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { TEAM_COOKIE } from "@/lib/data/teams";
import { createClient } from "@/lib/supabase/server";
const credentials = z.object({ email: z.string().email().max(254), password: z.string().min(8,"Use at least 8 characters.").max(128) });
export async function POST(request: NextRequest) {
 const origin = request.headers.get("origin");
 if (origin && origin !== new URL(request.url).origin && origin !== "https://" + request.headers.get("host")) return NextResponse.json({ error:"Invalid request origin." }, { status:403 });
 try {
  const body = await request.json();
  const db = await createClient();
  if (body.action === "logout") {
   const { error } = await db.auth.signOut(); if (error) throw new Error(error.message);
   (await cookies()).delete(TEAM_COOKIE);
   return NextResponse.json({ message:"Returned to the public demo." });
  }
  const values = credentials.parse(body);
  if (body.action === "login") {
   const { error } = await db.auth.signInWithPassword(values);
   if (error) throw new Error("Sign-in failed. Check your email and password, and confirm your email if required.");
   return NextResponse.json({ message:"Your private workspace is open." });
  }
  if (body.action === "signup") {
   const { data,error } = await db.auth.signUp({ ...values, options:{ emailRedirectTo:(origin || new URL(request.url).origin) + "/auth/callback" } });
   if (error) throw new Error(error.message);
   return NextResponse.json({ message:data.session ? "Your private workspace is ready." : "Check your email to confirm your account, then sign in." });
  }
  return NextResponse.json({ error:"Unknown authentication action." },{ status:400 });
 } catch(error) { return NextResponse.json({ error:error instanceof z.ZodError ? error.issues.map(i=>i.message).join(" ") : error instanceof Error ? error.message : "Authentication unavailable. Please retry." },{ status:400 }); }
}
