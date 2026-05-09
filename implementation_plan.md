# Implementation Plan

[Overview]
Vercel에서 이 Vite React 웹 앱과 GitHub OAuth 프록시 API를 안정적으로 배포할 수 있도록 배포 설정 파일과 한국어 배포 문서를 추가한다.

이 저장소는 `package.json` 기준 React 18, TypeScript, Vite 7, Tailwind CSS 4를 사용하는 SPA이며, production build는 `npm run build`로 `tsc -b && vite build`를 실행해 `dist/`를 생성한다. 실제 로컬 검증에서 `npm run build`는 성공했고, Vite의 500 kB chunk size warning만 발생했다. 이 warning은 배포 차단 오류가 아니며, 이번 배포 준비 범위에서는 code splitting 최적화를 별도 작업으로 남긴다.

앱은 클라이언트에서 GitHub Device Flow를 시작할 때 `/api/github/device/code`와 `/api/github/oauth/access_token`로 요청한다. 로컬 개발에서는 `vite.config.ts`의 `server.proxy`가 GitHub upstream으로 프록시하지만, Vercel production에서는 `api/github/device/code.js`와 `api/github/oauth/access_token.js`가 Serverless Function으로 동작해 GitHub OAuth endpoint를 호출한다. 따라서 Vercel 배포 설정은 정적 Vite build와 `/api` serverless routes를 동시에 지원해야 한다.

구현은 런타임 도메인 로직을 변경하지 않고, Vercel이 자동 감지할 수 있는 설정을 명시적으로 추가하는 방식으로 진행한다. `vercel.json`에는 build command, output directory, install command, SPA fallback rewrite를 정의한다. `README.md`에는 GitHub 저장소를 Vercel에 Import하는 권장 배포 절차와 Vercel CLI를 사용하는 대체 절차, 환경 변수 설정, GitHub OAuth Client ID 사용 방식, 배포 후 확인 체크리스트를 한국어로 문서화한다.

[Types]
새 TypeScript 타입이나 영속 데이터 구조 변경은 필요하지 않다.

이번 작업은 배포 문서와 플랫폼 설정을 추가하는 것이므로 `src/types/*`, domain model, Zod persistence schema는 변경하지 않는다. 관련 기존 구조는 다음과 같다.

- `AuthState`
  - File: `src/types/sync.ts`
  - Shape: `{ status: 'signed-out' | 'pending-device-flow' | 'signed-in' | 'error'; accessToken?: string; user?: GitHubUser; errorMessage?: string }`
  - 변경 없음.
  - Vercel 배포 후에도 `/api/github/*` endpoints가 정상 응답하면 기존 auth flow가 그대로 동작한다.

- `DeviceFlowStartResult`
  - File: `src/types/sync.ts`
  - Shape: `{ deviceCode: string; userCode: string; verificationUri: string; expiresIn: number; interval: number }`
  - 변경 없음.
  - `api/github/device/code.js` response shape를 클라이언트에서 매핑하는 기존 로직을 유지한다.

- `GistSyncMetadata`, `PersistedEnvelope`
  - File: `src/types/sync.ts`
  - 변경 없음.
  - Vercel 배포는 sync 데이터 형식과 localStorage/gist 저장 방식을 바꾸지 않는다.

- Vercel configuration schema
  - File: `vercel.json`
  - JSON structure to add:
    ```json
    {
      "$schema": "https://openapi.vercel.sh/vercel.json",
      "framework": "vite",
      "installCommand": "npm ci",
      "buildCommand": "npm run build",
      "outputDirectory": "dist",
      "rewrites": [
        { "source": "/((?!api/.*).*)", "destination": "/index.html" }
      ]
    }
    ```
  - Validation rules:
    - `framework` must be `vite` to match the project.
    - `installCommand` should be `npm ci` because `package-lock.json` exists.
    - `buildCommand` must match `package.json` script `npm run build`.
    - `outputDirectory` must match Vite default output `dist`.
    - Rewrite must not intercept `/api/*`; otherwise GitHub OAuth serverless functions can be shadowed by SPA fallback.

[Files]
배포 설정 파일과 루트 README를 추가하고 기존 환경 변수 예시는 유지한다.

- New files to be created:
  - `vercel.json`
    - Purpose: Vercel deployment behavior를 저장소에 명시한다.
    - Required contents:
      - `$schema`: `https://openapi.vercel.sh/vercel.json`
      - `framework`: `vite`
      - `installCommand`: `npm ci`
      - `buildCommand`: `npm run build`
      - `outputDirectory`: `dist`
      - `rewrites`: non-API routes를 `/index.html`로 보내는 SPA fallback
    - Important constraint: `/api/github/device/code`와 `/api/github/oauth/access_token`은 serverless functions로 남아야 하므로 rewrite source는 `/api/`를 제외해야 한다.
  - `README.md`
    - Purpose: Vercel 배포 과정을 한국어로 설명한다.
    - Required sections:
      1. Project overview
      2. Local prerequisites and validation commands
      3. Vercel dashboard deployment from GitHub repository
      4. Optional Vercel CLI deployment
      5. Environment variables and GitHub OAuth Client ID explanation
      6. API route behavior on local dev vs Vercel production
      7. Post-deployment smoke test checklist
      8. Troubleshooting
    - Must mention that `VITE_GITHUB_CLIENT_ID` is optional because `src/services/githubAuth.ts` includes a built-in public client ID.
    - Must mention that custom/fork deployments may define `VITE_GITHUB_CLIENT_ID` in Vercel Project Settings.

- Existing files to be modified:
  - `.env.example`
    - No required content change.
    - README should reference it as the optional environment variable template.
  - `package.json`
    - No required content change.
    - Existing scripts already satisfy Vercel deployment:
      - `build`: `tsc -b && vite build`
      - `test`: `vitest run`
      - `preview`: `vite preview`
  - `vite.config.ts`
    - No required content change.
    - Existing `server.proxy` should remain for local development only.
  - `api/github/device/code.js`
    - No required content change.
    - Vercel should deploy this file as `/api/github/device/code`.
  - `api/github/oauth/access_token.js`
    - No required content change.
    - Vercel should deploy this file as `/api/github/oauth/access_token`.
  - `implementation_plan.md`
    - Replace prior task plan with this Vercel deployment preparation plan.

- Files to be deleted or moved:
  - None.

- Configuration file updates:
  - Add `vercel.json` as described above.
  - Do not add `.vercel/` to source control; Vercel CLI local metadata should remain untracked if created later.
  - Existing `.gitignore` already ignores `.env`, `.env.*`, and allows `!.env.example`; no change required.

[Functions]
런타임 함수 변경 없이 기존 API handler와 auth service가 Vercel 배포에서 어떻게 연결되는지 문서화한다.

- New functions:
  - None.

- Modified functions:
  - None required.

- Existing functions that must be documented and preserved:
  - `handler(request, response)`
    - File: `api/github/device/code.js`
    - Current behavior:
      - Accepts only `POST`.
      - Forwards request body to `https://github.com/login/device/code`.
      - Returns upstream JSON status/body.
    - Deployment relevance:
      - On Vercel, this becomes `/api/github/device/code`.
      - README troubleshooting should mention that a `405` means the route exists but was called with the wrong method.
  - `handler(request, response)`
    - File: `api/github/oauth/access_token.js`
    - Current behavior:
      - Accepts only `POST`.
      - Forwards request body to `https://github.com/login/oauth/access_token`.
      - Returns upstream JSON status/body.
    - Deployment relevance:
      - On Vercel, this becomes `/api/github/oauth/access_token`.
  - `startGitHubDeviceFlow()`
    - File: `src/services/githubAuth.ts`
    - Current behavior:
      - POSTs to `/api/github/device/code` with `{ client_id, scope: 'gist read:user' }`.
      - Uses `VITE_GITHUB_CLIENT_ID` if defined, otherwise built-in client ID.
    - Deployment relevance:
      - README must explain optional `VITE_GITHUB_CLIENT_ID` configuration.
  - `pollGitHubDeviceFlowOnce(deviceCode)`
    - File: `src/services/githubAuth.ts`
    - Current behavior:
      - POSTs to `/api/github/oauth/access_token`.
      - Handles `authorization_pending`, `slow_down`, and success token response.
    - Deployment relevance:
      - README smoke test should include sign-in flow verification.

- Removed functions:
  - None.

[Classes]
클래스 기반 구조가 없고 이번 작업도 클래스 추가, 수정, 삭제가 없다.

- New classes:
  - None.

- Modified classes:
  - None.

- Removed classes:
  - None.

[Dependencies]
새 npm package는 필요 없으며 Vercel platform의 기본 Vite 및 Node Serverless Function 지원을 사용한다.

- New packages:
  - None.

- Version changes:
  - None.

- Existing package manager behavior:
  - `package-lock.json` exists with lockfile version 3.
  - Vercel install command should be `npm ci` for reproducible installs.
  - `package.json` has `private: true`, which is compatible with Vercel deployments.

- Vercel integration requirements:
  - Build command: `npm run build`.
  - Output directory: `dist`.
  - Framework preset: Vite.
  - Node runtime for files under `api/` should be Vercel default; no custom runtime is required.
  - Environment variables:
    - `VITE_GITHUB_CLIENT_ID` optional.
    - If set, it must be available at build time because Vite embeds `import.meta.env.VITE_*` values into the client bundle.
    - No GitHub client secret is needed for Device Flow.

[Testing]
문서/설정 변경 후 기존 test suite와 production build를 실행하고 Vercel 배포 후 수동 smoke test를 수행한다.

Automated validation before commit:

1. `npm test`
   - Confirms existing domain and persistence tests still pass.
   - No new unit tests are required because runtime logic is not changed.
2. `npm run build`
   - Confirms TypeScript compilation and Vite production build.
   - Expected output directory: `dist/`.
   - Known acceptable warning: generated JS chunk may exceed 500 kB after minification.

Manual deployment validation after Vercel deploy:

1. Open deployed Vercel URL.
2. Confirm the React app loads without blank page or asset 404 errors.
3. Create or select a campaign locally in the app.
4. Start GitHub sign-in.
5. Confirm user code and verification URL are displayed.
6. Complete GitHub Device Flow in the browser.
7. Confirm signed-in status appears in the app.
8. Use pull/push sync and confirm the private gist state can be created or updated.
9. Directly check that non-API deep routes fallback to the SPA if any future client routes are introduced.
10. Confirm `/api/github/device/code` rejects `GET` with 405, indicating the API route exists and only accepts POST.

Documentation review checklist:

- README explains both Vercel dashboard and CLI approaches.
- README states `VITE_GITHUB_CLIENT_ID` is optional for normal use.
- README describes when to create/use a custom GitHub OAuth App.
- README includes build settings matching `vercel.json`.
- README includes troubleshooting for API routes, environment variables, and build failures.

[Implementation Order]
먼저 Vercel 설정을 추가한 뒤 README 배포 절차를 작성하고, 검증 후 atomic commit과 push를 수행한다.

1. `git status --short | cat`으로 작업 트리 상태를 확인한다.
2. `vercel.json`을 추가해 Vite build settings와 SPA fallback rewrite를 명시한다.
3. `README.md`를 추가해 한국어 Vercel 배포 가이드, 환경 변수, OAuth, 검증 절차를 문서화한다.
4. `.env.example`, `vite.config.ts`, `api/github/*`, `package.json`은 변경하지 않는다는 전제를 다시 확인한다.
5. `npm test`를 실행해 기존 테스트 회귀를 확인한다.
6. `npm run build`를 실행해 Vercel build와 동일한 production build를 확인한다.
7. `git status --short | cat`으로 변경 파일이 `implementation_plan.md`, `README.md`, `vercel.json`만 포함되는지 확인한다.
8. 관련 파일만 stage한다.
9. Commit message `Add Vercel deployment guide and config`로 atomic commit을 생성한다.
10. `.clinerules`에 따라 현재 branch `main`에 push한다.
11. 완료 응답에서 commit hash, branch, push result, validation commands를 보고한다.
