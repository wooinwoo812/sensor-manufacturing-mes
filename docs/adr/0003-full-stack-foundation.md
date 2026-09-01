# ADR-0003: 분리된 React Web과 NestJS API 기반을 사용한다

- Status: Accepted
- Date: 2026-09-01
- Owners: wooinwoo
- Related: #1

## Context

제품 계약만 있는 저장소를 Web, API와 PostgreSQL이 실제로 실행되는 상태로 전환해야 한다. 이후 작업지시·자재·검사·LOT 계보 PR은 같은 설치 명령, TypeScript 계약과 CI를 재사용해야 한다.

이 제품은 검색 유입을 위한 웹사이트가 아니라 1024px 이상의 작업자·관리자 화면에서 복잡한 표, 상태 전이와 오류 복구를 다루는 업무시스템이다. API는 Web 외에도 통합 테스트와 향후 외부 연동 경계가 되며, 제조 transaction과 역할 권한을 UI lifecycle과 분리해 검증해야 한다.

## Decision drivers

- React 기반의 상태 중심 업무 화면과 접근성 검증
- 제조 transaction·권한·감사를 UI와 독립적으로 테스트할 API 경계
- Web과 API를 한 저장소·한 lockfile·같은 품질 명령으로 재현
- PostgreSQL transaction과 migration을 명시적으로 검증
- 한 명이 운영할 수 있는 수준의 구성 비용
- 라이브러리 인지도보다 공식 지원 상태와 실패 진단 가능성 우선

## Evidence and assumptions

- [Node.js 24](https://nodejs.org/en/download/archive/v24)는 LTS이며 2028년 4월까지 지원된다. 이 프로젝트는 최신 Current인 Node 26 대신 검증 범위가 긴 Node 24를 사용한다.
- [Vite Getting Started](https://vite.dev/guide/)는 Node 20.19+ 또는 22.12+를 요구하며 React TypeScript template과 production build를 제공한다.
- [React Versions](https://react.dev/versions)는 React 19.2를 최신 문서 기준 major로 제공한다.
- [NestJS First Steps](https://docs.nestjs.com/first-steps)는 runtime에 Node 20.19+를 요구하고 최신 Active LTS를 권장한다. 2026-09-01 기준 Nest CLI generator는 Node 24.15+를 요구한다.
- [Prisma system requirements](https://docs.prisma.io/docs/orm/reference/system-requirements)는 Node 24와 TypeScript 5.4+를 지원한다. Prisma 8이 현재 major지만 [Prisma 7](https://www.prisma.io/docs/orm/v7)은 계속 지원된다.
- [PostgreSQL 18.6](https://www.postgresql.org/about/news/postgresql-186-1711-1615-1519-1424-and-19-beta-3-released-3365/)은 2026-08-13 공개된 지원 버전이며 보안 수정이 포함된다.
- npm registry의 package metadata를 2026-09-01에 대조한 결과 `typescript-eslint@8.69.0`은 TypeScript `<6.1.0`을 지원한다. 따라서 지원 밖인 TypeScript 7 대신 TypeScript 6.0.3을 선택한다.

공식 문서의 지원 범위는 이 조합이 제품에 자동으로 적합하다는 뜻이 아니다. 실제 적합성은 install, build, health endpoint, component/e2e test와 PostgreSQL healthcheck로 검증한다.

## Considered options

### 1. pnpm workspace + React/Vite + NestJS + PostgreSQL/Prisma

Web과 API를 독립 애플리케이션으로 두고 root 명령과 lockfile을 공유한다.

- 장점: 브라우저 상태와 transaction 경계가 분리되고, Nest module·guard·interceptor를 제조 기능별로 확장할 수 있다.
- 장점: Vite 개발 서버와 component test가 빠르고 SSR 운영비가 없다.
- 비용: 두 프로세스와 CORS·proxy·API 계약을 관리해야 한다.
- 비용: NestJS의 decorator와 module boilerplate를 수용한다.

### 2. Next.js 단일 full-stack 애플리케이션 + Prisma

React UI와 route handler를 하나의 framework와 배포 단위로 합친다.

- 장점: routing, bundling, server rendering과 배포 경로가 통합된다.
- 기각 이유: 현재 제품은 SEO·SSR이 필요 없고, transaction API를 React server lifecycle과 독립적으로 검증하는 가치가 더 크다.
- 더 적합해지는 조건: 공개 조회 화면, server rendering 또는 한 deployment unit이 핵심 제약이 될 때 재검토한다.

### 3. React/Vite + 얇은 Fastify API + SQL query builder

framework 추상화를 줄이고 HTTP와 SQL 경계를 직접 구성한다.

- 장점: runtime 비용과 숨은 동작이 적고 세밀한 제어가 가능하다.
- 기각 이유: 역할 권한·감사·도메인 module이 늘어날 계획에서 DI·module 경계를 직접 표준화하는 비용이 더 크다.
- 더 적합해지는 조건: 측정된 성능 병목이 NestJS adapter에서 발생하거나 API 범위가 health와 소수 endpoint로 고정될 때 재검토한다.

### 4. npm workspaces 또는 Turborepo 추가

- npm workspaces는 추가 도구가 적지만 pnpm의 content-addressable store와 strict dependency 경계를 포기한다.
- Turborepo는 task cache가 유용하지만 앱 두 개와 초기 CI에는 별도 설정·원격 cache 비용이 이점보다 크다.
- workspace 작업이 실제 CI 병목이 되기 전에는 pnpm 자체 filter와 cache만 사용한다.

## Decision tree

```text
화면에 SEO 또는 server rendering이 필수인가?
├─ 예 → Next.js 같은 full-stack framework를 우선 검토
└─ 아니오
   └─ transaction API를 UI lifecycle과 독립 검증해야 하는가?
      ├─ 아니오 → 단일 full-stack 배포를 다시 비교
      └─ 예
         └─ 역할·감사·도메인 module이 여러 기능으로 확장되는가?
            ├─ 예 → React/Vite + NestJS
            └─ 아니오 → React/Vite + 얇은 Fastify API 비교

관계형 transaction과 migration 이력이 핵심인가?
├─ 예 → PostgreSQL
└─ 아니오 → document 또는 embedded database를 별도 검토

schema 기반 type safety와 migration 도구가 필요한가?
├─ 예 → 지원이 안정된 Prisma 7
└─ 아니오 → SQL query builder 비교
```

## Decision

- Runtime: Node.js 24.20.0 LTS
- Package manager: pnpm 11.25.0 workspace
- Language: TypeScript 6.0.3 strict mode
- Web: React 19.2.8, Vite 8.2.2
- API: NestJS 12.0.1 REST API
- Data: PostgreSQL 18.6, Prisma 7.10.0
- Test: Vitest, Testing Library, Supertest
- Quality: ESLint 10, markdownlint-cli2, 저장소 내부 링크 검사
- Delivery foundation: Docker Compose, GitHub Actions

`apps/web`은 HTTP API에만 의존하고 `apps/api` 또는 Prisma 구현을 import하지 않는다. `apps/api`는 Web code를 import하지 않는다. 공유 package는 실제 OpenAPI 또는 공통 불변조건이 생기기 전까지 만들지 않는다.

Prisma 8은 새 major의 운영 증거가 더 쌓일 때까지 보류한다. Prisma 7도 driver adapter를 사용하도록 준비하고, 첫 도메인 schema PR에서 PostgreSQL 연결 lifecycle과 migration rollback을 검증한다.

## Consequences

### Positive

- Web·API가 독립적으로 build·test되면서 한 lockfile과 root 품질 명령을 공유한다.
- UI loading·success·failure와 실제 Nest health endpoint를 같은 PR에서 증명한다.
- PostgreSQL version, local credentials와 healthcheck가 Compose에 명시된다.
- TypeScript 7처럼 lint 생태계 지원 밖인 조합을 피한다.
- 외부 사이트 장애와 무관하게 내부 Markdown 링크를 안정적으로 검사한다.

### Negative

- 개발 시 Web, API, PostgreSQL 세 runtime을 관리한다.
- 같은 origin 배포 전까지 Vite proxy와 제한된 development CORS 설정이 필요하다.
- Prisma 7에서 8로 올릴 때 adapter·CLI 변화에 대한 별도 검증이 필요하다.
- pnpm 11의 build script allowlist와 신규 package release-age 예외를 유지해야 한다.

## Validation

- `corepack pnpm install --frozen-lockfile`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm build`
- `corepack pnpm docs:check`
- `docker compose up -d --wait postgres`
- `corepack pnpm db:check`
- Web에서 health endpoint의 loading·success·failure component test
- Supertest로 `GET /api/health` e2e test
- GitHub Actions에서 같은 root 명령과 PostgreSQL healthcheck 실행

## Revisit triggers

- SEO·SSR·공개 읽기 화면이 제품 요구로 추가된다.
- Web과 API를 별도 배포하면서 생기는 운영비가 단일 full-stack 이점보다 커진다.
- NestJS adapter가 측정된 latency 또는 memory 병목의 주원인이 된다.
- OpenAPI 생성 type 또는 공통 domain package가 실제로 필요해진다.
- Prisma 7 지원 종료가 발표되거나 Prisma 8 migration 비용과 안정성이 검증된다.
- CI가 10분을 반복적으로 초과해 task cache 도구의 이점이 측정된다.
