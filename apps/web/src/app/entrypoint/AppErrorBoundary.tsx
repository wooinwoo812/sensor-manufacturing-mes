import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/shared/ui";

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
        <main className="mx-auto mt-[12vh] max-w-xl border border-danger/30 border-t-4 border-t-danger bg-surface p-10 shadow-panel" role="alert">
          <span className="font-mono text-xs font-bold tracking-[0.12em] text-text-muted">
            SYSTEM ERROR
          </span>
          <h1 className="mt-2 text-2xl font-bold text-text-strong">
            화면을 표시하지 못했습니다
          </h1>
          <p className="mt-3 leading-7 text-text-muted">
            입력한 내용은 저장되지 않았습니다. 화면을 새로고침해 주세요.
          </p>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            화면 새로고침
          </Button>
        </main>
      );
    }

    return this.props.children;
  }
}
