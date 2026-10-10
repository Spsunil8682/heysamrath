import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const root = join(__dirname, "..", "..");

export async function createTestDb() {
  const db = new PGlite();
  await db.exec(readFileSync(join(__dirname, "supabase-stub.sql"), "utf8"));
  const dir = join(root, "supabase", "migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    try {
      await db.exec(readFileSync(join(dir, file), "utf8"));
    } catch (e) {
      throw new Error(`Migration ${file} failed: ${(e as Error).message}`);
    }
  }
  await db.exec(readFileSync(join(root, "supabase", "seed.sql"), "utf8"));
  return db;
}

export type Db = PGlite;
export type Actor = { role: "anon" } | { role: "authenticated"; userId: string };

/** Runs SQL as a Supabase API role (RLS applies), inside a transaction that is committed. */
export async function asRole<T>(db: Db, actor: Actor, fn: (tx: Db) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${actor.role}`);
    if (actor.role === "authenticated") {
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [actor.userId]);
    }
    return fn(tx as unknown as Db);
  });
}

export async function createUser(db: Db, email: string, admin = false): Promise<string> {
  const { rows } = await db.query<{ id: string }>(`insert into auth.users (email) values ($1) returning id`, [email]);
  const id = rows[0].id;
  if (admin) await db.query(`update public.profiles set role = 'admin' where id = $1`, [id]);
  return id;
}
