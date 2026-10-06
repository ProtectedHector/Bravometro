"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { prepareRatingPhoto } from "@/lib/rating-photo";
import type { Locale } from "@/lib/types";

export function AdminPlaceImage({ slug, locale, hasImage }: { slug: string; locale: Locale; hasImage: boolean }) {
  const { isSignedIn, user } = useUser();
  const [permission, setPermission] = useState<{ ownerId?: string; slug?: string; eligible: boolean }>({ eligible: false });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const spanish = locale === "es";

  useEffect(() => {
    const controller = new AbortController();
    if (isSignedIn) fetch(`/api/admin/place-image?slug=${encodeURIComponent(slug)}`, { cache: "no-store", signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (response.ok && !controller.signal.aborted) setPermission({ ownerId: user?.id, slug, eligible: data.allowed && data.eligible });
    }).catch(() => {});
    return () => controller.abort();
  }, [isSignedIn, user?.id, slug]);

  async function upload(file: File) {
    setLoading(true);
    setMessage("");
    try {
      const photo = await prepareRatingPhoto(file);
      const prepared = await fetch("/api/admin/place-image", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operation: "upload", slug }) });
      const upload = await prepared.json();
      if (!prepared.ok) throw new Error(upload.error);
      const uploaded = await fetch(upload.uploadUrl, { method: "POST", headers: { "Content-Type": photo.type }, body: photo });
      const stored = await uploaded.json();
      if (!uploaded.ok || !stored.storageId) throw new Error(spanish ? "No se pudo subir la imagen" : "Image upload failed");
      const saved = await fetch("/api/admin/place-image", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operation: "save", slug, storageId: stored.storageId }) });
      const result = await saved.json();
      if (!saved.ok) throw new Error(result.error);
      setMessage(spanish ? "Imagen guardada" : "Image saved");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Error"); }
    finally { setLoading(false); }
  }

  if (!isSignedIn || permission.ownerId !== user?.id || permission.slug !== slug || !permission.eligible) return null;
  return <div className="card content-card" style={{ marginBottom: 24 }}>
    <h2>{spanish ? "Imagen del restaurante · administración" : "Restaurant image · administration"}</h2>
    <p>{spanish ? "Añade una imagen propia o que tengas permiso para publicar. Se usará en las tarjetas mientras no haya una foto de una reseña. No crea ninguna valoración." : "Add an image you own or have permission to publish. Cards will use it until a review photo is available. No rating is created."}</p>
    <label className="button" htmlFor={`admin-image-${slug}`} aria-disabled={loading}>{loading ? (spanish ? "Subiendo…" : "Uploading…") : hasImage ? (spanish ? "Cambiar imagen" : "Change image") : (spanish ? "Subir imagen" : "Upload image")}</label>
    <input id={`admin-image-${slug}`} className="visually-hidden" type="file" disabled={loading} accept=".heic,.heif,image/heic,image/heif,image/jpeg,image/png,image/webp" onChange={event => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (file && !loading) void upload(file);
    }} />
    <p>{spanish ? "JPG, PNG, WebP o HEIC; máximo 15 MB. Se optimiza antes de guardar." : "JPG, PNG, WebP or HEIC; maximum 15 MB. Optimized before saving."}</p>
    <p role="status" aria-live="polite">{message}</p>
  </div>;
}
