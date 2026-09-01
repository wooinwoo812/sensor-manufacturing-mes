import { Link } from "@tanstack/react-router";
import { Button, ForbiddenState } from "@/shared/ui";
import { Main } from "@/widgets/app-shell";

export function ForbiddenPage() {
  return (
    <Main
      className="grid flex-1 place-items-center"
      id="main-content"
      tabIndex={-1}
    >
      <div className="w-full max-w-2xl">
        <ForbiddenState
          action={
            <Button asChild>
              <Link to="/dashboard">운영 대시보드로 이동</Link>
            </Button>
          }
          description="현재 역할에 필요한 조회 권한이 없습니다. 역할을 전환하거나 허용된 시작 화면으로 이동하세요."
          headingLevel="h1"
          title="이 화면을 볼 권한이 없습니다"
        />
      </div>
    </Main>
  );
}
