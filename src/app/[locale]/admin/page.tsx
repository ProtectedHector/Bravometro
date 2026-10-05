import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPanel } from "@/components/AdminPanel";
import { getPlaces } from "@/lib/data";
import { getDictionary,isLocale } from "@/lib/i18n";
export const metadata:Metadata={title:"Administración",robots:{index:false,follow:false}};
export default async function Admin({params}:{params:Promise<{locale:string}>}){const{locale}=await params;if(!isLocale(locale))notFound();const d=getDictionary(locale);const places=await getPlaces();const enabled=Boolean(process.env.NEXT_PUBLIC_CONVEX_URL&&process.env.BRAVOMETRO_ADMIN_TOKEN);return <section className="section"><div className="shell"><span className="eyebrow">{d.admin.protected}</span><h1 className="section-title">{d.admin.title}</h1><p className="lede">{d.admin.description}</p><AdminPanel places={places} dictionary={d} enabled={enabled}/></div></section>}
