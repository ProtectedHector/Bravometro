"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/types";
import styles from "./PhotoViewer.module.css";

export function PhotoViewer({ src, alt, locale, hero = false }: { src: string; alt: string; locale: Locale; hero?: boolean }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeLabel = locale === "es" ? "Cerrar imagen (clic en cualquier sitio o Escape)" : "Close image (click anywhere or Escape)";

  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (element.open) element.close();
    };
  }, [open]);

  return <>
    <button ref={trigger} type="button" className={`${styles.thumbnail}${hero ? ` ${styles.hero}` : ""}`} aria-label={`${locale === "es" ? "Ver imagen completa" : "View full image"}: ${alt}`} aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <Image src={src} alt={alt} fill unoptimized sizes={hero ? "(max-width: 1200px) 100vw, 1200px" : "(max-width: 640px) 100vw, (max-width: 800px) 50vw, 33vw"} className={styles.cropped} />
    </button>
    <dialog ref={dialog} className={styles.dialog} aria-label={alt} onClose={() => { setOpen(false); trigger.current?.focus(); }}>
      <button type="button" className={styles.closeSurface} aria-label={closeLabel} onClick={() => dialog.current?.close()}>
        {open && <Image src={src} alt={alt} fill unoptimized sizes="100vw" className={styles.fullImage} />}
        <span className={styles.closeIcon} aria-hidden="true">×</span>
      </button>
    </dialog>
  </>;
}
