# Decisiones arquitectónicas

## ADR-001 · Next.js App Router
Elegido por SSR/SEO, rutas por locale, Server Components y despliegue directo en Vercel.

## ADR-002 · Convex como fuente de verdad
Ofrece backend compartible con la futura app. Sin proyecto configurado se usa fallback demo explícito, nunca presentado como real.

## ADR-003 · i18n ligero y centralizado
Dos diccionarios tipados evitan una dependencia adicional. Las URLs siempre incluyen locale.

## ADR-004 · Fórmula 1.0 simple y versionada
La media ponderada es explicable. La confianza se presenta separada para no fingir certeza.

## ADR-005 · Evidencia con permisos explícitos
Texto, referencia y datos derivados son campos distintos. Ninguna fuente se considera almacenable por defecto.

## ADR-006 · Familia mediante ProductType
Bravómetro mantiene protagonismo; los demás productos aparecen solo como conceptos “En la cocina…”.

## ADR-007 · Assets originales preservados
Los PNG originales permanecen en `logo/`; copias semánticas viven en `public/assets`. El icono cuadrado es favicon y la mascota aislada es recurso editorial.

## ADR-008 · Clerk para identidad social
Clerk evita desarrollar y custodiar contraseñas, ofrece UI accesible y permite Google, Apple, Facebook y X. Google será la opción principal en Android; Apple ID estará disponible en web y será nativo en iOS. Instagram queda fuera mientras no exista un proveedor estándar compatible.

## ADR-009 · Google Places desde el servidor
Text Search (New) y Nearby Search (New) proporcionan un identificador estable y ubicación verificada. La clave de Places nunca llega al navegador y un field mask minimiza coste y datos retornados.

## ADR-010 · Publicación verificada y moderación de valoraciones
Los sitios seleccionados en Google Places se verifican de nuevo desde el servidor. Al valorar, Convex crea silenciosamente el sitio si todavía no existe y guarda la valoración en la misma mutación. Las valoraciones se guardan como `pending` y solo afectan a la nota tras su aprobación.

## ADR-011 · Dos claves de Google Maps
Places API (New) usa una clave secreta en el servidor. Maps JavaScript API usa otra clave pública, restringida por dominio y por API. Los resultados de Places se muestran sobre Google Maps para respetar sus políticas de visualización.
