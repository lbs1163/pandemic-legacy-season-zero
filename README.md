# Pandemic Legacy Season Zero Helper

Pandemic Legacy Season Zero Helper는 **React 18 + TypeScript + Vite**로 작성된 싱글 페이지 웹 앱입니다. 캠페인 진행, 덱 상태, 규칙 참조, GitHub Gist 기반 동기화 흐름을 브라우저에서 관리할 수 있도록 돕습니다.

이 문서는 이 저장소를 **Vercel**에 배포하는 과정을 설명합니다.

## 프로젝트 구조와 배포 방식

- 프론트엔드: Vite SPA
- 빌드 명령: `npm run build`
- 빌드 산출물: `dist/`
- 패키지 설치: `npm ci`
- Vercel API Routes:
  - `/api/github/device/code`
  - `/api/github/oauth/access_token`

GitHub OAuth Device Flow는 클라이언트에서 직접 GitHub 토큰 endpoint를 호출하지 않고, `api/` 폴더의 Vercel Serverless Function을 통해 프록시됩니다. 로컬 개발에서는 `vite.config.ts`의 dev server proxy가 같은 경로를 GitHub로 전달합니다.

## 로컬 사전 준비와 검증

### 요구 사항

- Node.js 20 이상 권장
- npm
- GitHub 저장소에 push할 수 있는 권한
- Vercel 계정

### 의존성 설치

```bash
npm ci
```

### 로컬 개발 서버 실행

```bash
npm run dev
```

기본적으로 Vite 개발 서버가 실행되며, 로컬에서는 `/api/github/*` 요청이 `vite.config.ts`의 proxy 설정을 통해 GitHub endpoint로 전달됩니다.

### 배포 전 검증

```bash
npm test
npm run build
```

`npm run build`는 TypeScript 프로젝트 빌드와 Vite production build를 함께 실행합니다. Vite가 번들 크기 경고를 표시할 수 있지만, 빌드가 성공하면 Vercel 배포를 막는 오류는 아닙니다.

## Vercel Dashboard로 GitHub 저장소 배포하기

권장 방식은 Vercel Dashboard에서 GitHub 저장소를 Import하는 것입니다.

1. 변경 사항을 GitHub 원격 저장소에 push합니다.
2. [Vercel Dashboard](https://vercel.com/dashboard)에 로그인합니다.
3. **Add New... → Project**를 선택합니다.
4. GitHub 계정을 연결하고 이 저장소를 선택합니다.
5. Project 설정에서 다음 값이 자동 또는 명시적으로 잡혀 있는지 확인합니다.

   | 항목 | 값 |
   | --- | --- |
   | Framework Preset | `Vite` |
   | Install Command | `npm ci` |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |

6. 일반 배포라면 환경 변수는 추가하지 않아도 됩니다.
7. fork 또는 자체 GitHub OAuth App을 사용할 경우에만 `VITE_GITHUB_CLIENT_ID`를 추가합니다.
8. **Deploy**를 클릭합니다.

이 저장소에는 `vercel.json`이 포함되어 있어 Vercel이 위 설정과 SPA fallback rewrite를 명시적으로 사용합니다.

## Vercel CLI로 배포하기

Dashboard 대신 CLI를 사용할 수도 있습니다.

```bash
npm ci
npm run build
npx vercel
```

production 배포가 필요하면 다음 명령을 사용합니다.

```bash
npx vercel --prod
```

CLI가 질문하는 프로젝트 설정에서는 Vite 앱으로 연결하고, 빌드 설정은 `vercel.json`의 값을 사용하면 됩니다. CLI 실행 중 생성될 수 있는 `.vercel/` 디렉터리는 로컬 프로젝트 연결 정보이므로 일반적으로 Git에 커밋하지 않습니다.

## 환경 변수와 GitHub OAuth Client ID

이 앱은 GitHub Device Flow를 사용합니다. Device Flow에는 GitHub client secret이 필요하지 않습니다.

`src/services/githubAuth.ts`에는 public GitHub OAuth Client ID fallback이 포함되어 있으므로, 일반적인 배포에서는 별도 환경 변수가 없어도 동작합니다.

선택적으로 자체 GitHub OAuth App을 사용할 때만 Vercel Project Settings에 다음 환경 변수를 설정하세요.

```env
VITE_GITHUB_CLIENT_ID=your_github_oauth_client_id
```

참고용 템플릿은 `.env.example`에 있습니다.

주의할 점:

- Vite는 `VITE_` 접두사가 붙은 환경 변수만 클라이언트 번들에 포함합니다.
- `VITE_GITHUB_CLIENT_ID`는 빌드 시점에 반영되므로, Vercel에서 값을 바꾼 뒤에는 다시 배포해야 합니다.
- GitHub Device Flow에는 client secret을 설정하지 않습니다.

## 로컬 개발과 Vercel Production의 API 동작 차이

앱 코드는 두 환경 모두에서 같은 경로를 호출합니다.

- `/api/github/device/code`
- `/api/github/oauth/access_token`

환경별 처리 방식은 다음과 같습니다.

| 환경 | 처리 방식 |
| --- | --- |
| 로컬 개발 서버 | `vite.config.ts`의 `server.proxy`가 GitHub OAuth endpoint로 전달 |
| Vercel Production | `api/github/device/code.js`, `api/github/oauth/access_token.js`가 Serverless Function으로 실행 |

`vercel.json`의 rewrite는 SPA deep link를 `/index.html`로 보내되 `/api/*`는 제외합니다. 따라서 API route가 React SPA fallback에 가려지지 않습니다.

## 배포 후 Smoke Test 체크리스트

Vercel 배포가 끝나면 다음을 확인하세요.

- [ ] 배포 URL에 접속했을 때 앱이 정상적으로 로드된다.
- [ ] 브라우저 콘솔에 주요 JavaScript 오류가 없다.
- [ ] 캠페인을 새로 만들거나 기존 캠페인을 선택할 수 있다.
- [ ] GitHub 로그인 시작 시 user code와 verification URL이 표시된다.
- [ ] GitHub Device Flow 인증을 완료하면 앱에서 로그인 상태가 표시된다.
- [ ] Gist pull/push sync가 정상 동작한다.
- [ ] `/api/github/device/code`를 브라우저에서 `GET`으로 열었을 때 `405`가 반환된다. 이는 API route가 존재하고 `POST`만 허용한다는 의미입니다.

## 문제 해결

### 배포 빌드가 실패하는 경우

로컬에서 먼저 같은 명령을 실행해 원인을 확인합니다.

```bash
npm ci
npm test
npm run build
```

TypeScript 오류가 있으면 Vercel에서도 동일하게 실패합니다.

### 앱은 뜨지만 GitHub 로그인이 실패하는 경우

다음을 확인하세요.

1. Vercel 배포 로그에서 `/api/github/device/code` 또는 `/api/github/oauth/access_token` 함수 오류가 있는지 확인합니다.
2. API route가 SPA fallback에 가려지지 않는지 확인합니다. 이 저장소의 `vercel.json`은 `/api/*`를 rewrite 대상에서 제외합니다.
3. 자체 OAuth App을 사용하는 경우 `VITE_GITHUB_CLIENT_ID`가 올바른지 확인하고 재배포합니다.

### `/api/github/device/code`에 접속했을 때 405가 보이는 경우

정상입니다. 이 endpoint는 `POST`만 허용합니다. 브라우저 주소창에서 직접 열면 `GET` 요청이므로 `405 method_not_allowed`가 반환됩니다.

### 환경 변수를 바꿨는데 앱에 반영되지 않는 경우

`VITE_*` 환경 변수는 Vite build 시점에 클라이언트 번들에 삽입됩니다. Vercel Project Settings에서 값을 변경한 뒤 새 deployment를 생성하세요.

### Vercel에서 Output Directory를 찾지 못하는 경우

Project Settings 또는 `vercel.json`의 Output Directory가 `dist`인지 확인하세요. 이 프로젝트의 Vite production build는 `dist/`를 생성합니다.