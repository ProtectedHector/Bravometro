import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary,isLocale } from "@/lib/i18n";
import { futureMeters } from "@/lib/meters";
export const metadata:Metadata={title:"Más metros gastronómicos",description:"Conceptos futuros de la plataforma Bravómetro."};
export default async function Meters({params}:{params:Promise<{locale:string}>}){const{locale}=await params;if(!isLocale(locale))notFound();const d=getDictionary(locale);return <section className="section"><div className="shell"><span className="eyebrow">{d.meters.eyebrow}</span><h1 className="section-title">{d.meters.title}</h1><p className="lede">{d.meters.description} {d.meters.primary}</p><div className="notice" style={{margin:"24px 0"}}>🍳 {d.meters.unavailable}</div><div className="meter-grid">{futureMeters.map(m=><Link className="card meter-card" key={m.slug} href={`/${locale}/metros/${m.slug}`}><span className="meter-emoji">{m.emoji}</span><h2 style={{fontSize:"1.1rem",margin:"14px 0 4px"}}>{m.name[locale]}</h2><p>{m.description[locale]}</p><span className="pill">{d.meters.kitchen}</span></Link>)}</div></div></section>}
