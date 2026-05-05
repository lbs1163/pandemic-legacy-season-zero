import type { UiText } from '../i18n/uiText';
import type { LanguageCode } from '../types/cards';
import type { RuleToggle } from '../types/rules';

interface Props {
  rules: RuleToggle[];
  language: LanguageCode;
  text: UiText;
}

export function RuleReferencePanel({ rules, language, text }: Props) {
  return (
    <section className="card">
      <h2>{text.ruleReferences}</h2>
      <ul className="reference-list">
        {rules.map((rule) => {
          const references = rule.references.filter((reference) => reference.language === language);
          return (
            <li key={rule.id}>
              <strong>{rule.label[language]}</strong>
              {(references.length ? references : rule.references).map((reference) => (
                <code key={`${rule.id}-${reference.language}`}>{reference.markdownPath}#{reference.anchor}</code>
              ))}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
