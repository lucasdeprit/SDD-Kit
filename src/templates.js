import { yamlScalar, isoNow } from './util.js';

const TODO = (section) => `<!-- TODO: ${section} -->`;

export function renderPage({ folder, title, description, by, status = 'draft', now = new Date() }) {
  const at = isoNow(now);
  const front = [
    '---',
    `type: ${yamlScalar(folder.type)}`,
    `title: ${yamlScalar(title)}`,
    `description: ${yamlScalar(description)}`,
    `generated: { by: ${yamlScalar(by)}, at: ${at} }`,
    `status: ${status}`,
    '---',
  ];
  const sections = folder.sections.map((s) => `# ${s}\n\n${TODO(s)}\n`);
  return `${front.join('\n')}\n\n${sections.join('\n')}`;
}

// Páginas obligatorias del núcleo (SPEC.md sección 3). Las crea `init`.
export function requiredPages({ by, now }) {
  const stamp = { by, now };
  return [
    {
      path: 'overview/project.md',
      text: [
        renderPage({
          folder: { type: 'Overview', sections: [] },
          title: 'Project',
          description: 'Qué es el proyecto y para quién.',
          ...stamp,
        }).trimEnd(),
        '',
        `# Purpose\n\n${TODO('Purpose')}\n`,
        `# Scope\n\n${TODO('Scope')}\n`,
      ].join('\n'),
    },
    {
      path: 'workflows/update-wiki.md',
      text: [
        renderPage({
          folder: { type: 'Workflow', sections: [] },
          title: 'Update the wiki',
          description: 'Cuándo y cómo se actualiza esta wiki.',
          ...stamp,
          status: 'stable',
        }).trimEnd(),
        '',
        UPDATE_WIKI_BODY,
      ].join('\n'),
    },
  ];
}

const UPDATE_WIKI_BODY = `# Goal

Mantener la wiki fiel al proyecto con el mínimo trabajo manual. La CLI \`okw\` hace lo mecánico (índices, log, frontmatter, validación); quien edita solo escribe contenido.

# Steps

1. Si un cambio afecta a una regla, un patrón o una convención, edita la página existente. No crees una página nueva para algo que ya está documentado.
2. Si hace falta una página nueva, créala con \`okw new <type> <nombre> --description "..."\`. Registra la página en el índice y en \`log.md\`. No edites \`index.md\` ni \`log.md\` a mano.
3. Rellena las secciones de la página. Explica el motivo en \`# Why\` cuando la página lo pida.
4. Si cambias una página existente, registra el cambio con \`okw log "<resumen>" --page <ruta>\`.
5. Si algo deja de aplicar, marca su página con \`status: deprecated\` en vez de borrarla sin más.
6. Ejecuta \`okw validate\` y corrige lo que señale.
`;
