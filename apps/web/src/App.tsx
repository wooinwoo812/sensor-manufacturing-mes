import { ApiConnectionStatus } from "./components/ApiConnectionStatus";

const navigationItems = [
  "운영 대시보드",
  "작업지시",
  "자재",
  "공정 실행",
  "품질",
  "LOT 계보",
  "감사이력",
] as const;

export function App() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        본문으로 건너뛰기
      </a>

      <aside className="sidebar" aria-label="주요 업무영역">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true">
            SM
          </span>
          <div>
            <strong>Sensor MES</strong>
            <span>Manufacturing execution</span>
          </div>
        </div>

        <nav>
          <ul className="nav-list">
            {navigationItems.map((item, index) => (
              <li key={item}>
                <button
                  className={index === 0 ? "nav-item is-active" : "nav-item"}
                  type="button"
                  aria-current={index === 0 ? "page" : undefined}
                  disabled={index !== 0}
                >
                  <span className="nav-index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <p className="sidebar-note">v1.0 실행 기반 구성 중</p>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">시스템 상태</span>
            <h1>실행 기반 점검</h1>
          </div>
          <span className="environment-badge">LOCAL</span>
        </header>

        <main id="main-content" className="content" tabIndex={-1}>
          <section className="intro-panel" aria-labelledby="foundation-heading">
            <div>
              <span className="section-kicker">FOUNDATION / ISSUE 01</span>
              <h2 id="foundation-heading">Web과 API가 같은 계약으로 실행됩니다</h2>
              <p>
                이후 작업지시·자재·검사 기능이 같은 명령과 품질 기준 위에서
                동작하도록 먼저 연결 상태를 검증합니다.
              </p>
            </div>
            <div className="foundation-grid" aria-label="기반 구성요소">
              <FoundationItem label="Web" value="React + Vite" />
              <FoundationItem label="API" value="NestJS" />
              <FoundationItem label="Data" value="PostgreSQL + Prisma" />
            </div>
          </section>

          <ApiConnectionStatus />
        </main>
      </div>
    </div>
  );
}

interface FoundationItemProps {
  label: string;
  value: string;
}

function FoundationItem({ label, value }: FoundationItemProps) {
  return (
    <div className="foundation-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
