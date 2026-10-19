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

// Required core pages (SPEC.md section 3). Created by `init`.
export function requiredPages({ by, now }) {
  const stamp = { by, now };
  return [
    {
      path: 'overview/project.md',
      text: [
        renderPage({
          folder: { type: 'Overview', sections: [] },
          title: 'Project',
          description: 'What the project is and who it is for.',
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
          description: 'When and how this wiki is updated.',
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

Keep the wiki faithful to the project with as little manual work as possible. The \`okw\` CLI does the mechanical parts (indexes, log, frontmatter, validation); whoever edits only writes content.

# Steps

1. If a change affects a rule, a pattern or a convention, edit the existing page. Do not create a new page for something that is already documented.
2. If a new page is needed, create it with \`okw new <type> <name> --description "..."\`. It registers the page in the index and in \`log.md\`. Do not edit \`index.md\` or \`log.md\` by hand.
3. Fill in the page sections. Explain the reason in \`# Why\` when the page asks for it.
4. If you change an existing page, record the change with \`okw log "<summary>" --page <path>\`.
5. If something no longer applies, mark its page with \`status: deprecated\` instead of just deleting it.
6. Run \`okw validate\` and fix whatever it reports.
`;
