import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { LocaleHtml } from "@/components/LocaleHtml";
import { getDictionary, isLocale, locales } from "@/lib/i18n";

export function generateStaticParams() { return locales.map((locale)=>({locale})); }

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{locale:string}> }) {
  const {locale}=await params; if(!isLocale(locale)) notFound(); const d=getDictionary(locale);
  return <><LocaleHtml locale={locale}/><Header locale={locale} dictionary={d}/><main>{children}</main><Footer locale={locale} dictionary={d}/></>;
}
