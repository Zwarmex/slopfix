// Hides the parts of a document that are not prose (code, URLs, HTML, front matter, disabled regions)
// by replacing them with spaces. Offsets stay identical, so issues map back to the original text.

const DISABLE = /<!--\s*slopfix-disable\s*-->/g;
const ENABLE = /<!--\s*slopfix-enable\s*-->/g;
const DISABLE_NEXT_LINE = /<!--\s*slopfix-disable-next-line\s*-->/g;

function blank(chars, start, end) {
  for (let i = start; i < end && i < chars.length; i++) {
    if (chars[i] !== '\n') chars[i] = ' ';
  }
}

function blankAll(chars, text, re, group = 0) {
  for (const m of text.matchAll(re)) {
    const start = group ? m.index + m[0].indexOf(m[group]) : m.index;
    const len = group ? m[group].length : m[0].length;
    blank(chars, start, start + len);
  }
}

export function disabledRanges(text) {
  const ranges = [];
  for (const m of text.matchAll(DISABLE)) {
    ENABLE.lastIndex = m.index;
    const end = ENABLE.exec(text);
    ranges.push([m.index, end ? end.index + end[0].length : text.length]);
  }
  for (const m of text.matchAll(DISABLE_NEXT_LINE)) {
    const lineEnd = text.indexOf('\n', m.index);
    if (lineEnd === -1) continue;
    const nextEnd = text.indexOf('\n', lineEnd + 1);
    ranges.push([m.index, nextEnd === -1 ? text.length : nextEnd]);
  }
  return ranges;
}

export function mask(text, { markdown = true } = {}) {
  const chars = text.split('');

  for (const [start, end] of disabledRanges(text)) blank(chars, start, end);

  if (markdown) {
    // Front matter
    const fm = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(text);
    if (fm) blank(chars, 0, fm[0].length);
    // Fenced code blocks (``` or ~~~), unterminated fences run to the end
    blankAll(chars, text, /^([ \t]*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^\1?\2[ \t]*$|(?![\s\S]))/gm);
    // Inline code, never across a blank line
    blankAll(chars, text, /(`+)(?:(?!\1)(?!\n[ \t]*\n)[\s\S])+?\1/g);
    // HTML comments and tags
    blankAll(chars, text, /<!--[\s\S]*?-->/g);
    blankAll(chars, text, /<\/?[a-zA-Z][^>\n]*>/g);
    // Link and image destinations: keep the label, hide the URL
    blankAll(chars, text, /\]\(([^)\s]+(?:\s+"[^"]*")?)\)/g, 1);
    // Reference-style link definitions
    blankAll(chars, text, /^[ \t]*\[[^\]]+\]:[ \t]*\S+.*$/gm);
  }

  // Bare URLs and emails in any format
  blankAll(chars, text, /\bhttps?:\/\/[^\s<>()]+/g);
  blankAll(chars, text, /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g);

  return chars.join('');
}
