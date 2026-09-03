# ADR-0004: 선택적 UI 이식과 Feature-Sliced frontend 구조를 사용한다

- Status: Proposed
- Date: 2026-09-01
- Owners: wooinwoo
- Related: #9, #25, #28

## Context

센서 제조 MES에는 7개 업무영역과 17개 하위 화면, 역할별 행동, 상태 표현과 반응형 계약이 있다. 이제 React 구현을 시작하려면 외부 UI reference를 어느 수준까지 재사용할지, MES code를 어떤 경계로 나눌지, 화면과 URL을 누가 소유할지 결정해야 한다.

[`shadcn-admin`](https://github.com/satnaing/shadcn-admin)은 React·Vite·shadcn/ui 기반의 반응형 sidebar, table, dialog와 접근성 패턴을 제공한다. 그러나 저장소 자체가 starter가 아니라고 밝히며 일부 shadcn component를 직접 수정한다. 범용 dashboard의 task, user, chat, settings, Clerk 예제도 MES 업무와 다르다. 전체 source tree를 복제하면 빠른 시작 대신 불필요한 기능, 외부 구조와 update 비용까지 함께 소유하게 된다.

우리 Web은 작업지시, 자재 LOT, 공정 실행, 검사, 사후 부적합과 계보처럼 관계가 강한 업무를 다룬다. 공통 component 중심 구조로 시작하면 업무 규칙이 `components`, `hooks`, 전역 store로 퍼질 수 있다. 반대로 모든 domain object를 미리 slice로 만들면 구현 근거가 없는 빈 추상화가 생긴다.

목록 filter·정렬·pagination, 상세 tab과 계보 방향은 새로고침·뒤로 가기·공유 후에도 유지돼야 한다. 인증과 역할 전환은 route 접근을 바꾸지만 client route guard가 실제 보안 경계가 되어서는 안 된다.

## Decision drivers

- 기존 UI 계약과 MES 용어를 source tree에서 바로 찾을 수 있어야 한다.
- domain code가 범용 UI와 router implementation에 섞이지 않아야 한다.
- route path, parameter, search state와 navigation이 TypeScript에서 검증돼야 한다.
- 1440·1280·현장 1024px가 같은 URL과 업무 정체성을 유지해야 한다.
- 외부 source의 장점만 재사용하고 provenance와 license를 보존해야 한다.
- #9~#18이 같은 구조를 사용하되 필요하지 않은 layer나 slice를 미리 만들지 않아야 한다.
- 인증 화면 guard와 NestJS API authorization의 책임을 분리해야 한다.

## Evidence and assumptions

- [Feature-Sliced Design layer 규칙](https://feature-sliced.design/docs/reference/layers)은 `app → pages → widgets → features → entities → shared`의 책임과 하향 import를 정의하며 `processes` layer를 deprecated로 분류한다.
- [FSD slice·segment 규칙](https://feature-sliced.design/docs/reference/slices-segments)은 같은 layer의 slice를 독립적으로 유지하고 외부 접근을 public API로 제한한다.
- [TanStack Router file-based routing](https://tanstack.com/router/latest/docs/routing/file-based-routing)은 Vite에서 route tree 생성, type-safe path와 자동 code splitting을 지원한다.
- [TanStack Router search parameter](https://tanstack.com/router/latest/docs/guide/search-params)는 URL 입력을 schema로 검증하고 typed state로 다룬다.
- [TanStack Router authenticated route](https://tanstack.com/router/latest/docs/guide/authenticated-routes)는 `beforeLoad`를 UI 접근 gate로 제공하면서 API authorization이 별도 보안 경계임을 명시한다.
- 조사 기준 upstream은 [`shadcn-admin@e16c87f`](https://github.com/satnaing/shadcn-admin/commit/e16c87f213a5ba5e45964e9b67c792105ec74d26)이다. 이 version의 mobile sidebar는 Sheet, desktop sidebar는 collapse pattern을 사용하고 data table은 horizontal overflow·filter·pagination을 제공한다.
- [TanStack Router external data loading](https://tanstack.com/router/latest/docs/guide/external-data-loading)은 router loader가 TanStack Query 같은 외부 cache의 critical query를 미리 보장하고 component가 같은 cache를 구독하는 방식을 제공한다.
- 외부 reference가 제품 적합성을 자동으로 보장한다는 가정은 하지 않는다. 실제 적합성은 우리 screen fixture, keyboard navigation과 viewport 검증으로 확인한다.

## Considered options

### 1. `shadcn-admin`을 fork하고 기존 구조를 유지한다

- 장점: sidebar, route, table과 demo page를 가장 빠르게 실행할 수 있다.
- 비용: Clerk·chat·settings·task domain과 fake data를 제거해야 하고 upstream custom component 변경을 계속 추적해야 한다.
- 기각 이유: 화면 외형보다 MES domain 경계와 실패 상태가 핵심이며, 전체 fork는 불필요한 code ownership과 복제본 인상을 만든다.

### 2. 필요한 UI만 선별 이식하고 FSD로 다시 배치한다

- 장점: 검증된 shell·primitive를 활용하면서 MES slice, route와 state ownership을 우리 계약에 맞출 수 있다.
- 비용: source별 provenance, component diff와 update 여부를 직접 관리해야 한다.
- 채택 조건: 외부 파일을 가져오기 전에 목적지 layer와 제외할 demo dependency가 명시돼야 한다.

### 3. 외부 code 없이 모든 UI를 처음부터 만든다

- 장점: source와 naming을 완전히 통제한다.
- 기각 이유: sidebar, dialog, table, focus management 같은 범용 문제를 다시 해결하는 비용이 제품 차별점에 기여하지 않는다.

### 4. React Router를 사용한다

- 장점: 넓은 생태계와 Data/Framework mode가 있고 route module type을 생성할 수 있다.
- 기각 이유: 현재 SPA는 SSR·framework mode가 필요하지 않고, 목록 search state의 schema validation과 inherited typing이 핵심 요구다. 이 범위에서는 TanStack Router가 별도 adapter를 줄인다.
- 재검토 조건: server rendering 또는 React Router framework 기능이 실제 제품 요구가 된다.

### 5. TanStack Router를 code-based 방식으로 사용한다

- 장점: route source를 한 파일에서 통제하고 code generation이 없다.
- 기각 이유: route 수가 늘수록 tree generic과 code splitting 구성이 장황해진다. Vite plugin을 이미 사용할 수 있으므로 file route의 type generation 비용이 더 낮다.

### 6. Router cache만 사용하거나 domain data를 global store에 복제한다

- Router cache 장점: dependency가 적고 route 단위 preload가 단순하다.
- 기각 이유: 작업지시·LOT·검사·계보 data를 여러 route가 함께 사용하고 command 뒤 일부 query를 정확히 invalidate해야 한다. route cache만으로는 shared cache와 mutation API가 부족하다.
- global store 기각 이유: API가 가진 server truth를 Context·Zustand에 다시 복제하면 stale state와 초기화 책임이 늘어난다.
- 선택: route loader는 critical query를 `QueryClient`에 보장하고 TanStack Query가 cache·mutation lifecycle의 단일 소유자가 된다.

## Decision tree

```text
외부 화면 전체가 우리 domain·route·auth 계약과 같은가?
├─ 예 → fork 후보를 license·update 비용과 함께 검토
└─ 아니오
   └─ 검증된 shell·primitive가 있는가?
      ├─ 예 → provenance를 남기고 FSD 목적지로 선별 이식
      └─ 아니오 → 우리 design token 위에서 새로 구현

화면 상태가 새로고침·공유·뒤로 가기 뒤에도 유지돼야 하는가?
├─ 예 → path 또는 검증된 search parameter
└─ 아니오
   └─ server에서 다시 조회해야 하는가?
      ├─ 예 → TanStack Query cache
      └─ 아니오 → feature 또는 component local state

module이 독립적인 사용자 행동인가?
├─ 예 → 여러 화면에서 재사용될 때 feature
└─ 아니오
   └─ 업무 대상 자체인가?
      ├─ 예 → entity
      └─ 아니오 → page 안에 두고 재사용 근거가 생길 때 추출
```

## Decision

### 외부 UI source

- `shadcn-admin`은 완성 제품 base가 아니라 interaction·component reference로 사용한다.
- `components/ui`, domain-neutral data table, responsive sidebar 동작만 파일 단위로 검토한다.
- dashboard, task, user, chat, settings, Clerk, fake data, logo와 image asset은 가져오지 않는다.
- 실질적으로 복제하거나 수정한 파일은 구현 PR에서 source commit·원본 경로를 기록한다.
- MIT copyright notice는 `THIRD_PARTY_NOTICES.md`와 필요한 source header에 보존한다.
- shadcn CLI update는 외부 저장소의 custom diff를 자동으로 덮어쓰지 않고 우리 component test 후 반영한다.

### FSD 구조

- layer는 `app`, `pages`, `widgets`, `features`, `entities`, `shared`만 사용한다.
- deprecated `processes`와 임의의 추가 layer는 만들지 않는다.
- 의존은 자신보다 아래 layer만 향한다. 같은 layer의 다른 slice를 직접 import하지 않는다.
- slice 외부에서는 각 slice의 `index.ts` public API만 import한다.
- `ui`, `api`, `model`, `lib`, `config`처럼 목적을 나타내는 segment를 사용하고 전역 `components`, `hooks`, `types`, `utils` dump folder를 만들지 않는다.
- 구현하지 않은 미래 slice와 빈 directory는 미리 만들지 않는다.
- entity 간 결합은 page·feature에서 조합한다. `@x` cross-reference는 실제 순환 type 요구와 별도 검토가 있을 때만 허용한다.

### Router

- `@tanstack/react-router`의 file-based routing과 Vite plugin을 사용한다.
- route source는 `apps/web/src/app/routes`, generated tree는 `apps/web/src/app/routeTree.gen.ts`에 둔다.
- generated route tree는 runtime source이므로 commit하되 lint·format 대상으로 수정하지 않는다.
- route file은 path/search schema, `beforeLoad`, pending/error/not-found boundary와 page 연결만 소유한다.
- route file은 `pages` public API를 import하며 business mutation과 화면 markup을 소유하지 않는다.
- route path의 단일 진실 공급원은 generated route tree다. 별도 문자열 route registry를 중복 작성하지 않는다.
- UI navigation은 typed `Link`·`navigate`를 사용한다. reusable widget은 가능하면 navigation item이나 callback을 prop으로 받는다.

### State ownership

- URL state: identity, list filter·sort·page, detail tab, trace direction처럼 공유 가능한 상태
- server state: TanStack Query query cache; entity 조회와 feature mutation이 소유
- form state: 복합 업무 form은 feature 내부 React Hook Form + schema validation, 단일 제어값은 React local state
- local UI state: dialog open, hover, 임시 selection처럼 복원할 필요 없는 상태
- app state: session provider, query client, theme처럼 전체 실행에 필요한 상태만 허용
- Zustand 같은 별도 global domain store는 기본값으로 도입하지 않는다. route와 server cache로 표현할 수 없는 cross-route draft가 증명될 때 ADR 없이 해당 Issue의 근거로 재검토한다.

### Authorization

- route metadata와 `beforeLoad`는 메뉴 노출과 화면 진입 UX만 통제한다.
- NestJS API는 모든 조회·상태변경 요청에서 permission과 현재 domain state를 다시 검증한다.
- 메뉴 숨김, disabled button 또는 client cache를 authorization 근거로 사용하지 않는다.

## Consequences

### Positive

- source tree가 MES 용어와 사용자 행동을 드러낸다.
- route·검색 상태가 타입과 runtime schema 양쪽에서 검증된다.
- 외부 UI의 반응형·접근성 장점을 유지하면서 범용 admin demo dependency를 제거한다.
- server state, URL state와 form state의 중복 source of truth를 줄인다.
- 화면별 PR이 같은 route와 import contract 아래 수직으로 구현될 수 있다.

### Negative

- file route code generation과 generated source 관리가 추가된다.
- FSD public API와 import boundary를 지키는 초기 비용이 있다.
- 외부 component를 그대로 update할 수 없고 provenance와 local diff를 추적해야 한다.
- MES entity 관계가 강해 page·feature orchestration code가 일부 길어질 수 있다.

## Validation

- `apps/web/src/app/routes`의 route file이 `pages` public API 외 내부 경로를 deep import하지 않는지 검사한다.
- architecture lint가 역방향 layer import와 same-layer cross-slice import를 실패시킨다.
- 모든 `SCR-01A`~`SCR-07B`가 [route 계약](../product/route-contract.md)에 연결되는지 검사한다.
- 잘못된 path/search parameter, 직접 URL 접근, 새로고침, 권한 없음과 role switch를 route test로 검증한다.
- `shadcn-admin`에서 이식한 파일은 source provenance, license와 우리 component test를 함께 가진다.
- `corepack pnpm docs:check`, lint, typecheck, test와 build를 통과한다.

## Revisit triggers

- SSR·SEO 또는 route-level server rendering이 제품 요구가 된다.
- TanStack Router generated type이 TypeScript build의 측정된 병목이 된다.
- 3개 이상의 route에서 유지해야 하는 복합 offline draft가 생긴다.
- entity `@x` 없이 표현할 수 없는 실제 순환 type 관계가 반복된다.
- `shadcn-admin` 이식량이 새 구현량보다 커져 upstream merge 비용이 반복된다.
- 모바일 전용 정보구조가 필요해 동일 route·responsive layout 원칙이 사용자 검증에서 실패한다.
