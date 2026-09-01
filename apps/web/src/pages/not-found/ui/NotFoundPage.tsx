import { Link } from "@tanstack/react-router";
import { Button, NotFoundState } from "@/shared/ui";

export function NotFoundPage() {
  return (
    <main
      className="grid min-h-svh place-items-center bg-canvas px-5"
      id="main-content"
      tabIndex={-1}
    >
      <div className="w-full max-w-xl">
        <NotFoundState
          action={
            <Button asChild>
              <Link to="/dashboard">운영 대시보드로 이동</Link>
            </Button>
          }
          description="주소가 변경됐거나 아직 구현되지 않은 업무 화면입니다."
          headingLevel="h1"
          title="요청한 화면을 찾을 수 없습니다"
        />
      </div>
    </main>
  );
}
