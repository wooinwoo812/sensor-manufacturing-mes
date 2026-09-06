# Engineering Workflow

## 1. 개발 방식

`main`을 항상 배포 가능한 상태로 유지하는 trunk-based development를 사용합니다. 브랜치는 하나의 Issue를 해결하는 짧은 수명으로 운영하고 Pull Request를 통해서만 병합합니다.

초기 저장소 기반을 만드는 첫 커밋만 `main`에 직접 반영하며, 이후 직접 push와 force push를 금지합니다.

## 2. 브랜치 규칙

형식은 `<type>/<issue-number>-<short-slug>`입니다.

```text
feat/12-work-order-lifecycle
fix/31-inventory-race-condition
docs/7-domain-glossary
chore/4-ci-bootstrap
spike/18-realtime-transport
```

허용 type은 `feat`, `fix`, `refactor`, `test`, `docs`, `build`, `ci`, `chore`, `perf`, `spike`입니다. slug는 소문자 kebab-case 영어를 사용합니다.

## 3. Commit 규칙

[Conventional Commits](https://www.conventionalcommits.org/) 형식을 사용합니다.

```text
<type>(<scope>): <imperative summary>
```

예시:

```text
feat(production): add work-order state transitions
fix(inventory): prevent duplicate material consumption
test(quality): cover rejected-lot quarantine flow
docs(adr): record transaction-boundary decision
```

### type

| type | 용도 |
|---|---|
| `feat` | 사용자 또는 도메인 기능 |
| `fix` | 잘못된 동작 수정 |
| `refactor` | 동작 변경 없는 구조 개선 |
| `perf` | 성능 개선 |
| `test` | 테스트 추가·수정 |
| `docs` | 문서만 변경 |
| `build` | 빌드·의존성 구성 |
| `ci` | 자동화 파이프라인 |
| `chore` | 위 분류에 속하지 않는 유지보수 |
| `revert` | 기존 변경 되돌림 |

### scope

우선 사용하는 scope는 `web`, `api`, `domain`, `production`, `inventory`, `quality`, `traceability`, `auth`, `db`, `infra`, `repo`, `docs`입니다. 의미 없는 scope는 생략합니다.

### 작성 기준

- summary는 명령형 영어로 작성하고 마침표를 붙이지 않습니다.
- header는 72자 이내를 목표로 합니다.
- 한 커밋은 되돌릴 수 있는 하나의 논리적 변경만 포함합니다.
- `why`가 diff에서 드러나지 않으면 본문에 배경과 트레이드오프를 작성합니다.
- Issue 연결은 `Refs #12`, 완료는 Pull Request 본문의 `Closes #12`로 관리합니다.
- 호환성을 깨는 변경은 `BREAKING CHANGE:` footer를 사용합니다.

## 4. Issue 규칙

Issue는 구현 목록이 아니라 해결할 문제와 완료 계약입니다.

### Definition of Ready

- 사용자 또는 시스템 문제가 한 문장으로 설명되어 있다.
- 포함 범위와 비범위가 구분되어 있다.
- 검증 가능한 acceptance criteria가 있다.
- 관련 도메인 불변조건과 데이터 영향이 기록되어 있다.
- 미결정 사항은 Spike 또는 ADR 대상으로 분리되어 있다.

### 종류

- Feature: 사용자 가치와 업무 흐름 추가
- Bug: 기대 결과와 실제 결과가 다른 재현 가능한 결함
- Spike: 시간 제한을 둔 조사와 명시적 결론
- Chore/Docs: 기능 외의 저장소·문서·개발환경 작업

Epic은 여러 Issue의 진행 순서와 성공 기준만 관리하며 구현 세부사항을 중복 작성하지 않습니다.

## 5. Pull Request 규칙

### 제목

Squash commit으로 사용되므로 Conventional Commit 형식을 따릅니다.

```text
feat(production): implement work-order lifecycle
```

### 크기와 범위

- 하나의 PR은 하나의 Issue 또는 독립된 결정만 해결합니다.
- 리뷰 가능한 기준으로 순수 변경 400줄 이하를 목표로 합니다.
- 생성 파일, lockfile, migration 때문에 커지면 본문에 이유와 읽는 순서를 적습니다.
- 큰 기능은 데이터 모델, API, UI를 무조건 분리하지 않고 각 PR이 검증 가능한 수직 흐름을 갖도록 나눕니다.

### 필수 근거

- 연결 Issue와 acceptance criteria 대응표
- 변경한 도메인 규칙과 보존한 불변조건
- 실행한 자동 검사와 수동 시나리오 결과
- UI 변경의 정상·로딩·빈 값·오류 상태 스크린샷
- 위험, migration, 배포·rollback 고려사항

Draft PR을 일찍 열어 범위와 설계 결정을 기록하고, 자체 리뷰가 끝난 뒤 Ready로 전환합니다. 미해결 대화와 실패한 검사가 있으면 병합하지 않습니다.

## 6. 병합 규칙

- `main`에는 Pull Request만 squash merge합니다.
- merge commit과 rebase merge는 사용하지 않습니다.
- PR 제목을 최종 squash commit 제목으로 사용합니다.
- 병합 후 원격 브랜치를 자동 삭제합니다.
- 긴급 수정도 Bug Issue와 Pull Request를 생략하지 않습니다.

## 7. Definition of Done

- acceptance criteria를 모두 충족했다.
- 관련 도메인 불변조건을 자동 테스트로 검증했다.
- lint, typecheck, test, build가 통과했다.
- UI는 키보드 접근과 정상·로딩·빈 값·오류·권한 상태를 확인했다.
- schema/API 변경과 migration·rollback 영향을 기록했다.
- 로그에 필요한 식별자와 실패 사유가 남고 비밀·개인정보는 남지 않는다.
- 사용자 또는 개발자 문서가 현재 동작과 일치한다.
- PR 자체 리뷰와 모든 대화를 완료했다.

## 8. 의사결정 기록

되돌리기 어렵거나 여러 기능에 영향을 주는 기술·도메인 결정은 `docs/adr`에 ADR로 남깁니다. 단순 라이브러리 사용까지 ADR을 만들지 않으며, 선택지와 결과가 실제로 존재할 때만 작성합니다.

```text
여러 기능에 영향을 주거나 되돌리기 어려운가?
├─ 예
│  ├─ 구현 가능성·성능이 불확실한가? → 기한과 종료조건이 있는 Spike
│  └─ 비교 가능한 근거가 있는가?     → ADR
└─ 아니오
   ├─ 현재 PR 안에서 되돌릴 수 있는가? → PR의 문제와 결정에 기록
   └─ 별도 사용자 가치가 있는가?       → 독립 Issue로 분리
```

ADR은 선택한 기술 이름만 기록하지 않습니다. 문제와 제약, 공개 근거와 프로젝트 가정, 실제 후보, 선정 이유, 기각 이유, 수용한 단점, 검증 방법과 재검토 조건을 포함합니다. 채용 시장의 인지도는 제품 적합성·안전성·검증 가능성보다 우선하는 단독 선정 이유로 사용하지 않습니다.

## 9. 포트폴리오 적합성 검토

2026-09-05 사용자 요청: 작업을 이어갈 때 포트폴리오로서 적절한지 계속 검토합니다. 이는 별도 기능을 무조건 늘리라는 요청이 아니며, 기존 업무·권한·변경 승인 범위를 넓히지 않습니다.

기능·디자인·문서 변경 전과 완료 시 아래 질문을 확인합니다.

1. **문제:** 어떤 담당자의 어떤 불편이나 데이터 위험을 해결하는가? 그럴듯한 화면을 추가하는 것만으로 끝나지 않는가?
2. **역량:** 어떤 설계·구현 능력을 보여주는가? 대안과 선택 이유를 코드와 함께 설명할 수 있는가?
3. **근거:** 재현 가능한 실행 순서, 코드·테스트 위치, 필요한 경우 변경 전후 측정이 있는가? 정상뿐 아니라 실패·권한·복구도 확인했는가?
4. **전달:** README의 소개와 5분 데모에서 핵심 흐름을 찾을 수 있는가? 세부 설명은 연결된 기술 문서에서 더 읽을 수 있는가?
5. **비용:** 프로젝트 규모에 맞는가? 중복 문서·빈 폴더·불필요한 추상화·유지보수 대상만 늘리지 않는가?
6. **정직성:** 가상 시나리오, 미구현 계획, 로컬 검증과 실제 운영 경험을 구분했는가? 사용자가 본인의 기여와 설계 이유를 설명할 수 있는가?

검토 결론은 진행·축소/수정·보류 중 하나와 이유를 짧게 남깁니다. 결정을 위해 별도 보고서를 매번 생성하지 않고 현재 작업 설명이나 PR의 근거에 포함합니다. 모든 개선에 정량 수치를 억지로 붙이지 않으며 수치를 제시할 때만 측정 조건과 재현 근거를 함께 기록합니다.

### 문서 구조에 적용하는 기준

- 현재 문서를 목록화하고 독자별 읽는 순서와 최신 기준을 연결하는 작업을 폴더 세분화보다 먼저 합니다.
- 현재 문서의 책임과 중복을 확인한 뒤 실제 내용이 모인 범주만 나눕니다. 백엔드·DB·운영 폴더를 채울 내용 없이 미리 만들지 않습니다.
- API 호출 최적화 설명은 엔드포인트별 API 명세를 대체하지 않습니다. 명세와 DB 설명은 실제 구현을 근거로 작성하고 코드와 별개의 복제 원본을 만들지 않습니다.
- 업무 가이드는 담당자가 업무 기록을 읽는 데 필요한 내용을 우선합니다. 개발 문서 전체를 업무 화면에 노출하거나 별도 문서 포털을 만드는 일은 탐색 필요와 유지 비용을 확인한 뒤 판단합니다.
- 최신 계약과 과거 인수인계는 구분하되, 이동은 기존 링크·원문 import·웹 표시·문서 검사를 함께 갱신할 수 있을 때 수행합니다.

포트폴리오 설명은 문제 → 선택과 대안 → 실제 구현 → 검증 → 한계 순서로 정리합니다. 기능 수, 문서 수, 테스트 개수만으로 완성도를 주장하지 않습니다.
