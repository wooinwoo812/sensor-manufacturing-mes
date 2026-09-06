# 백엔드 구조와 구현 범위

2026-09-05 현재 저장소 코드를 읽는 안내다. 목표 설계와 실제 구현을 구분하며, 이 문서는 운영 환경 검증이나 보안 인증을 의미하지 않는다.

## 먼저 읽을 순서

1. [앱 조립](../../apps/api/src/app.module.ts)에서 업무 모듈과 전역 OriginGuard를 확인한다.
2. [인증·권한 계약](../../apps/api/src/auth/auth.contract.ts)과 [가드](../../apps/api/src/auth/auth.guards.ts)를 읽는다.
3. [작업지시 Controller](../../apps/api/src/work-orders/work-orders.controller.ts) → [Service](../../apps/api/src/work-orders/work-orders.service.ts) → [DB 모델](../../apps/api/prisma/schema.prisma)을 따라간다.
4. [API 경로 안내](api-reference.md), [DB 구조](database-overview.md), [검증과 시연](testing-and-demo.md)으로 확인 범위를 넓힌다.

## 실행 구조

```text
브라우저 /api 요청
  → Vite proxy (로컬 개발)
  → NestJS /api prefix
  → Origin / Session·Permission / 필요 시 CSRF 검사
  → 업무 Controller
  → 업무 Service의 입력·상태 검사
  → PrismaService / PostgreSQL
  → 응답 또는 명시적인 오류
```

현재는 업무별 NestJS 모듈과 서비스로 구성된 단일 API 앱이다. 서비스가 Prisma를 직접 사용한다. 별도 repository 계층, 마이크로서비스, 이벤트 버스가 구현되어 있다고 설명하지 않는다.

## 책임 구분

| 위치                            | 실제 책임                                       |
| ------------------------------- | ----------------------------------------------- |
| src/main.ts                     | Nest 앱 생성, /api prefix, 포트·종료 처리       |
| src/app.module.ts               | 모듈 조립과 전역 OriginGuard                    |
| src/auth                        | 세션, cookie, 역할 권한, Origin·CSRF 검사       |
| 각 업무의 controller.ts         | HTTP 경로·권한·입력 전달·상태 코드              |
| 각 업무의 service.ts            | 조회조건 해석, 업무 상태 검사, Prisma 조회·명령 |
| 각 업무의 contract.ts           | 조회·응답에 사용하는 업무 타입·허용값           |
| src/database/prisma.service.ts  | PostgreSQL adapter와 Prisma client 수명         |
| prisma/schema.prisma·migrations | 모델·관계와 실제 스키마 변경 이력               |

## 인증과 역할

역할 선택은 서버 세션을 생성한다. 브라우저 메뉴 필터는 안내이고 API의 PermissionGuard가 최종 권한을 검사한다. 최고관리자(SYSTEM_ADMIN)는 전체 업무 permission을 명시적으로 부여받는다. 역할 이름만으로 guard를 우회하지 않으며 Origin·CSRF·세션·업무 상태·수량·감사 검증과 마지막 활성 관리자 보호는 그대로 적용한다.

상태 변경은 전역 OriginGuard를 통과해야 한다. 로그인 외의 보호된 업무 명령에는 CSRF 검사가 붙는다. 로그인은 JSON 요청 여부를 확인한다. 세션 cookie와 응답 정책의 원문은 [인증 Controller](../../apps/api/src/auth/auth.controller.ts), [인증 Service](../../apps/api/src/auth/auth.service.ts), [HTTP 검증](../../apps/api/src/auth/auth.http.ts)이다.

권한 상수가 정의되어 있다는 사실만으로 해당 기능의 HTTP endpoint가 존재한다고 판단하지 않는다. 예를 들어 사용자 역할 편집·생산 LOT 처분·격리 대상 처분은 경로 구현 여부를 별도로 확인해야 한다.

## 업무 명령과 데이터 변경

작업지시 생성·발행·취소, 자재 예약·해제, 공정 시작·완료, 검사 판정, 자재 처분, 부적합 등록이 서비스에 구현되어 있다. 관련 변경과 감사 기록을 묶는 Prisma transaction 사용 위치를 확인한다.

transaction을 사용한다는 이유만으로 모든 동시성 충돌이 방지된다고 주장하지 않는다. 격리 수준, 경쟁 요청에서의 조건 갱신, unique 제약과 실제 DB 동시성 테스트는 각각 별도 근거가 필요하다.

발행은 제품의 발행된 BOM과 검사 규격을 스냅샷하고 생산 LOT 하나, 제품별 공정 실행 행, 실제 검사 대기를 함께 생성한다. 자재가 준비되면 첫 공정을 시작하며 활성 예약을 소비와 LOT 계보로 기록한다. EA 재고는 작업지시 전체의 BOM 소요량을 올림해 예약한다. 완료 실적의 양품·불량 합계는 첫 공정의 계획 수량 또는 직전 공정의 양품 수량과 일치해야 한다.

공정 완료와 검사 판정은 같은 LOT의 후속 공정을 다시 평가한다. 합격 시 검사 차단만 해제하고 자재·수동 차단은 유지한다. 모든 공정 완료와 필수 검사 합격을 충족해야 작업지시가 완료된다. 발행·예약·공정 명령·판정에는 Serializable 트랜잭션을 사용하고 경쟁 충돌은 재조회 가능한 409 오류로 반환한다.

제품 경로는 현재 세 데모 제품에 대한 고정 설정이다. 신규 발행은 작업지시당 LOT 하나를 지원하며 분할·병합·재작업 경로 편집은 포함하지 않는다. 이전 데모 기록에서 선행 양품 실적이 없으면 임의 수량을 채우지 않고 후속 실행을 막는다. 기존 완료 판정의 정정 흐름은 제공하지 않는다.

예약은 실제 소비와 다르다. 검사 완료와 합격, 생산 완료와 품질 처분도 독립적인 상태다. 자세한 의미는 [제조 도메인 계약](../domain/manufacturing-domain-contract.md)을 따르되 현재 저장 모델과 일치하는지 확인한다.

## 현재 한계와 다음 검토

- 도메인 계약의 목표 범위 전체가 구현된 것은 아니다. [API 경로 안내](api-reference.md)의 현재 경로를 기준으로 읽는다.
- 일부 API 테스트는 Prisma 대체 구현을 사용한다. HTTP·권한·서비스 동작 검증과 PostgreSQL의 제약·락·경쟁 검증을 구분한다.
- 현재 PrismaService에는 DATABASE_URL 미설정 시 로컬 연결 기본값이 남아 있다. 과거 인수인계의 설정 필수화 설명만 보고 운영 준비 완료로 판단하지 않는다.
- 운영용 배포·백업 복구·모니터링·비밀 관리 검증은 별도 과제다. 현 상태는 가상 데이터를 사용하는 로컬 데모 기반이다.

포트폴리오에서는 실제 서비스 하나를 골라 입력 → 권한 → 상태 검사 → 데이터 변경 → 오류·테스트를 설명한다. 없는 계층이나 운영 성과를 덧붙이지 않는다.
