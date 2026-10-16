"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/types";

export function AdminPlaceStatus({ slug, locale }: { slug: string; locale: Locale }) {
  const { isSignedIn, user } = useUser();
  const [permission, setPermission] = useState<{ ownerId?: string; slug?: string; canDelete: boolean; noPhotoFound: boolean }>({ canDelete: false, noPhotoFound: false });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const spanish = locale === "es";

  useEffect(() => {
    const controller = new AbortController();
    if (isSignedIn) fetch(`/api/admin/place-status?slug=${encodeURIComponent(slug)}`, { cache: "no-store", signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (response.ok && !controller.signal.aborted) setPermission({ ownerId: user?.id, slug, canDelete: data.allowed && data.canDelete, noPhotoFound: data.allowed && data.noPhotoFound === true });
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

  async function toggleNoPhotoFound() {
    setLoading(true);
    setMessage("");
    const noPhotoFound = !permission.noPhotoFound;
    try {
      const response = await fetch("/api/admin/place-status", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operation: "setNoPhotoFound", slug, noPhotoFound }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setPermission(current => ({ ...current, noPhotoFound: result.noPhotoFound === true }));
      setMessage(noPhotoFound
        ? (spanish ? "Marcado como revisado sin foto." : "Marked as reviewed with no photo found.")
        : (spanish ? "Marca de foto no encontrada eliminada." : "No-photo-found mark removed."));
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Error"); }
    finally { setLoading(false); }
  }

  if (!isSignedIn || permission.ownerId !== user?.id || permission.slug !== slug || !permission.canDelete) return null;
  return <aside className="card content-card" style={{ marginBottom: 24 }}>
    <h2>{spanish ? "Estado del restaurante · administración" : "Restaurant status · administration"}</h2>
    <p>{spanish ? "Si Google Maps confirma que ha cerrado definitivamente, retíralo sin borrar sus valoraciones ni el historial." : "If Google Maps confirms it has closed for good, remove it without deleting its ratings or history."}</p>
    <div className="admin-status-actions"><button className="button secondary" type="button" disabled={loading} onClick={() => void markPermanentlyClosed()}>{loading ? (spanish ? "Actualizando…" : "Updating…") : (spanish ? "Marcar como cerrado permanentemente" : "Mark as permanently closed")}</button><button className={`button ${permission.noPhotoFound ? "ghost" : "secondary"}`} type="button" disabled={loading} onClick={() => void toggleNoPhotoFound()}>{permission.noPhotoFound ? (spanish ? "✓ Quitar marca sin foto" : "✓ Remove no-photo mark") : (spanish ? "Marcar: no se encontró foto" : "Mark: no photo found")}</button></div>
    <p role="status" aria-live="polite">{message}</p>
  </aside>;
}
