---
name: actualizar-wiki
description: Cómo mantener la wiki del proyecto al día tras un cambio que altera arquitectura, convenciones, mapa del código o comandos. Úsala al cerrar un cambio o al detectar que la wiki está desactualizada.
---

# Actualizar la wiki del proyecto

Wiki: `{{WIKI_PATH}}/`

## Cuándo
- Un cambio introduce o retira un módulo, capa o patrón.
- Cambian rutas relevantes del repo, comandos de build/test o convenciones.
- Detectas una contradicción entre wiki y código.

## Cómo
1. Edita la página afectada; no crees páginas nuevas si el contenido cabe en una existente.
2. Si creas una página, enlázala desde la sección correspondiente de `index.md`.
3. Mantén el formato y los metadatos que ya usan las páginas de la wiki (no cambies su estructura).
4. Escribe hechos verificables del proyecto, no opiniones ni tutoriales genéricos.
5. Comprueba el contrato con `python3 {{KIT_PATH}}/scripts/check_wiki.py .`

## Límites
- Nunca borres contenido que no entiendas: márcalo como dudoso y pregúntalo.
- Los cambios en la wiki van en el mismo PR que el código que los motiva.
