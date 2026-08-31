# 제조 도메인 계약

| 항목 | 내용 |
|---|---|
| 문서 상태 | `Draft v0.1` |
| 기준일 | 2026-08-31 |
| 관련 Issue | [#2 제조 용어와 핵심 불변조건을 정의](https://github.com/wooinwoo/sensor-manufacturing-mes/issues/2) |
| 공개 근거 | [제조 도메인 공개 근거 재검증](source-review.md) |
| 구현 범위 | #10~#17의 Web·API·DB·test가 공유할 업무 언어와 규칙 |

## 1. 계약의 위치

이 문서는 특정 기업의 내부 MES를 재현하지 않는다. 공개 제조 정보 모델을 참고하되, 단일 사업장·이산형 LOT 생산을 가정한 포트폴리오 MVP의 일관된 업무 언어를 정의한다.

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
- MVP의 예약·출고·소비·분할·합류 수량은 대상의 `baseUom`으로만 기록한다.
- 모든 수량은 0 이상이며 관계·거래의 발생 수량은 0보다 커야 한다.
- 단위가 다른 입력과 출력의 수율 환산은 MVP 비범위다. `TRANSFORM`은 단위 변환을 자동 추론하지 않는다.
- 같은 단위의 `SPLIT`·`MERGE`는 입력 합계와 출력 합계가 같아야 한다.
- 생산 LOT의 `traceRemaining`은 생성수량에서 유효한 outgoing `SPLIT`·`MERGE`·`TRANSFORM`·`SERIALIZE` 수량과 폐기수량을 뺀 projection이다.
- 새 계보 사건은 각 입력 생산 LOT의 `traceRemaining`을 초과할 수 없다.

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
| 자재 예약 | `MaterialAllocation` | 미래 투입을 위해 가용수량 일부를 보류 | 물리 출고·실제 소비 |
| 실제 출고·투입 | `InventoryTransaction` + `MaterialConsumption` | 자재가 창고에서 빠지고 생산에 사용된 확정 사건 | 예약 |
| 가용수량 | `available` projection | 품질상 사용 가능하며 예약되지 않은 현재 잔량 | 물리 잔량 `onHand` |
| 공정실적 | `ProcessExecution` | 특정 생산 LOT의 공정 시작·완료와 실제 수량 | 공정 기준 revision |
| 검사 실행 | `Inspection.executionStatus` | 검사가 대기·진행·완료됐는지 | 검사 판정 |
| 검사 판정 | `Inspection.verdict` | 검사 결과가 합격·불합격·보류인지 | 품질 disposition |
| 품질 disposition | `qualityDisposition` | 현재 사용·완료·출하 가능한지 나타내는 통제 상태 | 생산 진행 |
| 계보 | `TraceNode` + `LotRelation` | 자재·생산 LOT·완제품 사이의 실제 관계 | 예약 또는 감사로그 |
| downstream 영향 추적 | downstream trace | 원자재에서 영향 생산 LOT·완제품 탐색 | 완제품의 원천 조회 |
| upstream 원천 추적 | upstream trace | 완제품에서 생산 LOT·투입 자재 탐색 | 원자재의 영향 조회 |
| 부적합 사건 | `QualityIncident` | 사후 발견된 품질 문제의 원천 사건 | 개별 검사 FAIL |
| 격리 | `QuarantineCase` | 영향 대상의 사용·완료·출하를 차단하고 처분하는 통제 | 과거 완료·합격 취소 |
| 정정 | correction event | 원본을 보존하고 잘못된 확정 사실을 교정하는 후속 사건 | 원본 update·delete |

## 4. 핵심 엔터티 사전

### 4.1 기준정보

| 엔터티 | 식별·책임 | 생명주기 | 주요 관계 |
|---|---|---|---|
| `Product` | 생산 대상 정의와 기준단위 | 활성 → 비활성 | 여러 BOM·route revision 보유 |
| `Material` | 투입 자재 정의와 기준단위 | 활성 → 비활성 | BOM item·자재 LOT가 참조 |
| `BomRevision` | 제품 단위 필요 자재와 수량 | 초안 → 발행 → 비활성 | `BomItem` 집합, WorkOrder가 발행본 참조 |
| `BomItem` | 자재·소요량·단위를 정의 | 소속 revision과 함께 불변 | Material 참조 |
| `ProcessRouteRevision` | 공정 순서와 선행조건 | 초안 → 발행 → 비활성 | `ProcessStepRevision` 집합 |
| `ProcessStepRevision` | 한 공정의 순서·이름·완료 요구 | 소속 revision과 함께 불변 | 검사 요구사항과 연결 |
| `InspectionSpecRevision` | 검사 항목·기준·판정방식 | 초안 → 발행 → 비활성 | 공정·최종검사 요구사항에서 참조 |
| `InspectionRequirement` | 공정·최종검사와 적용 규격의 release snapshot | 작업지시 릴리스 후 불변 | WorkOrder·공정·spec revision 연결 |

발행 revision은 수정하지 않는다. 변경은 새 revision을 발행하며 이미 릴리스된 작업지시의 기준을 바꾸지 않는다.

### 4.2 생산

| 엔터티 | 식별·책임 | 생명주기 | 주요 관계 |
|---|---|---|---|
| `WorkOrder` | 제품·계획수량·납기와 생산 승인 단위 | `DRAFT`부터 완료·취소까지 | 릴리스 후 revision snapshot과 하나 이상의 ProductionLot |
| `ProductionLot` | 공정·검사·품질 통제를 받는 생산 묶음 | 계획 → 준비 → 진행 → 완료·취소 | WorkOrder, ProcessExecution, TraceNode |
| `ProcessExecution` | 공정 단계의 실제 시작·완료와 수량 | 대기 → 진행 → 완료 | ProductionLot·공정 revision·실제 투입 |
| `DefectRecord` | 공정에서 발생한 불량 수량·유형 | 기록 → 정정 가능 | ProcessExecution에 귀속 |
| `FinishedUnit` | 완제품 일련번호 단위 식별 | 생성 → 활성 | 하나의 최종 생산 LOT에서 serialize |
| `LotTransformationEvent` | 분할·합류·변환·일련번호 생성 사건 | append-only | 입력·출력 TraceNode와 LotRelation 생성 |

### 4.3 재고

| 엔터티 | 식별·책임 | 생명주기 | 주요 관계 |
|---|---|---|---|
| `MaterialLot` | 동일 자재·입고 묶음의 식별과 품질 통제 | 원장 잔량과 disposition으로 투영 | Material·InventoryTransaction·TraceNode |
| `InventoryTransaction` | 입고·출고·반납·조정·폐기의 수량 원장 | append-only | MaterialLot·업무 사건 참조 |
| `MaterialAllocation` | 작업지시에 보류한 자재 LOT 수량 | `ACTIVE` → `CLOSED` | WorkOrder·MaterialLot, 종료 이유는 수량에서 계산 |
| `MaterialConsumption` | 생산에 실제 사용된 자재와 수량 | append-only | Allocation·ProcessExecution·CONSUME 관계 |

`MaterialAllocation`은 사용자 화면에서 `자재 예약`으로 부른다. 예약은 실제 투입이나 계보가 아니다.

### 4.4 품질·계보·감사

| 엔터티 | 식별·책임 | 생명주기 | 주요 관계 |
|---|---|---|---|
| `Inspection` | 검사 실행 상태·전체 판정·적용 revision | 대기 → 진행 → 완료·취소 | 생산 LOT·공정·InspectionResult |
| `InspectionResult` | 항목별 기준 snapshot·실측값·판정 | append-only, 정정 사건 허용 | Inspection에 귀속 |
| `QualityIncident` | 자재 LOT·생산 LOT·완제품에서 사후 발견한 부적합 | 조사·영향평가·봉쇄·종결 | 하나의 원천 TraceNode |
| `QuarantineCase` | 영향 대상의 사용·완료·출하 차단과 처분 | 개시·검토·해제·폐기 | Incident와 여러 영향 TraceNode |
| `QuarantineTarget` | 영향 TraceNode별 격리·해제·폐기 결과 | case와 함께 생성 후 처분 | QuarantineCase·TraceNode 연결 |
| `TraceNode` | 자재 LOT·생산 LOT·완제품의 공통 추적 식별자 | 대상과 함께 생성 | 정확히 하나의 업무 대상 참조 |
| `LotRelation` | 투입·분할·합류·변환·일련번호의 방향성 edge | append-only | parent·child TraceNode와 eventId |
| `AuditEvent` | 중요한 명령의 행위자·사유·전후 값 | append-only | commandId·대상 식별자 참조 |
| `CommandReceipt` | idempotency key와 최초 명령 결과 보존 | 보존기간 동안 불변 | 같은 명령의 중복 실행 차단 |

`AuditEvent`는 설명 근거이지 재고·상태·계보를 재계산하는 진실 공급원이 아니다.

### 4.5 관계 지도

```text
Product
├─ BomRevision ─ BomItem ─ Material ─ MaterialLot
├─ ProcessRouteRevision ─ ProcessStepRevision
└─ InspectionSpecRevision

WorkOrder ─ release revision·InspectionRequirement
└─ ProductionLot ─ ProcessExecution ─ Inspection ─ InspectionResult
                  └─ FinishedUnit

MaterialLot ─ MaterialAllocation ─ WorkOrder
MaterialLot ─ InventoryTransaction
MaterialLot ─ MaterialConsumption ─ ProcessExecution

MaterialLot·ProductionLot·FinishedUnit
└─ TraceNode ─ LotRelation ─ LotTransformationEvent
   └─ QualityIncident ─ QuarantineCase ─ QuarantineTarget

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
| `DRAFT → RELEASED` | 발행된 BOM·route·검사규격, 계획수량, 납기 유효 | revision 참조와 요구사항 snapshot 고정 |
| `RELEASED → IN_PROGRESS` | 하나 이상의 생산 LOT 공정 시작 성공 | 실제 투입 실패 시 전이하지 않음 |
| `IN_PROGRESS → COMPLETED` | 모든 소속 생산 LOT가 `COMPLETED` | client가 직접 완료 상태를 지정할 수 없음 |
| `DRAFT·RELEASED → CANCELLED` | 실제 투입·공정·검사 실적 없음 | 활성 예약 해제와 미착수 생산 LOT 취소를 한 transaction으로 수행 |

### 5.2 생산 LOT의 두 상태 축

```text
생산 진행
PLANNED → READY → IN_PROCESS → COMPLETED
    └───────┴────────────────→ CANCELLED  (작업지시 취소에 의해서만)

품질 disposition
PENDING → ACCEPTED | HOLD | REJECTED
ACCEPTED → QUARANTINED
HOLD → ACCEPTED | REJECTED | QUARANTINED
QUARANTINED → ACCEPTED | REJECTED
```

- 생산 완료 사실과 현재 사용 가능 여부를 한 상태로 합치지 않는다.
- `COMPLETED + ACCEPTED` LOT도 사후 부적합 사건으로 `QUARANTINED`가 될 수 있다.
- `HOLD`는 판정 보류, `QUARANTINED`는 사건 기반 containment, `REJECTED`는 최종 사용 거부다.
- `REJECTED`는 품질 축의 종결 상태이며 물리 잔량 처리는 별도 폐기·반출 transaction으로 기록한다.

### 5.3 자재 LOT의 수량·품질·가용성

```text
onHand = Σ InventoryTransaction.signedQuantity
allocationRemaining = reservedQuantity - consumedQuantity - releasedQuantity
reserved = Σ ACTIVE MaterialAllocation.allocationRemaining
consumed = Σ ISSUE_TO_PRODUCTION.quantity
scrapped = Σ SCRAP.quantity

available =
  disposition = ACCEPTED 이고 closedAt = null 이면 max(onHand - reserved, 0)
  그 외 0
```

- `onHand`·`reserved`·`available`·`consumed`·`scrapped`는 서로 다른 의미다.
- allocation 잔량이 0이면 `CLOSED`이며 종료 이유는 `FULFILLED`·`RELEASED`·`MIXED` 중 하나로 계산한다.
- `OPEN`과 `EXHAUSTED`는 저장 상태가 아니라 `onHand > 0` 여부로 계산하는 projection이다.
- `closedAt`은 더 이상 거래를 허용하지 않는 명시적 종결이며 임의로 되돌리지 않는다.
- 품질 disposition은 생산 LOT과 같은 의미를 사용한다. `QUARANTINED` 잔량은 `onHand`에는 남지만 `available`은 0이다.

### 5.4 공정 실행

```text
PENDING → IN_PROGRESS → COMPLETED
```

- 선행 공정이 완료되지 않으면 후속 공정을 시작하거나 완료할 수 없다.
- `COMPLETED` 실적은 수정하지 않고 정정 사건과 보정 수량을 추가한다.
- MVP는 재작업 route를 지원하지 않는다. 재작업 필요 사례는 명시적으로 차단하고 후속 Issue로 보낸다.

### 5.5 검사의 실행 상태와 판정

```text
실행 상태: PENDING → IN_PROGRESS → COMPLETED
                    └───────────→ CANCELLED  (측정값·판정이 없을 때만)

판정: UNDECIDED → PASS | FAIL | HOLD
```

- 실행 상태와 판정을 한 enum에 섞지 않는다.
- `COMPLETED` 검사는 `PASS`, `FAIL`, `HOLD` 중 하나의 판정을 반드시 가진다.
- 공정 중 검사와 최종 검사는 별도 `Inspection`이며 각자 적용 규격 revision을 가진다.
- 항목별 필수값이 누락되면 전체 검사를 완료할 수 없다.
- 검사 판정은 품질 disposition의 근거이지 같은 상태값이 아니다. 최종 필수검사가 모두 `PASS`여야 `ACCEPTED` 결정을 내릴 수 있다.
- `FAIL`은 자동으로 과거 사실을 삭제하지 않는다. 품질 담당자가 `HOLD` 또는 `REJECTED` disposition을 결정하고 근거를 남긴다.
- 자재 LOT의 전체 수입검사는 비범위지만 `PENDING`에서 벗어나는 최소 품질 결정은 행위자·근거·감사이력을 요구한다.

### 5.6 부적합 사건과 격리

```text
QualityIncident: OPEN → ASSESSED → CONTAINED → CLOSED
                              └──────────────→ CLOSED  (영향 없음 근거 필요)

QuarantineCase: OPEN → UNDER_REVIEW → RELEASED | SCRAPPED
```

- 사건은 원천 TraceNode 하나에서 시작한다.
- downstream 조회 결과마다 격리 대상을 기록하며 과거 완료·합격 사실을 덮어쓰지 않는다.
- 격리 해제에는 결론·사유·행위자와 근거가 필요하다.
- `RELEASED` 처분과 대상의 `ACCEPTED`, `SCRAPPED` 처분과 폐기 원장·`REJECTED`는 각각 한 transaction에서 정렬한다.
- 사건 종결은 모든 영향 대상의 처분이 끝났거나 영향 없음이 확인된 뒤에만 가능하다.

### 5.7 대표 금지 전이

| 대상 | 금지 전이·명령 | 이유·대안 |
|---|---|---|
| WorkOrder | `IN_PROGRESS → CANCELLED` | 확정 실적 보존; 필요한 경우 개별 정정·품질 통제로 처리 |
| WorkOrder | `COMPLETED → IN_PROGRESS` | 완료 사실을 되돌리지 않음 |
| ProductionLot 진행 | `COMPLETED → IN_PROCESS` | 재작업 route는 MVP 비범위 |
| 품질 disposition | `REJECTED → ACCEPTED` | 최종 거부를 일반 전이로 되돌리지 않음; 잘못된 판정은 정정 사건 필요 |
| 품질 disposition | `ACCEPTED → HOLD` | 사후 문제는 원천 사건과 `QUARANTINED`로 통제 |
| Inspection | `COMPLETED → IN_PROGRESS` | 원 결과 보존; 새 검사 또는 정정 사건 생성 |
| MaterialAllocation | `CLOSED → ACTIVE` | 종료 예약을 되살리지 않고 새 예약 생성 |
| QuarantineCase | `SCRAPPED → RELEASED` | 폐기 원장 이후 물리 잔량을 복원하지 않음 |

## 6. 명령과 transaction 경계

### 6.1 자재 예약

`reserveMaterial`은 다음을 하나의 transaction에서 수행한다.

1. 자재 LOT의 disposition과 종결 여부 확인
2. 현재 원장 잔량과 활성 예약잔량 재계산
3. 가용수량과 요청량 비교
4. `MaterialAllocation` 생성 또는 증가
5. `AuditEvent`와 `commandId` 기록

예약 성공 후 `InventoryTransaction`, `MaterialConsumption`, `LotRelation`은 없어야 한다.

### 6.2 실제 출고·투입과 공정 시작

`startProcessExecution`은 inventory module의 `consumeMaterialReservation`을 호출해 다음을 하나의 transaction으로 닫는다.

```text
예약잔량 감소
→ ISSUE_TO_PRODUCTION 원장 거래
→ MaterialConsumption
→ CONSUME LotRelation
→ ProcessExecution 시작
→ AuditEvent
```

한 단계라도 실패하면 전부 rollback한다. 같은 `commandId` 재전송은 기존 결과를 반환하며 수량·edge·감사 이벤트를 중복 생성하지 않는다.

### 6.3 취소·정정

- 미확정 초안은 수정할 수 있다.
- 확정된 출고·투입·공정 완료·검사 판정·계보 관계는 update·delete하지 않는다.
- 업무상 반대 사건으로 취소 가능한 경우 취소 transaction을 추가한다.
- 잘못 기록된 사실은 원본 ID, 정정 사유와 교정 사건 ID를 연결한다.
- 정정 전후 이력을 모두 조회할 수 있어야 한다.

## 7. LOT 계보 계약

### 7.1 관계 유형

| 유형 | 허용 parent | 허용 child | 의미 |
|---|---|---|---|
| `CONSUME` | MaterialLot | ProductionLot | 자재의 실제 투입 |
| `SPLIT` | ProductionLot | ProductionLot | 하나의 생산 LOT를 여러 LOT로 분할 |
| `MERGE` | ProductionLot | ProductionLot | 여러 생산 LOT를 하나로 합류 |
| `TRANSFORM` | ProductionLot | ProductionLot | SPLIT·MERGE로 충분하지 않은 생산 LOT 입력·산출 변환 |
| `SERIALIZE` | ProductionLot | FinishedUnit | 생산 LOT에서 완제품 일련번호 생성 |

### 7.2 공통 불변조건

- parent와 child는 같을 수 없다.
- 새 edge가 기존 그래프에 순환을 만들면 거부한다.
- `eventId`, parent, child, relationType 조합은 중복될 수 없다.
- 관계 수량은 0보다 크고 `uom`을 가진다.
- 같은 사건의 입력·출력과 edge를 하나의 transaction으로 생성한다.
- 같은 단위의 사건은 입력·출력 합계뿐 아니라 각 입력 LOT의 누적 outgoing 수량도 검증한다.
- 확정 edge는 수정·삭제하지 않고 취소·정정 사건으로 보정한다.
- `FinishedUnit`은 정확히 하나의 유효한 `SERIALIZE` incoming edge를 가진다.

### 7.3 가상 fixture

#### 예약은 계보가 아니다

```text
WO-DEMO-001에 ML-DEMO-A 10 EA 예약
→ MaterialAllocation만 존재
→ TraceNode 관계 0개
```

#### 실제 투입

```text
ML-DEMO-A --CONSUME 6 EA / EVT-DEMO-101--> PL-DEMO-001
```

#### 분할

```text
PL-DEMO-001 6 EA
├─ SPLIT 4 EA / EVT-DEMO-102 → PL-DEMO-001-A
└─ SPLIT 2 EA / EVT-DEMO-102 → PL-DEMO-001-B
```

#### 합류와 일련번호

```text
PL-DEMO-001-A 4 EA ─┐
                     ├─ MERGE / EVT-DEMO-103 → PL-DEMO-002 6 EA
PL-DEMO-001-B 2 EA ─┘

PL-DEMO-002 --SERIALIZE 1 EA--> SN-DEMO-0001
PL-DEMO-002 --SERIALIZE 1 EA--> SN-DEMO-0002
```

`SN-DEMO-0001`에서 upstream으로 탐색하면 두 자식 LOT, 원 생산 LOT과 실제 투입 자재를 찾는다. `ML-DEMO-A`에서 downstream으로 탐색하면 영향 생산 LOT과 완제품을 찾는다.

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

## 9. 핵심 불변조건과 Given/When/Then

| ID | 불변조건 | Given | When | Then |
|---|---|---|---|---|
| `RULE-01` | 수량과 잔량은 음수가 될 수 없다. | onHand 5 EA | 6 EA 감소 요청 | 명령 거부, 원장 변화 없음 |
| `RULE-02` | 예약량은 현재 available을 초과할 수 없다. | available 5 EA | 6 EA 예약 | 예약 거부 |
| `RULE-03` | ACCEPTED가 아닌 자재 LOT는 신규 예약·투입할 수 없다. | QUARANTINED 자재 LOT | 예약 요청 | 품질 차단 사유 반환 |
| `RULE-04` | 예약은 물리 출고·소비·계보를 만들지 않는다. | accepted LOT | 3 EA 예약 | allocation만 생성 |
| `RULE-05` | 실제 투입은 예약잔량과 onHand를 모두 초과할 수 없다. | 예약잔량 3, onHand 5 | 4 EA 투입 | 전체 rollback |
| `RULE-06` | 실제 투입의 원장·소비·계보·공정·감사는 원자적이다. | 유효한 예약 | 감사 기록 단계 실패 | 모든 변경 rollback |
| `RULE-07` | 예약잔량은 예약-소비-해제와 같고 0이면 닫힌다. | 예약 10, 소비 4 | 잔여 6 해제 | 잔량 0, 종료 이유 MIXED |
| `RULE-08` | 작업지시 릴리스는 발행 revision과 유효한 LOT 계획을 고정한다. | BOM r3·합계 10 EA LOT 계획 | 릴리스 후 r4 발행 | 기존 지시는 r3·계획 합계 10 유지 |
| `RULE-09` | 실제 실적이 있는 작업지시는 취소할 수 없다. | 공정 시작 완료 | 작업지시 취소 | 거부, 상태 유지 |
| `RULE-10` | 실적 없는 작업지시 취소는 예약과 하위 LOT를 함께 닫는다. | RELEASED, 활성 예약 | 취소 | 예약 해제·LOT CANCELLED·감사 기록 |
| `RULE-11` | 선행 공정 미완료 시 후속 공정을 시작·완료할 수 없다. | 1공정 진행 중 | 2공정 시작 | 순서 위반 거부 |
| `RULE-12` | 공정 투입수량은 양품+불량과 같다. | 투입 10 | 양품 8, 불량 1 완료 | 합계 불일치 거부 |
| `RULE-13` | 필수 검사 누락·FAIL·HOLD이면 생산 LOT를 완료할 수 없다. | 필수 항목 미입력 | LOT 완료 | 차단 항목 반환 |
| `RULE-14` | 생산 LOT 완료에는 모든 공정 완료와 ACCEPTED가 필요하다. | 공정 완료, disposition HOLD | 완료 요청 | 거부 |
| `RULE-15` | 작업지시는 모든 소속 LOT 완료 후에만 완료된다. | 2개 중 1개 완료 | 작업지시 완료 | 거부 |
| `RULE-16` | 확정 실적·판정·계보는 덮어쓰지 않는다. | 완료 검사 PASS | 측정값 update | 거부하고 정정 명령 안내 |
| `RULE-17` | 같은 commandId는 결과를 중복 반영하지 않는다. | 투입 명령 성공 | 같은 ID 재전송 | 기존 결과 반환, 거래 1건 유지 |
| `RULE-18` | 오래된 version의 수정은 최신값을 덮지 않는다. | aggregate version 7 | version 6으로 수정 | 충돌과 최신 version 반환 |
| `RULE-19` | 계보 edge는 자기참조·중복·순환을 허용하지 않는다. | A→B→C 존재 | C→A 생성 | 거부, path 근거 반환 |
| `RULE-20` | 같은 단위의 분할·합류는 수량을 보존하고 누적 outgoing은 입력 잔량을 넘지 않는다. | 입력 10 EA, 기존 outgoing 6 EA | 5 EA 추가 분할 | 사건 전체 거부 |
| `RULE-21` | 완제품 일련번호는 고유하고 원천 LOT 하나를 가진다. | SN-DEMO-0001 존재 | 같은 번호 또는 두 번째 SERIALIZE | 거부 |
| `RULE-22` | 검사 결과는 적용 revision과 기준 snapshot을 보존한다. | 규격 r2로 PASS | r3 발행 | 과거 PASS·기준 유지 |
| `RULE-23` | 사후 부적합은 과거 완료·합격을 지우지 않고 현재 사용성을 차단한다. | COMPLETED·PASS LOT | incident 격리 | 완료·PASS 유지, disposition QUARANTINED |
| `RULE-24` | 격리·보류·거부 LOT의 available은 0이다. | onHand 20, reserved 5 | disposition QUARANTINED | available 0, 기존 소비 이력 유지 |
| `RULE-25` | 중요 명령은 행위자·시각·사유·전후값·요청 ID를 남긴다. | 상태변경 성공 | 감사 조회 | 필수 필드가 있는 이벤트 1건 |

## 10. 진실 공급원

| 질문 | 진실 공급원 | projection·금지 사항 |
|---|---|---|
| 현재 물리 재고는 얼마인가? | `InventoryTransaction` 합계 | 임의 balance update 금지 |
| 얼마가 예약됐는가? | 활성 `MaterialAllocation` 잔량 합계 | WorkOrder 상태에서 추정 금지 |
| 무엇이 실제 투입됐는가? | `MaterialConsumption`과 출고 transaction | 예약을 투입으로 해석 금지 |
| LOT·일련번호가 어떻게 연결됐는가? | `LotRelation` | AuditEvent에서 계보 재계산 금지 |
| 어떤 기준으로 검사했는가? | `InspectionResult` snapshot | 최신 spec으로 과거 재판정 금지 |
| 현재 사용 가능한가? | 품질 disposition·원장·예약 projection | 생산 진행 상태와 합치지 않음 |
| 누가 왜 바꿨는가? | `AuditEvent` | 감사이력을 업무 원장으로 사용 금지 |

## 11. 구현 Issue 연결

| 계약 | 구현 Issue | 필수 검증 |
|---|---|---|
| revision·상태·감사 기반 | #11 | 작업지시 릴리스·취소·낙관적 잠금 |
| 수량 원장·부분 예약 | #12 | 동시 예약·부분 해제·품질 차단 |
| 실제 투입·공정 transaction | #13 | 중간 실패 rollback·idempotency·선행 공정 |
| 규격 snapshot·판정·완료 게이트 | #14 | 경계값·revision 변경·누락 검사 |
| 분할·합류·일련번호 계보 | #15 | 순환·중복·수량 보존·양방향 조회 |
| 사후 부적합·격리 | #16 | 완료·합격 보존과 downstream 차단 |
| 감사 검색·redaction | #17 | 중요 명령 누락·권한 없음·민감값 제외 |

## 12. Issue #2 완료 검증표

- [ ] 핵심 엔터티마다 식별자, 책임, 생명주기와 관계가 정의되어 있다.
- [ ] 생산 진행, 검사 판정, 품질 disposition과 자재 수량이 분리되어 있다.
- [ ] 예약과 실제 투입의 차이를 transaction 예시로 설명할 수 있다.
- [ ] 소비·분할·합류·변환·일련번호 fixture를 표현할 수 있다.
- [ ] 공정 중·최종 검사와 revision snapshot을 설명할 수 있다.
- [ ] 주요 상태의 허용·금지 전이가 정의되어 있다.
- [ ] 최소 15개 불변조건이 Given/When/Then과 연결되어 있다.
- [ ] 공개 근거·종합 해석·프로젝트 결정·미결정이 구분되어 있다.
- [ ] 모든 회사·제품·LOT·측정값이 가상이다.
- [ ] 후속 Issue가 규칙 ID와 계약 위치를 직접 참조할 수 있다.
