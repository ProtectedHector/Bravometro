import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapExplorer } from "@/components/MapExplorer";
import { getPlaces } from "@/lib/data";
import { getDictionary,isLocale } from "@/lib/i18n";
export const metadata:Metadata={title:"Mapa",description:"Mapa de establecimientos con patatas bravas analizadas."};
export default async function MapPage({params}:{params:Promise<{locale:string}>}){const{locale}=await params;if(!isLocale(locale))notFound();const d=getDictionary(locale);const places=(await getPlaces()).filter(p=>p.productType==="bravas");return <section className="section"><div className="shell"><span className="eyebrow">{d.map.eyebrow}</span><h1 className="section-title">{d.map.title}</h1><p className="lede">{d.map.description}</p><div style={{marginTop:28}}><MapExplorer places={places} locale={locale} dictionary={d}/></div></div></section>}
