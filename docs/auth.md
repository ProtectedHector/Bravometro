# Autenticación social

Bravómetro utiliza Clerk para no almacenar contraseñas. Google es el proveedor principal y la opción natural para usuarios Android. Apple permite entrar con Apple ID. Facebook y X/Twitter v2 también están soportados y pueden activarse desde **SSO connections**. Instagram no se ofrece porque no es un proveedor estándar soportado para este flujo; no se muestra un botón que no pueda funcionar.

## Configuración

1. Crea una aplicación en Clerk.
2. Deshabilita métodos de contraseña/email si quieres un producto exclusivamente social.
3. Habilita Google. En desarrollo Clerk ofrece configuración compartida; producción requiere credenciales OAuth propias.
4. Habilita Apple. En producción necesitas Apple Developer, Team ID, Services ID, Key ID y clave privada.
5. Opcionalmente habilita Facebook y X/Twitter v2.
6. Copia `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY`.
7. Configura los dominios/redirecciones de producción y Apple Private Email Relay si vas a enviar correo.

La búsqueda pública de Google Places no requiere sesión; publicar una valoración sí. Cuando una persona autenticada visita la aplicación, `/api/users/sync` crea o actualiza su perfil mínimo en la tabla `users` de Convex. Las valoraciones quedan relacionadas mediante `userRef` y se consultan en `/{locale}/mis-valoraciones`. Convex recibe el ID estable de Clerk, nombre, email e imagen; no recibe contraseñas ni tokens OAuth del proveedor.

Documentación oficial:

- Proveedores sociales: https://clerk.com/docs/guides/configure/auth-strategies/social-connections/overview
- Apple web: https://clerk.com/docs/guides/configure/auth-strategies/social-connections/apple
- Google nativo iOS/Android: https://clerk.com/docs/expo/guides/configure/auth-strategies/sign-in-with-google
- Apple nativo iOS: https://clerk.com/docs/expo/guides/configure/auth-strategies/sign-in-with-apple
