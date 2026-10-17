---
name: stack-ios
description: Buenas prácticas generales de desarrollo iOS (Swift, SwiftUI/UIKit, concurrencia, tests). Úsala al diseñar, implementar o revisar código iOS; la wiki del proyecto prevalece.
---

# Stack iOS

> La wiki del proyecto (`{{WIKI_PATH}}`) manda sobre esta skill. Esto es solo el criterio por defecto cuando la wiki no dice nada.

## Código
- Swift moderno; respeta la versión mínima de iOS y de Swift del proyecto antes de usar APIs nuevas.
- Concurrencia con async/await y actores; UI en `@MainActor`. No mezcles con callbacks nuevos si el módulo ya migró.
- Sigue el patrón de UI del módulo (SwiftUI o UIKit) y su arquitectura (MVVM, TCA, VIPER...); no introduzcas otro.
- Inyección de dependencias por protocolo para poder testear.
- Nada de force unwrap ni `try!` en código de producción salvo que la convención del proyecto lo permita.

## Seguridad (banca/fintech)
- Credenciales y tokens solo en Keychain. Nunca en UserDefaults ni logs.
- Sin datos personales en logs ni analíticas.
- Respeta el pinning, jailbreak detection u ofuscación que ya tenga el proyecto.

## Tests
- XCTest o Swift Testing, según use el proyecto. Tests unitarios para la lógica de ViewModels/Interactors.
- Snapshot o UI tests solo si el proyecto ya los tiene.
- Los comandos exactos (`xcodebuild`, esquemas, destinos) están en la página de Comandos de la wiki.

## Revisión
- Accesibilidad: labels, Dynamic Type y contraste en vistas nuevas.
- Localización: textos nuevos en los ficheros de strings del proyecto, no hardcodeados.
