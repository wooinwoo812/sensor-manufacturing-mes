# ADR-0005: Tailwind CSS와 Radix 기반 code-owned 디자인 시스템을 사용한다

- Status: Proposed
- Date: 2026-09-01
- Owners: wooinwoo
- Related: #9, #25, #28

## Context

작업지시, 자재 LOT, 공정 실행, 검사와 계보 화면은 표·폼·상태·오류 복구를 반복해서 사용한다. 각 기능이 색, 간격, focus와 상태 badge를 따로 구현하면 업무 의미가 화면마다 달라지고 접근성 수정이 중복된다.

이 제품은 소비자용 dashboard가 아니라 1024px 이상의 현장·관리 화면에서 높은 정보 밀도와 명시적인 실패 복구를 다루는 업무시스템이다. 생산 진행, 마지막 검사 판정과 현재 품질 disposition은 동시에 존재하므로 하나의 종합 상태나 색 하나로 축약할 수 없다.

[`shadcn-admin`](https://github.com/satnaing/shadcn-admin)은 반응형 sidebar와 업무형 화면 구성의 참고 기준으로 검토했지만 MES 정보구조, 역할, 상태와 route가 다르다. 외부 starter를 통째로 복사하면 빠른 화면 생성과 함께 demo domain, fake data와 update 비용도 소유하게 된다.

## Decision drivers

- keyboard와 screen reader 동작을 기능 PR마다 다시 구현하지 않는다.
- MES 상태축과 높은 정보 밀도에 맞게 markup과 token을 수정할 수 있어야 한다.
- 완성형 UI library의 시각 언어와 대규모 runtime을 강제하지 않는다.
- raw color와 임의 spacing이 기능 slice로 퍼지지 않아야 한다.
- 외부 source를 사용하면 provenance와 license를 파일 단위로 추적할 수 있어야 한다.
- component showcase와 제품 화면이 같은 source를 사용해야 한다.
- 선택 이유, 비용과 재검토 조건을 코드와 테스트로 검증할 수 있어야 한다.

## Evidence and assumptions

- [Tailwind CSS Vite 설치 문서](https://tailwindcss.com/docs/installation/using-vite)는 전용 Vite plugin과 CSS `@import` 기반 구성을 제공한다.
- [Tailwind CSS theme variables](https://tailwindcss.com/docs/theme)는 CSS variable을 utility token의 진실 공급원으로 사용할 수 있게 한다.
- [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog)는 focus trap, Escape close, title·description announcement와 WAI-ARIA Dialog pattern을 제공한다.
- [Radix Select](https://www.radix-ui.com/primitives/docs/components/select)는 keyboard navigation과 typeahead를 제공하면서 rendering과 style ownership은 호출자에게 둔다.
- [Radix Toast](https://www.radix-ui.com/primitives/docs/components/toast)는 hover·focus·window blur 중 자동 닫힘 중지와 screen reader announcement를 제공한다.
- [`shadcn-admin@e16c87f`](https://github.com/satnaing/shadcn-admin/commit/e16c87f213a5ba5e45964e9b67c792105ec74d26)를 고정 기준으로 삼아 UI·layout·context·hook·style source 123개를 원본 snapshot으로 보존했다. 활성 제품 code에는 primitive 30개와 data-table module 7개를 먼저 FSD `shared` layer로 이동했다.
- primitive가 접근성을 자동으로 완성한다는 가정은 하지 않는다. 우리 label, error message, heading과 업무 문맥은 component·axe·keyboard test로 별도 검증한다.

## Considered options

### 1. MUI·Ant Design 같은 완성형 UI library

- 장점: form, table, dialog와 theme API가 한 package에서 제공된다.
- 비용: 제품 전체가 library의 markup·visual language·upgrade cycle을 따른다.
- 기각 이유: 세 상태축과 MES 표 밀도를 맞추기 위한 override가 늘고, 사용하지 않는 범용 기능까지 설계 경계가 된다.
- 더 적합한 조건: 납기가 customization보다 절대적으로 우선하고 library 기본 외형을 제품 표준으로 승인할 때 재검토한다.

### 2. Tailwind CSS + Radix primitive + local component

- 장점: 접근성 동작은 검증된 primitive를 사용하고 visual·markup·token은 저장소가 소유한다.
- 장점: 필요한 primitive만 설치하고 FSD `shared/ui` public API로 제한할 수 있다.
- 비용: variant, token 문서, test와 update 판단을 직접 유지한다.
- 판정: 채택한다.

### 3. CSS Modules와 모든 interactive component 직접 구현

- 장점: dependency와 abstraction이 가장 적다.
- 기각 이유: focus trap, portal, Escape, typeahead와 toast announcement를 다시 구현하는 비용이 MES 차별점에 기여하지 않는다.

### 4. `shadcn-admin` 전체 fork

- 장점: 완성된 shell과 예제 화면을 가장 빨리 얻는다.
- 기각 이유: task·user·chat·settings·auth demo를 제거하고 upstream 변경을 추적하는 비용이 선별 구현보다 크다.
- 사용 범위: layout density, responsive sidebar와 navigation hierarchy를 참고하되 MES shell을 local token과 route로 다시 구현한다.

## Decision tree

```text
사용자 interaction이 없는 단순 layout인가?
├─ 예 → semantic HTML + Tailwind token
└─ 아니오
   └─ WAI-ARIA keyboard pattern을 검증한 primitive가 있는가?
      ├─ 예 → Radix primitive를 shared/ui로 감싸고 local style 적용
      └─ 아니오 → 직접 구현하되 keyboard·screen reader test를 먼저 정의

component가 MES domain enum을 알아야 하는가?
├─ 예 → entities 또는 feature에서 shared primitive를 조합
└─ 아니오 → shared/ui

외부 source를 실질적으로 복사·수정하는가?
├─ 예 → source commit·path·license를 THIRD_PARTY_NOTICES와 header에 기록
└─ 아니오 → 참고 근거만 ADR에 기록
```

## Decision

- Tailwind CSS 4의 Vite plugin을 사용하고 `app/styles/tokens.css`를 visual token의 단일 진실 공급원으로 둔다.
- Radix는 Dialog, Select, Slot과 Toast처럼 keyboard·focus·portal 동작이 필요한 primitive에만 사용한다.
- `class-variance-authority`, `clsx`, `tailwind-merge`로 variant와 호출부 class를 예측 가능하게 합성한다.
- icon은 Lucide 한 종류로 제한하고 의미는 text label과 함께 제공한다.
- generic component는 `shared/ui`, 제조 상태 조합은 `entities/manufacturing-status`, shell은 `widgets/app-shell`이 소유한다.
- `apps/web/vendor/shadcn-admin`에 고정 revision의 원본 UI source를 보존하고 build·test·lint 대상에서는 제외한다. 실제 제품 code는 이 snapshot에서 FSD layer로 이동한 뒤 MES token·route·접근성 문구와 test를 적용한다.
- 이동한 각 source에는 원본 revision과 MIT provenance header를 유지하며 전체 license는 `THIRD_PARTY_NOTICES.md`에 기록한다.
- dark mode는 #9 비범위다. 대비와 상태 의미를 충족한 light 업무 화면을 먼저 고정한다.
- dependency version은 lockfile뿐 아니라 `apps/web/package.json`에도 정확히 고정한다.

### 상태 표현

- generic `Badge`는 tone과 icon만 알고 domain enum을 모른다.
- `ManufacturingStatusSummary`가 생산 진행, 최근 검사와 품질 disposition을 독립된 `dt`·`dd`로 조합한다.
- 색을 제거해도 label과 icon으로 의미를 구분할 수 있어야 한다.
- 위험 행동은 `danger` variant, 명시적 동사와 confirmation dialog를 함께 사용한다.

### 반응형

- 1440px: 240px sidebar와 넓은 업무 표를 유지한다.
- 1280px: 208px sidebar로 줄이되 menu label을 icon만으로 대체하지 않는다.
- 1024px: 같은 route와 상태를 유지하고 공정 대상·대표 행동을 우선한다.
- 1024px 미만: sidebar를 modal navigation으로 전환한다. 이는 모바일 전용 IA가 아니라 접근 가능한 fallback이다.

## Consequences

### Positive

- 업무 상태와 위험 행동이 기능마다 같은 언어를 사용한다.
- focus, dialog, select와 toast 동작을 검증된 primitive 위에서 확장한다.
- CSS token을 바꾸면 shell과 모든 component가 함께 갱신된다.
- 외부 admin template의 원본과 우리 수정 범위를 Git diff로 추적할 수 있다.
- demo domain은 원본 snapshot에는 보존하되 runtime route와 제품 public API에는 노출하지 않는다.
- FSD 검사로 기능 layer가 shared UI 내부 구현을 deep import하지 못한다.

### Negative

- 완성형 library보다 초기 component 작성과 문서 비용이 크다.
- Tailwind·Radix major update 시 token과 wrapper test를 직접 재검증해야 한다.
- generic component와 domain component의 경계를 리뷰에서 계속 지켜야 한다.
- 현재 자동 접근성 검사는 DOM 규칙 중심이며 실제 color contrast와 viewport는 브라우저 근거가 추가로 필요하다.

## Validation

- Vitest·Testing Library로 loading button, label·error, dialog keyboard와 table empty state를 검증한다.
- axe-core로 `/dev/ui-kit` 기본 상태의 자동 접근성 위반을 검사한다.
- FSD 검사로 역방향 layer, same-layer cross-slice와 public API 우회 import를 실패시킨다.
- `/dev/ui-kit`에서 button, input, status, metric, filter, table, loading·empty·error·forbidden·conflict 상태를 같은 component로 확인한다.
- production build에서 `/dev/ui-kit` 직접 접근은 not-found로 처리한다.
- 1440·1280·1024px screenshot과 keyboard walkthrough는 브라우저 실행 근거로 남긴다.
- lint, typecheck, test, build와 `git diff --check`를 통과한다.

## Revisit triggers

- 세 기능 이상에서 같은 고급 table 동작을 별도로 구현한다.
- Radix wrapper가 요구 markup을 막거나 측정된 bundle 병목이 된다.
- dark mode 또는 고대비 mode가 실제 사용자 요구가 된다.
- 1024px 현장 검증에서 sidebar와 대표 행동 우선순위가 실패한다.
- 외부 UI 이식량이 local 구현량보다 커져 provenance·update 비용이 반복된다.
