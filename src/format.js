// Output formats for the CLI: pretty (humans), compact (grep), json (tools), github (Actions annotations).

const useColor = !process.env.NO_COLOR && (process.env.FORCE_COLOR || process.stdout.isTTY);
const paint = (code) => (s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : String(s));
export const c = {
  red: paint(31),
  yellow: paint(33),
  blue: paint(34),
  green: paint(32),
  dim: paint(2),
  bold: paint(1),
  underline: paint(4),
};

const SEVERITY_COLOR = { error: c.red, warning: c.yellow, info: c.blue };

function scoreColor(score) {
  if (score < 10) return c.green;
  if (score < 30) return c.yellow;
  return c.red;
}

function truncate(s, n) {
  const flat = s.replace(/\s+/g, ' ');
  return flat.length > n ? flat.slice(0, n - 1) + '…' : flat;
}

export function pretty(results, { quiet = false } = {}) {
  const out = [];
  const totals = { error: 0, warning: 0, info: 0, fixable: 0 };

  for (const r of results) {
    const issues = r.issues.filter((i) => !quiet || i.severity !== 'info');
    for (const i of r.issues) {
      totals[i.severity]++;
      if (i.fix) totals.fixable++;
    }
    const header = `${c.underline(r.file)}  ${c.dim(`${r.language} · ${r.words} words ·`)} ${scoreColor(r.score)(`slop score ${r.score}/100 (${r.label})`)}`;
    if (issues.length === 0) {
      out.push(header, '');
      continue;
    }
    out.push(header);
    const posWidth = Math.max(...issues.map((i) => `${i.line}:${i.column}`.length));
    for (const i of issues) {
      const pos = `${i.line}:${i.column}`.padEnd(posWidth);
      const sev = SEVERITY_COLOR[i.severity](i.severity.padEnd(7));
      const fixNote = i.fix ? c.green(` → ${i.fix.label || `"${i.fix.text.trim() || i.fix.text}"`}`) : '';
      out.push(`  ${c.dim(pos)}  ${sev}  ${c.bold(truncate(i.quote, 50))}${fixNote}  ${c.dim(i.message)}  ${c.dim(i.ruleId)}`);
    }
    out.push('');
  }

  const problems = totals.error + totals.warning + totals.info;
  if (problems === 0) {
    out.push(c.green('✔ No AI writing tells found.'));
  } else {
    const parts = [`${totals.error} errors`, `${totals.warning} warnings`, `${totals.info} info`];
    let line = `${totals.error ? c.red('✖') : c.yellow('!')} ${problems} tells (${parts.join(', ')})`;
    if (totals.fixable) line += c.dim(` · ${totals.fixable} fixable with --fix`);
    out.push(line);
  }
  return out.join('\n');
}

export function compact(results) {
  const out = [];
  for (const r of results) {
    for (const i of r.issues) out.push(`${r.file}:${i.line}:${i.column}: ${i.severity} ${i.message} "${truncate(i.quote, 60)}" [${i.ruleId}]`);
  }
  return out.join('\n');
}

export function json(results) {
  return JSON.stringify(
    results.map((r) => ({ ...r, issues: r.issues.map(({ index, length, ...rest }) => ({ ...rest, offset: index, length })) })),
    null,
    2,
  );
}

function escapeData(s) {
  return String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

function escapeProperty(s) {
  return escapeData(s).replace(/:/g, '%3A').replace(/,/g, '%2C');
}

const GITHUB_LEVEL = { error: 'error', warning: 'warning', info: 'notice' };

export function github(results) {
  const out = [];
  for (const r of results) {
    for (const i of r.issues) {
      const props = [
        `file=${escapeProperty(r.file)}`,
        `line=${i.line}`,
        `col=${i.column}`,
        `endLine=${i.endLine}`,
        `endColumn=${i.endColumn}`,
        `title=${escapeProperty(`slopfix (${i.ruleId})`)}`,
      ].join(',');
      out.push(`::${GITHUB_LEVEL[i.severity]} ${props}::${escapeData(`"${truncate(i.quote, 60)}" ${i.message}`)}`);
    }
  }
  return out.join('\n');
}

export const formatters = { pretty, compact, json, github };
