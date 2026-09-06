# 데이터베이스 구조 읽기

현재 기준은 [Prisma schema](../../apps/api/prisma/schema.prisma)와 [migration 이력](../../apps/api/prisma/migrations/migration_lock.toml)이다. 이 문서는 관계의 의미를 설명하며 전체 schema를 복제하지 않는다.

## 관계를 따라 읽는 순서

```text
User → UserRole ← Role
          ↓
        Session

Product → BomRevision → BomItem → Material → MaterialLot
                ↓                    ↑            ↑
            WorkOrder → MaterialRequirement       │
                └──────── MaterialAllocation ─────┘
                ├─ ProcessStepExecution
                ├─ Inspection
                └─ InspectionRequirement → InspectionSpecRevision

TraceNode ← LotRelation → TraceNode
AuditEvent / QualityIncident : 별도 기록과 업무 식별자로 대조
```

위 MaterialRequirement는 실제 모델 WorkOrderMaterialRequirement를 줄여 표시한 것이다. 모든 화살표가 DB 외래키라는 뜻은 아니다. 아래 구분과 schema의 relation 정의를 확인한다.

## 모델별 역할

| 모델 묶음                                    | 확인할 의미                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| User·Role·UserRole·Session                   | 사용자와 허용 역할, 현재 세션. 세션은 사용자·역할의 복합 관계를 참조한다 |
| Product·BomRevision·BomItem                  | 제품과 구성 자재, revision별 소요 기준                                   |
| WorkOrder                                    | 번호·제품 정보·계획수량·납기·진행 상태의 기준                            |
| WorkOrderMaterialRequirement                 | 작업지시에 연결된 구성 자재·소요 기준과 수량                             |
| Material·MaterialLot                         | 자재 기준과 입고 LOT, 재고·예약·소비·폐기·품질 상태                      |
| MaterialAllocation                           | 작업지시와 자재 LOT의 예약 연결, ACTIVE/CLOSED 상태                      |
| ProcessStepExecution                         | 작업지시별 공정 순서와 생산 LOT 표시번호, 실적                           |
| InspectionSpecRevision·InspectionRequirement | 검사규격 revision과 작업지시에 연결된 검사 요구                          |
| Inspection                                   | 검사 실행 상태와 판정. 완료와 합격은 별개다                              |
| TraceNode·LotRelation                        | 추적 대상과 방향 있는 관계. CONSUME/SPLIT/MERGE/TRANSFORM/SERIALIZE 구분 |
| QualityIncident·AuditEvent                   | 품질 사건과 변경 기록. 대상 식별자를 업무 기록과 대조한다                |

## 제약과 수량

- WorkOrder.orderNumber와 MaterialLot.lotNumber 등 표시번호에 unique 제약이 있다. 화면의 No는 DB 식별자도 unique 업무번호도 아니다.
- BOM 소요량과 작업지시 자재 요구량은 Decimal(18,6)을 사용한다. 현재 재고·예약·실적 수량 중에는 Int 필드가 있다. 모든 수량이 동일한 정밀도라고 가정하지 않는다.
- BomItem의 revision·자재 조합, 작업지시 자재 요구의 작업지시·자재 조합 등에 복합 unique 제약이 있다.
- LotRelation은 관계 종류·부모·자식 조합을 unique로 관리한다. 부모·자식과 수량의 의미는 도메인 규칙을 함께 확인한다.
- 인덱스 존재는 조회 성능이 검증됐다는 뜻이 아니다. 실제 실행 계획·데이터량·측정 조건이 있어야 성능을 주장할 수 있다.

## 목표 설계와 다른 현재 표현

현재 schema에는 별도의 ProductionLot 모델이 없고 공정·검사·계보에 productionLotNumber 등의 값이 있다. AuditEvent.entityId, QualityIncident의 원천 식별자, LotRelation.processStepExecutionId 등은 모두 강제 외래키인 것이 아니다. 관계 검증이 서비스에 있는지, 아직 과제인지 각각 확인한다.

목표 도메인 문서의 엔터티를 현재 DB 테이블이라고 소개하지 않는다. [도메인 계약](../domain/manufacturing-domain-contract.md)은 목표 업무 의미, 이 문서는 저장 구현의 읽기 안내다.

## 변경·검증 절차

schema 변경은 migration과 기존 데이터 영향을 함께 검토한다. 로컬 데모 데이터 재생성은 사용자 기록을 덮을 수 있으므로 공유 중인 DB에서 임의 실행하지 않는다. 검증용 DB와 개발 DB를 구분한다.

실제 DB 연결·migration 적용·unique/관계 제약·동시성은 대체 Prisma를 쓰는 HTTP 테스트와 별도로 검증한다. 명령어와 안전 범위는 [로컬 실행·운영](local-operations.md), [검증과 시연](testing-and-demo.md)을 따른다.
