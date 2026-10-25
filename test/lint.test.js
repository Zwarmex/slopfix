import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lint, fix, detectLanguage, rules } from '../src/index.js';

const D = '\u2014';
const ids = (text, options) => lint(text, options).issues.map((i) => i.ruleId);

test('detects the language', () => {
  assert.equal(detectLanguage('The quick brown fox jumps over the lazy dog and it is fine.'), 'en');
  assert.equal(detectLanguage("Le renard est dans la forêt et il ne voit pas les chasseurs."), 'fr');
});

test('every rule has the required fields and a unique id', () => {
  const seen = new Set();
  for (const r of rules) {
    assert.ok(r.id && r.lang && r.category && r.message && typeof r.find === 'function', r.id);
    assert.ok(['error', 'warning', 'info'].includes(r.severity), r.id);
    assert.ok(!seen.has(r.id), `duplicate id ${r.id}`);
    seen.add(r.id);
  }
});

test('flags and fixes em dashes between clauses', () => {
  const text = `Our API ${D} fast and simple ${D} is ready.`;
  assert.deepEqual(ids(text), ['em-dash', 'em-dash']);
  assert.equal(fix(text).output, 'Our API, fast and simple, is ready.');
});

test('em dash replacement is configurable', () => {
  assert.equal(fix(`One${D}two`, { dashReplacement: ' - ' }).output, 'One - two');
});

test('does not autofix a dash that starts a line (dialogue, lists)', () => {
  const r = lint(`${D} Hello, she said.`);
  assert.equal(r.issues[0].ruleId, 'em-dash');
  assert.equal(r.issues[0].fix, undefined);
});

test('ignores code blocks, inline code, URLs and HTML comments', () => {
  const text = [
    'Plain text here.',
    '```',
    `const a = 1 ${D} 2; // delve`,
    '```',
    `Use \`a ${D} b\` and https://example.com/delve${D}x`,
    '<!-- delve -->',
  ].join('\n');
  assert.deepEqual(ids(text), []);
});

test('respects disable comments', () => {
  const text = `<!-- slopfix-disable -->\nWe delve ${D} deeply.\n<!-- slopfix-enable -->\nWe delve.`;
  const r = lint(text);
  assert.equal(r.issues.length, 1);
  assert.equal(r.issues[0].line, 4);

  const next = `<!-- slopfix-disable-next-line -->\nWe delve.\nWe delve.`;
  assert.equal(lint(next).issues.length, 1);
});

test('english: drops filler openers and re-capitalizes', () => {
  assert.equal(fix("It's important to note that the cache is cold.").output, 'The cache is cold.');
  assert.equal(fix('In conclusion, ship it.').output, 'Ship it.');
});

test('english: replaces overused vocabulary and keeps case', () => {
  assert.equal(fix('Delve into the logs, then utilize the cache.').output, 'Dig into the logs, then use the cache.');
});

test('english: removes chatbot openers and sign-offs', () => {
  assert.equal(fix('Certainly! The answer is 4. I hope this helps!').output, 'The answer is 4.');
  assert.equal(fix('Done. Let me know if you have any other questions.').output, 'Done.');
});

test("english: catches \"it's not X, it's Y\"", () => {
  assert.ok(ids("This isn't a bug, it's a feature.").includes('en/not-x-but-y'));
  assert.ok(ids('Slopfix is not just a linter. It is a habit.').includes('en/not-x-but-y'));
  assert.ok(!ids('It is not ready yet.').includes('en/not-x-but-y'));
});

test('english: does not flag substrings of other words', () => {
  assert.deepEqual(ids('The delvers utilized nothing.', { rules: { 'en/ai-vocabulary': 'warning' } }).filter((i) => i === 'en/ai-vocabulary').length, 1);
  assert.deepEqual(ids('Sharpen the delveable thing.'), []);
});

test('french: catches tells and fixes them', () => {
  const text = "Il est important de noter que cet outil s'avère être rapide. J'espère que cela vous aide !";
  const r = lint(text);
  assert.equal(r.language, 'fr');
  assert.ok(r.issues.some((i) => i.ruleId === 'fr/filler-opener'));
  assert.equal(fix(text).output, 'Cet outil est rapide.');
});

test("french: catches \"ce n'est pas X, c'est Y\"", () => {
  assert.ok(ids("Ce n'est pas un outil, c'est une philosophie.").includes('fr/not-x-but-y'));
  assert.ok(ids("Il ne s'agit pas seulement de vitesse, mais de confiance.").includes('fr/not-x-but-y'));
});

test('french rules do not run on english text unless lang is all', () => {
  assert.ok(!ids('This is incontournable.').includes('fr/ai-vocabulary'));
  assert.ok(ids('This is incontournable.', { lang: 'all' }).includes('fr/ai-vocabulary'));
});

test('rules can be turned off or re-leveled', () => {
  assert.deepEqual(ids(`A ${D} b`, { rules: { 'em-dash': 'off' } }), []);
  assert.equal(lint(`A ${D} b`, { rules: { 'em-dash': 'error' } }).issues[0].severity, 'error');
});

test('custom banned phrases', () => {
  const r = lint('Our blazingly fast synergy.', { ban: ['synergy', { phrase: 'blazingly fast', replacement: 'fast' }] });
  assert.deepEqual(r.issues.map((i) => i.ruleId), ['custom/ban', 'custom/ban']);
  assert.equal(fix('Our blazingly fast app.', { ban: [{ phrase: 'blazingly fast', replacement: 'fast' }] }).output, 'Our fast app.');
});

test('emoji bullets are removed, bold label lists are reported', () => {
  const text = '- \u{1F680} **Speed:** a\n- \u{1F512} **Safety:** b\n- \u{1F4A1} **Ideas:** c\n';
  const r = lint(text);
  assert.equal(r.issues.filter((i) => i.ruleId === 'emoji-bullet').length, 3);
  assert.equal(r.issues.filter((i) => i.ruleId === 'bold-label-list').length, 1);
  assert.equal(fix(text).output, '- **Speed:** a\n- **Safety:** b\n- **Ideas:** c\n');
});

test('positions are 1-based line and column', () => {
  const r = lint(`Line one.\nThen ${D} two.`);
  assert.equal(r.issues[0].line, 2);
  assert.equal(r.issues[0].column, 5);
});

test('score is 0 for clean text and high for slop', () => {
  assert.equal(lint('We shipped the release on Tuesday. Two bugs remain and we fix them next week.').score, 0);
  const slop = `Certainly! It's important to note that we delve ${D} meticulously ${D} into a rich tapestry. I hope this helps!`;
  assert.ok(lint(slop).score >= 60);
});

test('fix is idempotent', () => {
  const once = fix(`It's worth noting that we delve ${D} a lot.`).output;
  assert.equal(fix(once).output, once);
});
