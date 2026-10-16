"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pagination } from "@/components/Pagination";
import type { Dictionary } from "@/lib/i18n";
import { prepareRatingPhoto } from "@/lib/rating-photo";
import type { Place } from "@/lib/types";

const ADMIN_PAGE_SIZE=10;
const PENDING_LIMIT=5;

type PendingPlace={_id:string;_creationTime:number;name:string;address:string;submittedByName:string};
type PendingRating={_id:string;_creationTime:number;userName:string;placeName:string;overallScore:number;comment?:string;photoUrl?:string};
type PendingQueue={places:PendingPlace[];ratings:PendingRating[]};

function firstPendingItems(queue:PendingQueue):PendingQueue{
  const items=[...queue.places.map(item=>({kind:"place" as const,item})),...queue.ratings.map(item=>({kind:"rating" as const,item}))]
    .sort((a,b)=>b.item._creationTime-a.item._creationTime)
    .slice(0,PENDING_LIMIT);
  return{places:items.filter(item=>item.kind==="place").map(item=>item.item),ratings:items.filter(item=>item.kind==="rating").map(item=>item.item)};
}

async function responseData(response:Response){
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||"Error de conexión");
  return data;
}

export function AdminPanel({places,dictionary:d,enabled}:{places:Place[];dictionary:Dictionary;enabled:boolean}){
  const router=useRouter();
  const[message,setMessage]=useState("");
  const[busy,setBusy]=useState(false);
  const[queueLoading,setQueueLoading]=useState(enabled);
  const[queue,setQueue]=useState<PendingQueue|null>(null);
  const[search,setSearch]=useState("");
  const[page,setPage]=useState(1);
  const[placeCity,setPlaceCity]=useState("Madrid");

  const cityOptions=useMemo(()=>[...new Set(places.map(place=>place.city).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es")),[places]);
  const neighborhoodOptions=useMemo(()=>{
    const city=placeCity.trim().toLocaleLowerCase("es");
    const matching=places.filter(place=>!city||place.city.toLocaleLowerCase("es")===city);
    const source=matching.length?matching:places;
    return[...new Set(source.map(place=>place.neighborhood).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
  },[places,placeCity]);

  const filteredPlaces=useMemo(()=>{
    const query=search.trim().toLocaleLowerCase("es");
    if(!query)return places;
    return places.filter(place=>[place.name,place.slug,place.city,place.neighborhood,place.address].some(value=>value.toLocaleLowerCase("es").includes(query)));
  },[places,search]);
  const totalPages=Math.max(1,Math.ceil(filteredPlaces.length/ADMIN_PAGE_SIZE));
  const currentPage=Math.min(page,totalPages);
  const visiblePlaces=filteredPlaces.slice((currentPage-1)*ADMIN_PAGE_SIZE,currentPage*ADMIN_PAGE_SIZE);

  async function fetchQueue(signal?:AbortSignal){
    const response=await fetch("/api/admin",{cache:"no-store",signal});
    return firstPendingItems(await responseData(response) as PendingQueue);
  }

  useEffect(()=>{
    if(!enabled)return;
    const controller=new AbortController();
    fetchQueue(controller.signal).then(setQueue).catch(error=>{
      if(!controller.signal.aborted)setMessage(`Error: ${error instanceof Error?error.message:"Conexión"}`);
    }).finally(()=>{
      if(!controller.signal.aborted)setQueueLoading(false);
    });
    return()=>controller.abort();
  },[enabled]);

  async function post(body:Record<string,unknown>){
    const response=await fetch("/api/admin",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
    return responseData(response);
  }

  async function uploadPlaceImage(slug:string,file:File){
    const photo=await prepareRatingPhoto(file);
    const prepared=await fetch("/api/admin/place-image",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({operation:"upload",slug})});
    const upload=await responseData(prepared);
    const uploaded=await fetch(upload.uploadUrl,{method:"POST",headers:{"Content-Type":photo.type},body:photo});
    const stored=await responseData(uploaded);
    if(!stored.storageId)throw new Error("No se pudo subir la imagen");
    const saved=await fetch("/api/admin/place-image",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({operation:"save",slug,storageId:stored.storageId})});
    await responseData(saved);
  }

  async function submit(form:HTMLFormElement){
    setBusy(true);setMessage("");
    try{
      const formData=new FormData(form);
      const operation=String(formData.get("operation"));
      const image=formData.get("image");
      formData.delete("image");
      const values=Object.fromEntries(formData);
      await post(values);
      if(operation==="upsertPlace"&&image instanceof File&&image.size>0)await uploadPlaceImage(String(values.slug),image);
      setMessage(image instanceof File&&image.size>0?"✓ Guardado correctamente con imagen":"✓ Guardado correctamente");
      form.reset();
      if(operation==="upsertPlace")setPlaceCity("Madrid");
      router.refresh();
    }catch(error){setMessage(`Error: ${error instanceof Error?error.message:"Conexión"}`)}finally{setBusy(false)}
  }

  async function loadQueue(){
    setQueueLoading(true);setMessage("");
    try{setQueue(await fetchQueue())}catch(error){setMessage(`Error: ${error instanceof Error?error.message:"Conexión"}`)}finally{setQueueLoading(false)}
  }

  async function moderate(body:Record<string,unknown>){
    setBusy(true);setMessage("");
    try{
      await post(body);
      setMessage("✓ Moderación guardada");
      setQueue(await fetchQueue());
      router.refresh();
    }catch(error){setMessage(`Error: ${error instanceof Error?error.message:"Conexión"}`)}finally{setBusy(false)}
  }

  async function repairScores(){setBusy(true);setMessage("");try{const data=await post({operation:"repairOverallScores"});setMessage(`✓ Medias reparadas: ${JSON.stringify(data.result)}`)}catch(error){setMessage(`Error: ${error instanceof Error?error.message:"Conexión"}`)}finally{setBusy(false)}}
  function approvePlace(item:PendingPlace){const suggested=item.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");const slug=prompt("Slug",suggested);const city=slug&&prompt("Ciudad","Madrid");const neighborhood=city&&prompt("Barrio","");if(slug&&city&&neighborhood)void moderate({operation:"approvePlaceSubmission",submissionId:item._id,slug,city,neighborhood,country:"ES"})}
  const pendingCount=(queue?.places.length??0)+(queue?.ratings.length??0);

  return <>
    <div className="card form-card" style={{margin:"24px 0"}}>{!enabled&&<p className="notice" style={{marginBottom:0}}>{d.admin.setup}</p>}{message&&<p className="notice" role="status" aria-live="polite" style={{marginBottom:0}}>{message}</p>}</div>
    <section className="card content-card" style={{marginBottom:18}}>
      <h2>Aportaciones pendientes</h2>
      <button className="button secondary" disabled={!enabled||queueLoading||busy} onClick={()=>void loadQueue()}>{queueLoading?d.common.loading:"Actualizar cola"}</button>
      <button className="button secondary" style={{marginLeft:10}} disabled={!enabled||busy} onClick={()=>void repairScores()}>Rehacer notas medias</button>
      {queue&&<div className="moderation-list">
        {pendingCount===0&&<p>No hay aportaciones pendientes.</p>}
        {queue.places.length>0&&<><h3>Sitios ({queue.places.length})</h3>{queue.places.map(item=><div className="moderation-row" key={item._id}><span><b>{item.name}</b><small>{item.address} · {item.submittedByName}</small></span><div><button className="button secondary" disabled={busy} onClick={()=>approvePlace(item)}>Aprobar</button><button className="button ghost" disabled={busy} onClick={()=>void moderate({operation:"rejectPlaceSubmission",submissionId:item._id})}>Rechazar</button></div></div>)}</>}
        {queue.ratings.length>0&&<><h3>Valoraciones ({queue.ratings.length})</h3>{queue.ratings.map(item=><div className="moderation-row rating-moderation-row" key={item._id}>{item.photoUrl&&<div className="moderation-photo" role="img" aria-label={`Foto de ${item.placeName}`} style={{backgroundImage:`url(${item.photoUrl})`}}/>}<span><b>{item.placeName} · {item.userName} · {item.overallScore}/10</b><small>{item.comment||"Sin comentario"}</small></span><div><button className="button secondary" disabled={busy} onClick={()=>void moderate({operation:"approveUserRating",ratingId:item._id})}>Aprobar</button><button className="button ghost" disabled={busy} onClick={()=>void moderate({operation:"rejectUserRating",ratingId:item._id})}>Rechazar</button></div></div>)}</>}
      </div>}
    </section>
    <div className="admin-grid">
      <form className="card form-card form-grid" onSubmit={event=>{event.preventDefault();void submit(event.currentTarget)}}>
        <input type="hidden" name="operation" value="upsertPlace"/><h2 className="field full">{d.admin.save}</h2>
        <div className="field"><label>{d.admin.name}</label><input className="input" name="name" required/></div>
        <div className="field"><label>{d.admin.slug}</label><input className="input" name="slug" required pattern="[a-z0-9-]+"/></div>
        <div className="field"><label>{d.common.city}</label><input className="input" name="city" list="admin-city-options" value={placeCity} onChange={event=>setPlaceCity(event.target.value)} autoComplete="off" required/><datalist id="admin-city-options">{cityOptions.map(city=><option key={city} value={city}/>)}</datalist></div>
        <div className="field"><label>{d.common.neighborhood}</label><input className="input" name="neighborhood" list="admin-neighborhood-options" autoComplete="off" required/><datalist id="admin-neighborhood-options">{neighborhoodOptions.map(neighborhood=><option key={neighborhood} value={neighborhood}/>)}</datalist></div>
        <div className="field full"><label>Dirección</label><input className="input" name="address" required/></div>
        <div className="field full admin-place-image"><label>Imagen (opcional)</label><input className="input" name="image" type="file" accept=".heic,.heif,image/heic,image/heif,image/jpeg,image/png,image/webp"/><small>JPG, PNG, WebP o HEIC; máximo 15 MB. Se optimizará antes de subirla.</small></div>
        <button className="button field full" disabled={!enabled||busy}>{busy?d.common.loading:d.admin.save}</button>
      </form>
      <form className="card form-card form-grid" onSubmit={event=>{event.preventDefault();void submit(event.currentTarget)}}>
        <input type="hidden" name="operation" value="upsertRating"/><h2 className="field full">{d.admin.rating}</h2><div className="field full"><label>Establecimiento</label><select className="select" name="placeSlug" required><option value="">—</option>{places.map(place=><option key={place.id} value={place.slug}>{place.name}</option>)}</select></div>{["potato","sauce","spiciness","taste","texture","quantity","value"].map(key=><div className="field" key={key}><label>{key}</label><input className="input" name={key} type="number" min="0" max="10" step="0.1" required/></div>)}<div className="field"><label>Evidencias</label><input className="input" name="evidenceCount" type="number" min="0" required/></div><div className="field full"><label>Resumen ES</label><textarea className="textarea" name="summaryEs" required/></div><div className="field full"><label>Summary EN</label><textarea className="textarea" name="summaryEn" required/></div><button className="button field full" disabled={!enabled||busy}>{busy?d.common.loading:d.admin.save}</button>
      </form>
    </div>
    <div className="card content-card" style={{marginTop:18}}>
      <div className="admin-list-head"><div><h2>{d.nav.places}</h2><p>{filteredPlaces.length} establecimientos</p></div><input className="input admin-list-search" type="search" value={search} onChange={event=>{setSearch(event.target.value);setPage(1)}} placeholder="Buscar por nombre, slug, ciudad, barrio o dirección…" aria-label="Buscar establecimientos"/></div>
      {visiblePlaces.map(place=><div className="moderation-row" key={place.id}><span><b>{place.name}</b><small>{place.slug} · {place.status}</small></span><span><button className="button secondary" disabled={!enabled||busy||place.status==="demo"} onClick={()=>void moderate({operation:"deleteRating",placeSlug:place.slug})}>{d.admin.delete} rating</button><button className="button secondary" disabled={!enabled||busy||place.status==="demo"} onClick={()=>void moderate({operation:"deletePlace",placeId:place.id})}>{d.admin.delete}</button></span></div>)}
      {filteredPlaces.length===0&&<p>No hay establecimientos que coincidan con la búsqueda.</p>}
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} previousLabel={d.actions.previous} nextLabel={d.actions.next} pageLabel="Página"/>
    </div>
  </>;
}
