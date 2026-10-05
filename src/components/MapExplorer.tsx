"use client";
import { useState } from "react";
import Link from "next/link";
import { formatScore } from "@/lib/bravometro/scoring";
import { track } from "@/lib/analytics";
import type { Dictionary } from "@/lib/i18n";
import type { Locale, Place } from "@/lib/types";

export function MapExplorer({ places, locale, dictionary: d }: { places: Place[]; locale: Locale; dictionary: Dictionary }) {
  const [selected,setSelected]=useState(places[0]); const [status,setStatus]=useState<"idle"|"ready"|"error">("idle");
  function locate(){track("nearby_requested");if(!navigator.geolocation){setStatus("error");return}navigator.geolocation.getCurrentPosition(()=>setStatus("ready"),()=>setStatus("error"),{enableHighAccuracy:false,timeout:6000})}
  return <><div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:16}}><button className="button" onClick={locate}>⌖ {d.actions.nearMe}</button>{status!=="idle"&&<span className="pill">{status==="ready"?d.map.locationReady:d.map.locationError}</span>}</div>
  <div className="card map-board">{places.map((place,index)=><button key={place.id} className="map-pin" style={{left:`${28+index*23}%`,top:`${33+(index%2)*24}%`}} onClick={()=>setSelected(place)} aria-label={place.name}><span><b>{index+1}</b></span></button>)}
    {selected&&<div className="card map-card"><span className="pill">{selected.neighborhood}</span><h2 style={{margin:"10px 0 4px"}}>{selected.name}</h2><strong style={{fontSize:"2rem",color:"var(--red)"}}>{formatScore(selected.scores.overall,locale)}</strong><p style={{color:"var(--muted)"}}>{selected.address}</p><Link className="button" href={`/${locale}/bravas/${selected.slug}`}>{d.actions.viewPlace} →</Link></div>}
  </div></>;
}
