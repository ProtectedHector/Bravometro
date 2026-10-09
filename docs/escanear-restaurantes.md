# Escáner de restaurantes

## Configuración

1. En https://aistudio.google.com/api-keys crea una clave Gemini API. Puedes importar el proyecto Bravometro. La tarjeta «Gemini API» de Cloud es la pertinente, no Code Assist ni Cloud Assist.
2. En `.env.local` y Vercel añade `GEMINI_API_KEY` como Secret, sin `NEXT_PUBLIC_`. Opcional: `GEMINI_MODEL=gemini-3.8-flash`. Mantén `SERPAPI_API_KEY` como Secret. No publiques claves en chats ni Git; rota la clave SerpAPI que se compartió anteriormente.
3. En Clerk crea una plantilla JWT llamada `convex`, usando su plantilla Convex (audience `convex`). En Convex configura `CLERK_JWT_ISSUER_DOMAIN` con el issuer exacto de esa plantilla. El escáner usa autenticación JWT real y comprueba el `_id` del usuario en Convex, no un ID enviado por el navegador.
4. Despliega las funciones y esquema con `npx convex deploy`, después reconstruye Vercel. Las claves SerpAPI/Gemini viven en Vercel, no se necesitan en Convex. Configura por separado desarrollo y producción si tienen distintos Clerk/Convex.
5. Inicia sesión como el usuario de Convex `jx72bkvz217bgnwv4g3pvvywh98fq64v`. El panel aparece en `/es/bravas`. Si aún no existe su perfil, la sincronización habitual de usuario debe completarse primero.

La suscripción Google AI Pro y la facturación de Gemini Developer API no son equivalentes. Verifica el tier del proyecto en AI Studio antes de usarlo. La captura de Cloud indica facturación activa: no presupongas que las peticiones serán gratuitas. El código detiene 429/errores de cuota, pero NO garantiza coste cero en cuentas con facturación habilitada. Los presupuestos de Cloud son avisos, no necesariamente cortes. No activa facturación ni cambia planes.

## Funcionamiento

- Orden definido en `convex/scanPlan.ts`: Ensanche, Casco Histórico de Vallecas y Santa Eugenia (Villa de Vallecas), Hortaleza, Centro y después los distritos del plan municipal.
- Descubrimiento SerpAPI, seis consultas como máximo por zona, priorizadas por `patatas bravas`, `bravas`, tapas/raciones y bares de bravas. No confirma límites administrativos ni incluye todos los restaurantes de una ciudad. Los barrios restantes se buscan a nivel distrito.
- Por local solicita primero una sola página de hasta 20 reseñas. Gemini decide cuáles hablan realmente de las bravas y cuáles aportan evidencia útil. Con unas 5 reseñas útiles y cobertura de al menos 6 de los 10 aspectos se detiene inmediatamente. Si las primeras opiniones son demasiado genéricas puede solicitar como máximo dos páginas adicionales (60 reseñas en total). Esto evita la antigua exploración de hasta 500 reseñas.
- El contador de reseñas, consultas y el motivo de cierre se guardan en Convex. El escáner usa la metodología `bravas-gemini-2.1`; las ejecuciones interrumpidas se reanudan desde la siguiente página no confirmada.
- La cola guarda identificadores, zona, estado y, cuando SerpAPI ya los ofrece durante el descubrimiento, nombre, dirección y coordenadas. Al confirmar una mención se reutilizan esos datos para vincular el Place ID existente o crear el local. Solo se hace una consulta de detalle adicional si faltan nombre o dirección.
- Reseñas y salida de Gemini se procesan en memoria; solo se persisten acumulados numéricos, número de evidencias, puntuaciones, confianza y datos del local. No se guardan autores, fotos, textos, citas ni resúmenes de esas reseñas. No se escriben en `reviewEvidence`.
- Gemini usa una rúbrica continua para los 10 aspectos: calidad general, patata, salsa, textura, sabor, picante, cantidad, calidad/precio, presentación y originalidad. El agregado se redondea a un decimal. Cuando no hay evidencia para un aspecto se persiste el valor neutral 5, nunca `null` o `NaN`; la cobertura real se guarda por separado. Nota IA separada de las manuales; con una manual aprobada, IA pesa 20%, con cinco aproximadamente 4,8%.
- Convex conserva local/página, detecta tokens de paginación repetidos y evita importar de nuevo el mismo Place ID entre zonas. Un lease de 120 segundos impide pasos simultáneos entre pestañas. Las páginas confirmadas se guardan atómicamente con sus acumulados. Si el proceso se interrumpe antes de confirmar la página, el lease caduca y esa página queda disponible para reanudación; la llamada externa puede repetirse.
- Deduplicación de reseñas dentro de cada página en memoria. Google puede cambiar su orden entre peticiones; no se garantiza ausencia absoluta de solapamiento de reseñas entre páginas sin almacenar identificadores, que este diseño evita.
- El botón trabaja en pasos cortos, hasta 200 por sesión, y se puede pausar. Mantén la pestaña abierta; cerrar detiene nuevos pasos. Reanudar conserva progreso. SerpAPI y Gemini tienen timeout, hasta 3 intentos con backoff exponencial para fallos temporales y un límite total por local.
- Tras agotar los retries de un error asociado a un restaurante, se registra el error, se marca ese local como fallido y el lote continúa automáticamente. Los errores globales de autenticación, permisos o cuota (`401`, `403` y `429`) pausan el lote para evitar consumo o fallos repetidos.
- El contador registra consultas lógicas de SerpAPI globales y por restaurante, no el saldo real del proveedor ni cada retry HTTP interno. Las recuperaciones del archivo de una búsqueda que SerpAPI deje en estado `Queued` o `Processing` tampoco se contabilizan como una nueva búsqueda. Consulta el panel de SerpAPI para contrastar el consumo facturable real.
- Los logs indican inicio y duración de SerpAPI/Gemini, reseñas obtenidas, reseñas útiles, cobertura y motivo de parada. No incluyen claves ni textos de reseñas. No hay escaneo real ejecutado por configurar el código.

## Límites operativos

| Concepto | Límite actual | Comportamiento |
|---|---:|---|
| Descubrimiento por zona | 6 consultas | Seis búsquedas textuales orientadas a bravas/tapas; se deduplican por Place ID. |
| Resultados guardados por consulta de descubrimiento | 20 | Se deduplican globalmente por Place ID. |
| Reseñas solicitadas por página | Hasta 20 | La última página puede pedir menos para respetar el máximo total. |
| Objetivo de reseñas útiles | 5 | No basta con cinco menciones genéricas: deben aportar señales puntuables. |
| Cobertura mínima para parar | 6 de 10 aspectos | Se cuenta un aspecto cuando Gemini marca evidencia directa o indirecta razonable. |
| Páginas de reseñas por restaurante | Máximo 3 | Hasta 60 reseñas examinadas; no existe paginación indefinida. |
| Consulta de detalle | 0 normalmente; máximo 1 | Solo cuando el descubrimiento no aportó nombre o dirección. |
| Timeout SerpAPI por intento | 15 segundos | Hasta 3 intentos para errores temporales. |
| Timeout Gemini por intento | 20 segundos | Hasta 3 intentos para errores temporales. |
| Backoff | 0,5 s y 1 s | Espera exponencial antes del segundo y tercer intento. |
| Espera del navegador por paso | 115 segundos | Si vence, se informa y el progreso confirmado permanece guardado. |
| Lease de Convex | 120 segundos | Evita dos pasos simultáneos y permite recuperar ejecuciones interrumpidas. |
| Pasos por pulsación | Máximo 200 | El usuario puede pausar después del paso en curso y reanudar posteriormente. |

### Criterio exacto de parada

Después de cada página se suman las reseñas útiles y la cobertura acumulada del restaurante:

1. Si hay al menos 5 reseñas útiles y evidencia para 6 o más aspectos, se detiene SerpAPI inmediatamente.
2. Si no hay evidencia suficiente pero existe otra página, se solicita una página adicional.
3. Al llegar a 3 páginas o 60 reseñas se detiene aunque la cobertura siga siendo baja; los aspectos sin evidencia reciben el valor neutral `5` y se conserva por separado el número de aspectos cubiertos.
4. Si SerpAPI no ofrece otra página, se finaliza con la evidencia disponible.

Una reseña útil debe describir concretamente uno o más aspectos de las bravas. Una opinión genérica del restaurante, las estrellas generales, el servicio o el ambiente no cuentan como evidencia del plato.

## Puntuaciones y valores neutrales

Los diez campos siempre terminan con un número finito entre `0` y `10`: calidad general (`overall`), patata, salsa, textura, sabor, picante, cantidad, calidad/precio, presentación y originalidad. Gemini devuelve además una marca de evidencia por campo. Los campos sin evidencia reciben `5`, pero ese neutral no incrementa su peso ni se presenta internamente como evidencia observada.

Las puntuaciones con evidencia se agregan ponderadas por la confianza de Gemini y se redondean una sola vez a un decimal. Picante mide intensidad, no si el picante es bueno o malo. No se usan estrellas generales del restaurante para calcular las bravas.

## Despliegue y comprobación

Los cambios de límites incluyen esquema y funciones de Convex. Después de actualizar el código hay que ejecutar:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npx convex deploy
```

Antes de lanzar un lote grande, realiza un piloto pequeño y contrasta el contador interno con el panel de SerpAPI. Comprueba especialmente un restaurante con reseñas descriptivas, otro con opiniones genéricas, respuestas incompletas, errores temporales y una interrupción seguida de reanudación.

## Acceso a los logs

### Desarrollo local

Inicia la aplicación desde una terminal:

```bash
npm run dev
```

Después ejecuta el escáner desde `/es/bravas`. Los logs de SerpAPI y Gemini aparecen en esa misma terminal porque se generan en la ruta de servidor `/api/restaurants/scan`.

Ejemplo:

```text
[Bravómetro] restaurante-id → SerpAPI iniciado (consulta 1)
[Bravómetro] restaurante-id → SerpAPI OK (2.3s), 20 reseñas obtenidas
[Bravómetro] restaurante-id → Gemini iniciado
[Bravómetro] restaurante-id → Gemini OK (4.8s), 7 reseñas útiles, 8/10 aspectos con evidencia, suficiente evidencia → STOP SerpAPI
```

### Producción en Vercel

1. Abre el proyecto Bravómetro en Vercel.
2. Entra en **Logs**.
3. Filtra por la ruta `/api/restaurants/scan`.
4. Busca el prefijo `[Bravómetro]` para aislar los eventos del escáner.

Los logs muestran tiempos, consultas, número de reseñas, evidencia y errores, pero no deben mostrar claves ni textos completos de reseñas.

### Convex

En el dashboard del proyecto Convex, abre **Logs** y filtra por `restaurantScanner`. Aquí se pueden diagnosticar problemas de autenticación, validación, leases y persistencia.

El estado persistido incluye los contadores globales, las consultas por restaurante y el último error de un restaurante fallido. El panel administrativo de `/es/bravas` muestra un resumen global, pero no sustituye los logs técnicos.

### Consumo real de SerpAPI

Consulta el dashboard de SerpAPI para comprobar el consumo facturable real. El contador interno de Bravómetro registra consultas lógicas iniciadas por el escáner; no cuenta necesariamente cada retry HTTP ni las recuperaciones de búsquedas en estado `Queued` o `Processing`.

## Condiciones y privacidad

SerpAPI no elimina por sí misma las restricciones aplicables a datos de Google ni autoriza automáticamente puntuaciones derivadas. Borrar el texto no basta. Comprueba licencias y autorización para análisis y persistencia antes del piloto. Gemini recibe las reseñas que se analizan; el tier gratuito puede permitir el uso de contenidos para mejorar productos. Revisa términos de retención/entrenamiento y no envíes textos que no tengas derecho a procesar.

Referencias: https://ai.google.dev/gemini-api/docs/api-key · https://ai.google.dev/gemini-api/docs/pricing · https://serpapi.com/google-maps-reviews-api · https://serpapi.com/google-maps-api
