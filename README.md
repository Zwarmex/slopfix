<div align="center">

# slopfix

**Your text reads like ChatGPT wrote it. slopfix finds why, and fixes it.**

A zero dependency linter for AI writing tells: em dashes, `it's not X, it's Y`, `delve`, `I hope this helps!`, emoji bullets and 200+ more. English and French. CLI, library, GitHub Action, agent skill and a [browser playground](https://zwarmex.github.io/slopfix/).

[![CI](https://github.com/Zwarmex/slopfix/actions/workflows/ci.yml/badge.svg)](https://github.com/Zwarmex/slopfix/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/slopfix.svg)](https://www.npmjs.com/package/slopfix)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Dependencies: 0](https://img.shields.io/badge/dependencies-0-brightgreen.svg)

[Try it in your browser](https://zwarmex.github.io/slopfix/) · [Français](README.fr.md)

</div>

```bash
npx slopfix README.md
```

```
README.md  en · 130 words · slop score 94/100 (pure slop)
  3:1    error    Certainly! → (remove)                        Sycophantic chatbot opener.
  5:1    warning  In today's fast-paced world, → (remove)      Filler phrase. Delete it and say the thing.
  5:91   warning  FlowSync is not just another app, it's       "It's not X, it's Y" construction.
  7:45   warning  (em dash) → ","                              Em dash. The most recognizable AI writing tell.
  7:117  warning  delve into → "dig into"                      Word that is heavily overused by language models.
  15:78  error    I hope this helps! → (remove)                Chatbot sign-off.

✖ 24 tells (4 errors, 16 warnings, 4 info) · 13 fixable with --fix
```

## Why

People now spot generated text in two seconds, and they stop reading. Recruiters skip the cover letter, readers skip the blog post, maintainers close the pull request. The tells are always the same, and most of them are mechanical:

<!-- slopfix-disable -->

| Tell | Example | slopfix |
| --- | --- | --- |
| Em dashes everywhere | `fast (em dash) and simple (em dash) by design` | flags, fixes to `, ` |
| Negative parallelism | "It's not a tool, it's a revolution." | flags |
| Filler openers | "It's important to note that..." | removes, re-capitalizes |
| Overused words | delve, utilize, tapestry, a myriad of | flags, replaces the safe ones |
| Chatbot leftovers | "Certainly!", "I hope this helps!", "As an AI language model" | removes or flags |
| Hype | "game-changer", "unlock the full potential", "stands as a testament" | flags |
| Chatbot formatting | emoji bullets, lists of **Bold label:** items | removes emojis, flags lists |

<!-- slopfix-enable -->

slopfix is deterministic. It does not call an LLM, it does not guess who wrote the text and it does not send anything anywhere. It shows the tells, gives each file a **slop score** from 0 (clean) to 100 (pure slop), and fixes what is safe to fix.

## Install

```bash
# run once
npx slopfix docs/

# or install
npm install --save-dev slopfix
```

Node 18 or newer. No dependencies.

## CLI

```bash
slopfix README.md                 # lint a file
slopfix docs blog                 # lint folders (md, mdx, markdown, txt)
slopfix docs --fix                # fix every safe tell in place
slopfix . --max-score 20          # only fail when a file scores above 20
slopfix . --format github         # annotations for GitHub Actions
pbpaste | slopfix --fix | pbcopy  # clean your clipboard (macOS)
```

| Option | Description |
| --- | --- |
| `--fix` | Rewrite files with every safe fix. With stdin, print the fixed text. |
| `--lang <code>` | `en`, `fr`, `auto` (default, per file) or `all` |
| `--format <name>` | `pretty` (default), `compact`, `json`, `github` |
| `--max-score <n>` | Fail only when a file's score is above `n` |
| `--quiet` | Hide info level tells |
| `--dash <text>` | What replaces an em dash with `--fix` (default `", "`) |
| `--ext <list>` | Extensions to scan in folders |
| `--plain` | Treat input as plain text instead of Markdown |
| `--list-rules` | Print every rule |

Exit code is `0` when clean, `1` when tells are found, `2` on usage errors.

Code blocks, inline code, URLs, HTML tags and front matter are skipped, so your docs can talk about `delve` without being flagged.

## Configuration

Create `.slopfixrc.json` (or a `slopfix` key in `package.json`):

```json
{
  "lang": "auto",
  "dashReplacement": " - ",
  "maxScore": 25,
  "rules": {
    "en/weasel-vocabulary": "off",
    "em-dash": "error"
  },
  "ban": [
    "synergy",
    { "phrase": "blazingly fast", "replacement": "fast" }
  ],
  "ignore": ["CHANGELOG.md", "docs/legacy/**"]
}
```

Silence a passage inside a Markdown file:

```md
<!-- slopfix-disable -->
This paragraph can delve as much as it wants.
<!-- slopfix-enable -->

<!-- slopfix-disable-next-line -->
So can this line.
```

## GitHub Action

Annotates the tells right on the pull request diff.

```yaml
# .github/workflows/slopfix.yml
name: slopfix
on: pull_request
jobs:
  slopfix:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - uses: Zwarmex/slopfix@v0
        with:
          paths: docs README.md
          max-score: 25
```

## pre-commit

```yaml
repos:
  - repo: https://github.com/Zwarmex/slopfix
    rev: v0.1.0
    hooks:
      - id: slopfix
```

## Library

```js
import { lint, fix } from 'slopfix';

const result = lint('Certainly! We delve into the data.');
result.score;   // 0 to 100
result.issues;  // [{ ruleId, severity, message, line, column, quote, fix }, ...]

fix('Certainly! We delve into the data.').output;
// "We dig into the data."
```

Types are included. It runs in Node and in the browser (the playground uses the same code).

## Make your AI agent check itself

Copy [`skill/SKILL.md`](skill/SKILL.md) into your agent's skills folder (for example `.claude/skills/slopfix/SKILL.md`). Agents that support skills (Claude Code, Codex, Cursor and others) will run slopfix on the prose they write before handing it to you. You can also add one line to your `AGENTS.md`:

```md
Before you finish, run `npx slopfix --quiet` on every Markdown file you changed and fix what it reports.
```

## Rules

Run `slopfix --list-rules` for the full list.

| Rule | Lang | Default | Autofix |
| --- | --- | --- | --- |
| `em-dash` | all | warning | yes |
| `spaced-en-dash` | all | warning | yes |
| `emoji-bullet` | all | warning | yes |
| `bold-label-list` | all | info | no |
| `en/chatbot-artifact`, `fr/chatbot-artifact` | en, fr | error | no |
| `en/sycophantic-opener`, `fr/sycophantic-opener` | en, fr | error | yes |
| `en/chatbot-sign-off`, `fr/chatbot-sign-off` | en, fr | error | yes |
| `en/filler-opener`, `fr/filler-opener` | en, fr | warning | yes |
| `en/hype-intro`, `fr/hype-intro` | en, fr | warning | no |
| `en/ai-vocabulary`, `fr/ai-vocabulary` | en, fr | warning | partly |
| `en/weasel-vocabulary`, `fr/weasel-vocabulary` | en, fr | info | no |
| `en/not-x-but-y`, `fr/not-x-but-y` | en, fr | warning | no |
| `en/whether-youre`, `fr/que-vous-soyez` | en, fr | info | no |

Rewrites that need judgment (negative parallelism, hype) are reported but never rewritten for you. A linter that silently rewrites your argument is worse than slop.

## The slop score

Each tell has a weight (error 5, warning 2, info 1). The score takes the weighted density per 100 words and maps it onto a 0 to 100 curve. Rough guide:

| Score | Label |
| --- | --- |
| 0 to 9 | clean |
| 10 to 29 | a few tells |
| 30 to 59 | sloppy |
| 60 to 100 | pure slop |

It is a writing quality signal, not an AI detector. Humans write `crucial` too. A high score means readers will *think* a model wrote it, which is the problem you want to fix.

## Contributing

The best contributions are new phrases and new languages. Adding a phrase is one line in [`src/rules/en.js`](src/rules/en.js) or [`src/rules/fr.js`](src/rules/fr.js), adding a language is one new file. See [CONTRIBUTING.md](CONTRIBUTING.md).

Wanted: Spanish, German, Portuguese, Italian, Dutch. Open a pull request with the tells you see every day in your language.

## License

MIT
