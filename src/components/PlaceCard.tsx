import Link from "next/link";
import Image from "next/image";
import { formatScore } from "@/lib/bravometro/scoring";
import type { Dictionary } from "@/lib/i18n";
import type { Locale, Place } from "@/lib/types";

export function PlaceCard({ place, locale, dictionary: d, rank }: { place: Place; locale: Locale; dictionary: Dictionary; rank?: number }) {
  const hasManualRating = (place.communityRatingCount ?? 0) > 0 || place.automaticScore === undefined;
  const bars = [
    [d.attributes.potato,place.scores.potato],
    [d.attributes.sauce,place.scores.sauce],
    [d.attributes.spiciness,place.scores.spiciness],
    ...(hasManualRating ? [
      [d.attributes.taste,place.scores.taste],
      [d.attributes.texture,place.scores.texture],
      [d.attributes.quantity,place.scores.quantity],
      [d.attributes.value,place.scores.value],
    ] as const : []),
  ] as const;
  const reviewPhoto=place.communityPhotos?.[0];
  const cardImage=reviewPhoto?.url??place.image;
  return <Link href={`/${locale}/bravas/${place.slug}`} className="card place-card" aria-label={`${place.name}: ${formatScore(place.scores.overall, locale)}`}>
    <div className={`place-art${cardImage?" place-art-photo":""}`}>
      {cardImage&&<Image src={cardImage} alt={`${d.contribute.photo}: ${place.name}`} fill unoptimized sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="place-review-photo"/>}
      {rank&&<span className="place-rank">{rank}</span>}<strong className="place-score">{formatScore(place.scores.overall, locale)}</strong>
    </div>
    <div className="place-body"><h3 className="place-title">{place.name}</h3><p className="place-location">{place.neighborhood} · {place.city}</p>
      <div className={`mini-bars${hasManualRating?" mini-bars-expanded":""}`}>{bars.map(([label,score])=><div className="mini-bar" key={label}><span>{label}</span><div className="track"><div className="fill" style={{width:`${(score??0)*10}%`}}/></div><b>{formatScore(score,locale)}</b></div>)}</div>
      {place.automaticScore!==undefined&&<p className="place-location">{locale==="es"?"Estimación IA provisional":"Provisional AI estimate"}: {formatScore(place.automaticScore,locale)} · {place.automaticEvidenceCount} {locale==="es"?"reseñas pertinentes":"relevant reviews"}{!place.automaticComplete&&(locale==="es"?" · análisis parcial":" · partial analysis")}</p>}
      <div className="place-meta"><span className="pill">● {d.common[place.confidence]} · {place.confidenceScore}%</span><span className="pill">{place.evidenceCount} {d.common.evidence}</span>{place.status==="demo"&&<span className="pill">{d.common.demo}</span>}</div>
    </div>
  </Link>;
}
