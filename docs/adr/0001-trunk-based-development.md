# ADR-0001: 짧은 브랜치와 squash merge를 사용한다

- Status: Accepted
- Date: 2026-08-31
- Owners: wooinwoo
- Related: 저장소 초기화

## Context

이 프로젝트는 한 명이 빠르게 구현하지만, 채용 포트폴리오로서 요구사항·결정·검증 과정이 리뷰 가능해야 합니다. 장기간 유지되는 기능 브랜치는 통합을 늦추고, Git Flow의 다수 영구 브랜치는 현재 배포 흐름에 불필요한 관리비용을 만듭니다.

## Decision drivers

- `main`을 항상 실행 가능한 상태로 유지
- Issue부터 배포 가능한 변경까지의 추적성
- 작은 변경 단위와 읽기 쉬운 최종 이력
- 1인 개발에서도 실제 팀에 적용 가능한 절차

## Considered options

1. `develop`, release, hotfix 브랜치를 운영하는 Git Flow
2. 기능 브랜치를 직접 merge하는 방식
3. 짧은 기능 브랜치와 Pull Request를 사용하는 trunk-based development

## Decision

Issue 번호가 포함된 짧은 브랜치를 만들고 Pull Request를 통해 `main`에 squash merge합니다. `main` 직접 push, force push, merge commit과 rebase merge는 허용하지 않습니다.

1인 프로젝트이므로 형식적인 승인자 수는 요구하지 않습니다. 대신 자동 검사, 자체 리뷰, 미해결 대화 해소를 병합 조건으로 사용합니다.

## Consequences

### Positive

- Issue, Pull Request, 최종 commit이 하나의 변경 단위로 연결됩니다.
- 최종 이력이 제품 변경 중심으로 간결하게 유지됩니다.
- 브랜치 간 장기 충돌과 별도 release 브랜치 비용이 없습니다.

### Negative

- 큰 기능을 작고 완결된 수직 흐름으로 나누는 설계가 필요합니다.
- 승인 리뷰 대신 테스트와 자체 검토 근거의 품질을 더 엄격히 관리해야 합니다.

## Validation

- 모든 초기화 이후 변경이 Issue와 Pull Request를 통해 병합되는지 확인합니다.
- PR이 평균 2일 이내에 병합되고 장기 브랜치가 남지 않는지 확인합니다.
- 각 PR에서 acceptance criteria와 검증 근거를 재현할 수 있는지 확인합니다.
