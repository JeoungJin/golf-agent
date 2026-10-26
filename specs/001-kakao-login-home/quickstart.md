# Quickstart: 검증 가이드

## 사전 준비
- Node.js 20+, Docker Desktop(로컬 Supabase/pgTAP용), Supabase CLI
- 카카오 개발자 앱 생성: 동의항목 닉네임·프로필 이미지, Redirect URI에 Supabase 콜백 등록
- `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`.env.example` 참고)

## 실행
```bash
npm install
supabase start && supabase db reset   # 마이그레이션 + 시드
npm run dev
```

## 테스트
```bash
npm run test          # Vitest 단위/컴포넌트
supabase test db      # pgTAP (RLS, RPC, 트리거)
npm run test:e2e      # Playwright
```

## 시나리오 검증
1. 비로그인으로 `/` 접속 → `/login` 이동 (US1)
2. 첫 계정 로그인 → 홈 표시, 매니저 (US1-B 5)
3. 둘째 계정 로그인 → `/pending`만 접근 가능 (US1-B 1)
4. 매니저가 `/admin/members`에서 승인 → 둘째 계정 홈 접근 (US1-B 2)
5. 매니저가 공지 등록 → 멤버 홈에 최신 공지 표시, 멤버는 작성 버튼 없음 (US3)
6. 시드 라운딩이 있으면 홈에 가장 가까운 미래 라운딩 1건 표시, 없으면 빈 상태 (US2)
7. 모바일 브라우저 첫 접속 시 설치 팝업, 닫기 후 7일간 미표시 (US4)
8. 360px 폭에서 가로 스크롤 없음 (SC-006)

## 운영 메모
- 배포: Vercel에 저장소 연결, 환경변수 등록.
- Supabase 무료 프로젝트는 약 1주 비활성 시 일시 중지되므로 주기적 접속이 필요하다.
