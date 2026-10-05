# Futura app móvil

Convex, IDs, tablas, `ProductType`, fórmula y permisos de fuente son reutilizables. La futura app React Native/Expo compartirá contratos de dominio y tendrá sus propios componentes. Nunca debe extraer lógica crítica del HTML de Next.js.

La web ya evita hover obligatorio, usa objetivos táctiles amplios, filtros adaptables y geolocalización bajo demanda.

## Identidad móvil

La app Expo reutilizará la misma instancia de Clerk y los mismos IDs de usuario:

- Android: inicio nativo con Google mediante credenciales Android + web.
- iOS: inicio nativo con Apple y, opcionalmente, Google.
- Clerk `<AuthView />` puede mostrar ambos proveedores con UI nativa en SwiftUI/Jetpack Compose.

Será necesario registrar en Clerk el package name Android y el Bundle ID/Team ID de iOS. La autenticación nativa requiere builds de desarrollo/producción; no funciona completamente en Expo Go.
