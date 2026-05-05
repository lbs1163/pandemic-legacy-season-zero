import type { UiText } from '../i18n/uiText';
import type { LanguageCode } from '../types/cards';
import type { RuleToggle } from '../types/rules';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';

interface Props {
  rules: RuleToggle[];
  enabledMap: Record<string, boolean>;
  language: LanguageCode;
  text: UiText;
  onToggle: (ruleId: string, enabled: boolean) => void;
  embedded?: boolean;
}

export function RuleTogglePanel({ rules, enabledMap, language, text, onToggle, embedded = false }: Props) {
  const content = (
    <div className="space-y-3">
        {rules.map((rule) => {
          const enabled = enabledMap[rule.id] ?? rule.defaultEnabled;
          return (
            <label key={rule.id} className="flex gap-3 rounded-lg border p-3">
              <Input className="mt-1 size-4" type="checkbox" checked={enabled} onChange={(event) => onToggle(rule.id, event.target.checked)} />
              <span className="grid gap-1"><strong>{rule.label[language]}</strong><small className="text-muted-foreground">{rule.description[language]}</small></span>
            </label>
          );
        })}
    </div>
  );
  if (embedded) return content;
  return (
    <Card>
      <CardHeader><CardTitle>{text.ruleOptions}</CardTitle></CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
