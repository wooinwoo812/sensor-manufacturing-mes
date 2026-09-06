# ADR-0006: same-origin HttpOnly cookie 세션과 서버 권한을 사용한다

- Status: Proposed
- Date: 2026-09-02
- Owners: wooinwoo
- Related: #10, ADR-QUEUE-06

## Context

다섯 역할의 데모 사용자는 서로 다른 제조 조회와 명령 권한을 가진다. 화면에서 메뉴나 버튼만 숨기면 직접 API 요청으로 권한을 우회할 수 있고, client가 보낸 사용자나 역할을 행위자로 믿으면 감사이력도 신뢰할 수 없다.

Web과 API는 같은 origin으로 배포한다. 개발 환경도 Vite의 `/api` proxy를 사용하므로 브라우저 관점에서는 same-origin 계약을 유지할 수 있다. 이 조건에서 session identifier를 JavaScript 저장소에 노출하거나 임의 origin에 credentialed CORS를 허용할 이유가 없다.

## Decision drivers

- 권한과 감사 행위자의 최종 근거를 서버 세션에 둔다.
- session identifier가 URL, JavaScript 저장소, 로그와 데이터베이스 평문에 남지 않게 한다.
- 로그인 CSRF와 인증 뒤 상태 변경 CSRF를 구분해 방어한다.
- 다섯 역할의 안정적인 seed와 권한표를 E2E에서 반복 검증한다.
- SSO나 외부 identity provider 없이도 로컬과 포트폴리오 데모를 재현한다.
- 이후 제조 command가 같은 guard를 재사용할 수 있어야 한다.

## Evidence and assumptions

- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)는 session identifier에 최소 64비트 entropy, 자체 생성 시 128비트 이상의 CSPRNG, 의미 없는 client 값과 server-side 상태 저장을 권고한다. 또한 `Secure`, `HttpOnly`, 명시적 `SameSite`와 host-only cookie를 설명한다.
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)는 stateful application에 synchronizer token을 권고하고, `Origin` 또는 `Referer`의 정확한 origin 비교와 누락 요청 차단을 방어 계층으로 제시한다.
- [MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)는 `HttpOnly`, `Secure`, `SameSite`와 `__Host-` prefix의 browser 제약을 정의한다.
- [Prisma seeding 문서](https://docs.prisma.io/docs/orm/prisma-migrate/workflows/seeding)는 Prisma 7에서 seed 명령을 `prisma.config.ts`에 명시하고 `prisma db seed`로 별도 실행하는 계약을 제공한다.
- 데모 계정의 식별자와 비밀번호는 공개 가능한 가상 fixture다. 실제 사용자 credential이나 개인정보로 재사용하지 않는다.

## Considered options

### 1. access token을 localStorage에 저장

- 장점: 별도 CSRF token 없이 Authorization header를 사용할 수 있다.
- 기각 이유: origin 안에서 실행되는 JavaScript가 token을 읽을 수 있어 XSS의 credential 탈취 범위가 커진다. 로그아웃과 역할 변경 때 이미 발급한 token의 즉시 무효화도 별도 상태를 요구한다.

### 2. 서명 JWT를 HttpOnly cookie에 저장

- 장점: 매 요청의 session 조회를 줄일 수 있다.
- 기각 이유: 역할 변경, 계정 비활성화와 로그아웃을 즉시 반영하려면 결국 revocation 저장소가 필요하다. 현재 규모에서는 opaque session보다 구성만 늘어난다.

### 3. server-side opaque session + synchronizer CSRF token

- 장점: 계정·역할·만료·폐기를 한 server-side record에서 검증하고 session identifier에는 의미를 담지 않는다.
- 장점: 상태 변경 요청은 server session에 묶인 CSRF token과 정확한 origin을 함께 검증한다.
- 비용: 인증 요청마다 PostgreSQL 조회가 필요하고 만료 session 정리 정책을 운영해야 한다.
- 판정: 채택한다.

### 4. SameSite만으로 CSRF 방어

- 기각 이유: SameSite는 방어 계층이지 모든 배포와 browser에서 synchronizer token을 대체하지 않는다. same-site sibling host와 client-side CSRF 경계도 남는다.

### 5. OAuth·SSO identity provider

- 장점: 실제 조직 계정 lifecycle과 MFA를 위임할 수 있다.
- 기각 이유: 현재는 외부 조직과 identity provider가 없고 다섯 고정 데모 계정이 검증 대상이다. 실제 배포 조직이 정해질 때 재검토한다.

## Decision

### 인증과 session

- `User`, `Role`, `UserRole`, `Session`을 PostgreSQL에 저장한다. active role은 session이 소유하고 client request body의 actor나 role을 신뢰하지 않는다.
- 비밀번호는 Node.js `scrypt`와 사용자별 16-byte random salt로 hash한다. 로그인 실패 응답은 계정 존재 여부와 비활성 여부를 구분하지 않는다.
- 로그인은 기존 session을 폐기하고 32-byte CSPRNG로 새 opaque identifier를 발급한다. 데이터베이스에는 SHA-256 hash만 저장한다.
- session은 발급 후 8시간의 고정 만료를 가지며 logout에서 즉시 폐기한다. 만료되거나 폐기된 session은 인증 실패로 처리한다.
- 개발 cookie 이름은 `mes_session`, production은 `__Host-mes_session`이다. 둘 다 `Path=/`, `HttpOnly`, `SameSite=Lax`, `Domain` 없음과 browser-session 수명을 사용하고 production에는 `Secure`를 강제한다.

### CSRF와 origin

- `POST`, `PUT`, `PATCH`, `DELETE`는 server 설정의 `WEB_ORIGIN`과 `Origin`을 URL origin 단위로 정확히 비교한다. `Origin`이 없으면 `Referer` origin을 비교하고 둘 다 없거나 파싱할 수 없으면 거부한다.
- 로그인은 session 전 요청이므로 origin 검증과 JSON content type을 요구한다. 성공 시 이전 identifier를 재사용하지 않고 새 session을 만든다.
- 인증된 session은 별도 32-byte synchronizer CSRF token을 가진다. `/auth/login`과 `/auth/me`가 token을 response body로 전달하고 Web은 memory에만 보관한다.
- 인증된 unsafe request는 `X-CSRF-Token`을 요구하고 server session 값과 timing-safe 비교한다. session cookie, CSRF token과 비밀번호를 로그에 기록하지 않는다.
- NestJS의 credentialed CORS를 활성화하지 않는다. 개발과 production 모두 Web의 same-origin `/api` 경로를 사용한다.

### 권한

- 역할별 permission matrix는 API code가 소유하고 `/auth/me`가 현재 session에 허용된 permission만 반환한다. Web은 이 응답으로 route와 action UX를 제어한다.
- API의 session guard와 permission guard가 같은 matrix를 최종 강제한다. 제조 command는 필요한 permission을 metadata로 선언해야 한다.
- 2026-09-06 사용자 승인 변경: 초기의 조회·감사 중심 SYSTEM_ADMIN을 최고관리자로 확장한다. 기존 역할 코드와 계정을 유지하고 대시보드에서 시작하며 생산·자재·공정·검사·품질·사용자 관리 permission을 명시적으로 부여한다. 공통 permission guard·CSRF·Origin·세션 검사와 제조 상태 전이·감사 기록을 우회하지 않는다. 신규 권한은 코드 목록과 회귀 테스트에서 함께 검토한다.
- 역할 전환은 이전 session을 logout한 뒤 다른 데모 계정으로 새 로그인한다. 이전 역할의 session과 client cache를 재사용하지 않는다.

## Consequences

### Positive

- Web 구현과 무관하게 API가 사용자, 역할과 permission을 검증한다.
- session 탈취에 유용한 평문 identifier가 데이터베이스와 JavaScript 저장소에 없다.
- 로그인, logout, 역할 전환과 만료가 즉시 server state에 반영된다.
- 이후 command는 permission metadata와 공통 guard만 추가하면 같은 경계를 사용한다.

### Negative

- 모든 보호 API에 session 조회 비용이 생긴다.
- 여러 API instance를 운영하면 만료 session 정리와 PostgreSQL 가용성이 인증 경로에 포함된다.
- 공개 데모 credential은 실제 보안 credential로 간주할 수 없으며 production 조직 인증을 증명하지 않는다.
- Web과 API를 다른 origin으로 배포하려면 이 ADR을 재검토해야 한다.

## Validation

- 다섯 역할의 seed, 시작 route와 permission matrix를 parameterized test로 대조한다.
- 올바른 로그인, 동일한 일반 오류를 반환하는 잘못된 email·password, logout과 만료 session을 Supertest로 검증한다.
- cookie의 `HttpOnly`, `SameSite=Lax`, `Path=/`와 production `Secure`·`__Host-` 이름을 검사한다.
- 허용되지 않은 origin, 누락 origin, 누락·불일치 CSRF token 요청이 상태 변경 전에 거부되는지 검사한다.
- permission guard가 같은 command를 역할별로 허용 또는 403 거부하는지 API와 Web direct route test로 검증한다.
- 응답과 test output에 password hash, session identifier와 cookie 값이 포함되지 않는지 검사한다.
- migration 적용·rollback·재적용, lint, typecheck, test, build와 `git diff --check`를 통과한다.

## Revisit triggers

- 실제 조직 계정, SSO, MFA, password reset 또는 account recovery가 요구된다.
- Web과 API를 서로 다른 origin으로 배포해야 한다.
- session 조회가 측정된 성능 병목이 되거나 PostgreSQL 장애와 인증 가용성을 분리해야 한다.
- 여러 역할을 가진 실제 사용자의 active role 변경 정책이 필요해진다.
- 공개 배포에서 rate limit을 application이 직접 소유해야 한다.
