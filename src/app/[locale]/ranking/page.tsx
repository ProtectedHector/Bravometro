import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { PlaceExplorer } from "@/components/PlaceExplorer";
import { getPlaces } from "@/lib/data";
import { getDictionary,isLocale } from "@/lib/i18n";
export const metadata:Metadata={title:"Ranking",description:"Ranking Bravómetro por puntuación, confianza y evidencias."};
export default async function Ranking({params}:{params:Promise<{locale:string}>}){const{locale}=await params;if(!isLocale(locale))notFound();const d=getDictionary(locale);await connection();const places=(await getPlaces()).filter(p=>p.productType==="bravas");return <section className="section"><div className="shell"><span className="eyebrow">{d.ranking.eyebrow}</span><h1 className="section-title">{d.ranking.title}</h1><p className="lede">{d.ranking.description}</p><PlaceExplorer places={places} locale={locale} dictionary={d} ranking/></div></section>}
