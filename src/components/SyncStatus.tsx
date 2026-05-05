import type { UiText } from '../i18n/uiText';
import { Badge } from './ui/badge';
import { Alert } from './ui/alert';

interface Props {
  dirty: boolean;
  remoteAvailable: boolean;
  message?: string;
  text: UiText;
}

export function SyncStatus({ dirty, remoteAvailable, message, text }: Props) {
  return (
    <Alert className={dirty ? 'border-accent bg-accent/10' : 'border-primary/20 bg-primary/5'}>
      <div className="flex flex-wrap items-center gap-2">
      <Badge variant={dirty ? 'destructive' : 'default'}>{dirty ? text.unsyncedLocalChanges : text.localCacheSaved}</Badge>
      <Badge variant="secondary">{remoteAvailable ? text.githubAvailable : text.githubNotConfigured}</Badge>
      {message ? <span>{message}</span> : null}
      </div>
    </Alert>
  );
}
