---
name: consultar-wiki
description: Cómo encontrar conocimiento del proyecto (scope, arquitectura, convenciones, dónde está cada cosa, comandos) en su wiki. Úsala antes de proponer, diseñar, implementar o revisar.
---

# Consultar la wiki del proyecto

La wiki de este proyecto está en `{{WIKI_PATH}}/` y cumple el contrato de wiki del kit.

## Cómo navegar
1. Lee siempre primero `{{WIKI_PATH}}/index.md`. Es el mapa: tiene una sección por cada tema obligatorio con enlaces a sus páginas.
2. Abre solo las páginas que necesites para la tarea. No cargues la wiki entera.
3. Sigue enlaces entre páginas si la que lees remite a otra.

## Qué buscar en cada sección del index
| Necesitas... | Sección |
|---|---|
| Saber si algo entra en el proyecto | Scope |
| Capas, módulos, patrones | Arquitectura |
| Estilo, nombres, prácticas obligatorias | Convenciones |
| Dónde vive cada cosa en el repo | Mapa del código |
| Pasos para una funcionalidad nueva | Cómo añadir una funcionalidad |
| Build, tests, lint, ejecutar en local | Comandos |
| Qué se prueba y cómo | Testing |

## Reglas
- La wiki manda sobre las skills de stack y sobre tus conocimientos generales.
- Si la wiki y el código se contradicen, confía en el código, dilo en tu respuesta y propón corregir la wiki (skill `actualizar-wiki`).
- Cita las páginas consultadas (ruta relativa) en los artefactos que generes.
- Si falta información, no la inventes: pregunta o déjalo como duda abierta.
