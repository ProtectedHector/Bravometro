import { auth,currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { NextResponse } from "next/server";

export async function POST(){
  const{userId}=await auth();if(!userId)return NextResponse.json({error:"Debes iniciar sesión"},{status:401});
  const url=process.env.NEXT_PUBLIC_CONVEX_URL;const serviceToken=process.env.BRAVOMETRO_SERVICE_TOKEN;if(!url||!serviceToken)return NextResponse.json({error:"Almacenamiento no configurado"},{status:503});
  const user=await currentUser();const userName=user?.fullName??user?.firstName??user?.primaryEmailAddress?.emailAddress??"Usuario";
  try{const client=new ConvexHttpClient(url);await client.mutation(makeFunctionReference<"mutation">("contributions:syncUser"),{serviceToken,userId,userName,...(user?.primaryEmailAddress?.emailAddress?{userEmail:user.primaryEmailAddress.emailAddress}:{}),...(user?.imageUrl?{userImage:user.imageUrl}:{})});return NextResponse.json({ok:true})}catch(error){console.error("Could not sync Clerk user with Convex",error);return NextResponse.json({error:"No se pudo sincronizar el perfil"},{status:500})}
}
