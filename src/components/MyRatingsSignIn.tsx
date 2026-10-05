"use client";
import { SignInButton } from "@clerk/nextjs";
import type { Dictionary } from "@/lib/i18n";

export function MyRatingsSignIn({dictionary:d}:{dictionary:Dictionary}){return <div className="card content-card sign-in-card"><h2>{d.account.signInTitle}</h2><p>{d.account.signInDescription}</p><SignInButton mode="modal"><button className="button">{d.contribute.signIn} →</button></SignInButton></div>}
