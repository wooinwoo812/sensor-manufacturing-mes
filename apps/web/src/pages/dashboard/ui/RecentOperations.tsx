import { Avatar, AvatarFallback } from "@/shared/ui";

const operations = [
  {
    code: "WO-2026-0902-014",
    detail: "열화상 센서 조립 · 진행 중",
    initials: "조",
    quantity: "120 EA",
  },
  {
    code: "LOT-FPA-260902-03",
    detail: "FPA 공정 · 검사 대기",
    initials: "검",
    quantity: "48 EA",
  },
  {
    code: "WO-2026-0902-011",
    detail: "영상 센서 보정 · 완료",
    initials: "완",
    quantity: "80 EA",
  },
  {
    code: "LOT-MAT-260901-22",
    detail: "원자재 LOT · 격리",
    initials: "격",
    quantity: "2 LOT",
  },
] as const;

export function RecentOperations() {
  return (
    <div className="space-y-8">
      {operations.map((operation) => (
        <div className="flex items-center gap-4" key={operation.code}>
          <Avatar className="h-9 w-9">
            <AvatarFallback>{operation.initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <p className="text-sm leading-none font-medium">
                {operation.code}
              </p>
              <p className="text-sm text-muted-foreground">
                {operation.detail}
              </p>
            </div>
            <div className="font-medium">{operation.quantity}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
