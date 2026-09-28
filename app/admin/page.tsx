import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, desc, gt, ilike, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, entitlements, songs, user, webhookEvents } from "@/db/schema";
import { getViewer } from "@/lib/viewer";
import { can } from "@/lib/authz/policy";
import { grantPremiumAction, revokePremiumAction, setRoleAction, toggleSongAction } from "./actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

const fmt = (d: Date | null) => (d ? d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "");

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const viewer = await getViewer();
  // Pretend the page doesn't exist for everyone else.
  if (!can(viewer, "admin:access")) notFound();

  const q = ((await searchParams).q ?? "").trim().slice(0, 100);
  const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`);

  const users = await db
    .select({ id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt })
    .from(user)
    .where(q ? ilike(user.email, `%${escaped}%`) : undefined)
    .orderBy(desc(user.createdAt))
    .limit(25);

  const premiumRows = users.length
    ? await db
        .select({ userId: entitlements.userId, end: entitlements.currentPeriodEnd, source: entitlements.source })
        .from(entitlements)
        .where(
          and(
            inArray(entitlements.userId, users.map((u) => u.id)),
            inArray(entitlements.status, ["active", "cancelled"]),
            gt(entitlements.currentPeriodEnd, sql`now()`),
          ),
        )
    : [];
  const premiumBy = new Map(premiumRows.map((r) => [r.userId, r]));

  const [catalog, events, audits] = await Promise.all([
    db.select({ id: songs.id, title: songs.title, artist: songs.artist, active: songs.active }).from(songs).orderBy(songs.title),
    db.select().from(webhookEvents).orderBy(desc(webhookEvents.receivedAt)).limit(15),
    db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(15),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="font-display text-5xl">Admin</h1>
      <p className="mt-2 text-muted-foreground">Every change here is recorded in the audit log below.</p>

      <section className="panel mt-8 rounded-3xl p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Players</h2>
          <form className="flex gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search by email"
              className="h-10 w-64 rounded-full bg-night/70 px-4 text-sm ring-1 ring-white/15 focus:outline-none focus:ring-2 focus:ring-marigold"
            />
            <button className="h-10 rounded-full bg-white/10 px-4 text-sm font-bold ring-1 ring-white/15">Search</button>
          </form>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">Email</th>
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 pr-3 font-medium">Premium</th>
                <th className="py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {users.map((u) => {
                const p = premiumBy.get(u.id);
                return (
                  <tr key={u.id} className="align-middle">
                    <td className="py-3 pr-3">
                      <p className="font-medium">{u.email}</p>
                      <p className="text-xs text-muted-foreground">Joined {fmt(u.createdAt)}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <form action={setRoleAction} className="flex items-center gap-2">
                        <input type="hidden" name="userId" value={u.id} />
                        <select
                          name="role"
                          defaultValue={u.role ?? "user"}
                          aria-label={`Role for ${u.email}`}
                          className="h-9 rounded-lg bg-night px-2 ring-1 ring-white/15"
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                        <button className="text-xs font-bold text-peacock">Save</button>
                      </form>
                    </td>
                    <td className="py-3 pr-3">
                      {p ? (
                        <span className="text-marigold">
                          Until {fmt(p.end)} ({p.source})
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Free</span>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <form action={grantPremiumAction} className="flex items-center gap-1.5">
                          <input type="hidden" name="userId" value={u.id} />
                          <input
                            name="days"
                            type="number"
                            min={1}
                            max={366}
                            defaultValue={30}
                            aria-label={`Days of Premium for ${u.email}`}
                            className="h-9 w-16 rounded-lg bg-night px-2 ring-1 ring-white/15"
                          />
                          <button className="h-9 rounded-full bg-marigold/15 px-3 text-xs font-bold text-marigold">Grant days</button>
                        </form>
                        {p && (
                          <form action={revokePremiumAction}>
                            <input type="hidden" name="userId" value={u.id} />
                            <button className="h-9 rounded-full px-3 text-xs font-bold text-rani ring-1 ring-rani/30">Revoke</button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted-foreground">
                    No players match that search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel mt-6 rounded-3xl p-6">
        <details>
          <summary className="cursor-pointer text-lg font-semibold">
            Song catalog ({catalog.filter((s) => s.active).length} of {catalog.length} active)
          </summary>
          <ul className="mt-4 grid gap-1 sm:grid-cols-2">
            {catalog.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm hover:bg-white/4">
                <span className={`truncate ${s.active ? "" : "text-muted-foreground line-through"}`}>
                  {s.title} <span className="text-muted-foreground">({s.artist})</span>
                </span>
                <form action={toggleSongAction}>
                  <input type="hidden" name="songId" value={s.id} />
                  <input type="hidden" name="active" value={s.active ? "false" : "true"} />
                  <button className="shrink-0 text-xs font-bold text-peacock">{s.active ? "Deactivate" : "Activate"}</button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="panel rounded-3xl p-6">
          <h2 className="text-lg font-semibold">Buy Me a Coffee webhooks</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {events.map((e) => (
              <li key={e.id} className="rounded-lg bg-white/4 px-3 py-2">
                <span className="font-medium">{e.type}</span>{" "}
                <span className={e.error ? "text-rani" : e.processedAt ? "text-mint" : "text-muted-foreground"}>
                  {e.error ? `failed: ${e.error}` : e.processedAt ? "processed" : "pending"}
                </span>
                <p className="text-xs text-muted-foreground">{fmt(e.receivedAt)}</p>
              </li>
            ))}
            {events.length === 0 && <li className="text-muted-foreground">No webhooks received yet.</li>}
          </ul>
        </section>
        <section className="panel rounded-3xl p-6">
          <h2 className="text-lg font-semibold">Audit log</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {audits.map((a) => (
              <li key={a.id} className="rounded-lg bg-white/4 px-3 py-2">
                <span className="font-medium">{a.action}</span>{" "}
                <span className="text-muted-foreground">on {a.target ?? "n/a"}</span>
                <p className="truncate text-xs text-muted-foreground">
                  {fmt(a.createdAt)} {JSON.stringify(a.metadata)}
                </p>
              </li>
            ))}
            {audits.length === 0 && <li className="text-muted-foreground">Nothing recorded yet.</li>}
          </ul>
        </section>
      </div>
    </main>
  );
}
