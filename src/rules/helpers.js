// Small builders so that adding a rule is one line in a list.
// Every rule is { id, lang, category, severity, message, find(text, ctx) }.
// find() yields { index, length, fix?, message? }. fix === undefined or null means "no autofix".

const BEFORE = '(?<![\\p{L}\\p{N}_])';
const AFTER = '(?![\\p{L}\\p{N}_])';

export function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Turns a plain phrase into a tolerant regex source:
// any apostrophe matches ' or the typographic one, any space matches any whitespace run.
export function phraseSource(phrase) {
  return escapeRegex(phrase)
    .replace(/['’]/g, "['’]")
    .replace(/\s+/g, '\\s+');
}

export function isUpper(ch) {
  return !!ch && ch !== ch.toLowerCase() && ch === ch.toUpperCase();
}

export function matchCase(replacement, original) {
  if (!replacement) return replacement;
  if (isUpper(original[0])) return replacement[0].toUpperCase() + replacement.slice(1);
  return replacement;
}

/**
 * A rule built from a list of phrases.
 * Each entry is either "phrase" (report only) or ["phrase", "replacement"].
 * With drop: true, the phrase is removed and the next word is capitalized when the phrase opened a sentence.
 */
export function phraseRule({ id, lang, category, severity, message, phrases, drop = false }) {
  const entries = phrases
    .map((p) => (Array.isArray(p) ? { phrase: p[0], replacement: p[1] } : { phrase: p, replacement: undefined }))
    .sort((a, b) => b.phrase.length - a.phrase.length);

  const lookup = new Map(entries.map((e) => [normalize(e.phrase), e]));
  const body = entries.map((e) => phraseSource(e.phrase)).join('|');
  // In drop mode we also eat the trailing spaces and capture the next letter so we can re-case it.
  const source = drop ? `${BEFORE}(${body})(?:${AFTER})([ \\t]*)(\\p{L})?` : `${BEFORE}(${body})${AFTER}`;

  return {
    id,
    lang,
    category,
    severity,
    message,
    *find(text) {
      const re = new RegExp(source, 'giu');
      for (const m of text.matchAll(re)) {
        const matched = m[1];
        const entry = lookup.get(normalize(matched));
        if (drop) {
          const next = m[3] || '';
          const opensSentence = isUpper(matched[0]);
          const fixedNext = opensSentence ? next.toUpperCase() : next;
          yield { index: m.index, length: m[0].length, fix: fixedNext, fixLabel: '(remove)', quote: matched };
        } else {
          const fix = entry && entry.replacement !== undefined ? matchCase(entry.replacement, matched) : undefined;
          yield { index: m.index, length: matched.length, fix, quote: matched };
        }
      }
    },
  };
}

/** A rule built from one or more regexes. fix can be a string or a function(match, text) returning a string or null. */
export function regexRule({ id, lang, category, severity, message, patterns, fix }) {
  return {
    id,
    lang,
    category,
    severity,
    message,
    *find(text, ctx) {
      for (const pattern of patterns) {
        const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
        for (const m of text.matchAll(re)) {
          if (m[0].length === 0) continue;
          const f = typeof fix === 'function' ? fix(m, text, ctx) : fix;
          yield { index: m.index, length: m[0].length, fix: f ?? undefined, quote: m[0].trim() };
        }
      }
    },
  };
}

function normalize(s) {
  return s.toLowerCase().replace(/’/g, "'").replace(/\s+/g, ' ');
}
