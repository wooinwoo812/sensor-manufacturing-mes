import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, ErrorState } from "@/shared/ui";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  public override state: AppErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("애플리케이션 렌더링 오류", { error, errorInfo });
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <main
          className="grid min-h-svh place-items-center bg-canvas p-6"
          id="main-content"
          tabIndex={-1}
        >
          <div className="w-full max-w-xl">
            <ErrorState
              action={
                <Button onClick={() => window.location.reload()}>
                  화면 새로고침
                </Button>
              }
              description="입력한 내용은 저장되지 않았습니다. 화면을 새로고침해 주세요."
              headingLevel="h1"
              title="화면을 표시하지 못했습니다"
            />
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
