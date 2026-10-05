import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlaceExplorer } from "@/components/PlaceExplorer";
import { getPlaces } from "@/lib/data";
import { getDictionary,isLocale } from "@/lib/i18n";
export const metadata:Metadata={title:"Guía de bravas",description:"Busca y filtra establecimientos por su perfil de patatas bravas."};
export default async function Places({params}:{params:Promise<{locale:string}>}){const{locale}=await params;if(!isLocale(locale))notFound();const d=getDictionary(locale);const places=(await getPlaces()).filter(p=>p.productType==="bravas");return <section className="section"><div className="shell"><span className="eyebrow">{d.places.eyebrow}</span><h1 className="section-title">{d.places.title}</h1><p className="lede">{d.places.description}</p><PlaceExplorer places={places} locale={locale} dictionary={d}/></div></section>}
