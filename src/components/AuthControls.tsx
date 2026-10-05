"use client";
import Link from "next/link";
import { Show,SignInButton,SignUpButton,UserButton } from "@clerk/nextjs";
import type { Locale } from "@/lib/types";
import { UserSync } from "@/components/UserSync";

export function AuthControls({locale,enabled}:{locale:Locale;enabled:boolean}){
  if(!enabled)return null;
  return <div className="auth-controls"><UserSync/><Show when="signed-out"><SignInButton mode="modal"><button className="auth-login">{locale==="es"?"Entrar":"Sign in"}</button></SignInButton><SignUpButton mode="modal"><button className="auth-signup">{locale==="es"?"Crear cuenta":"Sign up"}</button></SignUpButton></Show><Show when="signed-in"><Link className="my-ratings-link" href={`/${locale}/mis-valoraciones`}><span aria-hidden="true">♡</span><span className="my-ratings-label">{locale==="es"?"Mis valoraciones":"My ratings"}</span></Link><UserButton appearance={{elements:{avatarBox:{width:38,height:38}}}}/></Show></div>;
}
