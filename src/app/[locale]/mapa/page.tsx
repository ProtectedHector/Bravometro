import type { Metadata } from "next";
import { auth,currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { notFound } from "next/navigation";
import { MapExplorer } from "@/components/MapExplorer";
import { getMapPlaces } from "@/lib/data";
import { getDictionary,isLocale } from "@/lib/i18n";
import type { MyRating } from "@/lib/types";
export const metadata:Metadata={title:"Mapa",description:"Mapa de establecimientos con patatas bravas analizadas."};
export const dynamic="force-dynamic";
export default async function MapPage({params}:{params:Promise<{locale:string}>}){const{locale}=await params;if(!isLocale(locale))notFound();const d=getDictionary(locale);const places=(await getMapPlaces()).filter(p=>p.productType==="bravas");const{userId}=await auth();let votedPlaceIds:string[]=[];const url=process.env.NEXT_PUBLIC_CONVEX_URL;const serviceToken=process.env.BRAVOMETRO_SERVICE_TOKEN;if(userId&&url&&serviceToken){try{const user=await currentUser();const client=new ConvexHttpClient(url);const userName=user?.fullName??user?.firstName??user?.primaryEmailAddress?.emailAddress??"Usuario";await client.mutation(makeFunctionReference<"mutation">("contributions:syncUser"),{serviceToken,userId,userName,...(user?.primaryEmailAddress?.emailAddress?{userEmail:user.primaryEmailAddress.emailAddress}:{}),...(user?.imageUrl?{userImage:user.imageUrl}:{})});const ratings=await client.query(makeFunctionReference<"query">("contributions:myRatings"),{serviceToken,userId}) as MyRating[];votedPlaceIds=ratings.map(rating=>rating.place.id)}catch(error){console.error("Could not load user map ratings",error)}}return <section className="section"><div className="shell"><span className="eyebrow">{d.map.eyebrow}</span><h1 className="section-title">{d.map.title}</h1><p className="lede">{d.map.description}</p><div style={{marginTop:28}}><MapExplorer places={places} votedPlaceIds={votedPlaceIds} locale={locale} dictionary={d} mapApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY} mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}/></div></div></section>}
