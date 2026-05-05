# Rule Authoring Workflow

The app does not execute arbitrary prose from markdown. Markdown is the human-readable source of truth; TypeScript rule metadata is the app-readable bridge.

1. Add the rule text under `docs/en/legacy-rules.md` and `docs/ko/legacy-rules.md` with stable heading anchors.
2. Add or update a `RuleToggle` in `src/data/rules/legacyRules.ts`.
3. Reference the markdown path and anchor from the toggle.
4. If the rule changes deck behavior, implement the behavior behind that toggle in the relevant domain/UI module.
5. Add or update tests for the changed behavior.

Keep rule ids stable, lowercase, and kebab/dot separated, e.g. `legacy.january.example-rule`.
