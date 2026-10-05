import { auth,currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { NextRequest,NextResponse } from "next/server";
import { verifyGooglePlace } from "@/lib/google-places-server";

export async function POST(request:NextRequest){
  if(!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY||!process.env.CLERK_SECRET_KEY)return NextResponse.json({error:"Autenticación no configurada"},{status:503});
  const{userId}=await auth();if(!userId)return NextResponse.json({error:"Debes iniciar sesión"},{status:401});
  const url=process.env.NEXT_PUBLIC_CONVEX_URL;const serviceToken=process.env.BRAVOMETRO_SERVICE_TOKEN;if(!url||!serviceToken)return NextResponse.json({error:"Almacenamiento no configurado"},{status:503});
  const key=process.env.GOOGLE_MAPS_API_KEY;if(!key)return NextResponse.json({error:"Google Places no está configurado"},{status:503});
  const body=await request.json();const googlePlaceId=String(body.googlePlaceId??"").trim();if(!googlePlaceId||googlePlaceId.length>300)return NextResponse.json({error:"Selecciona un resultado válido de Google Places"},{status:400});
  try{const place=await verifyGooglePlace(googlePlaceId,body.locale==="en"?"en":"es",key);const user=await currentUser();const client=new ConvexHttpClient(url);const result=await client.mutation(makeFunctionReference<"mutation">("contributions:submitPlace"),{serviceToken,userId,userName:user?.fullName??user?.firstName??user?.primaryEmailAddress?.emailAddress??"Usuario",...place,...(user?.primaryEmailAddress?.emailAddress?{userEmail:user.primaryEmailAddress.emailAddress}:{}),...(user?.imageUrl?{userImage:user.imageUrl}:{})}) as {placeId:string;created:boolean};return NextResponse.json({ok:true,...result},{status:result.created?201:200})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"No se pudo publicar"},{status:400})}
}
