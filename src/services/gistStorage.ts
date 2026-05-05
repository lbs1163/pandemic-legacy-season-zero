import { Octokit } from '@octokit/rest';
import type { GistSyncMetadata, PersistedEnvelope } from '../types/sync';
import { createEmptyEnvelope, validatePersistedEnvelope } from './localCache';

export const STATE_GIST_FILENAME = 'pandemic-legacy-season-zero-state.json' as const;
const DESCRIPTION = 'Pandemic Legacy Season 0 deck counter state';

function octokit(token: string) {
  return new Octokit({ auth: token });
}

export async function findOrCreateStateGist(token: string): Promise<GistSyncMetadata> {
  const client = octokit(token);
  const gists = await client.gists.list({ per_page: 100 });
  const existing = gists.data.find((gist) => gist.files && STATE_GIST_FILENAME in gist.files);
  if (existing?.id) {
    return { gistId: existing.id, fileName: STATE_GIST_FILENAME, etag: gists.headers.etag, dirty: false };
  }

  const created = await client.gists.create({
    description: DESCRIPTION,
    public: false,
    files: {
      [STATE_GIST_FILENAME]: { content: JSON.stringify(createEmptyEnvelope(), null, 2) }
    }
  });
  if (!created.data.id) throw new Error('GitHub did not return a gist id.');
  return { gistId: created.data.id, fileName: STATE_GIST_FILENAME, etag: created.headers.etag, dirty: false };
}

export async function pullStateFromGist(token: string, metadata: GistSyncMetadata): Promise<PersistedEnvelope> {
  if (!metadata.gistId) throw new Error('Missing gist id.');
  const response = await octokit(token).gists.get({ gist_id: metadata.gistId });
  const file = response.data.files?.[STATE_GIST_FILENAME];
  if (!file?.content) return createEmptyEnvelope();
  return validatePersistedEnvelope(JSON.parse(file.content));
}

export async function pushStateToGist(token: string, metadata: GistSyncMetadata, envelope: PersistedEnvelope): Promise<GistSyncMetadata> {
  if (!metadata.gistId) throw new Error('Missing gist id.');
  const validated = validatePersistedEnvelope(envelope);
  const response = await octokit(token).gists.update({
    gist_id: metadata.gistId,
    files: {
      [STATE_GIST_FILENAME]: { content: JSON.stringify(validated, null, 2) }
    }
  });
  return { ...metadata, etag: response.headers.etag, lastPushedAt: new Date().toISOString(), dirty: false };
}
