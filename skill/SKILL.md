---
name: slopfix
description: Check and clean prose you wrote (README, docs, blog posts, emails, commit messages, PR descriptions) for AI writing tells such as em dashes, "it's not X, it's Y", filler openers, overused words and chatbot sign-offs. Use before handing any user-facing text back to the user.
---

# slopfix

Text that reads as machine written loses readers. Before you return prose to the user, run slopfix on it and fix what it reports.

## Files

```bash
npx slopfix@latest <files or folders> --quiet
npx slopfix@latest <files or folders> --fix --quiet
```

Run the first command, then `--fix` for the mechanical tells (em dashes, filler openers, chatbot openers and sign-offs, emoji bullets, safe word swaps). Re-run without `--fix` and rewrite by hand what is left: `not-x-but-y`, `hype-intro`, `chatbot-artifact` and vocabulary without a replacement. Rewrite the sentence, do not just swap the word.

## Text that is not in a file yet

```bash
printf '%s' "<your text>" | npx slopfix@latest --fix
```

## Rules for your rewrite

- Replace an em dash with a comma, a colon, parentheses or a new sentence. Never with another dash.
- Say the thing directly. Delete `It's important to note that` and similar openers.
- Replace `It's not X, it's Y` with a plain statement of Y.
- No `I hope this helps`, no `Let me know if you have any questions`, no `Certainly!`.
- Keep the user's meaning, facts and tone. slopfix is about style, not content.

Stop when `npx slopfix --quiet` exits with code 0, or when the remaining items are deliberate (quotes, names, code).
