import {
  Boxes,
  ClipboardCheck,
  ClipboardList,
  ShieldAlert,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ShadcnButton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/ui";
import { Main } from "@/widgets/app-shell";
import { Overview } from "./Overview";
import { RecentOperations } from "./RecentOperations";

const metrics = [
  {
    label: "진행 중 작업지시",
    value: "12",
    detail: "오늘 신규 3건",
    icon: ClipboardList,
  },
  {
    label: "생산 LOT",
    value: "48",
    detail: "공정 진행 31건",
    icon: Boxes,
  },
  {
    label: "검사 대기",
    value: "7",
    detail: "최종 검사 2건",
    icon: ClipboardCheck,
  },
  {
    label: "격리 대상",
    value: "2",
    detail: "확인 필요한 LOT",
    icon: ShieldAlert,
  },
] as const;

export function DashboardPage() {
  return (
    <Main id="main-content" tabIndex={-1}>
      <div className="mb-2 flex items-center justify-between space-y-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">운영 대시보드</h1>
          <p className="text-sm text-muted-foreground">
            생산·자재·품질 현황을 한곳에서 확인합니다.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <ShadcnButton disabled>작업지시 보기</ShadcnButton>
        </div>
      </div>

      <Tabs
        className="space-y-4"
        defaultValue="overview"
        orientation="vertical"
      >
        <div className="w-full overflow-x-auto pb-2">
          <TabsList>
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger disabled value="analytics">
              분석
            </TabsTrigger>
            <TabsTrigger disabled value="reports">
              보고서
            </TabsTrigger>
            <TabsTrigger disabled value="notifications">
              알림
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent className="space-y-4" value="overview">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => {
              const Icon = metric.icon;

              return (
                <Card key={metric.label}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {metric.label}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metric.value}</div>
                    <p className="text-xs text-muted-foreground">
                      {metric.detail}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
            <Card className="col-span-1 lg:col-span-4">
              <CardHeader>
                <CardTitle>주간 작업지시</CardTitle>
              </CardHeader>
              <CardContent className="ps-2">
                <Overview />
              </CardContent>
            </Card>
            <Card className="col-span-1 lg:col-span-3">
              <CardHeader>
                <CardTitle>최근 생산 활동</CardTitle>
                <CardDescription>
                  최근 갱신된 작업지시와 LOT입니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecentOperations />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </Main>
  );
}
