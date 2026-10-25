#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname, resolve } from 'node:path';
import { lint, fix, rules } from '../src/index.js';
import { formatters, c } from '../src/format.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const HELP = `
${c.bold('slopfix')} ${pkg.version}  Find and fix AI writing tells in your docs, posts and READMEs.

${c.bold('Usage')}
  slopfix [files or folders...] [options]
  cat post.md | slopfix [options]

${c.bold('Options')}
  --fix                  Rewrite files with every safe fix (stdin: print the fixed text)
  --lang <code>          en, fr, auto (default) or all
  --format <name>        pretty (default), compact, json, github
  --max-score <n>        Only fail when a file's slop score is above n (0 to 100)
  --quiet                Hide info level tells
  --dash <text>          What replaces an em dash with --fix (default ", ")
  --ext <list>           Extensions to scan in folders (default md,mdx,markdown,txt)
  --plain                Treat input as plain text, not Markdown
  --config <path>        Config file (default .slopfixrc.json if present)
  --list-rules           Print every rule and exit
  -v, --version          Print the version
  -h, --help             Print this help

${c.bold('Examples')}
  npx slopfix README.md
  npx slopfix docs --fix
  npx slopfix . --max-score 20 --format github
  pbpaste | npx slopfix --fix | pbcopy

${c.bold('Exit codes')}
  0 no errors or warnings (or every file under --max-score), 1 tells found, 2 usage error
`;

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'vendor', 'coverage', '.next', '.nuxt', '.cache', '.venv', 'venv']);

function parseArgs(argv) {
  const args = { files: [], fix: false, format: 'pretty', quiet: false, listRules: false, plain: false };
  const takesValue = new Set(['--lang', '--format', '--max-score', '--dash', '--ext', '--config']);
  for (let i = 0; i < argv.length; i++) {
    let a = argv[i];
    let value;
    if (a.startsWith('--') && a.includes('=')) [a, value] = [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)];
    if (takesValue.has(a) && value === undefined) {
      value = argv[++i];
      if (value === undefined) throw new Error(`${a} needs a value`);
    }
    switch (a) {
      case '-h':
      case '--help':
        args.help = true;
        break;
      case '-v':
      case '--version':
        args.version = true;
        break;
      case '--fix':
        args.fix = true;
        break;
      case '--quiet':
        args.quiet = true;
        break;
      case '--plain':
        args.plain = true;
        break;
      case '--list-rules':
        args.listRules = true;
        break;
      case '--lang':
        args.lang = value;
        break;
      case '--format':
        if (!formatters[value]) throw new Error(`Unknown format "${value}". Use ${Object.keys(formatters).join(', ')}.`);
        args.format = value;
        break;
      case '--max-score':
        args.maxScore = Number(value);
        if (!Number.isFinite(args.maxScore)) throw new Error('--max-score needs a number');
        break;
      case '--dash':
        args.dash = value;
        break;
      case '--ext':
        args.ext = value.split(',').map((e) => e.trim().replace(/^\./, ''));
        break;
      case '--config':
        args.config = value;
        break;
      default:
        if (a.startsWith('-') && a !== '-') throw new Error(`Unknown option ${a}`);
        args.files.push(a);
    }
  }
  return args;
}

function loadConfig(path) {
  const file = path || ['.slopfixrc.json', '.slopfixrc'].find((f) => existsSync(f));
  if (file) {
    try {
      return JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      throw new Error(`Could not read config ${file}: ${e.message}`);
    }
  }
  if (existsSync('package.json')) {
    try {
      return JSON.parse(readFileSync('package.json', 'utf8')).slopfix || {};
    } catch {
      return {};
    }
  }
  return {};
}

function globToRegex(glob) {
  const re = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\/?/g, '\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/\u0000/g, '.*');
  return new RegExp(`(^|/)${re}($|/)`);
}

function collect(paths, extensions, ignore) {
  const files = [];
  const isIgnored = (p) => ignore.some((re) => re.test(p.split('\\').join('/')));
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      if (IGNORED_DIRS.has(name)) continue;
      const full = join(dir, name);
      const rel = relative(process.cwd(), full);
      if (isIgnored(rel)) continue;
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (extensions.includes(extname(name).slice(1).toLowerCase())) files.push(full);
    }
  };
  for (const p of paths) {
    if (!existsSync(p)) throw new Error(`No such file or folder: ${p}`);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
  return files;
}

function readStdin() {
  return readFileSync(0, 'utf8');
}

function listRules() {
  const rows = rules.map((r) => `${r.id.padEnd(26)} ${r.lang.padEnd(3)} ${r.severity.padEnd(8)} ${r.message}`);
  return [`${'RULE'.padEnd(26)} ${'LANG'.padEnd(3)} SEVERITY ${'DESCRIPTION'}`, ...rows].join('\n');
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(c.red(`slopfix: ${e.message}`));
    return 2;
  }
  if (args.help) return console.log(HELP), 0;
  if (args.version) return console.log(pkg.version), 0;
  if (args.listRules) return console.log(listRules()), 0;

  const config = loadConfig(args.config);
  const options = {
    lang: args.lang || config.lang || 'auto',
    rules: config.rules || {},
    ban: config.ban || [],
    dashReplacement: args.dash ?? config.dashReplacement ?? ', ',
    markdown: !args.plain && config.markdown !== false,
  };
  const maxScore = args.maxScore ?? config.maxScore;
  const extensions = args.ext || config.extensions || ['md', 'mdx', 'markdown', 'txt'];
  const ignore = (config.ignore || []).map(globToRegex);

  const fromStdin = args.files.length === 0 || (args.files.length === 1 && args.files[0] === '-');
  if (fromStdin && process.stdin.isTTY) {
    console.log(HELP);
    return 2;
  }

  const results = [];
  try {
    if (fromStdin) {
      const text = readStdin();
      if (args.fix) {
        process.stdout.write(fix(text, options).output);
        return 0;
      }
      results.push({ file: '<stdin>', ...lint(text, options) });
    } else {
      for (const file of collect(args.files, extensions, ignore)) {
        const text = readFileSync(file, 'utf8');
        const name = relative(process.cwd(), resolve(file)).split('\\').join('/');
        if (args.fix) {
          const { output, fixed, result } = fix(text, options);
          if (fixed > 0 && output !== text) writeFileSync(file, output);
          results.push({ file: name, fixed, ...result });
        } else {
          results.push({ file: name, ...lint(text, options) });
        }
      }
    }
  } catch (e) {
    console.error(c.red(`slopfix: ${e.message}`));
    return 2;
  }

  const shown = args.quiet ? results.map((r) => ({ ...r, issues: r.issues.filter((i) => i.severity !== 'info') })) : results;
  const output = formatters[args.format](shown);
  if (output) console.log(output);
  if (args.fix && args.format === 'pretty') {
    const total = results.reduce((n, r) => n + (r.fixed || 0), 0);
    console.log(c.green(`\u2714 Fixed ${total} tells in ${results.filter((r) => r.fixed).length} files.`));
  }

  const failed = results.some((r) =>
    maxScore !== undefined ? r.score > maxScore : r.issues.some((i) => i.severity === 'error' || i.severity === 'warning'),
  );
  return failed ? 1 : 0;
}

process.exitCode = main();
