# 제조 도메인 공개 근거 재검증

| 항목 | 내용 |
|---|---|
| 문서 상태 | `Review-ready v1.4` |
| 기준일 | 2026-09-01 |
| 관련 Issue | [#2 제조 용어와 핵심 불변조건을 정의](https://github.com/wooinwoo/sensor-manufacturing-mes/issues/2), [#23 v1.0 실행 계약을 정렬](https://github.com/wooinwoo/sensor-manufacturing-mes/issues/23) |
| 적용 범위 | 센서 제조 MES 프로젝트의 용어·상태·계보·품질 계약 |

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
| `PROJECT` | 프로젝트 범위·일정·기술 제약에 따른 결정 | 반례와 재검토 조건을 기록 |
| `OPEN` | 구현 전에 추가 판단이 필요한 항목 | 관련 Issue와 ADR 시점을 지정 |

## 3. 공개 근거 원장

| ID | 공개 근거 | 확인한 내용 | 프로젝트 적용 | 적용하지 않는 주장 |
|---|---|---|---|---|
| `SRC-01` | [ISA, ISA-95 Standard](https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard) | ISA-95는 제조 운영과 기업 기능 사이의 정보 교환, 공통 용어와 Level 3 제조운영관리 활동을 다룬다. | 생산·재고·품질 실행을 MES 범위로 묶고 ERP·설비제어를 비범위로 둔다. | ISA-95 전체 적합성 또는 인증을 주장하지 않는다. |
| `SRC-02` | [OPC Foundation, OPC UA for ISA-95 Job Control](https://reference.opcfoundation.org/specs/OPC-10031-4/4/) | Job Order는 수행할 작업과 자재 요구량을 나타내며 Job Response는 실제 수행 결과와 Material Actual을 보고한다. | 작업지시의 계획·요구사항과 공정실적·실제 투입을 분리한다. | OPC UA 통신 모델이나 ISA-95 명칭을 그대로 복제하지 않는다. |
| `SRC-03` | [SAP Help, Reservations](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/7b24a64d9d0941bda1afa753263d9e39/24c6aa5257bf3258e10000000a423f68.html) | 예약은 미래의 특정 목적을 위해 자재를 출고 가능하게 준비하도록 창고·사업장에 요청한다. 예약 item은 자재·수량·필요일을 가진다. | `MaterialAllocation`은 가용량을 보류하지만 물리 출고나 계보를 만들지 않는다. | SAP 문서 구조·이동유형·회계처리를 구현하지 않는다. |
| `SRC-04` | [SAP Help, Goods Issue for the Manufacturing Order](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/f899ce30af9044299d573ea30b533f1c/c339c95360267614e10000000a174cb4.html) | 제조오더 출고는 창고 재고와 예약수량을 실제 출고량만큼 줄인다. | 실제 출고·투입 시 예약잔량과 물리 재고를 함께 줄이는 계약을 둔다. | 모든 제조업이 같은 출고 시점과 절차를 쓴다고 일반화하지 않는다. |
| `SRC-05` | [GS1, EPCIS 2.0.1 TransformationEvent](https://ref.gs1.org/standards/epcis/2.0.1/) | 변환 이벤트는 일부 또는 전체 투입 객체와 산출 객체의 관계, 수량과 공통 사건 식별자를 표현할 수 있다. | 소비·분할·합류·변환을 사건과 append-only 관계로 표현한다. | EPC·GS1 식별체계와 EPCIS API 적합성을 구현하지 않는다. |
| `SRC-06` | [GS1, EPCIS 2.0.1 ErrorDeclaration](https://ref.gs1.org/standards/epcis/2.0.1/) | 오류 선언은 과거 이벤트를 수정하지 않고 오류 선언 시각·사유·교정 이벤트를 추가해 기존 이력을 보존한다. | 확정 실적·검사·계보의 덮어쓰기를 막고 취소·정정 사건으로 보정한다. | EPCIS의 오류 선언 구조를 그대로 사용하지 않는다. |
| `SRC-07` | [NISTIR 8127, End-to-End QIF Technology Survey](https://nvlpubs.nist.gov/nistpubs/ir/2016/NIST.IR.8127.pdf) | 품질 정보 수명주기를 설계·계획·검사·분석으로 설명하고, 계획 명목점과 실제 측정점의 대응 및 결과의 명목·실측·추적정보를 다룬다. | 검사규격 revision, 명목 기준, 실제 측정값과 판정 당시 snapshot을 연결한다. | QIF 적합성 또는 정밀측정 전체 기능을 주장하지 않는다. |
| `SRC-08` | [스마트공장 사업관리시스템, 시범공장 사례](https://www.smart-factory.kr/eng/factory.do?menuId=04) | 공개 사례에서 MES의 생산정보 수집, LOT 추적과 실적 모니터링을 제조 운영 가치로 제시한다. | LOT 추적과 예외 중심 운영 화면이 국내 제조 실행 프로젝트 주제에 부합하는지 확인한다. | 사례 기업의 수치·화면·공정을 fixture로 사용하지 않는다. |
| `SRC-09` | [PostgreSQL 18, Constraints](https://www.postgresql.org/docs/18/ddl-constraints.html) | 같은 행의 수량식은 `CHECK`로 제한할 수 있지만 다른 행을 참조하는 `CHECK`는 지속적 정합성을 보장하지 못한다. | 행 내부 수량은 제약으로, 예약 합계·계보 순환은 transaction·query·test로 나눠 강제한다. | 아직 ORM schema나 trigger 방식을 확정하지 않는다. |
| `SRC-10` | [PostgreSQL, Recursive Queries and Cycle Detection](https://www.postgresql.org/docs/current/queries-with.html#QUERIES-WITH-CYCLE) | 재귀 CTE는 그래프 경로와 순환을 탐지할 수 있다. | 계보 조회와 새 edge의 순환 거부가 PostgreSQL에서 검증 가능한지 확인한다. | 물리 schema와 성능 전략은 #13 ADR 전까지 확정하지 않는다. |
| `SRC-11` | [SAP Help, Routing — Component Allocation](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/d3a3eb7caa1842858bf0372e17ad3909/3b07414692aa4baa9c61347b4e2195a0.html) | BOM component를 route operation에 수동 배정할 수 있고 미배정 component는 production order 생성 시 첫 operation에 기본 배정한다. | v1.0의 모든 BOM 자재를 첫 route 공정에서 투입하는 단순 정책이 제조 모델로 성립하는지 교차검증한다. | SAP 호환성이나 모든 제조업의 자재 투입 시점을 주장하지 않는다. |

## 4. 근거에서 도출한 계약과 프로젝트 결정

| 계약 | 분류 | 근거·이유 |
|---|---|---|
| MES는 생산·재고·품질 실행과 이력에 집중하고 회계·설비제어를 포함하지 않는다. | `SYNTHESIS` | `SRC-01`, `SRC-08`과 v1.0 범위 |
| 계획 자재와 실제 투입 자재를 별도 사실로 관리한다. | `SYNTHESIS` | `SRC-02`~`SRC-04` |
| 예약은 가용량을 보류하지만 물리 재고와 계보를 바꾸지 않는다. | `PROJECT` | `SRC-03`의 의미를 v1.0 부분 예약에 적용 |
| 실제 투입은 예약 감소·출고·소비·계보·감사를 하나의 transaction으로 기록한다. | `PROJECT` | `SRC-04`, 실패 시 부분 반영 방지 요구 |
| 릴리스는 BOM·route·검사 revision과 작업지시별 자재·검사 요구사항을 예약 전에 고정한다. | `PROJECT` | `SRC-02`~`SRC-04`의 계획·요구와 실제 수행 분리, 구현 의존성 검증 |
| 예약과 소비는 릴리스된 자재 요구의 WorkOrder·Material·수량 경계를 벗어나지 않는다. | `PROJECT` | `SRC-03`의 목적별 예약 의미와 교차 작업지시 오염 방지 요구 |
| 공정 불량수량은 v1.0에서 즉시 생산 폐기하며 다음 공정 입력은 분할·합류를 반영한 현재 LOT의 route WIP로 제한한다. | `PROJECT` | 공정 간·부분 분할 수량 보존 반례와 재작업 비범위 |
| 분할·합류·변환은 입력과 출력을 공통 사건으로 연결한다. | `SYNTHESIS` | `SRC-05` |
| 확정 이력은 수정·삭제하지 않고 원본을 참조하는 정정 사건과 유형별 정정행으로 유효수량을 보정한다. | `SYNTHESIS` | `SRC-06`, 감사 가능성과 수량 상한 요구 |
| 검사 정정은 품질 disposition 결정 전 `PENDING` 상태로 제한하고, 결정 뒤 발견한 오류는 품질 사건으로 통제한다. | `PROJECT` | 검사 유효 판정과 품질 disposition의 모순 방지 요구 |
| 검사 계획의 기준과 실제 측정·판정 근거를 함께 보존한다. | `SYNTHESIS` | `SRC-07` |
| 첫 공정은 선행 검사 없이 시작하고, 직전 공정의 필수 검사 유효 `PASS` 전에는 후속 공정과 계보 변환을 차단하며 `SERIALIZE`는 최종 공정 완료 뒤에만 허용한다. | `PROJECT` | 고신뢰성 흐름의 검사 gate 교착·우회와 중간 공정 일련번호 반례 |
| 작업지시 자재 요구량은 계획수량과 제품 기준단위당 소요량의 정확한 십진 곱으로 고정한다. | `PROJECT` | 단위·정밀도·반올림에 따른 예약 경계 변동 방지 |
| 예약 출고와 해제는 같은 Allocation에서 직렬화하고 누적합 상한을 강제한다. | `PROJECT` | 포화 계산이 초과 해제 오류를 숨기는 동시성 반례 |
| 모든 BOM 자재는 작업지시 시작 전에 예약하고 유일한 초기 생산 LOT의 첫 route 공정에서만 실제 투입한다. | `PROJECT` | `SRC-11`의 허용 가능한 기본 배정과 현재 표준 fixture; 중간 공정 투입 요구 부재 |
| 검사 판정과 LOT 품질 disposition은 별도 명령이며 권한·사유·감사를 요구한다. | `PROJECT` | 판정이 `PASS`여도 disposition이 `PENDING`이면 완료할 수 없는 상태기계 반례 |
| 출하 업무는 구현하지 않고 현재 품질·격리 사실에서 읽기 전용 출하 적격성만 계산한다. | `PROJECT` | 비범위인 출하와 사용 차단 요구의 모순 제거 |
| 정확한 상태명·수량식·완료 게이트·격리 흐름은 프로젝트가 정한다. | `PROJECT` | 공개 근거는 특정 애플리케이션 상태기계를 강제하지 않음 |

## 5. 계약 반례 전수 재검증

| ID | 기존 표현의 위험 | 반례 | #2 결정 |
|---|---|---|---|
| `CHK-01` | 검사 상태에 진행과 판정이 혼재 | 입력 중인 검사는 `IN_PROGRESS`이면서 판정은 아직 없음 | 실행 상태와 판정 결과를 별도 축으로 분리 |
| `CHK-02` | 자재 LOT의 `EXHAUSTED`를 수동 상태로 저장 | 반납·증가조정 후 재고가 다시 생기면 상태와 원장이 충돌 | `OPEN`·`EXHAUSTED`는 원장 잔량 projection으로 계산 |
| `CHK-03` | 작업지시만 취소되고 하위 생산 LOT는 상태가 남음 | 릴리스 후 실적 없이 취소하면 `PLANNED` LOT가 고아 상태가 됨 | 미착수 생산 LOT를 같은 transaction에서 `CANCELLED` 처리 |
| `CHK-04` | `HOLD`, `QUARANTINED`, `REJECTED`의 차이가 모호 | 판정 대기 보류와 사후 부적합 격리를 같은 의미로 읽음 | 보류·사건 기반 격리·최종 거부의 진입 근거를 분리 |
| `CHK-05` | 관계 수량에 단위가 없음 | 투입 자재와 산출품이 서로 다른 단위를 사용 | 모든 수량에 기준단위 또는 명시적 `uom`을 결합 |
| `CHK-06` | 검사규격 revision만 참조하면 과거 판정 재현이 불완전 | 기준정보가 잘못 수정되거나 비활성화됨 | revision 불변성과 판정 당시 기준 snapshot을 함께 보존 |
| `CHK-07` | 생산 LOT의 `READY`를 저장 상태로 관리 | 예약 자재가 사후 격리·만료되면 저장된 `READY`와 실제 시작 가능 여부가 충돌 | 생산 진행 상태와 시작 readiness projection을 분리 |
| `CHK-08` | 예약잔량을 순소비량으로 계산 | 전량 출고해 닫힌 예약에서 미사용분을 반납하면 예약이 다시 열린 것처럼 보임 | 예약은 총출고량으로 소진하고 순소비량은 별도 계산 |
| `CHK-09` | LOT disposition만 격리 진실 공급원으로 사용 | 완제품 일련번호에는 LOT disposition이 없어 출하 차단을 표현하지 못함 | `PENDING`·`SCRAPPED` QuarantineTarget을 모든 TraceNode의 공통 차단 근거로 사용 |
| `CHK-10` | 계보 acceptance에 변환이 있으나 fixture가 없음 | 분할·합류 예시만으로 1입력·1출력 변환을 검토할 수 없음 | 동일 단위 `TRANSFORM` fixture와 비범위 조건 추가 |
| `CHK-11` | 작업지시 릴리스에 하위 LOT 존재만 요구 | LOT 계획수량 합계가 작업지시 계획수량보다 작거나 클 수 있음 | 릴리스 시 하나 이상 LOT와 계획수량 합계 일치를 요구 |
| `CHK-12` | 상위 기획과 도메인 계약의 revision 엔터티명이 다름 | `Bom`과 `BomRevision`을 서로 다른 모델로 구현할 위험 | `BomRevision`·`ProcessRouteRevision`·`ProcessStepRevision`으로 통일 |
| `CHK-13` | 실적 없는 작업지시 취소가 대기 공정·검사를 닫지 않음 | 작업지시는 취소됐지만 실행·검사 queue에 대기 항목이 남음 | 예약·LOT·대기 공정·검사·감사를 한 취소 transaction으로 정리 |
| `CHK-14` | 작업지시 완료가 모든 소속 LOT의 `COMPLETED`만 요구 | 전량 분할·합류된 입력 LOT는 잔량이 없지만 완료 검사도 없어 작업지시가 영구 차단됨 | 전량 변환 입력의 `SUPERSEDED`와 계보 종결 기반 완료 projection 추가 |
| `CHK-15` | 예약된 자재 LOT 격리 시 기존 예약 처리 불명확 | 예약을 숨기면 영향 작업을 놓치고, 그대로 투입하면 품질 차단이 깨짐 | 예약은 영향 근거로 유지하되 투입 차단, 폐기 시 예약 해제까지 원자 처리 |
| `CHK-16` | 격리 case 자체를 `RELEASED` 또는 `SCRAPPED`로 종결 | 같은 사건에서 일부 대상 해제·일부 대상 폐기를 표현할 수 없음 | case는 `RESOLVED`, 대상별 처분은 `RELEASED`·`SCRAPPED`로 분리 |
| `CHK-17` | `SCRAPPED` 격리대상을 일반 종결로만 취급 | 완제품이 폐기 후 다시 사용 가능으로 보이거나 진행 중 LOT가 작업지시를 영구 대기시킴 | 폐기를 영구 차단 근거와 생산 진행 종결로 반영 |
| `CHK-18` | 공정 내부 합계만 검증하고 공정 간 WIP를 연결하지 않음 | 1공정 투입 10·양품 8·불량 2 뒤 2공정에 10을 투입해 불량 2가 되살아남 | 공정 불량은 즉시 생산 폐기하고 후속 투입을 현재 LOT의 route WIP와 같게 제한 |
| `CHK-19` | 자재 예약보다 뒤 Issue에서 릴리스 기준정보를 구현 | #12가 예약을 요구하지만 #13·#14 전에는 route·검사 snapshot을 가진 릴리스가 불가능 | 기준 revision·요구사항 snapshot·초기 LOT·릴리스를 #22로 분리해 #12 앞에 배치 |
| `CHK-20` | 예약이 WorkOrder와 자재 LOT만 참조 | WO-A 예약을 WO-B 공정에서 소비하거나 BOM 외 자재·초과수량을 예약할 수 있음 | `WorkOrderMaterialRequirement`에 Allocation을 귀속하고 WorkOrder·Material·요구량을 예약·소비 시 재검증 |
| `CHK-21` | 반납이 소비와 계보를 보정한다고만 서술 | 원 `CONSUME` 6에서 2를 반납해도 양수·불변 edge만으로 유효 4를 표현할 수 없음 | `CorrectionEvent`, 소비·edge 정정행, 유효수량식과 누적 상한을 명시 |
| `CHK-22` | 연결 Issue가 옛 엔터티명·완료조건·격리 처분을 유지 | 계약과 Issue를 각각 구현하면 schema와 완료 게이트가 다시 갈라짐 | #12~#16을 v1.2 계약·#22 의존관계·규칙 ID로 동시 정렬 |
| `CHK-23` | 후속 공정 투입을 분할 전 양품수량과 정확히 같게 요구 | 양품 8 중 4를 자식 LOT로 분할하면 부모 잔량은 4지만 다음 공정은 8을 요구해 영구 차단 | 부모·자식 각각의 현재 route WIP를 시작 시 잠그고 투입수량으로 사용 |
| `CHK-24` | 검사 gate의 기준 공정이 모호하고 일반 계보 gate만으로 중간 공정 `SERIALIZE`를 허용 | 첫 공정이 자기 검사 PASS를 시작 전에 요구해 교착하거나, 1공정 PASS 뒤 일련번호를 만들고 남은 LOT만 2공정을 수행 | 첫 공정은 선행 검사 없음, 후속 공정은 직전 공정 PASS; `SERIALIZE`는 최종 route 공정 완료·IN_PROCESS·미완료 후속 공정 없음까지 검증 |
| `CHK-25` | 검사 정정 version은 있으나 이미 결정된 품질 disposition과 충돌 | FAIL→REJECTED 뒤 PASS 정정은 PASS+REJECTED, PASS→ACCEPTED 뒤 FAIL 정정은 FAIL+ACCEPTED를 만듦 | `qualityDisposition = PENDING`이고 다른 의존 사건이 없을 때만 정정; disposition 결정 뒤에는 `QualityIncident`로 처리 |
| `CHK-26` | BOM 단위당 소요량에서 작업지시 필요수량을 만드는 산식이 없음 | 같은 BOM·계획수량이어도 구현별 반올림으로 예약 상한이 달라짐 | 계획수량×단위당 소요량, `numeric(18, 6)`, 단위 일치와 무반올림 거부 계약 고정 |
| `CHK-27` | 예약잔량의 `max(..., 0)`가 출고·해제 초과를 숨김 | 예약 10에서 출고 4와 해제 7을 기록해도 화면에는 잔량 0으로 정상처럼 표시 | 누적 출고+해제≤예약량을 강제하고 같은 Allocation 잠금에서 경합 직렬화 |
| `CHK-28` | 모든 `startProcessExecution`이 자재 소비를 호출 | 후속 공정이 첫 공정에서 이미 투입한 같은 예약을 다시 출고하거나 자재 부족으로 영구 차단 | 생산 LOT의 첫 route 공정만 LOT 몫을 소비하고 후속 공정은 자재 거래 0건 |
| `CHK-29` | 검사 판정은 있으나 품질 disposition 결정 command가 없음 | 최종검사 PASS 뒤에도 ProductionLot이 PENDING에 남아 완료 불가 | 자재·생산 LOT별 권한·사유·감사 품질 결정 command와 생산 LOT 승인·완료 transaction 추가 |
| `CHK-30` | 출하를 비범위로 두면서 화면·완료 흐름에 출하 승인을 표현 | 구현할 entity·command 없이 사용자가 출하 업무까지 된다고 오해 | 출하 command를 제거하고 읽기 전용 `shipmentEligibility` projection으로 한정 |
| `CHK-31` | 제품·BOM·route·검사·UI 예시가 서로 다른 식별자와 수량 사용 | Issue마다 다른 seed를 구현해 수직 흐름과 테스트가 연결되지 않음 | 하나의 `FIX-SENSOR-01` 기준과 격리된 실패 variant를 #22~#19에서 재사용 |
| `CHK-32` | 여러 초기 생산 LOT를 허용하면서 첫 LOT 시작 후 추가 예약을 금지 | 남은 예약 자재가 격리되면 대체 예약도 작업지시 취소도 못 해 영구 차단 | v1.0은 계획수량 전체를 가진 초기 생산 LOT 하나만 릴리스하고 이후 분할·합류로 LOT을 나눔 |

## 6. 미결정 항목

| ID | 항목 | 결정 시점 | 필요한 검증 |
|---|---|---|---|
| `OPEN-01` | `TraceNode`의 다형 참조 무결성 방식 | #13 schema 전 | FK 대안, migration, 잘못된 이중 참조 fixture |
| `OPEN-02` | 공정별 복수 검사규격 revision의 release snapshot mapping | #22 schema 전 | 복수 규격·중간검사·최종검사 fixture |
| `OPEN-03` | 예약 경쟁 처리의 lock 또는 isolation 전략 | #12 구현 전 | 동시 예약 benchmark와 retry 계약 |
| `OPEN-04` | 원장 잔량 projection의 조회·cache 전략 | #12 구현 전 | 정합성 우선 구현과 성능 fixture |

## 7. 재검증 조건

- 생산 방식이 단일 사업장·이산형 LOT 생산 범위를 벗어난다.
- 단위 변환, 대체 자재, 재작업·재투입 또는 외주 공정이 v1.0 범위에 들어온다.
- 중간 공정에서 새 자재를 투입하는 표준 fixture가 생겨 `BomItem → ProcessStepRevision` 매핑이 필요해진다.
- 작업지시를 처음부터 여러 생산 LOT로 나누어 병렬 착수해야 한다.
- 규제 준수나 특정 표준 적합성을 프로젝트 요구사항으로 추가한다.
- PostgreSQL·ORM 선택 때문에 불변조건의 강제 위치가 달라진다.
- #11~#16 구현 중 현재 상태기계로 표현할 수 없는 실제 반례가 발견된다.

재검증은 기존 문구를 조용히 바꾸지 않는다. 근거가 바뀌면 Issue, ADR 또는 PR에 이전 결정, 새 증거와 migration 영향을 함께 기록한다.
