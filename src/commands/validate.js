import { loadProfile } from '../profile.js';
import { validateWiki } from '../validate.js';
import { applyFixes } from '../fixes.js';

export const validateHelp = `okw validate [--fix] [--strict]

Checks the wiki against OKF v0.2 and the base profile (see SPEC.md section 8).
Exits with code 1 if there is any error (with --strict, any warning too).
  --fix     repair what can be decided mechanically (folders, required pages,
            missing section skeletons, indexes), then validate again
  --strict  treat warnings as failures
  --json    print every issue as { rule, severity, file, message, fix }`;

export function validateCommand({ root, fix = false, strict = false, now = new Date(), version }) {
  const profile = loadProfile(root);
  const fixed = fix ? applyFixes(root, profile, { by: `okw/${version}`, now }) : [];
  const issues = validateWiki(root, profile, { now });
  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.length - errors;
  const ok = errors === 0 && !(strict && warnings > 0);

  const lines = [];
  if (fixed.length) lines.push('Fixed:', ...fixed.map((f) => `  ${f}`), '');
  for (const i of issues) {
    lines.push(`${i.severity.padEnd(7)} ${i.rule}  ${i.file}`, `        ${i.message} ${i.fix}`);
  }
  lines.push(
    issues.length ? '' : null,
    `${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}.${ok ? '' : ' Validation failed.'}`,
  );
  return { ok, errors, warnings, fixed, issues, text: lines.filter((l) => l !== null).join('\n') };
}
