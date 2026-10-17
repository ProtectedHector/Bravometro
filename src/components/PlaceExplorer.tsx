"use client";
import { useMemo, useState } from "react";
import { PlaceCard } from "@/components/PlaceCard";
import { Pagination } from "@/components/Pagination";
import { track } from "@/lib/analytics";
import { buildCatalogHref, CLEARED_CATALOG_STATE, DEFAULT_CATALOG_STATE, filterCatalogPlaces, type CatalogSort, type CatalogState } from "@/lib/catalog-state";
import type { Dictionary } from "@/lib/i18n";
import { buildPlaceHref } from "@/lib/map-state";
import type { Locale, Place } from "@/lib/types";

const PAGE_SIZE = 24;

export function PlaceExplorer({ places, totalRegistered = places.length, locale, dictionary: d, ranking = false, isAdmin = false, initialState = DEFAULT_CATALOG_STATE }: { places: Place[]; totalRegistered?: number; locale: Locale; dictionary: Dictionary; ranking?: boolean; isAdmin?: boolean; initialState?: CatalogState }) {
  const [search,setSearch]=useState(initialState.search); const [region,setRegion]=useState(initialState.region); const [city,setCity]=useState(initialState.city); const [area,setArea]=useState(initialState.area); const [sort,setSort]=useState<CatalogSort>(initialState.sort); const [withoutPhoto,setWithoutPhoto]=useState(initialState.withoutPhoto); const [hideReviewedWithoutPhoto,setHideReviewedWithoutPhoto]=useState(initialState.hideReviewedWithoutPhoto); const [page,setPage]=useState(initialState.page);
  const regions=[...new Set(places.map(p=>p.region).filter((value):value is string=>Boolean(value)))].sort((a,b)=>a.localeCompare(b,locale));
  const cities=[...new Set(places.filter(p=>!region||p.region===region).map(p=>p.city))].sort((a,b)=>a.localeCompare(b,locale));
  const areas=[...new Set(places.filter(p=>p.city===city).map(p=>p.neighborhood))].sort();
  const state={search,region,city,area,sort,withoutPhoto,hideReviewedWithoutPhoto,page};
  const filtered=useMemo(()=>filterCatalogPlaces(places,{search,region,city,area,sort,withoutPhoto,hideReviewedWithoutPhoto,page}),[places,search,region,city,area,sort,withoutPhoto,hideReviewedWithoutPhoto,page]);
  const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const currentPage=Math.min(page,totalPages);
  const visible=filtered.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE);
  const catalogHref=buildCatalogHref(locale,{...state,page:currentPage});
  function updateUrl(nextState:CatalogState){window.history.replaceState(null,"",buildCatalogHref(locale,nextState))}
  function update(patch:Partial<CatalogState>){const nextState={...state,...patch};setSearch(nextState.search);setRegion(nextState.region);setCity(nextState.city);setArea(nextState.area);setSort(nextState.sort);setWithoutPhoto(nextState.withoutPhoto);setHideReviewedWithoutPhoto(nextState.hideReviewedWithoutPhoto);setPage(nextState.page);updateUrl(nextState)}
  function reset(){update(CLEARED_CATALOG_STATE)}
  return <>
    <div className={`card filter-bar${isAdmin?" admin-filters":""}`} aria-label="Filtros">
      <input className="input" value={search} onChange={e=>{update({search:e.target.value,page:1});track("search",{query:e.target.value})}} placeholder={d.hero.search} aria-label={d.actions.search}/>
      <select className="select" value={region} onChange={e=>{update({region:e.target.value,city:"",area:"",page:1});track("filter_used",{region:e.target.value})}} aria-label={d.common.region}><option value="">{d.common.all} · {d.common.regions}</option>{regions.map(v=><option key={v}>{v}</option>)}</select>
      <select className="select" value={city} onChange={e=>{update({city:e.target.value,area:"",page:1});track("filter_used",{city:e.target.value})}} aria-label={d.common.city} disabled={!region}><option value="">{d.common.all} · {d.common.city}</option>{cities.map(v=><option key={v}>{v}</option>)}</select>
      <select className="select" value={area} onChange={e=>{update({area:e.target.value,page:1});track("filter_used",{area:e.target.value})}} aria-label={d.common.neighborhood} disabled={!city}><option value="">{city?`${d.common.all} · ${d.common.neighborhood}`:d.common.selectCityFirst}</option>{areas.map(v=><option key={v}>{v}</option>)}</select>
      <select className="select" value={sort} onChange={e=>update({sort:e.target.value as CatalogSort,page:1})} aria-label="Orden"><option value="score">{d.ranking.sortScore}</option><option value="recent">{d.ranking.sortRecent}</option><option value="confidence">{d.ranking.sortConfidence}</option><option value="evidence">{d.ranking.sortEvidence}</option></select>
      {isAdmin&&<><label className="photo-filter"><input type="checkbox" checked={withoutPhoto} onChange={e=>update({withoutPhoto:e.target.checked,...(!e.target.checked?{hideReviewedWithoutPhoto:false}:{}),page:1})}/><span>{d.places.withoutPhoto}</span></label><label className={`photo-filter${withoutPhoto?"":" disabled"}`}><input type="checkbox" checked={hideReviewedWithoutPhoto} disabled={!withoutPhoto} onChange={e=>update({hideReviewedWithoutPhoto:e.target.checked,page:1})}/><span>{d.places.hideReviewedWithoutPhoto}</span></label></>}
    </div>
    <div className="results-bar"><span>{search||region||city||area||withoutPhoto||hideReviewedWithoutPhoto?<><b>{filtered.length}</b> {d.places.resultsLoaded} · {totalRegistered.toLocaleString(locale)} {d.places.registered}</>:<><b>{totalRegistered.toLocaleString(locale)}</b> {d.places.registered}!</>}</span>{(search||region||city||area||sort!=="score"||withoutPhoto||hideReviewedWithoutPhoto)&&<button className="button ghost" onClick={reset}>{d.actions.clear}</button>}</div>
    {filtered.length?<><div className="grid-3">{visible.map((place,index)=><PlaceCard key={place.id} place={place} locale={locale} dictionary={d} href={buildPlaceHref(locale,place.slug,catalogHref)} rank={ranking?(currentPage-1)*PAGE_SIZE+index+1:undefined}/>)}</div><Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={nextPage=>update({page:nextPage})} previousLabel={d.actions.previous} nextLabel={d.actions.next} pageLabel={locale==="es"?"Página":"Page"}/></>:<div className="card content-card"><h2>{d.common.noResults}</h2><p>{locale==="es"?"Busca cualquier establecimiento desde la portada o añádelo automáticamente al valorarlo.":"Search for any venue from the home page or add it automatically by rating it."}</p><a className="button" href={`/${locale}/publicar`}>{d.contribute.ratePlace} →</a></div>}
  </>;
}
