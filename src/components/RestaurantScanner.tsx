"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

type Status = { allowed: boolean; ownerId?: string; area?: string; finished?: boolean; checked?: number; imported?: number;
  reviewPages?: number; requests?: number; serpapiHourRequests?: number; serpapiMonthRequests?: number;
  serpapiPausedUntil?: number | null; serpapiPauseReason?: "hourly" | "monthly" | null; error?: string | null };

const sleep = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

function pauseLabel(status: Status) {
  if (!status.serpapiPausedUntil) return "";
  const date = new Date(status.serpapiPausedUntil);
  if (status.serpapiPauseReason === "monthly") return `Cuota mensual SerpAPI agotada. Reanuda a partir de ${date.toLocaleString("es-ES")}.`;
  return `Límite horario SerpAPI alcanzado. Continuará a las ${date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}.`;
}

export function RestaurantScanner() {
  const { isSignedIn, user } = useUser();
  const [status, setStatus] = useState<Status>({ allowed: false });
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [verification, setVerification] = useState<{ ownerId?: string; error: string }>();
  const [attempt, setAttempt] = useState(0);
  const active = useRef(false);
  const router = useRouter();

  async function waitForSerpapiWindow(pausedUntil: number) {
    while (active.current && Date.now() < pausedUntil) await sleep(Math.min(pausedUntil - Date.now(), 60000));
  }

  useEffect(() => {
    let mounted = true;
    active.current = false;
    if (isSignedIn) fetch("/api/restaurants/scan", { cache: "no-store" }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo comprobar el acceso de administrador");
      if (typeof data.allowed !== "boolean") throw new Error("El servidor devolvió una respuesta de permisos inválida");
      if (mounted) {
        setStatus({ ...data, ownerId: user?.id });
        setVerification({ ownerId: user?.id, error: data.allowed ? "" : "La sesión actual no se ha reconocido como el administrador. Comprueba que el usuario de Clerk esté vinculado al usuario jx72bkvz217bgnwv4g3pvvywh98fq64v en el Convex de este entorno y que CLERK_JWT_ISSUER_DOMAIN coincida con el issuer de Clerk." });
      }
    }).catch(caught => {
      if (mounted) {
        setStatus({ allowed: false, ownerId: user?.id });
        setVerification({ ownerId: user?.id, error: caught instanceof Error ? caught.message : "No se pudo comprobar el acceso de administrador" });
      }
    });
    return () => { mounted = false; active.current = false; };
  }, [isSignedIn, user?.id, attempt]);

  async function scan() {
    if (active.current) return;
    active.current = true;
    setRunning(true);
    setError("");
    try {
      while (active.current) {
        const response = await fetch("/api/restaurants/scan", { method: "POST", signal: AbortSignal.timeout(115000) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo escanear");
        setStatus({ ...data, ownerId: user?.id });
        if (data.finished || data.serpapiPauseReason === "monthly") break;
        if (data.serpapiPausedUntil && Date.now() < data.serpapiPausedUntil) await waitForSerpapiWindow(data.serpapiPausedUntil);
        else if (active.current) await sleep(2000);
      }
    } catch (caught) { setError(caught instanceof Error && caught.name === "TimeoutError" ? "El paso tardó demasiado. El progreso anterior está guardado; vuelve a pulsar para reanudar." : caught instanceof Error ? caught.message : "Error de escaneo"); }
    finally { active.current = false; setRunning(false); router.refresh(); }
  }

  if (!isSignedIn) return null;
  if (verification?.ownerId === user?.id && verification?.error) return <aside className="card content-card" style={{ marginBottom: 24 }}>
    <h2>Acceso al escáner de restaurantes</h2>
    <p role="alert">{verification.error}</p>
    <button className="button ghost" onClick={() => setAttempt(value => value + 1)}>Comprobar acceso de nuevo</button>
  </aside>;
  if (!status.allowed || status.ownerId !== user?.id) return null;
  return <aside className="card content-card" style={{ marginBottom: 24 }}>
    <h2>Catálogo de bravas · administración</h2>
    <p>Zona: <b>{status.area}</b> · {status.checked ?? 0} locales revisados · {status.imported ?? 0} con bravas · {status.reviewPages ?? 0} páginas de reseñas · {status.requests ?? 0} consultas SerpAPI.</p>
    <p>SerpAPI: {status.serpapiHourRequests ?? 0}/2900 esta hora · {status.serpapiMonthRequests ?? 0}/15000 este mes.</p>
    <p>Solo se incorporan locales con menciones al plato. Las notas de IA son provisionales y pesan menos que las manuales. El progreso se guarda; no se guardan textos de reseñas.</p>
    <p><b>Comprueba que tus proyectos están en el nivel gratuito:</b> si tienen facturación activa, este botón puede generar cargos. Verifica también los permisos de análisis de reseñas y las condiciones de Gemini antes de iniciar.</p>
    <button className="button" disabled={running || status.finished} onClick={scan}>{running ? "Escaneando…" : status.finished ? "Escaneo completado" : "Escanear restaurantes"}</button>
    {running && <button className="button ghost" style={{ marginLeft: 12 }} onClick={() => { active.current = false; }}>Pausar tras esta página</button>}
    <p role="status" aria-live="polite">{error || pauseLabel(status) || status.error || (running ? "No cierres esta página. Si se alcanza el límite horario de SerpAPI, esperará y continuará en la siguiente hora." : "Puedes reanudar desde el último paso guardado.")}</p>
  </aside>;
}
