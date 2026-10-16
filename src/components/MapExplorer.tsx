"use client";
import { useCallback,useEffect,useMemo,useRef,useState } from "react";
import Link from "next/link";
import { formatScore } from "@/lib/bravometro/scoring";
import { track } from "@/lib/analytics";
import { loadGoogleMaps } from "@/components/GooglePlacesMap";
import { buildMapHref,buildPlaceHref,type MapViewState } from "@/lib/map-state";
import type { Dictionary } from "@/lib/i18n";
import type { Locale, MapPlace } from "@/lib/types";

type MappablePlace = MapPlace & { latitude: number; longitude: number };

function markerIcon(label:string,color:string,selected:boolean):google.maps.Icon{
  const width=selected?68:58;
  const height=selected?78:68;
  const fill=selected?"#fff":color;
  const stroke=selected?color:"#fff";
  const text=selected?color:"#fff";
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 58 68"><path d="M29 65C21 52 5 40 5 24 5 11 16 2 29 2s24 9 24 22c0 16-16 28-24 41Z" fill="${fill}" stroke="${stroke}" stroke-width="4"/><text x="29" y="30" text-anchor="middle" dominant-baseline="middle" fill="${text}" font-family="Arial, sans-serif" font-size="${label.length>3?14:17}" font-weight="900">${label}</text></svg>`;
  return {url:`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,scaledSize:new google.maps.Size(width,height),anchor:new google.maps.Point(width/2,height-3)};
}

export function MapExplorer({ places, votedPlaceIds, locale, dictionary: d, mapApiKey, mapId, initialMapState }: { places: MapPlace[]; votedPlaceIds: string[]; locale: Locale; dictionary: Dictionary; mapApiKey?: string; mapId?: string; initialMapState?: MapViewState }) {
  const mappablePlaces=useMemo(()=>places.filter((place):place is MappablePlace=>typeof place.latitude==="number"&&typeof place.longitude==="number"),[places]);
  const boundsKey=useMemo(()=>mappablePlaces.map(place=>`${place.id}:${place.latitude}:${place.longitude}`).join("|"),[mappablePlaces]);
  const votedIds=useMemo(()=>new Set(votedPlaceIds),[votedPlaceIds]);
  const [selected,setSelected]=useState<MappablePlace|undefined>(()=>mappablePlaces.find(place=>place.id===initialMapState?.selectedPlaceId)??mappablePlaces[0]);
  const [mapHref,setMapHref]=useState(()=>initialMapState?buildMapHref(locale,initialMapState):`/${locale}/mapa`);
  const [status,setStatus]=useState<"idle"|"ready"|"error">("idle");
  const [error,setError]=useState("");
  const [mapReady,setMapReady]=useState(false);
  const containerRef=useRef<HTMLDivElement>(null);
  const mapRef=useRef<google.maps.Map|null>(null);
  const markersRef=useRef<google.maps.Marker[]>([]);
  const userMarkerRef=useRef<google.maps.Marker|null>(null);
  const idleListenerRef=useRef<google.maps.MapsEventListener|null>(null);
  const fittedBoundsKeyRef=useRef("");
  const activeSelected=selected&&mappablePlaces.some(place=>place.id===selected.id)?selected:mappablePlaces[0];
  const selectedIdRef=useRef(activeSelected?.id);

  const persistMapState=useCallback((selectedPlaceId=selectedIdRef.current)=>{
    const center=mapRef.current?.getCenter();
    const zoom=mapRef.current?.getZoom();
    if(!center||zoom===undefined)return;
    const href=buildMapHref(locale,{latitude:center.lat(),longitude:center.lng(),zoom,selectedPlaceId});
    window.history.replaceState(null,"",href);
    setMapHref(href);
  },[locale]);

  useEffect(()=>{
    selectedIdRef.current=activeSelected?.id;
    if(mapReady)persistMapState(activeSelected?.id);
  },[activeSelected?.id,mapReady,persistMapState]);

  useEffect(()=>{
    if(!mapApiKey||!containerRef.current)return;
    let active=true;
    void loadGoogleMaps(mapApiKey).then(async()=>{
      const{Map}=await google.maps.importLibrary("maps") as google.maps.MapsLibrary;
      if(!active||!containerRef.current)return;
      mapRef.current=new Map(containerRef.current,{center:initialMapState?{lat:initialMapState.latitude,lng:initialMapState.longitude}:{lat:40.4168,lng:-3.7038},zoom:initialMapState?.zoom??12,...(mapId?{mapId}:{}),fullscreenControl:true,mapTypeControl:true,streetViewControl:true,zoomControl:true,gestureHandling:"greedy"});
      if(initialMapState)fittedBoundsKeyRef.current=boundsKey;
      idleListenerRef.current=mapRef.current.addListener("idle",()=>persistMapState());
      setMapReady(true);
    }).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"Google Maps no se ha podido cargar")});
    return()=>{active=false;if(idleListenerRef.current)google.maps.event.removeListener(idleListenerRef.current);idleListenerRef.current=null;setMapReady(false)};
  },[mapApiKey,mapId,boundsKey,initialMapState,persistMapState]);
  useEffect(()=>{
    if(!mapReady||!mapRef.current||!mappablePlaces.length)return;
    let active=true;
    void google.maps.importLibrary("marker").then(()=>{
      if(!active||!mapRef.current||typeof google==="undefined")return;
      for(const marker of markersRef.current)marker.setMap(null);
      markersRef.current=[];
      const bounds=new google.maps.LatLngBounds();
      for(const place of mappablePlaces){
        const isSelected=place.id===activeSelected?.id;
        const voted=votedIds.has(place.id);
        const score=formatScore(place.scores.overall,locale);
        const marker=new google.maps.Marker({map:mapRef.current,position:{lat:place.latitude,lng:place.longitude},title:place.name,icon:markerIcon(score,voted?"#178a4a":"#d83b19",isSelected),zIndex:isSelected?20:10});
        marker.addListener("click",()=>{selectedIdRef.current=place.id;setSelected(place);persistMapState(place.id)});
        markersRef.current.push(marker);
        bounds.extend({lat:place.latitude,lng:place.longitude});
      }
      const shouldFitBounds=fittedBoundsKeyRef.current!==boundsKey;
      if(shouldFitBounds&&!bounds.isEmpty()){
        fittedBoundsKeyRef.current=boundsKey;
        mapRef.current.fitBounds(bounds,64);
        if(mappablePlaces.length===1)google.maps.event.addListenerOnce(mapRef.current,"idle",()=>{if((mapRef.current?.getZoom()??0)>16)mapRef.current?.setZoom(16)});
      }
    }).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"Google Maps no se ha podido cargar")});
    return()=>{active=false};
  },[mapReady,mappablePlaces,boundsKey,activeSelected,locale,votedIds,persistMapState]);

  function locate(){
    track("nearby_requested");
    if(!navigator.geolocation){setStatus("error");return}
    navigator.geolocation.getCurrentPosition(position=>{
      setStatus("ready");
      const location={lat:position.coords.latitude,lng:position.coords.longitude};
      mapRef.current?.panTo(location);
      mapRef.current?.setZoom(14);
      if(!mapRef.current||typeof google==="undefined")return;
      if(userMarkerRef.current)userMarkerRef.current.setMap(null);
      userMarkerRef.current=new google.maps.Marker({map:mapRef.current,position:location,title:"Tu ubicación",label:{text:"●",color:"#ffffff",fontWeight:"900"},zIndex:30});
    },()=>setStatus("error"),{enableHighAccuracy:false,timeout:6000});
  }

  if(!mapApiKey)return <div className="places-map places-map-unavailable">{d.contribute.mapSetup}</div>;
  return <><div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:16}}><button className="button" onClick={locate}>⌖ {d.actions.nearMe}</button>{status!=="idle"&&<span className="pill">{status==="ready"?d.map.locationReady:d.map.locationError}</span>}</div>
  <div className="bravas-map-shell">{error&&<div className="notice">{error}</div>}<div ref={containerRef} className="bravas-map" role="application" aria-label="Google Maps"/>{activeSelected&&<div className="card map-card"><span className="pill">{activeSelected.neighborhood}</span><h2 style={{margin:"10px 0 4px"}}>{activeSelected.name}</h2><strong style={{fontSize:"2rem",color:"var(--red)"}}>{formatScore(activeSelected.scores.overall,locale)}</strong><p style={{color:"var(--muted)"}}>{activeSelected.address}</p><Link className="button" href={buildPlaceHref(locale,activeSelected.slug,mapHref)}>{d.actions.viewPlace} →</Link></div>}</div></>;
}
