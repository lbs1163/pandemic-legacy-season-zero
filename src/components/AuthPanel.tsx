import type { UiText } from '../i18n/uiText';
import type { AuthState, DeviceFlowUiState } from '../types/sync';
import { SyncStatus } from './SyncStatus';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert } from './ui/alert';

interface Props {
  auth: AuthState;
  dirty: boolean;
  syncMessage?: string;
  deviceFlow?: DeviceFlowUiState;
  text: UiText;
  onStartSignIn: () => void;
  onSignOut: () => void;
  onPull: () => void;
  onPush: () => void;
}

export function AuthPanel({ auth, dirty, syncMessage, deviceFlow, text, onStartSignIn, onSignOut, onPull, onPush }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{text.accountSync}</CardTitle>
        <CardDescription>{text.accountSyncDescription}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[1fr_auto]">
      <div className="space-y-3">
        {auth.status === 'signed-in' && auth.user ? <p>{text.signedInAs} <strong>{auth.user.login}</strong></p> : null}
        {auth.status === 'pending-device-flow' ? <p>{text.devicePending}</p> : null}
        {deviceFlow ? (
          <div className="grid gap-2 rounded-lg bg-muted p-4">
            <span>{text.deviceCodeLabel}</span>
            <strong className="w-fit rounded-md bg-foreground px-3 py-1 text-xl tracking-widest text-background">{deviceFlow.userCode}</strong>
            <span>{text.verificationUrlLabel}</span>
            <a className="font-semibold text-primary underline" href={deviceFlow.verificationUri} target="_blank" rel="noreferrer">{deviceFlow.verificationUri}</a>
            <small>{text.waitingForApproval.replace('{seconds}', String(deviceFlow.remainingSeconds))}</small>
          </div>
        ) : null}
        {auth.status === 'error' ? <Alert variant="destructive">{auth.errorMessage}</Alert> : null}
      </div>
      <div className="flex flex-col gap-2">
        {auth.status === 'signed-in' ? <Button onClick={onSignOut}>{text.signOut}</Button> : <Button onClick={onStartSignIn} disabled={auth.status === 'pending-device-flow'}>{text.signInWithGitHub}</Button>}
        <Button variant="secondary" onClick={onPull} disabled={auth.status !== 'signed-in'}>{text.pullGist}</Button>
        <Button variant="secondary" onClick={onPush} disabled={auth.status !== 'signed-in'}>{text.pushGist}</Button>
      </div>
      <div className="lg:col-span-2">
      <SyncStatus dirty={dirty} remoteAvailable={auth.status === 'signed-in'} message={syncMessage} text={text} />
      </div>
      </CardContent>
    </Card>
  );
}
