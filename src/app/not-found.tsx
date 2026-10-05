import Link from "next/link";
export default function NotFound() {
  return <main className="shell section" style={{minHeight:"70vh",display:"grid",placeItems:"center"}}><div className="card content-card" style={{textAlign:"center",maxWidth:560}}><span className="eyebrow">404 · Sin salsa</span><h1 className="section-title">Esta mesa no existe</h1><p className="lede">La dirección quizá ha cambiado o todavía está en la cocina.</p><Link className="button" href="/es">Volver a Bravómetro</Link></div></main>;
}
