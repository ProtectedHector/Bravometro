# Deployment

1. Ejecuta `npx convex dev` y crea el proyecto.
2. Define `BRAVOMETRO_ADMIN_TOKEN` y `BRAVOMETRO_SERVICE_TOKEN` en Convex y localmente.
3. Ejecuta `npx convex deploy`.
4. Sube el repositorio a GitHub e impórtalo en Vercel.
5. Crea una aplicación Clerk, desactiva contraseña y habilita Google y Apple; añade Facebook/X si dispones de sus credenciales.
6. Activa Places API (New) y Maps JavaScript API en Google Cloud. Usa una clave secreta restringida a Places y otra clave pública restringida por dominio a Maps JavaScript API; crea también un Map ID.
7. Configura `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_SITE_URL`, las dos claves de Clerk, `GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`, `BRAVOMETRO_ADMIN_TOKEN` y `BRAVOMETRO_SERVICE_TOKEN`.
8. Despliega y valida `/es`, `/en`, `/es/publicar`, `/sitemap.xml`, `/robots.txt` y `/es/admin`.
9. Asocia el dominio y actualiza `NEXT_PUBLIC_SITE_URL`.

En Vercel Production configura `NEXT_PUBLIC_SITE_URL=https://www.bravometro.com` y vuelve a desplegar después de cambiarla. Nunca uses localhost en ese entorno: las URLs absolutas de Open Graph deben ser accesibles para WhatsApp. El logo PNG se comparte como imagen; el favicon SVG solo afecta al icono de la pestaña. Los metadatos usan el dominio público como respaldo si la variable falta, es inválida o apunta a localhost en producción. WhatsApp puede conservar la vista previa de enlaces ya compartidos; prueba un enlace nuevo añadiendo `?share=2` tras desplegar. Los deployments protegidos de Vercel no son accesibles para bots sin autenticación: comparte el dominio público.

No publiques el token de administración con prefijo `NEXT_PUBLIC_`.
