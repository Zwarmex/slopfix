export type Severity = 'error' | 'warning' | 'info';
export type Language = 'en' | 'fr';

export interface Options {
  /** 'auto' (default) detects the language, 'all' runs every language's rules. */
  lang?: Language | 'auto' | 'all';
  /** Turn a rule off or change its severity, e.g. { 'em-dash': 'off', 'en/weasel-vocabulary': 'warning' }. */
  rules?: Record<string, Severity | 'off' | false>;
  /** Extra phrases to flag. A replacement makes them fixable. */
  ban?: Array<string | { phrase: string; replacement?: string }>;
  /** What replaces an em dash when fixing. Default ', '. */
  dashReplacement?: string;
  /** Skip code, URLs, HTML and front matter. Default true. */
  markdown?: boolean;
}

export interface Fix {
  range: [number, number];
  text: string;
  label?: string;
}

export interface Issue {
  ruleId: string;
  category: string;
  severity: Severity;
  message: string;
  quote: string;
  index: number;
  length: number;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  fix?: Fix;
}

export interface LintResult {
  language: Language;
  words: number;
  /** 0 is clean, 100 is pure slop. */
  score: number;
  label: 'clean' | 'a few tells' | 'sloppy' | 'pure slop';
  issues: Issue[];
}

export interface FixResult {
  output: string;
  fixed: number;
  result: LintResult;
}

export interface Hit {
  index: number;
  length: number;
  fix?: string | null;
  fixLabel?: string;
  message?: string;
  quote?: string;
}

export interface Rule {
  id: string;
  lang: Language | '*';
  category: string;
  severity: Severity;
  message: string;
  find(text: string, ctx: { options: Required<Options>; language: Language }): Iterable<Hit>;
}

export function lint(text: string, options?: Options): LintResult;
export function fix(text: string, options?: Options): FixResult;
export function detectLanguage(text: string): Language;
export function computeScore(issues: Issue[], words: number): number;
export function scoreLabel(score: number): LintResult['label'];
export function mask(text: string, options?: { markdown?: boolean }): string;
export const rules: Rule[];
export const languages: Language[];
export const weights: Record<Severity, number>;
export const defaults: Required<Options>;

declare const slopfix: {
  lint: typeof lint;
  fix: typeof fix;
  rules: typeof rules;
  detectLanguage: typeof detectLanguage;
  computeScore: typeof computeScore;
  scoreLabel: typeof scoreLabel;
  mask: typeof mask;
  languages: typeof languages;
  defaults: typeof defaults;
};
export default slopfix;
