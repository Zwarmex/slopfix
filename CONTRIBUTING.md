# Contributing to slopfix

Thanks for helping. The most useful contributions are small: one phrase you keep seeing, one false positive you hit, one new language.

## Setup

```bash
git clone https://github.com/Zwarmex/slopfix.git
cd slopfix
npm test
```

No install step. slopfix has no dependencies and the tests use the Node test runner.

## Add a phrase

Open [`src/rules/en.js`](src/rules/en.js) or [`src/rules/fr.js`](src/rules/fr.js) and add one line to the right list:

```js
'phrase to report',                 // reported only
['phrase to replace', 'better one'], // reported and fixed by --fix
```

Pick the list by what the phrase is:

| Rule | Put here |
| --- | --- |
| `chatbot-artifact` | Text that only an assistant would write |
| `filler-opener` | Phrases that can be deleted with no loss of meaning (they are removed by `--fix`) |
| `hype-intro` | Grand intros, outros and clichés |
| `ai-vocabulary` | Words models overuse, with a replacement when one is always safe |
| `weasel-vocabulary` | Words that are fine alone and suspicious in bulk (info level) |

Matching ignores case, accepts both straight and curly apostrophes, and never matches inside a longer word.

Add a test in [`test/lint.test.js`](test/lint.test.js) when you add a fix, so the replacement is checked.

## Add a language

1. Copy `src/rules/fr.js` to `src/rules/<code>.js` and translate the lists. Rule ids start with `<code>/`.
2. Import it in `src/index.js`, add it to `rules` and `languages`, and add 20 frequent short words to `STOPWORDS` for detection.
3. Add tests and a line in the README.

## Rules of thumb

`--fix` must never change meaning. When in doubt, report without fixing.

Precision beats recall. A tell that fires on normal human prose gets muted by users, and then nothing gets fixed.

Keep it dependency free. It has to run with `npx` in a second and in the browser.

## Repository text

The repository dogfoods itself: CI runs slopfix on the docs. Keep literal em dashes out of the sources (use `\u2014` in code) so the docs stay clean.
