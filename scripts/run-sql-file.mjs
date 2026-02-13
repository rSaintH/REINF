import pg from "pg";
import { readFileSync } from "fs";

const DATABASE_URL =
  "postgresql://postgres:Clodoaldosilva@db.cfnpoltyqgdqqrlewofk.supabase.co:5432/postgres";

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: node scripts/run-sql-file.mjs <file.sql>");
    process.exit(1);
  }

  const sql = readFileSync(filePath, "utf-8");
  await client.connect();
  try {
    const result = await client.query(sql);
    console.log("OK -", result.rowCount ?? 0, "row(s) affected");
  } catch (err) {
    console.error("SQL Error:", err.message);
  } finally {
    await client.end();
  }
}

run();
