import type { MetadataRoute } from "next";
export default function robots():MetadataRoute.Robots{const base=process.env.NEXT_PUBLIC_SITE_URL??"https://bravometro.es";return{rules:{userAgent:"*",allow:"/",disallow:["/api/","/es/admin","/en/admin","/es/mis-valoraciones","/en/mis-valoraciones"]},sitemap:`${base}/sitemap.xml`}}
