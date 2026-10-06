# Imágenes de restaurantes sin reseña manual

En la ficha del restaurante, el usuario administrador de Convex `jx72bkvz217bgnwv4g3pvvywh98fq64v` puede subir o cambiar una imagen. No se crea ninguna reseña ni se modifica la puntuación.

El acceso se valida mediante el JWT de Clerk en Convex, igual que el escáner. Requiere la plantilla JWT `convex` de Clerk y `CLERK_JWT_ISSUER_DOMAIN` en Convex. Las comprobaciones de administrador y ausencia de reseñas se repiten al guardar, no solo al mostrar el botón. Una reseña manual de bravas aprobada o pendiente bloquea esta opción; las rechazadas no.

Se aceptan JPG, PNG, WebP y HEIC de hasta 15 MB, convertidos en el navegador a WebP y reducidos a 1600 píxeles de lado máximo. Convex valida formato y tamaño almacenado máximo de 5 MB. La subida va directamente a Convex Storage, sin pasar el archivo por Vercel.

La tabla `placeImages` guarda el archivo asociado al local, administrador creador/modificador y fechas. Al sustituir la imagen se elimina el archivo anterior. En las tarjetas se prioriza la foto de una reseña aprobada; si no existe, se usa la imagen del administrador. Esta imagen también se muestra en la ficha mientras no haya fotos de reseñas.

Publica solo imágenes propias o con permiso de uso. Despliega el nuevo esquema y funciones con `npx convex deploy`, y después reconstruye Vercel. No se necesitan claves ni variables nuevas respecto al escáner.
