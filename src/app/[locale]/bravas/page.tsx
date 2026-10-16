import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { PlaceExplorer } from "@/components/PlaceExplorer";
import { RestaurantScanner } from "@/components/RestaurantScanner";
import { isCurrentUserAdmin } from "@/lib/admin-access";
import { readCatalogState } from "@/lib/catalog-state";
import { getPlaces,getRegisteredPlaceCount } from "@/lib/data";
import { getDictionary,isLocale } from "@/lib/i18n";
export const metadata:Metadata={title:"Guía de bravas",description:"Busca y filtra establecimientos por su perfil de patatas bravas."};
export default async function Places({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){const{locale}=await params;if(!isLocale(locale))notFound();const query=await searchParams;const paramsReader=new URLSearchParams();for(const[key,value]of Object.entries(query)){if(typeof value==="string")paramsReader.set(key,value)}const initialState=readCatalogState(paramsReader);const d=getDictionary(locale);await connection();const[loadedPlaces,totalRegistered,isAdmin]=await Promise.all([getPlaces(),getRegisteredPlaceCount(),isCurrentUserAdmin()]);const places=loadedPlaces.filter(p=>p.productType==="bravas");return <section className="section"><div className="shell"><span className="eyebrow">{d.places.eyebrow}</span><h1 className="section-title">{d.places.title}</h1><p className="lede">{d.places.description}</p>{process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY&&<RestaurantScanner/>}<PlaceExplorer places={places} totalRegistered={totalRegistered} locale={locale} dictionary={d} isAdmin={isAdmin} initialState={initialState}/></div></section>}
