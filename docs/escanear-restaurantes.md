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
- Descubrimiento SerpAPI, seis páginas como máximo por zona (offsets 0–100, recomendación del proveedor). Búsqueda textual de restaurantes españoles y bravas; no confirma límites administrativos ni incluye todos los restaurantes de una ciudad. Los barrios restantes se buscan a nivel distrito.
- Por local, recorre las páginas disponibles de reseñas sin filtro de palabra en el proveedor. Al alcanzar 500 reseñas examinadas y tener al menos una mención al plato confirmada por Gemini, pasa al siguiente local. Sin menciones confirmadas, continúa; si la primera aparece después de 500, termina en esa página. Solo los textos con la palabra completa «bravas» pasan a Gemini; este confirma que hablan del plato y distingue menciones sin opinión. «No las probé» no crea una nota. Una mención real permite crear el local; sin juicio evaluable queda fuera del ranking puntuado.
- El contador de reseñas y el motivo de cierre por límite se guardan en Convex. Las notas de un escaneo cortado conservan la etiqueta de análisis parcial. Para locales ya en curso sin contador histórico, se estima conservadoramente hasta 20 reseñas por página guardada (hasta 25 páginas); pueden terminar algo antes de 500. Si ya cumplen el límite y tienen menciones, reanudar los cierra sin otra consulta externa.
- La cola solo guarda identificadores del local, zona y estado. No se guarda nombre/dirección hasta confirmar una mención al plato. Entonces se solicitan los detalles y se vincula el Place ID existente o se crea el local.
- Reseñas y salida de Gemini se procesan en memoria; solo se persisten acumulados numéricos, número de evidencias, puntuaciones, confianza y datos del local. No se guardan autores, fotos, textos, citas ni resúmenes de esas reseñas. No se escriben en `reviewEvidence`.
- Gemini usa una rúbrica continua; redondeo a un decimal al presentar/persistir el agregado, sin aleatoriedad. Atributos desconocidos se muestran «—». Nota IA separada de las manuales; con una manual aprobada, IA pesa 20%, con cinco aproximadamente 4,8%. Las notas editoriales existentes conservan prioridad sobre el agregado comunitario, como antes.
- Convex conserva local/página, detecta tokens de paginación repetidos y evita importar de nuevo el mismo Place ID entre zonas. Un bloqueo temporal impide pasos simultáneos entre pestañas. Las páginas confirmadas se guardan atómicamente con sus acumulados. Una página fallida sigue pendiente y reanudar puede repetir llamadas externas; no se garantiza exactamente una llamada al proveedor ante fallos.
- Deduplicación de reseñas dentro de cada página en memoria. Google puede cambiar su orden entre peticiones; no se garantiza ausencia absoluta de solapamiento de reseñas entre páginas sin almacenar identificadores, que este diseño evita.
- El botón trabaja en pasos cortos, hasta 200 por sesión, y se puede pausar. Mantén la pestaña abierta; cerrar detiene nuevos pasos. Reanudar conserva progreso. Sin reintentos automáticos cuando SerpAPI/Gemini devuelve error de cuota, límite o timeout: se muestra el error y queda guardado en Convex.
- El contador de consultas registra intentos SerpAPI de este escáner (incluyendo detalles), no el saldo real del proveedor. Cada página adicional puede consumir consultas. No hay escaneo real ejecutado por configurar el código.

## Condiciones y privacidad

SerpAPI no elimina por sí misma las restricciones aplicables a datos de Google ni autoriza automáticamente puntuaciones derivadas. Borrar el texto no basta. Comprueba licencias y autorización para análisis y persistencia antes del piloto. Gemini recibe las reseñas que se analizan; el tier gratuito puede permitir el uso de contenidos para mejorar productos. Revisa términos de retención/entrenamiento y no envíes textos que no tengas derecho a procesar.

Referencias: https://ai.google.dev/gemini-api/docs/api-key · https://ai.google.dev/gemini-api/docs/pricing · https://serpapi.com/google-maps-reviews-api · https://serpapi.com/google-maps-api
