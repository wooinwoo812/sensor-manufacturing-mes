# MES 디자인 레퍼런스 후보군

> 센서 제조 MES의 실제 업무 화면을 설계하기 위한 기준 후보 20개와 추가 조사 후보 순위

| 항목 | 내용 |
|---|---|
| 문서 상태 | `Candidate review v1.1` |
| 기준일 | 2026-09-01 |
| 관련 Issue | [#25 MES 화면 레퍼런스 후보군을 검토한다](https://github.com/wooinwoo/sensor-manufacturing-mes/issues/25) |
| 상위 계약 | [제품 비전](vision.md), [UI 레이아웃·상태 계약](ui-layout-contracts.md) |

## 1. 조사 기준

이 제품은 마케팅용 SaaS 대시보드가 아니라 생산계획·현장 실행·자재·품질 담당자가 반복 업무를 수행하는 `Operate` 모드의 제품이다. 후보는 다음 기준으로 골랐다.

1. 작업지시, 공정 실행, 검사, 상태 차단 또는 LOT 추적 중 하나에 직접 적용할 수 있다.
2. 1440px 관리 화면의 정보 밀도 또는 1024px 현장 화면의 행동 집중을 설명한다.
3. 정상 화면뿐 아니라 차단·보류·불합격·격리처럼 행동을 바꾸는 상태를 표현할 수 있다.
4. React 구현으로 옮길 수 있는 구조적 근거가 있다.
5. 특정 회사의 로고, 내부 데이터, 고유 UI를 그대로 복제하지 않고 패턴만 일반화할 수 있다.

후보에 포함됐다는 이유만으로 라이브러리나 디자인 시스템을 설치하지 않는다. 외부 screenshot도 저장소에 복제하지 않고 원문 링크와 적용 판단만 기록한다.

## 2. 제품 시각 가설

1차 가설은 **정밀 작업대(Precision Workbench)**다.

- 전역 navigation은 짙은 navy, 실제 업무영역은 밝은 neutral surface를 사용한다.
- primary는 blue-cyan 계열 하나만 사용하고 green·amber·red는 의미가 있는 상태에만 쓴다.
- 표와 key-value가 기본 정보 표현이며 chart는 추세·분포·계보처럼 표보다 관계를 빨리 보여줄 때만 사용한다.
- 4~6px radius, 1px border, 거의 없는 shadow로 장식보다 경계와 정렬을 우선한다.
- 1440px 관리 화면은 table-first, 1024px 공정 실행은 한 대상과 한 대표 행동에 집중한다.
- motion은 제출·갱신·상태 전이의 결과를 설명하는 150~250ms feedback만 사용한다.

Full dark, neon, HUD, glassmorphism, 큰 gradient, 의미 없는 실시간 pulse와 KPI 카드 벽은 제외한다. Dark theme는 장시간 모니터링 수요가 검증된 뒤 별도로 비교한다.

## 3. 기준 후보 20개

우선순위는 `P1`이 1차 시안에 직접 사용, `P2`가 특정 화면에 선택 사용, `P3`가 비교·검증용이다.

### REF-01 Siemens Industrial Experience Starter App

- 원문: [Siemens iX Starter apps](https://ix.siemens.io/docs/home/getting-started/starter-app)
- 우선순위·대상: `P1` · 전역 AppShell, `SCR-01A`, `SCR-05B`
- 참고: 산업용 제품에 맞는 얇은 navigation rail, 명확한 content header, form·chart·grid의 일관된 밀도와 light/dark 대비를 가져온다.
- 제외: Siemens logo·색상·component 외형을 복제하지 않는다. starter의 넓은 빈 공간과 full dark 기본 화면도 그대로 사용하지 않는다.

### REF-02 SAP Fiori Analytical List Page

- 원문: [Analytical List Page](https://experience.sap.com/fiori-design-web/v1-50/analytical-list-page/)
- 우선순위·대상: `P1` · `SCR-01A`, `SCR-02A`, `SCR-05A`
- 참고: 접을 수 있는 filter header, chart/table 전환, 집계에서 거래 행으로 내려가는 drill-down을 작업지시·검사 대기열에 적용한다.
- 제외: 모든 목록에 chart를 붙이지 않는다. 운영 dashboard의 chart가 실제 예외 행으로 연결되지 않으면 제거한다.

### REF-03 SAP Fiori Object Page

- 원문: [Object Page](https://experience.sap.com/fiori-design-web/v1-50/object-page/)
- 우선순위·대상: `P1` · `SCR-02C`, `SCR-03C`
- 참고: business object를 식별하는 고정 header, 상태와 대표 행동, section/tab 구조를 작업지시·자재 LOT 상세에 적용한다.
- 제외: 생산 진행·검사 판정·품질 disposition을 하나의 종합 badge로 합치지 않는다. 긴 상세를 무조건 한 페이지에 펼치지 않는다.

### REF-04 SAP Fiori Flexible Column Layout

- 원문: [Flexible Column Layout](https://experience.sap.com/fiori-design-web/flexible-column-layout-web-component/)
- 우선순위·대상: `P2` · `SCR-02A`↔`SCR-02C`, `SCR-05A`↔`SCR-05B`, `SCR-06B`
- 참고: 목록 문맥을 유지한 채 상세와 추가 근거를 2~3열로 여는 구조를 검사 queue와 LOT 계보에 적용한다.
- 제외: 모든 상세를 split view로 만들지 않는다. 1024px 현장 실행에서는 한 화면에 현재 작업만 보인다.

### REF-05 Carbon Data Table

- 원문: [Carbon Data Table usage](https://carbondesignsystem.com/components/data-table/usage/)
- 우선순위·대상: `P1` · `SCR-02A`, `SCR-03B`, `SCR-05A`, `SCR-07A`
- 참고: search·설정 toolbar, sortable header, expandable row, selection·batch action, row 높이와 pagination 결합 원칙을 가져온다.
- 제외: 표를 작은 card 안에 중첩하지 않는다. 핵심 식별자와 차단 근거를 말줄임으로 숨기지 않는다.

### REF-06 Carbon Status Indicators

- 원문: [Carbon Status Indicators](https://preview.carbondesignsystem.com/building-blocks/core/patterns/status-indicators)
- 우선순위·대상: `P1` · `SCR-01`~`SCR-07` 업무영역의 상태·우선순위·차단 표현
- 참고: 색·모양·symbol·text를 함께 사용하고, 즉시 행동이 필요한 상태만 높은 주목도로 표현한다.
- 제외: 모든 정상값에 badge를 붙이지 않는다. 생산 진행, 검사 결과, 품질 disposition, 위험도를 같은 색 체계로 섞지 않는다.

### REF-07 TypeUI Top Navbar Sidebar Application Shell

- 원문: [TypeUI Application Shells](https://www.typeui.sh/prompts/shells)
- 우선순위·대상: `P1` · `SCR-01`~`SCR-07` 업무영역의 전역 AppShell
- 참고: `Top Navbar Sidebar Application Shell`의 전역 검색·역할·사용자 영역과 업무영역 sidebar 구성을 1차 skeleton에 사용한다.
- 제외: dashboard card 자리를 먼저 채우지 않는다. sidebar label을 icon-only로 축소하지 않는다.

### REF-08 Odoo Shop Floor Overview

- 원문: [Odoo Shop Floor overview](https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp/manufacturing/shop_floor/shop_floor_overview.html)
- 우선순위·대상: `P1` · `SCR-04A`, `SCR-04B`
- 참고: work center별 queue, 현재 operator, 작업 카드 안의 단계·수량·시작/완료 행동처럼 현장 맥락을 한 화면에 모은다.
- 제외: 관리 화면까지 큰 card grid로 만들지 않는다. 작은 icon-only 검사 행동과 제품 특유의 보라색 branding은 가져오지 않는다.

### REF-09 Odoo Manufacturing Quality Checks

- 원문: [Odoo Quality Checks](https://www.odoo.com/documentation/17.0/applications/inventory_and_mrp/quality/quality_management/quality_checks.html)
- 우선순위·대상: `P2` · `SCR-05A`, `SCR-05B`
- 참고: 공정 단계 안에서 검사 요구를 열고 pass/fail 또는 측정값을 확정하는 연결 방식을 참고한다.
- 제외: 허용범위, 적용 규격 revision과 필수값 누락을 작은 modal 안에 숨기지 않는다. 검사 `PASS`가 품질 `ACCEPTED`를 자동 수행하지 않는다.

### REF-10 SAP Digital Manufacturing Production Operator Dashboard

- 원문: [Production Operator Dashboard](https://help.sap.com/docs/sap-digital-manufacturing/execution/production-operator-dashboard-pod)
- 우선순위·대상: `P2` · `SCR-04B`, `SCR-05B`
- 참고: 작업 시작·완료, component 조립, data collection, nonconformance를 하나의 operator workspace에 모으는 모듈 구조를 참고한다.
- 제외: plugin을 사용자가 자유 배치하는 범용 builder는 만들지 않는다. 한 화면에 모든 생산 기능을 동시에 노출하지 않는다.

### REF-11 Ostendo Order Process Traveler

- 원문: [Order Process Traveler](https://ostendo.info/Screenshot-OrderTraveler.html)
- 우선순위·대상: `P2` · `SCR-04B`
- 참고: 좌측 공정 step rail, 현재 단계 강조, 작업 instruction과 확인 checkpoint를 조합해 이전 공정 차단을 눈으로 이해하게 한다.
- 제외: 고객·주문 같은 ERP 보조정보로 작업자 화면을 채우지 않는다. 완료 공정을 단순 회색 처리만 하지 않고 text·icon을 함께 쓴다.

### REF-12 Manufacturo Manufacturing Traceability

- 원문: [Manufacturo Traceability](https://manufacturo.com/manufacturo-manufacturing-management-software/manufacturing-traceability/)
- 우선순위·대상: `P1` · `SCR-05C`, `SCR-06B`
- 참고: 왼쪽 component genealogy와 오른쪽 선택 node 상세·품질·소비·생산·history 패널 조합을 대표 LOT 계보 화면의 핵심으로 사용한다.
- 제외: 제품별 icon과 약어를 그대로 복제하지 않는다. graph만 제공하지 않고 같은 관계의 table view를 반드시 둔다.

### REF-13 ITI Track & Trace Genealogy Diagram

- 원문: [ITI Track & Trace](https://www.itigroup.com/solutions/digital-operations/manufacturing-execution-systems-mes/track-trace/)
- 우선순위·대상: `P2` · `SCR-06A`, `SCR-06B`
- 참고: 검색 조건, 중심 genealogy, 선택 LOT 상세를 한 canvas에 배치하고 upstream/downstream 방향을 공간적으로 구분한다.
- 제외: 수십 개 node를 첫 화면에 모두 펼치지 않는다. node 색만으로 자재·생산 LOT·완제품과 품질 상태를 구분하지 않는다.

### REF-14 DELMIA Apriso Serial Genealogy

- 원문: [DELMIA Apriso MES](https://enterprise.trimech.com/delmia-apriso/)
- 우선순위·대상: `P2` · `SCR-06B`, `SCR-07A`
- 참고: serial tree와 operation·수량·시각 table을 함께 제공하는 구조로 그래프 관계와 감사 가능한 사건을 연결한다.
- 제외: legacy desktop chrome과 고정폭 tree를 재현하지 않는다. LOT 계보와 감사로그의 원천 데이터를 서로 중복 저장하지 않는다.

### REF-15 Bluemingo MES Quality and Genealogy

- 원문: [Bluemingo Manufacturing Execution System](https://bluemingotech.com/products-and-services/modern-factory/manufacturing-execution-system)
- 우선순위·대상: `P3` · `SCR-01A`, `SCR-05C`, `SCR-06B`
- 참고: execution, quality, genealogy를 분리된 메뉴가 아닌 연결된 조사 흐름으로 보여주는 제품 구성을 비교한다.
- 제외: PLC·실시간 설비제어·MRP·예측 기능은 현재 범위에 넣지 않는다. 제품 소개용 dashboard 이미지를 UX 근거로 단독 사용하지 않는다.

### REF-16 Softr Quality Control Inspection App

- 원문: [Quality Control Inspection App](https://www.softr.io/create/quality-control-inspection-app)
- 우선순위·대상: `P3` · `SCR-05A`, `SCR-05B`
- 참고: 검사 대기 작업, checklist, defect trend와 evidence를 품질 담당자의 한 업무 묶음으로 구성하는 방식을 비교한다.
- 제외: no-code 특유의 큰 card와 mobile-first 구성을 관리 화면에 복제하지 않는다. AI 분석·Slack 알림은 현재 제품에 추가하지 않는다.

### REF-17 TypeUI Filterable and Expandable Tables

- 원문: [TypeUI Tables](https://www.typeui.sh/prompts/tables)
- 우선순위·대상: `P1` · `SCR-02A`, `SCR-03B`, `SCR-03D`, `SCR-05A`
- 참고: `Filterable Management Data Table`, `Expandable Detail Data Table`, `Item Workflow Data Table` 프롬프트를 후보 layout 생성에 사용한다.
- 제외: commerce용 rating·thumbnail·row menu는 제거한다. 후보의 가상 column을 그대로 두지 않고 MES 식별자·수량·차단 근거로 교체한다.

### REF-18 TypeUI Status, Metric and Timeline Widgets

- 원문: [TypeUI Widgets](https://www.typeui.sh/prompts/widgets)
- 우선순위·대상: `P2` · `SCR-01A`, `SCR-02C`, `SCR-07A`
- 참고: `Multi-Metric Overview`, `List Widget With Status Indicators`, `Timeline Widget`을 dashboard 예외 목록과 변경이력의 밀도 비교에 사용한다.
- 제외: donut·gauge·ring을 KPI마다 만들지 않는다. KPI는 행동 가능한 예외 목록이나 근거 상세로 이동해야 한다.

### REF-19 21st.dev Dashboard and Data Table Catalog

- 원문: [Dashboard components](https://21st.dev/community/components/s/dashboard), [React DataTables](https://21st.dev/community/components/explore/datatables-react)
- 우선순위·대상: `P3` · `SCR-01A`, `SCR-02A`, `SCR-07A`
- 참고: 실제 React/Tailwind 구현의 sidebar·data grid·incident report 후보를 빠르게 비교하고, 필요한 구조만 현재 React stack에 옮길 때 참고한다.
- 제외: component registry를 설치하거나 화면을 조립식 card 모음으로 만들지 않는다. animation·crypto·financial visual은 제외한다.

### REF-20 Design Prompts Professional and Flat Design

- 원문: [Design Prompts](https://www.designprompts.dev/)
- 우선순위·대상: `P2` · `SCR-01`~`SCR-07` 업무영역의 전역 시각 언어
- 참고: 같은 content를 `Professional Light`, `Flat Design Light`, `Swiss Minimalist`로 비교해 typography·border·spacing 차이를 검증한다.
- 제외: `Cyberpunk`, `Terminal`, `Glassmorphism`, `Luxury`, `Web3`는 MES 신뢰성과 반복 작업 효율을 떨어뜨리므로 시안 후보에서 제외한다.

## 4. 추가 조사 후보 순위

기준 후보 20개는 유지한다. 아래 10개는 추가 조사에서 찾은 후보를 센서 제조 업무 적합도, 공개 화면의 구체성, 구조적 재사용성 순으로 정렬한 비교 목록이다. 이 순위는 제품이나 UI library의 설치 순서가 아니다.

| 순위 | 추가 후보 | 우선순위·대상 | 추가 판단 |
|---:|---|---|---|
| 1 | `ADD-01` [Siemens Opcenter Execution Electronics 2510](https://blogs.sw.siemens.com/opcenter/whats-new-in-opcenter-execution-electronics-2510/) | `P1` · `SCR-03B`, `SCR-03D`, `SCR-04B`, `SCR-05C`, `SCR-06A` | 전자 제조의 material queue, HOLD·해제, defect, carrier·serial 실제 화면이 센서 제조 흐름과 가장 직접적으로 맞는다. |
| 2 | `ADD-02` [Microsoft Dynamics 365 Production Floor Execution](https://learn.microsoft.com/en-us/dynamics365/supply-chain/production-control/production-floor-execution-use) | `P1` · `SCR-04A`, `SCR-04B` | touch·고대비 환경에서 작업 목록, 선택 상세, 수량 numpad와 대표 행동을 한 작업공간에 묶는다. Full dark 외형과 과도한 부가기능은 복제하지 않는다. |
| 3 | `ADD-03` [Oracle Redwood Product Genealogy](https://docs.oracle.com/en/cloud/saas/readiness/scm/26a/mfg26a/26A-mfg-wn-f42315.htm) | `P1` · `SCR-06B`, `SCR-07A` | `Composition`, `Where Used`, `Transaction History`를 분리해 양방향 추적과 사건 근거를 table-first로 읽게 한다. Graph는 보조 보기로 비교한다. |
| 4 | `ADD-04` [MPDV HYDRA X Operator Inspection](https://us.mpdv.com/industry-4-0/smart-factory-glossary/operator-inspection) | `P1` · `SCR-05B` | 검사 step과 현재 측정값, 허용범위, 단위, 측정도구를 함께 보여주는 실제 operator 검사 구조다. |
| 5 | `ADD-05` [Siemens HMI Template Suite](https://cache.industry.siemens.com/dl/files/767/91174767/att_1096385/v1/91174767_HMITemplateSuite_V16_DOC_V3_en.pdf) | `P1` · 전역 시각 언어, `SCR-04B`, `SCR-05B` | 밝은 작업영역, 회색 navigation·status 영역, 제한된 accent·상태색과 최소 40px touch target이 정밀 작업대 가설을 뒷받침한다. |
| 6 | `ADD-06` [Siemens Opcenter Execution Discrete 2501](https://blogs.sw.siemens.com/opcenter/whats-new-in-opcenter-execution-discrete-2501/) | `P2` · `SCR-02C`, `SCR-05B`, `SCR-06B` | quality execution과 work-order dependency network를 같은 제품 문맥에서 비교할 수 있다. SPC 자체는 현재 범위에 추가하지 않는다. |
| 7 | `ADD-07` [PatternFly Usage and Behavior](https://www.patternfly.org/design-foundations/usage-and-behavior/) | `P2` · `SCR-02A`↔`SCR-02C`, `SCR-05A`↔`SCR-05B`, `SCR-06B` | expandable row, inline drawer와 drill-down 중 어떤 방식이 목록 문맥과 상세 근거를 함께 보존하는지 판단하는 기준으로 쓴다. |
| 8 | `ADD-08` [Blueprint](https://blueprintjs.com/docs/) | `P2` · 전역 AppShell, `SCR-02A`, `SCR-03B`, `SCR-07A` | 복잡하고 data-dense한 desktop React interface에 최적화된 밀도와 control hierarchy를 비교한다. package 설치 근거로 사용하지 않는다. |
| 9 | `ADD-09` [Elastic UI Data Grid](https://eui.elastic.co/docs/components/tabular-content/data-grid/) | `P2` · `SCR-02A`, `SCR-03B`, `SCR-05A`, `SCR-07A` | schema별 column, toolbar, keyboard shortcut, density·column 설정을 검토한다. 핵심 식별자와 차단 사유를 강제 truncation하지 않는다. |
| 10 | `ADD-10` [Critical Manufacturing Mobile Cockpit](https://help.criticalmanufacturing.com/11.3/userguide/industrytemplates/medical/features/mobilecockpit/) | `P3` · `SCR-04B`, `SCR-06A` | scan-driven 흐름에서 check-in, dispatch, track-in/out의 탐색 단계를 줄이는 방식을 비교한다. handheld viewport 자체는 현재 제품 범위가 아니다. |

이 표는 추가 후보의 검토 순서만 정하며 기존 1차 조합을 자동으로 변경하지 않는다.

## 5. 화면별 조합

| 제품 화면 | 1차 조합 | 검증할 질문 |
|---|---|---|
| 전역 AppShell | `REF-01` + `REF-07` + `REF-20` | 역할·전역 검색·현재 위치가 3초 안에 구분되는가? |
| `SCR-01A` 운영 대시보드 | `REF-02` + `REF-18` | 지표에서 지연·차단 작업으로 바로 이동할 수 있는가? |
| `SCR-02A` 작업지시 목록 | `REF-05` + `REF-17` | 핵심 식별자·납기·진척·차단 근거를 가로 스크롤 없이 읽는가? |
| `SCR-02C` 작업지시 상세 | `REF-03` + `REF-04` | 진행·검사·품질 상태를 섞지 않고 다음 행동을 찾는가? |
| `SCR-03B`·`SCR-03D` 자재 | `REF-05` + `REF-17` | on-hand·reserved·available·quality 차이를 오인하지 않는가? |
| `SCR-04A`·`SCR-04B` 공정 실행 | `REF-08` + `REF-10` + `REF-11` | 1024px에서 현재 대상·수량·차단·대표 행동만 남는가? |
| `SCR-05A`·`SCR-05B` 검사 | `REF-09` + `REF-10` + `REF-16` | 규격·측정값·판정·별도 품질 결정을 순서대로 이해하는가? |
| `SCR-05C`·`SCR-06B` 격리·계보 | `REF-12` + `REF-13` + `REF-14` | 원천과 영향 범위, 선택 node 근거를 그래프와 표 양쪽에서 검증하는가? |
| `SCR-07A` 감사이력 | `REF-05` + `REF-14` + `REF-18` | 행위자·시각·사유·전후 값·요청 ID를 한 사건으로 읽는가? |

## 6. 1차 시안에 사용할 후보

첫 시안은 후보 20개의 절충안이 아니다. 다음 8개만 직접 조합한다.

1. `REF-01`: 산업용 AppShell 밀도
2. `REF-02`: filter에서 거래 행으로 이어지는 분석 구조
3. `REF-03`: 작업지시 상세 hierarchy
4. `REF-05`: dense data table 규칙
5. `REF-06`: 상태 의미와 접근성
6. `REF-08`: 1024px 작업자 공정 실행
7. `REF-12`: LOT 계보와 선택 상세
8. `REF-17`: table layout 변형 비교

`REF-20`의 세 스타일은 위 구조가 정해진 뒤 typography·spacing 비교에만 사용한다. 먼저 만들 화면은 AppShell 전체가 아니라 제품의 차별점과 주요 밀도를 동시에 검증할 수 있는 `SCR-06B` LOT 계보와 `SCR-02A` 작업지시 목록 두 장이다.

## 7. 채택 전 검증 게이트

- 1440×900에서 `SCR-02A` 필수 열이 가로 스크롤 없이 보인다.
- 1024×768에서 `SCR-04B` 대상 LOT, 현재 공정, 투입·양품·불량 수량과 완료 행동이 첫 viewport에 보인다.
- `PASS`, `FAIL`, `HOLD`, `PENDING`, `QUARANTINED`를 grayscale에서도 text·shape로 구분한다.
- `SCR-06B`는 graph와 동등한 table/tree 대안을 제공하고 keyboard로 node를 탐색한다.
- loading·empty·error·permission denied·conflict 상태가 정상 화면과 같은 layout 문맥을 유지한다.
- 외부 제품명·logo·실제 식별자·실제 제조 수치가 시안과 seed에 남지 않는다.

이 gate를 통과한 시안만 [UI 레이아웃·상태 계약](ui-layout-contracts.md)의 구현 근거로 승격한다.
