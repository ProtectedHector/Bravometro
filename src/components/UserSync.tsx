"use client";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

const syncedUsers=new Set<string>();

export function UserSync(){
  const{isLoaded,isSignedIn,user}=useUser();
  useEffect(()=>{if(!isLoaded||!isSignedIn||!user||syncedUsers.has(user.id))return;syncedUsers.add(user.id);void fetch("/api/users/sync",{method:"POST"}).then(response=>{if(!response.ok)syncedUsers.delete(user.id)}).catch(()=>syncedUsers.delete(user.id))},[isLoaded,isSignedIn,user]);
  return null;
}
