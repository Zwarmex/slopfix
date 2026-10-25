import common from './rules/common.js';
import en from './rules/en.js';
import fr from './rules/fr.js';
import { phraseRule } from './rules/helpers.js';
import { mask } from './mask.js';

export { mask } from './mask.js';

export const rules = [...common, ...en, ...fr];
export const languages = ['en', 'fr'];
export const weights = { error: 5, warning: 2, info: 1 };

const SEVERITIES = new Set(['error', 'warning', 'info']);

const STOPWORDS = {
  en: ['the', 'and', 'is', 'of', 'to', 'in', 'that', 'it', 'for', 'with', 'you', 'are', 'this', 'not', 'be', 'on', 'your', 'can', 'what', 'how'],
  fr: ['le', 'la', 'les', 'des', 'est', 'et', 'une', 'un', 'du', 'que', 'pour', 'dans', 'pas', 'vous', 'nous', 'avec', 'sur', 'qui', 'au', 'ce'],
};

export const defaults = {
  lang: 'auto',
  rules: {},
  ban: [],
  dashReplacement: ', ',
  markdown: true,
};

/** Guesses the language of a text from its most common short words. Returns a language code. */
export function detectLanguage(text) {
  const counts = Object.fromEntries(Object.keys(STOPWORDS).map((l) => [l, 0]));
  const sets = Object.fromEntries(Object.entries(STOPWORDS).map(([l, w]) => [l, new Set(w)]));
  for (const word of text.toLowerCase().match(/\p{L}+/gu) || []) {
    for (const l in sets) if (sets[l].has(word)) counts[l]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function normalizeOptions(options = {}) {
  return { ...defaults, ...options, rules: { ...defaults.rules, ...(options.rules || {}) } };
}

function banRule(ban) {
  if (!ban || ban.length === 0) return [];
  const phrases = ban.map((b) => (typeof b === 'string' ? b : b.replacement !== undefined ? [b.phrase, b.replacement] : b.phrase));
  return [
    phraseRule({
      id: 'custom/ban',
      lang: '*',
      category: 'custom',
      severity: 'warning',
      message: 'Banned by your slopfix config.',
      phrases,
    }),
  ];
}

function activeRules(options, language) {
  const out = [];
  for (const rule of [...rules, ...banRule(options.ban)]) {
    if (rule.lang !== '*' && options.lang !== 'all' && rule.lang !== language) continue;
    const setting = options.rules[rule.id];
    if (setting === 'off' || setting === false) continue;
    out.push(SEVERITIES.has(setting) ? { ...rule, severity: setting } : rule);
  }
  return out;
}

function lineIndex(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  return (offset) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return { line: lo + 1, column: offset - starts[lo] + 1 };
  };
}

/** Converts weighted hits into a 0 to 100 score, where 0 is clean and 100 is pure slop. */
export function computeScore(issues, words) {
  const weighted = issues.reduce((sum, i) => sum + weights[i.severity], 0);
  const per100 = (weighted / Math.max(words, 50)) * 100;
  // Saturating curve: one em dash per 100 words is about 12, a typical chatbot answer lands between 30 and 60.
  return Math.round(100 * (1 - Math.exp(-per100 / 15)));
}

export function scoreLabel(score) {
  if (score < 10) return 'clean';
  if (score < 30) return 'a few tells';
  if (score < 60) return 'sloppy';
  return 'pure slop';
}

/**
 * Finds AI writing tells in a text.
 * @returns {{ language: string, words: number, score: number, label: string, issues: object[] }}
 */
export function lint(text, options) {
  const opts = normalizeOptions(options);
  const masked = mask(text, { markdown: opts.markdown });
  const language = opts.lang === 'auto' || opts.lang === 'all' ? detectLanguage(masked) : opts.lang;
  const ctx = { options: opts, language };
  const position = lineIndex(text);
  const issues = [];

  for (const rule of activeRules(opts, language)) {
    for (const hit of rule.find(masked, ctx)) {
      const start = position(hit.index);
      const end = position(hit.index + hit.length);
      issues.push({
        ruleId: rule.id,
        category: rule.category,
        severity: rule.severity,
        message: hit.message || rule.message,
        quote: hit.quote ?? text.slice(hit.index, hit.index + hit.length),
        index: hit.index,
        length: hit.length,
        line: start.line,
        column: start.column,
        endLine: end.line,
        endColumn: end.column,
        fix:
          hit.fix === undefined || hit.fix === null
            ? undefined
            : { range: [hit.index, hit.index + hit.length], text: hit.fix, label: hit.fixLabel ?? (hit.fix === '' ? '(remove)' : undefined) },
      });
    }
  }

  // Longest span first at each position, then drop tells that sit entirely inside another one
  // ("crucial" inside "plays a crucial role" is one tell, not two).
  issues.sort((a, b) => a.index - b.index || b.length - a.length || a.ruleId.localeCompare(b.ruleId));
  const kept = [];
  for (const issue of issues) {
    const outer = kept.find((k) => issue.index >= k.index && issue.index + issue.length <= k.index + k.length);
    if (!outer) kept.push(issue);
  }
  issues.length = 0;
  issues.push(...kept);
  const words = (masked.match(/\p{L}+/gu) || []).length;
  const score = computeScore(issues, words);
  return { language, words, score, label: scoreLabel(score), issues };
}

function applyFixes(text, issues) {
  const fixes = issues
    .filter((i) => i.fix)
    .map((i) => i.fix)
    .sort((a, b) => a.range[0] - b.range[0]);
  const kept = [];
  let lastEnd = -1;
  for (const f of fixes) {
    if (f.range[0] < lastEnd) continue;
    kept.push(f);
    lastEnd = f.range[1];
  }
  let out = text;
  for (const f of kept.reverse()) out = out.slice(0, f.range[0]) + f.text + out.slice(f.range[1]);
  return { output: out, applied: kept.length };
}

/**
 * Applies every safe autofix. Runs a few passes because one fix can reveal another.
 * @returns {{ output: string, fixed: number, result: ReturnType<typeof lint> }}
 */
export function fix(text, options) {
  let output = text;
  let fixed = 0;
  for (let pass = 0; pass < 5; pass++) {
    const { output: next, applied } = applyFixes(output, lint(output, options).issues);
    if (applied === 0) break;
    output = next;
    fixed += applied;
  }
  return { output, fixed, result: lint(output, options) };
}

export default { lint, fix, rules, detectLanguage, computeScore, scoreLabel, mask, languages, defaults };
