# 제조 도메인 공개 근거 재검증

| 항목 | 내용 |
|---|---|
| 문서 상태 | `Reviewed v0.1` |
| 기준일 | 2026-08-31 |
| 관련 Issue | [#2 제조 용어와 핵심 불변조건을 정의](https://github.com/wooinwoo/sensor-manufacturing-mes/issues/2) |
| 적용 범위 | 센서 제조 MES 포트폴리오의 용어·상태·계보·품질 계약 |

## 1. 조사 원칙

- 공개된 표준기관·공공기관·공식 제품 문서를 우선한다.
- 유료 표준의 비공개 본문을 재현하거나 특정 기업의 내부 절차를 추정하지 않는다.
- 표준이 직접 요구한 내용, 여러 근거에서 일반화한 내용과 이 프로젝트의 설계 결정을 구분한다.
- SAP 문서는 예약과 출고의 개념 차이를 교차검증하는 사례일 뿐 SAP 호환 구현 요구사항이 아니다.
- GS1 EPCIS와 QIF는 계보·품질 정보 모델의 참고 근거이며 이 프로젝트가 해당 표준 적합성을 주장하지 않는다.
- 아래 링크와 판정은 기준일에 다시 열어 확인했다. 링크가 바뀌거나 범위가 확장되면 재검증한다.

## 2. 근거 분류

| 분류 | 의미 | 사용 규칙 |
|---|---|---|
| `SOURCE` | 공개 원문에서 직접 확인한 사실 | 출처와 적용 한계를 함께 기록 |
| `SYNTHESIS` | 둘 이상의 근거를 프로젝트 문제에 맞게 일반화한 해석 | 표준의 직접 요구처럼 표현하지 않음 |
| `PROJECT` | 포트폴리오 범위·일정·기술 제약에 따른 결정 | 반례와 재검토 조건을 기록 |
| `OPEN` | 구현 전에 추가 판단이 필요한 항목 | 관련 Issue와 ADR 시점을 지정 |

## 3. 공개 근거 원장

| ID | 공개 근거 | 확인한 내용 | 프로젝트 적용 | 적용하지 않는 주장 |
|---|---|---|---|---|
| `SRC-01` | [ISA, ISA-95 Standard](https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard) | ISA-95는 제조 운영과 기업 기능 사이의 정보 교환, 공통 용어와 Level 3 제조운영관리 활동을 다룬다. | 생산·재고·품질 실행을 MES 범위로 묶고 ERP·설비제어를 비범위로 둔다. | ISA-95 전체 적합성 또는 인증을 주장하지 않는다. |
| `SRC-02` | [OPC Foundation, OPC UA for ISA-95 Job Control](https://reference.opcfoundation.org/specs/OPC-10031-4/4/) | Job Order는 수행할 작업과 자재 요구량을 나타내며 Job Response는 실제 수행 결과와 Material Actual을 보고한다. | 작업지시의 계획·요구사항과 공정실적·실제 투입을 분리한다. | OPC UA 통신 모델이나 ISA-95 명칭을 그대로 복제하지 않는다. |
| `SRC-03` | [SAP Help, Reservations](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/91b21005dded4984bcccf4a69ae1300c/37485192f5d746f2bfe85d9ad00bebf3.html) | 예약은 나중의 출고를 위해 자재를 준비하도록 요청하며 목적·수량·필요일을 가진다. | `MaterialAllocation`은 가용량을 보류하지만 물리 출고나 계보를 만들지 않는다. | SAP 문서 구조·이동유형·회계처리를 구현하지 않는다. |
| `SRC-04` | [SAP Help, Goods Issue for the Manufacturing Order](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/f899ce30af9044299d573ea30b533f1c/c339c95360267614e10000000a174cb4.html) | 제조오더 출고는 창고 재고와 예약수량을 실제 출고량만큼 줄인다. | 실제 출고·투입 시 예약잔량과 물리 재고를 함께 줄이는 계약을 둔다. | 모든 제조업이 같은 출고 시점과 절차를 쓴다고 일반화하지 않는다. |
| `SRC-05` | [GS1, EPCIS 2.0.1 TransformationEvent](https://ref.gs1.org/standards/epcis/2.0.1/) | 변환 이벤트는 일부 또는 전체 투입 객체와 산출 객체의 관계, 수량과 공통 사건 식별자를 표현할 수 있다. | 소비·분할·합류·변환을 사건과 append-only 관계로 표현한다. | EPC·GS1 식별체계와 EPCIS API 적합성을 구현하지 않는다. |
| `SRC-06` | [GS1, EPCIS 2.0.1 ErrorDeclaration](https://ref.gs1.org/standards/epcis/2.0.1/) | 오류 선언은 과거 이벤트를 수정하지 않고 오류 선언 시각·사유·교정 이벤트를 추가해 기존 이력을 보존한다. | 확정 실적·검사·계보의 덮어쓰기를 막고 취소·정정 사건으로 보정한다. | EPCIS의 오류 선언 구조를 그대로 사용하지 않는다. |
| `SRC-07` | [NISTIR 8102, Quality Information Framework](https://www.nist.gov/publications/end-end-demonstration-quality-information-framework-qif-standard-international) | QIF는 분리된 제조 품질 언어 사이의 정보 손실을 줄이고 검사 계획부터 결과까지 연결하는 정보 모델을 다룬다. | 검사규격 revision, 명목 기준, 실제 측정값과 판정 당시 snapshot을 연결한다. | QIF·ISO 23952 적합성 또는 정밀측정 전체 기능을 주장하지 않는다. |
| `SRC-08` | [스마트공장 사업관리시스템, 시범공장 사례](https://www.smart-factory.kr/eng/factory.do?menuId=04) | 공개 사례에서 MES의 생산정보 수집, LOT 추적과 실적 모니터링을 제조 운영 가치로 제시한다. | LOT 추적과 예외 중심 운영 화면이 국내 제조 포트폴리오 주제에 부합하는지 확인한다. | 사례 기업의 수치·화면·공정을 fixture로 사용하지 않는다. |
| `SRC-09` | [PostgreSQL 18, Constraints](https://www.postgresql.org/docs/18/ddl-constraints.html) | 같은 행의 수량식은 `CHECK`로 제한할 수 있지만 다른 행을 참조하는 `CHECK`는 지속적 정합성을 보장하지 못한다. | 행 내부 수량은 제약으로, 예약 합계·계보 순환은 transaction·query·test로 나눠 강제한다. | 아직 ORM schema나 trigger 방식을 확정하지 않는다. |
| `SRC-10` | [PostgreSQL, Recursive Queries and Cycle Detection](https://www.postgresql.org/docs/current/queries-with.html#QUERIES-WITH-CYCLE) | 재귀 CTE는 그래프 경로와 순환을 탐지할 수 있다. | 계보 조회와 새 edge의 순환 거부가 PostgreSQL에서 검증 가능한지 확인한다. | 물리 schema와 성능 전략은 #13 ADR 전까지 확정하지 않는다. |

## 4. 근거에서 도출한 계약과 프로젝트 결정

| 계약 | 분류 | 근거·이유 |
|---|---|---|
| MES는 생산·재고·품질 실행과 이력에 집중하고 회계·설비제어를 포함하지 않는다. | `SYNTHESIS` | `SRC-01`, `SRC-08`과 MVP 범위 |
| 계획 자재와 실제 투입 자재를 별도 사실로 관리한다. | `SYNTHESIS` | `SRC-02`~`SRC-04` |
| 예약은 가용량을 보류하지만 물리 재고와 계보를 바꾸지 않는다. | `PROJECT` | `SRC-03`의 의미를 부분 예약 MVP에 적용 |
| 실제 투입은 예약 감소·출고·소비·계보·감사를 하나의 transaction으로 기록한다. | `PROJECT` | `SRC-04`, 실패 시 부분 반영 방지 요구 |
| 분할·합류·변환은 입력과 출력을 공통 사건으로 연결한다. | `SYNTHESIS` | `SRC-05` |
| 확정 이력은 수정·삭제하지 않고 취소·정정 사건으로 보정한다. | `SYNTHESIS` | `SRC-06`, 감사 가능성 요구 |
| 검사 계획의 기준과 실제 측정·판정 근거를 함께 보존한다. | `SYNTHESIS` | `SRC-07` |
| 정확한 상태명·수량식·완료 게이트·격리 흐름은 프로젝트가 정한다. | `PROJECT` | 공개 근거는 특정 애플리케이션 상태기계를 강제하지 않음 |

## 5. 기존 계약 반례 재검증

| ID | 기존 표현의 위험 | 반례 | #2 결정 |
|---|---|---|---|
| `CHK-01` | 검사 상태에 진행과 판정이 혼재 | 입력 중인 검사는 `IN_PROGRESS`이면서 판정은 아직 없음 | 실행 상태와 판정 결과를 별도 축으로 분리 |
| `CHK-02` | 자재 LOT의 `EXHAUSTED`를 수동 상태로 저장 | 반납·증가조정 후 재고가 다시 생기면 상태와 원장이 충돌 | `OPEN`·`EXHAUSTED`는 원장 잔량 projection으로 계산 |
| `CHK-03` | 작업지시만 취소되고 하위 생산 LOT는 상태가 남음 | 릴리스 후 실적 없이 취소하면 `READY` LOT가 고아 상태가 됨 | 미착수 생산 LOT를 같은 transaction에서 `CANCELLED` 처리 |
| `CHK-04` | `HOLD`, `QUARANTINED`, `REJECTED`의 차이가 모호 | 판정 대기 보류와 사후 부적합 격리를 같은 의미로 읽음 | 보류·사건 기반 격리·최종 거부의 진입 근거를 분리 |
| `CHK-05` | 관계 수량에 단위가 없음 | 투입 자재와 산출품이 서로 다른 단위를 사용 | 모든 수량에 기준단위 또는 명시적 `uom`을 결합 |
| `CHK-06` | 검사규격 revision만 참조하면 과거 판정 재현이 불완전 | 기준정보가 잘못 수정되거나 비활성화됨 | revision 불변성과 판정 당시 기준 snapshot을 함께 보존 |

## 6. 미결정 항목

| ID | 항목 | 결정 시점 | 필요한 검증 |
|---|---|---|---|
| `OPEN-01` | `TraceNode`의 다형 참조 무결성 방식 | #13 schema 전 | FK 대안, migration, 잘못된 이중 참조 fixture |
| `OPEN-02` | 공정별 복수 검사규격 revision의 release snapshot mapping | #14 schema 전 | 복수 규격·중간검사·최종검사 fixture |
| `OPEN-03` | 예약 경쟁 처리의 lock 또는 isolation 전략 | #12 구현 전 | 동시 예약 benchmark와 retry 계약 |
| `OPEN-04` | 원장 잔량 projection의 조회·cache 전략 | #12 구현 전 | 정합성 우선 구현과 성능 fixture |

## 7. 재검증 조건

- 생산 방식이 단일 사업장·이산형 LOT 생산 범위를 벗어난다.
- 단위 변환, 대체 자재, 재작업·재투입 또는 외주 공정이 MVP에 들어온다.
- 규제 준수나 특정 표준 적합성을 포트폴리오 요구사항으로 추가한다.
- PostgreSQL·ORM 선택 때문에 불변조건의 강제 위치가 달라진다.
- #11~#16 구현 중 현재 상태기계로 표현할 수 없는 실제 반례가 발견된다.

재검증은 기존 문구를 조용히 바꾸지 않는다. 근거가 바뀌면 Issue, ADR 또는 PR에 이전 결정, 새 증거와 migration 영향을 함께 기록한다.
