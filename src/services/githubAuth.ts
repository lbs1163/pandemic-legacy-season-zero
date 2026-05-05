import type { AuthState, DeviceFlowStartResult, GitHubUser } from '../types/sync';

const BUILT_IN_GITHUB_CLIENT_ID = 'Ov23liaq37dej6YtNUNO';
const clientId = (import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined) || BUILT_IN_GITHUB_CLIENT_ID;

interface GitHubTokenPendingResponse {
  error?: 'authorization_pending' | 'slow_down' | 'expired_token' | 'access_denied' | string;
  error_description?: string;
  interval?: number;
}

interface GitHubTokenSuccessResponse {
  access_token: string;
}

export function isGitHubAuthConfigured(): boolean {
  return Boolean(clientId);
}

export async function startGitHubDeviceFlow(): Promise<DeviceFlowStartResult> {
  const response = await fetch('/api/github/device/code', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, scope: 'gist read:user' })
  });
  if (!response.ok) throw new Error(`GitHub device flow failed: ${response.status}`);
  const data = await response.json();
  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    expiresIn: data.expires_in,
    interval: data.interval
  };
}

export async function pollGitHubDeviceFlowOnce(deviceCode: string): Promise<AuthState | 'pending' | 'slow_down'> {
  const response = await fetch('/api/github/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, device_code: deviceCode, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' })
  });
  const data = (await response.json()) as GitHubTokenPendingResponse | GitHubTokenSuccessResponse;

  if ('error' in data && data.error) {
    if (data.error === 'authorization_pending') return 'pending';
    if (data.error === 'slow_down') return 'slow_down';
    return { status: 'error', errorMessage: data.error_description ?? data.error };
  }

  const accessToken = (data as GitHubTokenSuccessResponse).access_token;
  const user = await getGitHubUser(accessToken);
  return { status: 'signed-in', accessToken, user };
}

export async function pollGitHubDeviceFlowUntilComplete(
  flow: DeviceFlowStartResult,
  onPending?: (remainingSeconds: number) => void
): Promise<AuthState> {
  const startedAt = Date.now();
  let intervalMs = Math.max(flow.interval, 1) * 1000;

  while (Date.now() - startedAt < flow.expiresIn * 1000) {
    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
    const remainingSeconds = Math.max(0, flow.expiresIn - Math.floor((Date.now() - startedAt) / 1000));
    onPending?.(remainingSeconds);
    const result = await pollGitHubDeviceFlowOnce(flow.deviceCode);
    if (result === 'pending') continue;
    if (result === 'slow_down') {
      intervalMs += 5000;
      continue;
    }
    return result;
  }

  return { status: 'error', errorMessage: 'GitHub device authorization expired. Please try signing in again.' };
}

export async function getGitHubUser(token: string): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } });
  if (!response.ok) throw new Error(`GitHub user request failed: ${response.status}`);
  const data = await response.json();
  return { login: data.login, avatarUrl: data.avatar_url };
}
