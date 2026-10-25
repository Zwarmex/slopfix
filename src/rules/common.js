import { regexRule } from './helpers.js';

// Rules that apply to every language.

const EM_DASH = '\u2014';
const EN_DASH = '\u2013';

function lineBefore(text, index) {
  const start = text.lastIndexOf('\n', index - 1) + 1;
  return text.slice(start, index);
}

function lineAfter(text, index) {
  const end = text.indexOf('\n', index);
  return text.slice(index, end === -1 ? text.length : end);
}

export default [
  regexRule({
    id: 'em-dash',
    lang: '*',
    category: 'punctuation',
    severity: 'warning',
    message: 'Em dash. The most recognizable AI writing tell.',
    patterns: [new RegExp(`[ \\t]*${EM_DASH}[ \\t]*`, 'g')],
    fix(m, text, ctx) {
      // Leave dialogue dashes and list markers at the start of a line alone, and trailing dashes too.
      if (lineBefore(text, m.index).trim() === '') return null;
      if (lineAfter(text, m.index + m[0].length).trim() === '') return null;
      return ctx.options.dashReplacement;
    },
  }),
  regexRule({
    id: 'spaced-en-dash',
    lang: '*',
    category: 'punctuation',
    severity: 'warning',
    message: 'Spaced en dash used as an em dash.',
    // Only " - " style usage with the en dash. Ranges like 2020-2024 written with an en dash are fine.
    patterns: [new RegExp(`(?<=\\S)[ \\t]+${EN_DASH}[ \\t]+(?=\\S)`, 'g')],
    fix(m, text, ctx) {
      if (lineBefore(text, m.index).trim() === '') return null;
      return ctx.options.dashReplacement;
    },
  }),
  regexRule({
    id: 'emoji-bullet',
    lang: '*',
    category: 'formatting',
    severity: 'warning',
    message: 'Emoji used as a bullet or heading decoration.',
    patterns: [/(?<=^[ \t]*(?:[-*+][ \t]+|\d+[.)][ \t]+|#{1,6}[ \t]+)?)\p{Extended_Pictographic}️?[ \t]*/gmu],
    fix(m, text) {
      // Only autofix when the emoji sits right after a list marker or heading marker.
      const before = lineBefore(text, m.index);
      return /^[ \t]*(?:[-*+]|\d+[.)]|#{1,6})[ \t]+$/.test(before) ? '' : null;
    },
  }),
  {
    id: 'bold-label-list',
    lang: '*',
    category: 'formatting',
    severity: 'info',
    message: 'Three or more list items in a row that start with a **Bold label:**. Classic chatbot formatting.',
    *find(text) {
      const lines = text.split('\n');
      const re = /^([ \t]*(?:[-*+]|\d+[.)])[ \t]+(?:\p{Extended_Pictographic}️?[ \t]*)?)(\*\*[^*\n]{1,60}?\*\*)/u;
      let offset = 0;
      let runLength = 0;
      let first = null;
      for (let i = 0; i <= lines.length; i++) {
        const line = lines[i];
        const m = line === undefined ? null : re.exec(line);
        if (m) {
          // Point at the bold label of the first item only, so other rules on that line still report.
          if (runLength === 0) first = { index: offset + m[1].length, length: m[2].length, quote: m[2] };
          runLength++;
        } else {
          if (runLength >= 3) yield first;
          runLength = 0;
        }
        if (line !== undefined) offset += line.length + 1;
      }
    },
  },
];
