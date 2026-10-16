import { unstable_cache } from "next/cache";
import { NextRequest,NextResponse } from "next/server";
import { getMapPlaces } from "@/lib/data";

const getCachedMapPlaces=unstable_cache(getMapPlaces,["bravometro-map-places"],{revalidate:900,tags:["map-places"]});

function coordinate(value:string|null,min:number,max:number){
  const parsed=Number(value);
  return Number.isFinite(parsed)&&parsed>=min&&parsed<=max?parsed:null;
}

export async function GET(request:NextRequest){
  const north=coordinate(request.nextUrl.searchParams.get("north"),-90,90);
  const south=coordinate(request.nextUrl.searchParams.get("south"),-90,90);
  const east=coordinate(request.nextUrl.searchParams.get("east"),-180,180);
  const west=coordinate(request.nextUrl.searchParams.get("west"),-180,180);
  const zoom=Math.max(1,Math.min(22,Number(request.nextUrl.searchParams.get("zoom"))||12));
  if(north===null||south===null||east===null||west===null||north<south)return NextResponse.json({error:"Límites de mapa inválidos"},{status:400});
  const all=await getCachedMapPlaces();
  const inLongitude=(longitude:number)=>west<=east?longitude>=west&&longitude<=east:longitude>=west||longitude<=east;
  const matches=all.filter(place=>typeof place.latitude==="number"&&typeof place.longitude==="number"&&place.latitude>=south&&place.latitude<=north&&inLongitude(place.longitude));
  const limit=zoom<=8?80:zoom<=11?120:250;
  const places=matches.sort((a,b)=>(b.scores.overall??-1)-(a.scores.overall??-1)||a.name.localeCompare(b.name)).slice(0,limit);
  return NextResponse.json({places,total:matches.length,truncated:matches.length>places.length},{headers:{"Cache-Control":"public, s-maxage=300, stale-while-revalidate=900"}});
}
