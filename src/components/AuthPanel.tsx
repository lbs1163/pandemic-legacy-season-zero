import type { UiText } from '../i18n/uiText';
import type { AuthState, DeviceFlowUiState } from '../types/sync';
import { SyncStatus } from './SyncStatus';

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
    <section className="card auth-panel">
      <div>
        <h2>{text.accountSync}</h2>
        <p>{text.accountSyncDescription}</p>
        {auth.status === 'signed-in' && auth.user ? <p>{text.signedInAs} <strong>{auth.user.login}</strong></p> : null}
        {auth.status === 'pending-device-flow' ? <p>{text.devicePending}</p> : null}
        {deviceFlow ? (
          <div className="device-flow-box">
            <span>{text.deviceCodeLabel}</span>
            <strong>{deviceFlow.userCode}</strong>
            <span>{text.verificationUrlLabel}</span>
            <a href={deviceFlow.verificationUri} target="_blank" rel="noreferrer">{deviceFlow.verificationUri}</a>
            <small>{text.waitingForApproval.replace('{seconds}', String(deviceFlow.remainingSeconds))}</small>
          </div>
        ) : null}
        {auth.status === 'error' ? <p className="error">{auth.errorMessage}</p> : null}
      </div>
      <div className="button-column">
        {auth.status === 'signed-in' ? <button onClick={onSignOut}>{text.signOut}</button> : <button onClick={onStartSignIn} disabled={auth.status === 'pending-device-flow'}>{text.signInWithGitHub}</button>}
        <button onClick={onPull} disabled={auth.status !== 'signed-in'}>{text.pullGist}</button>
        <button onClick={onPush} disabled={auth.status !== 'signed-in'}>{text.pushGist}</button>
      </div>
      <SyncStatus dirty={dirty} remoteAvailable={auth.status === 'signed-in'} message={syncMessage} text={text} />
    </section>
  );
}
