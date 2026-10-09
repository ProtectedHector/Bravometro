# Bravómetro

Bravómetro convierte opiniones sobre patatas bravas en información estructurada: puntuación global, atributos, confianza y trazabilidad metodológica.

## Arranque rápido

```bash
npm install
cp .env.example .env.local
npm run dev
```

Sin Convex configurado, la web utiliza tres perfiles inequívocamente marcados como datos de demostración. Para activar la base de datos real ejecuta `npx convex dev`, configura las variables generadas y los tokens del servidor, y entra en `/es/admin`.

El alta de sitios y las valoraciones requieren inicio de sesión social con Clerk. Google es la opción recomendada —también para Android— y Apple puede habilitarse para Apple ID; Facebook y X son opcionales. La búsqueda de establecimientos usa Places API (New) y guarda el identificador oficial de Google.

## Comandos

- `npm run dev`: desarrollo local.
- `npm run build`: build de producción.
- `npm run lint`: ESLint.
- `npm run typecheck`: TypeScript estricto.
- `npm test`: tests de límites, cobertura y parada anticipada del escáner.
- `npm run convex:dev`: desarrollo Convex y generación de tipos.
- `npm run convex:deploy`: despliegue Convex.

Los perfiles demo no representan establecimientos ni críticas reales. Consulta [`docs/README.md`](docs/README.md) para el recorrido completo y [`docs/escanear-restaurantes.md`](docs/escanear-restaurantes.md) para los límites exactos de SerpAPI/Gemini, reintentos, reanudación y puntuación automática.
