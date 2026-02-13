import pg from "pg";

const DATABASE_URL =
  "postgresql://postgres:Clodoaldosilva@db.cfnpoltyqgdqqrlewofk.supabase.co:5432/postgres";

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const sql = process.argv[2];
  if (!sql) {
    console.error("Usage: node scripts/db.mjs \"SQL QUERY\"");
    process.exit(1);
  }

  await client.connect();
  try {
    const result = await client.query(sql);
    if (result.rows && result.rows.length > 0) {
      console.table(result.rows);
    } else {
      console.log("OK -", result.rowCount ?? 0, "row(s) affected");
    }
  } catch (err) {
    console.error("SQL Error:", err.message);
  } finally {
    await client.end();
  }
}

run();
