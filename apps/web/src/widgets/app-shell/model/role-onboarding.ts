import type { RoleCode } from "@/entities/session";
import type { NavigationGroup, NavigationItem } from "./navigation";

export interface GuideStep {
  title: string;
  screen: string;
  to: NonNullable<NavigationItem["to"]> | "/work-orders/new";
  anchor: string;
  description: string;
  permission?: string;
  detail?:
    | "work-order"
    | "reservation"
    | "execution"
    | "material-lot"
    | "inspection"
    | "incident"
    | "trace-node";
  fallbackAnchor?: string;
}

/** Shared list controls are explained once in each role's primary workflow. */
function listReadingSteps(screen: string, to: GuideStep["to"]): GuideStep[] {
  return [
    {
      screen,
      to,
      anchor: "table-heading",
      title: "목록 번호와 정렬을 읽습니다",
      description:
        "No는 조회 결과 안의 역순 번호이며 작업지시·LOT 같은 업무 식별자가 아닙니다. 업무 인계에는 No 대신 지시·LOT·대상 ID 등 실제 식별자를 사용하세요. 정렬을 지원하는 열의 제목과 방향 표시로 현재 정렬 기준을 확인합니다.",
    },
    {
      screen,
      to,
      anchor: "pagination",
      title: "표시 건수와 다음 페이지를 확인합니다",
      description:
        "기본은 10건씩이며 10·20·50·100건 중 선택할 수 있습니다. 전체 건수, 현재 표시 범위와 페이지를 구분하세요. 지금 보이는 행이 전부는 아닐 수 있습니다. 안내 중에는 페이지와 표시 건수를 바꾸지 않습니다.",
    },
  ];
}

export const ROLE_GUIDES: Record<RoleCode, GuideStep[]> = {
  PRODUCTION_PLANNER: [
    {
      screen: "대시보드",
      to: "/dashboard",
      anchor: "dashboard-refresh",
      title: "오늘의 현황부터 확인하세요",
      description:
        "새로고침으로 운영 현황을 조회합니다. 먼저 납기와 진행 상황을 확인한 뒤 작업지시를 계획하고, 자재와 검사 조건까지 점검하겠습니다.",
    },
    {
      screen: "작업지시",
      to: "/work-orders",
      anchor: "list-search",
      title: "필요한 작업지시를 찾습니다",
      description:
        "작업지시 번호나 제품명으로 검색합니다. 같은 제품의 지시가 여러 개일 수 있으므로 번호와 납기를 함께 대조하세요. 조건 변경은 조회 버튼으로 적용하고, 조건 초기화로 전체 목록을 다시 봅니다.",
    },
    {
      screen: "작업지시",
      to: "/work-orders",
      anchor: "page-actions",
      title: "새 계획을 만드는 입구입니다",
      description:
        "작업지시 생성에서 초안을 만듭니다. 다음 단계에서 실제 입력 화면으로 이동하지만 값 변경과 저장은 하지 않습니다.",
      permission: "work-order:create",
    },
    {
      screen: "작업지시 생성",
      to: "/work-orders/new",
      anchor: "plan-quantity",
      title: "계획수량을 확인합니다",
      description:
        "생산할 수량을 입력하는 곳입니다. 제품과 수량 단위를 함께 확인하고, 현장 실적과 혼동하지 마세요.",
      permission: "work-order:create",
    },
    {
      screen: "작업지시 생성",
      to: "/work-orders/new",
      anchor: "plan-product",
      title: "생산할 제품을 선택합니다",
      description:
        "제품에 연결된 공정과 기준정보를 확인한 뒤 선택합니다. 비슷한 제품명이 있다면 제품 코드까지 대조하세요.",
      permission: "work-order:create",
    },
    {
      screen: "작업지시 생성",
      to: "/work-orders/new",
      anchor: "plan-due",
      title: "납기를 서울 기준으로 입력합니다",
      description:
        "현장 생산과 검사에 필요한 시간을 고려해 납기를 정합니다. 이 화면의 일시는 서울 기준이며, 납기 초과 여부를 판단하는 기준이 됩니다.",
      permission: "work-order:create",
    },
    {
      screen: "작업지시 생성",
      to: "/work-orders/new",
      anchor: "plan-priority",
      title: "우선순위를 지정합니다",
      description:
        "긴급도에 맞게 우선순위를 지정합니다. 높은 우선순위라도 자재 부족이나 검사 차단 조건을 생략할 수는 없습니다.",
      permission: "work-order:create",
    },
    {
      screen: "작업지시 생성",
      to: "/work-orders/new",
      anchor: "plan-review",
      title: "생성 전에 입력 내용을 검토합니다",
      description:
        "제품·수량·납기·우선순위를 다시 확인합니다. 초안 생성과 발행은 별개입니다. 이 안내에서는 초안을 저장하거나 작업지시를 발행하지 않습니다.",
      permission: "work-order:create",
    },
    {
      screen: "작업지시",
      to: "/work-orders",
      anchor: "filters",
      title: "진행할 지시를 상태별로 좁힙니다",
      description:
        "초안·발행·진행 상태와 납기, 우선순위, 차단 조건을 조합합니다. 이어서 현재 목록에서 조회 가능한 작업지시 한 건을 열어 구조를 살펴봅니다. 조건 변경은 조회 버튼으로 적용하고, 조건 초기화로 전체 목록을 다시 봅니다.",
    },
    ...listReadingSteps("작업지시", "/work-orders"),
    {
      screen: "작업지시 상세",
      to: "/work-orders",
      anchor: "order-summary",
      title: "실제 작업지시의 계획과 진행을 대조합니다",
      description:
        "현재 조회 가능한 지시를 안내용으로 열었습니다. 계획수량·납기·진행률·현재 공정을 확인하세요. 본인 담당 지시인지 판단하고 실제 업무에 사용해야 합니다.",
      detail: "work-order",
    },
    {
      screen: "작업지시 상세",
      to: "/work-orders",
      anchor: "order-flow",
      title: "공정 순서와 정체 구간을 확인합니다",
      description:
        "어느 공정이 대기·진행·완료 상태인지 확인합니다. 차단된 공정은 선행 공정, 자재, 검사 조건을 확인한 뒤 담당자와 조율하세요.",
      detail: "work-order",
    },
    {
      screen: "작업지시 상세",
      to: "/work-orders",
      anchor: "order-flow",
      title: "생산 LOT별로 공정 흐름을 구분합니다",
      description:
        "공정 이름 옆 생산 LOT 번호와 순서를 함께 봅니다. 같은 작업지시에 여러 LOT가 연결될 수 있으므로, 한 LOT의 완료 상태를 다른 LOT의 상태로 읽지 마세요. 공정이 비어 있다면 초안·발행 상태부터 확인합니다.",
      detail: "work-order",
    },
    {
      screen: "작업지시 상세",
      to: "/work-orders",
      anchor: "order-inspections",
      title: "생산 진행과 검사 결과를 함께 봅니다",
      description:
        "검사 완료와 합격은 같은 의미가 아닙니다. 판정 및 검사 게이트를 확인하고, 보류·불합격이 있으면 품질 담당자에게 확인하세요.",
      detail: "work-order",
    },
    {
      screen: "작업지시 상세",
      to: "/work-orders",
      anchor: "order-history",
      title: "발행·변경 이력을 확인합니다",
      description:
        "누가 언제 상태를 변경했는지 확인합니다. 현재 상태만 보고 발행이나 취소를 반복하지 말고 변경 이력과 현장 상황을 대조하세요.",
      detail: "work-order",
    },
    {
      screen: "자재 예약",
      to: "/work-orders",
      anchor: "reservations",
      title: "계획에 필요한 자재 예약을 확인합니다",
      description:
        "연결된 지시의 예약 LOT·수량·활성 상태를 확인합니다. 재고 보유와 해당 지시의 예약 확보는 다릅니다. 부족하면 자재 담당자와 조율하세요.",
      detail: "reservation",
      permission: "material-allocation:read",
    },
    {
      screen: "자재 예약",
      to: "/work-orders",
      anchor: "reservations",
      title: "예약 수량과 실제 투입 실적을 구분합니다",
      description:
        "예약은 해당 지시를 위해 자재를 확보한 기록입니다. 예약됐다는 사실만으로 실제 투입이나 공정 완료를 판단하지 마세요. 지시 번호·LOT·예약 상태를 자재 담당자와 대조합니다.",
      detail: "reservation",
      permission: "material-allocation:read",
    },
    {
      screen: "BOM 기준정보",
      to: "/materials/boms",
      anchor: "table-heading",
      title: "계획 제품의 BOM 개정을 대조합니다",
      description:
        "제품 코드와 BOM revision, 단위당 소요량을 확인합니다. 제품명이 비슷하거나 개정이 달라지면 자재 구성이 다를 수 있습니다. 소요량의 단위와 계획수량을 함께 확인하고 기준정보 변경은 별도로 협의하세요.",
    },
    {
      screen: "자재 LOT",
      to: "/materials/lots",
      anchor: "filters",
      title: "재고와 사용 가능 여부를 구분합니다",
      description:
        "자재 수량이 있어도 품질 상태나 유효기간 때문에 사용할 수 없을 수 있습니다. 품질 상태와 가용성을 함께 확인하세요. 조건 변경은 조회 버튼으로 적용하고, 조건 초기화로 전체 목록을 다시 봅니다.",
    },
    {
      screen: "대시보드",
      to: "/dashboard",
      anchor: "dashboard-operations",
      title: "운영 지표의 단위를 구분합니다",
      description:
        "카드의 수치가 작업지시 건수인지, 검사 건수인지, 자재 수량인지 라벨과 단위로 구분합니다. 서로 다른 집계를 더하거나 생산 완료율로 해석하지 말고, 이상이 있는 업무의 상세 기록으로 확인합니다.",
    },
    {
      screen: "대시보드",
      to: "/dashboard",
      anchor: "dashboard-plan",
      title: "주간 납기 계획을 다시 점검합니다",
      description:
        "주간 계획 대비 진행 수량으로 지연 가능성을 확인합니다. 미달 구간은 작업지시 상세의 공정·검사 상태와 대조하세요.",
    },
    {
      screen: "대시보드",
      to: "/dashboard",
      anchor: "dashboard-attention",
      title: "조치할 항목과 담당자를 정합니다",
      description:
        "조치 필요 항목에서 우선 대응할 일을 확인합니다. 계획 변경, 자재 확보, 품질 확인 중 어떤 협의가 필요한지 나누어 전달하세요.",
    },
    {
      screen: "대시보드",
      to: "/dashboard",
      anchor: "dashboard-orders",
      title: "생산계획 업무의 확인 순서입니다",
      description:
        "현황 확인 → 제품·수량·납기 계획 → 초안 검토·발행 → 자재·공정·검사 점검 순서입니다. 안내를 마친 뒤 실제 담당 지시를 선택해 업무를 시작하세요.",
    },
  ],
  SHOP_FLOOR_OPERATOR: [
    {
      screen: "작업지시",
      to: "/work-orders",
      anchor: "list-search",
      title: "내 작업지시를 찾습니다",
      description:
        "전달받은 작업지시 번호를 검색하고 제품과 LOT를 대조합니다. 이어서 조회 가능한 지시를 예시로 열어 확인 위치를 살펴보겠습니다. 조건 변경은 조회 버튼으로 적용하고, 조건 초기화로 전체 목록을 다시 봅니다.",
    },
    {
      screen: "작업지시 상세",
      to: "/work-orders",
      anchor: "order-summary",
      title: "제품·수량·현재 공정을 대조합니다",
      description:
        "현재 열린 지시는 조회 가능한 안내 대상입니다. 실제 작업 전에는 반드시 본인 지시 번호와 제품, 계획수량을 대조하세요.",
      detail: "work-order",
    },
    {
      screen: "작업지시 상세",
      to: "/work-orders",
      anchor: "order-flow",
      title: "내가 진행할 공정의 순서를 확인합니다",
      description:
        "선행 공정이 끝났는지, 현재 공정이 어디인지 확인합니다. 순서를 건너뛰거나 다른 LOT의 공정을 진행하면 안 됩니다.",
      detail: "work-order",
    },
    {
      screen: "작업지시 상세",
      to: "/work-orders",
      anchor: "order-inspections",
      title: "검사 대기로 멈춘 상태인지 봅니다",
      description:
        "필수 검사가 남아 있거나 판정이 보류·불합격이면 다음 공정이 제한될 수 있습니다. 현장에서 임의로 해제하지 말고 품질 담당자에게 확인하세요.",
      detail: "work-order",
    },
    {
      screen: "작업지시 상세",
      to: "/work-orders",
      anchor: "order-history",
      title: "교대 전에 작업지시 변경 이력을 확인합니다",
      description:
        "발행·취소 등 변경 시각과 담당자를 확인합니다. 이전 근무자가 전달한 내용과 현재 상태가 다르면 지시 번호를 기준으로 다시 확인하고, 변경 전 계획을 그대로 실행하지 않습니다.",
      detail: "work-order",
    },
    {
      screen: "공정 실행",
      to: "/execution/queue",
      anchor: "list-search",
      title: "진행할 공정을 찾습니다",
      description:
        "작업지시 또는 생산 LOT 번호로 공정 대기열을 검색합니다. 같은 LOT 안에서도 공정 순서와 이름을 확인하세요. 조건 변경은 조회 버튼으로 적용하고, 조건 초기화로 전체 목록을 다시 봅니다.",
    },
    {
      screen: "공정 실행",
      to: "/execution/queue",
      anchor: "filters",
      title: "준비 상태로 할 일을 구분합니다",
      description:
        "준비·진행·차단·완료 상태를 구분합니다. 준비 상태에서 시작할 수 있고, 진행 중인 공정에서 완료 실적을 입력합니다. 조건 변경은 조회 버튼으로 적용하고, 조건 초기화로 전체 목록을 다시 봅니다.",
    },
    ...listReadingSteps("공정 실행", "/execution/queue"),
    {
      screen: "공정 실행",
      to: "/execution/queue",
      anchor: "table-heading",
      title: "시작과 완료 입력은 서로 다릅니다",
      description:
        "목록의 시작은 공정을 실제 진행 상태로 바꿉니다. 완료 입력은 양품·불량 실적을 기록하는 입구입니다. 안내 중에는 둘 다 실행하지 않습니다.",
    },
    {
      screen: "공정 실행 상세",
      to: "/execution/queue",
      anchor: "execution-state",
      title: "실행 상태와 차단 사유를 확인합니다",
      description:
        "진행 중인 공정을 우선해 현재 목록의 상세를 엽니다. 차단 사유가 있으면 자재·선행 공정·검사 조건 중 무엇이 필요한지 담당자와 확인하세요.",
      detail: "execution",
    },
    {
      screen: "공정 실행 상세",
      to: "/execution/queue",
      anchor: "execution-state",
      title: "시작·완료 시각으로 중복 처리를 점검합니다",
      description:
        "실행 상태와 시작·완료 시각을 함께 봅니다. 이미 시작되었거나 완료된 공정을 새 작업처럼 처리하지 마세요. 완료된 경우 표시되는 양품·불량 수량과 메모를 확인하고, 미완료라면 완료 기록과 구분합니다.",
      detail: "execution",
    },
    {
      screen: "공정 실행 상세",
      to: "/execution/queue",
      anchor: "execution-inspections",
      title: "이 공정에 연결된 검사를 확인합니다",
      description:
        "검사 번호, 게이트, 진행 상태와 판정을 대조합니다. 작업이 끝나도 필요한 검사 조건이 충족되지 않으면 후속 진행이 제한될 수 있습니다.",
      detail: "execution",
    },
    {
      screen: "공정 실행 상세",
      to: "/execution/queue",
      anchor: "execution-good",
      title: "양품 수량을 따로 기록합니다",
      description:
        "진행 중인 공정에만 완료 실적 입력란이 나타납니다. 실제 양품 수량을 기록하고, 계획수량을 그대로 복사하지 마세요. 입력란이 없으면 현재 상태부터 확인합니다.",
      detail: "execution",
      permission: "process-execution:execute",
      fallbackAnchor: "execution-state",
    },
    {
      screen: "공정 실행 상세",
      to: "/execution/queue",
      anchor: "execution-defect",
      title: "불량 수량을 빠뜨리지 않습니다",
      description:
        "양품과 불량을 구분해 실제 실적을 기록합니다. 완료 확정 전에 합계와 현물을 대조하고, 이상 수량이 있으면 원인을 확인하세요.",
      detail: "execution",
      permission: "process-execution:execute",
      fallbackAnchor: "execution-state",
    },
    {
      screen: "공정 실행 상세",
      to: "/execution/queue",
      anchor: "execution-good",
      title: "양품·불량 합계를 제출 전에 검토합니다",
      description:
        "같은 생산 LOT·공정의 실적인지 먼저 확인한 뒤 양품과 불량 합계를 현물 수량과 대조합니다. 불량을 양품에도 중복 포함하지 마세요. 계획과 차이가 나면 메모에 근거를 남기고 확인한 후 확정합니다.",
      detail: "execution",
      permission: "process-execution:execute",
      fallbackAnchor: "execution-state",
    },
    {
      screen: "공정 실행 상세",
      to: "/execution/queue",
      anchor: "execution-memo",
      title: "특이사항을 남긴 뒤 확정합니다",
      description:
        "공정 중 이상이나 인계할 내용을 메모합니다. 완료 확정은 실제 상태를 바꾸므로 수량·LOT·공정을 검토한 뒤 실행하세요. 여기서는 저장하지 않습니다.",
      detail: "execution",
      permission: "process-execution:execute",
      fallbackAnchor: "execution-state",
    },
    {
      screen: "공정 실행",
      to: "/execution/queue",
      anchor: "table-heading",
      title: "완료 후 다음 공정 상태를 확인합니다",
      description:
        "실제 업무에서 완료한 뒤에는 대기열에서 상태를 다시 확인하세요. 다음 공정이 차단되어 있으면 차단 사유를 확인하고 담당자에게 인계합니다.",
    },
    {
      screen: "공정 실행",
      to: "/execution/queue",
      anchor: "table-heading",
      title: "다음 담당자에게 인계할 내용을 정리합니다",
      description:
        "작업지시·생산 LOT·공정 번호와 확인한 실적, 남은 검사·차단 사유를 함께 전달합니다. 화면에서 완료를 확인하지 못했거나 저장 오류가 있었다면 완료됐다고 단정하거나 연속으로 재실행하지 마세요.",
    },
    {
      screen: "공정 실행",
      to: "/execution/queue",
      anchor: "list-search",
      title: "작업 전·후 확인 순서를 기억하세요",
      description:
        "지시·LOT 대조 → 공정·차단 확인 → 작업 시작 → 양품·불량·메모 검토 → 완료 후 상태 확인 순서입니다. 안내 종료 후 본인 작업을 다시 검색하세요. 조건 변경은 조회 버튼으로 적용하고, 조건 초기화로 전체 목록을 다시 봅니다.",
    },
  ],
  MATERIAL_MANAGER: [
    {
      screen: "자재 LOT",
      to: "/materials/lots",
      anchor: "list-search",
      title: "품번과 LOT부터 확인합니다",
      description:
        "현물의 품번과 LOT 번호를 검색 결과에 대조합니다. 이름이 같은 자재라도 LOT별 품질·유효기간·가용 수량은 다를 수 있습니다. 조건 변경은 조회 버튼으로 적용하고, 조건 초기화로 전체 목록을 다시 봅니다.",
    },
    {
      screen: "자재 LOT",
      to: "/materials/lots",
      anchor: "filters",
      title: "품질 상태와 가용성을 함께 봅니다",
      description:
        "격리·보류·만료 여부를 확인합니다. 재고가 있다는 이유만으로 생산에 투입하지 말고, 실제 사용 가능한 LOT인지 먼저 판단하세요. 조건 변경은 조회 버튼으로 적용하고, 조건 초기화로 전체 목록을 다시 봅니다.",
    },
    ...listReadingSteps("자재 LOT", "/materials/lots"),
    {
      screen: "자재 LOT 상세",
      to: "/materials/lots",
      anchor: "lot-quantity",
      title: "재고·예약·가용 수량을 구분합니다",
      description:
        "현재 목록의 LOT 한 건을 열었습니다. 재고 수량 전체가 새로 예약 가능한 수량은 아닙니다. 예약과 소비·폐기를 함께 확인하고 가용 수량을 기준으로 판단하세요.",
      detail: "material-lot",
    },
    {
      screen: "자재 LOT 상세",
      to: "/materials/lots",
      anchor: "lot-reservations",
      title: "어느 작업지시에 예약됐는지 봅니다",
      description:
        "예약된 지시와 수량, 상태를 확인합니다. 다른 지시에 묶인 자재를 중복 투입하지 않도록 현장 요청과 대조하세요.",
      detail: "material-lot",
    },
    {
      screen: "자재 LOT 상세",
      to: "/materials/lots",
      anchor: "lot-reservations",
      title: "예약 이력 전체를 현재 예약으로 합산하지 않습니다",
      description:
        "예약 상태와 연결된 지시, 수량을 한 줄씩 확인합니다. 해제되거나 이미 처리된 예약을 현재 활성 예약과 섞어 합산하지 마세요. 현재 예약량은 수량 요약과 대조하고, 차이가 있으면 해당 지시의 예약 기록을 확인합니다.",
      detail: "material-lot",
    },
    {
      screen: "자재 LOT 상세",
      to: "/materials/lots",
      anchor: "lot-history",
      title: "품질 변경과 수량 이력을 확인합니다",
      description:
        "품질 상태가 바뀌거나 수량이 예상과 다르면 변경 이력을 확인합니다. 현재 배지뿐 아니라 변경 시점과 사유를 함께 확인하세요.",
      detail: "material-lot",
    },
    {
      screen: "작업지시",
      to: "/work-orders",
      anchor: "list-search",
      title: "자재를 확보할 작업지시를 찾습니다",
      description:
        "요청받은 작업지시 번호를 대조합니다. 이어서 발행·진행 상태를 우선해 조회 가능한 지시의 예약 화면을 살펴봅니다. 조건 변경은 조회 버튼으로 적용하고, 조건 초기화로 전체 목록을 다시 봅니다.",
    },
    {
      screen: "자재 예약",
      to: "/work-orders",
      anchor: "reservations",
      title: "기존 예약부터 확인합니다",
      description:
        "지시 번호와 활성 예약을 확인합니다. 동일 LOT·수량이 이미 예약되어 있다면 중복 요청인지 확인한 뒤 처리하세요.",
      detail: "reservation",
      permission: "material-allocation:read",
    },
    {
      screen: "자재 예약",
      to: "/work-orders",
      anchor: "reservation-lot",
      title: "가용 자재 LOT를 선택합니다",
      description:
        "발행·진행 조건이 충족되면 예약 입력란이 보입니다. 제품에 필요한 자재와 단위를 대조하고, 가용 수량이 있는 LOT를 선택하세요.",
      detail: "reservation",
      permission: "material-allocation:create",
      fallbackAnchor: "reservations",
    },
    {
      screen: "자재 예약",
      to: "/work-orders",
      anchor: "reservation-quantity",
      title: "필요 수량과 가용 수량을 대조합니다",
      description:
        "필요한 예약량을 입력합니다. 가용 수량을 초과하지 않는지 확인한 뒤 예약하세요. 안내에서는 값을 바꾸거나 예약을 실행하지 않습니다.",
      detail: "reservation",
      permission: "material-allocation:create",
      fallbackAnchor: "reservations",
    },
    {
      screen: "자재 예약",
      to: "/work-orders",
      anchor: "reservations",
      title: "예약 해제도 실제 수량에 영향을 줍니다",
      description:
        "불필요한 활성 예약을 해제하기 전에는 지시 취소·변경 여부를 확인하세요. 현장과 협의 없이 진행 중인 작업의 예약을 해제하지 않습니다.",
      detail: "reservation",
      permission: "material-allocation:release",
    },
    {
      screen: "BOM 기준정보",
      to: "/materials/boms",
      anchor: "filters",
      title: "제품과 개정 상태로 BOM을 찾습니다",
      description:
        "revision 번호·제품 코드·제품명을 검색하고 상태 조건을 함께 확인합니다. 입력만으로 조회 결과가 바뀌지는 않습니다. 조회로 적용한 뒤 제품과 개정을 대조하고, 다른 제품을 확인할 때는 조건 초기화 여부도 확인하세요.",
    },
    {
      screen: "BOM 기준정보",
      to: "/materials/boms",
      anchor: "table-heading",
      title: "BOM으로 자재 구성을 대조합니다",
      description:
        "제품별 자재 구성, 소요량과 단위를 확인합니다. 현장 요청이 기준과 다르면 임의로 자재를 대체하지 말고 생산계획 담당자와 확인하세요.",
    },
    {
      screen: "LOT 계보",
      to: "/traceability",
      anchor: "list-search",
      title: "자재가 연결된 LOT를 찾습니다",
      description:
        "문제가 있는 자재 LOT를 검색해 연결된 생산 LOT를 조사합니다. 조회 권한이 있는 경우에만 이 흐름이 안내됩니다. 조건 변경은 조회 버튼으로 적용하고, 조건 초기화로 전체 목록을 다시 봅니다.",
    },
    {
      screen: "LOT 계보",
      to: "/traceability",
      anchor: "table-heading",
      title: "자재 LOT와 생산 LOT의 유형을 구분합니다",
      description:
        "검색 결과의 노드 유형과 LOT 번호를 함께 확인합니다. 번호가 비슷하더라도 자재와 생산 LOT는 다른 대상입니다. 이어서 열리는 상세는 조회 가능한 예시이므로 실제 조사 대상과 일치하는지 다시 대조하세요.",
    },
    {
      screen: "LOT 계보 상세",
      to: "/traceability",
      anchor: "trace-upstream",
      title: "유입 경로를 확인합니다",
      description:
        "원천 연결에서 이 LOT가 어떤 자재·생산 이력에서 이어졌는지 봅니다. 연결이 없다면 화면만으로 원인을 확정하지 말고 원본 기록을 확인하세요.",
      detail: "trace-node",
    },
    {
      screen: "LOT 계보 상세",
      to: "/traceability",
      anchor: "trace-downstream",
      title: "사용된 생산 LOT의 범위를 확인합니다",
      description:
        "영향 연결에서 후속 생산 LOT를 확인합니다. 자재 이상이 있으면 연결된 대상을 품질 담당자에게 전달하고 필요한 조치를 협의하세요.",
      detail: "trace-node",
    },
    {
      screen: "자재 LOT",
      to: "/materials/lots",
      anchor: "filters",
      title: "조사 후 품질·가용 상태를 다시 확인합니다",
      description:
        "계보 조사가 끝났다는 이유로 사용 가능 상태가 자동으로 바뀌지는 않습니다. 담당자가 실제 조치를 마친 뒤에는 대상 LOT를 다시 조회해 품질·가용 상태를 확인하고, 보관·투입 현황과 차이가 있으면 인계합니다.",
    },
    {
      screen: "자재 LOT",
      to: "/materials/lots",
      anchor: "list-search",
      title: "자재 담당자의 점검 순서입니다",
      description:
        "현물·LOT 대조 → 품질·가용 확인 → 기존 예약 검토 → 필요 수량 예약 → 이상 시 이력·계보 확인 순서입니다. 종료 후 실제 담당 LOT를 검색하세요. 조건 변경은 조회 버튼으로 적용하고, 조건 초기화로 전체 목록을 다시 봅니다.",
    },
  ],
  QUALITY_ENGINEER: [
    {
      screen: "품질 검사",
      to: "/quality/inspections",
      anchor: "list-search",
      title: "검사할 대상의 번호부터 대조합니다",
      description:
        "검사 번호나 LOT로 검색합니다. 실제 검사 대상과 작업지시·LOT·공정이 일치하는지 확인하세요. 조건 변경은 조회 버튼으로 적용하고, 조건 초기화로 전체 목록을 다시 봅니다.",
    },
    {
      screen: "품질 검사",
      to: "/quality/inspections",
      anchor: "filters",
      title: "검사 진행과 판정을 구분합니다",
      description:
        "대기·진행·완료는 검사 진행 상태이고 PASS·FAIL·HOLD는 판정입니다. 진행 상태만 보고 합격으로 판단하지 마세요. 조건 변경은 조회 버튼으로 적용하고, 조건 초기화로 전체 목록을 다시 봅니다.",
    },
    {
      screen: "품질 검사",
      to: "/quality/inspections",
      anchor: "table-heading",
      title: "검사 게이트와 대상을 확인합니다",
      description:
        "검사가 어느 공정과 연결되어 있는지 확인합니다. 이어서 미완료 검사를 우선해 현재 목록의 상세 한 건을 엽니다.",
    },
    ...listReadingSteps("품질 검사", "/quality/inspections"),
    {
      screen: "검사 상세",
      to: "/quality/inspections",
      anchor: "inspection-summary",
      title: "검사 규격과 실제 대상을 확인합니다",
      description:
        "규격, 작업지시, 생산 LOT와 공정을 대조합니다. 현재 열린 검사는 안내 대상이며, 실제 판정 전에는 본인에게 배정된 검사인지 다시 확인하세요.",
      detail: "inspection",
    },
    {
      screen: "검사 상세",
      to: "/quality/inspections",
      anchor: "inspection-summary",
      title: "완료 일시와 판정 메모를 함께 읽습니다",
      description:
        "완료 일시가 없거나 메모가 비어 있는 상태를 검사 합격의 근거로 삼지 마세요. 이미 판정된 검사라면 대상·완료 시점·메모를 원본 검사 결과와 대조하고, 오류가 의심되면 담당자와 정정 절차를 확인합니다.",
      detail: "inspection",
    },
    {
      screen: "검사 상세",
      to: "/quality/inspections",
      anchor: "inspection-verdict",
      title: "검사 근거에 맞게 판정합니다",
      description:
        "대기·진행 상태일 때 판정 입력란이 나타납니다. PASS·FAIL·HOLD를 검사 결과에 맞게 선택하세요. FAIL·HOLD는 후속 진행에 영향을 줄 수 있습니다.",
      detail: "inspection",
      permission: "inspection:execute",
      fallbackAnchor: "inspection-summary",
    },
    {
      screen: "검사 상세",
      to: "/quality/inspections",
      anchor: "inspection-memo",
      title: "판정 근거와 특이사항을 남깁니다",
      description:
        "측정 결과와 판단 근거를 확인한 뒤 메모를 남깁니다. 확정 전에 대상·판정·메모를 재확인하세요. 안내 중에는 판정을 저장하지 않습니다.",
      detail: "inspection",
      permission: "inspection:execute",
      fallbackAnchor: "inspection-summary",
    },
    {
      screen: "검사 상세",
      to: "/quality/inspections",
      anchor: "inspection-history",
      title: "판정 이후 변경 이력을 확인합니다",
      description:
        "판정 완료 시점과 이후 변경 이력을 확인합니다. 잘못된 결과가 의심되면 권한과 정정 절차를 확인하고, 새 검사처럼 중복 입력하지 마세요.",
      detail: "inspection",
    },
    {
      screen: "부적합·격리",
      to: "/quality/incidents",
      anchor: "page-actions",
      title: "발견한 문제를 사건으로 기록합니다",
      description:
        "사건 등록은 실제 품질 상태에 영향을 줄 수 있습니다. 대상 LOT와 발견 내용, 근거를 준비한 뒤 등록하세요. 안내에서는 등록 창을 제출하지 않습니다.",
      permission: "quality-incident:create",
    },
    {
      screen: "부적합·격리",
      to: "/quality/incidents",
      anchor: "list-search",
      title: "기존 부적합 사건부터 검색합니다",
      description:
        "사건 번호·제목·LOT로 기존 기록을 확인합니다. 같은 문제인지 확인해 중복 등록을 피하고 기존 조치 이력을 검토하세요. 조건 변경은 조회 버튼으로 적용하고, 조건 초기화로 전체 목록을 다시 봅니다.",
    },
    {
      screen: "부적합·격리",
      to: "/quality/incidents",
      anchor: "filters",
      title: "사건 상태와 대상 유형을 구분합니다",
      description:
        "열린 사건인지, 어떤 유형의 대상인지 조건을 좁혀 봅니다. 사건 상태와 LOT 품질 상태를 혼동하지 않도록 각각 확인하세요. 조건 변경은 조회 버튼으로 적용하고, 조건 초기화로 전체 목록을 다시 봅니다.",
    },
    {
      screen: "부적합 사건 상세",
      to: "/quality/incidents",
      anchor: "incident-state",
      title: "사건 상태와 영향을 받는 대상을 봅니다",
      description:
        "조회 가능한 사건 한 건을 열었습니다. 대상, 상태와 내용을 확인하고 실물·검사 기록에 일치하는지 대조하세요.",
      detail: "incident",
    },
    {
      screen: "부적합 사건 상세",
      to: "/quality/incidents",
      anchor: "incident-state",
      title: "사건 처리와 LOT 사용 가능 여부를 구분합니다",
      description:
        "사건의 처리 상태와 자재의 품질·가용 상태는 별도로 확인해야 합니다. 사건을 검토했다는 이유만으로 격리가 해제되거나 생산 투입이 허용됐다고 판단하지 마세요. 대상 LOT의 현재 상태와 조치 근거를 함께 확인합니다.",
      detail: "incident",
    },
    {
      screen: "부적합 사건 상세",
      to: "/quality/incidents",
      anchor: "incident-history",
      title: "격리·조치의 변경 이력을 확인합니다",
      description:
        "누가 언제 어떤 조치를 했는지 확인합니다. 재처리나 해제를 판단할 때는 현재 상태뿐 아니라 조치 근거와 순서를 함께 확인하세요.",
      detail: "incident",
    },
    {
      screen: "LOT 계보",
      to: "/traceability",
      anchor: "list-search",
      title: "문제 LOT의 계보를 조사합니다",
      description:
        "문제가 확인된 LOT를 검색합니다. 다음 화면에서는 현재 목록에서 조회 가능한 계보 한 건으로 원천과 영향 확인 위치를 보여드립니다. 조건 변경은 조회 버튼으로 적용하고, 조건 초기화로 전체 목록을 다시 봅니다.",
    },
    {
      screen: "LOT 계보",
      to: "/traceability",
      anchor: "table-heading",
      title: "조사 대상의 유형과 LOT 번호를 고정합니다",
      description:
        "자재 LOT인지 생산 LOT인지 유형과 번호를 함께 대조합니다. 현재 목록에서 열린 예시를 실제 문제 LOT로 오인하지 마세요. 원천과 영향 방향을 조사할 때도 처음 확인한 대상 식별자를 인계 기록에 남깁니다.",
    },
    {
      screen: "LOT 계보 상세",
      to: "/traceability",
      anchor: "trace-upstream",
      title: "원천 방향으로 원인을 조사합니다",
      description:
        "연결된 원자재와 선행 생산 LOT를 확인합니다. 계보는 연결 사실을 보여 주는 자료이므로 원인 확정에는 검사 결과와 현물 대조가 필요합니다.",
      detail: "trace-node",
    },
    {
      screen: "LOT 계보 상세",
      to: "/traceability",
      anchor: "trace-downstream",
      title: "영향 방향으로 조사 범위를 넓힙니다",
      description:
        "후속 생산 LOT를 확인해 영향 범위를 조사합니다. 연결이 없다고 문제가 없다고 단정하지 말고 누락된 기록과 현장 이동도 확인하세요.",
      detail: "trace-node",
    },
    {
      screen: "자재 LOT",
      to: "/materials/lots",
      anchor: "filters",
      title: "자재 품질과 가용 상태를 대조합니다",
      description:
        "자재가 격리·보류 상태인지, 생산에 사용 가능한지 확인합니다. 계보 조사 결과와 현장의 보관·사용 상태를 함께 대조하세요. 조건 변경은 조회 버튼으로 적용하고, 조건 초기화로 전체 목록을 다시 봅니다.",
    },
    {
      screen: "자재 LOT 상세",
      to: "/materials/lots",
      anchor: "lot-quantity",
      title: "품질 조치의 수량 영향을 확인합니다",
      description:
        "현재 조회 가능한 자재 LOT의 수량 요약입니다. 입고·재고·예약·가용 수량을 구분하고, 보유 수량을 모두 즉시 투입 가능한 수량으로 해석하지 마세요. 실제 문제 LOT와 일치하는지 먼저 확인한 뒤 자재 담당자와 조치 범위를 대조합니다.",
      detail: "material-lot",
    },
    {
      screen: "품질 검사",
      to: "/quality/inspections",
      anchor: "list-search",
      title: "품질 업무의 확인 순서입니다",
      description:
        "대상·규격 대조 → 검사·판정 근거 확인 → 판정 이력 검토 → 부적합·계보 조사 순서입니다. 안내 종료 후 실제 담당 검사를 검색하세요. 조건 변경은 조회 버튼으로 적용하고, 조건 초기화로 전체 목록을 다시 봅니다.",
    },
  ],
  SYSTEM_ADMIN: [
    {
      screen: "대시보드",
      to: "/dashboard",
      anchor: "dashboard-refresh",
      title: "최고관리자는 전체 업무를 한 번에 확인합니다",
      description:
        "최고관리자는 모든 업무 화면의 조회·실행과 사용자 권한 관리를 사용할 수 있습니다. 실제 저장은 업무 기록을 바꾸며, 자재 부족·검사 차단·상태 조건은 그대로 적용됩니다. 이 안내에서는 화면만 살펴보고 저장하지 않습니다.",
    },
    {
      screen: "대시보드",
      to: "/dashboard",
      anchor: "dashboard-operations",
      title: "생산·자재·검사 현황을 함께 읽습니다",
      description:
        "작업지시 건수, 검사 진행과 자재 수량은 서로 다른 지표입니다. 전체 현황을 본 뒤 해당 메뉴의 상세 기록으로 원인을 확인합니다.",
    },
    {
      screen: "대시보드",
      to: "/dashboard",
      anchor: "dashboard-attention",
      title: "조치할 업무의 상세로 연결합니다",
      description:
        "납기·자재·공정·품질 문제를 구분합니다. 최고관리자 권한이 있어도 차단 상태를 강제로 건너뛰지 않고 원인부터 해결해야 합니다.",
    },
    {
      screen: "작업지시",
      to: "/work-orders",
      anchor: "filters",
      title: "계획과 실제 생산의 기준을 찾습니다",
      description:
        "작업지시 번호·제품·납기·우선순위를 함께 확인합니다. 조건은 조회 버튼으로 적용하고 조건 초기화로 전체 목록을 다시 볼 수 있습니다.",
    },
    ...listReadingSteps("작업지시", "/work-orders"),
    {
      screen: "작업지시 생성",
      to: "/work-orders/new",
      anchor: "plan-review",
      title: "새 계획의 입력과 저장 위치를 확인합니다",
      description:
        "제품·계획수량·납기·우선순위를 입력하고 초안을 생성하는 화면입니다. 생성과 발행은 별개이며, 둘러보기 중에는 값을 바꾸거나 저장하지 않습니다.",
      permission: "work-order:create",
    },
    {
      screen: "작업지시 상세",
      to: "/work-orders",
      anchor: "order-summary",
      title: "생성·발행·취소 전에 현재 상태를 확인합니다",
      description:
        "최고관리자도 발행 가능한 초안인지, 취소가 허용되는 상태인지 확인해야 합니다. 대상 번호·수량·납기를 검토하고 실제 업무에서만 실행하세요.",
      detail: "work-order",
    },
    {
      screen: "작업지시 상세",
      to: "/work-orders",
      anchor: "order-flow",
      title: "생산 LOT와 공정 순서를 대조합니다",
      description:
        "같은 작업지시에 여러 생산 LOT가 연결될 수 있습니다. 공정 순서와 현재 진행 상태, 연결된 검사를 LOT별로 구분하세요.",
      detail: "work-order",
    },
    {
      screen: "자재 예약",
      to: "/work-orders",
      anchor: "reservation-quantity",
      title: "필요한 자재를 예약하고 해제하는 위치입니다",
      description:
        "기존 예약과 가용 LOT·수량을 확인한 뒤 예약합니다. 해제 역시 실제 가용 수량에 영향을 줍니다. 입력란이 없다면 지시 상태와 기존 예약부터 확인하세요.",
      detail: "reservation",
      permission: "material-allocation:create",
      fallbackAnchor: "reservations",
    },
    {
      screen: "BOM 기준정보",
      to: "/materials/boms",
      anchor: "table-heading",
      title: "제품에 적용되는 자재 기준을 확인합니다",
      description:
        "제품 코드·BOM 개정·소요량·단위를 대조합니다. 이 화면은 기준정보 조회이며 최고관리자에게도 아직 구현되지 않은 BOM 편집 기능이 생기지는 않습니다.",
    },
    {
      screen: "자재 LOT 상세",
      to: "/materials/lots",
      anchor: "lot-quantity",
      title: "재고·예약·가용 수량을 구분합니다",
      description:
        "재고가 있어도 다른 작업의 예약, 유효기간이나 품질 상태 때문에 사용할 수 없을 수 있습니다. 실제 예약량과 지시를 함께 확인합니다.",
      detail: "material-lot",
    },
    {
      screen: "자재 LOT",
      to: "/materials/lots",
      anchor: "table-heading",
      title: "자재 품질 결정의 영향을 확인합니다",
      description:
        "최고관리자는 자재 품질 처분을 실행할 수 있습니다. 대상 LOT와 판정 근거를 대조하고 보류·격리·해제가 생산 가용성에 주는 영향을 확인한 뒤 결정합니다.",
      permission: "material-lot:decide-quality",
    },
    {
      screen: "공정 실행",
      to: "/execution/queue",
      anchor: "filters",
      title: "시작 가능한 공정과 차단 사유를 찾습니다",
      description:
        "준비·진행·완료·차단은 서로 다른 상태입니다. 최고관리자도 선행 공정·자재·검사 조건을 충족해야 시작하거나 완료할 수 있습니다.",
    },
    {
      screen: "공정 실행 상세",
      to: "/execution/queue",
      anchor: "execution-good",
      title: "양품·불량 실적과 완료 입력을 확인합니다",
      description:
        "진행 중인 공정에 완료 입력이 표시됩니다. 양품과 불량 합계를 현물과 대조하고 실제 기록할 때만 완료합니다. 입력란이 없다면 실행 상태를 확인합니다.",
      detail: "execution",
      permission: "process-execution:execute",
      fallbackAnchor: "execution-state",
    },
    {
      screen: "품질검사",
      to: "/quality/inspections",
      anchor: "filters",
      title: "검사 진행과 판정을 따로 확인합니다",
      description:
        "대기·진행·완료는 실행 상태이고 합격·불합격·보류는 판정입니다. 대상 LOT·검사 게이트·공정을 함께 대조하세요.",
    },
    {
      screen: "검사 상세",
      to: "/quality/inspections",
      anchor: "inspection-verdict",
      title: "검사 판정과 근거를 확인하고 확정합니다",
      description:
        "판정 권한이 있어도 완료된 검사를 새 검사처럼 처리하지 않습니다. 실제 측정 결과와 메모를 확인한 뒤 확정하세요. 안내 중에는 판정을 저장하지 않습니다.",
      detail: "inspection",
      permission: "inspection:execute",
      fallbackAnchor: "inspection-summary",
    },
    {
      screen: "부적합·격리",
      to: "/quality/incidents",
      anchor: "page-actions",
      title: "품질 사건 등록의 입구를 확인합니다",
      description:
        "같은 문제가 이미 등록되어 있는지 먼저 검색합니다. 사건 등록은 품질 상태와 격리 대상에 영향을 줄 수 있으므로 대상과 근거를 확인해야 합니다.",
      permission: "quality-incident:create",
    },
    {
      screen: "부적합 사건 상세",
      to: "/quality/incidents",
      anchor: "incident-state",
      title: "사건 상태와 영향을 받는 LOT를 대조합니다",
      description:
        "사건의 상태와 각 LOT의 품질·사용 가능 상태는 독립적입니다. 구현 예정인 처분 기능은 권한표에 표시되더라도 아직 실행할 수 없습니다.",
      detail: "incident",
    },
    {
      screen: "LOT 계보",
      to: "/traceability",
      anchor: "list-search",
      title: "같은 LOT를 기준으로 흐름을 연결합니다",
      description:
        "대상 LOT 번호로 검색합니다. 조회 화면을 넘나들 때 제품명만 보고 같은 대상으로 추측하지 말고 실제 LOT와 작업지시 번호를 확인하세요.",
    },
    {
      screen: "LOT 계보 상세",
      to: "/traceability",
      anchor: "trace-upstream",
      title: "투입된 원천 자재를 추적합니다",
      description:
        "현재 대상에 어떤 자재와 생산 기록이 연결되었는지 확인합니다. 계보 연결과 실제 수량·검사 근거를 함께 읽으세요.",
      detail: "trace-node",
    },
    {
      screen: "LOT 계보 상세",
      to: "/traceability",
      anchor: "trace-downstream",
      title: "문제가 영향을 주는 후속 대상을 확인합니다",
      description:
        "후속 생산·완제품으로 이어지는 범위를 조사합니다. 계보 화면을 열었다는 사실만으로 격리나 해제가 실행되지는 않습니다.",
      detail: "trace-node",
    },
    {
      screen: "사용자",
      to: "/admin/users",
      anchor: "user-column-roles",
      title: "사용자 역할과 최고관리자 범위를 확인합니다",
      description:
        "관리 버튼에서 기존 다섯 역할 중 하나를 지정합니다. 최고관리자로 바꾸면 모든 업무 실행 권한까지 부여되므로 변경 대상과 사유를 신중히 확인하세요.",
    },
    {
      screen: "사용자",
      to: "/admin/users",
      anchor: "table-heading",
      title: "역할별 권한표와 구현 상태를 구분합니다",
      description:
        "역할별 권한 탭에서 허용된 기능을 확인할 수 있습니다. 권한표 자체는 읽기 전용이며, 구현 예정 표시는 실행 가능한 기능이라는 뜻이 아닙니다.",
    },
    {
      screen: "사용자",
      to: "/admin/users",
      anchor: "user-column-status",
      title: "활성 상태 변경과 로그인 종료를 확인합니다",
      description:
        "역할·사용 상태를 바꾸면 대상 계정의 기존 로그인이 종료되고 변경 이력이 남습니다. 마지막 활성 최고관리자는 해제하거나 비활성화할 수 없습니다.",
    },
    {
      screen: "감사이력",
      to: "/audit-events",
      anchor: "filters",
      title: "누가 어떤 업무를 실행했는지 검색합니다",
      description:
        "대상·행위자·역할·행동 조건을 조회 버튼으로 적용합니다. 최고관리자가 실행한 업무도 본인 계정과 역할로 기록되며 이 화면에서 기록을 삭제하지 않습니다.",
    },
    {
      screen: "감사이력",
      to: "/audit-events",
      anchor: "table-heading",
      title: "변경 내용과 요청 ID를 함께 대조합니다",
      description:
        "같은 요청에 여러 이벤트가 연결될 수 있으므로 행 수만 보고 중복 실행으로 단정하지 않습니다. 대상·시각·담당자·사유를 연결해 확인하세요.",
    },
    {
      screen: "대시보드",
      to: "/dashboard",
      anchor: "dashboard-orders",
      title: "전체 업무 둘러보기를 마칩니다",
      description:
        "대시보드 → 작업지시 → 자재 → 공정 → 검사·부적합 → 계보·감사 → 사용자 관리 순서로 확인했습니다. 화면은 자유롭게 둘러보되 등록·발행·완료·판정은 실제 기록을 바꾸므로 필요할 때만 실행하세요.",
    },
  ],
};

export function availableGuideSteps(
  role: RoleCode,
  navigation: NavigationGroup[],
  permissions: readonly string[],
) {
  const paths = new Set(
    navigation.flatMap((group) =>
      group.items.filter((item) => !item.pending).map((item) => item.to),
    ),
  );
  return ROLE_GUIDES[role].filter(
    (step) =>
      paths.has(step.to === "/work-orders/new" ? "/work-orders" : step.to) &&
      (!step.permission || permissions.includes(step.permission)),
  );
}

const memory = new Map<string, string>();
export function guideStorageKey(userId: string, roleCode: RoleCode) {
  return (
    "fabriscope:onboarding:v3:" + encodeURIComponent(userId) + ":" + roleCode
  );
}
export function hasGuideDecision(key: string) {
  try {
    return window.localStorage.getItem(key) !== null || memory.has(key);
  } catch {
    return memory.has(key);
  }
}
export function saveGuideDecision(
  key: string,
  decision: "completed" | "skipped",
) {
  memory.set(key, decision);
  try {
    window.localStorage.setItem(key, decision);
  } catch {
    /* 저장소가 차단되어도 안내와 업무 화면은 계속 사용할 수 있다. */
  }
}
