# Frontend 구조 계약

> `shadcn-admin`의 검증된 shell·primitive를 선별 이식하고 MES code를 Feature-Sliced Design으로 구성하기 위한 구현 계약

| 항목       | 내용                                                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| 상태       | 구현 v2.0 (2026-09-05)                                                                                                  |
| 관련 Issue | [#28](https://github.com/wooinwoo/sensor-manufacturing-mes/issues/28)                                                   |
| 결정       | [ADR-0004](../adr/0004-frontend-architecture-and-routing.md)                                                            |
| 화면·URL   | [Route 계약](../product/route-contract.md)                                                                              |
| 업무·상태  | [제품·UX·기술 기획](../product/product-plan-cross-review.md), [도메인 계약](../domain/manufacturing-domain-contract.md) |

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

| Layer      | 책임                                    | MES 예시                                            | 금지                                             |
| ---------- | --------------------------------------- | --------------------------------------------------- | ------------------------------------------------ |
| `app`      | application bootstrap과 전역 policy     | provider, router, global error boundary, token·font | domain mutation 구현                             |
| `pages`    | route 하나가 렌더링할 화면 조합         | 작업지시 상세, 검사 실행                            | 다른 page import, 범용 primitive 정의            |
| `widgets`  | 독립적으로 읽히는 큰 UI block·layout    | AppShell, 계보 workbench                            | page import, 단일 button만 감싸기                |
| `features` | 사용자가 업무 대상으로 수행하는 행동    | 작업지시 릴리스, 자재 예약                          | 다른 feature slice import, 단순 entity 표시      |
| `entities` | 사용자가 이해하는 업무 대상의 표현·조회 | WorkOrder, MaterialLot, Inspection                  | 다른 entity 직접 import, 화면 flow orchestration |
| `shared`   | 제품 domain과 무관한 기반               | Button, HTTP client, date formatter                 | WorkOrder·LOT 같은 업무 용어와 규칙              |

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
import { WorkOrderStatusBadge } from "@/entities/work-order";
import { ReleaseWorkOrderButton } from "@/features/work-order/release";

// 금지: slice 내부 deep import
import { WorkOrderStatusBadge } from "@/entities/work-order/ui/work-order-status-badge";

// 금지: 같은 layer slice 간 import
import { MaterialLot } from "@/entities/material-lot/model/types";
```

Public API는 외부에 필요한 symbol만 export한다. `export *`로 내부 전체를 노출하지 않고 refactor 시 호환 경계를 유지한다.

구현 단계에서는 ESLint architecture rule과 fixture test로 다음을 실패시킨다.

1. 낮은 layer가 높은 layer import
2. 같은 layer의 다른 slice import
3. `index.ts`를 우회한 deep import
4. `shared`에 MES domain 이름 또는 server mutation 배치
5. route file이 page 내부 구현 deep import

## 6. `shadcn-admin` 선별 이식 mapping

| 원본 영역                               | 우리 목적지                        | 판단                                                                 |
| --------------------------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| `src/components/ui/*`                   | `shared/ui/shadcn/*`               | 원본 primitive 전체를 이동하고 local token·test 적용                 |
| `src/components/data-table/*`           | `shared/ui/shadcn/data-table/*`    | 원본 sorting·pagination·column control을 이동하고 MES table에서 조합 |
| `authenticated-layout`                  | `app/routes` + `widgets/app-shell` | route guard와 layout rendering을 분리해 재작성                       |
| `app-sidebar`, `header`, `main`         | `widgets/app-shell/ui`             | navigation data와 session action은 prop으로 주입                     |
| theme·layout context                    | `app/providers`, `app/styles`      | 지원하기로 결정한 option만 유지                                      |
| command menu                            | 향후 전역 검색 feature             | #9에서 빈 검색 UI를 복제하지 않음                                    |
| `features/tasks`                        | 이식하지 않음                      | table interaction만 참고하고 WorkOrder page로 새로 구현              |
| routes·generated tree                   | 이식하지 않음                      | [우리 route 계약](../product/route-contract.md)에서 재생성           |
| Zustand store                           | 이식하지 않음                      | 실제 cross-route client state가 생길 때만 도입 검토                  |
| Clerk auth                              | 이식하지 않음                      | same-origin HttpOnly session과 #10 계약 사용                         |
| dashboard·chat·apps·settings·users demo | 이식하지 않음                      | MES 범위와 무관                                                      |
| logo·image·fake data                    | 이식하지 않음                      | 외부 branding·demo 식별자 제거                                       |

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
import { createFileRoute } from "@tanstack/react-router";
import { WorkOrderListPage } from "@/pages/work-order-list";

export const Route = createFileRoute("/_authenticated/work-orders/")({
  validateSearch: workOrderListSearchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  return <WorkOrderListPage search={Route.useSearch()} />;
}
```

- `pages`는 route file을 import하지 않는다.
- typed `Link`는 사용할 수 있지만 reusable entity UI는 경로를 직접 결정하지 않는다.
- AppShell widget은 navigation 정의를 import하지 않고 `app`에서 계산한 item을 prop으로 받는다.
- dynamic breadcrumb label은 본문이 받은 business identifier를 `PageCrumb` context로 공유한다. 제목만을 위한 별도 loader·GET을 만들지 않는다.
- status-changing action은 route navigation으로 수행하지 않고 feature mutation으로 수행한다.

### 7.1 웹 업무 가이드

사이드바 안내 영역의 업무 가이드는 `/guide`에서 시작하기·화면 규칙·디자인 시스템·전체 문서를 제공한다. `pages/guide`는 저장소 Markdown 원문을 빌드 입력으로 사용하고 웹 전용 복사본이나 별도 조회 API를 만들지 않는다. 현재 문서에서 사용하는 제목·문단·목록·표·코드·링크만 렌더링하며 raw HTML은 실행하지 않는다. 참조 링크는 포함된 가이드 문서만 내부 이동하고 그 외 저장소 코드·자산은 참고로 표시한다. 상대 링크는 원문 경로를 기준으로 해석하여 루트 README와 docs/README를 혼동하지 않는다.

모든 로그인 역할이 문서를 읽을 수 있지만 실제 메뉴 바로가기는 `app`의 권한 필터를 통과한 항목만 주입한다. 가이드 접근은 업무 권한을 늘리지 않는다. 탭과 문서 선택은 검증된 URL search로 복원한다.

- 문서 목록의 단일 소유자는 `docs/catalog.json`이다. docs의 Markdown과 공개 루트 문서를 포함하며 `scripts/document-catalog.test.mjs`가 누락·중복·목차 불일치를 검사한다. API 경로 탐색 문서도 현재 Controller의 Method·경로와 대조한다.
- GuidePage는 탭·선택 문서와 목록의 임시 검색어·분류·문서 상태를 소유한다. GuideStart는 첫 진입 안내, 제어형 GuideCatalog는 목록 탐색, GuideDocumentPanel은 선택 문서의 문맥·주의 표시를 담당한다. 문서 열기·뒤로가기·탭 전환으로 목록 컴포넌트가 해제되어도 같은 페이지의 검색어·분류·문서 상태는 유지한다.
- guide-catalog는 등록된 문서 조회·분류·메타데이터 검색, guide-search는 URL 검증·별칭·원문 링크 해석, guide-reading-paths는 담당자·개발자의 읽기 순서를 소유한다. 읽기 순서는 가이드의 지연 로딩 경계 안에 두고 등록 누락은 테스트로 확인한다.
- 기본 시작 화면과 전체 문서 목록에서는 문서 본문을 불러오지 않는다. `guide-documents`는 Vite의 lazy raw import로 선택한 원문만 읽는다. 별도 문서 API, 업무 GET, 서버 검색을 추가하지 않는다.
- URL의 `doc`는 등록된 ID만 허용한다. 기존 architecture/requests ID는 frontend-architecture/api-requests로 해석한다. 문서 제목·설명·경로 검색과 분류·문서 상태 필터는 페이지 안의 local state이며 본문 전체 검색이 아니다. 목록은 주제별로 묶고 전체 상태가 기본이다. 초기화는 검색어·분류·상태를 함께 되돌린다.
- `DocumentReader`는 실제 원문 로딩·오류·복구를 소유한다. 브라우저가 실패한 dynamic import를 재사용할 수 있으므로 오류에서는 같은 import 호출 반복 대신 선택한 문서 URL을 유지하는 화면 새로고침을 제공한다. 문서 ID가 달라지면 keyed reader를 새로 구성하여 이전 문서를 새 제목 아래 표시하지 않는다.
- app의 shell-config가 업무 메뉴 묶음·경로·권한을 소유한다. app-shell의 NavSupport는 업무 가이드 한 링크를 별도 navigation landmark로 렌더링하고 NavUser는 현재 역할과 역할 전환을 한 줄로 제공한다. 개발 전용 UI 점검 링크는 GuideStart의 개발 문서 영역에 둔다. navigation-active는 메뉴와 상세 경로 선택 규칙을 공유하며 공정 상세 경로도 원래 공정 메뉴로 연결한다.
- 업무·안내 링크는 app-shell 내부의 SidebarNavLink로 활성 표시·aria-current·툴팁·모바일 닫힘을 공유한다. NavGroup은 업무 아이콘·구현 예정 항목, NavSupport는 가이드·개발 도구의 구성만 소유한다. 공통 링크가 역할 권한을 계산하거나 업무 경로를 추가하지 않는다.
- 가이드의 역할별 첫 경로 링크는 app이 주입한다. 투어 요청은 app-shell public API의 동의 요청 이벤트이며 실제 경로 이동·권한·미저장 보호는 기존 RoleOnboarding이 소유한다.

## 8. State와 API 소유권

### 8.1 URL state

다음은 route search schema가 소유한다.

- list query, filter, sort, page와 page size
- detail tab과 investigation view
- trace direction, depth와 selected node
- login 후 돌아갈 검증된 상대 경로

잘못된 입력은 crash하지 않고 safe default로 정규화한다. unknown key는 제거하며 filter가 바뀌면 page를 1로 되돌린다.

### 8.2 Server state

진행 중 동일 GET 공유·취소·인증 경계는 [API 요청 규칙](frontend-api-request-rules.md)을 따른다. 보호 경로의 hover/focus preload는 끄고 실제 이동에서 세션과 권한을 확인한다.

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

목록 9개, 상세 7개, 대시보드와 작업지시 생성의 제품 선택 조회가 이 훅을 쓴다.
새 화면도 자체 useEffect 조회를 두지 않는다. 제품 조회 실패와 빈 결과는 별도로 표현하고
실패에는 재시도를 제공한다.

### 8.3 Form state

- 복합 form과 validation은 행동을 소유한 feature의 React Hook Form + schema에 두고, 단일 제어값은 local state를 허용한다.
- API validation error는 field error와 form-level conflict로 구분한다.
- 사용자가 입력한 값은 실패 후 보존하되 server가 거부한 상태 전이를 성공처럼 반영하지 않는다.
- dirty form은 route 이동·role switch·browser close 전에 확인한다.

### 8.4 App·local state

- session, QueryClient, theme, router context만 app-wide provider 후보로 둔다.
- dialog open, row hover, 임시 local selection은 component state다.
- server entity collection을 Zustand나 Context에 복제하지 않는다.

### 8.5 최초 진입의 로딩 경계

HTML의 정적 초기 준비 화면은 JavaScript 시작 전 빈 root를 막는다. app의 InitialLoading은 최초 router match가 준비되지 않은 세션 확인 구간을 담당하며 RouterProvider는 항상 마운트한다. 보호 업무 데이터는 인증 경계를 통과하기 전 표시하지 않는다. boot.js는 알려진 테마·사이드바 선호와 공개 경로 제목만 적용하고 boot.css는 공통 셸의 폭·배경·스크롤바 공간을 맞춘다. 초기 화면에 접속 확인 문구를 크게 표시하지 않으며 준비 상태는 스크린리더에만 알린다. 제목 표시는 .mes-boot 내부 요소에만 적용하고, 같은 텍스트를 반복 변경하지 않으며, 초기 제목 두 개를 채우면 관찰을 끝낸다. shell-config의 공개 제목과 초기 제목의 일치는 회귀 테스트로 검사한다. 전체 페이지 스켈레톤은 만들지 않는다. 같은 탭의 새로고침에서는 sidebar-presentation.js가 직전 확인한 공개 역할 코드로 코드 소유 메뉴의 표시만 복원한다. 이 미리보기는 inert·aria-hidden이며 링크·버튼이 없다. sessionStorage의 30분 표시 힌트에는 버전·역할 코드·만료 시각만 남긴다. 세션·사용자 식별자·권한 배열·업무 데이터·HTML은 넣지 않는다. 표시 힌트는 권한의 근거가 아니며 실제 라우트와 API는 서버 응답으로 판단한다. 첫 방문·잘못된 힌트는 브랜드만 표시하고 로그인·로그아웃·인증 실패 경계에서 힌트를 삭제한다. 다른 창에서 역할이 바뀌었다면 인증 완료 전까지 직전 메뉴가 잠깐 보일 수 있지만 조작할 수 없다.

공개 로그인은 업무 셸의 임시 브랜드 제목을 표시하지 않는다. boot.js에서 알려진 업무 경로에만 초기 제목을 지정하며, /login·/·미등록 경로의 제목 기본값은 빈 값이다. 실제 로그인 화면의 로고·소개는 그대로 유지한다. JavaScript 준비 전에는 기존 바탕색만 유지하고 별도 안내·스켈레톤을 만들지 않는다.

로그인 라우트는 세션 확인을 beforeLoad에서 기다리지 않고 공개 LoginPage를 먼저 렌더링한다. 서버에서 확인된 유효 세션만 해당 업무 첫 화면으로 이동시킨다. 역할 버튼을 누르거나 화면을 떠나면 배경 확인을 취소하고 늦은 결과를 무시한다. reason=role-changed는 화면에 표시하지 않으며 세션 종료나 인증 상태의 증거로 사용하지 않는다. 로그인 요청의 버튼 로딩과 보호 라우트의 실제 인증 검증은 유지한다.

HTML head의 session-bootstrap.js는 보호 경로에서만 실제 /api/auth/me GET을 no-store·same-origin으로 먼저 시작한다. shared/api/initial-request는 이 문서에서 시작한 Promise<Response>를 동등한 GET 한 번에만 인계한다. requestJson의 응답 파싱·오류·공유·취소와 entities/session의 응답 검증은 그대로 적용한다. 소비 시 30초를 넘겼거나 취소된 요청은 버리고 새 요청을 보낸다. 로그인·로그아웃은 미소비 요청도 취소한다. 세션·권한을 저장소에 복제하거나 이전 문서 응답으로 인증을 건너뛰지 않는다. 하드 새로고침은 문서를 새로 만드는 동작이므로 전체 DOM·미저장 입력을 그대로 보존하는 기능은 아니다.

shared/ui의 DataRegion은 페이지가 명시한 API 결과 부분만 감싼다. PageHeading·FilterBar·정적 안내는 경계 밖이다. 공용 DataTable과 TableSkeleton은 같은 table 영역 이름을 쓴다. 대시보드와 상세 7개 화면은 각각 dashboard/detail 영역을 사용한다. 재조회는 기존 useLoadState의 성공 결과 유지 규칙을 따른다.

layout-snapshot.js는 pagehide 시 data-loading-region으로 표시한 최상위 데이터 영역의 이름·높이와 현재 경로·뷰포트·메뉴 폭·스크롤만 sessionStorage에 기록한다. 재로딩에서만 조건이 일치하는 측정값을 선택한다. shared/lib/loading-layout은 현재 조건을 다시 확인하고 필요한 높이만 읽는다. React 이전에는 전체 문서 높이만 예약하며 화면 도형·텍스트·필드·업무 응답은 복원하지 않는다. 처음 방문·저장소 차단·조건 불일치는 안전하게 추정 높이로 돌아간다.

app-shell의 ContentReadiness는 자동 온보딩 질문의 준비 시점만 관찰한다. 자식 DOM을 가리거나 inert 처리하지 않으며, Sidebar·Header·Main을 다른 로딩 화면으로 교체하지 않는다. GuidePage·GuideFrame·GuideDocumentHeader는 정적 화면으로 즉시 구성한다. 큰 Markdown 원문은 선택한 문서만 지연 로딩하고 성공한 공개 정적 원문과 진행 중 요청만 guide-documents 모듈 메모리에서 재사용한다. DocumentReader는 최초 렌더에서 완료 원문을 확인하므로 재진입할 때 로딩 상태부터 시작하지 않는다. 오류는 캐시하지 않고 문서 변경 뒤 늦게 온 결과도 버린다. 이 예외는 인증·업무 API 캐시가 아니다.

업무 화면에서 RoleStartHelp 상시 패널은 렌더링하지 않는다. 역할별 안내는 헤더의 RoleOnboarding과 업무 가이드에서 제공하며 같은 안내를 제목 위에 반복하지 않는다. 기존 완료·건너뛰기 선택과 동의 절차는 유지한다. 안내와 목록 데이터 조회는 별도 책임이며 useLoadState의 재조회 중 성공 결과 유지 규칙은 바꾸지 않는다.

### 8.6 사용자 역할 관리

- entities/admin-user는 사용자 목록·기존 역할표·변경 이력 조회 계약을 소유한다.
- features/user-access는 역할 하나 지정·활성 상태·필수 사유·확인 단계·PATCH를 소유한다. pages/admin-users는 목록·읽기 전용 권한표·편집 패널을 조합한다.
- 입력만으로 저장하지 않는다. 확정 중 중복 요청·닫기를 막고, 미저장 닫기는 확인한다. 409나 결과가 불명확한 통신 실패 뒤에는 입력을 보존하되 자동 재시도하지 않고 목록 재조회를 요구한다.
- 성공 후 목록을 다시 조회한다. 자기 계정 변경은 로그인 화면으로 이동한다. 서버가 대상 계정의 모든 세션을 폐기하므로 다른 열린 창도 다음 요청부터 거부된다. 실시간 강제 화면 이동을 제공한다는 의미는 아니다.
- 권한표는 기본 10행과 표시 건수 선택을 제공한다. 권한 상수만 있고 동작이 없는 기능은 구현 예정으로 표시한다.

## 9. UI와 domain 상태 경계

생산 진행, 검사 판정, 품질 disposition은 하나의 `status` prop이나 badge로 합치지 않는다.

- entity slice는 각 축의 label·icon·semantic token mapping을 독립적으로 제공한다.
- widget과 page는 여러 축을 나란히 조합한다.
- `shared/ui/Badge`는 `PASS`, `QUARANTINED` 같은 domain enum을 알지 못한다.
- 색상만으로 상태를 전달하지 않고 text, icon·shape와 보조 설명을 함께 사용한다.
- loading·empty·error·permission denied·conflict는 page layout을 교체하지 않고 같은 content region 안에서 표현한다.

### 9.1 공용 레이아웃 (2026-09-05)

- `Main`·`PageHeading`·`Panel`이 페이지와 패널 간격을 소유한다.
- `ContentGrid`는 동일 2열 또는 본문/보조 2:1 배치를 담당한다.
- `StatusStrip`은 상세 상태 문맥, `Timeline`은 시간순 기록을 표현한다.
- `FormFields`·`FormActions`·`Notice`는 입력·행동·안내를 배치한다.
- 공용 컴포넌트는 domain enum, 권한, mutation을 알지 못한다.
- 검색 입력은 URL 값 변경에 따라 재설정되어 초기화·뒤로가기와 실제 조회가 일치한다.

현재 수치와 시각 규칙은 [디자인 시스템 계약](frontend-design-system.md)을 따른다.

## 10. Test와 검증 경계

| 대상         | 최소 검증                                                |
| ------------ | -------------------------------------------------------- |
| `shared/ui`  | 접근성 role·keyboard·focus, visual state                 |
| `entities`   | DTO mapping, label·수량 formatter, entity UI             |
| `features`   | validation, mutation success·domain rejection·retry      |
| `widgets`    | 여러 상태 조합, responsive behavior                      |
| `pages`      | loading·empty·error·permission·conflict composition      |
| `app/routes` | path/search parsing, redirect, 403·404, deep link·reload |
| architecture | layer direction, same-layer isolation, public API        |

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

## 13. 역할별 실제 화면 온보딩

로그인 이전의 역할 선택 안내는 features/auth/login-as-role의 로컬 상태이며 로그인 API를 자동 호출하지 않는다. pages/login은 포트폴리오 소개와 로그인 기능을 조합한다. 성공 콜백의 LoginExperience.startGuide를 app의 로그인 라우트가 받아, 서버가 확인한 역할과 함께 app-shell public API로 안내 요청을 인계한다. 하위 feature가 widget의 온보딩을 직접 import하지 않는다.

login-guide-intent는 sessionStorage에 버전·공개 역할 코드·2분 만료 시각만 남기는 일회성 화면 선호다. 세션·사용자 ID·권한·CSRF·업무 데이터를 저장하지 않고, 실제 인증과 권한은 기존 보호 경로·API에서 검증한다. 로그인 진입·직접 로그인·이동 실패 시 오래된 요청을 지운다. 저장소가 차단되면 정상 로그인과 기존 안내 초대로 돌아간다.

RoleOnboarding은 반복 가능한 초기화에서 요청을 읽되 즉시 소비하지 않는다. 본문 준비 이후 한 프레임을 기다려 다른 입력 화면의 미저장·저장 중 보호가 등록된 것을 확인한 뒤 요청을 한 번 소비한다. 이 짧은 대기는 보호 조건의 등록 순서를 위한 것이며 화면 로더의 최소 표시 시간이 아니다. 변경 중인 입력이 있으면 자동 이동 대신 기존 동의창과 사유를 보여 준다. 취소·해제 시 예약 프레임과 이후 비동기 작업을 중단한다. 요청 소비 후 새로고침에서 자동 투어를 재실행하지 않으며, 완료·건너뛰기 기록과 수동 재실행 정책은 유지한다.

- 역할별 순서·권한·설명은 app-shell의 role-onboarding 모델이 소유한다. 시작 동의를 받은 뒤 실제 경로와 DOM으로 이동한다.
- 상세 예시는 허용된 목록에 렌더링된 행의 식별자만 사용한다. DataTable의 tourRecord/getTourContext/isTourPreferred는 도메인 enum 없이 문자열·함수로 받는다.
- tour-destination은 식별자를 타입이 있는 경로 매개변수로 연결한다. 공정 상세의 productionLotId는 기존 목록 링크 계약과 동일하게 생산 LOT 번호를 사용한다.
- 한 번의 투어에서는 같은 종류의 상세 대상을 유지한다. 자재 예약은 선택한 작업지시를 공유하고, 재시도·새 투어에서만 다시 찾는다. 존재하지 않는 식별자를 만들거나 데이터를 생성하지 않는다.
- 입력란이 상태에 따라 없으면 실제 상태 영역을 강조하고 조건을 알린다. 목록이 비어 있거나 조회에 실패하면 다음·재시도를 제공한다.
- Panel의 tourAnchor는 헤더에 실제 초점을 주되 제목·본문을 포함한 섹션 전체를 강조한다. Select·Input도 초점과 강조 범위를 분리해 관련 패널·필터를 함께 보여 준다. 긴 섹션은 안내 카드와 겹치지 않는 가시 영역까지 강조한다.
- 투어 시작의 미저장·저장 중 보호, 취소 가능한 스크롤, 읽기 전용 안내를 유지한다. 역할별 권한으로 단계를 제한하고 작업지시 상세의 자재 예약 패널도 조회 권한이 있을 때만 구성한다.
- 완료·건너뛰기는 사용자·역할별 v3 키로 저장한다. v2 안내를 이미 완료한 사용자에게도 확장 안내를 한 번 제안하며, 상단에서 수동 재실행할 수 있다.
