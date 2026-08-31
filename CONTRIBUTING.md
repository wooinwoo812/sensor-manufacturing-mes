# Contributing

이 저장소는 실제 제품팀에 가까운 의사결정과 변경 이력을 남기는 것을 목표로 합니다. 세부 규칙은 [Engineering Workflow](docs/engineering/workflow.md)를 기준으로 합니다.

## 기본 원칙

1. 기능·버그·조사는 구현 전에 Issue로 문제와 완료 조건을 정의합니다.
2. `main`에서 직접 작업하지 않고 Issue 번호를 포함한 짧은 브랜치를 사용합니다.
3. 한 Pull Request는 하나의 사용자 가치 또는 하나의 기술적 결정을 완결합니다.
4. 코드보다 먼저 도메인 불변조건과 실패·빈 상태·권한 차이를 확인합니다.
5. 변경 사실이 아니라 변경 이유와 검증 근거를 남깁니다.

오탈자처럼 동작을 바꾸지 않는 극소수 문서 수정만 Issue 생성을 생략할 수 있습니다.

## 빠른 절차

```text
Issue 작성
  → feat/12-work-order-lifecycle 브랜치
  → 작은 논리 단위의 Conventional Commit
  → Draft PR과 자체 검토
  → 자동 검사·수동 시나리오 근거 첨부
  → Squash merge
```

## 품질 기준

코드가 추가된 이후 모든 PR은 적용 가능한 `lint`, `typecheck`, `test`, `build` 검사를 통과해야 합니다. 사용자 화면 변경에는 정상·로딩·빈 값·오류·권한 없음 상태를 확인하고 스크린샷 또는 영상을 첨부합니다.
