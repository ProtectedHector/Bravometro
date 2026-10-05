import { auth } from "@clerk/nextjs/server";
import { NextRequest,NextResponse } from "next/server";
import { verifyGooglePlace } from "@/lib/google-places-server";

export async function POST(request:NextRequest){
  if(!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY||!process.env.CLERK_SECRET_KEY)return NextResponse.json({error:"Autenticación no configurada"},{status:503});
  const{userId}=await auth();if(!userId)return NextResponse.json({error:"Debes iniciar sesión"},{status:401});const key=process.env.GOOGLE_MAPS_API_KEY;if(!key)return NextResponse.json({error:"Google Places no está configurado"},{status:503});
  const body=await request.json();const googlePlaceId=String(body.googlePlaceId??"").trim();if(!googlePlaceId||googlePlaceId.length>300)return NextResponse.json({error:"Establecimiento no válido"},{status:400});
  try{const place=await verifyGooglePlace(googlePlaceId,body.locale==="en"?"en":"es",key);return NextResponse.json({place:{googlePlaceId:place.googlePlaceId,name:place.name,address:place.address,latitude:place.latitude,longitude:place.longitude,googleMapsUrl:place.googleMapsUrl}})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"No se pudo cargar el establecimiento"},{status:400})}
}
