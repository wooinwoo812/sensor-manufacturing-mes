import { Component, type ErrorInfo, type ReactNode } from "react";

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
        <main className="fatal-error" role="alert">
          <span className="section-kicker">SYSTEM ERROR</span>
          <h1>화면을 표시하지 못했습니다</h1>
          <p>입력한 내용은 저장되지 않았습니다. 화면을 새로고침해 주세요.</p>
          <button type="button" onClick={() => window.location.reload()}>
            화면 새로고침
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
