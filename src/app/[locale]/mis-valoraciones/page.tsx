import type { Metadata } from "next";
import Link from "next/link";
import { auth,currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { notFound } from "next/navigation";
import { MyRatingsSignIn } from "@/components/MyRatingsSignIn";
import { getDictionary,isLocale } from "@/lib/i18n";
import type { MyRating } from "@/lib/types";

export const metadata:Metadata={title:"Mis valoraciones",description:"Historial privado de valoraciones en Bravómetro.",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";

export default async function MyRatingsPage({params}:{params:Promise<{locale:string}>}){
  const{locale}=await params;if(!isLocale(locale))notFound();const d=getDictionary(locale);const{userId}=await auth();
  if(!userId)return <section className="section"><div className="shell"><span className="eyebrow">{d.account.eyebrow}</span><h1 className="section-title">{d.account.title}</h1><p className="lede">{d.account.description}</p><div style={{marginTop:28}}><MyRatingsSignIn dictionary={d}/></div></div></section>;
  const url=process.env.NEXT_PUBLIC_CONVEX_URL;const serviceToken=process.env.BRAVOMETRO_SERVICE_TOKEN;let ratings:MyRating[]=[];let unavailable=false;
  if(url&&serviceToken){try{const user=await currentUser();const client=new ConvexHttpClient(url);const userName=user?.fullName??user?.firstName??user?.primaryEmailAddress?.emailAddress??"Usuario";await client.mutation(makeFunctionReference<"mutation">("contributions:syncUser"),{serviceToken,userId,userName,...(user?.primaryEmailAddress?.emailAddress?{userEmail:user.primaryEmailAddress.emailAddress}:{}),...(user?.imageUrl?{userImage:user.imageUrl}:{})});ratings=await client.query(makeFunctionReference<"query">("contributions:myRatings"),{serviceToken,userId}) as MyRating[]}catch(error){console.error("Could not load user ratings",error);unavailable=true}}else unavailable=true;
  const statusLabel=(status:MyRating["status"])=>d.account[status];const date=(value:number)=>new Intl.DateTimeFormat(locale,{dateStyle:"medium"}).format(new Date(value));
  return <section className="section"><div className="shell"><span className="eyebrow">{d.account.eyebrow}</span><h1 className="section-title">{d.account.title}</h1><p className="lede">{d.account.description}</p>{unavailable?<div className="notice account-notice">{d.contribute.setup}</div>:ratings.length?<div className="my-ratings-grid">{ratings.map(rating=><article className="card my-rating-card" key={rating.id}>{rating.photoUrl&&<div className="my-rating-photo" role="img" aria-label={`${d.contribute.photo}: ${rating.place.name}`} style={{backgroundImage:`url(${rating.photoUrl})`}}/>}<div className="my-rating-content"><div className="my-rating-head"><div><span className={`rating-status ${rating.status}`}>{statusLabel(rating.status)}</span><h2>{rating.place.name}</h2><p>{rating.place.address}</p></div><strong>{rating.overallScore.toFixed(1)}</strong></div><div className="my-rating-scores">{Object.entries(rating.scores).map(([key,value])=><span key={key}><small>{d.attributes[key as keyof typeof d.attributes]}</small><b>{value.toFixed(1)}</b></span>)}</div>{rating.comment&&<blockquote>“{rating.comment}”</blockquote>}<div className="my-rating-footer"><small>{d.account.originalDate}: {date(rating.createdAt)}{rating.updatedAt!==rating.createdAt?` · ${d.account.updatedDate}: ${date(rating.updatedAt)}`:""}</small>{rating.place.googlePlaceId&&<Link className="button secondary" href={`/${locale}/publicar?place=${encodeURIComponent(rating.place.googlePlaceId)}`}>{d.account.edit}</Link>}</div></div></article>)}</div>:<div className="card content-card account-empty"><h2>{d.account.emptyTitle}</h2><p>{d.account.emptyDescription}</p><Link className="button" href={`/${locale}/publicar`}>{d.account.rateNow} →</Link></div>}</div></section>
}
