# 문서 길잡이

모든 문서를 순서대로 읽을 필요는 없습니다. 아래에서 **지금 하려는 일**을 고른 뒤, 필요한 문서만 열어 보세요.

이 프로젝트는 가상 제조 데이터를 사용하는 MES 포트폴리오입니다. 문서가 있다는 사실을 실제 운영·고객 성과·기능 구현 완료의 근거로 사용하지 않습니다.

## 지금 필요한 문서

| 하려는 일 | 먼저 열 문서 |
| --- | --- |
| 화면에서 무엇부터 볼지 알고 싶다 | [MES 업무 안내](product/operations-guide.md) |
| No·정렬·조회·페이지네이션 규칙을 찾는다 | [목록 화면 규칙](engineering/frontend-table-rules.md) |
| 폰트·색상·간격·컴포넌트 기준을 찾는다 | [디자인 시스템](engineering/frontend-design-system.md) |
| 코드·API·DB 문서의 위치를 찾는다 | [개발 문서 지도](engineering/README.md) |
| 이어서 작업할 내용과 변경 근거를 찾는다 | [인수인계 요약·변경 기록](engineering/handoff-design-overhaul-2026-09-05.md) |
| 실행하거나 시연·검증하고 싶다 | [로컬 실행](engineering/local-operations.md) · [검증과 5분 시연](engineering/testing-and-demo.md) |

## 내 역할에 맞는 읽는 순서

### 업무·서류 담당자

1. [업무 안내](product/operations-guide.md)에서 역할·용어·기록 확인 순서를 읽습니다.
2. [목록 화면 규칙](engineering/frontend-table-rules.md)으로 번호·수량·상태·페이지를 대조합니다.
3. 더 필요한 경우에만 [화면·권한 계약](product/route-contract.md)을 확인합니다. 설계 계약과 실제 조회 권한은 구분합니다.

화면 안내는 저장·발행·판정을 대신 실행하지 않습니다. 실제 업무 화면은 로그인한 역할의 권한만 제공합니다.

### 개발·포트폴리오 검토자

1. [프로젝트 소개](../README.md)와 [5분 시연](engineering/testing-and-demo.md)으로 문제와 확인 범위를 이해합니다.
2. [개발 문서 지도](engineering/README.md)에서 화면·API·DB 중 검토할 영역을 고릅니다.
3. 해당 코드와 테스트를 확인한 뒤 [기술 결정](adr/0003-full-stack-foundation.md)과 [포트폴리오 기준](../PRODUCT.md)을 대조합니다.

### 다음 작업 담당자

1. [인수인계 요약](engineering/handoff-design-overhaul-2026-09-05.md)의 다음 작업·주의사항을 읽습니다.
2. 수정할 영역의 현재 기준을 [개발 문서 지도](engineering/README.md)에서 찾습니다.
3. [개발 절차](engineering/workflow.md)와 [검증 방법](engineering/testing-and-demo.md)에 따라 범위를 정합니다.

## 폴더 지도

```text
sensor-manufacturing-mes/
├─ README.md                 프로젝트 소개·실행
├─ PRODUCT.md                제품·포트폴리오 원칙
├─ CONTRIBUTING.md           기여 절차
└─ docs/
   ├─ README.md              이 문서: 전체 길잡이
   ├─ catalog.json           웹·저장소가 공유하는 문서 목록
   ├─ product/               업무 안내·제품·화면·권한 설계
   ├─ domain/                제조 용어·상태·수량·계보 계약
   ├─ engineering/
   │  ├─ README.md           개발 문서 지도
   │  ├─ frontend-*.md       화면·디자인·상태·요청 규칙
   │  ├─ backend-*.md        API 서버 구조
   │  ├─ api-reference.md    실제 HTTP 경로 탐색
   │  ├─ database-*.md       실제 DB 모델과 관계
   │  └─ handoff-*.md        작성 시점의 인수인계·검증 기록
   └─ adr/                   기술 결정의 배경·대안·상태
```

파일명은 링크 호환을 위해 유지합니다. engineering 폴더의 전체 역할 구분은 [개발 문서 지도](engineering/README.md)에서 확인하세요.

## 현재 기준과 과거 기록을 구분하기

| 표시 | 읽을 때 주의할 점 |
| --- | --- |
| 현재 | 현재 코드·업무 설명을 위한 기준입니다. 사용자 승인·운영 검증 완료를 뜻하지 않습니다. |
| 설계 | 목표·계약입니다. 구현 여부는 코드·API·검증 결과와 대조합니다. |
| 결정 | 선택의 배경과 대안입니다. 제안·승인 상태는 해당 ADR 본문에서 확인합니다. |
| 기록·과거 | 작성 당시 변경·검증 결과입니다. 예전 PID·PR 상태·테스트 개수를 현재 상태로 읽지 않습니다. |
| 참고·양식 | 근거 자료 또는 작성 도구입니다. 현재 제품 동작을 정의하지 않습니다. |

같은 항목의 설명이 다르면 먼저 현재 기준과 코드를 대조하고, 변경 기록은 이유를 확인하는 데 사용합니다. 오래된 문서에 적힌 DB 초기화·서버 종료·머지 명령을 그대로 실행하지 않습니다.

## 전체 문서 목록

목록 메타데이터는 [catalog.json](catalog.json)이 소유합니다. 웹의 **업무 가이드 → 전체 문서**에서는 분류·문서 상태·제목·설명·경로로 찾을 수 있습니다. 본문 전체 검색은 아닙니다.

### 시작 안내

| 문서 | 상태 | 무엇을 읽는가 |
| --- | --- | --- |
| [문서 길잡이](README.md) | 현재 | 목적별 바로가기, 역할별 읽는 순서와 전체 폴더 지도. |
| [프로젝트 소개·실행](../README.md) | 현재 | 프로젝트 목적, 기술 구성, 실행 방법과 공개 범위. |
| [MES 업무 안내](product/operations-guide.md) | 현재 | 메뉴별 확인사항, 용어, 역할별 시작점과 기록 확인 체크리스트. |
| [검증 방법과 5분 시연](engineering/testing-and-demo.md) | 현재 | 실제 기록을 읽는 시연 순서, 테스트 종류와 검증 범위의 한계. |

### 제품·업무

| 문서 | 상태 | 무엇을 읽는가 |
| --- | --- | --- |
| [제품 원칙·포트폴리오 기준](../PRODUCT.md) | 현재 | 대상 사용자, 문제, 가상 데이터와 구현·검증을 설명하는 원칙. |
| [제품 비전](product/vision.md) | 설계 | 왜 이 MES를 만드는지, 목표 사용자와 제품 방향. |
| [제품·UX·기술 기획](product/product-plan-cross-review.md) | 설계 | 목표 기능과 단계별 기획. 전체 구현 완료 목록은 아닙니다. |
| [화면 배치·상태 계약](product/ui-layout-contracts.md) | 설계 | 정보구조와 초기 화면 설계. 최신 시각 기준은 디자인 시스템을 확인합니다. |
| [URL·역할·권한 계약](product/route-contract.md) | 설계 | 경로·조회조건·역할의 설계 계약. 실제 API 경로와 구분해서 읽습니다. |

### 도메인

| 문서 | 상태 | 무엇을 읽는가 |
| --- | --- | --- |
| [제조 도메인 계약](domain/manufacturing-domain-contract.md) | 설계 | LOT·수량·상태 전이·계보의 목표 업무 의미와 불변조건. |
| [제조 도메인 공개 근거](domain/source-review.md) | 참고 | 참고한 공개 자료, 프로젝트 가정과 적용 한계. |

### 디자인

| 문서 | 상태 | 무엇을 읽는가 |
| --- | --- | --- |
| [목록 화면·테이블 규칙](engineering/frontend-table-rules.md) | 현재 | No 역순·가운데 정렬·조회/초기화·기본 10건·표시 건수 선택. |
| [프런트엔드 디자인 시스템](engineering/frontend-design-system.md) | 현재 | 토큰·최소 14px·간격·공통 컴포넌트·반응형. 시각 디자인은 검토 중입니다. |
| [디자인 참고 후보](product/design-reference-candidates.md) | 참고 | 참고 자료와 선택 맥락. 현재 구현 기준을 대신하지 않습니다. |

### 개발

| 문서 | 상태 | 무엇을 읽는가 |
| --- | --- | --- |
| [개발 문서 지도](engineering/README.md) | 현재 | 화면·API·DB·실행·검증·인수인계 문서를 관심 영역별로 찾습니다. |
| [프런트엔드 구조 계약](engineering/frontend-architecture.md) | 현재 | FSD 폴더·import 경계, URL·서버·입력 상태의 책임. |
| [API 요청·중복 방지 규칙](engineering/frontend-api-request-rules.md) | 현재 | 진행 중 GET 공유, 취소·재조회·로그인 경계. API 명세와는 다릅니다. |
| [백엔드 구조와 구현 범위](engineering/backend-architecture.md) | 현재 | Nest 모듈·가드·Controller·Service·Prisma와 실제 구현 한계. |
| [API 경로와 계약 읽기](engineering/api-reference.md) | 현재 | 현재 HTTP 경로·권한 목록과 입력·응답·오류를 확인할 원문. |
| [데이터베이스 구조 읽기](engineering/database-overview.md) | 현재 | 실제 Prisma 모델·관계·수량·제약과 목표 도메인과의 차이. |
| [로컬 실행과 운영 준비](engineering/local-operations.md) | 현재 | 5173/3000/5432, 서버 중복·오류 확인 순서, 운영 전 남은 과제. |
| [개발 절차·포트폴리오 검토](engineering/workflow.md) | 현재 | Issue·PR·검증·완료 기준과 변경마다 따질 포트폴리오 적합성. |
| [기여 방법](../CONTRIBUTING.md) | 현재 | 변경을 제안하고 검증·리뷰하는 짧은 안내. |
| [외부 코드·라이선스 고지](../THIRD_PARTY_NOTICES.md) | 참고 | 이식한 외부 코드의 출처와 라이선스. |

### 기술 결정

| 문서 | 상태 | 무엇을 읽는가 |
| --- | --- | --- |
| [ADR 0001 · 개발 방식](adr/0001-trunk-based-development.md) | 결정 | 짧은 브랜치와 trunk 기반 개발 방식을 선택한 이유. |
| [ADR 0002 · 제조 도메인](adr/0002-manufacturing-domain-model.md) | 결정 | 제조 업무 모델을 선택한 배경과 경계. |
| [ADR 0003 · 기술 기반](adr/0003-full-stack-foundation.md) | 결정 | 웹·API·DB 기술 선택과 대안. |
| [ADR 0004 · 화면 구조·라우팅](adr/0004-frontend-architecture-and-routing.md) | 결정 | 프런트 구조와 URL·라우팅 책임을 나눈 이유. |
| [ADR 0005 · 디자인 시스템](adr/0005-code-owned-design-system.md) | 결정 | 코드 기반 토큰·공통 컴포넌트를 기준으로 삼은 이유. |
| [ADR 0006 · 인증 세션](adr/0006-same-origin-cookie-session.md) | 결정 | same-origin cookie 세션과 권한 검증의 선택 배경. |
| [ADR 작성 양식](adr/0000-template.md) | 양식 | 문제·대안·결정·검증·재검토 조건을 기록하는 양식. |

### 변경 이력

| 문서 | 상태 | 무엇을 읽는가 |
| --- | --- | --- |
| [이전 디자인 이력](engineering/frontend-design-history.md) | 과거 | 이전 디자인 판단과 측정 기록. 현재 기준과 구분합니다. |
| [초기 디자인 인수인계](engineering/handoff-2026-09-05.md) | 과거 | 작성 시점의 PR·커밋·진행 기록. 현재 실행 상태를 보장하지 않습니다. |
| [인수인계 요약·변경 기록](engineering/handoff-design-overhaul-2026-09-05.md) | 기록 | 짧은 인수인계 요약과 다음 작업, 날짜·주제별 변경·검증 기록. |
