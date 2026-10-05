import { auth,currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { NextRequest,NextResponse } from "next/server";
import { verifyGooglePlace } from "@/lib/google-places-server";

const keys=["potato","sauce","spiciness","taste","texture","quantity","value"] as const;
export async function POST(request:NextRequest){
  if(!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY||!process.env.CLERK_SECRET_KEY)return NextResponse.json({error:"Autenticación no configurada"},{status:503});
  const{userId}=await auth();if(!userId)return NextResponse.json({error:"Debes iniciar sesión"},{status:401});
  const url=process.env.NEXT_PUBLIC_CONVEX_URL;const serviceToken=process.env.BRAVOMETRO_SERVICE_TOKEN;if(!url||!serviceToken)return NextResponse.json({error:"Almacenamiento no configurado"},{status:503});
  const body=await request.json();const scores=Object.fromEntries(keys.map(key=>[key,Number(body[key])]));if(keys.some(key=>!Number.isFinite(scores[key])||scores[key]<0||scores[key]>10))return NextResponse.json({error:"Valoración inválida"},{status:400});const photoStorageId=typeof body.photoStorageId==="string"&&body.photoStorageId.length<200?body.photoStorageId:undefined;
  const user=await currentUser();const client=new ConvexHttpClient(url);const identity={serviceToken,userId,userName:user?.fullName??user?.firstName??user?.primaryEmailAddress?.emailAddress??"Usuario",scores,comment:String(body.comment??"").trim().slice(0,600),...(photoStorageId?{photoStorageId}:{}),...(user?.primaryEmailAddress?.emailAddress?{userEmail:user.primaryEmailAddress.emailAddress}:{}),...(user?.imageUrl?{userImage:user.imageUrl}:{})};
  try{
    if(body.googlePlaceId){const key=process.env.GOOGLE_MAPS_API_KEY;if(!key)return NextResponse.json({error:"Google Places no está configurado"},{status:503});const place=await verifyGooglePlace(String(body.googlePlaceId),body.locale==="en"?"en":"es",key);const result=await client.mutation(makeFunctionReference<"mutation">("contributions:submitGooglePlaceRating"),{...identity,...place});return NextResponse.json({ok:true,...result},{status:201})}
    if(!body.placeId)return NextResponse.json({error:"Selecciona un establecimiento"},{status:400});const id=await client.mutation(makeFunctionReference<"mutation">("contributions:submitRating"),{...identity,placeId:String(body.placeId)});return NextResponse.json({ok:true,id},{status:201});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"No se pudo guardar"},{status:400})}
}
