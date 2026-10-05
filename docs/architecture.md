# Arquitectura

```text
Next.js App Router (web, SEO, admin)
        ↓ Clerk auth + protected API routes
Google Places API → búsqueda por texto/cercanía y verificación
Google Maps JS API → mapa y marcadores en el navegador
        ↓ valoración + alta atómica si falta el sitio
Convex (users, places, userRatings, dishRatings, evidence, sources)
        └ Convex File Storage (fotos de valoraciones)
        ↑ futuro cliente móvil
Domain: scoring + ProductType + i18n
```

Las páginas son Server Components salvo filtros, mapa y administración. `src/lib/data.ts` encapsula Convex y permite un fallback demo explícito cuando no hay despliegue configurado. La lógica de puntuación vive en `src/lib/bravometro`, no en React.

Las aportaciones pasan por rutas Next.js que verifican la sesión de Clerk. Solo el servidor conoce `GOOGLE_MAPS_API_KEY` y `BRAVOMETRO_SERVICE_TOKEN`. El navegador recibe una clave distinta, `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`, limitada por dominio y a Maps JavaScript API.

Clerk gestiona acceso, proveedores sociales y sesiones. Convex mantiene un perfil mínimo de aplicación y las relaciones `users → userRatings → places`; así el historial privado no depende de consultar Clerk para reconstruir cada voto.

`ProductType` evita acoplar el dominio a bravas. El producto activo es `bravas`; los demás tipos ya tienen rutas y conceptos, pero no publican rankings.
