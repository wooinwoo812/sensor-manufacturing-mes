# 제조 도메인 계약

| 항목 | 내용 |
|---|---|
| 문서 상태 | `Review-ready v1.4` |
| 기준일 | 2026-09-01 |
| 관련 Issue | [#2 제조 용어와 핵심 불변조건을 정의](https://github.com/wooinwoo/sensor-manufacturing-mes/issues/2), [#23 v1.0 실행 계약을 정렬](https://github.com/wooinwoo/sensor-manufacturing-mes/issues/23) |
| 공개 근거 | [제조 도메인 공개 근거 재검증](source-review.md) |
| 구현 범위 | #10~#17과 #22의 Web·API·DB·test가 공유할 업무 언어와 규칙 |

## 1. 계약의 위치

이 문서는 특정 기업의 내부 MES를 재현하지 않는다. 공개 제조 정보 모델을 참고하되, 단일 사업장·이산형 LOT 생산을 가정한 제품 v1.0의 일관된 업무 언어를 정의한다.

- `SOURCE`: 공개 원문에서 직접 확인한 범위
- `SYNTHESIS`: 공개 근거를 프로젝트 문제에 맞게 일반화한 해석
- `PROJECT`: 구현 범위와 검증 가능성을 고려해 선택한 규칙
- `OPEN`: 관련 schema 구현 전에 ADR로 결정할 항목

업무 불변조건의 최종 권한은 server와 PostgreSQL에 있다. client 검증은 빠른 피드백을 제공하지만 권한·수량·상태 전이를 확정하지 않는다.

## 2. 범위와 업무 경계

### 2.1 포함 범위

- 작업지시 생성·릴리스·완료
- BOM·공정경로·검사규격 revision 고정
- 자재 LOT 입고잔량·부분 예약·실제 출고·투입
- 생산 LOT의 공정실적·검사·완료
- 생산 LOT 분할·합류·변환과 완제품 일련번호
- 사후 부적합 사건, downstream 영향 조회와 격리
- 중요한 명령의 append-only 감사이력

### 2.2 비범위

- 회계·원가·구매·영업·급여를 포함한 범용 ERP
- PLC·센서·설비의 실시간 제어
- 다사업장 이동과 사업장 간 재고
- 대체 자재, 단위 변환, 외주 공정, 재작업 route
- 전체 수입검사·CAPA·공급업체 품질관리
- 출하·물류·GS1 EPCIS 또는 QIF 표준 적합성
- 특정 기업의 실제 품번·공정명·검사 기준·수치

## 3. 공통 식별·수량·시간 규칙

### 3.1 식별자

| 대상 | 내부 식별자 | 사람이 읽는 번호 | 규칙 |
|---|---|---|---|
| 기준정보 revision | UUID | `BOM-DEMO-r3` | revision은 발행 후 불변 |
| 작업지시 | UUID | `WO-DEMO-001` | 사업장 안에서 고유 |
| 자재·생산 LOT | UUID | `ML-DEMO-001`, `PL-DEMO-001` | 유형과 번호를 함께 표시 |
| 완제품 | UUID | `SN-DEMO-0001` | 일련번호 전역 고유 |
| 사건·명령 | UUID | 화면에 축약 표시 | idempotency와 감사 연결 |

표시번호는 변경 가능한 DB 기본키로 사용하지 않는다. 모든 예시는 `DEMO` namespace를 사용하며 실제 기업 식별자를 포함하지 않는다.

### 3.2 수량과 단위

- `Material`과 `Product`는 각각 하나의 `baseUom`을 가진다.
- v1.0의 예약·출고·소비·분할·합류 수량은 대상의 `baseUom`으로만 기록한다.
- 모든 업무 수량은 PostgreSQL `numeric(18, 6)`에 해당하는 십진 정밀도를 사용한다. JavaScript 부동소수점 연산으로 확정 수량을 계산하지 않는다.
- 모든 수량은 0 이상이며 관계·거래의 발생 수량은 0보다 커야 한다.
- 암묵적 반올림은 금지한다. 계산 결과가 정수부 12자리·소수부 6자리 안에 정확히 표현되지 않으면 기준정보 발행 또는 명령을 거부한다.
- 단위가 다른 입력과 출력의 수율 환산은 v1.0 비범위다. `TRANSFORM`은 단위 변환을 자동 추론하지 않는다.
- 같은 단위의 `SPLIT`·`MERGE`는 입력 합계와 출력 합계가 같아야 한다.
- 생산 LOT의 `traceRemaining`은 생성수량에서 유효한 공정 불량 폐기수량, 기타 생산 폐기수량과 outgoing `SPLIT`·`MERGE`·`TRANSFORM`·`SERIALIZE` 유효수량을 뺀 projection이다.
- 새 계보 사건은 각 입력 생산 LOT의 `traceRemaining`을 초과할 수 없다.
- 작업지시의 계보 수량은 최초 계획 LOT에서 시작하며 `Σ 모든 후손 생산 LOT의 traceRemaining + Σ 유효 SERIALIZE 수량 + Σ 유효 생산 폐기수량`으로 보존한다. 분할·합류·변환으로 수량을 중복 계상하지 않는다.

### 3.3 시간과 행위자

- 확정 사건은 server가 기록한 `occurredAt`, `recordedAt`, `actorId`, `commandId`를 가진다.
- 업무 발생시각과 저장시각이 다르면 둘 다 보존한다.
- 단일 사업장과 `Asia/Seoul` 표시를 사용하되 DB에는 timezone이 있는 시각을 저장한다.
- client가 보낸 행위자·권한·기록시각을 신뢰하지 않는다.

### 3.4 사용자·코드 용어집

| 사용자 용어 | 코드 용어 | 정의 | 혼동하지 않을 개념 |
|---|---|---|---|
| 작업지시 | `WorkOrder` | 제품·계획수량·납기를 승인해 생산을 지시하는 단위 | 개별 공정실적 |
| 생산 LOT | `ProductionLot` | 같은 제조 이력으로 관리하는 생산 묶음 | 작업지시 전체 |
| 자재 LOT | `MaterialLot` | 같은 자재와 입고 묶음으로 식별한 재고 단위 | 자재 기준정보 |
| 작업지시 자재 요구 | `WorkOrderMaterialRequirement` | 릴리스 시 BOM item별 자재·필요수량·단위를 고정한 요구사항 | 자재 LOT 예약 |
| 자재 예약 | `MaterialAllocation` | 미래 투입을 위해 가용수량 일부를 보류 | 물리 출고·실제 소비 |
| 실제 출고·투입 | `InventoryTransaction` + `MaterialConsumption` | 자재가 창고에서 빠지고 생산에 사용된 확정 사건 | 예약 |
| 가용수량 | `available` projection | 품질상 사용 가능하며 예약되지 않은 현재 잔량 | 물리 잔량 `onHand` |
| 공정실적 | `ProcessExecution` | 특정 생산 LOT의 공정 시작·완료와 실제 수량 | 공정 기준 revision |
| 공정 WIP | `routeWipAvailable` projection | 현재 LOT가 현재 route 위치에서 다음 공정에 넘길 수 있는 유효 잔량 | 직전 공정의 분할 전 양품수량 |
| 검사 실행 | `Inspection.executionStatus` | 검사가 대기·진행·완료됐는지 | 검사 판정 |
| 검사 판정 | `Inspection.verdict` | 검사 결과가 합격·불합격·보류인지 | 품질 disposition |
| 품질 disposition | `qualityDisposition` | 현재 사용·완료 가능성을 나타내며 출하 업무에는 적격성 근거만 제공하는 통제 상태 | 생산 진행·검사 판정 |
| 출하 적격성 | `shipmentEligibility` projection | 완제품이 비범위인 출하 업무로 넘어갈 품질 근거가 있는지 계산 | 출하 승인·출하 command |
| 계보 | `TraceNode` + `LotRelation` | 자재·생산 LOT·완제품 사이의 실제 관계 | 예약 또는 감사로그 |
| downstream 영향 추적 | downstream trace | 원자재에서 영향 생산 LOT·완제품 탐색 | 완제품의 원천 조회 |
| upstream 원천 추적 | upstream trace | 완제품에서 생산 LOT·투입 자재 탐색 | 원자재의 영향 조회 |
| 부적합 사건 | `QualityIncident` | 사후 발견된 품질 문제의 원천 사건 | 개별 검사 FAIL |
| 격리 | `QuarantineCase` | 영향 대상의 사용·완료를 차단하고 완제품 출하 적격성을 `BLOCKED`로 만드는 통제 | 과거 완료·합격 취소 |
| 정정 | correction event | 원본을 보존하고 잘못된 확정 사실을 교정하는 후속 사건 | 원본 update·delete |

## 4. 핵심 엔터티 사전

### 4.1 기준정보

| 엔터티 | 식별·책임 | 생명주기 | 주요 관계 |
|---|---|---|---|
| `Product` | 생산 대상 정의와 기준단위 | 활성 → 비활성 | 여러 BOM·route revision 보유 |
| `Material` | 투입 자재 정의와 기준단위 | 활성 → 비활성 | BOM item·자재 LOT가 참조, 수량은 공통 십진 정밀도 사용 |
| `BomRevision` | 제품 단위 필요 자재와 수량 | 초안 → 발행 → 비활성 | `BomItem` 집합, WorkOrder가 발행본 참조 |
| `BomItem` | 자재와 제품 기준단위당 소요량 `quantityPerProductBaseUom`을 정의 | 소속 revision과 함께 불변 | Product·Material의 `baseUom` 조합 참조 |
| `ProcessRouteRevision` | 공정 순서와 선행조건 | 초안 → 발행 → 비활성 | `ProcessStepRevision` 집합 |
| `ProcessStepRevision` | 한 공정의 순서·이름·완료 요구 | 소속 revision과 함께 불변 | 검사 요구사항과 연결 |
| `InspectionSpecRevision` | 검사 항목·기준·판정방식 | 초안 → 발행 → 비활성 | 공정·최종검사 요구사항에서 참조 |
| `WorkOrderMaterialRequirement` | BOM item별 계획수량·단위당 소요량·정확한 필요수량·단위의 release snapshot | 작업지시 릴리스 후 불변 | WorkOrder·BomItem·Material과 여러 Allocation 연결 |
| `InspectionRequirement` | 공정·최종검사, 적용 규격과 `ROUTE_ADVANCE`·`LOT_COMPLETE` gate의 release snapshot | 작업지시 릴리스 후 불변 | WorkOrder·공정·spec revision 연결 |

발행 revision은 수정하지 않는다. 변경은 새 revision을 발행하며 이미 릴리스된 작업지시의 기준을 바꾸지 않는다.

### 4.2 생산

| 엔터티 | 식별·책임 | 생명주기 | 주요 관계 |
|---|---|---|---|
| `WorkOrder` | 제품·계획수량·납기와 생산 승인 단위 | `DRAFT`부터 완료·취소까지 | 릴리스 시 초기 ProductionLot 하나, 이후 분할·합류로 생긴 여러 ProductionLot과 revision snapshot |
| `ProductionLot` | 공정·검사·품질 통제를 받는 생산 묶음 | 계획 → 진행 → 완료·계보 대체·폐기·취소, 시작 readiness 별도 계산 | WorkOrder, ProcessExecution, TraceNode |
| `ProcessExecution` | 공정 단계의 실제 시작·완료와 수량 | 대기 → 진행 → 완료·취소 | ProductionLot·공정 revision·실제 투입 |
| `DefectRecord` | 공정에서 즉시 폐기되는 불량 수량·유형 | 공정 완료 후 append-only | ProcessExecution에 귀속 |
| `FinishedUnit` | 완제품 일련번호 단위 식별 | 생성 후 원천 LOT와 QuarantineTarget 처분으로 사용 가능성 투영 | 하나의 최종 생산 LOT에서 serialize |
| `LotTransformationEvent` | 분할·합류·변환·일련번호 생성 사건 | append-only | 입력·출력 TraceNode와 LotRelation 생성 |

### 4.3 재고

| 엔터티 | 식별·책임 | 생명주기 | 주요 관계 |
|---|---|---|---|
| `MaterialLot` | 동일 자재·입고 묶음의 식별, 선택적 만료일과 품질 통제 | 원장 잔량·만료·disposition으로 투영 | Material·InventoryTransaction·TraceNode |
| `InventoryTransaction` | 입고·출고·반납·조정·폐기의 수량 원장 | append-only | MaterialLot·업무 사건 참조 |
| `MaterialAllocation` | 작업지시 자재 요구에 보류한 자재 LOT 수량 | `ACTIVE` → `CLOSED` | WorkOrderMaterialRequirement·MaterialLot, 종료 이유는 수량에서 계산 |
| `MaterialAllocationRelease` | 예약에서 사용하지 않을 양수 수량을 해제한 사건 | append-only | MaterialAllocation·사유·행위자·commandId 연결 |
| `MaterialConsumption` | 생산에 실제 사용된 자재와 원 수량 | append-only | Allocation·ProcessExecution·CONSUME 관계 |

`MaterialAllocation`은 사용자 화면에서 `자재 예약`으로 부른다. 예약은 실제 투입이나 계보가 아니다.

### 4.4 품질·계보·감사

| 엔터티 | 식별·책임 | 생명주기 | 주요 관계 |
|---|---|---|---|
| `Inspection` | 검사 실행 상태·전체 판정·적용 revision | 대기 → 진행 → 완료·취소 | 생산 LOT·공정·InspectionResult |
| `InspectionResult` | 항목별 기준 snapshot·실측값·판정의 원본 | append-only | Inspection에 귀속 |
| `InspectionCorrection` | 원 검사의 유효 판정 snapshot을 대체하는 정정 version | append-only 선형 chain | CorrectionEvent·Inspection·직전 유효 version 연결 |
| `InspectionCorrectionResult` | 정정 version의 전체 항목별 기준·실측값·판정 snapshot | append-only | InspectionCorrection에 귀속 |
| `QualityIncident` | 자재 LOT·생산 LOT·완제품에서 사후 발견한 부적합 | 조사·영향평가·봉쇄·종결 | 하나의 원천 TraceNode |
| `QuarantineCase` | 한 사건의 영향 대상 검토와 containment 묶음 | 개시·검토·해결 | Incident와 여러 영향 TraceNode |
| `QuarantineTarget` | 영향 TraceNode별 격리·해제·폐기 결과 | 대기 → 해제·폐기 | QuarantineCase·TraceNode 연결 |
| `TraceNode` | 자재 LOT·생산 LOT·완제품의 공통 추적 식별자 | 대상과 함께 생성 | 정확히 하나의 업무 대상 참조 |
| `LotRelation` | 투입·분할·합류·변환·일련번호의 방향성 edge | append-only | parent·child TraceNode와 eventId |
| `CorrectionEvent` | 잘못된 확정 사실을 원본 보존 상태로 교정하는 묶음 | append-only | 원인·행위자·원 업무사건·정정행 연결 |
| `MaterialConsumptionCorrection` | 원 소비수량에서 제외할 양수 정정량 | append-only | CorrectionEvent·원 MaterialConsumption 연결 |
| `LotRelationCorrection` | 원 edge 수량에서 제외할 양수 정정량 | append-only | CorrectionEvent·원 LotRelation 연결 |
| `AuditEvent` | 중요한 명령의 행위자·사유·전후 값 | append-only | commandId·대상 식별자 참조 |
| `CommandReceipt` | idempotency key와 최초 명령 결과 보존 | 보존기간 동안 불변 | 같은 명령의 중복 실행 차단 |

`AuditEvent`는 설명 근거이지 재고·상태·계보를 재계산하는 진실 공급원이 아니다.

### 4.5 관계 지도

```text
Product
├─ BomRevision ─ BomItem ─ Material ─ MaterialLot
├─ ProcessRouteRevision ─ ProcessStepRevision
└─ InspectionSpecRevision

WorkOrder ─ release revision·WorkOrderMaterialRequirement·InspectionRequirement
└─ ProductionLot ─ ProcessExecution ─ Inspection ─ InspectionResult
                  └─ FinishedUnit

MaterialLot ─ MaterialAllocation ─ WorkOrderMaterialRequirement ─ WorkOrder
              └─ MaterialAllocationRelease
MaterialLot ─ InventoryTransaction
MaterialLot ─ MaterialConsumption ─ ProcessExecution

MaterialLot·ProductionLot·FinishedUnit
└─ TraceNode ─ LotRelation ─ LotTransformationEvent
   └─ QualityIncident ─ QuarantineCase ─ QuarantineTarget

CorrectionEvent ─ MaterialConsumptionCorrection·LotRelationCorrection·InspectionCorrection
                                                   └─ InspectionCorrectionResult

모든 중요 명령 ─ CommandReceipt·AuditEvent
```

## 5. 상태 계약

각 표나 상태도에 명시되지 않은 직접 전이는 기본적으로 금지한다. 우회 전이를 허용하지 않으며 명령은 현재 상태, 목표 상태와 실패 사유를 함께 반환한다.

### 5.1 작업지시

```text
DRAFT → RELEASED → IN_PROGRESS → COMPLETED
  │         │
  └─────────┴────→ CANCELLED
```

| 전이 | 허용 조건 | 금지·부수효과 |
|---|---|---|
| `DRAFT → RELEASED` | 발행된 BOM·route·검사규격, 계획수량·납기 유효, 자재·검사 요구사항 생성 가능, 초기 생산 LOT가 정확히 하나이며 계획수량이 작업지시와 일치 | revision 참조, `WorkOrderMaterialRequirement`·`InspectionRequirement`와 초기 LOT를 한 transaction에서 고정 |
| `RELEASED → IN_PROGRESS` | 유일한 초기 생산 LOT의 첫 공정 시작 성공 | 실제 투입 실패 시 전이하지 않음 |
| `IN_PROGRESS → COMPLETED` | 모든 소속 LOT가 `COMPLETED`·`SUPERSEDED`·`SCRAPPED` 중 하나, 각 종결 근거가 유효하고 계보 수량 전부가 완료·일련번호·폐기로 설명됨 | `PLANNED`·`IN_PROCESS` LOT가 남거나 client가 직접 완료 상태를 지정하면 거부 |
| `DRAFT·RELEASED → CANCELLED` | 실제 투입·공정·검사 실적 없음 | 활성 예약 해제, 미착수 생산 LOT와 대기 중 공정·검사 취소, 감사 기록을 한 transaction으로 수행 |

작업지시 `COMPLETED`는 실행이 모두 종결됐다는 뜻이며 계획수량 전부가 양품이라는 뜻은 아니다. 완료 요약은 양품·일련번호·불량·폐기 수량을 분리해 보여준다.

### 5.2 생산 LOT의 두 상태 축

```text
생산 진행
PLANNED → IN_PROCESS → COMPLETED
    │         ├──────→ SUPERSEDED  (전량 SPLIT·MERGE·TRANSFORM 입력일 때만)
    │         └──────→ SCRAPPED    (잔량 전부 폐기 처분일 때만)
    └────────────────→ CANCELLED    (작업지시 취소에 의해서만)

시작 readiness projection
READY | BLOCKED(reasonCodes[])

품질 disposition
PENDING → ACCEPTED | HOLD | REJECTED
ACCEPTED → QUARANTINED
HOLD → ACCEPTED | REJECTED | QUARANTINED
QUARANTINED → ACCEPTED | HOLD | REJECTED
```

- `READY`는 저장 상태가 아니다. 첫 공정은 선행조건과 작업지시 전체 자재 요구의 예약 완료, 대상 생산 LOT 몫의 가용 예약을 확인한다. 후속 공정은 자재 예약을 다시 확인하거나 소비하지 않는다.
- 첫 공정에는 선행 공정과 선행 `ROUTE_ADVANCE` 검사가 없다. 후속 공정은 바로 직전 `ProcessStepRevision`의 실행이 `COMPLETED`이고 그 직전 공정에 귀속된 모든 필수 `ROUTE_ADVANCE` 검사의 유효 판정이 `PASS`여야 `READY`다.
- 시작할 수 없으면 `BLOCKED`와 기계 판독 가능한 `reasonCodes[]`를 반환한다. 예: `PREREQUISITE_INCOMPLETE`, `INSPECTION_PENDING`, `INSPECTION_FAILED`, `INSPECTION_HELD`, `MATERIAL_SHORTAGE`, `MATERIAL_QUARANTINED`, `MATERIAL_EXPIRED`.
- 첫 공정의 실제 투입과 공정 시작 transaction이 성공할 때만 진행 상태가 `PLANNED → IN_PROCESS`로 바뀐다. 이미 `IN_PROCESS`인 LOT의 후속 공정 시작은 자재 원장을 바꾸지 않는다.
- readiness는 사용자 안내용 projection이다. 실제 첫 공정 시작 명령은 예약과 재고를, 후속 공정 시작 명령은 route WIP와 직전 공정·검사를 다시 잠그고 검증한다. 동시 명령으로 조건이 달라지면 명시적 충돌을 반환한다.
- `SUPERSEDED`는 생산 완료가 아니라 계보 사건으로 해당 LOT의 추적 가능 잔량이 모두 후속 LOT로 이동했음을 뜻한다. 이후 공정·검사 실적을 직접 추가할 수 없고 이력은 후속 LOT에서 계속된다.
- `SCRAPPED`는 완료 전 생산 LOT의 잔량 전부가 폐기됐음을 뜻한다. 이미 `COMPLETED`인 LOT의 사후 폐기는 진행 상태를 덮어쓰지 않고 폐기 사실·품질 거부·격리 처분을 추가한다.

- 생산 완료 사실과 현재 사용 가능 여부를 한 상태로 합치지 않는다.
- `COMPLETED + ACCEPTED` LOT도 사후 부적합 사건으로 `QUARANTINED`가 될 수 있다.
- `HOLD`는 판정 보류, `QUARANTINED`는 사건 기반 containment, `REJECTED`는 최종 사용 거부다.
- `REJECTED`는 품질 축의 종결 상태이며 물리 잔량 처리는 별도 폐기·반출 transaction으로 기록한다.

### 5.3 자재 LOT의 수량·품질·가용성

```text
onHand = Σ InventoryTransaction.signedQuantity
issuedAgainstAllocation = Σ 해당 예약을 참조하는 ISSUE_TO_PRODUCTION.quantity
releasedQuantity = Σ 해당 예약을 참조하는 MaterialAllocationRelease.quantity
issuedAgainstAllocation + releasedQuantity <= reservedQuantity
allocationRemaining = reservedQuantity - issuedAgainstAllocation - releasedQuantity
reserved = Σ ACTIVE MaterialAllocation.allocationRemaining
consumed = Σ MaterialConsumption.quantity - Σ MaterialConsumptionCorrection.quantity
scrapped = Σ SCRAP.quantity

requirementCommitted = Σ 요구사항의 유효 소비량 + Σ 요구사항의 ACTIVE 예약잔량
requirementRemaining = max(requiredQuantity - requirementCommitted, 0)

available =
  disposition = ACCEPTED 이고
  PENDING 또는 SCRAPPED QuarantineTarget이 없고
  closedAt = null 이고
  expiresAt이 없거나 현재보다 미래이면 max(onHand - reserved, 0)
  그 외 0
```

- `onHand`·`reserved`·`available`·`consumed`·`scrapped`는 서로 다른 의미다.
- `allocationRemaining`은 오류를 0으로 숨기는 포화 계산을 사용하지 않는다. 출고와 해제의 누적합이 예약량을 넘으면 명령 전체를 거부한다.
- 유효 소비량은 `Σ MaterialConsumption.quantity - Σ MaterialConsumptionCorrection.quantity`다. 원 소비수량과 정정수량은 각각 양수로 저장한다.
- 작업지시 자재 요구별 `requirementCommitted`는 `requiredQuantity`를 초과할 수 없다. 반납으로 유효 소비가 줄어도 닫힌 예약을 다시 열지 않는다. WorkOrder가 아직 `RELEASED`이면 `requirementRemaining` 범위에서 새 예약을 만들 수 있고, 이미 `IN_PROGRESS`이면 v1.0에서는 계획 대비 실제 사용량 차이로 표시할 뿐 추가 예약하지 않는다.
- allocation 잔량이 0이면 `CLOSED`이며 총출고량과 해제량에 따라 종료 이유를 `FULFILLED`·`RELEASED`·`MIXED` 중 하나로 계산한다.
- 출고와 해제는 같은 `MaterialAllocation` row 또는 aggregate version을 잠근 뒤 위 상한을 다시 계산한다. 동시 명령은 둘 다 과거 잔량을 소비할 수 없다.
- `OPEN`과 `EXHAUSTED`는 저장 상태가 아니라 `onHand > 0` 여부로 계산하는 projection이다.
- `closedAt`은 더 이상 거래를 허용하지 않는 명시적 종결이며 임의로 되돌리지 않는다.
- 만료된 자재 LOT는 물리적 `onHand`에는 남지만 `available`은 0이며 신규 예약·투입할 수 없다.
- 품질 disposition은 생산 LOT과 같은 의미를 사용한다. `QUARANTINED` 잔량은 `onHand`에는 남지만 `available`은 0이다.

모든 거래의 저장 수량은 0보다 크고 부호는 거래 유형에서 결정한다.

| 원장 거래 유형 | `signedQuantity` | 필수 업무 참조 |
|---|---:|---|
| `RECEIPT` | `+quantity` | 입고 근거 |
| `ISSUE_TO_PRODUCTION` | `-quantity` | 예약·공정 실행 |
| `RETURN_UNUSED` | `+quantity` | 원 출고 |
| `ADJUSTMENT_IN` | `+quantity` | 조정 사유·행위자 |
| `ADJUSTMENT_OUT` | `-quantity` | 조정 사유·행위자 |
| `SCRAP` | `-quantity` | 폐기 결정·행위자 |

`RETURN_UNUSED`는 원 출고를 참조하고 하나의 `CorrectionEvent` 아래 같은 수량의 `MaterialConsumptionCorrection`과 `LotRelationCorrection`을 추가한다. 누적 반납은 원 출고량, 원 소비의 미정정량과 원 `CONSUME` edge의 미정정량을 모두 초과할 수 없다. 원 출고·원 소비·원 edge와 총출고량은 보존하므로 이미 닫힌 예약은 다시 활성화하지 않는다.

### 5.4 공정 실행

```text
PENDING → IN_PROGRESS → COMPLETED
    └────────────────→ CANCELLED  (작업지시 취소에 의해서만)
```

- 첫 공정은 선행 검사 없이 시작한다. 후속 공정은 바로 직전 공정이 완료되지 않았거나 직전 공정의 필수 `ROUTE_ADVANCE` 검사 유효 판정이 `PASS`가 아니면 시작하거나 완료할 수 없다.
- 한 생산 LOT와 `ProcessStepRevision` 조합에는 유효한 `ProcessExecution`이 정확히 하나이며 v1.0은 한 공정의 부분 완료를 지원하지 않는다.
- `routeWipAvailable`은 생산 LOT이 현재 route 위치에서 보유한 `traceRemaining`이다. 첫 공정·후속 공정·분할 또는 합류로 생성된 LOT 모두 시작 transaction에서 이 값을 잠그고 `ProcessExecution.inputQuantity`로 snapshot한다.
- 직전 공정의 유효 양품수량은 분할·합류·변환 전 공정 WIP의 상한 근거다. 다음 공정은 분할 전 양품수량을 그대로 요구하지 않고, 현재 LOT에 남거나 새 LOT로 이동한 `routeWipAvailable`만 투입한다.
- `IN_PROGRESS` ProcessExecution이 있는 LOT에는 완료 전 `SPLIT`·`MERGE`·`TRANSFORM`·`SERIALIZE` 또는 다른 WIP 변경 사건을 만들 수 없다. 시작 시 잠근 `inputQuantity`를 완료 때까지 안정적으로 유지한다.
- 공정 완료에서 `inputQuantity = goodQuantity + defectQuantity`를 만족하고 `Σ DefectRecord.quantity = defectQuantity`여야 한다.
- v1.0의 공정 불량수량은 완료 transaction에서 즉시 생산 폐기로 확정해 `traceRemaining`에서 차감한다. 불량수량은 다음 공정 입력이나 계보 산출로 되살릴 수 없으며 재작업·불량 LOT 분리는 비범위다.
- 불량수량이 해당 LOT의 시작 시점 `traceRemaining` 전부이면 ProcessExecution은 완료 근거를 남기고 ProductionLot은 `SCRAPPED + REJECTED`로 종결한다. 일부 불량이면 남은 양품수량으로 `IN_PROCESS`를 유지한다.
- 공정 완료·`DefectRecord`·생산 폐기수량·감사 기록은 한 transaction이다. 후속 공정 또는 계보 사건이 생긴 뒤 선행 공정 수량을 바꾸는 정정은 거부하고 별도 재작업 설계로 보낸다.
- 미착수 `PENDING` 실행은 실적 없는 작업지시 취소 transaction에서만 `CANCELLED`로 바뀐다.
- `COMPLETED` 공정 수량은 v1.0에서 정정하지 않는다. 사용자는 완료 전에 수량을 확인해야 하며 후속 공정·계보가 생긴 뒤 잘못된 실적이 발견되면 일반 update나 WIP 증가를 허용하지 않고 별도 재작업 설계로 보낸다.
- v1.0은 재작업 route를 지원하지 않는다. 재작업 필요 사례는 명시적으로 차단하고 후속 Issue로 보낸다.

### 5.5 검사의 실행 상태와 판정

```text
실행 상태: PENDING → IN_PROGRESS → COMPLETED
                    └───────────→ CANCELLED  (측정값·판정이 없을 때만)

판정: UNDECIDED → PASS | FAIL | HOLD
```

- 실행 상태와 판정을 한 enum에 섞지 않는다.
- `COMPLETED` 검사는 `PASS`, `FAIL`, `HOLD` 중 하나의 판정을 반드시 가진다.
- 공정 중 검사와 최종 검사는 별도 `Inspection`이며 각자 적용 규격 revision과 gate를 가진다. `ROUTE_ADVANCE`는 연결 공정 이후의 다음 공정과 모든 계보 변환을, `LOT_COMPLETE`는 생산 LOT 완료를 통제한다.
- 항목별 필수값이 누락되면 전체 검사를 완료할 수 없다.
- 필수 `ROUTE_ADVANCE` 검사의 유효 실행 상태가 `COMPLETED`가 아니거나 유효 판정이 `FAIL`·`HOLD`이면 다음 공정과 `SPLIT`·`MERGE`·`TRANSFORM`·`SERIALIZE`를 거부한다. 차단 응답은 해당 `InspectionRequirement`와 reason code를 반환한다.
- 검사 판정은 품질 disposition의 근거이지 같은 상태값이 아니다. 최종 필수검사가 모두 `PASS`여야 `ACCEPTED` 결정을 내릴 수 있다.
- `FAIL`은 자동으로 과거 사실을 삭제하지 않는다. 품질 담당자가 `HOLD` 또는 `REJECTED` disposition을 결정하고 근거를 남긴다.
- 원 `Inspection`과 `InspectionResult`는 수정하지 않는다. 정정은 하나의 `CorrectionEvent` 아래 `InspectionCorrection`과 전체 항목 `InspectionCorrectionResult` snapshot을 추가하고 server가 전체 판정을 다시 계산한다.
- 유효 검사 snapshot은 원본에서 시작해 선형으로 이어진 정정 chain의 마지막 version이다. 직전 유효 version에는 후속 정정이 최대 하나만 연결되며 fork·순환·version 건너뛰기를 거부한다.
- `correctInspection`은 대상 생산 LOT의 `qualityDisposition = PENDING`이고 후속 공정 시작, 계보 변환, 일련번호 생성 또는 생산 LOT 완료가 아직 원 판정에 의존하지 않았을 때만 허용한다.
- `ACCEPTED`·`HOLD`·`REJECTED`·`QUARANTINED`로의 품질 disposition 결정은 검사 판정의 후속 의존 사건이다. 이미 disposition이 결정됐거나 다른 의존 사건이 있으면 검사 정정을 거부하고 `QualityIncident`와 격리로 처리해 과거 수행 사실을 바꾸지 않는다.
- 검사 정정 transaction은 Inspection과 ProductionLot을 잠근 뒤 유효 version, `qualityDisposition = PENDING`과 의존 사건 부재를 다시 검증한다. 정정 뒤 disposition은 `PENDING`으로 유지하며 별도 권한·사유·감사를 가진 품질 결정 명령으로만 바꾼다.
- 자재 LOT의 전체 수입검사는 비범위지만 `PENDING`에서 벗어나는 최소 품질 결정은 행위자·근거·감사이력을 요구한다.
- `decideMaterialLotQuality`와 `decideProductionLotQuality`만 LOT의 품질 disposition을 바꾼다. 검사 판정, 입고 또는 일반 update는 disposition을 암묵적으로 바꾸지 않는다.

### 5.6 부적합 사건과 격리

```text
QualityIncident: OPEN → ASSESSED → CONTAINED → CLOSED
                              └──────────────→ CLOSED  (영향 없음 근거 필요)

QuarantineCase: OPEN → UNDER_REVIEW → RESOLVED
QuarantineTarget: PENDING → RELEASED | SCRAPPED
```

- 사건은 원천 TraceNode 하나에서 시작한다.
- downstream 조회 결과마다 격리 대상을 기록하며 과거 완료·합격 사실을 덮어쓰지 않는다.
- `PENDING` QuarantineTarget은 활성 containment이고 `SCRAPPED` target은 영구 사용 금지 근거다. `RELEASED`만 차단을 해제한다.
- `PENDING`·`SCRAPPED` QuarantineTarget은 자재 LOT·생산 LOT의 사용·완료를 차단하고 완제품 일련번호의 `shipmentEligibility`를 `BLOCKED`로 계산한다. 출하 command는 범위에 없으며 완제품에는 LOT 품질 상태를 복제하지 않는다.
- 자재 LOT 격리는 기존 활성 예약을 숨기거나 자동 해제하지 않는다. 예약은 `reserved`에 남지만 실제 투입은 차단되며 작업자는 차단 원인과 영향 작업지시를 함께 본다.
- 대상별 격리 해제에는 결론·사유·행위자와 근거가 필요하다. 같은 case 안에서 일부 대상은 `RELEASED`, 다른 대상은 `SCRAPPED`일 수 있다.
- LOT를 `QUARANTINED`로 전이할 때 직전 disposition을 보존한다. 대상의 `RELEASED` 처분은 검사·품질 근거를 다시 확인해 `ACCEPTED` 또는 `HOLD`를 명시적으로 결정한다.
- 자재 LOT의 `SCRAPPED` 처분은 모든 활성 예약잔량 해제, 잔여 `onHand` 폐기, `REJECTED`, 격리대상과 감사를 한 transaction에서 닫는다.
- 진행 중 생산 LOT의 `SCRAPPED` 처분은 잔여 `traceRemaining` 전량 폐기, 진행 상태 `SCRAPPED`, `REJECTED`, 격리대상과 감사를 한 transaction에서 닫는다. 완료 LOT는 `COMPLETED`를 보존한다.
- FinishedUnit의 `SCRAPPED` target은 별도 복구 명령 없이 영구 폐기 근거가 된다.
- `QuarantineCase`는 모든 대상이 종결 처분을 가져야 `RESOLVED`가 된다. 사건 종결은 모든 case가 해결됐거나 영향 없음이 확인된 뒤에만 가능하다.

### 5.7 대표 금지 전이

| 대상 | 금지 전이·명령 | 이유·대안 |
|---|---|---|
| WorkOrder | `IN_PROGRESS → CANCELLED` | 확정 실적 보존; 필요한 경우 개별 정정·품질 통제로 처리 |
| WorkOrder | `COMPLETED → IN_PROGRESS` | 완료 사실을 되돌리지 않음 |
| ProductionLot 진행 | `COMPLETED → IN_PROCESS` | 재작업 route는 v1.0 비범위 |
| ProductionLot 진행 | `SUPERSEDED·SCRAPPED → IN_PROCESS·COMPLETED` | 대체·폐기된 LOT를 되살리지 않고 후속 LOT 또는 새 계획으로 처리 |
| 품질 disposition | `REJECTED → ACCEPTED` | 최종 거부를 일반 전이로 되돌리지 않음; 잘못된 판정은 정정 사건 필요 |
| 품질 disposition | `ACCEPTED → HOLD` | 사후 문제는 원천 사건과 `QUARANTINED`로 통제 |
| Inspection | `COMPLETED → IN_PROGRESS` | 원 결과 보존; 새 검사 또는 정정 사건 생성 |
| MaterialAllocation | `CLOSED → ACTIVE` | 종료 예약을 되살리지 않고 새 예약 생성 |
| QuarantineTarget | `SCRAPPED → RELEASED` | 폐기 원장 이후 물리 잔량을 복원하지 않음 |

## 6. 명령과 transaction 경계

### 6.1 작업지시 릴리스

`releaseWorkOrder`는 다음을 하나의 transaction에서 수행한다.

1. `DRAFT` 상태와 발행된 `BomRevision`·`ProcessRouteRevision`·`InspectionSpecRevision` 확인
2. `BomItem`별 `requiredQuantity = WorkOrder.plannedQuantity × BomItem.quantityPerProductBaseUom`을 십진 연산으로 정확히 계산
3. 계획수량·제품 기준단위·단위당 소요량·자재 기준단위·필요수량을 `WorkOrderMaterialRequirement`로 고정
4. BOM item의 자재 단위가 `Material.baseUom`과 같은지, 계산 결과가 양수이고 `numeric(18, 6)`에 반올림 없이 표현되는지 검증
5. 공정·최종검사별 적용 규격과 gate를 `InspectionRequirement`로 고정
6. 작업지시 계획수량 전체를 가진 초기 `ProductionLot` 정확히 하나 생성
7. `WorkOrder RELEASED`, `AuditEvent`와 `commandId` 기록

단위 변환·scrap factor·안전재고율과 암묵적 반올림은 v1.0에서 적용하지 않는다. 한 단계라도 실패하면 revision 참조·요구사항·초기 LOT·상태·감사를 모두 rollback한다. 릴리스가 끝나기 전에는 자재 예약·공정 시작·검사 실행을 만들 수 없다.

### 6.2 자재 예약

`reserveMaterial`은 다음을 하나의 transaction에서 수행한다.

1. `WorkOrderMaterialRequirement`와 소속 WorkOrder가 `RELEASED`인지 확인
2. 자재 LOT의 Material·`baseUom`이 요구사항 snapshot과 같은지 확인
3. 자재 LOT의 disposition·격리·만료·종결 여부 확인
4. 현재 원장 잔량, LOT별 활성 예약잔량과 요구사항별 유효 소비량·예약잔량 재계산
5. LOT `available`과 요구사항 `requirementRemaining`을 모두 요청량과 비교
6. 요구사항과 자재 LOT를 참조하는 `MaterialAllocation` 생성
7. `AuditEvent`와 `commandId` 기록

`DRAFT`·`IN_PROGRESS`·종결된 WorkOrder, 다른 WorkOrder의 요구사항, BOM에 없는 Material 또는 `requiredQuantity`를 초과하는 예약은 거부한다. v1.0은 유일한 초기 생산 LOT의 첫 공정 시작 전에 작업지시 전체 요구량의 예약을 마쳐야 하며 진행 중 추가 예약은 지원하지 않는다. 첫 공정 시작 뒤에는 일반 예약·해제를 허용하지 않는다.

예약 성공 후 `InventoryTransaction`, `MaterialConsumption`, `LotRelation`은 없어야 한다.

`releaseMaterialReservation`은 요청량이 0보다 크고 현재 `allocationRemaining` 이하일 때만 `MaterialAllocationRelease`와 `AuditEvent`를 한 transaction에서 추가한다. 해당 Allocation과 version을 잠근 뒤 `issuedAgainstAllocation + releasedQuantity <= reservedQuantity`를 다시 검증하고, 잔량이 0이면 `CLOSED`와 종료 이유를 기록한다. 출고와 해제가 경합하면 같은 잠금 순서를 사용해 먼저 확정된 명령 뒤의 실제 잔량으로 나머지 명령을 재검증한다.

### 6.3 실제 출고·투입과 공정 시작

`startProcessExecution`은 대상이 route의 첫 공정일 때만 inventory module의 `consumeMaterialReservation`을 호출해 다음을 하나의 transaction으로 닫는다.

```text
예약을 참조한 ISSUE_TO_PRODUCTION 원장 거래
→ issuedAgainstAllocation 증가·allocationRemaining 감소 projection
→ MaterialConsumption
→ CONSUME LotRelation
→ ProcessExecution 시작
→ ProductionLot IN_PROCESS
→ 최초 LOT 시작이면 WorkOrder IN_PROGRESS
→ AuditEvent
```

한 단계라도 실패하면 전부 rollback한다. 같은 `commandId` 재전송은 기존 결과를 반환하며 수량·edge·감사 이벤트를 중복 생성하지 않는다. 출고는 예약 해제와 같은 Allocation 잠금을 사용하며, 잠금 뒤 정확한 잔량이 투입 요청량보다 작으면 전체를 거부한다.

소비 전에 `Allocation → WorkOrderMaterialRequirement → WorkOrder`, `ProcessExecution → ProductionLot → WorkOrder`가 같은 WorkOrder로 이어지고, `MaterialLot.materialId = WorkOrderMaterialRequirement.materialId`인지 다시 검증한다. 하나라도 다르면 다른 작업지시의 예약 또는 BOM 외 자재 소비로 보고 전체를 거부한다.

요구사항별 대상 LOT 몫은 `ProductionLot.plannedQuantity × WorkOrderMaterialRequirement.quantityPerProductBaseUom`의 정확한 십진 곱이다. v1.0의 초기 생산 LOT는 작업지시 계획수량 전체를 가지므로 이 값은 작업지시 요구량과 같다. 첫 공정 시작은 선택한 Allocation들의 출고 합계가 이 값과 정확히 같을 때만 허용한다.

후속 공정의 `startProcessExecution`은 `consumeMaterialReservation`을 호출하지 않고 `InventoryTransaction`, `MaterialConsumption`, `CONSUME LotRelation`을 만들지 않는다. 이미 소비된 자재의 사후 부적합은 #16의 downstream 격리가 생산 LOT readiness를 차단한다. 중간 공정 투입 자재가 실제 시나리오로 확인되기 전에는 `BomItem`을 `ProcessStepRevision`에 직접 매핑하지 않는다.

### 6.4 취소·정정

- 미확정 초안은 수정할 수 있다.
- 확정된 출고·투입·공정 완료·검사 판정·계보 관계는 update·delete하지 않는다.
- 업무상 반대 사건으로 취소 가능한 경우 취소 transaction을 추가한다.
- 잘못 기록된 소비·계보는 원본을 유지하고 `CorrectionEvent`와 원본별 정정행을 추가한다. 정정행의 수량은 양수이며 누적 정정량은 원 수량을 초과할 수 없다.
- 잘못 기록된 검사는 원본을 유지하고 `qualityDisposition = PENDING`·의존 사건 부재를 잠금 뒤 재검증해 `CorrectionEvent`·`InspectionCorrection`·전체 `InspectionCorrectionResult` snapshot을 한 transaction에서 추가한다. server가 고정 기준과 정정 측정값으로 유효 판정을 다시 계산한다.
- `effectiveConsumption = originalConsumption - Σ MaterialConsumptionCorrection.quantity`다.
- `effectiveRelationQuantity = originalRelation.quantity - Σ LotRelationCorrection.quantity`다. 기본 계보 조회는 유효수량이 0보다 큰 edge만 탐색하고 상세·감사 조회는 원 수량·누적 정정·유효수량을 함께 표시한다.
- `RETURN_UNUSED`는 반납 원장, CorrectionEvent, 소비 정정, 원 `CONSUME` edge 정정과 AuditEvent의 수량이 같아야 하며 한 transaction에서 생성한다.
- v1.0에서 `LotRelationCorrection`은 `CONSUME`에만 허용한다. `SPLIT`·`MERGE`·`TRANSFORM`·`SERIALIZE`는 후속 관계가 없을 때 사건 전체 취소만 허용하고 부분 정정은 비범위다.
- 정정 전후 이력과 원본·정정 사건의 연결을 모두 조회할 수 있어야 한다.
- 검사 상세은 원본과 모든 정정 version, 현재 유효 version과 판정을 구분해 표시한다.

### 6.5 품질 disposition 결정

`decideMaterialLotQuality`는 품질 담당자만 실행한다. 대상 자재 LOT과 version을 잠그고 `PENDING → ACCEPTED | HOLD | REJECTED` 또는 `HOLD → ACCEPTED | REJECTED` 전이, 필수 사유, 활성 격리 부재와 `commandId`를 검증한 뒤 disposition과 `AuditEvent`를 한 transaction에서 기록한다. `ACCEPTED`가 되기 전에는 `onHand`가 있어도 `available = 0`이다. 전체 수입검사 workflow는 만들지 않는다.

`decideProductionLotQuality`도 품질 담당자만 실행하며 검사 판정과 별도 명령이다. `HOLD`·`REJECTED`는 필수 사유와 허용 전이를 기록하되 과거 검사 결과를 바꾸지 않는다. `ACCEPTED`는 다음을 잠근 뒤 한 transaction에서 수행한다.

1. 대상 LOT의 현재 disposition이 `PENDING` 또는 `HOLD`인지 확인
2. 릴리스된 route의 모든 공정이 완료됐는지 확인
3. 적용 가능한 모든 필수 검사 실행이 완료되고 유효 판정이 `PASS`인지 확인
4. 활성 `PENDING`·`SCRAPPED` QuarantineTarget이 없는지 확인
5. `qualityDisposition = ACCEPTED`, 생산 진행 `COMPLETED`, `AuditEvent` 기록
6. 같은 WorkOrder의 모든 LOT 종결과 계보 수량을 검증해 가능한 경우 WorkOrder도 `COMPLETED`로 전이

권한·사유·전이·검사·격리·완료 projection 중 하나라도 실패하면 disposition, 생산 LOT, WorkOrder와 감사 기록을 모두 rollback한다. 같은 `commandId` 재전송은 기존 결과를 반환한다. `QUARANTINED` 진입과 해제·폐기는 #16의 사건·격리 명령이 소유한다.

## 7. LOT 계보 계약

### 7.1 관계 유형

| 유형 | 허용 parent | 허용 child | 의미 |
|---|---|---|---|
| `CONSUME` | MaterialLot | ProductionLot | 자재의 실제 투입 |
| `SPLIT` | ProductionLot | ProductionLot | 하나의 생산 LOT를 여러 LOT로 분할 |
| `MERGE` | ProductionLot | ProductionLot | 여러 생산 LOT를 하나로 합류 |
| `TRANSFORM` | ProductionLot | ProductionLot | SPLIT·MERGE로 충분하지 않은 생산 LOT 입력·산출 변환 |
| `SERIALIZE` | ProductionLot | FinishedUnit | 생산 LOT에서 완제품 일련번호 생성 |

### 7.2 사건 cardinality와 호환성

| 사건 | 입력 | 출력 | v1.0 제약 |
|---|---:|---:|---|
| `SPLIT` | 생산 LOT 정확히 1개 | 생산 LOT 2개 이상 | 동일 WorkOrder·Product·route 위치·`baseUom` |
| `MERGE` | 생산 LOT 2개 이상 | 생산 LOT 정확히 1개 | 동일 WorkOrder·Product·route 위치·`baseUom` |
| `TRANSFORM` | 생산 LOT 정확히 1개 | 생산 LOT 정확히 1개 | 동일 `baseUom`, 입력·출력 수량 보존 |
| `SERIALIZE` | 생산 LOT 정확히 1개 | FinishedUnit 1개 이상 | Product `baseUom = EA`, 최종 route 공정 완료, 일련번호마다 1 EA |

- `SPLIT`·`MERGE`·`TRANSFORM` 입력은 모두 `IN_PROCESS`여야 하며 `HOLD`·`QUARANTINED`·`REJECTED`이면 거부한다.
- 모든 계보 사건의 입력 LOT에는 `IN_PROGRESS` 공정이 없어야 하고 현재 route 위치의 필수 `ROUTE_ADVANCE` 검사 유효 판정이 `PASS`여야 한다. `PENDING`·`IN_PROGRESS`·`FAIL`·`HOLD` 검사는 사건 전체를 차단한다.
- `SERIALIZE` 입력은 `IN_PROCESS`이고 `currentRoutePosition`이 릴리스된 `ProcessRouteRevision`의 마지막 `ProcessStepRevision`과 같아야 한다. 최종 공정 실행이 `COMPLETED`이고 미완료 후속 공정이 없음을 transaction에서 다시 검증한다. 중간 공정 LOT이나 최종 공정 미완료 LOT의 일련번호 생성은 거부한다.
- 출력 생산 LOT는 입력과 같은 WorkOrder·Product·release revision·현재 route 위치를 참조하고 `IN_PROCESS + PENDING`으로 생성한다.
- 완료된 선행 공정과 검사 사실은 입력 LOT에 보존하고 출력 LOT로 복제하지 않는다. 출력 LOT의 완료 게이트는 upstream event와 route 위치를 따라 선행 근거를 조회한다.
- 한 사건이 입력 LOT의 `traceRemaining`을 모두 사용하면 입력 LOT를 같은 transaction에서 `SUPERSEDED`로 전이한다. 일부만 사용하면 잔량과 함께 `IN_PROCESS`를 유지한다.
- `SERIALIZE`는 입력 LOT을 `SUPERSEDED`로 만들지 않는다. 완제품 사용 가능성은 원천 LOT의 완료·품질과 QuarantineTarget 처분에서 투영한다.

### 7.3 공통 불변조건

- parent와 child는 같을 수 없다.
- 새 edge가 기존 그래프에 순환을 만들면 거부한다.
- `eventId`, parent, child, relationType 조합은 중복될 수 없다.
- 관계 수량은 0보다 크고 `uom`을 가진다.
- 같은 사건의 입력·출력과 edge를 하나의 transaction으로 생성한다.
- `SPLIT`·`MERGE`·`TRANSFORM`의 출력 생산 LOT는 사건 안에서 새로 생성하며 `createdQuantity`는 해당 출력으로 들어오는 edge 수량 합계와 같아야 한다.
- 같은 단위의 사건은 유효한 입력·출력 합계뿐 아니라 각 입력 LOT의 유효 누적 outgoing 수량도 검증한다.
- 확정 edge는 수정·삭제하지 않는다. `CONSUME`는 원 edge를 참조하는 `LotRelationCorrection`으로 유효수량을 줄이고, 나머지 관계는 후속 관계가 없을 때 사건 전체 취소만 허용한다.
- `FinishedUnit`은 정확히 하나의 유효한 `SERIALIZE` incoming edge를 가진다.

### 7.4 가상 fixture

#### `FIX-SENSOR-01` 표준 시나리오

모든 주요 화면, #22~#19의 구현과 seed는 다음 하나의 완전한 가상 기준을 재사용한다. 실제 기업의 제품명·공정·검사수치가 아니다.

| 구분 | 기준 데이터 |
|---|---|
| 제품 | `SEN-DEMO-01` 센서 모듈, `baseUom = EA` |
| BOM | `BOM-DEMO-r1`: `MAT-DEMO-DET` 1 EA + `MAT-DEMO-HSG` 1 EA / 제품 1 EA |
| route | `ROUTE-DEMO-r1`: 10 모듈 조립 → 20 기능 교정 |
| 검사 | 조립 후 `Q-INPROC-DEMO-r1` (`ROUTE_ADVANCE`), 교정 후 `Q-FINAL-DEMO-r1` (`LOT_COMPLETE`) |
| 작업지시 | `WO-DEMO-001`, 계획 10 EA |
| 초기 생산 LOT | `PL-DEMO-001`, 계획 10 EA |
| 자재 LOT | `ML-DEMO-DET` 10 EA, `ML-DEMO-HSG` 10 EA |

정상 흐름은 두 자재 LOT 품질 승인과 예약, `PL-DEMO-001`의 첫 공정 시작에서 각 10 EA 실제 투입, 조립·공정검사 PASS, 자재 거래 없는 기능 교정, 최종검사 PASS, 별도 `ACCEPTED` 결정과 LOT 완료 순서다. 아래 수량·동시성 반례는 이 기준을 복제한 격리된 test variant이며 정상 seed의 상태를 섞지 않는다.

#### 예약은 계보가 아니다

```text
WO-DEMO-001에 ML-DEMO-DET 10 EA 예약
→ MaterialAllocation만 존재
→ TraceNode 관계 0개
```

#### 실제 투입

```text
ML-DEMO-DET --CONSUME 6 EA / EVT-DEMO-101--> PL-DEMO-001
```

#### 미사용 자재 반납과 유효 계보

```text
원 출고·소비·CONSUME edge: 6 EA
RETURN_UNUSED:             2 EA
CorrectionEvent EVT-DEMO-101-C1
├─ MaterialConsumptionCorrection 2 EA
└─ LotRelationCorrection         2 EA

원 이력: 6 EA 유지
유효 소비·CONSUME edge: 4 EA
```

#### 공정 간 수량 보존

```text
1공정: input 10 EA = good 8 EA + defect 2 EA
       defect 2 EA 즉시 생산 폐기, traceRemaining 8 EA
2공정: input 8 EA만 허용
       input 10 EA 요청은 선행 공정 불량 2 EA를 되살리므로 거부
```

#### 부분 분할 후 다음 공정 WIP

```text
1공정 완료: PL-DEMO-P input 10 EA = good 8 EA + defect 2 EA
부분 분할:  PL-DEMO-P --SPLIT 4 EA--> PL-DEMO-P-A

PL-DEMO-P   traceRemaining 4 EA, currentRoutePosition = 1공정 완료
PL-DEMO-P-A traceRemaining 4 EA, currentRoutePosition = 1공정 완료

2공정 시작:
├─ PL-DEMO-P   input 4 EA 허용
└─ PL-DEMO-P-A input 4 EA 허용

어느 LOT에도 분할 전 good 8 EA를 다시 요구하거나 투입하지 않음
```

1공정의 필수 `ROUTE_ADVANCE` 검사가 `PASS`가 아니면 위 부분 분할과 2공정 시작은 모두 차단한다. 하나의 LOT에서 2공정이 `IN_PROGRESS`이면 그 LOT의 추가 분할도 완료 전까지 차단한다.

#### 분할

```text
PL-DEMO-001 6 EA
├─ SPLIT 4 EA / EVT-DEMO-102 → PL-DEMO-001-A
└─ SPLIT 2 EA / EVT-DEMO-102 → PL-DEMO-001-B

PL-DEMO-001 → SUPERSEDED
PL-DEMO-001-A·PL-DEMO-001-B → IN_PROCESS + PENDING
```

#### 합류와 일련번호

```text
PL-DEMO-001-A 4 EA ─┐
                     ├─ MERGE / EVT-DEMO-103 → PL-DEMO-002 6 EA
PL-DEMO-001-B 2 EA ─┘

PL-DEMO-001-A·PL-DEMO-001-B → SUPERSEDED
PL-DEMO-002 → IN_PROCESS + PENDING

PL-DEMO-002 최종 route 공정 COMPLETED
PL-DEMO-002 최종 공정 ROUTE_ADVANCE 검사 PASS
PL-DEMO-002 --SERIALIZE 1 EA / EVT-DEMO-105--> SN-DEMO-0001
PL-DEMO-002 --SERIALIZE 1 EA / EVT-DEMO-105--> SN-DEMO-0002
```

PL-DEMO-002가 중간 route 위치이거나 최종 공정이 미완료이면 같은 `SERIALIZE` 요청은 거부한다. 먼저 생성된 FinishedUnit이 이후 원천 LOT 완료만으로 미수행 공정을 건너뛰는 경로는 존재하지 않는다.

#### 변환

```text
PL-DEMO-X-IN 3 EA --TRANSFORM / EVT-DEMO-104--> PL-DEMO-X-OUT 3 EA
```

v1.0의 변환 fixture는 동일 기준단위의 입력·출력 수량을 보존한다. 수율·단위 변환이 필요한 변환은 비범위로 거부한다.

`SN-DEMO-0001`에서 upstream으로 탐색하면 두 자식 LOT, 원 생산 LOT과 실제 투입 자재를 찾는다. `ML-DEMO-DET`에서 downstream으로 탐색하면 영향 생산 LOT과 완제품을 찾는다.

## 8. 검사규격과 판정 snapshot

작업지시 릴리스는 적용 BOM, route와 검사 요구사항 revision을 고정한다. 각 `InspectionResult`는 판정 당시 다음 값을 보존한다.

- 항목 코드와 표시명
- 데이터 유형과 단위
- 필수 여부
- 목표값·하한·상한·허용값 집합
- 판정방식
- 실제 측정값
- 항목 판정과 전체 판정
- 측정자·판정자·발생시각

지원 판정방식은 `BETWEEN_INCLUSIVE`, `MIN_INCLUSIVE`, `MAX_INCLUSIVE`, `EXACT`, `ATTRIBUTE_SET`으로 제한한다. 규격이 새 revision으로 바뀌어도 과거 결과를 자동 재판정하지 않는다.

판정 정정은 원본 항목을 수정하지 않고 전체 snapshot version을 추가한다. 예를 들어 원본 `PASS`·`qualityDisposition = PENDING`의 측정값 오기입을 의존 사건 전에 `FAIL`로 정정하면 원본과 정정 version을 모두 조회할 수 있고, 유효 판정은 마지막 정정의 `FAIL`이며 disposition은 `PENDING`을 유지한다. 이미 disposition이 결정됐거나 다음 공정·계보·완료가 원 판정에 의존했다면 정정 대신 `QualityIncident`를 생성한다.

## 9. 핵심 불변조건과 Given/When/Then

| ID | 불변조건 | Given | When | Then |
|---|---|---|---|---|
| `RULE-01` | 수량과 잔량은 음수가 될 수 없다. | onHand 5 EA | 6 EA 감소 요청 | 명령 거부, 원장 변화 없음 |
| `RULE-02` | 예약량은 현재 available을 초과할 수 없다. | available 5 EA | 6 EA 예약 | 예약 거부 |
| `RULE-03` | ACCEPTED가 아니거나 활성 격리·만료·종결된 자재 LOT는 신규 예약·투입할 수 없다. | 활성 격리된 ACCEPTED 자재 LOT | 예약 요청 | 격리 차단 사유 반환 |
| `RULE-04` | 예약은 물리 출고·소비·계보를 만들지 않는다. | accepted LOT | 3 EA 예약 | allocation만 생성 |
| `RULE-05` | 실제 투입은 예약잔량과 onHand를 모두 초과할 수 없다. | 예약잔량 3, onHand 5 | 4 EA 투입 | 전체 rollback |
| `RULE-06` | 실제 투입의 원장·소비·계보·공정·상위 상태·감사는 원자적이다. | 유효한 예약 | 감사 기록 단계 실패 | 모든 변경 rollback |
| `RULE-07` | 예약잔량은 예약-총출고-해제와 같고 0이면 닫히며 반납은 재활성화하지 않는다. | 예약 10, 출고 4 | 잔여 6 해제 후 2 반환 | 잔량 0·MIXED·CLOSED 유지, onHand 2 증가 |
| `RULE-08` | 작업지시 릴리스는 발행 revision, 자재·검사 요구사항과 계획수량 전체를 가진 초기 생산 LOT 하나를 원자적으로 고정한다. | BOM r3·route r2·검사 r4·계획 10 EA | 릴리스 후 새 revision 발행 | 기존 지시는 고정 snapshot·초기 LOT 1개·계획 10 유지 |
| `RULE-09` | 실제 실적이 있는 작업지시는 취소할 수 없다. | 공정 시작 완료 | 작업지시 취소 | 거부, 상태 유지 |
| `RULE-10` | 실적 없는 작업지시 취소는 예약·하위 LOT·대기 공정·검사를 함께 닫는다. | RELEASED, 활성 예약·대기 공정 | 취소 | 예약 해제·하위 대상 CANCELLED·감사 기록 |
| `RULE-11` | 선행 공정 미완료 시 후속 공정을 시작·완료할 수 없다. | 1공정 진행 중 | 2공정 시작 | 순서 위반 거부 |
| `RULE-12` | 공정 투입수량은 양품+불량과 같고 시작 투입은 잠근 현재 LOT의 `routeWipAvailable`과 같다. | 1공정 양품 8·불량 2, 현재 LOT WIP 8 | 2공정에 10 투입 | 되살아난 불량 2를 근거로 전체 거부 |
| `RULE-13` | 필수 검사 누락·FAIL·HOLD이면 그 요구사항의 gate가 통제하는 route 진행·계보·LOT 완료를 수행할 수 없다. | 공정 중 필수 검사 PENDING | 다음 공정 시작 | 검사 요구사항과 차단 이유 반환 |
| `RULE-14` | 생산 LOT 완료에는 모든 공정 완료와 ACCEPTED가 필요하다. | 공정 완료, disposition HOLD | 완료 요청 | 거부 |
| `RULE-15` | 작업지시는 모든 LOT가 COMPLETED·SUPERSEDED·SCRAPPED로 종결되고 계보 수량이 보존된 뒤에만 완료된다. | 자식 LOT 2개 중 1개 IN_PROCESS | 작업지시 완료 | 미종결 LOT ID와 수량 근거를 반환하며 거부 |
| `RULE-16` | 확정 실적·판정·계보는 덮어쓰지 않는다. | 완료 검사 PASS | 측정값 update | 거부하고 정정 명령 안내 |
| `RULE-17` | 같은 commandId는 결과를 중복 반영하지 않는다. | 투입 명령 성공 | 같은 ID 재전송 | 기존 결과 반환, 거래 1건 유지 |
| `RULE-18` | 오래된 version의 수정은 최신값을 덮지 않는다. | aggregate version 7 | version 6으로 수정 | 충돌과 최신 version 반환 |
| `RULE-19` | 계보 edge는 자기참조·중복·순환을 허용하지 않는다. | A→B→C 존재 | C→A 생성 | 거부, path 근거 반환 |
| `RULE-20` | 계보 사건은 cardinality·호환성·수량 보존을 지키고 누적 outgoing이 입력 잔량을 넘지 않는다. | A: 입력 합계 10 EA; B: 입력 잔량 4 EA; C: SPLIT 입력 1·출력 1 | A: 출력 합계 9 EA; B: 5 EA 추가; C: 사건 확정 | 세 사건 모두 전체 거부 |
| `RULE-21` | 완제품 일련번호는 고유하고 최종 route 공정을 완료한 `IN_PROCESS` 원천 LOT 하나를 가진다. | 2공정 route의 1공정만 완료한 LOT 또는 SN-DEMO-0001 존재 | 중간 공정 LOT에서 SERIALIZE 또는 같은 번호 재생성 | 최종 route 미도달 또는 중복으로 거부 |
| `RULE-22` | 검사 결과는 적용 revision과 기준 snapshot을 보존한다. | 규격 r2로 PASS | r3 발행 | 과거 PASS·기준 유지 |
| `RULE-23` | 사후 부적합은 과거 완료·합격을 지우지 않고 현재 사용성을 차단한다. | COMPLETED·PASS LOT | incident 격리 | 완료·PASS 유지, disposition QUARANTINED |
| `RULE-24` | 격리·폐기·보류·거부·만료·종결 LOT의 available은 0이다. | onHand 20, reserved 5 | PENDING quarantine target 생성 | available 0, reserved 5는 보이되 투입 차단, 기존 소비 이력 유지 |
| `RULE-25` | 중요 명령은 행위자·시각·사유·전후값·요청 ID를 남긴다. | 상태변경 성공 | 감사 조회 | 필수 필드가 있는 이벤트 1건 |
| `RULE-26` | 예약·소비는 같은 WorkOrder의 자재 요구에 귀속되고 Material과 요구수량을 벗어날 수 없다. | WO-A의 MAT-X 요구 10·소비 6·예약 4 | WO-B LOT 또는 MAT-Y로 1 추가 예약·소비 | WorkOrder·Material 불일치 또는 요구량 초과로 거부 |
| `RULE-27` | 공정 불량수량은 즉시 생산 폐기되어 후속 공정·계보 산출에 다시 포함될 수 없다. | A: 1공정 양품 8·불량 2; B: 양품 0·불량 10 | A: 후속 투입·분할 합계 9; B: 공정 완료 | A는 유효 WIP 8 초과로 거부, B의 LOT은 SCRAPPED·REJECTED 종결 |
| `RULE-28` | 정정은 원본을 보존하고 누적 정정량과 연결된 원장·소비·edge 수량을 원자적으로 제한한다. | 출고·소비·CONSUME 6, 기존 정정 1 | 2 반납 중 edge 정정 실패 또는 6 추가 정정 | 전체 rollback 또는 원 수량 초과 거부, 유효수량 일치 유지 |
| `RULE-29` | 부분 분할 뒤 각 LOT의 다음 공정 투입은 분할 전 양품이 아니라 각자의 현재 route WIP와 같아야 한다. | 1공정 양품 8 뒤 4만 자식 LOT로 분할 | 부모·자식의 2공정 시작 | 각 4 EA만 허용하고 합계 8 보존 |
| `RULE-30` | 첫 공정은 선행 검사 없이 시작하고, 직전 공정의 필수 `ROUTE_ADVANCE` 유효 `PASS` 전에는 후속 공정과 계보 변환을 수행할 수 없다. | A: 첫 공정 대기; B: 1공정 완료·필수 검사 FAIL | A: 첫 공정 시작; B: 2공정 시작 또는 SPLIT | A 허용, B는 직전 검사 근거로 전체 거부 |
| `RULE-31` | 검사 정정은 `qualityDisposition = PENDING`이고 의존 사건이 없을 때만 원본 보존 선형 version으로 허용한다. | A: 원 검사 PASS·PENDING·의존 사건 없음; B: 원 검사 FAIL 뒤 REJECTED | PASS를 FAIL로 정정 | A는 원본 보존·유효 FAIL·PENDING 유지, B는 정정 거부 후 QualityIncident 안내 |
| `RULE-32` | 자재 요구량은 계획수량과 제품 기준단위당 소요량의 정확한 십진 곱이며 단위 불일치·초과 정밀도·암묵적 반올림을 허용하지 않는다. | 계획 3 EA, 단위당 0.125 KG | 작업지시 릴리스 | 0.375 KG snapshot; 자재 단위 불일치나 소수 6자리 초과면 전체 거부 |
| `RULE-33` | 누적 출고와 해제는 예약량을 초과할 수 없고 두 명령은 같은 Allocation 잠금에서 직렬화된다. | 예약 10, 기존 출고 4 | 해제 6과 출고 1 동시 요청 | 하나만 먼저 성공하고 나머지는 최신 잔량 기준 거부 |
| `RULE-34` | 자재는 유일한 초기 생산 LOT의 첫 route 공정에서 작업지시 요구량 전부를 소비하고 후속 공정은 자재 거래를 만들지 않는다. | WO·초기 LOT 계획 10, MAT-X 요구·예약 10 | 첫 공정 뒤 2공정 시작 | 첫 공정에서 10 출고·소비·연결, 2공정의 자재 거래 0건 |
| `RULE-35` | 자재 LOT은 품질 담당자의 별도 결정 전 `PENDING`이며 권한·사유·허용 전이·감사를 원자적으로 보존한다. | 입고된 PENDING 자재 LOT, onHand 10 | 자재 담당자가 ACCEPTED 요청 또는 품질 담당자가 사유 없이 요청 | 둘 다 거부, available 0과 PENDING 유지 |
| `RULE-36` | 생산 LOT `ACCEPTED` 결정은 검사 판정과 분리하고 모든 공정·필수 검사 PASS·격리 부재를 확인해 LOT·WorkOrder 완료와 원자적으로 처리한다. | A: 최종검사 PASS·모든 공정 완료; B: 최종검사 PENDING | 품질 담당자가 ACCEPTED 결정 | A는 LOT ACCEPTED+COMPLETED와 가능한 WorkOrder 완료, B는 전체 거부·PENDING 유지 |

## 10. 진실 공급원

| 질문 | 진실 공급원 | projection·금지 사항 |
|---|---|---|
| 현재 물리 재고는 얼마인가? | `InventoryTransaction` 합계 | 임의 balance update 금지 |
| 무엇이 얼마나 요구됐는가? | `WorkOrderMaterialRequirement`의 계획수량·단위당 소요량·정확한 곱 snapshot | 최신 BOM에서 역산하거나 반올림 금지 |
| 얼마가 예약됐는가? | 요구사항에 귀속된 `MaterialAllocation` 원 수량과 `MaterialAllocationRelease`·총출고의 정확한 차 | WorkOrder 상태 또는 `max(..., 0)`으로 오류 은폐 금지 |
| 무엇이 실제 투입됐는가? | 원 `MaterialConsumption`과 `MaterialConsumptionCorrection`의 유효합계·출고 transaction | 예약을 투입으로 해석 금지 |
| LOT·일련번호가 어떻게 연결됐는가? | 원 `LotRelation`과 `LotRelationCorrection`의 유효 edge | AuditEvent에서 계보 재계산 금지 |
| 다음 공정에 투입 가능한 수량은 얼마인가? | 현재 route 위치와 생산 LOT의 잠긴 `routeWipAvailable` | 분할 전 선행 양품 또는 client 입력을 그대로 신뢰하지 않음 |
| 어떤 기준과 판정이 현재 유효한가? | 원 `InspectionResult`와 선형 `InspectionCorrection` chain의 마지막 전체 snapshot | 최신 spec으로 과거 재판정하거나 원본 update 금지 |
| 현재 사용 가능한가? | LOT의 `qualityDisposition`·`PENDING`/`SCRAPPED` QuarantineTarget·원장·예약 projection | 생산 진행 상태나 검사 판정과 합치지 않음 |
| 완제품이 출하 적격한가? | 원천 생산 LOT의 완료·품질과 활성 QuarantineTarget에서 계산한 `shipmentEligibility` | 출하 승인·출하 상태·출하 command를 만들지 않음 |
| 누가 왜 바꿨는가? | `AuditEvent` | 감사이력을 업무 원장으로 사용 금지 |

## 11. 구현 Issue 연결

| 계약 | 구현 Issue | 직접 참조할 규칙 | 필수 검증 |
|---|---|---|---|
| server session·행위자 경계 | #10 | `RULE-25` | client actor 위조·권한 없음·역할 전환 |
| 작업지시 생성·감사 기반 | #11 | `RULE-17`, `RULE-18`, `RULE-25` | 생성 rollback·idempotency·낙관적 잠금 |
| 기준 revision·요구사항·릴리스 | [#22](https://github.com/wooinwoo/sensor-manufacturing-mes/issues/22) | `RULE-08`, `RULE-17`, `RULE-18`, `RULE-25`, `RULE-32` | 정확한 요구량·snapshot·초기 LOT·상태·감사 원자성 |
| 수량 원장·부분 예약 | #12 | `RULE-01`~`RULE-04`, `RULE-07`, `RULE-17`, `RULE-18`, `RULE-24`~`RULE-26`, `RULE-33`, `RULE-35` | 동시 예약·출고/해제 경쟁·요구량 초과·소유권·자재 품질 결정 |
| 실제 투입·공정 transaction | #13 | `RULE-05`, `RULE-06`, `RULE-09`~`RULE-12`, `RULE-16`, `RULE-17`, `RULE-25`~`RULE-30`, `RULE-33`, `RULE-34` | 중간 실패 rollback·WorkOrder 귀속·첫 공정 LOT 몫·후속 공정 자재 거래 0건·WIP·검사 gate·정정 |
| 규격 snapshot·판정·완료 게이트 | #14 | `RULE-13`~`RULE-16`, `RULE-22`, `RULE-23`, `RULE-25`, `RULE-27`, `RULE-30`, `RULE-31`, `RULE-36` | 경계값·revision 변경·직전 공정 gate·PENDING 정정·품질 결정·종결 LOT 완료 |
| 분할·합류·일련번호 계보 | #15 | `RULE-16`, `RULE-19`~`RULE-21`, `RULE-25`, `RULE-27`~`RULE-30` | 순환·중복·부분 분할 WIP·최종 route SERIALIZE·검사 gate·양방향 조회 |
| 사후 부적합·격리 | #16 | `RULE-03`, `RULE-23`~`RULE-25`, `RULE-27` | 완료·합격 보존, downstream 차단과 생산 폐기 |
| 감사 검색·redaction | #17 | `RULE-16`, `RULE-17`, `RULE-25` | 중요 명령 누락·권한 없음·민감값 제외 |

## 12. Issue #2 완료 검증표

- [x] 핵심 엔터티마다 식별자, 책임, 생명주기와 관계가 정의되어 있다. — §3~4
- [x] 생산 진행, 검사 판정, 품질 disposition과 자재 수량이 분리되어 있다. — §5
- [x] 예약과 실제 투입의 차이를 transaction 예시로 설명할 수 있다. — §6
- [x] 유일한 초기 생산 LOT의 첫 공정만 작업지시 요구량을 소비하고 후속 공정은 자재 거래를 만들지 않는다. — §5.2, §6.3, §9 `RULE-34`
- [x] 예약이 릴리스된 자재 요구에 귀속되고 다른 WorkOrder·Material 또는 요구량 초과를 차단한다. — §5.3, §6.1~§6.3
- [x] 선행 공정의 불량수량이 후속 공정에서 되살아나지 않고 WIP·계보 수량이 보존된다. — §3.2, §5.4, §7.4
- [x] 부분 분할 뒤 부모·자식 LOT가 각자의 현재 route WIP만 다음 공정에 투입한다. — §5.4, §7.4
- [x] 미사용 반납이 원 출고·소비·edge를 보존하면서 유효 소비·계보를 같은 수량으로 보정한다. — §5.3, §6.4, §7.4
- [x] 출고와 예약 해제가 경합해도 누적합이 예약량을 넘지 않고 오류를 0으로 숨기지 않는다. — §5.3, §6.2~§6.3
- [x] 소비·분할·합류·변환·일련번호 fixture를 표현할 수 있다. — §7.4
- [x] 공정 중·최종 검사와 revision snapshot을 설명할 수 있다. — §5.5, §8
- [x] 첫 공정은 선행 검사 없이 시작하고 공정 중 필수 검사가 후속 공정과 계보 변환을 차단한다. — §5.2, §5.4, §5.5, §7.2
- [x] `SERIALIZE`는 최종 route 공정을 완료한 `IN_PROCESS` LOT에서만 가능하다. — §7.2, §7.4
- [x] 검사 정정은 `qualityDisposition = PENDING`이고 의존 사건이 없을 때만 원본 보존 version으로 표현된다. — §5.5, §6.4, §8
- [x] 자재·생산 LOT 품질 disposition은 검사 판정과 분리된 권한·사유·감사 명령으로만 바뀐다. — §5.5, §6.5, §9 `RULE-35`~`RULE-36`
- [x] BOM 단위당 소요량에서 작업지시 필요수량을 단위·십진 정밀도·무반올림 규칙으로 계산한다. — §3.2, §6.1
- [x] 주요 상태의 허용·금지 전이가 정의되어 있다. — §5
- [x] 최소 15개 불변조건이 Given/When/Then과 연결되어 있다. — §9의 36개 규칙
- [x] 공개 근거·종합 해석·프로젝트 결정·미결정이 구분되어 있다. — 공개 근거 재검증 문서 §2, §4, §6
- [x] 모든 회사·제품·LOT·측정값이 가상이다. — §2.2, §3.1, §7.4
- [x] 후속 Issue가 규칙 ID와 계약 위치를 직접 참조할 수 있다. — §11
