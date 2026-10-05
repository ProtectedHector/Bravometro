import { redirect } from "next/navigation";
export default async function SeoMadridEn({params}:{params:Promise<{locale:string}>}){const{locale}=await params;redirect(`/${locale}/ranking`)}
