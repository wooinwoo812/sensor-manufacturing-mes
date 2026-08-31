# ADR-0002: 사건·원장·분리된 상태축으로 제조 도메인을 모델링한다

- Status: Proposed
- Date: 2026-08-31
- Owners: wooinwoo
- Related: #2, #11, #12, #13, #14, #15, #16, #17, #22

## Context

작업지시, 재고, 생산실적, 검사와 LOT 계보를 일반 CRUD와 하나의 종합 상태로 구현하면 다음 충돌이 생긴다.

- 예약만 했는데 실제 재고와 계보가 바뀐다.
- 전량 출고 후 반납이 닫힌 예약을 다시 여는 것처럼 계산된다.
- 저장된 `READY`가 자재 격리·만료 뒤에도 남아 실제 시작 가능성과 충돌한다.
- 전량 분할·합류된 입력 LOT가 완료되지 못해 작업지시 완료를 영구 차단한다.
- 공정별 내부 합계는 맞지만 선행 공정 불량수량이 후속 공정에서 다시 투입된다.
- 일부만 분할한 부모 LOT가 분할 전 양품수량을 다음 공정 투입으로 요구해 영구 차단된다.
- 공정 중 필수 검사가 끝나지 않아도 다음 공정과 계보 변환을 실행할 수 있다.
- 검사 gate의 기준 공정이 모호하면 첫 공정이 자기 검사 PASS를 시작 전에 요구해 교착된다.
- 최종 route 도달 조건 없이 `SERIALIZE`하면 중간 공정을 건너뛴 완제품이 이후 원천 LOT 완료로 사용 가능해진다.
- 다른 작업지시 또는 BOM 외 자재의 예약을 현재 공정에서 소비할 수 있다.
- BOM 단위당 소요량에서 작업지시 자재 요구량을 만드는 산식·단위·반올림 규칙이 없다.
- 예약잔량의 포화 계산이 출고와 해제의 누적 초과를 0으로 숨긴다.
- 반납이 원 소비와 양수 `CONSUME` edge를 어떤 방식으로 보정하는지 재현할 수 없다.
- 검사 판정을 보존하면서 어떤 version이 유효한지 계산할 정정 모델이 없다.
- 검사 정정 전에 품질 disposition이 이미 결정되면 유효 판정과 되돌릴 수 없는 disposition이 모순될 수 있다.
- 생산 완료, 검사 합격과 사후 격리를 동시에 표현하지 못한다.
- 기준 revision 변경이 과거 작업지시와 검사 판정을 바꾼다.
- 잘못된 실적을 수정·삭제해 원인과 정정 이력을 잃는다.
- 자재·생산 LOT·완제품을 한 방향으로 추적하기 어렵다.

이 프로젝트는 실제 기업의 내부 모델이나 특정 표준 적합성을 주장하지 않으면서도, 실패·동시성·정정 상황에서 설명 가능한 관계형 모델이 필요하다.

## Decision drivers

- 예약과 실제 물리 사건의 명확한 분리
- 재고·계보·검사 결과의 재현성과 감사 가능성
- 생산 진행과 현재 품질 사용성의 독립 표현
- 총출고로 소진되는 예약과 정정 가능한 순소비량의 분리
- 현재 사실에서 다시 계산할 수 있는 시작 readiness
- PostgreSQL transaction과 constraint로 검증 가능한 범위
- React 화면부터 API·DB·test까지 같은 용어 사용
- 1인 개발 범위에서 설명 가능한 구현 복잡도

## Evidence and assumptions

- ISA-95 공개 안내는 생산·재고·품질을 제조운영관리 활동으로 구분한다.
- OPC UA ISA-95 Job Control은 작업 요구사항과 실제 수행 결과를 구분한다.
- SAP 공식 문서는 예약과 제조오더 출고가 서로 다른 시점과 효과를 가진다는 사례를 제공한다.
- GS1 EPCIS는 입력·출력 변환 관계와 원본을 보존하는 오류 선언 모델을 제공한다.
- NIST QIF 자료는 검사 계획·명목 기준·실측 결과·추적 정보의 연결 필요성을 보여준다.
- 정확한 상태명, 완료 게이트와 transaction 경계는 이 프로젝트의 `PROJECT` 결정이다.

근거별 적용 한계는 [제조 도메인 공개 근거 재검증](../domain/source-review.md)에 기록한다.

## Considered options

### 1. mutable CRUD와 단일 status

각 LOT에 현재 재고·현재 공정·검사·품질을 합친 상태를 두고 사용자가 update한다.

- 장점: 초기 schema와 화면이 단순하다.
- 기각 이유: 부분 예약·부분 소비, 사후 격리, 정정 이력과 동시성 반례를 표현하지 못한다.

### 2. 관계형 aggregate와 append-only 사실·projection 조합

기준정보와 현재 업무 상태는 aggregate로 관리하되, 재고 transaction·실제 소비·계보 edge·검사 결과·감사 이벤트는 확정 사실로 추가한다. 현재 잔량과 가용성은 원장과 유효 예약에서 계산한다. 예약은 릴리스된 `WorkOrderMaterialRequirement`에 귀속하고 총출고량과 명시적 해제 사건으로 소진한다. 반납은 원 소비와 원 edge를 보존한 정정행으로 순소비와 유효 계보를 투영한다. 공정 불량은 즉시 생산 폐기하며, 분할·합류를 반영한 현재 LOT의 route WIP만 다음 공정으로 넘긴다. 검사 정정도 원본을 보존한 전체 snapshot version으로 관리한다.

- 장점: 관계형 무결성, transaction, 현재 조회와 이력 설명을 균형 있게 제공한다.
- 비용: 명령 경계와 projection 검증이 필요하고 단순 CRUD보다 코드가 많다.

### 3. 전체 event sourcing 또는 EPCIS 중심 모델

모든 상태를 범용 이벤트에서 재생하거나 EPCIS event type을 내부 핵심 모델로 사용한다.

- 장점: 시간축 재생과 표준 교환 확장에 유리하다.
- 기각 이유: 현재 범위에 비해 event versioning·projection 복구·운영 비용이 크고 표준 적합성이 요구되지 않는다.

## Decision tree

```text
기준이 이후 작업의 의미를 바꾸는가?
├─ 예 → 새 immutable revision을 발행하고 작업지시가 발행본을 참조
│        └─ BOM 요구량인가? → 계획수량 × 단위당 소요량을 정확한 십진수로 snapshot
└─ 아니오
   ├─ 물리 수량이 움직였는가?
   │  ├─ 예 → InventoryTransaction과 실제 업무 사건 기록
   │  └─ 아니오 → 예약·해제는 MaterialAllocation과 append-only release에만 기록
   ├─ 공정 수량을 완료하는가?
   │  ├─ 예 → input = good + defect, defect 즉시 생산 폐기
   │  │        └─ 다음 input → 분할·합류가 반영된 현재 LOT의 잠긴 route WIP
   │  └─ 아니오 → 현재 route WIP를 변경하지 않음
   ├─ 현재 시작 가능한지 묻는가?
   │  ├─ 예 → 첫 공정은 선행 검사 없음, 후속 공정은 직전 공정·직전 검사 PASS와 예약·품질·만료 재검증
   │  └─ 아니오 → 생산 진행 상태만 저장
   ├─ 자재·LOT·일련번호 관계가 실제로 생겼는가?
   │  ├─ 예 → 활성 공정 없음·현재 공정 검사 PASS 확인 후 event와 append-only LotRelation 생성
   │  │        ├─ SERIALIZE인가? → IN_PROCESS·최종 route 공정 완료·미완료 후속 공정 없음 확인
   │  │        └─ 입력 잔량을 모두 사용했는가? → 입력 LOT SUPERSEDED
   │  └─ 아니오 → 계보를 만들지 않음
   ├─ 확정 사실이 잘못됐는가?
   │  ├─ 예 → 원본을 보존하고 유형별 정정행·누적 상한을 가진 CorrectionEvent 추가
   │  │        └─ 검사 LOT가 PENDING이 아니거나 후속 의존 사건이 있는가? → 정정 거부, QualityIncident로 통제
   │  └─ 아니오 → 일반 상태 전이 수행
   └─ 서로 다른 질문에 답하는 상태인가?
      ├─ 예 → 생산 진행·검사 판정·품질 disposition을 분리
      └─ 아니오 → 해당 aggregate의 단일 상태기계 사용
```

## Decision

옵션 2를 선택한다.

1. `InventoryTransaction`을 물리 재고의 진실 공급원으로 사용한다.
2. `MaterialAllocation`은 예약만 표현하고 실제 출고와 계보를 만들지 않는다. 해제는 append-only `MaterialAllocationRelease`로 남긴다.
3. 예약잔량은 `reservedQuantity - issuedAgainstAllocation - releasedQuantity`의 정확한 차다. 출고와 해제는 같은 Allocation을 잠그고 누적합이 예약량을 넘으면 거부한다.
4. 작업지시 릴리스는 `requiredQuantity = plannedQuantity × quantityPerProductBaseUom`을 `numeric(18, 6)` 십진 연산으로 정확히 계산한다. 단위 불일치·초과 정밀도·암묵적 반올림은 거부한다.
5. 작업지시 릴리스는 발행된 BOM·route·검사규격, `WorkOrderMaterialRequirement`·`InspectionRequirement`와 초기 생산 LOT를 한 transaction에서 고정한다. 자재 예약은 릴리스 뒤에만 가능하다.
6. 예약과 실제 소비는 같은 `WorkOrderMaterialRequirement`를 통해 WorkOrder·Material·요구수량을 검증한다. MVP 예약은 WorkOrder가 `RELEASED`일 때만 허용하며 다른 작업지시 예약, BOM 외 자재와 요구량 초과는 거부한다.
7. 실제 투입은 출고 원장, `MaterialConsumption`, `CONSUME LotRelation`, 공정·생산 LOT·작업지시 상태와 감사를 한 transaction으로 기록한다.
8. 반납은 원 출고·소비·edge를 보존하고 `CorrectionEvent`, `MaterialConsumptionCorrection`, `LotRelationCorrection`으로 순소비와 유효 계보를 같은 수량만큼 줄인다. 누적 정정은 원 수량을 초과할 수 없다.
9. 공정 완료는 투입수량을 양품과 불량으로 전부 설명하고 불량은 즉시 생산 폐기한다. 모든 공정 시작은 분할·합류를 반영한 현재 LOT의 잠긴 `routeWipAvailable`을 투입수량으로 사용한다.
10. 첫 공정에는 선행 검사 gate가 없다. 후속 공정은 직전 공정의 필수 `ROUTE_ADVANCE` 유효 `PASS` 전까지 차단하고, 계보 변환은 현재 완료 공정의 gate를 확인한다. 진행 중 공정이 있는 LOT의 WIP 변경도 차단한다.
11. `SERIALIZE`는 `IN_PROCESS` LOT이 릴리스된 route의 최종 공정을 완료했고 미완료 후속 공정이 없을 때만 허용한다.
12. 원 검사 결과는 불변이며 `InspectionCorrection`의 전체 snapshot 선형 version으로 유효 판정을 계산한다. 정정은 `qualityDisposition = PENDING`이고 후속 의존 사건이 없을 때만 허용하며, disposition 결정 뒤 발견한 오류는 `QualityIncident`로 통제한다.
13. 생산 진행, 시작 readiness, 검사 실행·판정과 품질 disposition을 별도 상태 축 또는 projection으로 관리한다. readiness는 저장하지 않고 시작 명령에서 다시 검증한다.
14. 발행된 BOM·route·검사규격 revision과 완료된 검사 원본은 불변으로 취급한다.
15. 분할·합류·변환·일련번호는 사건과 append-only `LotRelation`으로 표현한다. 전량 변환 입력은 `SUPERSEDED`로 종결하고 작업지시 완료는 계보의 현재 잔량과 최종 산출을 기준으로 판정한다.
16. 확정 사실은 update·delete하지 않고 원본을 연결한 취소·정정 사건으로 보정한다.
17. `AuditEvent`는 설명 근거이며 재고·상태·계보의 진실 공급원으로 사용하지 않는다.
18. 범용 event sourcing과 EPCIS 호환 계층은 현재 범위에 포함하지 않는다.

## Enforcement boundary

| 규칙 유형 | 우선 강제 위치 | 이유 |
|---|---|---|
| 같은 행의 음수·합계·필수값 | PostgreSQL constraint | 모든 쓰기 경로에 적용 |
| 식별자·commandId 중복 | unique constraint | race에서도 단일 결과 보장 |
| BOM 요구량 십진 곱·단위·정밀도 | domain service + decimal type + integration test | 여러 행의 단위와 계산 결과를 release snapshot 전에 확인 |
| 요구량별 예약 합계·실제 투입 | application service + transaction + lock/isolation | WorkOrder·Material·요구량과 여러 행을 함께 확인 |
| Allocation 출고·해제 누적 상한 | application service + transaction + 같은 aggregate lock | 경합 명령이 같은 과거 잔량을 동시에 소비하지 못하게 함 |
| 공정 간 양품·불량·WIP 보존 | domain service + transaction + integration test | 선행 실적과 LOT 잔량을 함께 확인 |
| 공정 검사 gate·계보 입력 상태 | domain service + transaction + integration test | 유효 판정과 활성 공정·route 위치를 함께 확인 |
| `SERIALIZE` 최종 route gate | domain service + transaction + integration test | 릴리스된 route의 마지막 공정·실행 완료·후속 공정 부재를 함께 확인 |
| 정정 누적 상한·원본 연결 | FK·unique constraint + transaction + integration test | 원본 보존과 여러 원장의 유효수량을 함께 확인 |
| 검사 정정 선형성·disposition·의존 사건 차단 | FK·unique constraint + aggregate lock + transaction + integration test | fork와 판정·품질 모순을 막고 이미 의존한 과거 수행 사실을 보호 |
| 상태 전이·완료 게이트 | domain service + integration test | 업무 의미와 오류 코드 필요 |
| 계보 순환 | transaction 안의 graph query + test | cross-row `CHECK`로 보장할 수 없음 |
| 권한과 행위자 | API guard + server session | client 입력을 신뢰하지 않음 |

`TraceNode` 다형 참조 무결성과 공정별 복수 검사규격 mapping의 물리 schema는 각각 #13·#22 전 ADR에서 확정한다.

## Consequences

### Positive

- 예약·재고·소비·계보의 의미가 분리되어 부분 수량과 rollback을 검증할 수 있다.
- 완료·합격·격리를 동시에 표시하고 과거 사실을 보존할 수 있다.
- 원자재부터 완제품까지 같은 관계 모델로 양방향 조회할 수 있다.
- 각 불변조건을 unit·integration·E2E test에 직접 연결할 수 있다.

### Negative

- 원장 합계와 projection의 일치 검증이 필요하다.
- append-only 정정 모델은 단순 update보다 API와 UI가 복잡하다.
- 진행 중 추가 예약을 지원하지 않으므로 첫 공정 시작 전에 필요한 자재를 예약해야 한다.
- 계보 순환과 cross-row 예약 경쟁은 schema 선언만으로 해결되지 않는다.
- full event sourcing이 아니므로 임의 시점의 전체 aggregate 재생은 제공하지 않는다.

## Validation

- [제조 도메인 계약](../domain/manufacturing-domain-contract.md)의 `RULE-01`~`RULE-33`을 Given/When/Then으로 검토한다.
- 예약 후 계보 0건, 실제 투입 후 원장·소비·edge·감사 각 1건을 확인한다.
- 전량 출고로 닫힌 예약에서 미사용분을 반납해도 예약은 닫힌 채이고 onHand·순소비·계보만 보정되는지 확인한다.
- WO-A의 예약을 WO-B에서 소비하거나 BOM 외 자재·요구량 초과를 예약하면 거부되는지 확인한다.
- 1공정 투입 10·양품 8·불량 2 뒤 2공정 투입 10은 거부되고 8만 허용되는지 확인한다.
- 양품 8 중 4를 부분 분할한 뒤 부모·자식 LOT의 다음 공정 투입이 각각 4만 허용되는지 확인한다.
- 첫 공정은 선행 검사 없이 시작하고, 공정 중 필수 검사가 PENDING·FAIL·HOLD이면 직후 공정과 계보 변환이 같은 요구사항으로 차단되는지 확인한다.
- 2공정 route의 1공정 완료·검사 PASS LOT에서 `SERIALIZE`를 거부하고 최종 공정 완료 뒤에만 허용하는지 확인한다.
- 검사 원본 PASS·disposition PENDING을 의존 사건 전에 FAIL로 정정하면 원본과 선형 정정 version이 함께 남고 PENDING을 유지하는지 확인한다. ACCEPTED·HOLD·REJECTED·QUARANTINED 또는 다른 의존 사건 뒤에는 정정 대신 품질 사건을 요구한다.
- 계획 3 EA와 단위당 0.125 KG가 0.375 KG로 고정되고 단위 불일치·소수 6자리 초과 결과는 전체 거부되는지 확인한다.
- 예약 10에서 출고 4와 해제 6·출고 1을 경합시켜 한 명령만 최신 잔량 범위에서 성공하는지 확인한다.
- 6 EA 소비·edge에서 2 EA 반납 시 원본 6을 보존하면서 유효 소비·edge가 모두 4가 되고 부분 실패는 rollback되는지 확인한다.
- 예약 자재의 격리·만료 후 저장 상태 변경 없이 readiness가 `READY → BLOCKED`로 투영되는지 확인한다.
- transaction 중간 실패 시 부분 기록이 없는지 통합 테스트한다.
- 완료·PASS LOT의 사후 격리에서 세 상태축이 보존되는지 확인한다.
- 분할·합류·일련번호 fixture의 upstream·downstream 결과와 순환 거부를 확인한다.
- 전량 분할·합류 입력이 `SUPERSEDED`가 되고 후속 잔량 LOT가 완료된 뒤 작업지시가 완료되는지 확인한다.
- 새 검사규격 revision이 과거 판정 snapshot을 바꾸지 않는지 회귀 테스트한다.

## Revisit triggers

- 다사업장, 단위 변환, 대체 자재, 진행 중 보충 예약 또는 재작업 route가 범위에 들어온다.
- 외부 파트너와 EPCIS·B2MML 등 표준 메시지를 교환해야 한다.
- 원장 합계 조회가 목표 데이터 규모에서 허용 성능을 충족하지 못한다.
- 법적·규제 요구로 전자서명, 보존기간 또는 감사 추적 요건이 추가된다.
- 구현 fixture가 현재 관계형 aggregate로 표현되지 않는다.
