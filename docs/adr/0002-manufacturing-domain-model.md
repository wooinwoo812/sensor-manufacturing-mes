# ADR-0002: 사건·원장·분리된 상태축으로 제조 도메인을 모델링한다

- Status: Proposed
- Date: 2026-08-31
- Owners: wooinwoo
- Related: #2, #11, #12, #13, #14, #15, #16, #17

## Context

작업지시, 재고, 생산실적, 검사와 LOT 계보를 일반 CRUD와 하나의 종합 상태로 구현하면 다음 충돌이 생긴다.

- 예약만 했는데 실제 재고와 계보가 바뀐다.
- 생산 완료, 검사 합격과 사후 격리를 동시에 표현하지 못한다.
- 기준 revision 변경이 과거 작업지시와 검사 판정을 바꾼다.
- 잘못된 실적을 수정·삭제해 원인과 정정 이력을 잃는다.
- 자재·생산 LOT·완제품을 한 방향으로 추적하기 어렵다.

이 프로젝트는 실제 기업의 내부 모델이나 특정 표준 적합성을 주장하지 않으면서도, 실패·동시성·정정 상황에서 설명 가능한 관계형 모델이 필요하다.

## Decision drivers

- 예약과 실제 물리 사건의 명확한 분리
- 재고·계보·검사 결과의 재현성과 감사 가능성
- 생산 진행과 현재 품질 사용성의 독립 표현
- PostgreSQL transaction과 constraint로 검증 가능한 범위
- React 화면부터 API·DB·test까지 같은 용어 사용
- 1인 포트폴리오에서 설명 가능한 구현 복잡도

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

기준정보와 현재 업무 상태는 aggregate로 관리하되, 재고 transaction·실제 소비·계보 edge·검사 결과·감사 이벤트는 확정 사실로 추가한다. 현재 잔량과 가용성은 원장과 유효 예약에서 계산한다.

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
└─ 아니오
   ├─ 물리 수량이 움직였는가?
   │  ├─ 예 → InventoryTransaction과 실제 업무 사건 기록
   │  └─ 아니오 → 예약은 MaterialAllocation에만 기록
   ├─ 자재·LOT·일련번호 관계가 실제로 생겼는가?
   │  ├─ 예 → event와 append-only LotRelation 생성
   │  └─ 아니오 → 계보를 만들지 않음
   ├─ 확정 사실이 잘못됐는가?
   │  ├─ 예 → 원본을 보존하고 취소·정정 사건 추가
   │  └─ 아니오 → 일반 상태 전이 수행
   └─ 서로 다른 질문에 답하는 상태인가?
      ├─ 예 → 생산 진행·검사 판정·품질 disposition을 분리
      └─ 아니오 → 해당 aggregate의 단일 상태기계 사용
```

## Decision

옵션 2를 선택한다.

1. `InventoryTransaction`을 물리 재고의 진실 공급원으로 사용한다.
2. `MaterialAllocation`은 예약만 표현하고 실제 출고와 계보를 만들지 않는다.
3. 실제 투입은 출고 원장, `MaterialConsumption`, `CONSUME LotRelation`, 공정 시작과 감사를 한 transaction으로 기록한다.
4. 생산 진행, 검사 실행·판정과 품질 disposition을 별도 상태 축으로 관리한다.
5. 발행된 BOM·route·검사규격 revision과 완료된 검사 결과는 불변으로 취급한다.
6. 분할·합류·변환·일련번호는 사건과 append-only `LotRelation`으로 표현한다.
7. 확정 사실은 update·delete하지 않고 원본을 연결한 취소·정정 사건으로 보정한다.
8. `AuditEvent`는 설명 근거이며 재고·상태·계보의 진실 공급원으로 사용하지 않는다.
9. 범용 event sourcing과 EPCIS 호환 계층은 현재 범위에 포함하지 않는다.

## Enforcement boundary

| 규칙 유형 | 우선 강제 위치 | 이유 |
|---|---|---|
| 같은 행의 음수·합계·필수값 | PostgreSQL constraint | 모든 쓰기 경로에 적용 |
| 식별자·commandId 중복 | unique constraint | race에서도 단일 결과 보장 |
| 예약 합계·실제 투입 | application service + transaction + lock/isolation | 여러 행과 aggregate를 함께 확인 |
| 상태 전이·완료 게이트 | domain service + integration test | 업무 의미와 오류 코드 필요 |
| 계보 순환 | transaction 안의 graph query + test | cross-row `CHECK`로 보장할 수 없음 |
| 권한과 행위자 | API guard + server session | client 입력을 신뢰하지 않음 |

`TraceNode` 다형 참조 무결성과 공정별 복수 검사규격 mapping의 물리 schema는 각각 #13·#14 전 ADR에서 확정한다.

## Consequences

### Positive

- 예약·재고·소비·계보의 의미가 분리되어 부분 수량과 rollback을 검증할 수 있다.
- 완료·합격·격리를 동시에 표시하고 과거 사실을 보존할 수 있다.
- 원자재부터 완제품까지 같은 관계 모델로 양방향 조회할 수 있다.
- 각 불변조건을 unit·integration·E2E test에 직접 연결할 수 있다.

### Negative

- 원장 합계와 projection의 일치 검증이 필요하다.
- append-only 정정 모델은 단순 update보다 API와 UI가 복잡하다.
- 계보 순환과 cross-row 예약 경쟁은 schema 선언만으로 해결되지 않는다.
- full event sourcing이 아니므로 임의 시점의 전체 aggregate 재생은 제공하지 않는다.

## Validation

- [제조 도메인 계약](../domain/manufacturing-domain-contract.md)의 `RULE-01`~`RULE-25`를 Given/When/Then으로 검토한다.
- 예약 후 계보 0건, 실제 투입 후 원장·소비·edge·감사 각 1건을 확인한다.
- transaction 중간 실패 시 부분 기록이 없는지 통합 테스트한다.
- 완료·PASS LOT의 사후 격리에서 세 상태축이 보존되는지 확인한다.
- 분할·합류·일련번호 fixture의 upstream·downstream 결과와 순환 거부를 확인한다.
- 새 검사규격 revision이 과거 판정 snapshot을 바꾸지 않는지 회귀 테스트한다.

## Revisit triggers

- 다사업장, 단위 변환, 대체 자재 또는 재작업 route가 범위에 들어온다.
- 외부 파트너와 EPCIS·B2MML 등 표준 메시지를 교환해야 한다.
- 원장 합계 조회가 목표 데이터 규모에서 허용 성능을 충족하지 못한다.
- 법적·규제 요구로 전자서명, 보존기간 또는 감사 추적 요건이 추가된다.
- 구현 fixture가 현재 관계형 aggregate로 표현되지 않는다.
