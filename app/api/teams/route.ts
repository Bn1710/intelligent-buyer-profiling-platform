import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { teamContext, selectTeam } from "@/lib/data/teams";
const uuid = z.string().uuid();
const name = z.string().trim().min(2).max(80);
export async function POST(request: NextRequest) {
  const origin=request.headers.get("origin");
  if(origin && origin!==new URL(request.url).origin && origin!=="https://"+request.headers.get("host")) return NextResponse.json({error:"Invalid request origin."},{status:403});
  try {
    const body=await request.json(); const { db,user,activeTeamId }=await teamContext();
    if(!user) return NextResponse.json({error:"Sign in to manage teams."},{status:401});
    let result: unknown;
    const rpc=async(fn:string,args:Record<string,unknown>)=>{const {data,error}=await db.rpc(fn,args);if(error) throw new Error(error.message);return data;};
    switch(body.action){
      case "create_team": result=await rpc("create_team",{p_name:name.parse(body.name)}); await selectTeam(String(result)); break;
      case "join_team": result=await rpc("join_team",{p_code:z.string().trim().min(1).max(200).parse(body.code)}); await selectTeam(String(result)); break;
      case "switch_team": await selectTeam(uuid.parse(body.team_id)); break;
      case "create_invite": result=await rpc("create_team_invite",{p_team:activeTeamId,p_role:z.enum(["member","admin"]).parse(body.role ?? "member")}); break;
      case "assign_prospect": result=await rpc("assign_team_prospect",{p_team:activeTeamId,p_id:uuid.parse(body.id),p_user:uuid.parse(body.user_id)}); break;
      case "revoke_invite": result=await rpc("manage_team",{p_team:activeTeamId,p_action:body.action,p_invite:uuid.parse(body.id)}); break;
      case "update_member": result=await rpc("manage_team",{p_team:activeTeamId,p_action:body.action,p_user:uuid.parse(body.user_id),p_value:z.enum(["member","admin"]).parse(body.role)}); break;
      case "remove_member": if(body.confirm!==true) throw new Error("Confirm member removal first."); result=await rpc("manage_team",{p_team:activeTeamId,p_action:body.action,p_user:uuid.parse(body.user_id)}); break;
      case "rename_team": result=await rpc("manage_team",{p_team:activeTeamId,p_action:"rename",p_value:name.parse(body.name)}); break;
      default: throw new Error("Unknown team action.");
    }
    return NextResponse.json({ok:true,result});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Team change failed."},{status:400});}
}
