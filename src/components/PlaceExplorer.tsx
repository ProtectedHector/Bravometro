"use client";
import { useMemo, useState } from "react";
import { PlaceCard } from "@/components/PlaceCard";
import { Pagination } from "@/components/Pagination";
import { track } from "@/lib/analytics";
import type { Dictionary } from "@/lib/i18n";
import type { Locale, Place } from "@/lib/types";

const PAGE_SIZE = 24;

export function PlaceExplorer({ places, totalRegistered = places.length, locale, dictionary: d, ranking = false, isAdmin = false }: { places: Place[]; totalRegistered?: number; locale: Locale; dictionary: Dictionary; ranking?: boolean; isAdmin?: boolean }) {
  const [search,setSearch]=useState(""); const [city,setCity]=useState(""); const [area,setArea]=useState(""); const [sort,setSort]=useState("score"); const [withoutPhoto,setWithoutPhoto]=useState(false); const [page,setPage]=useState(1);
  const cities=[...new Set(places.map(p=>p.city))].sort();
  const areas=[...new Set(places.filter(p=>p.city===city).map(p=>p.neighborhood))].sort();
  const filtered=useMemo(()=>places.filter(p=>`${p.name} ${p.neighborhood} ${p.city}`.toLowerCase().includes(search.toLowerCase())&&(!city||p.city===city)&&(!area||p.neighborhood===area)&&(!withoutPhoto||(!p.image&&!p.communityPhotos?.some(photo=>photo.url)))).sort((a,b)=>sort==="confidence"?b.confidenceScore-a.confidenceScore:sort==="evidence"?b.evidenceCount-a.evidenceCount:sort==="recent"?(b.createdAt??0)-(a.createdAt??0):b.scores.overall-a.scores.overall),[places,search,city,area,sort,withoutPhoto]);
  const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const currentPage=Math.min(page,totalPages);
  const visible=filtered.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE);
  function reset(){setSearch("");setCity("");setArea("");setSort("score");setWithoutPhoto(false);setPage(1)}
  return <>
    <div className={`card filter-bar${isAdmin?" admin-filters":""}`} aria-label="Filtros">
      <input className="input" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);track("search",{query:e.target.value})}} placeholder={d.hero.search} aria-label={d.actions.search}/>
      <select className="select" value={city} onChange={e=>{setCity(e.target.value);setArea("");setPage(1);track("filter_used",{city:e.target.value})}} aria-label={d.common.city}><option value="">{d.common.all} · {d.common.city}</option>{cities.map(v=><option key={v}>{v}</option>)}</select>
      <select className="select" value={area} onChange={e=>{setArea(e.target.value);setPage(1);track("filter_used",{area:e.target.value})}} aria-label={d.common.neighborhood} disabled={!city}><option value="">{city?`${d.common.all} · ${d.common.neighborhood}`:d.common.selectCityFirst}</option>{areas.map(v=><option key={v}>{v}</option>)}</select>
      <select className="select" value={sort} onChange={e=>{setSort(e.target.value);setPage(1)}} aria-label="Orden"><option value="score">{d.ranking.sortScore}</option><option value="recent">{d.ranking.sortRecent}</option><option value="confidence">{d.ranking.sortConfidence}</option><option value="evidence">{d.ranking.sortEvidence}</option></select>
      {isAdmin&&<label className="photo-filter"><input type="checkbox" checked={withoutPhoto} onChange={e=>{setWithoutPhoto(e.target.checked);setPage(1)}}/><span>{d.places.withoutPhoto}</span></label>}
    </div>
    <div className="results-bar"><span>{search||city||area||withoutPhoto?<><b>{filtered.length}</b> {d.places.resultsLoaded} · {totalRegistered.toLocaleString(locale)} {d.places.registered}</>:<><b>{totalRegistered.toLocaleString(locale)}</b> {d.places.registered}!</>}</span>{(search||city||area||sort!=="score"||withoutPhoto)&&<button className="button ghost" onClick={reset}>{d.actions.clear}</button>}</div>
    {filtered.length?<><div className="grid-3">{visible.map((place,index)=><PlaceCard key={place.id} place={place} locale={locale} dictionary={d} rank={ranking?(currentPage-1)*PAGE_SIZE+index+1:undefined}/>)}</div><Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} previousLabel={d.actions.previous} nextLabel={d.actions.next} pageLabel={locale==="es"?"Página":"Page"}/></>:<div className="card content-card"><h2>{d.common.noResults}</h2><p>{locale==="es"?"Busca cualquier establecimiento desde la portada o añádelo automáticamente al valorarlo.":"Search for any venue from the home page or add it automatically by rating it."}</p><a className="button" href={`/${locale}/publicar`}>{d.contribute.ratePlace} →</a></div>}
  </>;
}
