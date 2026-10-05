import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { AuthControls } from "@/components/AuthControls";

export function Header({ locale, dictionary: d }: { locale: Locale; dictionary: Dictionary }) {
  const links = [
    ["ranking", d.nav.ranking], ["bravas", d.nav.places], ["mapa", d.nav.map], ["metodologia", d.nav.methodology], ["metros", d.nav.meters],
  ];
  return <>
    <header className="site-header"><div className="shell header-inner">
      <Link href={`/${locale}`} className="brand" aria-label="Bravómetro, inicio"><Image src="/assets/app-icon.png" width={42} height={42} alt="" priority/><span>Bravómetro</span></Link>
      <nav className="desktop-nav" aria-label="Principal">{links.map(([path,label])=><Link key={path} className="nav-link" href={`/${locale}/${path}`}>{label}</Link>)}</nav>
      <Link className="button contribute-button" href={`/${locale}/publicar`}>＋ {d.nav.contribute}</Link>
      <AuthControls locale={locale} enabled={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)}/>
      <div className="locale-switch" aria-label="Idioma"><Link className={locale==="es"?"active":""} href="/es">ES</Link><Link className={locale==="en"?"active":""} href="/en">EN</Link></div>
    </div></header>
    <nav className="mobile-nav" aria-label="Navegación móvil">
      <Link href={`/${locale}`}><b>⌂</b>{d.nav.home}</Link><Link href={`/${locale}/ranking`}><b>★</b>{d.nav.ranking}</Link><Link href={`/${locale}/bravas`}><b>⌕</b>{d.nav.places}</Link><Link href={`/${locale}/mapa`}><b>⌖</b>{d.nav.map}</Link><Link href={`/${locale}/publicar`}><b>＋</b>{d.nav.contribute}</Link>
    </nav>
  </>;
}
