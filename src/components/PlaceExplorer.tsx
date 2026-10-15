"use client";
import { useMemo, useState } from "react";
import { PlaceCard } from "@/components/PlaceCard";
import { track } from "@/lib/analytics";
import type { Dictionary } from "@/lib/i18n";
import type { Locale, Place } from "@/lib/types";

export function PlaceExplorer({ places, locale, dictionary: d, ranking = false }: { places: Place[]; locale: Locale; dictionary: Dictionary; ranking?: boolean }) {
  const [search,setSearch]=useState(""); const [city,setCity]=useState(""); const [area,setArea]=useState(""); const [sort,setSort]=useState("score");
  const cities=[...new Set(places.map(p=>p.city))].sort();
  const areas=[...new Set(places.filter(p=>p.city===city).map(p=>p.neighborhood))].sort();
  const filtered=useMemo(()=>places.filter(p=>`${p.name} ${p.neighborhood} ${p.city}`.toLowerCase().includes(search.toLowerCase())&&(!city||p.city===city)&&(!area||p.neighborhood===area)).sort((a,b)=>sort==="confidence"?b.confidenceScore-a.confidenceScore:sort==="evidence"?b.evidenceCount-a.evidenceCount:b.scores.overall-a.scores.overall),[places,search,city,area,sort]);
  function reset(){setSearch("");setCity("");setArea("");setSort("score")}
  return <>
    <div className="card filter-bar" aria-label="Filtros">
      <input className="input" value={search} onChange={e=>{setSearch(e.target.value);track("search",{query:e.target.value})}} placeholder={d.hero.search} aria-label={d.actions.search}/>
      <select className="select" value={city} onChange={e=>{setCity(e.target.value);setArea("");track("filter_used",{city:e.target.value})}} aria-label={d.common.city}><option value="">{d.common.all} · {d.common.city}</option>{cities.map(v=><option key={v}>{v}</option>)}</select>
      <select className="select" value={area} onChange={e=>{setArea(e.target.value);track("filter_used",{area:e.target.value})}} aria-label={d.common.neighborhood} disabled={!city}><option value="">{city?`${d.common.all} · ${d.common.neighborhood}`:d.common.selectCityFirst}</option>{areas.map(v=><option key={v}>{v}</option>)}</select>
      <select className="select" value={sort} onChange={e=>setSort(e.target.value)} aria-label="Orden"><option value="score">{d.ranking.sortScore}</option><option value="confidence">{d.ranking.sortConfidence}</option><option value="evidence">{d.ranking.sortEvidence}</option></select>
    </div>
    <div className="results-bar"><span><b>{filtered.length}</b> {d.places.results}</span>{(search||city||area||sort!=="score")&&<button className="button ghost" onClick={reset}>{d.actions.clear}</button>}</div>
    {filtered.length?<div className="grid-3">{filtered.map((place,index)=><PlaceCard key={place.id} place={place} locale={locale} dictionary={d} rank={ranking?index+1:undefined}/>)}</div>:<div className="card content-card"><h2>{d.common.noResults}</h2><p>{locale==="es"?"Busca cualquier establecimiento desde la portada o añádelo automáticamente al valorarlo.":"Search for any venue from the home page or add it automatically by rating it."}</p><a className="button" href={`/${locale}/publicar`}>{d.contribute.ratePlace} →</a></div>}
  </>;
}
