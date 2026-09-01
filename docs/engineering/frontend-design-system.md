# Frontend 디자인 시스템 계약

> Issue #9의 token, 공통 component, 상태축과 AppShell 구현을 이후 기능 PR이 재사용하기 위한 source 계약

| 항목 | 내용 |
|---|---|
| 상태 | 구현 v1.0 |
| 관련 Issue | [#9](https://github.com/wooinwoo/sensor-manufacturing-mes/issues/9) |
| 결정 | [ADR-0005](../adr/0005-code-owned-design-system.md) |
| 화면 기준 | [UI 레이아웃·상태 계약](../product/ui-layout-contracts.md) |
| 구조 기준 | [Frontend 구조 계약](frontend-architecture.md) |

## 1. Source of truth

| 계약 | Source |
|---|---|
| color·font·spacing·radius·shadow·z-index | `apps/web/src/app/styles/tokens.css` |
| global reset·focus·reduced motion | `apps/web/src/app/styles/globals.css` |
| generic component | `apps/web/src/shared/ui` |
| 제조 상태축 | `apps/web/src/entities/manufacturing-status` |
| shell·navigation rendering | `apps/web/src/widgets/app-shell` |
| route·menu·breadcrumb 입력 | `apps/web/src/app` |
| 실제 상태 조합 fixture | `/dev/ui-kit` |

Figma나 외부 template는 진실 공급원이 아니다. 실제 token, component public API와 test가 제품 계약이다.

## 2. Token

### 2.1 Typography와 spacing

| Token | 값 | 용도 |
|---|---:|---|
| `--mes-font-sans` | Inter·Pretendard·Noto Sans KR·system fallback | 모든 사용자 문구와 표 |
| `--mes-font-mono` | SFMono·Consolas fallback | route ID, LOT·작업지시 번호, 수량 지표 |
| `--mes-space-unit` | `0.25rem` | Tailwind spacing scale의 기준 |
| `--mes-leading-body` | `1.55` | 설명·복구 안내 본문 |

업무 식별자와 수량만 mono를 사용한다. 제목·button·badge 전체를 mono로 만들지 않는다. 기능 code는 `13px`, `17px`, `margin: 11px` 같은 임의 값을 추가하지 않고 token에 연결된 utility를 사용한다.

### 2.2 Surface와 text

| Token 계열 | 의도 | 허용 위치 |
|---|---|---|
| `canvas` | 애플리케이션 바탕 | body·workspace |
| `surface` | 읽고 행동하는 기본 면 | panel·form·table |
| `surface-subtle` | hover·thead·disabled 구분 | surface 안의 보조 면 |
| `border` | 구조 구분 | panel·row·control |
| `text-strong` | 제목·업무 식별자 | heading·핵심값 |
| `text` | 일반 업무 내용 | label·cell |
| `text-muted` | 설명·metadata | helper·timestamp |
| `text-subtle` | placeholder·비활성 보조정보 | placeholder·pending menu |

surface를 여러 단계 shadow로 쌓지 않는다. 업무 구조는 border, spacing과 heading으로 먼저 구분한다.

### 2.3 Semantic color

| 계열 | 의미 | 금지 |
|---|---|---|
| `accent` | 현재 위치·대표 행동·link·focus | 성공 상태 대체 |
| `success` | 완료·합격·정상 | 단순 선택 상태 |
| `warning` | 대기·보류·충돌·확인 필요 | 영구 오류 |
| `danger` | 불합격·격리·파괴 행동·오류 | 우선순위 없는 강조 |
| `sidebar` | 전역 navigation | 제품 상태 표시 |

semantic color는 text와 icon을 보조한다. 색만 보고 상태나 위험 행동을 판단하게 만들지 않는다.

### 2.4 Shape·shadow·z-index

| Token | 의도 |
|---|---|
| `radius-control` | button·input·menu item |
| `radius-panel` | 업무 panel·table·dialog |
| `shadow-control` | 눌러야 하는 control의 최소 깊이 |
| `shadow-panel` | overlay·독립 panel 구분 |
| `z-header` | sticky global header |
| `z-overlay` | modal backdrop |
| `z-sidebar` | mobile navigation·dialog |
| `z-skip` | skip link·toast viewport |

호출부에서 임의 `z-[9999]`, 과도한 radius 또는 장식 shadow를 추가하지 않는다.

## 3. Component ownership

| Component | Layer | 책임 | 모르는 것 |
|---|---|---|---|
| `Button` | `shared/ui` | variant·loading·disabled·focus | 업무 command |
| `Input`·`NumberInput`·`DateInput` | `shared/ui` | label·hint·error 연결 | domain validation |
| `Select` | `shared/ui` | keyboard·option·error | filter 의미 |
| `ConfirmDialog` | `shared/ui` | focus trap·Escape·확인 구조 | transaction 실행 |
| `Toast` | `shared/ui` | 비차단 결과 알림 | command 성공 판단 |
| `Badge`·`PriorityBadge` | `shared/ui` | tone·text·icon | 제조 상태 전이 |
| `MetricCard` | `shared/ui` | 단일 지표와 근거 문구 | 지표 계산 |
| `FilterBar` | `shared/ui` | 조회 control과 결과 문맥 | URL search schema |
| `DataTable` | `shared/ui` | semantic table·empty row | server sort·pagination |
| 화면 상태 | `shared/ui` | loading·empty·error·forbidden·conflict 복구 틀 | API 오류 mapping |
| `ManufacturingStatusSummary` | `entities` | 세 상태축의 독립 표현 | 상태 변경 command |
| `AppShell` | `widgets` | sidebar·header·breadcrumb·content slot | session API·permission 판단 |

기능은 public API인 `@/shared/ui`, `@/entities/manufacturing-status`, `@/widgets/app-shell`만 import한다. 내부 파일 deep import는 FSD 검사에서 실패한다.

## 4. 세 상태축

다음 세 값은 동시에 존재하며 하나로 합치지 않는다.

```text
생산 진행 [완료 ✓]   최근 검사 [합격 ✓]   현재 품질 [QUARANTINED !]
```

- 생산 완료는 제조 공정이 끝났다는 뜻이다.
- 검사 합격은 마지막 유효 검사 결과다.
- `QUARANTINED`는 사후 사건 때문에 현재 사용·출하할 수 없다는 뜻이다.

따라서 `완료·합격`을 근거로 품질 격리를 숨기거나 종합 `정상` badge로 바꾸면 안 된다.

## 5. AppShell

### 5.1 정보 우선순위

1. 현재 업무영역과 page title
2. 현재 역할과 마지막 갱신 시각
3. 대표 행동과 조회 조건
4. 업무 대상 식별자와 차단 사유
5. 보조 metadata

sidebar는 전체 예정 메뉴를 보여주되 아직 구현되지 않은 기능은 가짜 route로 이동시키지 않고 `예정`으로 설명한다. 실제 route가 생기면 `app/shell-config.ts`의 typed navigation을 활성화한다.

### 5.2 Viewport

| 폭 | 계약 |
|---:|---|
| 1440px 이상 | 240px sidebar, 전체 label, 넓은 업무 표 |
| 1280px | 208px sidebar, label 유지, 보조 열 축소 가능 |
| 1024px | 같은 route·역할·대표 행동 유지, 공정 화면 우선 |
| 1024px 미만 | menu button과 overlay sidebar 제공 |

## 6. 상태와 복구

| 상태 | 보존 | 필수 행동 |
|---|---|---|
| loading | title·filter·기존 data | 중복 command 차단 |
| empty | filter·permission | 첫 생성 또는 filter 초기화 |
| error | 입력·request 문맥 | 안전한 재시도 |
| forbidden | 대상·필요 권한 | 역할 전환 또는 허용 route 이동 |
| conflict | 내 입력·최신 version | 최신값 조회 후 명시적 재시도 |

공통 상태 component는 API 오류를 추측하지 않는다. page·feature가 오류를 분류하고 적절한 복구 action을 주입한다.

## 7. 접근성

- 모든 form control은 보이는 label 또는 명시적인 accessible name을 가진다.
- error는 `aria-invalid`와 `aria-describedby`로 입력에 연결한다.
- dialog는 title·description을 제공하고 Escape와 focus return을 유지한다.
- loading button은 disabled 상태와 `처리 중` accessible name을 제공한다.
- skip link로 sidebar·header를 건너뛴다.
- focus indicator는 background와 분리된 3px ring을 사용한다.
- icon-only button은 `aria-label`을 가진다.
- animation은 `prefers-reduced-motion`에서 사실상 제거한다.
- color contrast는 browser viewport 검증에서 별도 확인한다.

## 8. 검증

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

자동 검증은 다음을 포함한다.

- FSD 역방향·same-layer cross-slice·deep import 차단
- loading button, label·error와 dialog keyboard test
- semantic table empty state test
- 세 제조 상태축 분리 test
- `/dev/ui-kit` axe-core 검사
- Web·API 전체 기존 test

브라우저 근거는 `/dev/ui-kit`과 대표 product route를 1440·1280·1024px로 확인하고 keyboard-only walkthrough를 남긴다. `/dev/ui-kit`은 development에서만 접근 가능하며 production route에서는 not-found다.

## 9. 금지 규칙

- 기능 slice에서 hex·rgb·raw CSS color 추가
- domain enum을 `shared/ui`에 추가
- badge 하나로 생산·검사·품질 상태 통합
- 위험 command를 confirmation 없이 icon-only button으로 제공
- AppShell 안에 session API·permission 정책 구현
- 외부 template component를 provenance 없이 복사
- 제품 component와 다른 일회성 mock showcase 제작
