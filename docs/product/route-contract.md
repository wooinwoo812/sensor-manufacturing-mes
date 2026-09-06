# MES Web Route 계약

> `SCR-01A`~`SCR-07B`의 URL, parameter, permission, navigation과 실패 상태를 구현 전에 고정하는 계약

| 항목         | 내용                                                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| 상태         | 사전설계 v1.0                                                                                                               |
| 관련 Issue   | [#28](https://github.com/wooinwoo/sensor-manufacturing-mes/issues/28)                                                       |
| Architecture | [ADR-0004](../adr/0004-frontend-architecture-and-routing.md), [Frontend 구조 계약](../engineering/frontend-architecture.md) |
| 화면 기준    | [UI 레이아웃·상태 계약](ui-layout-contracts.md)                                                                             |

## 1. URL 원칙

1. 사용자 화면은 영어 lowercase plural noun과 kebab-case를 사용한다.
2. frontend URL에는 `/api`, `/v1` 또는 viewport 이름을 넣지 않는다.
3. resource identity와 workflow context는 path, 공유 가능한 보기 상태는 search parameter가 소유한다.
4. path parameter는 변하지 않는 내부 ID를 사용하고 화면에는 작업지시 번호·LOT 번호 같은 업무 식별자를 표시한다.
5. 상태 변경은 URL 진입만으로 실행하지 않는다. GET navigation은 언제나 side effect가 없어야 한다.
6. canonical URL에는 trailing slash를 쓰지 않는다.
7. 1440·1280·1024px는 같은 URL을 사용한다. viewport에 따라 별도 redirect하지 않는다.
8. filter·sort·page·tab은 새로고침과 뒤로 가기 뒤에도 복원한다.
9. raw query는 신뢰하지 않고 route별 schema로 parse·validate·default 처리한다.
10. URL에 사용자명, 검사 측정값, 사유, token 또는 민감한 작업 내용을 넣지 않는다.

## 2. Route tree

```text
/
├─ login
├─ dashboard
├─ work-orders
│  ├─ new
│  └─ $workOrderId
│     └─ material-reservations
├─ materials
│  ├─ boms
│  └─ lots
│     └─ $materialLotId
├─ execution
│  ├─ queue
│  └─ lots/$productionLotId/steps/$processStepRevisionId
├─ quality
│  ├─ inspections
│  │  └─ $inspectionId
│  └─ incidents
│     └─ $qualityIncidentId
├─ traceability
│  └─ $traceNodeId
├─ audit-events
├─ admin
│  └─ users
├─ dev
│  └─ ui-kit
├─ forbidden
└─ *
```

`/materials`, `/execution`, `/quality`, `/admin`은 화면이 아니라 자식 canonical route로 보내는 layout·redirect route다.

## 3. Route inventory

1024 지원 수준은 route 차단 조건이 아니라 해당 viewport에서 보존할 정보·행동 계약이다.

| Route ID                     | Path                                                            | 화면                          | 최소 permission            | 1024px 계약              |
| ---------------------------- | --------------------------------------------------------------- | ----------------------------- | -------------------------- | ------------------------ |
| `ROUTE-ROOT`                 | `/`                                                             | 역할별 시작점                 | 없음                       | 역할별 redirect          |
| `ROUTE-LOGIN`                | `/login`                                                        | `FLOW-AUTH-01`                | public                     | 원클릭 역할 로그인       |
| `ROUTE-DASHBOARD`            | `/dashboard`                                                    | `SCR-01A`                     | `dashboard:read`           | 핵심 예외 읽기           |
| `ROUTE-WORK-ORDER-LIST`      | `/work-orders`                                                  | `SCR-02A`                     | `work-order:read`          | 관리 표 비대상           |
| `ROUTE-WORK-ORDER-CREATE`    | `/work-orders/new`                                              | `SCR-02B`                     | `work-order:create`        | 비대상                   |
| `ROUTE-WORK-ORDER-DETAIL`    | `/work-orders/$workOrderId`                                     | `SCR-02C`                     | `work-order:read`          | 핵심 요약 읽기           |
| `ROUTE-MATERIAL-RESERVATION` | `/work-orders/$workOrderId/material-reservations`               | `SCR-03D`                     | `material-allocation:read` | 비대상                   |
| `ROUTE-BOM-LIST`             | `/materials/boms`                                               | `SCR-03A`                     | `master-data:read`         | 비대상                   |
| `ROUTE-MATERIAL-LOT-LIST`    | `/materials/lots`                                               | `SCR-03B`                     | `material-lot:read`        | 관리 표 비대상           |
| `ROUTE-MATERIAL-LOT-DETAIL`  | `/materials/lots/$materialLotId`                                | `SCR-03C`                     | `material-lot:read`        | 핵심 요약 읽기           |
| `ROUTE-EXECUTION-QUEUE`      | `/execution/queue`                                              | `SCR-04A`                     | `process-execution:read`   | 현장 최적화              |
| `ROUTE-PROCESS-EXECUTION`    | `/execution/lots/$productionLotId/steps/$processStepRevisionId` | `SCR-04B`                     | `process-execution:read`   | 완전 지원                |
| `ROUTE-INSPECTION-LIST`      | `/quality/inspections`                                          | `SCR-05A`                     | `inspection:read`          | 관리 표 비대상           |
| `ROUTE-INSPECTION-DETAIL`    | `/quality/inspections/$inspectionId`                            | `SCR-05B`                     | `inspection:read`          | 비대상                   |
| `ROUTE-INCIDENT-LIST`        | `/quality/incidents`                                            | `SCR-05C` 목록 상태           | `quality-incident:read`    | 비대상                   |
| `ROUTE-INCIDENT-DETAIL`      | `/quality/incidents/$qualityIncidentId`                         | `SCR-05C` 상세 상태           | `quality-incident:read`    | 핵심 요약 읽기           |
| `ROUTE-TRACE-SEARCH`         | `/traceability`                                                 | `SCR-06A`                     | `trace:read`               | 검색·읽기                |
| `ROUTE-TRACE-DETAIL`         | `/traceability/$traceNodeId`                                    | `SCR-06B`                     | `trace:read`               | table 중심 읽기          |
| `ROUTE-AUDIT-EVENT-LIST`     | `/audit-events`                                                 | `SCR-07A`                     | `audit-event:read`         | 비대상                   |
| `ROUTE-USER-LIST`            | `/admin/users`                                                  | `SCR-07B`                     | `user:manage`              | 비대상·MVP 후순위        |
| `ROUTE-GUIDE`                | `/guide`                                                        | 시작 안내·화면 규칙·전체 문서 | authenticated              | 전체 읽기 지원           |
| `ROUTE-UI-SHOWCASE`          | `/dev/ui-kit`                                                   | #9 내부 component showcase    | development only           | viewport fixture         |
| `ROUTE-FORBIDDEN`            | `/forbidden`                                                    | 권한 없음                     | authenticated              | 요청 위치·필요 권한 안내 |
| `ROUTE-NOT-FOUND`            | `*`                                                             | 찾을 수 없음                  | 없음                       | 동일 shell에서 복구 링크 |

`ROUTE-UI-SHOWCASE`는 `import.meta.env.DEV`가 아니면 `ROUTE-NOT-FOUND`로 처리하고 navigation·production screenshot에 노출하지 않는다.

### 3.1 별도 route를 만들지 않는 상태

- 작업지시 릴리스·취소, 자재 예약 저장·해제, 공정 시작·완료, 검사 판정, 격리·해제·폐기는 feature mutation이다.
- confirmation dialog와 conflict recovery는 현재 route 안에 유지한다.
- 새 modal이 새로고침·공유·직접 접근을 지원해야 할 때만 nested route 후보로 올린다.
- BOM revision 상세는 MVP의 `SCR-03A` 안에서 읽으며 독립 업무 화면이 필요해질 때 route를 추가한다.
- #17의 entity별 감사 timeline은 각 상세 route의 tab·section이며 통합 검색만 `ROUTE-AUDIT-EVENT-LIST`를 사용한다.

### 3.2 Route permission과 action permission

Route inventory의 permission은 화면에 진입해 최소 data를 읽는 조건이다. 상태변경 feature는 아래 permission을 별도로 검사하고 API가 최종 강제한다.

| 행동                            | Action permission                                              |
| ------------------------------- | -------------------------------------------------------------- |
| 작업지시 생성·릴리스·취소       | `work-order:create`, `work-order:release`, `work-order:cancel` |
| 자재 LOT 품질 결정              | `material-lot:decide-quality`                                  |
| 자재 예약·해제                  | `material-allocation:create`, `material-allocation:release`    |
| 공정 시작·완료·미사용 자재 반납 | `process-execution:execute`                                    |
| 검사 입력·판정·허용된 정정      | `inspection:execute`, `inspection:correct`                     |
| 생산 LOT 품질 disposition 결정  | `production-lot:decide-quality`                                |
| 부적합 사건 등록·격리 대상 처분 | `quality-incident:create`, `quarantine-target:decide`          |
| 사용자 역할 변경                | `user:manage`                                                  |

action permission이 없으면 위험 행동을 숨기기만 하지 않고 필요한 권한과 읽기 가능한 현재 상태를 설명한다.

### 3.3 초기 역할별 route 범위

`읽기`는 route 진입, `실행`은 해당 업무 action permission까지 가진다는 뜻이다. API와 #10의 parameterized permission test는 이 표와 같아야 한다.

| Route group | 생산계획 | 자재 | 현장 | 품질 | 최고관리자 |
| --- | --- | --- | --- | --- | --- |
| dashboard | 읽기 | — | — | — | 읽기 |
| work-orders | 실행 | 읽기 | 읽기 | 읽기 | 실행 |
| materials/boms | 읽기 | 읽기 | — | 읽기 | 읽기 |
| materials/lots | 읽기 | 예약·해제 실행 | — | 품질 결정 실행 | 예약·해제·품질 결정 실행 |
| execution | 읽기 | — | 실행 | 읽기 | 실행 |
| quality/inspections | 읽기 | — | — | 실행 | 실행 |
| quality/incidents | 읽기 | 읽기 | — | 실행 | 실행 |
| traceability | 읽기 | 읽기 | — | 읽기 | 읽기 |
| audit-events 통합 검색 | — | — | — | — | 읽기 |
| admin/users | — | — | — | — | 실행 |

일반 역할의 entity별 감사 timeline은 자신이 읽을 수 있는 상세 route 안에서만 제공한다. 2026-09-06 사용자 승인으로 기존 `SYSTEM_ADMIN`을 최고관리자로 변경했다. 모든 정의된 permission을 명시적으로 부여하되 API의 공통 권한·CSRF·Origin·업무 상태 검증을 그대로 거친다. 역할 코드·기존 계정 배정은 유지하고 새 역할이나 권한 검사 우회 분기는 만들지 않는다. 신규 permission은 최고관리자의 명시 목록과 회귀 검사를 함께 갱신한다.

최고관리자도 구현 예정 기능을 실행할 수 있는 것은 아니다. 검사 정정·생산 LOT 품질 결정·격리 대상 처분은 권한표의 구현 예정 표시를 유지한다. 업무 데이터 삭제·감사 기록 삭제·검사 게이트 강제 통과 기능은 제공하지 않는다.

## 4. Path parameter 계약

| Parameter                | 소유 대상                                  | 규칙                                                 |
| ------------------------ | ------------------------------------------ | ---------------------------------------------------- |
| `$workOrderId`           | `WorkOrder.id`                             | 불변 내부 ID; 작업지시 번호를 URL ID로 사용하지 않음 |
| `$materialLotId`         | `MaterialLot.id`                           | 불변 내부 ID; LOT 표시번호는 breadcrumb에 사용       |
| `$productionLotId`       | `ProductionLot.id`                         | 현재 공정 대상 LOT                                   |
| `$processStepRevisionId` | 릴리스 snapshot의 `ProcessStepRevision.id` | 최신 route definition으로 치환하지 않음              |
| `$inspectionId`          | `Inspection.id`                            | 대기 상태부터 존재하는 검사 실행 ID                  |
| `$qualityIncidentId`     | `QualityIncident.id`                       | 영향평가·격리의 원천 사건 ID                         |
| `$traceNodeId`           | `TraceNode.id`                             | 자재 LOT·생산 LOT·완제품 공통 추적 root              |

- ID 형식은 API schema의 단일 validator를 따른다. frontend가 UUID·ULID를 임의 추측하지 않는다.
- path decode 실패는 route not-found, 형식은 맞지만 resource가 없으면 resource-not-found state다.
- 권한이 없는 resource의 존재 여부를 client message로 추론 가능하게 만들지 않는다.
- 표시번호가 바뀌거나 중복돼도 deep link는 같은 resource를 가리켜야 한다.

## 5. 공통 search parameter

목록 route는 필요한 항목만 아래 공통 schema에서 선택한다.

| Key        | Type·default                  | 규칙                                            |
| ---------- | ----------------------------- | ----------------------------------------------- |
| `q`        | string, `''`                  | trim, 최대 100자, 업무 식별자·이름 검색         |
| `page`     | integer, `1`                  | 1 이상; filter 변경 시 1로 reset                |
| `pageSize` | `10 \| 20 \| 50 \| 100`, `10` | 9개 목록 공통, 변경 시 적용 조건 유지·첫 페이지 |
| `sort`     | route별 enum                  | 허용 column 외 값은 default                     |
| `order`    | `asc \| desc`                 | route별 기본 정렬과 함께 사용                   |

- 기본값은 canonical link에서 생략한다.
- unknown key는 제거한다.
- multi-select는 route schema가 enum array로 검증한다.
- 빈 array와 `all`을 동시에 사용하지 않고 filter 없음은 key 부재로 표현한다.
- 날짜는 `YYYY-MM-DD`, 시각은 ISO 8601 offset 형식을 사용한다.
- 사용자에게 보이는 일자 경계는 `Asia/Seoul`, API 전달 시 UTC 범위로 변환한다.
- 잘못된 query는 error page가 아니라 safe default와 정규화된 URL로 복구한다.

## 6. Route별 search 계약

### 6.1 인증과 대시보드

| Route             | Search     | 허용값·의미                                                                |
| ----------------- | ---------- | -------------------------------------------------------------------------- |
| `ROUTE-LOGIN`     | `redirect` | 검증된 app-relative path와 search; 외부 origin 금지                        |
| `ROUTE-LOGIN`     | `reason`   | `required \| session-expired \| role-changed`                              |
| `ROUTE-DASHBOARD` | `range`    | `today \| 7d \| 30d`, 기본 `today`                                         |
| `ROUTE-GUIDE`     | `tab`      | `overview \| rules \| system \| engineering`, 기본 overview는 URL에서 생략 |
| `ROUTE-GUIDE`     | `doc`      | 개발 규약의 `architecture`만 허용, 기본은 API 요청 규칙                    |
| `ROUTE-FORBIDDEN` | `from`     | 거부된 app-relative path; 외부 origin·민감 query 금지                      |

Dashboard drill-down은 별도 결과 화면을 만들지 않고 typed search와 함께 근거 route로 이동한다.

| 예외           | 근거 route search                                    |
| -------------- | ---------------------------------------------------- |
| 납기 지연 작업 | `/work-orders` + `due=overdue`                       |
| 차단 작업      | `/work-orders` + `blocked=true`                      |
| 검사 대기      | `/quality/inspections` + `executionStatus=[PENDING]` |
| 격리 자재      | `/materials/lots` + `disposition=[QUARANTINED]`      |

### 6.2 작업지시

| Route                        | Search          | 허용값·의미                                                           |
| ---------------------------- | --------------- | --------------------------------------------------------------------- |
| `ROUTE-WORK-ORDER-LIST`      | 공통 목록       | `q`, `page`, `pageSize`, `sort`, `order`                              |
|                              | `status`        | WorkOrder 진행 상태 enum array                                        |
|                              | `due`           | `overdue \| today \| 7d \| all`                                       |
|                              | `blocked`       | boolean                                                               |
|                              | `priority`      | 작업지시 우선순위 enum array                                          |
| `ROUTE-WORK-ORDER-DETAIL`    | `tab`           | `overview \| materials \| processes \| inspections \| trace \| audit` |
| `ROUTE-MATERIAL-RESERVATION` | `requirementId` | 화면 진입 시 강조할 `WorkOrderMaterialRequirement.id`                 |

생성 form 값, 계획수량, 선택 revision과 사용자 메모는 URL에 넣지 않는다.

### 6.3 BOM·자재 LOT

| Route                       | Search         | 허용값·의미                                                               |
| --------------------------- | -------------- | ------------------------------------------------------------------------- |
| `ROUTE-BOM-LIST`            | 공통 목록      | `q`, `page`, `pageSize`, `sort`, `order`                                  |
|                             | `productId`    | 제품 filter                                                               |
|                             | `lifecycle`    | `draft \| published \| inactive` array                                    |
|                             | `effectiveAt`  | `YYYY-MM-DD`                                                              |
| `ROUTE-MATERIAL-LOT-LIST`   | 공통 목록      | `q`, `page`, `pageSize`, `sort`, `order`                                  |
|                             | `materialId`   | 자재 filter                                                               |
|                             | `disposition`  | `PENDING \| ACCEPTED \| HOLD \| QUARANTINED \| REJECTED` array            |
|                             | `availability` | `available \| shortage \| expired \| all`                                 |
| `ROUTE-MATERIAL-LOT-DETAIL` | `tab`          | `overview \| inventory \| allocations \| consumption \| quality \| trace` |

### 6.4 공정 실행

| Route                     | Search      | 허용값·의미                                          |
| ------------------------- | ----------- | ---------------------------------------------------- |
| `ROUTE-EXECUTION-QUEUE`   | 공통 목록   | `q`, `page`, `pageSize`, `sort`, `order`             |
|                           | `readiness` | `ready \| in-progress \| blocked \| completed` array |
| `ROUTE-PROCESS-EXECUTION` | `section`   | `work \| materials \| quality`, 기본 `work`          |

투입·양품·불량 수량과 불량유형은 form state이며 URL에 보존하지 않는다.

### 6.5 품질

| Route                     | Search            | 허용값·의미                                                          |
| ------------------------- | ----------------- | -------------------------------------------------------------------- |
| `ROUTE-INSPECTION-LIST`   | 공통 목록         | `q`, `page`, `pageSize`, `sort`, `order`                             |
|                           | `executionStatus` | `PENDING \| IN_PROGRESS \| COMPLETED \| CANCELLED` array             |
|                           | `verdict`         | `PASS \| FAIL \| HOLD` array; 미판정은 key 부재와 별도 status로 구분 |
|                           | `gate`            | `ROUTE_ADVANCE \| LOT_COMPLETE` array                                |
| `ROUTE-INSPECTION-DETAIL` | `view`            | `execute \| history`, 기본은 현재 상태에 따라 결정 후 URL 명시       |
| `ROUTE-INCIDENT-LIST`     | 공통 목록         | `q`, `page`, `pageSize`, `sort`, `order`                             |
|                           | `status`          | `OPEN \| ASSESSED \| CONTAINED \| CLOSED` array                      |
|                           | `sourceType`      | `MATERIAL_LOT \| PRODUCTION_LOT \| FINISHED_UNIT` array              |
| `ROUTE-INCIDENT-DETAIL`   | `tab`             | `overview \| impact \| containment \| history`                       |

검사 측정값, 정정 사유와 격리 처분 사유는 URL에 넣지 않는다.

### 6.6 추적·감사·관리

| Route                    | Search                   | 허용값·의미                                             |
| ------------------------ | ------------------------ | ------------------------------------------------------- |
| `ROUTE-TRACE-SEARCH`     | `q`                      | LOT·일련번호 검색어                                     |
|                          | `type`                   | `MATERIAL_LOT \| PRODUCTION_LOT \| FINISHED_UNIT` array |
| `ROUTE-TRACE-DETAIL`     | `direction`              | `downstream \| upstream`, 기본 `downstream`             |
|                          | `view`                   | `auto \| tree \| table`, 기본 `auto`                    |
|                          | `depth`                  | integer `1..5`, 기본 `2`                                |
|                          | `selected`               | 현재 root 아래 선택한 `TraceNode.id`                    |
| `ROUTE-AUDIT-EVENT-LIST` | 공통 목록                | `q`, `page`, `pageSize`, `sort`, `order`                |
|                          | `actorId`                | 행위자 ID                                               |
|                          | `actorRole`              | demo role enum array                                    |
|                          | `action`                 | audit action enum                                       |
|                          | `entityType`, `entityId` | 대상 식별                                               |
|                          | `requestId`              | 한 transaction·request 추적                             |
|                          | `from`, `to`             | ISO 8601 시각 범위                                      |
| `ROUTE-USER-LIST`        | 공통 목록                | `q`, `page`, `pageSize`, `sort`, `order`                |
|                          | `role`                   | demo role enum array                                    |
|                          | `status`                 | `active \| inactive` array                              |

`view=auto`는 1280px 이상에서 tree+detail, 현장 1024px에서 동등한 table을 우선한다. 사용자가 `tree` 또는 `table`을 명시하면 가능한 범위에서 선택을 유지한다.

### 6.7 업무 가이드

진입 링크는 사이드바의 안내 영역에 둔다. 상단 사용 안내는 실제 화면 투어이며 문서 탐색과 구분한다.

- 기본 `/guide`는 시작 행동과 읽는 순서를 표시한다. `tab=rules`, `tab=system`, `tab=engineering`은 화면 규칙·디자인 시스템·전체 문서 목록을 연다.
- `doc`는 docs/catalog.json에 등록된 ID만 허용한다. 예: `/guide?tab=engineering&doc=backend`. `/guide?doc=operations`는 시작하기 탭의 업무 안내 본문이다.
- 과거 `doc=architecture`와 `doc=requests` 링크도 해석한다. 알 수 없는 doc은 버리고 선택된 유효 탭의 기본 화면으로 복귀한다. rules/system에서는 관계없는 doc을 버린다.
- 제목·설명·경로·상태 검색과 분류는 페이지 내 local state다. 본문 전체 검색, 업무 목록 조회조건, 별도 서버 API로 취급하지 않는다.
- 모든 로그인 역할은 문서를 읽을 수 있지만 첫 업무 링크·업무 메뉴는 기존 역할 권한을 따른다. 문서 화면은 업무 명령 권한을 추가하지 않는다.

## 7. 인증·권한과 시작 route

### 7.1 역할별 기본 route

| Active role           | 로그인 직후 route      |
| --------------------- | ---------------------- |
| `PRODUCTION_PLANNER`  | `/work-orders`         |
| `MATERIAL_MANAGER`    | `/materials/lots`      |
| `SHOP_FLOOR_OPERATOR` | `/execution/queue`     |
| `QUALITY_ENGINEER`    | `/quality/inspections` |
| `SYSTEM_ADMIN`        | `/dashboard`           |

`redirect`가 있고 현재 role이 접근 가능하면 기본 route보다 우선한다. 접근할 수 없거나 외부 URL이면 폐기하고 역할별 기본 route로 이동한다.

이미 인증된 사용자가 `/login`에 직접 들어오면 active role의 기본 route로 `replace`한다. role switch는 login route가 아니라 AppShell의 session feature가 담당한다.

### 7.2 진입 순서

```text
session 확인 중
└─ root shell skeleton 유지
   ├─ 미인증 → /login?redirect=<현재 상대 URL>&reason=required
   └─ 인증
      ├─ route permission 있음 → page load
      └─ 없음 → /forbidden?from=<현재 상대 URL>
```

- 로그인 성공 redirect는 history를 `replace`해 login page로 뒤로 가지 않는다.
- route permission은 navigation UX다. API는 조회와 command permission을 다시 검증한다.
- route 접근은 가능하지만 resource-level API가 `403`이면 현재 URL과 shell 안에서 permission state를 표시한다.
- 메뉴를 숨겨도 직접 URL 접근 test를 반드시 수행한다.

### 7.3 Role switch

1. dirty form이 있으면 이동 확인을 먼저 받는다.
2. server session의 active role을 변경한다.
3. user-scoped query cache를 제거하고 router context를 invalidate한다.
4. 현재 route permission이 유지되면 같은 URL을 다시 load한다.
5. permission이 사라지면 새 역할의 기본 route로 `replace`한다.

이전 역할에서 조회한 민감 data를 화면이나 cache에 남기지 않는다.

## 8. Redirect와 canonicalization

| 입력                     | 결과                     | History |
| ------------------------ | ------------------------ | ------- |
| `/` 미인증               | `/login`                 | replace |
| `/` 인증                 | 역할별 기본 route        | replace |
| `/materials`             | `/materials/lots`        | replace |
| `/execution`             | `/execution/queue`       | replace |
| `/quality`               | `/quality/inspections`   | replace |
| `/admin` + `user:manage` | `/admin/users`           | replace |
| `/admin` + 권한 없음     | `/forbidden`             | replace |
| trailing slash           | slash 없는 canonical URL | replace |
| 잘못된 search            | safe default로 정규화    | replace |
| 존재하지 않는 path       | `ROUTE-NOT-FOUND`        | 유지    |

과거 URL alias는 실제 공개 배포 뒤 URL 변경이 있을 때만 추가한다. 구현 전에 이름을 바꾼 route에는 alias를 쌓지 않는다.

## 9. Breadcrumb와 navigation metadata

각 route는 typed `staticData`에 다음 metadata를 제공한다.

```ts
type RouteMeta = {
  routeId: RouteId;
  screenId?: ScreenId;
  label: string;
  requiredPermissions: readonly Permission[];
  navigationGroup?:
    "operations" | "materials" | "quality" | "traceability" | "admin";
};
```

- metadata에 path 문자열을 중복 저장하지 않는다. 실제 matched route에서 path를 얻는다.
- static breadcrumb는 route label, dynamic breadcrumb는 본문이 받은 업무 식별자를 `PageCrumb`로 재사용한다. 제목용 중복 GET을 추가하지 않는다.
- 예: `작업지시 / WO-2026-0002 / 자재 예약`
- dynamic label load 실패 시 내부 ID를 노출하지 않고 `상세` 같은 안전한 fallback을 쓴다.
- sidebar는 permission이 있는 업무영역만 보이되 권한의 보안 근거로 사용하지 않는다.
- icon-only collapsed sidebar에도 tooltip과 accessible name을 제공한다.

## 10. Loading·error·not-found·conflict

| 상태                | 표현과 복구                                                |
| ------------------- | ---------------------------------------------------------- |
| session loading     | AppShell을 확정하기 전 root skeleton; 보호 화면 flash 금지 |
| route chunk loading | shell 유지, content header와 본문 skeleton                 |
| list loading        | table header·filter 위치 유지, row skeleton                |
| resource not found  | 현재 업무영역 shell에서 목록 복귀·검색 제공                |
| permission denied   | 필요한 permission·역할 안내, 허용된 시작 화면 링크         |
| server error        | request ID가 있으면 표시, retry와 안전한 이전 화면 제공    |
| validation error    | field 옆 메시지와 form summary                             |
| `409 Conflict`      | 사용자 입력 보존, 최신 상태·차이·재조회 행동 제공          |
| session expired     | `/login`으로 replace, 현재 상대 URL 보존                   |
| unknown path        | 전역 not-found와 역할별 시작 화면 링크                     |

생산·재고·품질 command 실패 뒤 성공 route로 이동하지 않는다. audit 또는 resource detail link는 server가 성공 response를 반환한 뒤에만 제공한다.

## 11. Dirty form과 navigation blocker

다음 화면은 변경값이 있을 때 route 이동, role switch와 browser close를 차단할 수 있다.

- `ROUTE-WORK-ORDER-CREATE`
- `ROUTE-MATERIAL-RESERVATION`
- `ROUTE-PROCESS-EXECUTION`
- `ROUTE-INSPECTION-DETAIL`
- 격리·처분 form이 열린 `ROUTE-INCIDENT-DETAIL`

- 단순 filter·table selection은 dirty form이 아니다.
- 성공 저장 후 blocker를 해제하고 canonical detail로 이동한다.
- server conflict는 form을 dirty 상태로 유지한다.
- browser storage에 측정값·사유를 자동 저장하지 않는다. cross-route draft 요구가 생기면 보안·만료 계약을 별도로 결정한다.

## 12. Route test matrix

모든 구현 route는 최소 다음을 검증한다.

1. typed link가 올바른 path와 search를 만든다.
2. 직접 URL과 browser refresh가 같은 화면을 복원한다.
3. 잘못된 path parameter가 not-found로 복구된다.
4. 잘못된 search parameter가 safe default로 정규화된다.
5. 미인증 사용자는 안전한 `redirect`와 함께 login으로 이동한다.
6. 권한 없는 역할은 직접 URL로 진입해도 protected page를 보지 못한다.
7. API `403`, `404`, `409`, `5xx`가 서로 다른 복구 상태를 보인다.
8. filter·sort·page·tab이 뒤로 가기와 새로고침 뒤 유지된다.
9. role switch 뒤 cache와 route permission을 다시 평가한다.
10. dirty form navigation blocker가 성공 저장 뒤 해제된다.

## 13. 구현 handoff

| 구현 Issue | 먼저 추가할 route                                                                 |
| ---------- | --------------------------------------------------------------------------------- |
| #9         | root, authenticated layout, forbidden, not-found, development showcase와 AppShell |
| #10        | login, session redirect, role landing·switch                                      |
| #11        | work-order list·new·detail                                                        |
| #12        | BOM, material LOT list·detail, material reservation                               |
| #13        | execution queue·process execution                                                 |
| #14        | inspection list·detail                                                            |
| #15        | trace search·detail                                                               |
| #16        | incident list·detail                                                              |
| #17        | audit-event list, 필요 시 user list                                               |
| #18        | dashboard                                                                         |

첫 route implementation PR에서 전체 placeholder route를 생성하지 않는다. 각 Issue는 이 문서의 path와 parameter를 유지하고 해당 route의 page·API·test를 수직으로 완성한다.

## 14. 완료 검증표

- [x] `SCR-01A`~`SCR-07B`가 route inventory에 모두 연결된다.
- [x] path와 search state의 소유 기준이 있다.
- [x] 모든 dynamic path parameter의 domain owner가 있다.
- [x] 역할별 시작 route와 protected direct URL 동작이 있다.
- [x] 403·404·409·5xx와 session expiry가 구분된다.
- [x] role switch와 dirty form navigation 계약이 있다.
- [x] 1440·1280·1024px가 같은 URL을 사용한다.
- [x] 구현 Issue별 route handoff가 있다.
