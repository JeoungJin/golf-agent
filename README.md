# 골프사랑

스크린골프·필드 모임 회원용 모바일 우선 웹앱(PWA). Next.js + Supabase + Vercel 무료 티어로 운영합니다.

현재 기능(`specs/001-kakao-login-home`): 카카오 로그인, 가입 승인(첫 가입자는 매니저), 홈 대시보드(가장 가까운 라운딩·최신 공지), 공지 등록·수정·삭제, 홈 화면에 추가 안내.

## 로컬 개발

```bash
npm install
npx supabase start          # Docker Desktop 필요. 출력된 URL/키를 .env.local 에 복사 (.env.example 참고)
npx supabase db reset       # 마이그레이션 + 시드(개발용 샘플 라운딩)
npm run dev
```

### 로컬에서 카카오 로그인 쓰기
`supabase/.env.example`을 `supabase/.env`로 복사해 REST API 키와 클라이언트 시크릿을 넣고 `npx supabase stop && npx supabase start`로 재시작합니다(`config.toml`에 provider가 이미 켜져 있음). E2E는 카카오를 거치지 않고 세션을 주입하므로 이 설정 없이도 동작합니다.

## 테스트

```bash
npm run check      # lint + tsc + Vitest(도메인 100% 커버리지 기준)
npm run test:db    # pgTAP: RLS·승인 RPC·트리거 (E2E 후에는 먼저 `npx supabase db reset` — 남은 사용자가 있으면 실패)
npm run test:e2e   # Playwright (360px), 로컬 Supabase 실행 필요
```

## 배포 절차

배포는 아래 순서로 한 번만 진행합니다. 비용은 모두 무료 티어 안에서 발생하지 않습니다.

### 1. Supabase 프로젝트
1. https://supabase.com 에서 새 프로젝트를 만듭니다(리전: Northeast Asia/Seoul 권장).
2. 로컬에서 연결 후 마이그레이션을 적용합니다. `seed.sql`은 개발용이라 운영에는 적용되지 않습니다.
   ```bash
   npx supabase login
   npx supabase link --project-ref <프로젝트 ref>
   npx supabase db push
   ```
3. Project Settings > API 에서 `Project URL`과 `anon public` 키를 확인합니다. **service_role 키는 어디에도 등록하지 않습니다**(앱은 사용하지 않고, 로컬 E2E 테스트에서만 씁니다).

### 2. 카카오 개발자 콘솔
1. https://developers.kakao.com 에서 애플리케이션을 만들고 **카카오 로그인**을 활성화합니다.
2. **Redirect URI**에 `https://<프로젝트 ref>.supabase.co/auth/v1/callback` 을 등록합니다.
3. 동의항목은 **닉네임, 프로필 사진**만 설정합니다(개인정보 최소 수집). 이메일은 요청하지 않습니다.
   - **주의**: Supabase Auth는 앱이 보낸 scope와 무관하게 `account_email`을 함께 요청합니다. 카카오 콘솔에 이메일 동의항목이 없으면 "설정하지 않은 동의 항목: account_email" 오류가 납니다. 이메일이 "동의불가"로 보이면 앱을 **개인 개발자 비즈 앱으로 전환**(사업자 등록 불필요)한 뒤 `카카오계정(이메일)`을 **선택 동의**로 설정하세요. 선택 동의라 거부해도 로그인되려면 Supabase의 "Allow users without an email"이 필요합니다(아래 3번).
   - 이메일에 동의한 사용자는 Supabase 내부 `auth.users`에 이메일이 저장됩니다(앱 테이블 `members`에는 저장하지 않음).
   - 로컬 개발용 Redirect URI도 추가합니다: `http://localhost:54321/auth/v1/callback`, `http://127.0.0.1:54321/auth/v1/callback`
4. 앱 키 > **REST API 키**(= Client ID)와 보안 > **Client Secret**을 발급·활성화합니다.

### 3. Supabase 인증 설정 (Dashboard > Authentication)
1. Providers > **Kakao** 활성화 후 Client ID(REST API 키), Client Secret 입력. **Allow users without an email** 켜기.
2. URL Configuration:
   - Site URL: `https://<배포 도메인>`
   - Redirect URLs: `https://<배포 도메인>/auth/callback`

### 4. Vercel
1. Vercel에서 저장소를 Import 합니다(Framework: Next.js 자동 감지).
2. Environment Variables 에 두 개만 등록합니다.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. 배포 후 발급된 도메인을 위 3번의 Site URL / Redirect URLs 에 반영합니다(필요 시 재배포 없이 Supabase 설정만 수정).

### 5. 첫 가입자 = 매니저
운영 DB에서 **가장 먼저 카카오 로그인한 계정이 매니저**가 되고 자동 승인됩니다. 배포 직후 운영자가 먼저 로그인하세요. 이후 가입자는 승인 대기 상태가 되며 `/admin/members`에서 승인합니다.

## 운영 메모
- Supabase 무료 프로젝트는 약 1주 비활성 시 일시 중지됩니다. 주기적으로 접속하거나 대시보드에서 재개하세요.
- 라운딩 일정 등록 화면은 다음 스펙에서 추가됩니다. 그 전까지 라운딩은 Supabase 대시보드(Table Editor > rounds)에서 직접 입력합니다.
- 아이콘(`public/icons/`)은 임시 이미지입니다. 모임 로고로 교체하세요(192, 512, maskable 512).

## 배포 후 수동 점검 (quickstart.md 시나리오)
`specs/001-kakao-login-home/quickstart.md`의 8개 시나리오를 iOS Safari·Android Chrome 실기기에서 확인합니다. 특히 실제 카카오 로그인, iOS 공유 버튼 안내, Android 설치 버튼은 자동 테스트로 검증할 수 없습니다.
