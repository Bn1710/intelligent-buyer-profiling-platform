import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProspect, saveProspect, deleteProspect } from "@/lib/data/prospects";
import { saveInteraction, deleteInteraction } from "@/lib/data/interactions";
import { generate_profile, generate_strategy, suggest_status } from "@/lib/actions/generation";
import { idSchema, prospectSchema, interactionSchema, profileSchema, strategySchema, reviewSchema } from "@/lib/validation";
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  // Mutations must originate from this application, including cookie-authenticated requests.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin && origin !== "https://" + request.headers.get("host")) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const body = await request.json();
    const db = await createClient();
    let result: unknown;
    switch (body.action) {
      case "save_prospect": {
        const id = body.id ? idSchema.parse(body.id) : undefined;
        const values = prospectSchema.parse(body.values);
        const { data: { user } } = await db.auth.getUser();
        result = await saveProspect({ ...values, ...(!id ? { user_id: user?.id ?? null } : {}) }, id);
        break;
      }
      case "delete_prospect": {
        if (body.confirm !== true) throw new Error("Confirm deletion first.");
        await deleteProspect(idSchema.parse(body.id)); break;
      }
      case "save_interaction": {
        const values = interactionSchema.parse(body.values);
        const prospect = await getProspect(values.prospect_id);
        const id = body.id ? idSchema.parse(body.id) : undefined;
        result = await saveInteraction({ ...values, user_id: prospect.user_id }, id); break;
      }
      case "delete_interaction": {
        if (body.confirm !== true) throw new Error("Confirm deletion first.");
        await deleteInteraction(idSchema.parse(body.id)); break;
      }
      case "generate_profile": result = await generate_profile(idSchema.parse(body.id)); break;
      case "generate_strategy": result = await generate_strategy(idSchema.parse(body.id)); break;
      case "suggest_status": result = await suggest_status(idSchema.parse(body.id)); break;
      case "save_profile":
      case "save_strategy": {
        const profile = body.action === "save_profile";
        const values = profile ? profileSchema.parse(body.values) : strategySchema.parse(body.values);
        const table = profile ? "prospect_profiles" : "strategies";
        const prospect = await getProspect(idSchema.parse(body.prospect_id));
        const id = body.id ? idSchema.parse(body.id) : undefined;
        let profileId: string | undefined;
        if (id) {
          const { data: original } = await db.from(table).select("prospect_id, review_status").eq("id", id).single();
          if (original?.prospect_id !== prospect.id) throw new Error("Record does not belong to this prospect.");
          if (original.review_status === "approved" && body.confirm_approved_edit !== true) throw new Error("Confirm editing the approved record first.");
        } else if (!profile) {
          const { data: approved } = await db.from("prospect_profiles").select("id").eq("prospect_id", prospect.id).eq("review_status", "approved").order("created_at", { ascending: false }).limit(1).maybeSingle();
          if (!approved) throw new Error("Approve a profile first."); profileId = approved.id;
        }
        const query = id ? db.from(table).update({ ...values, review_status: "unreviewed", source: "consultant-edited" }).eq("id", id) : db.from(table).insert({ ...values, prospect_id: prospect.id, user_id: prospect.user_id, source: "consultant-manual", confidence: 0, review_status: "unreviewed", ...(!profile ? { profile_id: profileId } : {}) });
        const { data, error } = await query.select().single(); if (error) throw error; result = data; break;
      }
      case "review_profile":
      case "review_strategy": {
        const { data, error } = await db.from(body.action === "review_profile" ? "prospect_profiles" : "strategies").update({ review_status: reviewSchema.parse(body.review_status) }).eq("id", idSchema.parse(body.id)).select().single();
        if (error) throw error; result = data; break;
      }
      case "delete_profile":
      case "delete_strategy": {
        if (body.confirm !== true) throw new Error("Confirm deletion first.");
        const { data, error } = await db.from(body.action === "delete_profile" ? "prospect_profiles" : "strategies").delete().eq("id", idSchema.parse(body.id)).select("id");
        if (error) throw error; if (!data?.length) throw new Error("Record not found."); break;
      }
      default: return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof ZodError ? error.issues.map(i => i.message).join(" ") : error instanceof Error ? error.message : "The change could not be saved. Please retry.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

