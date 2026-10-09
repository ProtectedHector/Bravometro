# Plan de catálogo inicial y puntuación de bravas por distritos

Fecha: 8 de octubre de 2026. Estado: Fase 1 actualizada a `bravas-gemini-2.3`, pendiente de desplegar Convex y validar con un piloto controlado; actualizar el código no ejecuta búsquedas ni importaciones.

## Implementación del piloto

El botón «Escanear restaurantes» de `/es/bravas` es exclusivo del usuario de Convex `jx72bkvz217bgnwv4g3pvvywh98fq64v`, con comprobación JWT en el backend. Usa SerpAPI para descubrimiento/reseñas y Gemini para confirmar menciones al plato y valorar contexto. Conserva progreso por local y página en Convex, sin textos. Solo incorpora locales con menciones reales a bravas; una mención sin juicio de calidad no inventa una nota. La cola ejecutable territorial está en `convex/scanPlan.ts`, respetando el orden de abajo. Consulta `escanear-restaurantes.md` para configuración, cuotas, límites de cobertura y condiciones pendientes de verificar.

## Objetivo

Crear una lista inicial de establecimientos de Madrid, comenzando por Ensanche de Vallecas y el resto de Villa de Vallecas, después Hortaleza y finalmente Centro. Cada local podrá tener una nota automática provisional, separada de las valoraciones manuales de Bravómetro. Al principio será la referencia disponible; las valoraciones aprobadas de la comunidad tendrán mayor peso cuando lleguen.

Decisión de producto: priorizar búsquedas de «bravas» y «patatas bravas», analizar las menciones pertinentes de forma transitoria y persistir únicamente las notas y los metadatos mínimos permitidos. No almacenar textos de reseñas, citas, paráfrasis, resúmenes, autores ni respuestas completas. Las notas tendrán un decimal y variarán según lo que describa cada opinión, sin limitarse a cinco valores enteros.

Esta decisión reduce la retención de contenido; no acredita que se hayan evitado las restricciones de Google. El permiso para generar y conservar notas derivadas sigue siendo un requisito antes de ejecutar el análisis sobre esa fuente.

## Límites de Google que condicionan el proyecto

- Places API (New) reconoce `spanish_restaurant`. Añadir una segunda búsqueda de bares y restaurantes de tapas evita perder locales que sirven bravas pero tienen otra categoría. Esta ampliación debe identificarse separadamente.
- Las búsquedas son resultados de descubrimiento, no un censo completo. Text Search devuelve actualmente hasta 60 resultados entre sus páginas y puede variar entre peticiones. No se puede prometer «todos los restaurantes».
- Place Details devuelve como máximo cinco reseñas ordenadas por relevancia. No ofrece paginación para leer todas las reseñas ni un filtro para obtener todas las menciones de bravas. No encontrar menciones en la muestra significa «sin evidencia», no «no sirven bravas».
- Las condiciones generales de Google restringen la extracción masiva, el almacenamiento y la creación de contenido derivado. Guardar solo puntuaciones o borrar el texto no convierte automáticamente el uso en permitido. Para facturación en España hay que comprobar las condiciones específicas del EEE y el contrato aplicable.
- Antes de construir un catálogo persistente o puntuar reseñas de Google, verificar que el uso concreto está autorizado. Mientras no lo esté, limitar Google a búsquedas y visualización permitidas; construir el catálogo y las notas con aportaciones propias, datos abiertos con licencia adecuada o reseñas licenciadas para este tratamiento. No recurrir a scraping como sustituto.
- Los Place IDs tienen una excepción de almacenamiento. Esta excepción no se extiende automáticamente a nombres, direcciones, textos, resúmenes o puntuaciones derivadas. Mostrar las atribuciones requeridas cuando se presenta contenido de Google.

## Organización territorial

Usar distritos como unidades de trabajo y barrios como sublotes. Ensanche de Vallecas es un barrio de Villa de Vallecas, no un distrito adicional. El primer distrito comprende Ensanche de Vallecas, Casco Histórico de Vallecas y Santa Eugenia; empezar por Ensanche.

Para descubrimiento autorizado, comenzar con «patatas bravas Ensanche de Vallecas Madrid», «bravas Villa de Vallecas Madrid», «bares de tapas con bravas [barrio] Madrid» y «bravioli [barrio] Madrid». Complementar con restaurantes españoles; no imponer esa categoría en todas las consultas, porque excluiría bares y otros locales con bravas. Una consulta textual no garantiza pertenencia administrativa. Confirmarla con direcciones de una fuente autorizada o revisión editorial. Si se usan polígonos municipales, cruzarlos únicamente con coordenadas cuyo origen y licencia permitan ese análisis: las condiciones generales de Google restringen usar coordenadas de Places para point-in-polygon.

No multiplicar cuadrículas o consultas para eludir límites ni convertir Places en una exportación masiva. El registro territorial debe distinguir locales descubiertos, pertenencia confirmada y cobertura pendiente.

## Flujo propuesto, condicionado a permisos

1. Documentar fuente, licencia, campos permitidos, retención y autorización de análisis antes de consultar o almacenar.
2. Crear un lote por distrito y sublotes por barrio, con límite de peticiones y presupuesto. Separar descubrimiento de análisis de reseñas.
3. Consultar Text Search desde servidor con máscara mínima, idioma español y restricción geográfica apropiada. Priorizar consultas de bravas y realizar una pasada complementaria con `spanish_restaurant`. Recorrer `nextPageToken`; no interpretar el fin de páginas como cobertura exhaustiva ni la aparición en resultados como evidencia suficiente para puntuar.
4. Deduplicar globalmente por Place ID cuando exista; las sucursales distintas permanecen separadas. Vincular a establecimientos existentes y no sobrescribir sus notas manuales.
5. Obtener reseñas solo de una fuente que autorice acceso y creación de notas derivadas. Solicitar detalles una vez por local y ejecución, sin repetirlos por cada consulta que lo descubrió. Procesar el texto en memoria durante el análisis y descartarlo al terminar; no incluirlo en base de datos, ficheros, cachés, colas, logs, trazas ni herramientas de observabilidad. Si se utiliza un proveedor de IA, comprobar también sus condiciones de retención, registro y entrenamiento: procesar en memoria en Bravómetro no garantiza que el proveedor no lo conserve.
6. Detectar referencias explícitas al plato: «bravas», «patatas bravas» y variantes inequívocas. Resolver negaciones y excluir menciones a nombres de locales, «no las probé» o comentarios genéricos del restaurante.
7. Puntuar los diez aspectos usando evidencia directa o indirecta razonable. Revisar una muestra editorial y los casos ambiguos antes de publicar; ante ausencia total de evidencia para un aspecto, aplicar el neutral técnico `5` y registrar que el aspecto no tuvo cobertura.
8. Persistir solo puntuaciones y metadatos permitidos: local, fuente, cantidad de reseñas pertinentes, confianza, fecha, versión y estado del lote. No crear registros de texto o resúmenes en `reviewEvidence`. Deduplicar reseñas dentro de la ejecución en memoria, sin guardar identificadores de reseñas ni hashes como sustitutos del contenido. Guardar idempotencia por lote/local/versión; actualizar la estimación existente al repetir un análisis en vez de sumar la misma muestra como nueva evidencia. Reintentos limitados con espera para 429 y errores temporales.

## Nota automática y nota manual

Propuesta de producto, pendiente de calibración: escala 0–10. Una opinión sobre servicio o ambiente no puntúa las bravas. Las estrellas generales del restaurante se muestran, si procede, como dato independiente y nunca se convierten en nota del plato.

Separar `automaticScore`, `manualScore`, número de valoraciones aprobadas, número de reseñas distintas pertinentes, confianza, fecha y versión de metodología. Los campos son propuestas; este documento no cambia el esquema.

### Puntuaciones con un decimal, sin variación artificial

Sustituir la escala discreta 2/4/5/7/9 por una estimación continua de 0 a 10 basada en la intensidad, claridad y matices de la valoración del plato. Usar la misma rúbrica y versión para todos los locales. No añadir números aleatorios, ruido o diferencias calculadas a partir del nombre o Place ID para hacer más atractivo el ranking. Si la evidencia merece la misma nota, se acepta el empate.

Rúbrica inicial orientativa, pendiente de calibración editorial:

| Valoración explícita de las bravas | Intervalo orientativo |
|---|---|
| Muy mala: defectos graves o rechazo inequívoco | 0,0–2,9 |
| Mala: críticas claras y predominantes | 3,0–4,9 |
| Regular: opinión mixta o aceptable sin entusiasmo | 5,0–6,4 |
| Buena: elogios claros con algún matiz | 6,5–7,9 |
| Muy buena: elogios intensos y específicos | 8,0–9,4 |
| Excepcional: valoración extraordinaria y explícita | 9,5–10,0 |

El intervalo orienta, pero no asigna por sí solo una nota. Valorar los detalles explícitos: patata crujiente o blanda, salsa sabrosa o insípida, equilibrio, temperatura y relación calidad/precio cuando se mencionen. No penalizar atributos ausentes. «Muy picantes» indica intensidad, no calidad necesariamente. Una mera mención del plato sin juicio de calidad no genera puntuación.

Para cada reseña distinta pertinente, obtener puntuaciones continuas y una confianza entre 0 y 1. La confianza mide claridad y especificidad, nunca si el sentimiento es positivo; las críticas negativas claras deben pesar igual que los elogios claros. Para cada aspecto con evidencia se combina `score = suma(nota * confianza) / suma(confianza)`. Si no hay evidencia evaluable o la suma de pesos es cero, el valor técnico es `5`, manteniendo peso cero y la cobertura separada. No contar varias frases de la misma reseña como votos independientes.

Mantener la precisión durante el cálculo y redondear una sola vez al final a un decimal; presentar con formato español: **7,8; 4,9; 2,5; 7,3**. Estos números son ejemplos de formato, no notas de restaurantes reales ni una distribución que haya que forzar. No exigir que todos los locales tengan notas distintas. El `5` por ausencia de evidencia es un neutral explícito de la metodología 2.0 y debe distinguirse de una puntuación 5 sustentada por opiniones.

Usar configuración estable del modelo y la misma rúbrica; no regenerar notas hasta obtener una distribución más bonita. Una nota decimal sigue siendo una estimación provisional, no una precisión objetiva. Con solo una mención, puede existir una nota decimal, pero su confianza será baja.

Persistir la nota final, las notas de atributos disponibles y los metadatos mínimos autorizados. La justificación textual y el texto de entrada se descartan; una etiqueta fija como «Estimación automática provisional» no debe incorporar paráfrasis de reseñas.

La nota automática basada en una sola mención se etiqueta como confianza baja. La confianza depende de cantidad de reseñas pertinentes, acuerdo, claridad y actualidad; nunca del número total de reseñas del local. Para los aspectos ausentes se usa `5` con peso cero y sin marcar evidencia; no se deducen detalles inexistentes para satisfacer el esquema.

Preferencia: mostrar ambas notas separadas. Si se quiere una nota principal combinada, propuesta inicial:

- Sin notas manuales y con evidencia automática: principal = automática, con etiqueta «Estimación automática provisional».
- Sin evidencia automática ni manual: «Sin valoración», fuera del ranking puntuado.
- Con ambas: `pesoAutomatico = 1 / (1 + 4 * n)` y `principal = pesoAutomatico * automaticScore + (1 - pesoAutomatico) * manualScore`, donde `n` es el número de valoraciones manuales aprobadas e independientes y `manualScore` su media. Con una manual: 20% automática, 80% manual; con cinco: aproximadamente 4,8% automática.
- Solo manuales: principal = manualScore. Moderar y limitar votos por persona/local; no mezclar pendientes o rechazados.

Mostrar cantidad de votos, confianza y procedencia; una estimación sin votos manuales no se presenta como consenso de la comunidad. Revisar fórmula y sesgos tras el piloto.

## Cola de distritos

El orden de los tres primeros responde a la prioridad solicitada; el resto sigue el código municipal para facilitar seguimiento.

| Prioridad | Código | Distrito | Estado |
|---|---|---|---|
| 1 | 18 | Villa de Vallecas; comenzar por Ensanche de Vallecas | Pendiente |
| 2 | 16 | Hortaleza | Pendiente |
| 3 | 01 | Centro | Pendiente |
| 4 | 02 | Arganzuela | Pendiente |
| 5 | 03 | Retiro | Pendiente |
| 6 | 04 | Salamanca | Pendiente |
| 7 | 05 | Chamartín | Pendiente |
| 8 | 06 | Tetuán | Pendiente |
| 9 | 07 | Chamberí | Pendiente |
| 10 | 08 | Fuencarral-El Pardo | Pendiente |
| 11 | 09 | Moncloa-Aravaca | Pendiente |
| 12 | 10 | Latina | Pendiente |
| 13 | 11 | Carabanchel | Pendiente |
| 14 | 12 | Usera | Pendiente |
| 15 | 13 | Puente de Vallecas | Pendiente |
| 16 | 14 | Moratalaz | Pendiente |
| 17 | 15 | Ciudad Lineal | Pendiente |
| 18 | 17 | Villaverde | Pendiente |
| 19 | 19 | Vicálvaro | Pendiente |
| 20 | 20 | San Blas-Canillejas | Pendiente |
| 21 | 21 | Barajas | Pendiente |

## Seguimiento y criterios del piloto

Por lote registrar estado, barrio, consultas previstas/completadas, candidatos únicos, duplicados, pertenencia confirmada, locales con evidencia, locales sin evidencia, errores, peticiones y coste estimado/real. No guardar respuestas completas en logs.

Primer paso: resolver permisos y proveedor de reseñas; después un piloto pequeño de Ensanche de Vallecas. Comprobar que reejecutarlo no duplica datos, que cada puntuación tiene evidencia específica autorizada y que la nota manual prevalece. Completar Villa de Vallecas antes de Hortaleza; pasar a Centro tras revisar coste y calidad. No fijar un coste sin volumen y SKU: los campos solicitados afectan al precio y reseñas suelen requerir un nivel más caro.

El proyecto dispone de `places`, `dishRatings`, `reviewEvidence`, `reviewSources`, `userRatings` y `automaticRatings`. No reutilizar extractos, resúmenes o destacados para conservar contenido de reseñas. `automaticRatings` guarda los diez valores, número de evidencias, cobertura, neutrales, confianza, fecha y versión metodológica; no guarda textos. Las notas editoriales y medias aprobadas de la comunidad conservan prioridad. Mantener las valoraciones manuales pendientes fuera del ranking.

## Fuentes verificadas

- [Tipos de Places, incluido spanish_restaurant](https://developers.google.com/maps/documentation/places/web-service/place-types).
- [Text Search: paginación, máscaras y límites](https://developers.google.com/maps/documentation/places/web-service/text-search).
- [Recurso Place: máximo de cinco reseñas](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places).
- [Políticas de almacenamiento, atribución y condiciones EEE](https://developers.google.com/maps/documentation/places/web-service/policies).
- [Condiciones generales, sección 3.2.3](https://cloud.google.com/maps-platform/terms); comprobar contrato y condiciones EEE aplicables antes de ejecutar.
- [Cartografía municipal por distritos](https://datos.madrid.es/dataset/213565-0-cartografia-distritos-1-1000/downloads).

Este documento define el plan; no acredita haber leído reseñas ni haber completado ningún distrito.
