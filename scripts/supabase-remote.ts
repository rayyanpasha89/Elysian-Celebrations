import "dotenv/config";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";
import { Client } from "pg";

type Command = "link" | "push" | "push:seed" | "pull" | "list" | "query";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function env(name: string) {
  const value = process.env[name];
  if (!value) {
    fail(`Missing required environment variable: ${name}`);
  }
  return value;
}

function runSupabase(args: string[]) {
  execFileSync("npx", ["supabase", ...args], {
    stdio: "inherit",
    env: process.env,
  });
}

function ensureLinkedProject() {
  runSupabase([
    "link",
    "--project-ref",
    env("SUPABASE_PROJECT_ID"),
    "--password",
    env("SUPABASE_DB_PASSWORD"),
  ]);
}

function queryInput(args: string[]) {
  const sqlFlag = args.indexOf("--sql");
  if (sqlFlag >= 0 && args[sqlFlag + 1]) {
    return args[sqlFlag + 1];
  }

  const fileFlag = args.indexOf("--file");
  if (fileFlag >= 0 && args[fileFlag + 1]) {
    return readFileSync(args[fileFlag + 1], "utf8");
  }

  fail('Provide either `--sql "select 1"` or `--file path/to/query.sql`.');
}

async function runQuery(args: string[]) {
  const sql = queryInput(args);
  const connectionString = env("SUPABASE_DB_URL");
  const client = new Client({
    connectionString,
    ssl: connectionString.includes("sslmode=disable")
      ? undefined
      : { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    const result = await client.query(sql);
    if (result.rows.length > 0) {
      console.log(JSON.stringify(result.rows, null, 2));
      return;
    }

    console.log(
      JSON.stringify(
        {
          command: result.command,
          rowCount: result.rowCount ?? 0,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

function usage() {
  console.log(`
Usage:
  npm run db:link
  npm run db:push
  npm run db:push:seed
  npm run db:pull -- baseline_name
  npm run db:migrations
  npm run db:query -- --sql "select now();"
  npm run db:query -- --file ./queries/check.sql
`);
}

async function main() {
  const [command, ...args] = process.argv.slice(2) as [Command | undefined, ...string[]];

  switch (command) {
    case "link":
      ensureLinkedProject();
      return;
    case "push":
      ensureLinkedProject();
      runSupabase(["db", "push", "--linked", "--password", env("SUPABASE_DB_PASSWORD")]);
      return;
    case "push:seed":
      ensureLinkedProject();
      runSupabase([
        "db",
        "push",
        "--linked",
        "--include-seed",
        "--password",
        env("SUPABASE_DB_PASSWORD"),
      ]);
      return;
    case "pull":
      ensureLinkedProject();
      runSupabase([
        "db",
        "pull",
        ...(args[0] ? [args[0]] : []),
        "--linked",
        "--password",
        env("SUPABASE_DB_PASSWORD"),
      ]);
      return;
    case "list":
      ensureLinkedProject();
      runSupabase([
        "migration",
        "list",
        "--linked",
        "--password",
        env("SUPABASE_DB_PASSWORD"),
      ]);
      return;
    case "query":
      await runQuery(args);
      return;
    default:
      usage();
  }
}

void main();
