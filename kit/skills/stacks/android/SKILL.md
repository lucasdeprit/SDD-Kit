---
name: stack-android
description: Buenas prácticas generales de desarrollo Android (Kotlin, Compose/Views, coroutines, tests). Úsala al diseñar, implementar o revisar código Android; la wiki del proyecto prevalece.
---

# Stack Android

> La wiki del proyecto (`{{WIKI_PATH}}`) manda sobre esta skill. Esto es solo el criterio por defecto cuando la wiki no dice nada.

## Código
- Kotlin; respeta `minSdk`, versión de Kotlin y AGP del proyecto antes de usar APIs nuevas.
- Coroutines y Flow con los dispatchers inyectados; nada de `GlobalScope`.
- Sigue el patrón de UI del módulo (Compose o Views) y su arquitectura (MVVM, MVI, Clean); no introduzcas otro.
- Inyección de dependencias con el framework del proyecto (Hilt, Koin...).
- Respeta la modularización existente: no añadas dependencias entre módulos que la arquitectura no permite.

## Seguridad (banca/fintech)
- Secretos en Keystore / EncryptedSharedPreferences, nunca en texto plano ni logs.
- Sin datos personales en logs ni analíticas.
- Respeta pinning, ofuscación (R8) y detección de root existentes.

## Tests
- JUnit + la librería de mocks del proyecto para ViewModels y casos de uso.
- Tests de UI (Compose testing / Espresso) solo si el proyecto ya los tiene.
- Los comandos exactos de Gradle están en la página de Comandos de la wiki.

## Revisión
- Accesibilidad: contentDescription y tamaños táctiles en vistas nuevas.
- Textos nuevos en `strings.xml`, no hardcodeados.
