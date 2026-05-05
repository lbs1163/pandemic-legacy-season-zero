import type { UiText } from '../i18n/uiText';
import type { LanguageCode } from '../types/cards';
import type { RuleToggle } from '../types/rules';

interface Props {
  rules: RuleToggle[];
  enabledMap: Record<string, boolean>;
  language: LanguageCode;
  text: UiText;
  onToggle: (ruleId: string, enabled: boolean) => void;
}

export function RuleTogglePanel({ rules, enabledMap, language, text, onToggle }: Props) {
  return (
    <section className="card">
      <h2>{text.ruleOptions}</h2>
      {rules.map((rule) => {
        const enabled = enabledMap[rule.id] ?? rule.defaultEnabled;
        return (
          <label key={rule.id} className="rule-toggle">
            <input type="checkbox" checked={enabled} onChange={(event) => onToggle(rule.id, event.target.checked)} />
            <span><strong>{rule.label[language]}</strong><small>{rule.description[language]}</small></span>
          </label>
        );
      })}
    </section>
  );
}
