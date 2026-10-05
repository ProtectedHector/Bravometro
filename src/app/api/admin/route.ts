import { NextRequest,NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

export async function GET(request:NextRequest){
  const expected=process.env.BRAVOMETRO_ADMIN_TOKEN;const url=process.env.NEXT_PUBLIC_CONVEX_URL;const supplied=request.headers.get("x-admin-token");
  if(!expected||!url)return NextResponse.json({error:"Administración no configurada"},{status:503});
  if(!supplied||supplied!==expected)return NextResponse.json({error:"No autorizado"},{status:401});
  try{const client=new ConvexHttpClient(url);const queue=await client.query(makeFunctionReference<"query">("admin:listPending"),{adminToken:supplied});return NextResponse.json(queue)}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Error interno"},{status:500})}
}

export async function POST(request:NextRequest){
  const expected=process.env.BRAVOMETRO_ADMIN_TOKEN;const url=process.env.NEXT_PUBLIC_CONVEX_URL;const supplied=request.headers.get("x-admin-token");
  if(!expected||!url)return NextResponse.json({error:"Administración no configurada"},{status:503});
  if(!supplied||supplied!==expected)return NextResponse.json({error:"No autorizado"},{status:401});
  const body=await request.json();const client=new ConvexHttpClient(url);
  try{
    if(body.operation==="upsertPlace")await client.mutation(makeFunctionReference<"mutation">("admin:upsertPlace"),{adminToken:supplied,name:String(body.name),slug:String(body.slug),city:String(body.city),country:"ES",neighborhood:String(body.neighborhood),address:String(body.address)});
    else if(body.operation==="upsertRating")await client.mutation(makeFunctionReference<"mutation">("admin:upsertRating"),{adminToken:supplied,placeSlug:String(body.placeSlug),scores:{potato:Number(body.potato),sauce:Number(body.sauce),spiciness:Number(body.spiciness),taste:Number(body.taste),texture:Number(body.texture),quantity:Number(body.quantity),value:Number(body.value)},evidenceCount:Number(body.evidenceCount),summaryEs:String(body.summaryEs),summaryEn:String(body.summaryEn)});
    else if(body.operation==="deletePlace")await client.mutation(makeFunctionReference<"mutation">("admin:deletePlace"),{adminToken:supplied,placeId:String(body.placeId)});
    else if(body.operation==="deleteRating")await client.mutation(makeFunctionReference<"mutation">("admin:deleteRating"),{adminToken:supplied,placeSlug:String(body.placeSlug)});
    else if(body.operation==="approvePlaceSubmission")await client.mutation(makeFunctionReference<"mutation">("admin:approvePlaceSubmission"),{adminToken:supplied,submissionId:String(body.submissionId),slug:String(body.slug),city:String(body.city),country:String(body.country||"ES"),neighborhood:String(body.neighborhood)});
    else if(body.operation==="rejectPlaceSubmission")await client.mutation(makeFunctionReference<"mutation">("admin:moderatePlaceSubmission"),{adminToken:supplied,submissionId:String(body.submissionId),status:"rejected"});
    else if(body.operation==="approveUserRating")await client.mutation(makeFunctionReference<"mutation">("admin:moderateUserRating"),{adminToken:supplied,ratingId:String(body.ratingId),status:"approved"});
    else if(body.operation==="rejectUserRating")await client.mutation(makeFunctionReference<"mutation">("admin:moderateUserRating"),{adminToken:supplied,ratingId:String(body.ratingId),status:"rejected"});
    else return NextResponse.json({error:"Operación desconocida"},{status:400});
    return NextResponse.json({ok:true});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Error interno"},{status:500})}
}
