import type { UiText } from '../i18n/uiText';

interface Props {
  dirty: boolean;
  remoteAvailable: boolean;
  message?: string;
  text: UiText;
}

export function SyncStatus({ dirty, remoteAvailable, message, text }: Props) {
  return (
    <div className={`sync-status ${dirty ? 'dirty' : 'clean'}`}>
      <strong>{dirty ? text.unsyncedLocalChanges : text.localCacheSaved}</strong>
      <span>{remoteAvailable ? text.githubAvailable : text.githubNotConfigured}</span>
      {message ? <span>{message}</span> : null}
    </div>
  );
}
