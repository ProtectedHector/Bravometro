# Google Places

La búsqueda por nombre usa **Text Search (New)** y “Cerca de mí” usa **Nearby Search (New)**, siempre desde el servidor. La ubicación del navegador se utiliza en memoria para centrar y ordenar resultados cercanos; no se persiste. El `X-Goog-FieldMask` limita la respuesta a:

- `places.id`
- `places.displayName`
- `places.formattedAddress`
- `places.location`

Al enviar una valoración, el servidor consulta de nuevo Place Details (New) usando el Google Place ID. Si el establecimiento todavía no existe, se crea dentro de la misma mutación de Convex que guarda la valoración. El usuario no atraviesa un alta separada. Ciudad, país y barrio se obtienen de los componentes de dirección; el slug se genera de forma única.

Los resultados se muestran sobre Google Maps con marcadores interactivos. El establecimiento queda disponible para recibir valoraciones inmediatamente, pero no entra en el ranking hasta tener una valoración aprobada. No se copian reseñas ni fotografías.

## Configuración

1. Habilita Places API (New), Maps JavaScript API y facturación en Google Cloud.
2. Crea una clave exclusiva para el servidor, restringida a Places API (New), y defínela como `GOOGLE_MAPS_API_KEY`.
3. Crea una segunda clave para el navegador, restringida por sitios web y exclusivamente a Maps JavaScript API, y defínela como `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`.
4. Crea un Map ID para Advanced Markers y defínelo como `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`. `DEMO_MAP_ID` solo sirve para desarrollo.
5. Añade los dominios de producción y `http://localhost:*/*` a las restricciones web de la clave pública durante el desarrollo.

Los desarrolladores con dirección de facturación en el EEE deben revisar las condiciones específicas vigentes de Google Maps Platform.

Documentación oficial: https://developers.google.com/maps/documentation/places/web-service/text-search, https://developers.google.com/maps/documentation/places/web-service/nearby-search y https://developers.google.com/maps/documentation/javascript/advanced-markers/start
