# Configuración de SerpAPI

La credencial se configura como `SERPAPI_API_KEY` en `.env.local` para desarrollo y en Vercel para producción. No utilizar el prefijo `NEXT_PUBLIC_`, ni incluirla en componentes de cliente, repositorio, URLs públicas o logs.

En Vercel: Settings → Environment Variables → añadir `SERPAPI_API_KEY`, tipo Secret, con la clave de la cuenta SerpAPI. Seleccionar Production y Preview solo si las pruebas deben consumir la misma cuota. Guardar y volver a desplegar. En local, reiniciar el servidor de desarrollo después del cambio.

Esta configuración guarda la credencial; no implementa todavía consultas de SerpAPI, importaciones ni puntuaciones automáticas. No se ha enviado ninguna petición al proveedor para comprobarla ni consumido cuota en esta configuración.

La futura integración debe ser exclusivamente de servidor, tener control de acceso y un límite de consultas. Revisar las condiciones aplicables al análisis y la retención del proveedor antes de activar el plan por distritos. No registrar las reseñas ni la clave en mensajes de error.

La clave no necesita copiarse a Convex mientras las consultas se realicen en Next.js. Si se traslada el análisis a una acción de Convex, habrá que configurar allí la variable privada por separado.
