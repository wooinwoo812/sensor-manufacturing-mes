---
version: 1
slug: "apps-web-src-pages-login-ui-loginpage-tsx"
primary_target: "apps/web/src/pages/login/ui/LoginPage.tsx"
related_targets: ["apps/web/src/app/routes/login.tsx"]
---

# Login surface brief

- Scope: `/login` 데모 인증 진입 화면과 다섯 역할 선택 상태.
- Visitor mode: Invite. 포트폴리오 평가자와 제조 업무 사용자가 5분 데모를 시작한다.
- Job: 역할별로 어떤 업무를 시작하는지 이해하고 한 번의 선택으로 실제 서버 세션에 진입한다.
- Primary action: 생산계획, 현장 작업, 자재, 품질, 관리자 중 하나의 가상 계정으로 로그인한다.
- Proof and content: 각 역할의 책임과 시작 화면, 모든 정보가 가상이라는 고지, HttpOnly session과 API 권한이 적용된다는 사실.
- Constraints: 실제 기업·방산 데이터 금지, generic credential form 비노출, keyboard·loading·실패·dark mode·mobile 지원, 외부 redirect 금지.
- Direction: 기존 cool-neutral/cobalt MES를 확장한 정밀 출입 명부. 마케팅 hero나 같은 크기의 카드 갤러리 대신 하나의 역할 목록에서 책임과 진입점을 빠르게 비교한다.
- Memorable moment: 선택한 역할 행만 cobalt 상태선과 진행 표시로 바뀌며, 성공 뒤 해당 역할의 canonical 시작 route로 즉시 교대된다.
- Unresolved: 실제 조직 계정과 SSO는 현재 범위 밖이다.
