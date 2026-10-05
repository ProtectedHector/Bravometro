import "server-only";
import type { NextRequest } from "next/server";

const buckets=new Map<string,{count:number;resetAt:number}>();

export function allowMapsRequest(request:NextRequest,limit=30,windowMs=10*60*1000){
  const forwarded=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();const key=forwarded||request.headers.get("x-real-ip")||"local";const now=Date.now();const current=buckets.get(key);
  if(!current||current.resetAt<=now){buckets.set(key,{count:1,resetAt:now+windowMs});return true}
  if(current.count>=limit)return false;current.count+=1;return true;
}
