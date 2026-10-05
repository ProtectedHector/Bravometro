import Link from "next/link";
import { formatScore } from "@/lib/bravometro/scoring";
import type { Dictionary } from "@/lib/i18n";
import type { Locale, Place } from "@/lib/types";

export function PlaceCard({ place, locale, dictionary: d, rank }: { place: Place; locale: Locale; dictionary: Dictionary; rank?: number }) {
  const bars = [[d.attributes.potato,place.scores.potato],[d.attributes.sauce,place.scores.sauce],[d.attributes.spiciness,place.scores.spiciness]] as const;
  return <Link href={`/${locale}/bravas/${place.slug}`} className="card place-card" aria-label={`${place.name}: ${formatScore(place.scores.overall, locale)}`}>
    <div className="place-art">{rank&&<span className="place-rank">{rank}</span>}<strong className="place-score">{formatScore(place.scores.overall, locale)}</strong></div>
    <div className="place-body"><h3 className="place-title">{place.name}</h3><p className="place-location">{place.neighborhood} · {place.city}</p>
      <div className="mini-bars">{bars.map(([label,score])=><div className="mini-bar" key={label}><span>{label}</span><div className="track"><div className="fill" style={{width:`${score*10}%`}}/></div><b>{formatScore(score,locale)}</b></div>)}</div>
      <div className="place-meta"><span className="pill">● {d.common[place.confidence]} · {place.confidenceScore}%</span><span className="pill">{place.evidenceCount} {d.common.evidence}</span>{place.status==="demo"&&<span className="pill">{d.common.demo}</span>}</div>
    </div>
  </Link>;
}
