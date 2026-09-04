import pg from "pg";
import { resolveDatabaseUrl } from "../src/database/database-url.js";

const { Client } = pg;
const client = new Client({ connectionString: resolveDatabaseUrl() });

try {
  await client.connect();
  const result = await client.query<{ database: string }>(
    "SELECT current_database() AS database",
  );
  const database = result.rows[0]?.database;

  if (!database) {
    throw new Error("PostgreSQL이 현재 database 이름을 반환하지 않았습니다.");
  }

  console.log(`PostgreSQL 연결 정상: ${database}`);
} finally {
  await client.end();
}
