import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary,isLocale } from "@/lib/i18n";
import { futureMeters } from "@/lib/meters";
export function generateStaticParams(){return futureMeters.map(m=>({slug:m.slug}))}
export default async function MeterDetail({params}:{params:Promise<{locale:string;slug:string}>}){const{locale,slug}=await params;if(!isLocale(locale))notFound();const d=getDictionary(locale);const meter=futureMeters.find(m=>m.slug===slug);if(!meter)notFound();return <section className="section"><div className="shell" style={{minHeight:"62vh",display:"grid",placeItems:"center"}}><div className="card content-card" style={{maxWidth:680,textAlign:"center"}}><span style={{fontSize:"4rem"}}>{meter.emoji}</span><span className="eyebrow" style={{marginTop:18}}>{d.meters.kitchen}</span><h1 className="section-title">{meter.name[locale]}</h1><p className="lede" style={{marginInline:"auto"}}>{meter.description[locale]}. {d.meters.unavailable}</p><p className="notice">{d.meters.primary}</p><Link className="button secondary" href={`/${locale}/metros`}>← {d.actions.back}</Link></div></div></section>}
