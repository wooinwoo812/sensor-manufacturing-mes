import "dotenv/config";

/**
 * DATABASE_URL 환경변수를 읽어 반환한다.
 *
 * 프로세스 환경변수가 우선이며, 없으면 dotenv가 현재 작업 디렉터리의 .env를
 * 읽는다(apps/api 기준으로 실행되는 스크립트·런타임은 apps/api/.env).
 * 어느 쪽에도 없으면 임의의 localhost로 접속하지 않고 즉시 실패한다.
 */
export function resolveDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL 환경변수가 설정되지 않았습니다. " +
        ".env.example을 참고해 apps/api/.env 또는 프로세스 환경변수에 지정하세요.",
    );
  }

  return databaseUrl;
}
