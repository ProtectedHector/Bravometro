# Documentación de Bravómetro

Este repositorio contiene el MVP web mobile-first de Bravómetro. La aplicación arranca sin servicios externos con tres perfiles `demo`; al definir `NEXT_PUBLIC_CONVEX_URL`, `src/lib/data.ts` usa Convex como fuente de verdad.

## Recorrido

1. Instala dependencias con `npm install`.
2. Copia `.env.example` a `.env.local`.
3. Ejecuta `npx convex dev` y crea un proyecto.
4. Configura `BRAVOMETRO_ADMIN_TOKEN` localmente y en Convex.
5. Ejecuta `npx convex run seed:initialize '{"adminToken":"..."}'`.
6. Inicia `npm run dev` y crea establecimientos reales en `/es/admin`.

La familia de metros comparte `ProductType`, establecimientos, puntuaciones, fuentes y metodología. Solo `bravas` está activo; el resto son placeholders “En la cocina…”.

## Escáner automático de bravas

La configuración, límites de consumo, criterio de parada, retries, recuperación y puntuación de los diez aspectos están documentados en [`escanear-restaurantes.md`](escanear-restaurantes.md). El plan territorial y las condiciones del piloto están en [`plan-catalogo-distritos.md`](plan-catalogo-distritos.md).
