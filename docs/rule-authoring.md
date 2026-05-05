# Rule Authoring Workflow

The app does not execute arbitrary prose from markdown. Markdown is the human-readable source of truth; TypeScript rule metadata is the app-readable bridge.

1. Add the rule text under `docs/en/legacy-rules.md` and `docs/ko/legacy-rules.md` with stable heading anchors.
2. Add or update a `RuleToggle` in `src/data/rules/legacyRules.ts`.
3. Reference the markdown path and anchor from the toggle.
4. If the rule changes deck behavior, implement the behavior behind that toggle in the relevant domain/UI module.
5. Add or update tests for the changed behavior.

Keep rule ids stable, lowercase, and kebab/dot separated, e.g. `legacy.january.example-rule`.

## Terminology Policy

- Code identifiers, TypeScript types, domain function names, test names, and stable ids must follow the English rulebook terminology.
  - Example: keep `EscalationCard`, `escalation`, `ThreatDeckState`, and markdown anchors such as `#escalation-cards` stable.
- Korean UI text, Korean markdown prose, and Korean localized labels/descriptions must follow the official Korean rulebook translation.
  - Example: display `Escalation card` as `악화 카드`, not `에스컬레이션 카드`.
  - Example: display `Game End area` as `게임 종료 구획`.
  - Example: display `Threat discard pile/area` as `버린 위협 카드 구획`.
- Do not rename existing code identifiers solely to match Korean terminology; keep localization in `LocalizedText` values and UI dictionaries.
- When adding a new rule, compare both `docs/en/rulebook.md` and `docs/ko/rulebook.md` or the source PDFs before choosing Korean labels.
