import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { NextRequest,NextResponse } from "next/server";
import { googlePlacesFieldMask,toCandidate,type GooglePlaceResponse } from "@/lib/google-places-server";
import { allowMapsRequest } from "@/lib/request-rate-limit";
import type { GooglePlaceSearchResult } from "@/lib/types";

export async function POST(request:NextRequest){
  if(!allowMapsRequest(request))return NextResponse.json({error:"Demasiadas búsquedas. Espera unos minutos."},{status:429});
  const key=process.env.GOOGLE_MAPS_API_KEY;if(!key)return NextResponse.json({error:"Google Places no está configurado"},{status:503});
  const body=await request.json();const query=String(body.query??"").trim();if(query.length<3||query.length>180)return NextResponse.json({error:"Escribe al menos 3 caracteres"},{status:400});
  const response=await fetch("https://places.googleapis.com/v1/places:searchText",{method:"POST",headers:{"content-type":"application/json","X-Goog-Api-Key":key,"X-Goog-FieldMask":googlePlacesFieldMask},body:JSON.stringify({textQuery:query,languageCode:body.locale==="en"?"en":"es",maxResultCount:12}),signal:AbortSignal.timeout(8000),cache:"no-store"});
  if(!response.ok){console.error("Google Places error",response.status,await response.text());return NextResponse.json({error:"Google Places no ha respondido correctamente"},{status:502})}
  const data=await response.json() as {places?:GooglePlaceResponse[]};const candidates=(data.places??[]).map(toCandidate).filter(candidate=>candidate!==null);const url=process.env.NEXT_PUBLIC_CONVEX_URL;if(!url||!candidates.length)return NextResponse.json({places:candidates});
  try{const client=new ConvexHttpClient(url);const local=await client.query(makeFunctionReference<"query">("places:findByExternalIds"),{externalPlaceIds:candidates.map(place=>place.googlePlaceId)}) as Array<{googlePlaceId:string;slug:string;score:number|null;ratingCount:number}>;const byId=new Map(local.map(place=>[place.googlePlaceId,place]));const places:GooglePlaceSearchResult[]=candidates.map(place=>({...place,...(byId.has(place.googlePlaceId)?{local:byId.get(place.googlePlaceId)}:{})}));return NextResponse.json({places})}catch(error){console.error("Could not match Google Places with Convex",error);return NextResponse.json({places:candidates})}
}
