import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export function Footer({ locale, dictionary: d }: { locale: Locale; dictionary: Dictionary }) {
  return <footer className="site-footer"><div className="shell footer-grid">
    <div><div className="footer-brand"><Image src="/assets/app-icon.png" alt="" width={52} height={52}/><span>Bravómetro</span></div><p className="footer-copy">{d.footer.tagline}<br/><small>{d.footer.legal}</small></p></div>
    <div className="footer-links"><Link href={`/${locale}/ranking`}>{d.nav.ranking}</Link><Link href={`/${locale}/publicar`}>{d.nav.contribute}</Link><Link href={`/${locale}/metodologia`}>{d.nav.methodology}</Link><Link href={`/${locale}/metros`}>{d.footer.discover}</Link><Link href={`/${locale}/admin`}>Admin</Link></div>
  </div></footer>;
}
