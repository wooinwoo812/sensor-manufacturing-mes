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
