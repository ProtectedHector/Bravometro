"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/types";

export function AdminPlaceStatus({ slug, locale }: { slug: string; locale: Locale }) {
  const { isSignedIn, user } = useUser();
  const [permission, setPermission] = useState<{ ownerId?: string; slug?: string; canDelete: boolean }>({ canDelete: false });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const spanish = locale === "es";

  useEffect(() => {
    const controller = new AbortController();
    if (isSignedIn) fetch(`/api/admin/place-status?slug=${encodeURIComponent(slug)}`, { cache: "no-store", signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (response.ok && !controller.signal.aborted) setPermission({ ownerId: user?.id, slug, canDelete: data.allowed && data.canDelete });
    }).catch(() => {});
    return () => controller.abort();
  }, [isSignedIn, user?.id, slug]);

  async function markPermanentlyClosed() {
    const confirmation = spanish
      ? "Este restaurante desaparecerá del listado y del mapa, pero se conservarán sus datos. ¿Marcarlo como cerrado permanentemente?"
      : "This restaurant will disappear from the list and map, but its data will be kept. Mark it as permanently closed?";
    if (!window.confirm(confirmation)) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/place-status", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operation: "markPermanentlyClosed", slug }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.replace(`/${locale}/bravas`);
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Error"); }
    finally { setLoading(false); }
  }

  if (!isSignedIn || permission.ownerId !== user?.id || permission.slug !== slug || !permission.canDelete) return null;
  return <aside className="card content-card" style={{ marginBottom: 24 }}>
    <h2>{spanish ? "Estado del restaurante · administración" : "Restaurant status · administration"}</h2>
    <p>{spanish ? "Si Google Maps confirma que ha cerrado definitivamente, retíralo sin borrar sus valoraciones ni el historial." : "If Google Maps confirms it has closed for good, remove it without deleting its ratings or history."}</p>
    <button className="button secondary" type="button" disabled={loading} onClick={() => void markPermanentlyClosed()}>{loading ? (spanish ? "Actualizando…" : "Updating…") : (spanish ? "Marcar como cerrado permanentemente" : "Mark as permanently closed")}</button>
    <p role="status" aria-live="polite">{message}</p>
  </aside>;
}
