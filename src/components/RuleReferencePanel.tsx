import type { UiText } from '../i18n/uiText';
import type { LanguageCode } from '../types/cards';
import type { RuleToggle } from '../types/rules';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface Props {
  rules: RuleToggle[];
  language: LanguageCode;
  text: UiText;
}

export function RuleReferencePanel({ rules, language, text }: Props) {
  return (
    <Card>
      <CardHeader><CardTitle>{text.ruleReferences}</CardTitle></CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {rules.map((rule) => {
            const references = rule.references.filter((reference) => reference.language === language);
            return (
              <li key={rule.id} className="space-y-2">
                <strong>{rule.label[language]}</strong>
                {(references.length ? references : rule.references).map((reference) => (
                  <code className="block rounded-md bg-muted px-2 py-1 text-xs" key={`${rule.id}-${reference.language}`}>{reference.markdownPath}#{reference.anchor}</code>
                ))}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
