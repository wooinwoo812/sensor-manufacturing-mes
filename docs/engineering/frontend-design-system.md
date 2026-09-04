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
| `--mes-font-sans` | Pretendard Variable(번들) + OS system fallback | 모든 사용자 문구와 표 |
| `--mes-font-mono` | Cascadia Mono·SFMono·Consolas fallback | LOT·작업지시 번호 같은 식별자 (수량·날짜는 sans + `tabular-nums`) |
| `--mes-space-unit` | `0.25rem` | Tailwind spacing scale의 기준 |
| `--mes-leading-body` | `1.5` | 설명·복구 안내 본문 |

제조 현장의 폐쇄망·느린 초기 연결에서도 글꼴 때문에 화면이 흔들리지 않도록 외부
Google Fonts 요청을 사용하지 않는다. 대신 `pretendard` npm package의 dynamic
subset woff2를 앱 번들에 포함해 self-host하며, 로드 전에는 Windows의 Segoe UI와
Malgun Gothic, Apple 환경의 system UI와 Apple SD Gothic Neo로 이어진다. OS별
기본 한국어 서체(특히 Malgun Gothic)의 자간·굵기 편차가 업무 화면 인상을 크게
바꾸기 때문에 offline 가용성을 유지하면서 서체를 고정한 결정이다. 본문은
`word-break: keep-all`로 한국어 어절 중간 줄바꿈을 막는다. `font-synthesis: none`으로 설치되지 않은 굵기를 브라우저가
임의 생성하지 않으며, mobile form control은 iOS 자동 확대를 막기 위해 16px을
유지한다. 전역 scrollbar 모양은 강제하지 않아 OS 접근성 설정을 보존한다.

| 단계 | 크기·굵기 | 용도 | 이유 |
|---|---|---|---|
| page title | 20px·700 | 현재 업무영역의 최상위 제목 | 내부 업무 화면에서 30px 이상 marketing heading이 data보다 앞서는 것을 막는다 |
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

### 2.7 2026-09-04 간격·색상 리프레시 결정 근거

첫 디자인 검토(1440·1024px 스크린샷 25장)에서 "간격이 헐겁고 색이 뭉개진다"는
판정이 나왔다. 원인과 결정을 토큰·공용 컴포넌트 단위로 기록한다. 화면별 예외는
두지 않는다.

| 결정 | 이전 | 이후 | 이유 |
|---|---|---|---|
| 텍스트·테두리 중립화 | foreground chroma 0.042, muted 0.046 (slate) | chroma ≤ 0.02 | 본문까지 파랗게 깔리면 링크·버튼·활성 메뉴의 accent 가 구분되지 않는다 |
| 세 평면 명도 분리 | sidebar 0.968 / canvas 0.985 / card 1.0 | 0.945 / 0.975 / 1.0 | panel shadow 를 쓰지 않으므로 명도 단계가 유일한 구획 수단이다 |
| primary 톤 | oklch(0.558 0.19) | oklch(0.51 0.17) | 흰 카드 위에서 채도 0.19 는 배지·버튼이 화면보다 앞으로 튀어 정보 위계를 깨뜨린다 |
| warning 색상 | 노랑(hue 98, 테두리 chroma 0.18) | 앰버(hue 65~80, 테두리 chroma 0.08) | 흰 배경 위 노란 테두리는 대비가 무너지고 "스티커"처럼 읽힌다 |
| 배지 테두리 | 상태색 테두리 100% | 60% alpha + 높이 24px 고정 + nowrap | 한 행에 배지 3개가 놓이는 표에서 테두리 채도가 시선을 분산시킨다. 두 줄로 꺾인 배지("진행/중")는 상태를 오독하게 한다 |
| 서체 | 선언만 된 Pretendard → 실제로는 Malgun Gothic | `pretendard` 1.3.9 dynamic subset 번들 | OS 기본 한국어 서체의 자간·굵기 편차가 업무 화면 인상을 좌우한다. self-host 로 offline 원칙은 유지한다 |
| 줄바꿈 | 기본(음절 단위) | `word-break: keep-all` | "데/모를", "보/통" 같은 어절 중간 줄바꿈은 한국어 가독성을 크게 떨어뜨린다 |
| 숫자 서체 | 모노스페이스 | sans + `tabular-nums` | 날짜·수량이 터미널처럼 보였다. 자릿수 정렬은 tabular-nums 로 충분하고, 모노는 식별자(LOT·작업지시 번호)에만 남긴다 |
| 표 밀도 | 셀 12px, 자동 줄바꿈 | 셀 10px, `whitespace-nowrap` | 9행 표가 한 화면에 들어오고 식별자·수량이 두 줄로 갈라지지 않는다 |
| 페이지 제목 | 24px | 20px | 내부 업무 화면에서 제목보다 데이터가 먼저 읽혀야 한다 |
| 사이드바 평면 | 회색(0.945) inset variant, 둥근 콘텐츠 패널 | 흰색 + 오른쪽 hairline, 표준 variant | 회색 사이드바는 연회색 콘텐츠와 경쟁해 탁하게 읽혔다. 흰 사이드바 / 연회색 콘텐츠 / 흰 카드가 되면 카드가 콘텐츠 위에 놓인 것으로 읽힌다 |
| 활성 메뉴 | 왼쪽 파란 막대 + 굵은 글자 | accent-soft 배경 + accent 글자·아이콘 | 막대와 배경은 같은 신호를 두 번 보내는 중복이다 |
| 페이지 제목 장식 | 왼쪽 파란 세로 막대 + 밑줄 | 없음, 22px semibold | 막대와 밑줄은 2015년식 admin 템플릿의 대표 신호다. Main 의 16px gap 이 구획을 대신한다 |
| 조회 조건 | 테두리 카드 + 결과 문구 줄 | 테두리 없는 툴바, 결과 문구는 같은 행 오른쪽 | 표 위에 상자가 하나 더 놓이면 "상자 안의 상자"가 되고 필터가 데이터보다 무거워 보인다 |
| 표 헤더 | 회색 배경 | 흰 배경 + 진한 밑줄 | 회색 띠는 카드 안에 또 하나의 면을 만든다. 선 하나로 충분하다 |
| 우선순위 | 상태 배지와 같은 pill | 점 + 텍스트 (긴급만 아이콘) | 한 행에 pill 이 세 개면 세 번째는 소음이다. 색 없이도 긴급은 아이콘으로 구분된다 |
| 로그인 왼쪽 | 흰 배경에 제목만 | 단색 navy 평면 + 제조 흐름 5단계 목록 | 제품 첫 화면이라 한 번은 톤 대비가 필요하다. gradient 없이 단색 하나로 끝내고, 이 제품만의 정보(5단계)로 채운다 |
| 재조회 | 조건이 바뀌면 스켈레톤으로 교체 | 이전 결과를 60% 투명도로 유지(`aria-busy`) | 표가 사라졌다 나타나는 깜빡임이 "UI 가 흔들린다"는 인상의 주된 원인이었다 |
| 첫 조회 스켈레톤 | 40px 막대 3개 | 표 모양(헤더 + 52px 행 8개) | 스켈레톤과 실제 표의 높이 차이만큼 페이지가 튀었다 |
| 상세 화면 표식 | 목록과 같은 제목 영역, 헤더 경로도 목록과 동일 | 돌아가기 링크 → eyebrow("작업지시 상세") → 식별자 제목, 헤더 경로 3단계("생산 / 작업지시 / WO-2026-095"), 사이드바 부모 메뉴 활성 유지 | "상세에 들어왔는지 모르겠다"는 검토 결과. 상세는 목록과 같은 자리에서 시작하되 위 두 줄과 경로 세 번째 단계가 위치를 알려준다 |
| 상세 돌아가기 | 화면마다 다름(오른쪽 "목록으로"/"대기열로" 버튼, 없는 화면도 있음) | `PageHeading.back` 한 자리 | 6개 상세가 같은 규칙을 따라야 한 제품으로 읽힌다 |
| 상세 패널 | 3개 화면은 Panel, 3개 화면은 shadcn Card 기본 여백(24px) | 6개 전부 `Panel` | 같은 역할의 상자가 화면마다 여백이 다르면 "디자인이 흔들린다"고 읽힌다 |
| 행 진입 | 식별자 글자(작은 파란 버튼)만 클릭 가능 | 행 전체 클릭 + hover 배경 + 오른쪽 chevron + 키보드 Enter | "무엇을 눌러야 하는지" 보이지 않았다. 행 안의 버튼(판정, 완료 입력)은 자기 일만 하고 행 이동을 막는다 |
| 식별자 서체 | Cascadia Mono·Consolas (OS 마다 다름) | Pretendard + `tabular-nums` | 모노스페이스는 한국어 업무 화면에서 "개발자 콘솔"로 읽히고, 설치 여부에 따라 서체가 달라졌다. 자릿수 정렬은 tabular-nums 로 충분하다 |
| 상세 주요 행동 | 화면 맨 아래 "작업지시 행동" 절 | 제목 오른쪽(발행 primary, 취소 secondary → 아래 사유 패널 펼침) | 스크롤 없이 "여기서 할 일"이 보여야 한다. 취소는 사유 입력이 필요하므로 버튼이 패널을 연다 |
| 대시보드 조치 목록 | 읽기 전용 | 항목 클릭 → 해당 목록(작업지시·공정 실행·검사)을 그 코드로 검색 | 대시보드가 막다른 화면이면 안 된다 |
| 서체 크기 체계 | 11~15px 혼재 | 캡션 12 · 보조 13 · 본문 14 · 패널 제목 15 · 페이지 제목 24 | 단계가 정해져 있어야 화면마다 크기가 흔들리지 않는다. 입력 라벨은 12px bold 에서 13px medium 으로 |
| 영역 간격 | 16px | 20px (Main gap-5), 좌우 32px | 제목이 필터에 붙어 보였다 |
| 사이드바 메뉴 | 32px·13px | 36px·14px | 본문 14px 과 같은 크기여야 메뉴가 작아 보이지 않는다 |
| 계보 상세 | 제목 아래 메타 문장이 홀로 뜨고, 항목 1개짜리 패널 2개가 세로로 쌓임, 노드 이름은 텍스트 | 노드 종류 배지 행(다른 상세와 같은 자리), 원천·영향 2열 나란히, 노드 이름은 다음 계보로 가는 링크, 수량에 "수량" 라벨 | 12·11·24·14·12px 다섯 줄이 쌓여 서체가 흔들려 보였다. 계보는 원천 → 노드 → 영향의 흐름이므로 양쪽을 나란히 두고 노드에서 노드로 이동할 수 있어야 한다 |
| 상세 표식 크기 | 돌아가기 12px, eyebrow 11px | 13px, 12px | 11px 은 1440px 에서도 읽기 어렵다. 캡션 최소 크기는 12px |
| 본문 폭 | 컨테이너 ≥ 1280px 일 때만 가운데 정렬 + max 1280, 그 외 전체 폭 | 항상 왼쪽 정렬, max 1400px | 사이드바를 접거나 큰 모니터로 가면 폭과 위치가 순간적으로 바뀌었다. 규칙이 하나면 흔들리지 않는다 |
| 세로 스크롤바 | 필요할 때만 표시 | `scrollbar-gutter: stable` | Windows 의 17px 스크롤바가 긴 화면과 짧은 화면 사이에서 생겼다 사라지며 본문 폭을 흔들었다. 자리를 항상 확보한다 |
| 공정 실행 상세 | 라우트만 있고 어디에서도 연결되지 않음, 헤더 "화면을 찾을 수 없음", enum 코드(MATERIAL_SHORTAGE) 노출 | 대기열 행 클릭으로 진입, 헤더 "생산 / 공정 실행 / WO · 공정", 모든 코드를 한국어 라벨로 | 도달할 수 없는 화면은 없는 화면이다. 서버 코드가 그대로 보이면 사용자는 자기 언어가 아니라고 느낀다 |
| 입력 폼 패널 | 검사 판정·공정 완료 폼이 임의의 테두리 상자 | `Panel`(제목 "판정 입력"/"완료 실적 입력" + 설명) | 상세 안의 모든 상자가 같은 헤더 규칙을 따라야 폼이 "끼어든 것"으로 보이지 않는다 |
| 생성·예약 화면 | 돌아가기 없음, 오른쪽 "작업지시로" 버튼 | 상세와 같은 back·eyebrow 규칙 | 목록→상세→하위 화면까지 같은 자리에서 돌아간다 |

### 2.8 간격 규칙 (공용 컴포넌트가 소유)

간격 값은 페이지 코드에 쓰지 않는다. 아래 컴포넌트가 값을 소유하고, 새 값이
필요하면 컴포넌트에 추가한 뒤 이 표를 갱신한다.

| 위치 | 값 | 소유 | 이유 |
|---|---|---|---|
| 페이지 최상위 블록 사이 | 16px (`gap-4`) | `widgets/app-shell/Main` | 제목·필터·표·패널이 한 리듬으로 쌓인다. 페이지별 `mt-*` 금지 |
| 페이지 제목 아래 | 16px + 1px 구분선 | `PageHeading` | 제목 영역과 본문의 경계를 선 하나로 고정 |
| 필터바 안쪽 | 16/12px, 결과 문구 위 10px | `FilterBar` | 입력 컨트롤 높이(40px)와 균형을 맞추는 최소 여백 |
| 표 셀 | 12/10px, 첫·끝 열 16px | `DataTable` | 행 높이 약 57px 로 9행이 1440×900 안에 들어온다 |
| 패널 헤더 / 본문 | 20/14px · 20/16px | `Panel` | 제목 14px·설명 12px 로 본문 데이터보다 한 단계 뒤로 물린다 |
| 요약 지표 | 항목 간 16px, 라벨→값 4px | `KeyValueGrid`·`KeyValue` | 상세 3종(작업지시·자재 LOT·검사)이 같은 눈금으로 읽힌다 |
| 지표 타일 | padding 16px, 최소 높이 없음 | `MetricCard` | 144px 최소 높이는 내용 없는 빈 공간만 만들었다 |
| 배지 | 높이 24px, 좌우 6px | `Badge` | 표 행 안에서 텍스트 줄 높이와 정렬된다 |
| 페이지네이션 | 표 아래 16px(Main gap), 한 페이지면 미표시 | `Pagination` | 3행짜리 표 밑의 "1 / 1 페이지"는 정보가 아니라 소음이다 |

주요 행동 버튼은 항상 `PageHeading` 의 `actions` 에 둔다(작업지시 생성, 사건 등록).
행 단위 입력 폼(공정 완료 실적)은 표 위에 끼워 넣지 않고 우측 `Sheet` 로 연다.
표를 밀어내지 않고, 입력 중에도 대상 행이 보인다.

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
- 1024px 미만 overlay sidebar는 trigger와 menu 행에 44px 실제 영역을 확보하고,
  Enter로 열고 Escape로 닫은 뒤 직전 trigger로 focus를 돌려준다.
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

### 8.1 2026-09-02 반응형 재검증 이력

| 검증 | 관찰 | 결정과 근거 |
|---|---|---|
| `/dashboard` 1440·1280·1024·900px, light·dark | 전체 폭 가로 overflow와 계산 text 대비 실패 없음 | 기존 surface·token·breakpoint 유지 |
| `/dev/ui-kit` 업무 표 1024·900px, light·dark | 1024px에서 `653/653px`, 900px에서 `793/793px`로 scroll width와 client width가 같음 | 현재 열 구성은 내부 가로 scroll 없이 유지 |
| 900px overlay sidebar | 이식 직후 trigger `35px`, menu 행 `32px`로 44px 계약 미달 | mobile trigger와 menu 행만 `44px`로 확대하고 desktop의 `28px` trigger·`32px` 행 밀도는 유지 |
| keyboard walkthrough | Enter open, dialog 내부 focus, Escape close와 trigger focus return, desktop Ctrl+B state 전환 통과 | 기존 Radix Sheet와 keyboard state 소유권 유지 |

### 8.2 2026-09-03 로그인 surface 검증 이력

| 검증 | 관찰 | 결정과 근거 |
|---|---|---|
| `/login` 1440·1280·1024·900px, light·dark | 전체 폭 가로 overflow, 계산 text 대비 실패 없음 | 데모 인증 surface도 기존 token·breakpoint 계약 그대로 적용 |
| `/login` keyboard walkthrough | 첫 Tab이 skip link에 도달하고 Enter로 `#main-content`로 이동, 역할 button Tab 도달, focus ring 표시, Enter로 역할 로그인과 랜딩까지 완결 | role list button이 native button이라 별도 keyboard 처리 없이 표준 동작 유지 |
| 900px theme toggle | 기본 `size-9`(실측 40px)로 44px 계약 미달 | mobile에서만 `size-11`(44px)로 확대하고 desktop은 `size-9` 업무 밀도 유지. sidebar 44px 보정과 같은 방식 |
| skip link 터치 영역 | 실측 `132x36px`로 44px 미달이나 비포커스 시 화면 밖에 있고 keyboard 전용 경로 | pointer 조작 대상이 아니므로 44px 계약에서 제외. 첫 Tab 도달과 Enter 동작으로 대신 검증 |
| 로그인 실서버 E2E | 실DB seed 계정으로 로그인→역할 랜딩→허용 경로 접근→미허용 경로 `/forbidden` 차단→역할 전환→세션 무효 8/8 통과 | HttpOnly 세션과 route guard 계약이 실브라우저에서 동일하게 강제됨 |

skip link는 키보드 사용자의 반복 탐색 비용을 줄이는 보조 경로이므로 터치 영역
기준 대신 첫 포커스 도달성과 대상 이동만으로 검증한다. theme toggle은 로그인
surface와 업무 shell 양쪽 header에 모두 노출되는 지속적 컨트롤이므로 mobile 44px
계약을 공통으로 적용한다.

### 8.3 2026-09-03 실행 대기열·자재 LOT surface 설계 근거와 검증 이력

| 결정 | 근거 | 검증 |
|---|---|---|
| 준비 상태 배지 5종(`대기` neutral, `실행 가능` info, `진행 중` warning, `완료` success, `차단` danger) | `ManufacturingStatusSummary`가 이미 확정한 생산 진행 상태 언어(planned·ready·in-progress·completed)를 그대로 확장하고 차단만 danger로 추가했다. 새로운 색 체계를 만들지 않는다 | 실브라우저 E2E에서 라벨·톤 렌더 확인, 대비는 8.1과 동일 계산식으로 0 실패 |
| 대기열 열 구성: 작업지시·생산 LOT·공정(순서)·제품·계획수량·준비 상태·차단 사유 | `ui-layout-contracts` 3.3이 SCR-04A의 대상 식별자·현재 공정·핵심 수량 우선을 요구한다. 생산 LOT를 작업지시 다음에 두어 작업자가 LOT 단위로 공정을 찾는 흐름과 일치시켰다 | 헤더 7열 실측 일치, 900px 가로 overflow 0 |
| 차단 사유는 기계 판독 `reasonCodes`를 사람 라벨로 변환해 표시 | 도메인 계약이 `reasonCodes[]`를 기계 판독 계약으로 유지하고, 화면은 업무 언어로 설명해야 한다 | `MATERIAL_SHORTAGE`→자재 부족, `INSPECTION_HELD`→검사 보류 매핑이 e2e와 브라우저에서 동일 확인 |
| 자재 LOT 가용 0은 danger 배지, 만료·D-7 임박은 배지 구분 | 가용 부족이 자재 담당자의 조치 트리거라는 SCR-03 목적과 일치한다 | availability=expired 1행·QUARANTINED 1행 실측 |
| 목록 필터 상태는 전부 URL search가 소유 | route-contract 일반 규칙(공유 가능한 보기 상태는 search parameter) | 필터 적용 후 URL query와 표 행 수가 일치함을 E2E로 확인, 조건 초기화가 잔여 조건 없이 `''`로 돌아감 |

실행 대기열의 `READY`는 저장 상태가 아니라 계산 projection이라는 도메인 계약을
그대로 따르며, 이 surface는 읽기 전용이다. 공정 시작·완료 command는 SCR-04B에서
별도 확인 절차와 함께 추가된다.

### 8.4 2026-09-03 품질 검사 대기 surface 설계 근거와 검증 이력

| 결정 | 근거 | 검증 |
|---|---|---|
| 판정 배지 4종(`합격` success, `불합격` danger, `보류` warning, `미판정` neutral) | route-contract가 미판정을 verdict key 부재로 구분하므로 null 판정도 하나의 상태로 보여야 하고, 톤은 자재 LOT·대기열과 같은 위험 언어를 따른다 | PENDING 3건·PASS 3건·FAIL/HOLD 필터 결과가 e2e와 브라우저에서 일치 |
| 게이트 배지(`공정 진행` neutral, `LOT 완료` info) | LOT 완료 게이트가 작업지시 종결의 관문이라는 도메인 역할 차이를 색으로만 구분한다 | gate=LOT_COMPLETE 3행 실측 |
| 열 구성: 검사·생산 LOT·공정·게이트·검사 규격·작업지시·실행 상태·판정 | SCR-05A가 검사 대상을 우선순위대로 판정하는 화면임을 규정한다. 검사 식별자와 대상 LOT를 앞에 두고 규격명은 판정 근거로 함께 보여준다 | 헤더 8열 실측, 900px 가로 overflow 0 |
| 검사 규격명에 revision 명시(v3 등) | InspectionRequirement가 release snapshot이라는 도메인 계약에 따라 어떤 규격 version으로 판정했는지가 근거가 된다 | seed 규격명 렌더 확인 |

품질 검사 surface의 해상도 감사(1440·1024·900px, light·dark)에서 가로 overflow와
계산 텍스트 대비 실패는 0이었다. 44px 미만으로 측정된 요소는 모두 문서화된
기준에 속한다: skip link는 8.2의 면제 사유, 32px sidebar 행·28px desktop trigger는
8.1의 desktop 밀도 계약, 40px 입력·버튼은 token 표의 기본 밀도(터치 가능 영역을
함께 확보한다고 명시), 16px resize rail은 desktop 마우스 전용이며 1024px 미만에서는
렌더되지 않는다. 44px 터치 계약은 8.1·8.2에서 확정한 대로 1024px 미만의 지속적
탐색 컨트롤(sidebar 행, theme toggle)에 적용한다.

### 8.5 2026-09-03 감사 이벤트 surface 설계 근거와 검증 이력

| 결정 | 근거 | 검증 |
|---|---|---|
| 기본 정렬 `occurredAt desc` | 감사 이력은 최근 사건 확인이 기본 사용이고, 제품 계획 문서가 관리자의 질문을 "권한과 상태 변경이 정책대로 수행됐는가"로 정의한다 | 최근순 첫 행(검사 판정)이 e2e·브라우저에서 동일 |
| 열 구성: 시각·행위자(이름+역할)·행동·대상(유형+식별자)·내용·요청 ID | 감사 가능성 계약이 행위자·시각·사유 보존을 요구하고, route-contract가 requestId로 한 transaction 추적을 규정한다 | 헤더 6열 실측, 900px 가로 overflow 0 |
| 행동 라벨은 텍스트로 표시하고 색 배지를 쓰지 않는다 | 감사 행동은 위험도가 아니라 사실 기록이므로 생산·품질 상태와 같은 위험 언어를 빌려 오해를 만들지 않는다 | 8종 행동 라벨 렌더 확인 |
| 시각은 Asia/Seoul로 표시하고 `dateTime` 속성에 ISO 값을 유지 | route-contract의 일자 경계 규칙과 동일하게 사람에게는 서울 시각, 기계에는 ISO를 제공한다 | `<time dateTime>` 속성 실측 |
| 감사 행동 enum 8종을 MVP 세트로 정의 | 계약은 audit action enum을 요구하지만 범위를 명시하지 않았다. 현재 구현된 읽기 세로축(작업지시·자재·검사·세션)에서 발생 가능한 행동만 포함하고 command 확장 시 함께 확장한다 | seed 10건이 전 행동을 커버 |

### 8.6 2026-09-03 운영 대시보드 실데이터 전환 근거와 검증 이력

| 결정 | 근거 | 검증 |
|---|---|---|
| 지표 카드 4종을 서버 집계로 교체 (진행 중 작업지시·생산 LOT·검사 대기·격리·부족 자재) | 기존 하드코딩 값은 조회 결과와 무관해 신뢰 근거가 없었다. 각 값은 seed 전체에서 실제 count로 계산된다 | e2e에서 seed 기댓값(inProgress 3·blocked 2·검사 대기 3 등)과 일치 확인 |
| 주간 차트를 "납기 계획 대비 진행"으로 재정의 | 완료 실적 원장이 아직 없어 종래의 계획 대비 완료 차트는 조작될 수밖에 없었다. 납기일 기준 계획 수량과 진행률 반영 수량은 현재 데이터로 정직하게 계산된다 | weekly 합계와 progressbar 값의 일치를 e2e로 검증 |
| 조치 큐를 차단 작업지시→LOT 완료 게이트 검사 대기→납기 임박 순서로 구성 | SCR-01A가 "오늘 지연·차단된 작업"을 관리자 질문으로 규정한다. 위험도 순서로 정렬하고 최대 5건 | 차단 2건(WO-2026-092·098)이 큐 상단에 실측 |
| 데이터 갱신 시각을 응답 수신 시각으로 표시 | ui-layout-contracts가 "실제 timestamp를 받은 화면의 data panel"에만 갱신 시각 표시를 허용한다 | `<time>` 요소 렌더 확인 |
| `due=overdue` 필터에서 완료·취소 작업지시 제외 | 납기 지연은 미완료 상태의 위험이다. 완료된 작업의 과거 납기는 지연이 아니다. 대시보드 overdue 집계와 목록 필터 정의를 일치시켰다 | 목록 e2e 기댓값 갱신(2→1)으로 양쪽 정의 일치 확인 |

### 8.7 2026-09-03 작업지시 command surface 설계 근거와 검증 이력

| 결정 | 근거 | 검증 |
|---|---|---|
| 발행은 ConfirmDialog, 취소는 사유 입력 폼으로 분리 | route-contract가 위험 행동의 대상·영향·사유 재확인을 요구한다. 발행은 대상·영향 고지로 충분하지만 취소는 사유가 감사 계약의 필수 값이다 | e2e에서 사유 2자 미만 400, 브라우저에서 사유 없으면 버튼 비활성 |
| command 버튼은 상태·권한 조건을 모두 충족할 때만 노출 | route-contract 3.2: 권한이 없으면 숨기기만 하지 않고 필요한 권한과 현재 상태를 설명한다. 발행 권한이 없는 관찰자에게는 안내문을 보여준다 | 현장 작업자의 생성 라우트 차단, 발행 권한 없는 역할 안내문 렌더 |
| 감사 이력을 모든 command와 같은 transaction 흐름에 기록 | 감사 가능성 계약(행위자·시각·사유)이 상태 변경의 전후 값 보존을 요구한다. 생성·발행·취소 각각 WORK_ORDER_* 감사를 남긴다 | 상세 변경 이력과 /audit-events에서 command 흔적 실측 |
| 오류는 계약 code로 구분해 복구 상태를 다르게 한다 | route-contract 392: 403·404·409·5xx가 서로 다른 복구 상태를 보인다. NOT_DRAFT·NOT_CANCELLABLE·HAS_EXECUTION를 409 code로 분리 | e2e에서 상태머신 거부 3종 409 code 검증 |
| MVP 발행 검증은 현재 도메인 모델이 지원하는 범위로 한정 | BOM·공정 route revision 원장이 아직 없어 release snapshot 계약 전체를 검증할 수 없다. 초안 상태·계획수량·납기 유효성을 검증하고 revision 원장은 BOM 화면군과 함께 확장한다 | 납기 과거 400·비초안 409 검증, 한계를 이 표에 명시 |

### 8.8 2026-09-03 자재 예약 surface 설계 근거와 검증 이력

| 결정 | 근거 | 검증 |
|---|---|---|
| 예약 패널을 작업지시 상세에 배치 | route-contract가 예약 화면을 `/work-orders/$id/material-reservations`로 두지만 MVP는 상태 맥락(발행 여부)과 같은 화면에서 판단하는 것이 오조작을 줄인다. 별도 라우트는 요구사항 강조 기능이 필요할 때 분리한다 | 자재 담당자가 발행 지시 상세에서 즉시 예약·해제를 완료 |
| 예약 가능 LOT은 가용 필터 결과만 노출 | 도메인 계약이 ACCEPTED·미만료·가용 잔량 예약만 허용한다. 품질 통제·만료 LOT는 선택 단계에서 제외하고 서버가 다시 검증한다 | QUARANTINED 409·가용 초과 409 e2e, 브라우저에서 가용 LOT만 옵션 표시 |
| 서버는 예약 시점에 가용량을 transaction 안에서 재검증 | 동시 command로 조건이 달라지면 명시적 거부가 계약이다. LOT 잔량 증감과 allocation 생성을 같은 transaction으로 실행한다 | e2e에서 reservedQuantity 실측 증감, 해제 후 감소 |
| 예약·해제 권한이 없으면 현황 조회와 권한 설명만 제공 | route-contract 3.2의 권한 안내 규칙을 예약에도 동일 적용한다 | planner에게 안내문 표시, 예약 폼 미노출 실측 |
| fetch abort 경쟁 방지 가드를 모든 panel effect에 적용 | 생성 페이지에서 발견한 동일 결함 클래스(StrictMode 이중 effect에서 첫 fetch의 abort가 상태를 덮어씀)를 재발 방지 | 기본 LOT 선택이 안정적으로 설정됨을 브라우저 E2E로 확인 |

### 8.9 2026-09-03 공정 실행 command surface 설계 근거와 검증 이력

| 결정 | 근거 | 검증 |
|---|---|---|
| 시작 버튼은 행 안에, 완료 실적은 표 아래 확장 폼으로 분리 | 시작은 한 번의 확인으로 충분하지만 완료는 양품·불량·메모 입력이 계약상 필수다. 대기열 행 밀도를 유지하면서 입력 오류를 방지한다 | 브라우저에서 시작→행 상태 전환→완료 폼 제출→목록 갱신까지 실측 |
| 시작 시 활성 예약을 출고·소비로 전환 | 도메인 계약이 "실제 투입과 공정 시작이 같은 transaction에서 성공할 때만 진행"을 요구한다. MVP는 예약 전체를 출고로 전환해 원장 카운터에 반영한다 | e2e에서 onHand·예약·소비 수량 증감 실측, allocation CLOSED(FULFILLED) |
| 완료 시 다음 대기 공정을 실행 가능으로 승격하고 작업지시 진행률을 재계산 | 후속 공정의 READY는 선행 완료에서 유도된다는 계약의 projection이다. 차단 사유가 있는 공정은 승격하지 않는다 | 완료 후 다음 공정 READY·progressPercent 갱신 실측, blockedReasonCodes 보존 |
| 실행 권한이 없으면 행동 열 자체를 제외 | 관찰자에게 실행 UI는 혼란만 더한다. route-contract의 권한 안내 규칙은 버튼이 존재해야 설명하는 화면에만 적용한다 | 품질 담당자에게 행동 열 미표시 실측 |

### 8.10 2026-09-03 검사 판정 command surface 설계 근거와 검증 이력

| 결정 | 근거 | 검증 |
|---|---|---|
| 판정 선택지를 PASS·FAIL·HOLD로 한정하고 완료 상태와 판정을 함께 기록 | 도메인 계약이 COMPLETED 검사는 반드시 판정을 가진다고 규정한다. 실행 상태와 판정을 한 enum에 섞지 않는다 | 미판정→판정 후 COMPLETED+verdict 실측, 재판정 409 |
| FAIL·HOLD 선택 시 품질 처분·재측정 경고를 판정 확정 전에 표시 | FAIL은 자동 처분이 아니라 품질 담당자의 후속 처분 대상이라는 계약을 UI 언어로 미리 알린다 | jsdom userEvent로 FAIL·HOLD 경고 렌더 검증 |
| 공정 완료의 다음 공정 승격을 ROUTE_ADVANCE 검사 게이트로 연결 | 유효 판정이 FAIL·HOLD이면 다음 공정을 거부한다는 계약의 첫 구현. 미판정·불합격·보류를 INSPECTION_PENDING·FAILED·HELD reasonCodes로 기록하고 취소 검사는 제외한다 | e2e에서 미판정 검사가 승격을 BLOCKED로 차단 실측 |
| 이미 판정된 검사는 정정 흐름으로 유도 | 원 검사를 수정하지 않고 정정 chain으로 계약. 정정 UI는 후속 슬라이스 | 409 INSPECTION_ALREADY_VERDICTED 코드 유지 |
| 브라우저 E2E는 기본 PASS 종단 흐름, 선택 UI는 jsdom 검증으로 분리 | headless CDP×Radix Select 선택 경합은 검증 도구 한계로 실제 결함이 아니다. 위험 경로(FAIL 경고·전송 값)는 userEvent가 신뢰되는 jsdom에서 증명한다 | 브라우저 8/8 + jsdom 3/3 |

모바일 rail은 좁은 edge target을 추가하므로 overlay에서는 숨긴다. 외부 영역 클릭,
Escape와 메뉴 선택 닫기가 이미 같은 복구 경로를 제공하므로 기능 손실 없이 오조작
가능성만 줄인다.

### 8.11 2026-09-04 간격·색상 리프레시 검증 이력

- 근거: 2.7·2.8 절. 브랜치 `design/visual-refresh`.
- 검증: 로그인·대시보드·작업지시 목록/상세·자재 LOT 목록/상세·검사 목록/상세·
  부적합·계보 상세·공정 실행(완료 입력 Sheet)을 1440px, 대시보드·작업지시를
  1024px, 대시보드를 dark 로 캡처해 비교했다. Pretendard 로드는
  `document.fonts.check` 로 확인했다.
- 자동 검사: web typecheck·lint·vitest 93건, api vitest 131건, docs:check 통과.
- 흔들림 측정: Playwright `PerformanceObserver("layout-shift")` 로 로그인→목록→
  필터 변경→상세→새로고침을 400ms API 지연 조건에서 재었을 때 CLS 합계 0.001
  이하. 남은 흔들림은 레이아웃 시프트가 아니라 (1) 재조회 시 스켈레톤 교체 깜빡임,
  (2) 새로고침 시 Pretendard `font-display: swap` 교체였다. (1)은 이전 결과 유지로
  해결했고 (2)는 dynamic subset 특성상 남는다. 정적 subset 하나를 preload 하는
  방안은 2MB 이상이라 보류한다.
- 남은 항목: 사이드바 그룹 간격은 shadcn 기본값을 유지했다. 1024px 미만 표의
  가로 스크롤은 `DataTable` 컨테이너가 담당한다.

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
