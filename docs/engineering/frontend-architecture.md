# Frontend 구조 계약

> `shadcn-admin`의 검증된 shell·primitive를 선별 이식하고 MES code를 Feature-Sliced Design으로 구성하기 위한 구현 계약

| 항목 | 내용 |
|---|---|
| 상태 | 사전설계 v1.0 |
| 관련 Issue | [#28](https://github.com/wooinwoo/sensor-manufacturing-mes/issues/28) |
| 결정 | [ADR-0004](../adr/0004-frontend-architecture-and-routing.md) |
| 화면·URL | [Route 계약](../product/route-contract.md) |
| 업무·상태 | [제품·UX·기술 기획](../product/product-plan-cross-review.md), [도메인 계약](../domain/manufacturing-domain-contract.md) |

## 1. 목표와 비목표

이 구조의 목표는 폴더 수를 늘리는 것이 아니라 다음 질문의 답을 source 위치로 드러내는 것이다.

- 어떤 MES 대상을 표현하는가?
- 사용자가 그 대상으로 어떤 행동을 하는가?
- 어느 화면이 여러 대상과 행동을 조합하는가?
- 어느 code가 제품과 무관한 기반인가?

다음은 목표가 아니다.

- 모든 업무 명사를 미리 entity slice로 생성
- 모든 button click을 feature로 분리
- 한 파일을 한 layer에 억지로 맞추기 위한 wrapper 추가
- frontend에 server domain model을 그대로 복제
- 범용 `components`, `hooks`, `types`, `utils` directory 재생성

## 2. 목표 source tree

아래 tree는 구현이 진행된 뒤의 목표 형태다. 비어 있는 directory를 한 번에 생성하지 않고 각 Issue에서 필요한 slice만 추가한다.

```text
apps/web/src/
├─ app/
│  ├─ entrypoint/
│  ├─ providers/
│  ├─ routes/
│  ├─ styles/
│  └─ routeTree.gen.ts
├─ pages/
│  ├─ login/
│  ├─ dashboard/
│  ├─ work-order-list/
│  ├─ work-order-create/
│  ├─ work-order-detail/
│  ├─ material-lot-list/
│  ├─ process-execution/
│  ├─ inspection-execution/
│  ├─ quality-incident/
│  ├─ traceability/
│  └─ audit-event-list/
├─ widgets/
│  ├─ app-shell/
│  ├─ process-workbench/
│  ├─ inspection-workbench/
│  └─ trace-workbench/
├─ features/
│  ├─ auth/login-as-role/
│  ├─ auth/switch-role/
│  ├─ work-order/create/
│  ├─ work-order/release/
│  ├─ inventory/reserve-material/
│  ├─ production/start-process/
│  ├─ production/record-output/
│  ├─ quality/submit-inspection/
│  ├─ quality/register-incident/
│  └─ traceability/change-direction/
├─ entities/
│  ├─ session/
│  ├─ work-order/
│  ├─ production-lot/
│  ├─ material-lot/
│  ├─ process-execution/
│  ├─ inspection/
│  ├─ quality-incident/
│  ├─ trace-node/
│  └─ audit-event/
└─ shared/
   ├─ api/
   ├─ config/
   ├─ lib/
   │  ├─ date-time/
   │  ├─ identifier/
   │  └─ quantity/
   └─ ui/
```

예시 이름은 생성 명령이 아니다. 실제 code가 page 안에서 한 번만 쓰이고 독립 가치가 없다면 page에 유지한다.

## 3. Layer 책임

| Layer | 책임 | MES 예시 | 금지 |
|---|---|---|---|
| `app` | application bootstrap과 전역 policy | provider, router, global error boundary, token·font | domain mutation 구현 |
| `pages` | route 하나가 렌더링할 화면 조합 | 작업지시 상세, 검사 실행 | 다른 page import, 범용 primitive 정의 |
| `widgets` | 독립적으로 읽히는 큰 UI block·layout | AppShell, 계보 workbench | page import, 단일 button만 감싸기 |
| `features` | 사용자가 업무 대상으로 수행하는 행동 | 작업지시 릴리스, 자재 예약 | 다른 feature slice import, 단순 entity 표시 |
| `entities` | 사용자가 이해하는 업무 대상의 표현·조회 | WorkOrder, MaterialLot, Inspection | 다른 entity 직접 import, 화면 flow orchestration |
| `shared` | 제품 domain과 무관한 기반 | Button, HTTP client, date formatter | WorkOrder·LOT 같은 업무 용어와 규칙 |

의존 방향은 아래로만 향한다.

```text
app → pages → widgets → features → entities → shared
```

- 인접 layer를 반드시 거칠 필요는 없다. 예를 들어 page는 widget 없이 feature·entity·shared를 직접 조합할 수 있다.
- `app`과 `shared`는 slice가 아니라 segment로 구성한다.
- 같은 layer의 다른 slice를 import하지 않는다.
- entity 관계는 feature, widget 또는 page에서 조합한다.
- 예외적인 entity type cross-reference는 `@x` public API와 근거를 같은 PR에 기록한다.
- `features/auth/*` 같은 중간 directory는 탐색을 위한 slice group일 뿐이다. group root에는 공유 code나 `index.ts`를 두지 않는다.

## 4. Slice와 segment

slice는 업무 목적, segment는 기술적 역할로 이름을 붙인다.

```text
features/inventory/reserve-material/
├─ api/
├─ model/
├─ ui/
├─ lib/
└─ index.ts
```

허용되는 기본 segment는 다음과 같다.

- `ui`: rendering, interaction과 해당 slice의 접근성 표현
- `api`: endpoint adapter, query·mutation option과 DTO mapping
- `model`: schema, state, selector와 client business rule
- `lib`: 이 slice 안에서만 사용하는 작은 library
- `config`: feature flag와 slice-local configuration

`components`, `hooks`, `types`, `utils`는 목적을 설명하지 못하므로 segment 이름으로 사용하지 않는다. hook은 소유 목적에 따라 `model`, `ui` 또는 `lib`에 둔다.

## 5. Public API와 import 규칙

모든 slice와 `app`·`shared`의 외부 노출 segment는 `index.ts` public API를 가진다.

```ts
// 허용
import { WorkOrderStatusBadge } from '@/entities/work-order'
import { ReleaseWorkOrderButton } from '@/features/work-order/release'

// 금지: slice 내부 deep import
import { WorkOrderStatusBadge } from '@/entities/work-order/ui/work-order-status-badge'

// 금지: 같은 layer slice 간 import
import { MaterialLot } from '@/entities/material-lot/model/types'
```

Public API는 외부에 필요한 symbol만 export한다. `export *`로 내부 전체를 노출하지 않고 refactor 시 호환 경계를 유지한다.

구현 단계에서는 ESLint architecture rule과 fixture test로 다음을 실패시킨다.

1. 낮은 layer가 높은 layer import
2. 같은 layer의 다른 slice import
3. `index.ts`를 우회한 deep import
4. `shared`에 MES domain 이름 또는 server mutation 배치
5. route file이 page 내부 구현 deep import

## 6. `shadcn-admin` 선별 이식 mapping

| 원본 영역 | 우리 목적지 | 판단 |
|---|---|---|
| `src/components/ui/*` | `shared/ui/shadcn/*` | 원본 primitive 전체를 이동하고 local token·test 적용 |
| `src/components/data-table/*` | `shared/ui/shadcn/data-table/*` | 원본 sorting·pagination·column control을 이동하고 MES table에서 조합 |
| `authenticated-layout` | `app/routes` + `widgets/app-shell` | route guard와 layout rendering을 분리해 재작성 |
| `app-sidebar`, `header`, `main` | `widgets/app-shell/ui` | navigation data와 session action은 prop으로 주입 |
| theme·layout context | `app/providers`, `app/styles` | 지원하기로 결정한 option만 유지 |
| command menu | 향후 전역 검색 feature | #9에서 빈 검색 UI를 복제하지 않음 |
| `features/tasks` | 이식하지 않음 | table interaction만 참고하고 WorkOrder page로 새로 구현 |
| routes·generated tree | 이식하지 않음 | [우리 route 계약](../product/route-contract.md)에서 재생성 |
| Zustand store | 이식하지 않음 | 실제 cross-route client state가 생길 때만 도입 검토 |
| Clerk auth | 이식하지 않음 | same-origin HttpOnly session과 #10 계약 사용 |
| dashboard·chat·apps·settings·users demo | 이식하지 않음 | MES 범위와 무관 |
| logo·image·fake data | 이식하지 않음 | 외부 branding·demo 식별자 제거 |

최초 조사 기준은 [`shadcn-admin@e16c87f`](https://github.com/satnaing/shadcn-admin/commit/e16c87f213a5ba5e45964e9b67c792105ec74d26)이며 구현 전에 upstream HEAD를 무조건 다시 복제하지 않는다.

원본 UI source 123개는 `apps/web/vendor/shadcn-admin`에 고정 snapshot으로
보존한다. 이 directory는 실행·검사 대상이 아니며, 활성 code는 해당 파일을
FSD 목적지로 이동하고 import·token·업무 문구를 수정한 결과다. 따라서 전체
template를 기준으로 시작하면서도 원본 demo route가 제품 runtime에 섞이지 않는다.

이식 전 각 파일은 다음 질문을 통과해야 한다.

```text
업무 domain과 무관한가?
├─ 아니오 → pattern만 참고하고 새로 구현
└─ 예
   └─ 접근성·반응형·test 근거가 실제로 필요한가?
      ├─ 아니오 → 우리 shared/ui로 새로 구현
      └─ 예 → source·commit·license를 기록하고 선별 이식
```

## 7. Router와 Page 연결

TanStack Router source는 FSD 최상위인 `app/routes`에 둔다.

```text
app/routes/_authenticated/work-orders/index.tsx
  ├─ path·search schema
  ├─ permission metadata
  ├─ pending·error boundary 선택
  └─ pages/work-order-list public API 연결
```

route file은 얇게 유지한다.

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { WorkOrderListPage } from '@/pages/work-order-list'

export const Route = createFileRoute('/_authenticated/work-orders/')({
  validateSearch: workOrderListSearchSchema,
  component: RouteComponent,
})

function RouteComponent() {
  return <WorkOrderListPage search={Route.useSearch()} />
}
```

- `pages`는 route file을 import하지 않는다.
- typed `Link`는 사용할 수 있지만 reusable entity UI는 경로를 직접 결정하지 않는다.
- AppShell widget은 navigation 정의를 import하지 않고 `app`에서 계산한 item을 prop으로 받는다.
- dynamic breadcrumb label은 loader가 조회한 business identifier를 route metadata에 제공한다.
- status-changing action은 route navigation으로 수행하지 않고 feature mutation으로 수행한다.

## 8. State와 API 소유권

### 8.1 URL state

다음은 route search schema가 소유한다.

- list query, filter, sort, page와 page size
- detail tab과 investigation view
- trace direction, depth와 selected node
- login 후 돌아갈 검증된 상대 경로

잘못된 입력은 crash하지 않고 safe default로 정규화한다. unknown key는 제거하며 filter가 바뀌면 page를 1로 되돌린다.

### 8.2 Server state

- `shared/api`: generated OpenAPI type, HTTP transport, 공통 error normalization
- `entities/*/api`: entity read query와 query key
- `features/*/api`: 사용자 command mutation
- `pages`: 필요한 query·feature를 조합하며 raw `fetch`를 호출하지 않음

server response가 domain truth다. optimistic update는 되돌리기 쉽고 충돌 의미가 명확한 행동에서만 사용하며 생산·재고·품질 확정 command는 기본적으로 server confirmation 뒤 갱신한다.

#### 8.2.1 목록·상세 조회는 `shared/lib/useLoadState` 하나로 (2026-09-05)

목록 화면 9개가 같은 60줄(useState·useEffect·AbortController·stale 검사)을 복사하고
있었고 그중 3개는 stale 검사가 미묘하게 달랐다. 조회 상태는 `useLoadState(key, load,
fallbackMessage)` 로 통일한다.

- `state` 는 `loading | error | success & Success` 세 가지뿐이다. 화면은 이 세 분기만 그린다.
- key 가 바뀌어도 이전 성공 결과를 유지하고 `isRefreshing` 만 켠다. 스켈레톤 교체는 첫
  조회에만 쓴다(표 깜빡임 방지, 디자인 시스템 2.7 절).
- 늦게 도착한 이전 요청은 key·reload 일치 검사로 버린다. 화면을 떠나면 요청을 중단한다.
- `reload` 는 참조가 고정된다(`useCallback`). 열 정의 `useMemo` 의 의존성으로 들어가기 때문이다.
- 오류 문구는 서버 메시지(`ApiRequestError`)를 우선하고, 없으면 화면이 준 문구를 쓴다.
- `replace(data)` 는 명령(발행·취소·판정)이 최신 상세를 돌려줄 때 다시 조회하지 않고
  그 값으로 바꿔 끼운다. 왕복 한 번을 아끼고 응답과 화면이 어긋나는 순간을 없앤다.

목록 9개, 상세 7개, 대시보드가 모두 이 훅을 쓴다. 새 화면도 자체 useEffect 조회를
두지 않는다.

### 8.3 Form state

- 복합 form과 validation은 행동을 소유한 feature의 React Hook Form + schema에 두고, 단일 제어값은 local state를 허용한다.
- API validation error는 field error와 form-level conflict로 구분한다.
- 사용자가 입력한 값은 실패 후 보존하되 server가 거부한 상태 전이를 성공처럼 반영하지 않는다.
- dirty form은 route 이동·role switch·browser close 전에 확인한다.

### 8.4 App·local state

- session, QueryClient, theme, router context만 app-wide provider 후보로 둔다.
- dialog open, row hover, 임시 local selection은 component state다.
- server entity collection을 Zustand나 Context에 복제하지 않는다.

## 9. UI와 domain 상태 경계

생산 진행, 검사 판정, 품질 disposition은 하나의 `status` prop이나 badge로 합치지 않는다.

- entity slice는 각 축의 label·icon·semantic token mapping을 독립적으로 제공한다.
- widget과 page는 여러 축을 나란히 조합한다.
- `shared/ui/Badge`는 `PASS`, `QUARANTINED` 같은 domain enum을 알지 못한다.
- 색상만으로 상태를 전달하지 않고 text, icon·shape와 보조 설명을 함께 사용한다.
- loading·empty·error·permission denied·conflict는 page layout을 교체하지 않고 같은 content region 안에서 표현한다.

## 10. Test와 검증 경계

| 대상 | 최소 검증 |
|---|---|
| `shared/ui` | 접근성 role·keyboard·focus, visual state |
| `entities` | DTO mapping, label·수량 formatter, entity UI |
| `features` | validation, mutation success·domain rejection·retry |
| `widgets` | 여러 상태 조합, responsive behavior |
| `pages` | loading·empty·error·permission·conflict composition |
| `app/routes` | path/search parsing, redirect, 403·404, deep link·reload |
| architecture | layer direction, same-layer isolation, public API |

MSW 또는 API fixture를 사용할 때 실제 기업명·공정값을 사용하지 않고 [도메인 계약](../domain/manufacturing-domain-contract.md)의 synthetic fixture만 사용한다.

## 11. 구현 순서

1. **#9 기반**: alias, architecture lint, token, `shared/ui` 최소 primitive, root·authenticated layout, AppShell
2. **#10 인증**: `/login`, session provider, protected route와 role switch
3. **#11 작업지시**: 목록·생성·상세 route를 첫 완전한 수직 slice로 구현
4. **#12 자재**: BOM·자재 LOT·작업지시 예약 route
5. **#13 공정**: 1024px execution queue·workbench
6. **#14 품질검사**: 검사 queue·실행과 판정 차단
7. **#15 추적**: 검색과 tree/table 계보
8. **#16 격리**: incident·영향 대상·처분
9. **#17 관리**: 감사이력, 필요 시 사용자 관리
10. **#18 대시보드**: 실제 query가 쌓인 뒤 예외 중심 dashboard

전체 route placeholder와 빈 slice를 #9에서 한꺼번에 만들지 않는다. path 계약은 먼저 고정하고 구현 route는 해당 Issue에서 추가한다.

## 12. PR 검토표

- [ ] 새 code의 layer와 slice를 한 문장으로 설명할 수 있다.
- [ ] 더 높은 layer 또는 같은 layer의 다른 slice를 import하지 않는다.
- [ ] slice 외부에서 public API만 사용한다.
- [ ] URL·server·form·local state 중 소유자가 하나다.
- [ ] route file에 business mutation이나 큰 markup이 없다.
- [ ] external source를 이식했다면 provenance와 license가 있다.
- [ ] 정상뿐 아니라 loading·empty·error·permission·conflict를 검증했다.
- [ ] domain enum을 generic `shared/ui`에 넣지 않았다.
- [ ] 사용하지 않는 미래 abstraction과 dependency를 추가하지 않았다.
