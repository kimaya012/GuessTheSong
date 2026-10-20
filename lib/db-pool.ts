// How many connections one server instance may hold open. Serverless hosts
// start many instances, and a free Postgres allows only a few dozen
// connections in total, so production defaults small. Override with
// DB_POOL_MAX (a whole number from 1 to 20).
export function poolMax(raw: string | undefined, isProd: boolean): number {
  const fallback = isProd ? 3 : 10;
  if (!raw || !/^\d+$/.test(raw.trim())) return fallback;
  const n = Number(raw);
  return n >= 1 && n <= 20 ? n : fallback;
}
