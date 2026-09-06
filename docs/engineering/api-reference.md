# API 경로와 계약 읽기

2026-09-05 현재 Controller의 HTTP 경로를 정리한 탐색 문서다. 자동 생성 OpenAPI 명세나 모든 필드의 완전한 명세를 대신하지 않는다. 요청 필드의 필수 여부·범위와 응답 타입은 연결된 Controller·Service·contract.ts 및 테스트가 근거다.

## 접속과 공통 원칙

- 웹에서는 같은 origin의 /api 경로를 사용한다. 로컬 API 포트는 기본 3000이다.
- 아래 경로에는 /api prefix를 포함했다. :id는 실제 조회 결과의 내부 식별자이며 표시번호나 임의 값을 넣지 않는다.
- GET은 조회다. POST는 세션 또는 업무 상태를 바꾼다. 읽기 시연 중 명령을 실행하지 않는다.
- 실제 업무 권한은 서버가 검사한다. 메뉴가 보이는지만 확인하는 테스트로 대체하지 않는다.
- 웹 목록은 pageSize=10을 명시한다. 서버에 pageSize를 생략했을 때의 기본값과 웹 기본값은 같다고 가정하지 않는다. 예를 들어 현재 작업지시 서버 기본값은 20이다.
- 목록의 정렬 지원은 각 서비스의 parseQuery를 확인한다. 웹의 No 역순·셀 가운데 정렬은 API 행 정렬과 다른 규칙이다.

## 현재 경로 목록

| Method | 경로                                           | 접근·기능                          |
| ------ | ---------------------------------------------- | ---------------------------------- |
| GET    | /api/health                                    | 연결 상태                          |
| POST   | /api/auth/login                                | 가상 계정 로그인, JSON·Origin 확인 |
| GET    | /api/auth/me                                   | 현재 세션                          |
| POST   | /api/auth/logout                               | 세션 종료, CSRF                    |
| GET    | /api/dashboard/summary                         | dashboard:read                     |
| GET    | /api/work-orders                               | work-order:read                    |
| GET    | /api/work-orders/products                      | work-order:read                    |
| GET    | /api/work-orders/:id                           | work-order:read                    |
| POST   | /api/work-orders                               | work-order:create                  |
| POST   | /api/work-orders/:id/release                   | work-order:release                 |
| POST   | /api/work-orders/:id/cancel                    | work-order:cancel                  |
| GET    | /api/materials/boms                            | master-data:read                   |
| GET    | /api/material-lots                             | material-lot:read                  |
| GET    | /api/material-lots/:id                         | material-lot:read                  |
| POST   | /api/material-lots/:id/disposition             | material-lot:decide-quality        |
| GET    | /api/work-orders/:id/material-reservations     | material-allocation:read           |
| POST   | /api/work-orders/:id/material-reservations     | material-allocation:create         |
| POST   | /api/material-allocations/:id/release          | material-allocation:release        |
| GET    | /api/process-executions                        | process-execution:read             |
| GET    | /api/process-executions/steps/:stepId          | process-execution:read             |
| POST   | /api/process-executions/steps/:stepId/start    | process-execution:execute          |
| POST   | /api/process-executions/steps/:stepId/complete | process-execution:execute          |
| GET    | /api/inspections                               | inspection:read                    |
| GET    | /api/inspections/:id                           | inspection:read                    |
| POST   | /api/inspections/:id/verdict                   | inspection:execute                 |
| POST   | /api/inspections/:id/review                    | inspection:correct                 |
| GET    | /api/quality-incidents                         | quality-incident:read              |
| GET    | /api/quality-incidents/:id                     | quality-incident:read              |
| POST   | /api/quality-incidents                         | quality-incident:create            |
| GET    | /api/traceability/nodes                        | trace:read                         |
| GET    | /api/traceability/nodes/:id                    | trace:read                         |
| GET    | /api/audit-events                              | audit-event:read                   |
| GET    | /api/admin/users                               | user:manage · 사용자 조회          |
| GET    | /api/admin/users/roles                         | user:manage · 기존 역할·권한표      |
| GET    | /api/admin/users/:id/access-history             | user:manage · 변경 이력             |
| PATCH  | /api/admin/users/:id/access                     | user:manage · 역할·활성 변경, CSRF  |

## 필드·응답·오류를 확인할 원문

| 업무          | HTTP 진입점                                                                                                                                                                               | 검증·동작 근거                                                                                                                                                                                            |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 인증          | [Controller](../../apps/api/src/auth/auth.controller.ts)                                                                                                                                  | [Service](../../apps/api/src/auth/auth.service.ts), [권한](../../apps/api/src/auth/auth.contract.ts), [테스트](../../apps/api/test/auth.e2e-spec.ts)                                                      |
| 작업지시      | [Controller](../../apps/api/src/work-orders/work-orders.controller.ts)                                                                                                                    | [Service](../../apps/api/src/work-orders/work-orders.service.ts), [응답 계약](../../apps/api/src/work-orders/work-orders.contract.ts), [명령 테스트](../../apps/api/test/work-order-commands.e2e-spec.ts) |
| 자재 LOT      | [Controller](../../apps/api/src/material-lots/material-lots.controller.ts)                                                                                                                | [조회](../../apps/api/src/material-lots/material-lots.service.ts), [처분](../../apps/api/src/material-lots/material-lot-disposition.service.ts)                                                           |
| 예약·해제     | [Controller](../../apps/api/src/material-reservations/material-reservations.controller.ts)                                                                                                | [Service](../../apps/api/src/material-reservations/material-reservations.service.ts), [테스트](../../apps/api/test/material-reservations.e2e-spec.ts)                                                     |
| 공정 실행     | [Controller](../../apps/api/src/process-executions/process-executions.controller.ts)                                                                                                      | [명령](../../apps/api/src/process-executions/process-commands.service.ts), [테스트](../../apps/api/test/process-commands.e2e-spec.ts)                                                                     |
| 검사          | [Controller](../../apps/api/src/inspections/inspections.controller.ts)                                                                                                                    | [판정](../../apps/api/src/inspections/inspection-verdict.service.ts), [테스트](../../apps/api/test/inspection-verdict.e2e-spec.ts)                                                                        |
| 부적합        | [Controller](../../apps/api/src/quality-incidents/quality-incidents.controller.ts)                                                                                                        | [Service](../../apps/api/src/quality-incidents/quality-incidents.service.ts)                                                                                                                              |
| 계보          | [Controller](../../apps/api/src/traceability/traceability.controller.ts)                                                                                                                  | [Service](../../apps/api/src/traceability/traceability.service.ts)                                                                                                                                        |
| 기준정보·관리 | [BOM](../../apps/api/src/boms/boms.controller.ts), [감사](../../apps/api/src/audit-events/audit-events.controller.ts), [사용자](../../apps/api/src/admin-users/admin-users.controller.ts) | 각 업무의 service.ts                                                                                                                                                                                      |

## 실패 응답을 읽는 방법

입력 오류, 미인증, 권한·Origin·CSRF 거부, 없는 대상, 상태 충돌을 구분한다. 상태 코드뿐 아니라 서버의 code와 message를 읽는다. 모든 endpoint가 동일한 오류 필드나 requestId를 반환한다고 가정하지 않는다.

웹 공통 전송은 [API 요청 규칙](frontend-api-request-rules.md)을 따른다. 진행 중 같은 GET 공유는 클라이언트 중복 방지이며 업무 명령의 멱등성이나 서버 동시성 보장을 대신하지 않는다.

## 사용자 관리 계약

- 역할 변경은 기존 다섯 역할 중 하나만 지정한다. 임의 권한 편집·새 역할 생성은 없다.
- PATCH 입력은 roleCode, isActive, reason(공백 제외 1~200자), expectedUpdatedAt이다. 마지막 값은 사용자 목록의 updatedAt 원문을 사용한다.
- 변경 결과는 user, changed, sessionRevoked이다. 변경 없음은 세션을 종료하거나 이력을 추가하지 않는다. 자기 계정 변경이면 클라이언트는 다시 로그인한다.
- 인증·Origin·CSRF·관리자 권한을 확인하고 트랜잭션 안에서 관리자 세션을 다시 검사한다. 마지막 활성 관리자 해제와 오래된 수정은 409다. 동시 변경 충돌도 409이며 자동 재시도하지 않는다.
- 변경과 대상 세션 폐기·USER_ACCESS_CHANGED 감사 기록은 같은 Serializable 트랜잭션이다. 감사 details에는 변경 전후 역할·활성 상태와 사유를 남긴다. 비밀번호·세션 토큰은 응답이나 이력에 넣지 않는다.
- 이력 조회는 page(기본 1), pageSize(기본 10; 10/20/50/100)를 사용한다. roles 응답의 implemented는 권한 선언과 실제 기능 제공을 구분한다.
- 이 소스의 새 관리 경로를 실행하려면 20260906090000_user_access_audit migration과 새 API 실행 파일이 필요하다. 기존 실행 중 API는 별도 적용 전까지 조회 전용이다.

## 현재 없는 경로

이 목록에는 임의 권한 편집·새 역할 생성, 별도 문서 결재·전자서명·공식 서식 발급 endpoint가 없다. 권한 상수나 설계 문서에 기능이 등장하더라도 구현 완료로 표시하지 않는다. 새 Controller 경로가 생기면 이 목록과 연결된 테스트를 함께 갱신한다.
