# 센서 제조 MES 제품·UX·기술 기획 크로스검토본

> 구현을 시작하기 전에 제품 범위, 업무 규칙, 사용자 흐름, 화면 구조와 기술 경계를 함께 검증하기 위한 문서입니다.

| 항목 | 내용 |
|---|---|
| 문서 상태 | `Draft v0.2` · 1차 크로스검토 조건부 승인 반영본 |
| 기준일 | 2026-08-31 |
| 관련 Issue | [#8 역할별 사용자 흐름과 정보구조를 설계](https://github.com/wooinwoo/sensor-manufacturing-mes/issues/8) |
| 1차 판정 | **조건부 승인** · 제품 방향 유지, Figma 전 데이터·상태 계약 보강 |
| 다음 단계 | 보강 계약 재검증 → wireframe 및 화면 annotation 확정 |
| 공개 원칙 | 회사·제품·사용자·LOT·공정·측정값은 모두 가상이며 특정 기업의 시스템을 복제하지 않음 |

## 1. 이 문서를 검토하는 방법

각 항목은 다음 세 가지 상태로 구분합니다.

| 표기 | 의미 | 리뷰어가 할 일 |
|---|---|---|
| **기준** | 현재 제품 비전과 Issue에서 이미 합의한 방향 | 모순이나 누락이 있을 때만 지적 |
| **제안** | 구현 전에 검토가 필요한 설계안 | 승인, 수정안 또는 반대 근거 제시 |
| **미결정** | 선택에 따라 구조나 일정이 달라지는 항목 | 결론과 결정 근거 제시 |

리뷰 의견에는 가능하면 이 문서의 식별자(`FLOW-01`, `RULE-03`, `SCR-05` 등)를 인용합니다. 검토 결과는 다음 중 하나로 남깁니다.

- **승인**: 구현을 막는 문제가 없고 제안 결정을 기준으로 채택할 수 있음
- **조건부 승인**: 명시한 보완사항을 반영하면 재검토 없이 진행 가능
- **재설계**: 사용자 흐름, 도메인 규칙 또는 기술 경계에 구조적인 문제가 있음

## 2. 한 페이지 요약

### 2.1 제품 정의 — 기준

생산계획, 자재 LOT, 공정 실적, 품질 판정과 감사이력을 하나의 제조 계보로 연결하는 웹 기반 MES를 만든다. 사용자는 현재 생산 상태를 확인하는 데서 끝나지 않고 다음 질문에 근거 데이터로 답할 수 있어야 한다.

1. 어떤 작업이 지연되거나 차단되었는가?
2. 이 생산 LOT에 실제 투입된 자재 LOT는 무엇인가?
3. 불합격 자재가 어떤 생산 LOT와 완제품에 영향을 주었는가?
4. 누가 어떤 상태를 언제, 왜 변경했는가?

### 2.2 핵심 가치 — 기준

- **운영 가시성**: 계획 대비 진행, 지연, 품질 보류와 재고 부족을 한눈에 찾는다.
- **실행 통제**: 선행 공정, 자재 가용량과 필수 검사를 서버 규칙으로 강제한다.
- **양방향 추적**: 자재에서 완제품으로, 완제품에서 자재로 제조 이력을 탐색한다.
- **감사 가능성**: 중요한 상태 변경의 행위자, 시각, 사유와 전후 값을 보존한다.

### 2.3 성공 장면 — 기준

처음 보는 사용자가 가이드 없이 5분 안에 다음 흐름을 시연하고, 각 단계가 왜 허용되거나 차단되는지 설명할 수 있다.

```text
작업지시 릴리스 → 자재 LOT 예약 → 실제 출고·투입 → 공정·검사 실적
               → LOT 분할·일련번호 생성 → 생산 완료
               → 원자재 부적합 사건 → downstream 영향 추적·격리 → 감사이력
```

### 2.4 이번 구현의 경계 — 기준

MVP는 제조 핵심 흐름을 깊게 구현한다. 범용 ERP, 설비 제어, 예측 AI, 복잡한 결재, 멀티테넌시와 특정 기업 화면 복제는 포함하지 않는다.

## 3. 근거와 가정의 경계

### 3.1 확인된 제품 원칙 — 기준

- 장시간 사용하는 데스크톱 B2B 업무도구를 지향한다.
- 정보밀도는 높게 유지하되 상태, 우선순위와 다음 행동을 명확히 한다.
- 화면의 버튼이 실제 API·저장·검증 흐름과 연결되어야 한다.
- 정상 상태뿐 아니라 로딩, 빈 값, 오류, 권한 없음과 동시수정 충돌을 설계한다.
- 실제 기업명, 로고, 고객, 공정 수치, 품질 기준과 운영 데이터는 사용하지 않는다.

### 3.2 프로젝트 가정 — 제안

| ID | 가정 | 틀릴 때의 영향 | 검증 방법 |
|---|---|---|---|
| `ASM-01` | 한 사용자는 데모 세션에서 하나의 대표 역할로 행동한다. | 권한 UI와 테스트 조합 증가 | 역할 전환 데모 walkthrough |
| `ASM-02` | 생산은 명시적인 공정 순서를 가진다. | 선행 공정 차단 모델 변경 | 공정 라우팅 예제 검토 |
| `ASM-03` | 자재 LOT는 일부 수량만 예약·투입되어 여러 생산 LOT에 연결될 수 있다. | LOT 전체 상태와 수량 원장 모델 변경 | 부분 예약·투입 사례 검토 |
| `ASM-04` | 품질 검사는 공정 중 검사와 최종 검사를 모두 표현한다. | 검사 시점·완료 게이트 변경 | 품질 흐름 검토 |
| `ASM-05` | 격리는 LOT를 삭제하지 않고 사용·완료 가능성을 제한하는 상태다. | 감사·해제·폐기 모델 변경 | 격리 시나리오 검토 |
| `ASM-06` | 데모는 단일 사업장과 단일 시간대를 사용한다. | 사업장·시간대 키가 전 엔터티에 필요 | v1.0 범위 검토 |
| `ASM-07` | 생산 LOT는 분할·합류될 수 있고 완제품은 일련번호 단위로 추적할 수 있다. | 계보 node·edge와 완료 조건 단순화 가능 | 분할·합류·일련번호 fixture 검토 |

가정은 실제 제조업 전체를 일반화한 사실이 아니다. MVP를 일관되게 구현하기 위한 모델이며, 반례가 확인되면 ADR 또는 도메인 문서에서 수정한다.

## 4. 사용자와 권한 경계

### 4.1 역할별 핵심 질문과 첫 행동 — 제안

| 역할 | 로그인 직후 핵심 질문 | 가장 빈번한 행동 | 위험 행동 |
|---|---|---|---|
| 생산계획 담당자 | 오늘 지연·차단된 작업은 무엇인가? | 작업지시 생성·릴리스, 진척 확인 | 작업지시 취소 |
| 현장 작업자 | 지금 처리할 공정과 필요한 자재는 무엇인가? | 공정 시작·완료, 양품·불량 수량 입력 | 확정 실적 정정 요청 |
| 자재 담당자 | 부족하거나 격리된 자재가 생산을 막는가? | 입고, LOT 예약·출고, 가용재고 확인 | 예약 해제·재고 조정 |
| 품질 담당자 | 판정 대기 또는 영향 범위가 큰 건은 무엇인가? | 검사 결과 입력, 합격·불합격·보류 판정 | 격리 해제·폐기 판정 |
| 시스템 관리자 | 권한과 상태 변경이 정책대로 수행됐는가? | 사용자 역할, 감사이력 조회 | 역할 변경·관리자 정정 |

### 4.2 권한 원칙 — 제안

- 메뉴를 숨기는 것만으로 권한을 구현하지 않고 API에서 동일한 정책을 강제한다.
- 조회 권한과 상태 변경 권한을 분리한다.
- 확정 데이터의 직접 수정은 허용하지 않는다. 취소·정정 명령과 사유를 별도 이벤트로 남긴다.
- 위험 행동은 대상, 현재 상태, 변경 결과를 확인한 후 수행한다.
- 권한이 없는 사용자는 행동 버튼을 단순히 비활성화하기보다 이유와 필요한 역할을 확인할 수 있다.

## 5. 5분 핵심 시나리오

### `FLOW-01` 작업지시부터 사후 부적합 격리까지 — 기준

| 순서 | 사용자 | 화면 | 행동 | 시스템이 보장할 것 |
|---:|---|---|---|---|
| 1 | 생산계획 | `SCR-02C` 작업지시 상세 | 작업지시를 릴리스 | BOM·공정경로·검사규격 revision 고정 |
| 2 | 자재 | `SCR-03D` 자재 할당 | 가용 자재 LOT의 일부 수량을 예약 | 가용량 초과와 품질 차단 LOT 거부, 계보는 아직 생성하지 않음 |
| 3 | 현장 | `SCR-04B` 공정 실행 | 첫 공정을 시작하며 예약 자재를 실제 출고·투입 | 예약 감소, 재고 출고, 실제 투입과 계보 edge를 하나의 transaction으로 기록 |
| 4 | 현장·품질 | `SCR-04B`·`SCR-05B` | 공정 실적과 공정 중 검사 입력 | 공정 순서·수량 합계·적용 검사규격 검증 |
| 5 | 현장 | `SCR-04B` 공정 실행 | 생산 LOT 분할 또는 완제품 일련번호 생성 | 분할·변환 관계를 중복·순환 없이 append-only 기록 |
| 6 | 품질 | `SCR-05B` 검사 실행 | 최종 검사 후 생산 LOT 완료 | 해당 단계의 필수 검사와 품질 disposition을 확인; 모든 LOT 완료 시 작업지시 완료 |
| 7 | 품질 | `SCR-05C` 부적합·격리 | 이미 사용된 원자재 LOT에 사후 부적합 사건 등록 | 과거 소비 이력은 보존하고 해당 LOT의 잔여 가용량을 0으로 계산 |
| 8 | 품질 | `SCR-06B` LOT 계보 | 원자재 LOT에서 downstream 영향 범위 조회 | 생산 LOT·자식 LOT·완제품 일련번호를 정방향 추적 |
| 9 | 품질 | `SCR-05C` 부적합·격리 | 영향 LOT와 완제품을 선택해 격리 | 대상·원천 사건·사유를 같은 transaction의 감사이력에 기록 |
| 10 | 관리자 | `SCR-07A` 감사이력 | 전체 흐름의 변경 근거 확인 | 행위자·시각·사유·전후 상태·요청 ID 제공 |

### `FLOW-02` 의도된 실패 시연 — 기준

포트폴리오 데모는 정상 흐름만 보여주지 않는다. 다음 네 가지 차단을 짧게 재현하고, UI 메시지와 서버 규칙이 일치함을 보여준다.

1. 가용재고보다 많은 자재 할당을 시도하면 저장되지 않는다.
2. 예약만 있고 실제 출고·투입되지 않은 자재는 LOT 계보에 나타나지 않는다.
3. 양품 수량과 불량 수량의 합이 투입 수량과 다르면 공정을 완료할 수 없다.
4. 필수 검사 미완료 또는 불합격 상태에서는 생산 LOT를 완료할 수 없다.

## 6. 정보구조

### 6.1 7개 업무영역과 하위 화면 — 제안

`SCR-01`~`SCR-07`은 화면 7개가 아니라 전역 탐색에 노출되는 **업무영역·화면군**이다. Figma frame, route와 구현 Issue는 하위 ID를 사용한다.

```text
운영 대시보드                                      SCR-01
  └─ 예외·지표 대시보드                            SCR-01A
생산
  ├─ 작업지시                                      SCR-02
  │   ├─ 목록                                      SCR-02A
  │   ├─ 생성                                      SCR-02B
  │   └─ 상세                                      SCR-02C
  └─ 공정 실행·실적                                SCR-04
      ├─ 실행 대기열                               SCR-04A
      └─ 공정 실행                                 SCR-04B
자재                                               SCR-03
  ├─ BOM·소요량                                    SCR-03A
  ├─ 자재 LOT 목록                                 SCR-03B
  ├─ 자재 LOT 상세                                 SCR-03C
  └─ 작업지시 자재 할당                            SCR-03D
품질                                               SCR-05
  ├─ 검사 대기열                                   SCR-05A
  ├─ 검사 실행                                     SCR-05B
  └─ 부적합·격리 케이스                            SCR-05C
추적                                               SCR-06
  ├─ LOT·일련번호 검색                             SCR-06A
  └─ 계보·영향 범위 tree/table                     SCR-06B
관리                                               SCR-07
  ├─ 감사이력                                      SCR-07A
  └─ 사용자 관리                                   SCR-07B
```

`SCR-07B` 사용자 관리 UI는 일정 절단 대상이다. 고정된 데모 계정, seed와 API 권한 검증은 유지하되 역할 편집 화면은 MVP 후순위로 둘 수 있다.

### 6.2 공통 셸 — 제안

- 좌측 탐색: 1차 업무영역과 현재 위치를 항상 표시한다.
- 상단 문맥: 화면 제목, 사업일, 마지막 갱신 시각, 사용자 역할을 표시한다.
- 전역 검색: 작업지시 번호, 생산 LOT, 자재 LOT를 한 검색창에서 찾는다.
- 본문 헤더: 필터·조회 조건과 대표 행동 하나를 우선 배치한다.
- 상세 문맥: breadcrumb보다 실제 업무 대상의 식별자와 상태를 더 강하게 표시한다.
- 알림: 저장 성공보다 차단·충돌·품질 보류처럼 후속 행동이 필요한 사건을 우선한다.

전역 검색은 MVP에서 정확 일치와 접두어 검색만 지원한다. 자동완성, 자연어 검색과 고급 검색식은 비범위다.

## 7. 화면군 계약

각 화면군과 하위 화면은 보기 좋은 시안보다 사용자가 내릴 결정, 필요한 데이터, 실행할 행동과 실패 상태를 먼저 정의한다.

### `SCR-01` 운영 대시보드 화면군 — 제안

**목적**: 지연, 차단, 품질 보류와 재고 부족 중 지금 개입할 대상을 찾는다.

- 하위 화면: `SCR-01A` 예외·지표 대시보드
- 상단 지표: 진행 작업, 지연 작업, 검사 대기, 격리 LOT
- 본문 1: 상태별 작업지시와 납기 위험 목록
- 본문 2: 재고 부족·품질 보류·실패한 처리의 예외 큐
- 보조 시각화: 최근 생산 실적과 불량 추이
- 대표 행동: 예외 행을 선택해 해당 업무 상세로 이동
- 금지: 근거 없는 실시간 애니메이션, 의미 없는 숫자 카드, 조작 불가능한 장식용 차트

### `SCR-02` 작업지시 화면군 — 제안

**목적**: 무엇을 언제 얼마나 생산할지 정의하고, 진행 근거와 차단 원인을 확인한다.

- 하위 화면: `SCR-02A` 목록, `SCR-02B` 생성, `SCR-02C` 상세
- 목록 핵심 열: 작업지시, 제품, 계획수량, 납기, 진행률, 현재 공정, 상태, 차단 사유
- 상세 탭: 요약, 자재, 공정, 검사, LOT 계보, 변경이력
- 생성 필드: 제품, 계획수량, 납기, 우선순위, 메모
- 대표 행동: 초안 생성 또는 조건 충족 후 릴리스
- 위험 행동: 취소 시 대상·영향·사유를 재확인. MVP에서는 실제 투입·공정 실적이 없는 `DRAFT`·`RELEASED`만 취소 가능
- 충돌 상태: 다른 사용자가 수정한 최신 버전과 내 입력의 차이를 보여주고 재조회 유도

### `SCR-03` BOM·자재 LOT·재고·할당 화면군 — 제안

**목적**: 필요한 자재, 실제 투입 LOT와 잔여 가용량을 일치시킨다.

- 하위 화면: `SCR-03A` BOM·소요량, `SCR-03B` 자재 LOT 목록, `SCR-03C` 자재 LOT 상세, `SCR-03D` 작업지시 자재 할당
- BOM: 제품·버전별 자재 요구량과 유효기간
- 자재 LOT: 입고량, `onHand`, 가용량, 예약량, 소비량, 품질 disposition, 유효기간
- 예약 패널: 요구량 대비 선택 LOT의 예약 합계와 부족량을 즉시 계산
- 대표 행동: 유효하고 가용한 LOT 수량 예약. 예약만으로 실제 투입 또는 계보 관계를 만들지 않음
- 차단 상태: 부족, 격리, 만료, 이미 다른 작업에 예약됨
- 동시성: 예약 저장과 공정 시작의 실제 출고·투입 시점에 서버가 각각 가용량과 예약잔량을 다시 검증

### `SCR-04` 공정 실행·실적 화면군 — 제안

**목적**: 작업자가 현재 가능한 공정을 찾고 실제 투입·양품·불량 실적을 정확히 기록한다.

- 하위 화면: `SCR-04A` 실행 대기열, `SCR-04B` 공정 실행
- 공정 단계: 대기, 실행 가능, 진행 중, 완료, 차단을 텍스트·아이콘·색으로 표시
- 입력: 시작·종료 시각, 투입수량, 양품수량, 불량수량, 불량유형, 메모
- 대표 행동: 현재 공정 시작 또는 완료. 필요한 자재의 실제 투입 시 예약량을 출고·소비로 전환
- 차단 근거: 선행 공정, 자재, 필수 검사, 권한 중 무엇이 충족되지 않았는지 표시
- 정정: 완료 실적을 직접 편집하지 않고 정정 요청 흐름으로 연결

### `SCR-05` 품질검사·부적합·격리 화면군 — 제안

**목적**: 검사 대상을 우선순위대로 판정하고 불합격의 영향 범위를 통제한다.

- 하위 화면: `SCR-05A` 검사 대기열, `SCR-05B` 검사 실행, `SCR-05C` 부적합·격리 케이스
- 검사 큐: 대상 LOT, 검사 종류, 적용 규격 revision, 요청 시각, 납기 영향, 현재 판정
- 결과 입력: 항목, 측정값, 단위, 허용범위, 판정, 검사자, 시각
- 대표 행동: 합격·불합격·보류 판정
- 부적합 사건: 원자재·생산 LOT 또는 완제품 일련번호에 사후 발견 사건과 근거 등록
- 격리 패널: 원천 사건, downstream 영향 LOT·일련번호, 사용·완료 제한, 사유와 해제 조건
- 위험 행동: 격리 해제 또는 폐기 시 대상 수와 후속 영향을 재확인
- 표현 원칙: 허용범위를 벗어난 값은 색뿐 아니라 수치·기준·문구로 설명

### `SCR-06` LOT·일련번호 계보 화면군 — 제안

**목적**: 하나의 LOT에서 상위 원자재와 하위 생산 결과를 양방향으로 추적한다.

- 하위 화면: `SCR-06A` LOT·일련번호 검색, `SCR-06B` 계보·영향 범위 tree/table
- 진입점: 전역 검색, 작업지시 상세, 자재 LOT, 완제품 일련번호 또는 품질 사건
- 기본 보기: 선택 node 중심의 부모·자식 관계, 관계 유형과 수량
- 보조 보기: 정렬 가능한 관계 목록과 상태·품질 필터
- 방향 언어: 원자재에서 생산 결과는 `downstream 영향 추적`, 완제품에서 원자재는 `upstream 원천 추적`로 일관되게 표시
- 대표 행동: 영향 LOT·일련번호를 선택해 상세 또는 격리 흐름으로 이동
- 대량 관계: 단계별 펼치기와 서버 페이지네이션으로 화면·쿼리 폭발 방지
- 접근성: 그래프만 제공하지 않고 동일 정보를 표 구조로 제공

### `SCR-07` 감사이력·사용자 관리 화면군 — 제안

**목적**: 권한과 중요한 상태 변경이 정책대로 수행됐는지 확인한다.

- 하위 화면: `SCR-07A` 감사이력, `SCR-07B` 사용자 관리
- 사용자: 이름, 상태, 대표 역할, 마지막 로그인. 편집 UI는 일정에 따라 절단 가능
- 감사이력: 대상 유형·ID, 명령, 행위자, 시각, 사유, 이전 값, 새 값, 요청 ID
- 대표 행동: 필터링 후 특정 변경의 상세 근거 확인
- 위험 행동: 역할 변경과 계정 비활성화
- 금지: 비밀번호, 인증 토큰, 불필요한 개인정보를 로그에 저장하거나 표시

## 8. 화면 상태와 시각 언어

### 8.1 공통 상태 계약 — 기준

| 상태 | 화면 계약 | 사용자가 할 수 있는 일 |
|---|---|---|
| 정상 | 핵심 데이터와 대표 행동 표시 | 다음 업무 수행 |
| 로딩 | 기존 문맥 보존, 영역 단위 진행 표시 | 중복 제출 방지, 필요한 경우 취소 |
| 빈 값 | 왜 비었는지와 첫 생성·필터 해제 방법 표시 | 생성 또는 조회조건 초기화 |
| 오류 | 실패한 작업, 보존된 입력, 재시도 가능 여부 표시 | 재시도, 입력 수정 또는 지원 정보 복사 |
| 권한 없음 | 필요한 권한과 읽을 수 있는 범위를 설명 | 이전 화면 이동, 관리자 문의 근거 확인 |
| 충돌 | 최신 상태와 내 요청이 충돌한 이유 표시 | 최신값 다시 불러오기, 안전하게 재시도 |
| 부분 실패 | 성공·실패 대상을 분리해 표시 | 실패 건만 재처리 |

### 8.2 상태 표현 — 기준

- 색상 하나로 상태를 전달하지 않는다. 텍스트, 아이콘과 형태를 함께 사용한다.
- 동일한 업무 상태는 모든 화면에서 같은 이름과 의미를 사용한다.
- `대기`, `진행 중`, `완료`, `보류`, `불합격`, `격리`처럼 업무 언어를 우선한다.
- 위험도와 진행상태를 한 badge 체계에 섞지 않는다.
- 갱신 시각과 데이터 출처를 보여주고, 실제 연결이 없는 실시간 효과는 사용하지 않는다.

### 8.3 화면 폭과 정보 우선순위 — 제안

| 폭 | 대상 | 원칙 |
|---:|---|---|
| 1440px 이상 | 계획·자재·품질·관리자 | 필터와 핵심 표를 한 화면에서 읽고 상세 drawer를 병행 |
| 1280px | 최소 데스크톱 업무 화면 | 필수 열과 대표 행동은 가로 스크롤 없이 유지, 보조 열은 숨김 설정 |
| 1024px | 현장 작업 화면 | 공정 대상, 수량 입력과 완료 행동에 집중; 관리용 복합 표는 대상 아님 |

모바일 소비자 UI는 MVP 비범위다. 1024px 지원은 현장 업무의 핵심 행동을 위한 별도 우선순위이며 전체 관리 기능을 축소 복제하지 않는다.

## 9. 도메인 상태와 불변조건

### 9.1 상태 모델 — 제안

#### 작업지시

```text
DRAFT → RELEASED → IN_PROGRESS → COMPLETED
  │         │
  └─────────┴────→ CANCELLED  (실제 투입·공정 실적이 없을 때만)
```

- `DRAFT`: 계획 수정 가능
- `RELEASED`: 유효한 BOM·공정경로·검사규격 revision이 고정됨
- `IN_PROGRESS`: 하나 이상의 생산 LOT 또는 공정이 시작됨
- `COMPLETED`: 소속 생산 LOT가 모두 `COMPLETED`임
- `CANCELLED`: 실제 자재 투입과 공정 실적이 없는 `DRAFT`·`RELEASED`에서만 허용하며 사유와 행위자를 남김

#### 생산 LOT

```text
생산 진행: PLANNED → READY → IN_PROCESS → COMPLETED

품질 disposition:
  PENDING → ACCEPTED | HOLD | REJECTED
  ACCEPTED | HOLD | REJECTED → QUARANTINED  (부적합 사건·containment)
  QUARANTINED → ACCEPTED | REJECTED          (근거 있는 해제·최종 처분)
```

생산 진행과 품질 disposition은 서로 다른 상태 축이다. 공정 중 검사와 최종 검사는 각각 `Inspection`으로 존재하며, 생산 LOT에 단일 `INSPECTION_PENDING` 단계를 두지 않는다. `COMPLETED` 전이는 모든 공정 완료, 적용 가능한 필수 검사 통과와 `ACCEPTED` disposition을 함께 확인한다. 완료 후 사후 부적합으로 `QUARANTINED`가 되어도 생산 이력의 `COMPLETED` 사실은 덮어쓰지 않고 후속 사용·출하 가능성만 차단한다.

#### 자재 LOT

자재 LOT 전체에 `ALLOCATED`나 `CONSUMED` 상태를 두지 않는다. 한 LOT가 동시에 일부 가용·일부 예약·일부 소비될 수 있으므로 수량, 품질과 물류 생명주기를 분리한다.

```text
수량
  onHand   = 입고 + 반납 + 증가조정 - 실제출고 - 폐기 - 감소조정
  reserved = 유효한 할당의 미출고 잔량 합계
  consumed = 생산 투입으로 확정된 실제출고 누계
  scrapped = 폐기로 확정된 누계
  available = 품질 disposition이 ACCEPTED일 때 max(onHand - reserved, 0), 그 외 0

품질 disposition
  PENDING → ACCEPTED | HOLD | REJECTED
  ACCEPTED | HOLD | REJECTED → QUARANTINED
  QUARANTINED → ACCEPTED | REJECTED

물류 생명주기
  OPEN → EXHAUSTED → CLOSED
```

`OPEN`·`EXHAUSTED`는 가능한 한 원장 잔량에서 계산하고 별도 수정 가능한 진실 공급원으로 만들지 않는다. MVP의 격리는 LOT 잔여량 전체에 적용한다. 격리 수량은 물리적 `onHand`에는 남지만 `available`에서는 제외되며, 격리 전 소비 이력은 downstream 영향 추적에 계속 사용한다.

#### 검사·부적합 사건·격리

```text
검사: PENDING → IN_PROGRESS → PASS | FAIL | HOLD
부적합 사건: OPEN → ASSESSED → CONTAINED → CLOSED
격리: OPEN → UNDER_REVIEW → RELEASED | SCRAPPED
```

`QualityIncident`는 원자재·생산 LOT 또는 완제품 일련번호에서 사후 발견된 부적합의 원천 사건이다. `QuarantineCase`는 그 사건의 downstream 영향 대상과 통제 결과를 기록한다. 전체 수입검사 모듈은 만들지 않지만 원자재 LOT에 사건을 등록하는 최소 흐름은 MVP에 포함한다.

### 9.2 핵심 불변조건 — 기준

| ID | 규칙 | 강제 위치 | 최소 검증 |
|---|---|---|---|
| `RULE-01` | 자재 예약량은 가용량을, 실제 투입량은 해당 예약잔량과 `onHand`를 초과할 수 없다. | API + DB transaction | 동시 예약·출고 통합 테스트 |
| `RULE-02` | `ACCEPTED`가 아니거나 폐기·만료된 자재 LOT는 신규 예약·투입할 수 없다. | Domain + API | 상태별 단위·통합 테스트 |
| `RULE-03` | 선행 공정이 완료되지 않으면 후속 공정을 완료할 수 없다. | Domain | 순서 위반 단위 테스트 |
| `RULE-04` | 공정 투입수량은 양품수량과 불량수량의 합과 같아야 한다. | Domain + DB constraint 검토 | 경계값 테스트 |
| `RULE-05` | 필수 검사 누락·불합격·보류 상태에서는 LOT를 완료할 수 없다. | Domain | 상태 전이 테스트 |
| `RULE-06` | 확정 실적과 판정은 덮어쓰지 않고 취소·정정 이벤트로 보정한다. | Domain + Audit | 정정 이력 통합 테스트 |
| `RULE-07` | 동일한 상태 변경 명령이 재전송돼도 결과가 중복 반영되지 않는다. | API + DB | idempotency 통합 테스트 |
| `RULE-08` | 중요한 변경은 행위자·시각·사유·전후 값·요청 ID를 남긴다. | Application + DB | 감사이력 통합 테스트 |
| `RULE-09` | 오래된 버전의 수정은 최신 데이터를 덮어쓰지 않는다. | API + DB | optimistic lock 충돌 테스트 |
| `RULE-10` | 자재 예약은 재고를 보류하지만 실제 투입이나 계보 edge를 만들지 않는다. | Domain + DB | 예약 후 계보 부재 테스트 |
| `RULE-11` | 실제 투입은 예약 감소, 재고 출고, `InventoryTransaction`, `MaterialConsumption`, `LotRelation`과 감사이력을 하나의 transaction에 기록한다. | Application + DB | rollback·부분투입 통합 테스트 |
| `RULE-12` | 확정된 계보 edge는 수정·삭제하지 않으며 같은 사건의 중복 edge와 순환 관계를 거부한다. | Domain + DB | idempotency·cycle 테스트 |
| `RULE-13` | 검사 판정은 적용 규격 revision과 단위·하한·상한·판정방식 snapshot을 보존하며 이후 규격 변경으로 과거 결과를 재판정하지 않는다. | Domain + DB | revision 변경 회귀 테스트 |
| `RULE-14` | 생산 LOT는 자신의 완료 게이트를 충족해야 하며 작업지시는 모든 소속 LOT가 `COMPLETED`일 때만 완료된다. | Domain | 다중 LOT 완료 테스트 |
| `RULE-15` | 품질 차단 자재의 잔량은 `onHand`에는 포함되지만 `available`은 0이며 기존 소비·계보 이력은 보존한다. | Domain + Query | 사후 부적합 계산 테스트 |

클라이언트 검증은 빠른 피드백을 위한 보조 수단이다. 업무 불변조건의 최종 권한은 서버와 데이터베이스에 둔다.

## 10. 데이터 모델 초안

### 10.1 핵심 엔터티 — 제안

| 영역 | 엔터티 | 핵심 책임 |
|---|---|---|
| 기준정보 | `Product`, `Material`, `Bom`, `BomItem`, `ProcessRoute`, `ProcessStep` | 제품·자재·공정 revision 정의 |
| 생산 | `WorkOrder`, `ProductionLot`, `FinishedUnit`, `ProcessExecution`, `LotTransformationEvent`, `DefectRecord` | 계획, LOT 분할·합류, 일련번호와 공정 실적 |
| 자재 | `MaterialLot`, `InventoryTransaction`, `MaterialAllocation`, `MaterialConsumption` | 수량 원장과 실제 투입 관계 |
| 품질 | `InspectionSpec`, `InspectionSpecRevision`, `Inspection`, `InspectionResult`, `QualityIncident`, `QuarantineCase` | 규격 snapshot, 판정, 사후 부적합과 격리 결정 |
| 접근제어 | `User`, `Role`, `UserRole` | 데모 사용자와 역할 권한 |
| 계보 | `TraceNode`, `LotRelation` | 자재·생산 LOT·완제품 일련번호의 공통 node와 append-only edge |
| 감사 | `AuditEvent` | 중요한 명령과 상태 변경 이력 |

### 10.2 관계 원칙 — 제안

- 하나의 `WorkOrder`는 하나 이상의 `ProductionLot`을 가지며 릴리스 시 적용 `Bom`, `ProcessRoute`, `InspectionSpecRevision`을 고정한다.
- `TraceNode`는 `MATERIAL_LOT`, `PRODUCTION_LOT`, `FINISHED_UNIT` 중 하나를 가리키는 추적 식별자다. 무제한 다형 관계 대신 허용 유형과 참조 무결성을 schema에서 제한한다.
- `LotRelation(parentTraceNodeId, childTraceNodeId, relationType, quantity, eventId)`은 최소 `CONSUME`, `SPLIT`, `MERGE`, `TRANSFORM`, `SERIALIZE`를 표현한다.
- `MaterialAllocation`은 예약의 근거일 뿐 계보가 아니다. 공정 시작의 실제 출고·투입에서 `MaterialConsumption`과 대응 `CONSUME` relation을 같은 transaction으로 생성한다.
- 생산 LOT 분할·합류·변환은 `LotTransformationEvent`와 관계 edge를 같은 transaction으로 생성한다. 하나의 생산 LOT는 여러 `FinishedUnit` 일련번호로 연결될 수 있다.
- `LotRelation.eventId`는 같은 업무 사건의 중복 edge를 막으며, 확정 후 update·delete하지 않는다. 새 edge는 자기참조와 순환을 거부한다.
- `Inspection`은 적용 `InspectionSpecRevision`을 참조하고 판정 당시 항목·단위·하한·상한·판정방식을 snapshot으로 보존한다.
- `QualityIncident`는 하나의 원천 `TraceNode`를 가리키며, `QuarantineCase`가 그 사건에서 파생된 영향 node와 격리 결정을 연결한다.
- `AuditEvent`는 조회 편의를 위한 스냅샷이며 재고·상태의 진실 공급원으로 사용하지 않는다.
- 삭제 대신 업무 상태와 취소 거래를 사용하고, 기준정보만 참조 여부에 따라 비활성화한다.

### 10.3 진실 공급원과 파생 관계 — 제안

| 질문 | 진실 공급원 | 다른 모델과의 관계 |
|---|---|---|
| 현재 물리 재고는 얼마인가? | `InventoryTransaction` 합계 | `MaterialLot.onHand`를 임의 수정하지 않음 |
| 얼마가 예약됐는가? | `MaterialAllocation`의 유효 미출고 잔량 | 예약은 물리 출고와 계보를 만들지 않음 |
| 어느 자재가 실제 투입됐는가? | `MaterialConsumption` | 실제 출고 transaction과 같은 사건을 참조 |
| LOT·일련번호가 어떻게 연결됐는가? | `LotRelation` | 소비·분할·합류·변환 사건에서 동기적으로 생성하며 수동 CRUD 금지 |
| 어떤 품질 판단이 유효한가? | 최신 유효 `InspectionResult`, `QualityIncident`, `QuarantineCase` | 과거 판정은 snapshot과 정정 이력으로 보존 |
| 누가 왜 바꿨는가? | `AuditEvent` | 설명 근거이며 업무 상태를 재계산하는 원장은 아님 |

## 11. 기술 구조

### 11.1 구조 선택 — 제안

초기 구조는 하나의 저장소 안에 Web과 API를 둔 **모듈형 모놀리스**로 제안한다.

```text
apps/web       React + TypeScript + Vite
apps/api       NestJS + REST + OpenAPI
packages/*     공유 설정, 생성된 API 타입 또는 순수 공통 타입
PostgreSQL     업무 데이터와 원장
Docker Compose 로컬 실행 환경
```

도메인 모듈은 `production`, `inventory`, `quality`, `traceability`, `auth`, `audit`, `dashboard` 경계를 가진다. 다른 모듈의 테이블에 UI 편의를 위해 직접 의존하지 않고 application service 또는 명시적 query 경계를 사용한다.

마이크로서비스, 메시지 브로커, Kubernetes와 이벤트 소싱은 현재 문제 규모에서 설명 비용만 키우므로 비범위다.

### 11.2 Web — 제안

- React, TypeScript, Vite
- 서버 상태: TanStack Query
- 복합 표: TanStack Table
- 폼: React Hook Form + Zod
- 차트: Recharts, 단 대시보드 의사결정에 필요한 최소 차트만 사용
- 스타일·접근성 기반: Tailwind CSS + Radix UI 조합을 우선 검토
- 날짜·수량·상태 변환은 화면마다 복제하지 않고 공통 formatter와 도메인 표현 계층으로 관리

서버 응답 타입을 프론트에서 수동 복제하지 않는다. OpenAPI 기반 생성 타입 또는 schema 공유 중 하나를 ADR로 결정한다.

### 11.3 API와 데이터 — 제안

- Node.js + NestJS
- PostgreSQL + Prisma
- REST API와 OpenAPI 문서
- 상태 변경은 명령형 endpoint를 사용해 의도를 드러낸다.

예시:

```text
POST /work-orders
POST /work-orders/{id}/release
POST /work-orders/{id}/material-allocations
POST /process-executions/{id}/start
POST /process-executions/{id}/complete
POST /inspections/{id}/decide
POST /quality-incidents
POST /quality-incidents/{id}/quarantine
GET  /traceability/nodes/{traceNodeId}
```

공정 시작 명령은 선택한 예약의 실제 출고·투입을 함께 조정한다. 단순 CRUD update 하나로 모든 상태를 바꾸지 않으며 명령마다 권한, 전제조건, transaction과 감사 이벤트를 명시한다.

### 11.4 정합성과 실패 처리 — 제안

- 자재 예약은 `MaterialAllocation`과 예약 원장만 변경하며 실제 소비·계보와 분리한다.
- 공정 시작의 실제 투입은 예약잔량 감소, `onHand` 출고, `InventoryTransaction`, `MaterialConsumption`, `LotRelation`과 `AuditEvent`를 하나의 DB transaction에서 처리한다.
- `LotRelation`과 검사 판정 snapshot은 생성 후 일반 update·delete 대상이 아니다.
- 상태 변경 요청에는 idempotency key 또는 명령 ID를 사용한다.
- 수정 가능한 aggregate는 version으로 optimistic concurrency를 검증한다.
- 사용자에게는 도메인 오류 코드와 해결 행동을 제공하고 내부 stack trace는 노출하지 않는다.
- 감사이력과 운영 로그는 목적을 분리한다. 운영 로그에 토큰, 비밀번호, 민감한 폼 입력을 기록하지 않는다.
- 데모 초기화는 30초 안에 끝나는 seed/reset 명령으로 제공한다.

감사 기록 기반은 #17까지 미루지 않는다. 첫 상태변경 기능인 #11에서 append-only `AuditEvent` schema와 기록 helper를 만들고 #11~#16의 각 중요 command가 자신의 transaction 안에서 이벤트를 남긴다. #17은 통합 검색 UI·조회 권한·redaction·누락 검증을 완성한다.

인증은 Web과 API를 same-origin으로 배포하는 HttpOnly cookie 세션을 채택한다. `Secure`, `HttpOnly`, 명시적 `SameSite` 속성을 사용하고 unsafe method의 Origin 검증과 CSRF token 정책을 ADR에서 확정한다. 임의 origin의 credentialed CORS는 허용하지 않는다.

### 11.5 예약·실제 투입 명령 소유권 — 제안

| 명령·capability | 구현 Issue | 책임 |
|---|---|---|
| `reserveMaterial`, `releaseMaterialReservation` | #12 | 부분 예약·해제, 예약잔량과 가용량 동시성 보장 |
| `consumeMaterialReservation` | #13 | inventory module 안에서 실제 출고·소비·계보 transaction capability 구현 |
| `startProcessExecution` | #13 | 공정 시작과 `consumeMaterialReservation`을 한 transaction boundary에서 orchestration |

#13의 production service가 재고 테이블을 직접 수정하지 않고 inventory module의 `consumeMaterialReservation`을 호출한다. 실제 투입이 실패하면 공정 시작, 재고 출고, 소비·계보·감사 기록이 모두 rollback된다.

## 12. 디자인 산출물 계약

Issue #8의 완료 산출물은 이 문서 하나가 아니다. 크로스검토 후 다음 Figma 산출물을 만든다.

1. **00 Review Map**: 역할별 질문, `FLOW-01`, 미결정 사항과 변경 이력
2. **01 IA**: 7개 업무영역 `SCR-01`~`SCR-07`과 하위 화면 ID의 관계·진입·이탈 경로
3. **02 Critical Flow**: 릴리스 → 예약 → 실제 투입 → 공정·검사 → 분할·일련번호 → 부적합 → downstream 격리 wireframe
4. **03 Screen Wireframes**: `SCR-02A`~`SCR-02C`, `SCR-03D`, `SCR-04A`~`SCR-04B`, `SCR-05A`~`SCR-05C`, `SCR-06A`~`SCR-06B`, `SCR-07A`
5. **04 State Matrix**: 정상·로딩·빈 값·오류·권한 없음·충돌 상태
6. **05 Foundations**: 색, 타이포그래피, 간격, 표, 상태 badge와 위험 행동 원칙
7. **06 Handoff**: 화면 ID, 데이터 요구사항, interaction과 구현 Issue 연결

모든 핵심 화면은 1440px에서 설계하고 1280px에서 열 우선순위를 검증한다. 현장 공정 화면은 1024px에서 핵심 입력과 대표 행동을 별도로 점검한다.

## 13. 검증 전략

### 13.1 테스트 층 — 제안

| 층 | 검증 대상 | 필수 예시 |
|---|---|---|
| Domain unit | 상태 전이와 순수 업무 규칙 | `RULE-01`~`RULE-15` |
| API integration | transaction, 권한, idempotency, concurrency | 동시 예약·실제 투입, 계보 중복·순환, 중복 완료 요청 |
| Component | 표·폼·상태 표현과 접근성 | 오류·권한 없음·충돌 상태 |
| E2E | 역할을 가로지르는 사용자 결과 | `FLOW-01`, `FLOW-02` |
| Seed smoke | 새 환경에서 데모 재현 | 설치 → seed → 로그인 → 핵심 조회 |

### 13.2 출시 게이트 — 기준

- lint, typecheck, test와 build가 통과한다.
- 핵심 불변조건에 자동 테스트 근거가 있다.
- 키보드만으로 대표 흐름을 수행할 수 있다.
- 1280px에서 정의한 필수 열과 대표 행동을 가로 스크롤 없이 읽을 수 있다.
- UI 변경 PR에는 정상, 로딩, 빈 값, 오류, 권한 없음 상태 근거가 있다.
- API·schema 변경은 migration과 rollback 영향을 기록한다.
- 가상 데이터만 포함되고 비밀정보·실제 기업 데이터가 없다.

이 목록은 최종 구현의 출시 게이트다. 현재 Draft PR #20에서 GitHub가 자동 실행하는 검사는 `PR title` 하나이며, 로컬 `git diff --check`와 기밀 문자열 검색은 서버 CI와 구분한다. #1에서 코드 검사와 함께 Markdown lint·저장소 내부 링크 검사를 자동화한다.

## 14. 구현 순서와 Issue 연결

| 순서 | Issue | 산출물 | 선행 이유 |
|---:|---|---|---|
| 1 | [#8](https://github.com/wooinwoo/sensor-manufacturing-mes/issues/8) | 사용자 흐름, IA, wireframe | 구현 전에 정보구조와 상태 계약 확정 |
| 2 | [#2](https://github.com/wooinwoo/sensor-manufacturing-mes/issues/2) | 상태축, 수량식, 계보·규격 용어와 불변조건 | UI·API가 같은 업무 언어 사용 |
| 3 | [#1](https://github.com/wooinwoo/sensor-manufacturing-mes/issues/1) | 실행 가능한 workspace와 코드·문서 CI | 이후 PR의 자동 검증 기반 |
| 4 | [#9](https://github.com/wooinwoo/sensor-manufacturing-mes/issues/9) | token, app shell, 공통 상태 | 화면 간 일관성 확보 |
| 5 | [#10](https://github.com/wooinwoo/sensor-manufacturing-mes/issues/10) | 데모 인증·RBAC | 이후 모든 명령의 권한 경계 |
| 6 | [#11](https://github.com/wooinwoo/sensor-manufacturing-mes/issues/11) | 작업지시 수직 흐름, 감사기록 기반 | 첫 상태변경부터 append-only 감사 보장 |
| 7 | [#12](https://github.com/wooinwoo/sensor-manufacturing-mes/issues/12) | BOM·자재 LOT·부분 예약과 수량 원장 | 생산 실행 전 가용량·예약 경계 확정 |
| 8 | [#13](https://github.com/wooinwoo/sensor-manufacturing-mes/issues/13) | 공정 시작의 실제 출고·투입과 공정 실적 | 예약을 실제 소비·계보로 전환 |
| 9 | [#14](https://github.com/wooinwoo/sensor-manufacturing-mes/issues/14) | 검사규격 revision·판정 snapshot·완료 차단 | 재현 가능한 품질 게이트 완성 |
| 10 | [#15](https://github.com/wooinwoo/sensor-manufacturing-mes/issues/15) | 분할·합류·일련번호 양방향 추적 | 실제 투입 관계의 사용자 가치 증명 |
| 11 | [#16](https://github.com/wooinwoo/sensor-manufacturing-mes/issues/16) | 원자재 부적합 사건·영향 node 격리 | 추적 결과를 통제 행동으로 연결 |
| 12 | [#17](https://github.com/wooinwoo/sensor-manufacturing-mes/issues/17) | 감사이력 검색·redaction·누락 검증 | 누적된 감사 이벤트의 설명 가능성 완성 |
| 13 | [#18](https://github.com/wooinwoo/sensor-manufacturing-mes/issues/18) | 운영 대시보드 | 축적된 실제 데이터로 예외 요약 |
| 14 | [#19](https://github.com/wooinwoo/sensor-manufacturing-mes/issues/19) | 배포, README, 5분 데모 | 재현 가능한 포트폴리오 근거 완성 |

대시보드를 뒤에 구현하는 이유는 가짜 지표를 먼저 만드는 대신 작업지시·자재·공정·품질의 실제 데이터와 상태를 요약하기 위해서다.

## 15. 범위 절단 순서

일정이 부족해도 `FLOW-01`, `FLOW-02`, 핵심 불변조건과 감사 가능성은 유지한다. 다음 기능부터 순서대로 미룬다.

1. `SCR-01A`의 고급 지표·trend chart. 근거 exception 목록은 유지
2. `SCR-07B` 사용자·역할 편집 UI. 고정 데모 계정과 API 권한 검증은 유지
3. 고급 계보 graph 레이아웃. 접근 가능한 tree/table과 양방향 추적은 유지
4. QR 스캔
5. Excel·CSV 고급 내보내기와 PDF 문서 생성
6. Pareto·평균 공정시간 분석과 대량 계보 최적화
7. 재작업의 세부 공정 흐름

단순 데모를 위해 서버 검증, transaction, 실패 상태 또는 테스트를 삭제하는 것은 허용하지 않는다.

## 16. 위험 등록부

| ID | 위험 | 가능성/영향 | 조기 신호 | 대응 |
|---|---|---|---|---|
| `RSK-01` | MES 범위가 범용 ERP로 확장됨 | 높음/높음 | 회계·구매·영업 요구가 핵심 흐름보다 앞섬 | 비범위와 절단 순서로 차단 |
| `RSK-02` | 화면은 많지만 수직 흐름이 연결되지 않음 | 중간/높음 | 버튼이 mock 상태만 변경 | Issue마다 DB까지 연결된 결과 요구 |
| `RSK-03` | 업무 상태가 화면마다 다르게 표현됨 | 중간/높음 | badge 이름·색·전이 불일치 | 용어집과 상태표를 단일 기준으로 사용 |
| `RSK-04` | LOT 추적 쿼리와 UI가 과도하게 복잡해짐 | 중간/중간 | 전체 그래프 일괄 로드 | 단계별 조회, 목록 대안, 성능 fixture |
| `RSK-05` | 재고 동시성 결함으로 가용량이 음수가 됨 | 중간/높음 | 클라이언트 검증만 존재 | transaction·lock 전략과 동시성 테스트 |
| `RSK-06` | 감사로그가 민감정보 저장소가 됨 | 낮음/높음 | 요청 본문 전체를 무차별 저장 | 허용 필드, redaction, 로그 목적 분리 |
| `RSK-07` | 특정 기업·제품을 연상시키는 자료가 포함됨 | 낮음/높음 | 실제 명칭·수치·화면 유사성 | 가상 데이터 검사와 PR 체크리스트 |
| `RSK-08` | 디자인 완성도를 이유로 구현이 지연됨 | 중간/중간 | 모든 화면의 고해상도 시안 작업 | 핵심 wireframe·상태 계약 이후 구현 병행 |
| `RSK-09` | 14개 PR의 순차 의존성으로 v1.0 일정이 무너짐 | 높음/높음 | 선행 PR 지연이 후속 기능을 연쇄 차단 | 수직 slice 축소, 문서·기반 병렬 검토, 절단 순서 즉시 적용, milestone 재산정 |

## 17. 이번 리뷰에서 결정할 사항

1차 크로스검토에서 다음 방향을 판정했다. 장기간 영향을 주는 선택은 구현 전 ADR로 기록한다.

| ID | 판정 | 채택안 | 조건·후속 근거 | 기록 위치 |
|---|---|---|---|---|
| `DEC-01` | 승인 | NestJS | 모듈 경계·validation·OpenAPI 규율 활용 | ADR |
| `DEC-02` | 승인 | Tailwind CSS + Radix UI | 고밀도 표·폼·접근성 foundation을 Figma와 동기화 | ADR 또는 디자인 문서 |
| `DEC-03` | 승인 | OpenAPI 생성 타입 | transport 타입을 domain model로 직접 사용하지 않음 | ADR |
| `DEC-04` | 조건부 승인 | same-origin HttpOnly cookie 세션 | `Secure`·`SameSite`, unsafe method Origin 검증, CSRF token과 CORS 정책 확정 | ADR |
| `DEC-05` | 승인 | 단계별 tree + 동등한 table | graph는 후순위이며 table 접근성과 대량 조회 경계를 먼저 검증 | Figma 검증 |
| `DEC-06` | 승인 | 진행 상태·품질 disposition·수량을 분리 | 생산 LOT뿐 아니라 자재 LOT에도 같은 원칙 적용 | 도메인 문서 + ADR |
| `DEC-07` | 조건부 승인 | Docker 기반 단일 배포 단위 | 실제 hosting 제약을 확인하는 짧은 배포 Spike 필요 | 배포 Spike |

### 17.1 1차 크로스검토 필수 조건 반영표

| 조건 | 반영 결과 | 위치 |
|---|---|---|
| 분할·합류·일련번호 계보 모델 | `TraceNode`, `LotRelation`, `FinishedUnit`, 관계 유형·불변조건 추가 | 9.2, 10 |
| 예약과 실제 투입 분리 | 공정 시작 transaction과 Issue 소유권 명시 | `FLOW-01`, 9.2, 11.4, 11.5, 14 |
| 자재 LOT 수량·품질 상태 분리 | 수량식, disposition, 물류 생명주기와 격리 계산식 추가 | 9.1 |
| 검사규격 revision·사후 부적합 사건 | snapshot 규칙과 `QualityIncident` 추가 | `FLOW-01`, 9, 10 |
| 핵심 흐름 방향·완료 주체 정정 | downstream/upstream 용어, 생산 LOT와 작업지시 완료 조건 분리 | `FLOW-01`, 7, 9 |
| 7개 화면을 업무영역·화면군으로 세분화 | `SCR-01A`~`SCR-07B` 하위 ID 추가 | 6, 7, 12 |

## 18. 분야별 크로스검토 체크리스트

### 18.1 제품·업무 검토

- [ ] 핵심 사용자가 풀려는 질문이 명확하고 역할 간 책임이 충돌하지 않는다.
- [ ] `FLOW-01`이 제조 업무의 시작과 종료를 설명한다.
- [ ] `FLOW-02`가 단순 CRUD가 아닌 업무 통제를 증명한다.
- [ ] MVP와 비범위, 절단 순서가 실제 일정 의사결정에 충분하다.
- [ ] 도메인 가정을 제조업 전체의 사실처럼 과장하지 않는다.

### 18.2 UX·프론트엔드 검토

- [ ] 사용자가 각 화면에서 첫 행동과 차단 원인을 빠르게 찾을 수 있다.
- [ ] `SCR-01`~`SCR-07` 업무영역과 하위 화면 ID 사이의 이동이 불필요하게 왕복하지 않는다.
- [ ] 1280px 열 우선순위와 1024px 현장 화면의 경계가 현실적이다.
- [ ] 정상·로딩·빈 값·오류·권한 없음·충돌 상태가 구현 가능한 계약이다.
- [ ] 색을 제거해도 상태와 위험 행동을 구분할 수 있다.

### 18.3 백엔드·데이터 검토

- [ ] aggregate와 module 경계가 transaction 요구사항과 맞는다.
- [ ] 재고 원장과 LOT 계보의 진실 공급원이 명확하다.
- [ ] `RULE-01`~`RULE-15`를 서버와 DB에서 강제할 수 있다.
- [ ] 예약·실제 투입·계보 edge의 진실 공급원과 transaction 경계가 명확하다.
- [ ] 분할·합류·일련번호 fixture를 현재 엔터티와 관계로 표현할 수 있다.
- [ ] idempotency와 optimistic concurrency의 적용 범위가 과하거나 부족하지 않다.
- [ ] 정정·취소 모델이 확정 이력의 추적성을 보존한다.

### 18.4 보안·품질 검토

- [ ] UI와 API의 권한 정책이 일치한다.
- [ ] 감사이력, 운영 로그와 사용자 오류 응답의 목적이 분리되어 있다.
- [ ] 실제 기업 데이터, 비밀정보와 불필요한 개인정보가 들어갈 경로가 차단된다.
- [ ] 핵심 실패·동시성 시나리오가 자동 테스트 가능한 형태다.
- [ ] seed/reset이 재현 가능하고 운영 환경의 파괴적 동작으로 이어지지 않는다.

### 18.5 포트폴리오 검토

- [ ] 5분 안에 문제, 설계 판단, 정상 흐름과 의도된 실패를 설명할 수 있다.
- [ ] 프론트엔드 완성도와 백엔드 정합성이 한 수직 흐름에서 함께 드러난다.
- [ ] 과도한 인프라보다 업무 해석과 검증 근거가 돋보인다.
- [ ] Issue, ADR, PR과 테스트가 최종 화면의 결정 근거로 연결된다.
- [ ] 특정 기업의 내부 시스템을 안다고 오해받을 표현이 없다.

## 19. 리뷰 결과 기록

아래 형식은 PR review 또는 후속 comment에 복사해 사용한다.

```text
검토 분야:
검토자 / 날짜:
판정: 승인 | 조건부 승인 | 재설계

확인한 강점:
-

차단 이슈:
- [문서 ID] 문제 / 근거 / 제안 수정

비차단 제안:
- [문서 ID] 제안 / 기대 효과

결정 항목:
- DEC-__: 제안안 승인 | 대안 선택 | 추가 Spike 필요

재검증할 Acceptance criteria:
-
```

## 20. 리뷰 완료 조건

- `ASM-01`~`ASM-07`의 반례 또는 수용 여부가 확인됐다.
- `RULE-01`~`RULE-15`에 누락된 핵심 불변조건이 없다.
- `SCR-01`~`SCR-07` 업무영역과 하위 화면 ID, `FLOW-01`의 이동이 모순되지 않는다.
- `DEC-01`~`DEC-07`이 승인, 대안 선택 또는 별도 Spike로 분리됐다.
- 분야별 차단 이슈가 해소됐거나 담당 Issue와 완료 기준을 가진다.
- Figma wireframe 제작에 필요한 화면 ID, 상태와 데이터 요구사항이 충분하다.

이 문서가 승인되어도 Issue #8이 자동으로 완료되는 것은 아니다. Figma IA·wireframe·상태표를 만들고 1440px, 1280px와 현장 1024px 기준의 walkthrough를 통과해야 Issue #8을 닫는다.
