import { NextRequest,NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

async function adminClient(){
  const expected=process.env.BRAVOMETRO_ADMIN_TOKEN;const url=process.env.NEXT_PUBLIC_CONVEX_URL;
  if(!expected||!url)throw new Error("Administración no configurada");
  const{userId,getToken}=await auth();if(!userId)throw new Error("Debes iniciar sesión");
  const jwt=await getToken({template:"convex"});if(!jwt)throw new Error("Falta configurar la plantilla JWT convex en Clerk");
  const authed=new ConvexHttpClient(url);authed.setAuth(jwt);
  const status=await authed.query(makeFunctionReference<"query">("restaurantScanner:status"),{});
  if(!status.allowed)throw new Error("Solo el administrador puede acceder a esta operación");
  return{client:new ConvexHttpClient(url),adminToken:expected};
}

function statusFor(error:unknown){
  const message=error instanceof Error?error.message:"Error interno";
  if(message==="Debes iniciar sesión")return 401;
  if(message.startsWith("Solo el administrador"))return 403;
  if(message.includes("configur"))return 503;
  return 500;
}

export async function GET(request:NextRequest){
  try{const{client,adminToken}=await adminClient();const queue=await client.query(makeFunctionReference<"query">("admin:listPending"),{adminToken});return NextResponse.json(queue,{headers:{"Cache-Control":"no-store"}})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Error interno"},{status:statusFor(error)})}
}

export async function POST(request:NextRequest){
  if(request.headers.get("origin")!==request.nextUrl.origin)return NextResponse.json({error:"Origen no autorizado"},{status:403});
  const body=await request.json();const{client,adminToken}=await adminClient();
  try{
    let result:unknown;
    if(body.operation==="upsertPlace")result=await client.mutation(makeFunctionReference<"mutation">("admin:upsertPlace"),{adminToken,name:String(body.name),slug:String(body.slug),city:String(body.city),country:"ES",neighborhood:String(body.neighborhood),address:String(body.address)});
    else if(body.operation==="upsertRating")result=await client.mutation(makeFunctionReference<"mutation">("admin:upsertRating"),{adminToken,placeSlug:String(body.placeSlug),scores:{potato:Number(body.potato),sauce:Number(body.sauce),spiciness:Number(body.spiciness),taste:Number(body.taste),texture:Number(body.texture),quantity:Number(body.quantity),value:Number(body.value)},evidenceCount:Number(body.evidenceCount),summaryEs:String(body.summaryEs),summaryEn:String(body.summaryEn)});
    else if(body.operation==="deletePlace")result=await client.mutation(makeFunctionReference<"mutation">("admin:deletePlace"),{adminToken,placeId:String(body.placeId)});
    else if(body.operation==="deleteRating")result=await client.mutation(makeFunctionReference<"mutation">("admin:deleteRating"),{adminToken,placeSlug:String(body.placeSlug)});
    else if(body.operation==="approvePlaceSubmission")result=await client.mutation(makeFunctionReference<"mutation">("admin:approvePlaceSubmission"),{adminToken,submissionId:String(body.submissionId),slug:String(body.slug),city:String(body.city),country:String(body.country||"ES"),neighborhood:String(body.neighborhood)});
    else if(body.operation==="rejectPlaceSubmission")result=await client.mutation(makeFunctionReference<"mutation">("admin:moderatePlaceSubmission"),{adminToken,submissionId:String(body.submissionId),status:"rejected"});
    else if(body.operation==="approveUserRating")result=await client.mutation(makeFunctionReference<"mutation">("admin:moderateUserRating"),{adminToken,ratingId:String(body.ratingId),status:"approved"});
    else if(body.operation==="rejectUserRating")result=await client.mutation(makeFunctionReference<"mutation">("admin:moderateUserRating"),{adminToken,ratingId:String(body.ratingId),status:"rejected"});
    else if(body.operation==="repairOverallScores")result=await client.mutation(makeFunctionReference<"mutation">("admin:repairOverallScores"),{adminToken});
    else return NextResponse.json({error:"Operación desconocida"},{status:400});
    return NextResponse.json({ok:true,result});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Error interno"},{status:statusFor(error)})}
}
