import type { CampaignState } from './campaign';
import type { LanguageCode } from './cards';

export interface GitHubUser {
  login: string;
  avatarUrl: string;
}

export interface AuthState {
  status: 'signed-out' | 'pending-device-flow' | 'signed-in' | 'error';
  accessToken?: string;
  user?: GitHubUser;
  errorMessage?: string;
}

export interface DeviceFlowStartResult {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

export interface DeviceFlowUiState {
  userCode: string;
  verificationUri: string;
  expiresAt: string;
  remainingSeconds: number;
}

export interface GistSyncMetadata {
  gistId?: string;
  fileName: 'pandemic-legacy-season-zero-state.json';
  etag?: string;
  lastPulledAt?: string;
  lastPushedAt?: string;
  dirty: boolean;
}

export interface AppSettings {
  language: LanguageCode;
}

export interface PersistedEnvelope {
  appId: 'pandemic-legacy-season-zero-deck-counter';
  schemaVersion: 5;
  settings: AppSettings;
  campaigns: CampaignState[];
  activeCampaignId?: string;
}
