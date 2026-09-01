# Sensor Manufacturing MES

> 센서 제조의 생산·자재·품질·LOT 이력을 하나의 흐름으로 연결하는 웹 기반 MES

`Sensor Manufacturing MES`는 고신뢰성 센서 제조를 가상 시나리오로 삼아, 작업지시부터 공정 실적·품질 판정·재고·LOT 계보까지 추적하는 업무시스템입니다.

현재 상태: **설계 및 기반 구축 중**

## 핵심 시나리오

```text
작업지시 릴리스 → 자재 예약 → 실제 출고·투입 → 공정 실적
                → 품질검사 → 품질 처분 → 완료·사용 가능 판정
```

불합격 자재 LOT가 발견되면 해당 자재를 사용한 생산 LOT와 완제품을 downstream으로 추적하고, 영향 범위를 격리하는 흐름까지 구현합니다.

## 이 프로젝트가 증명하는 것

- React와 TypeScript로 복잡한 테이블·폼·상태 전이를 다루는 프론트엔드 역량
- API·데이터베이스·트랜잭션을 포함한 Full Stack 구현 역량
- 생산·자재·품질 업무를 데이터 모델과 불변조건으로 해석하는 능력
- 이슈, ADR, 테스트 근거, Pull Request를 통해 의사결정을 추적하는 개발 방식

## 예정 기술 구성

- Web: React, TypeScript, Vite, TanStack Query, TanStack Table
- API: Node.js, NestJS, REST API
- Data: PostgreSQL, Prisma
- Quality: Vitest, Playwright, ESLint, TypeScript
- Delivery: Docker Compose, GitHub Actions

기술 선택은 구현 전에 ADR로 근거를 남기고, 필요 이상으로 도구를 늘리지 않습니다.

## 제품 범위

v1.0의 상세 사용자·업무 흐름은 [제품 비전](docs/product/vision.md)과 [제품·UX·기술 기획 크로스검토본](docs/product/product-plan-cross-review.md)에 정의합니다. 제조 용어·상태·수량·계보 불변조건은 [제조 도메인 계약](docs/domain/manufacturing-domain-contract.md), 공개 근거와 적용 한계는 [제조 도메인 공개 근거 재검증](docs/domain/source-review.md)을 따릅니다. 정보구조, 저해상도 wireframe, 상태 표현과 반응형 기준은 [UI 레이아웃·상태 계약](docs/product/ui-layout-contracts.md)을 따릅니다. 개발 절차는 [Engineering Workflow](docs/engineering/workflow.md)와 [CONTRIBUTING.md](CONTRIBUTING.md)를 따릅니다.

## 공개 범위

이 프로젝트는 특정 회사의 내부 MES를 복제하지 않습니다. 공개된 제조 정보에서 일반적인 문제 영역만 참고했으며 회사명, 로고, 고객, 실제 공정조건, 품질 기준 및 운영 데이터는 사용하지 않습니다. 화면과 데이터는 모두 가상입니다.

## License

[MIT](LICENSE)
