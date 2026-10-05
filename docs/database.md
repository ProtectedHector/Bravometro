# Modelo de datos Convex

- `users`: perfil mínimo sincronizado desde Clerk (`clerkUserId`, nombre, email, imagen y última actividad). Clerk sigue siendo la fuente de verdad de autenticación y Convex no almacena contraseñas ni tokens OAuth.
- `places`: identidad, dirección, coordenadas, Google Place ID, URL oficial de Maps, origen, autor del alta y fecha de verificación.
- `dishRatings`: valoración por establecimiento y `productType`, con metodología versionada.
- `reviewEvidence`: fuente, permisos de almacenamiento, atributo y dato derivado.
- `reviewSources`: proveedores activables sin acoplarse a uno concreto.
- `userRatings`: valoraciones propias preparadas para moderación, con una referencia opcional `photoStorageId` a Convex File Storage.
- `placeSubmissions`: auditoría de lugares enviados mediante Google Places, con autor y estado; los resultados verificados se registran como publicados directamente.

`userRatings` conserva el ID estable de Clerk por compatibilidad y una relación `userRef` hacia `users`. Los establecimientos y sus envíos también guardan la referencia al usuario que los creó. El índice `by_user_updated` alimenta la sección privada **Mis valoraciones**. Una segunda valoración del mismo usuario actualiza la anterior en lugar de crear duplicados. Los sitios usan el Google Place ID como clave externa. `submitGooglePlaceRating` crea el sitio si falta y guarda la valoración en una sola mutación atómica.

Las fotos JPG, PNG, WebP, HEIC y HEIF se procesan localmente. HEIC/HEIF se decodifican en el navegador, todas las fotos se reducen a un máximo de 1600 px, se convierten a WebP y se suben directamente a Convex mediante una URL temporal. La base de datos conserva el ID de almacenamiento, nunca una copia binaria ni una URL permanente. Las imágenes pendientes se devuelven únicamente en el historial privado; una foto sustituida se elimina del almacenamiento.

Los textos externos solo se guardan cuando `storagePermission = allowed`. Con `derived_only` se conservan únicamente señales derivadas y referencias permitidas.
