# Changelog

All notable changes to this project are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- Filler openers removed by `--fix` (for example `In conclusion,`) no longer report the first letter of the next word as part of the tell. The fix still re-capitalizes that letter.

## [0.1.0] - 2026-10-25

First public release.

### Added

- CLI with `--fix`, `--lang`, `--format` (pretty, compact, json, github), `--max-score`, `--quiet`, `--dash`, `--ext`, `--plain` and `--list-rules`.
- Library API: `lint`, `fix`, `detectLanguage`, `rules`, with TypeScript types. Runs in Node and in the browser.
- English and French rule sets with more than 200 phrases: chatbot leftovers, sycophantic openers, sign-offs, filler openers, hype, overused vocabulary, negative parallelism.
- Language independent rules: em dashes, spaced en dashes, emoji bullets, bold label lists.
- Slop score from 0 (clean) to 100 (pure slop) for every file.
- Markdown aware: code, URLs, HTML and front matter are skipped. Inline `slopfix-disable` comments.
- Config file `.slopfixrc.json` with rule levels, banned phrases, ignore globs and dash replacement.
- GitHub Action with pull request annotations, pre-commit hook, agent skill and browser playground.

[Unreleased]: https://github.com/Zwarmex/slopfix/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Zwarmex/slopfix/releases/tag/v0.1.0
