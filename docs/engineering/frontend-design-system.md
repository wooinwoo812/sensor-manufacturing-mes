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
| `--mes-font-sans` | OS system UI + 한국어 system fallback | 모든 사용자 문구와 표 |
| `--mes-font-mono` | Cascadia Mono·SFMono·Consolas fallback | LOT·작업지시 번호, 수량 지표 |
| `--mes-space-unit` | `0.25rem` | Tailwind spacing scale의 기준 |
| `--mes-leading-body` | `1.5` | 설명·복구 안내 본문 |

제조 현장의 폐쇄망·느린 초기 연결에서도 글꼴 때문에 화면이 흔들리지 않도록 외부
Google Fonts 요청을 사용하지 않는다. 설치돼 있으면 Pretendard를 우선하고,
Windows는 Segoe UI와 Malgun Gothic, Apple 환경은 system UI와 Apple SD Gothic
Neo로 이어진다. 특정 OS에서 서체가 달라지는 비용보다 offline 가용성과 첫 렌더링
안정성을 우선한 결정이다. `font-synthesis: none`으로 설치되지 않은 굵기를 브라우저가
임의 생성하지 않으며, mobile form control은 iOS 자동 확대를 막기 위해 16px을
유지한다. 전역 scrollbar 모양은 강제하지 않아 OS 접근성 설정을 보존한다.

| 단계 | 크기·굵기 | 용도 | 이유 |
|---|---|---|---|
| page title | 24px·700 | 현재 업무영역의 최상위 제목 | 내부 업무 화면에서 30px 이상 marketing heading이 data보다 앞서는 것을 막는다 |
| section title | 16px·600~700 | panel·table heading | 14px body와 구분하면서 한 화면에 여러 section을 유지한다 |
| body·control | 14px·400~600 | 설명·cell·button·input | 정보 밀도와 1024px 가독성의 기본값이다 |
| metadata·badge | 12px·500~600 | timestamp·단위·상태 보조정보 | 12px 미만 한국어를 실제 업무 화면에 사용하지 않는다 |
| numeric emphasis | 24px·700 mono | KPI 수량 | 자릿수 비교만 강조하고 label보다 시각 면적이 과도해지지 않게 한다 |

업무 식별자와 수량만 mono를 사용한다. 제목·button·badge 전체를 mono로 만들지
않는다. 기능 code는 `13px`, `17px`, `margin: 11px` 같은 임의 값을 추가하지
않고 아래 4px 간격 체계를 사용한다.

| 간격 | 용도 | 금지 |
|---:|---|---|
| 4px | label과 보조정보, 밀접한 text 관계 | 서로 다른 업무 group 분리 |
| 8px | icon과 label, 같은 control 내부 | page section 분리 |
| 12px | row 내부 대상·상태 group | 독립 panel 사이 간격 |
| 16px | grid gap, mobile page gutter, row padding | 관련 없는 section을 한 덩어리로 표현 |
| 20px | compact KPI·filter panel 내부 | dialog·긴 form 기본 padding |
| 24px | desktop page gutter, 일반 panel·dialog 내부 | icon과 label처럼 밀접한 관계 |
| 32px | 큰 section 전환이 꼭 필요할 때 | 반복 card 사이 기본 간격 |

다음 고정 치수도 같은 밀도 원칙을 따른다.

| 치수 | 적용 | 선정 이유 |
|---:|---|---|
| 32px | sidebar의 대상·역할 icon 면 | 16px icon 주위에 8px 여백을 보장한다 |
| 36px | 보조·compact control | 주 작업이 아닌 filter 보조 행동에만 사용한다 |
| 40px | 기본 button·input·icon button | 마우스 업무 밀도와 터치 가능 영역을 함께 확보한다 |
| 48px | 접힌 sidebar 폭 | 32px menu target과 양쪽 8px 여백을 유지한다 |
| 64px | global header 높이 | 화면 제목과 40px control을 안정적으로 수직 중앙에 놓는다 |
| 256px | desktop sidebar 폭 | 긴 한국어 업무명과 `예정` 상태를 줄임 없이 읽게 한다 |
| 288px | mobile overlay sidebar 폭 | 좁은 화면에서도 44px 이상 menu 행과 긴 label을 보존한다 |

2px 현재 위치 marker, 1px border, 3px focus ring은 요소 사이의 여백이 아니라
경계·상태를 표현하는 stroke이므로 spacing 단계에 포함하지 않는다. 기능 code의
margin·padding·gap에는 2px·6px 같은 중간값을 사용하지 않는다. Radix primitive의
arrow·indicator처럼 요소 크기에서 계산되는 absolute offset은 optical alignment로
분리하며 일반 layout spacing으로 재사용하지 않는다.

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
| `shadow-panel` | dialog·toast·popover 같은 overlay 구분 |
| `z-header` (`30`) | sticky global header |
| `z-overlay` (`40`) | modal backdrop·dropdown |
| `z-sidebar` (`50`) | mobile navigation·dialog content |
| `z-skip` (`60`) | keyboard skip link·toast viewport |

호출부에서 임의 `z-[9999]`, 과도한 radius 또는 장식 shadow를 추가하지 않는다.
고정된 업무 panel과 table은 border와 canvas 명도차로 구분하고 shadow를 사용하지
않는다. 사용자가 떠 있는 계층으로 인식해야 하는 overlay만 shadow를 갖는다.

### 2.5 Icon

| 크기 | 용도 |
|---:|---|
| 16px | navigation·button·table row·badge의 기본 icon |
| 20px | 화면 상태·중요 feedback icon |
| 24px 이상 | empty/error illustration처럼 별도 영역이 있는 경우만 허용 |

- Lucide 한 종류만 사용해 stroke 굵기와 optical size를 통일한다.
- icon은 `대상 종류` 또는 `상태` 중 하나만 설명한다. 같은 행에서 두 icon이 같은
  상태를 반복하지 않는다.
- 작업지시는 clipboard, 자재는 package, 검사는 scan처럼 실제 명사에 연결한다.
- 완료·대기·격리는 text badge와 semantic icon을 함께 사용한다.
- 익숙한 menu·close·theme control을 제외한 icon-only button은 보이는 label 또는
  tooltip과 `aria-label`이 필요하다.
- 사람 avatar를 LOT·작업지시·자재 같은 업무 대상의 장식으로 사용하지 않는다.

제품 shell과 dashboard의 icon vocabulary는 다음으로 고정한다.

| Icon | 업무 의미 | 선정 이유 |
|---|---|---|
| `Factory` | 제품 정체성·공정 실행 | 일반 회사가 아니라 제조 실행 시스템임을 즉시 드러낸다 |
| `LayoutDashboard` | 운영 대시보드 | 여러 업무영역의 요약 화면이라는 관습적 의미가 분명하다 |
| `ClipboardList` | 작업지시 | 지시 번호와 수행 항목을 가진 문서형 대상을 표현한다 |
| `Boxes` | BOM 구성·생산 LOT 집계 | 여러 구성품 또는 LOT 묶음을 뜻하며 단일 자재와 구분된다 |
| `PackageSearch` | 자재 LOT | 물리 자재 단위의 식별·조회라는 두 의미를 함께 전달한다 |
| `ClipboardCheck`·`ScanSearch` | 검사 영역·개별 검사 대기 | 전자는 판정 업무영역, 후자는 특정 LOT 조회·검사 사건에 한정한다 |
| `ShieldAlert` | 부적합·격리 | 사용 차단과 위험 상태를 함께 알린다 |
| `GitBranch` | LOT 계보 | 부모·자식 분할·합류 관계를 방향성 있는 branch로 표현한다 |
| `History` | 감사이력 | 변경 사건의 시간 순서를 표현한다 |
| `Users` | 사용자 관리 | 사람 대상 관리에만 사용하며 제조 객체에는 사용하지 않는다 |
| `ShieldCheck` | 현재 역할 | 로그인 인물 사진이 아니라 권한 문맥임을 명시한다 |
| `PanelsTopLeft` | UI 시스템 점검 | 도움말이 아니라 실제 layout·component 검증 route임을 나타낸다 |
| `Sun`·`Moon` | 테마 전환 | 색상 모드를 바꾸는 보편적 utility 의미가 분명하다 |

`FlaskConical`처럼 검사 업무를 막연히 실험실 이미지로 꾸미는 icon은 사용하지
않는다. 제조 검사는 규격 확인과 판정 행위이므로 clipboard·scan 계열을 쓴다.

dashboard chart는 완료 수량만 cobalt로 강조하고 계획 수량은 muted text 색의 30%
명도로 뒤에 둔다. plot 높이 288px는 7개 요일 label과 tooltip을 1024px의 단일 열
폭에서 스크롤 없이 유지하기 위한 값이고, 막대 최대 폭 20px는 수량 차이를 읽되 장식
면적이 커지는 것을 막는다. 4px top radius와 grid dash는 전역 shape 단위에 맞춘다.

neutral surface만 반복해 정보 계층이 평평해지는 것도 피한다. 장식 면적을 늘리는
대신 다음 네 지점에만 색과 굵기 차이를 준다.

| 강조 | 표현 | 이유 |
|---|---|---|
| 현재 화면 문맥 | 24px 제목 높이에 맞춘 왼쪽 2px cobalt rail과 하단 구조선 | hero banner 없이 현재 업무영역을 표시하고 sidebar 위치 marker와 같은 굵기를 쓴다 |
| 운영 현황 | 중립 cell 위의 semantic icon 면과 수치 색 | 넓은 pastel 면을 없애고 작업지시·검사 대기·격리처럼 의미가 있는 값만 구분한다 |
| 주간 달성률 | 24px mono 수치와 8px progress bar | chart를 해석하기 전 계획 170 EA 대비 완료 140 EA를 읽게 한다 |
| 조치 목록 | 행 왼쪽 2px severity rail과 같은 tone의 icon 면 | 카드 전체를 붉게 칠하지 않고 긴급도와 대상 종류를 동시에 찾게 한다 |

이 rail은 장식용 brand stripe가 아니다. page rail은 현재 문맥, queue rail은 위험도를
각각 중복 없이 표현한다. gradient, glow, 고채도 배경과 새 shadow는 추가하지 않는다.

### 2.6 시각 방향 검토 후보 v1.1

이 절은 PR #30의 브라우저 검토를 위한 후보이며 Owner 확인 전 ADR-0005의
승인 상태를 대신하지 않는다. 시각 완성도보다 업무 식별자, 대표 행동과 차단
사유가 먼저 읽혀야 한다는 상위 계약은 유지한다.

| 결정 대상 | 선택 | 선정 이유 | 기각·재검토 조건 |
|---|---|---|---|
| 기본 골격 | `shadcn-admin`의 inset shell과 중립 surface 유지 | 반응형·접기 동작을 보존하고 외부 template와 우리 변경 범위를 구분할 수 있다 | 1024px 현장 검증에서 본문 폭이 부족하면 standard sidebar를 재검토한다 |
| canvas와 panel | 옅은 cool-neutral canvas 위에 흰 panel | border와 간격만으로 정보 묶음을 구분해 장시간 업무 화면의 시각 피로를 줄인다 | panel 경계가 실제 모니터에서 구분되지 않으면 명도차를 우선 조정한다 |
| 대표 accent | 저채도 cobalt blue | 대표 행동·현재 위치·link·focus를 하나의 언어로 묶고 success·warning·danger와 충돌하지 않는다 | 기업 brand guide가 확정되면 hue를 바꾸되 semantic color와의 구분을 다시 검사한다 |
| accent 면적 | 전체 화면의 약 10%, interaction과 핵심 data series에 제한 | 넓은 고채도 면이 업무 data보다 먼저 보이는 것을 막는다 | dark sidebar나 gradient hero는 별도 비교 시안과 근거 없이는 사용하지 않는다 |
| sidebar | canvas보다 한 단계 어두운 cool-neutral 면 + 옅은 cobalt 선택면 + 2px 위치 marker | 전역 탐색을 구분하면서도 본문보다 먼저 보이지 않고 현재 위치만 색·형태로 표시한다 | 실제 모니터에서 경계가 약하면 고채도 면 대신 neutral 명도차만 조정한다 |
| 상태색 | 완료 green, 대기·보류 amber, 오류·격리 red | 브랜드 선택과 제조 상태 판단을 분리하고 세 상태축을 동시에 읽게 한다 | 색만으로 의미를 전달하지 않으며 text·icon·badge 형태를 항상 함께 둔다 |
| 숫자·식별자 | 수량과 LOT·작업지시 번호만 mono | 빠른 자릿수 비교와 식별자 탐색을 돕되 한글 본문의 가독성은 유지한다 | 제목·button 전체 mono 사용은 금지한다 |
| dashboard 구성 | 통합 운영 현황 → 계획/완료 비교 → 조치 필요 | 5초 안에 이상 수량을 찾고 차단 근거 대상까지 내려가는 업무 순서를 따른다 | 동일 KPI card 4개와 일반 recent activity 조합은 업무 근거 없이 사용하지 않는다 |
| dark mode | light token의 단순 반전이 아닌 별도 surface·semantic soft token | 밝은 상태 배경이 dark canvas에서 번쩍이거나 badge 대비를 깨는 것을 막는다 | light·dark 상태 조합의 대비 검증 전에는 완료로 판정하지 않는다 |

브라우저 chrome의 `theme-color`도 canvas와 분리하지 않는다. light는 `#f8fafc`,
dark는 `#020617`로 각 `background` token의 sRGB 표현을 사용하고 테마 전환 시 함께
갱신한다.

light sidebar는 별도 브랜드 면이 아니라 canvas와 같은 cool-neutral 계열의 한 단계
낮은 명도만 사용한다. active row의 soft cobalt 면과 2px marker 외에는 고채도 색을
넓게 쓰지 않는다. dark mode에서는 navigation과 업무 surface의 경계를 유지하기 위해
deep slate 면을 사용하되 warning·danger 상태색은 여전히 본문에서만 사용한다.

```text
새 시각 요소가 업무 의미를 전달하는가?
├─ 아니오 → 제거
└─ 예
   └─ interaction인가, 제조 상태인가?
      ├─ interaction → cobalt accent
      └─ 제조 상태 → success / warning / danger semantic token

넓은 색 면적이 필요한가?
├─ 아니오 → icon·marker·soft background로 제한
└─ 예 → data보다 먼저 보이지 않는다는 viewport 비교 근거가 있을 때만 허용
```

## 3. Component ownership

| Component | Layer | 책임 | 모르는 것 |
|---|---|---|---|
| `Button` | `shared/ui` | variant·loading·disabled·focus·link 위임 | 업무 command |
| `Input`·`NumberInput`·`DateInput` | `shared/ui` | label·hint·error 연결 | domain validation |
| `Select` | `shared/ui` | keyboard·option·error | filter 의미 |
| `ConfirmDialog` | `shared/ui` | focus trap·Escape·확인 구조 | transaction 실행 |
| `Toast` | `shared/ui` | 비차단 결과 알림 | command 성공 판단 |
| `Badge`·`PriorityBadge` | `shared/ui` | tone·text·icon | 제조 상태 전이 |
| `MetricCard` | `shared/ui` | 단일 지표와 근거 문구 | 지표 계산 |
| `FilterBar` | `shared/ui` | 조회 control과 결과 문맥 | URL search schema |
| `DataTable` | `shared/ui` | semantic table·empty row | server sort·pagination |
| `PageHeading` | `shared/ui` | h1·설명·기준정보와 현재 문맥 rail | 화면별 command·data source |
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
2. 현재 역할
3. 대표 행동과 조회 조건
4. 업무 대상 식별자와 차단 사유
5. 보조 metadata

sidebar는 전체 예정 메뉴를 보여주되 아직 구현되지 않은 기능은 가짜 route로 이동시키지 않고 `예정`으로 설명한다. 실제 route가 생기면 `app/shell-config.ts`의 typed navigation을 활성화한다.

전역 검색, 알림, profile menu와 workspace switcher는 실제 command·data source가
연결된 뒤 노출한다. 한 항목뿐인 switcher, 클릭해도 아무 일도 일어나지 않는 검색과
알림은 완성도를 높이는 장식이 아니라 신뢰를 낮추는 가짜 affordance로 판정한다.
내부 문서용 screen ID는 사용자 업무 판단에 필요하지 않으므로 shell에 표시하지
않는다.

`마지막 갱신`은 서버 응답의 실제 timestamp가 있을 때 해당 data panel에 표시한다.
정적 shell 값인 `방금 전`을 사용하지 않으며 dashboard fixture는 기준 날짜와 가상
데이터임을 본문에서 직접 밝힌다.

원본 template에서 유지하는 것은 검증된 responsive sidebar·mobile sheet·keyboard
interaction이다. shell 형태를 사용자가 인셋·플로팅·기본으로 바꾸는 customizer는
업무 위치 기억을 흔들고 제품 기능이 아니므로 제거한다. sidebar는 inset과 icon
collapse로 고정하고 테마만 light·dark·system 중 선택해 저장한다. glass header,
scroll shadow, avatar 장식, generic recent activity, 같은 모양 KPI card 반복도 제품
근거가 없어 제거한다. dashboard는 `현황 파악 → 계획 대비 → 차단 원인 조치`
순서로만 구성한다.

### 5.2 Viewport

| 폭 | 계약 |
|---:|---|
| 1440px 이상 | 256px sidebar, 전체 label, 넓은 업무 표 |
| 1280px | 256px sidebar와 label을 유지하고 dashboard 비교·조치 영역을 4:3으로 병렬 배치 |
| 1024px | 256px sidebar와 24px gutter를 유지하고 dashboard 비교·조치 영역은 단일 열로 배치 |
| 1024px 미만 | menu button과 overlay sidebar 제공 |

1280px 미만에서 dashboard의 chart와 조치 목록을 나란히 두지 않는다. 1024px에서는
sidebar를 제외한 실사용 폭이 약 752px이므로 두 panel을 분할하면 chart label과 LOT
식별자가 동시에 압축된다. 요약 수치는 2열을 유지하되 상세 비교와 조치는 전체 폭으로
쌓는다.

sidebar의 JavaScript media query와 Tailwind 표시 breakpoint는 모두 `64rem`으로
고정한다. JavaScript도 `(width < 64rem)` 범위 문법을 사용해 fractional viewport에서
1px 공백이 생기지 않게 한다. 둘 중 하나만 768px 원본값을 유지하면 800~1023px에서
desktop sidebar와 mobile sheet 상태가 서로 달라지므로 같은 회귀 테스트 대상으로
관리한다.

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
- 1024px 미만 overlay sidebar도 Enter로 열고 Escape로 닫은 뒤 직전 trigger로 focus를 돌려준다.
- loading button은 disabled 상태와 `처리 중` accessible name을 제공한다.
- `Button asChild`는 link를 감싸는 새 요소를 만들지 않고 단일 link에 style과 상태를
  위임한다.
- 모든 authenticated route는 `main-content`를 제공해 skip link로 sidebar·header를
  건너뛴다. 404와 application error도 같은 id와 h1 구조를 사용한다.
- focus indicator는 background와 분리된 3px ring을 사용한다.
- icon-only button은 `aria-label`을 가진다.
- animation은 `prefers-reduced-motion`에서 사실상 제거한다.
- color contrast는 browser viewport 검증에서 별도 확인한다.

2026-09-02 token 값의 WCAG 상대 명도 계산은 다음과 같다. 12~14px 일반 text에
적용하는 조합은 최소 `4.5:1`을 넘기며, 색상은 항상 text·icon과 함께 사용한다.

| 조합 | Light | Dark |
|---|---:|---:|
| 본문 text / canvas | 17.10:1 | 18.93:1 |
| muted text / canvas | 4.57:1 | 7.54:1 |
| accent strong / soft | 7.39:1 | 8.68:1 |
| success strong / soft | 6.45:1 | 8.79:1 |
| warning strong / soft | 4.88:1 | 8.99:1 |
| danger strong / soft | 4.97:1 | 8.34:1 |

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
- 실제 command나 data source가 없는 검색·알림·profile button 노출
- 한 항목뿐인 workspace·site switcher 노출
- 사용자 설명 없이 내부 screen ID·영문 all-caps eyebrow 노출
- 업무 근거 없이 같은 크기 KPI card 4개와 generic recent activity를 조합
- LOT·작업지시·자재를 사람 avatar나 임의 이니셜로 표현
- 12px 미만 한국어 text와 4px 체계 밖의 임의 spacing 사용
