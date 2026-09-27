import "./load-env";
import { createHmac, randomInt } from "node:crypto";

// Sends a correctly signed Buy Me a Coffee membership webhook to the local
// (or given) app, to exercise the Premium flow without a real payment.
//   npx tsx scripts/send-test-webhook.ts <email> [started|updated|cancelled] [periodDays] [membershipId]
async function main() {
  const [email, kind = "started", periodDays = "30", membershipId = "900001"] = process.argv.slice(2);
  if (!email) throw new Error("usage: send-test-webhook.ts <email> [started|updated|cancelled] [periodDays] [membershipId]");
  const secret = process.env.BMC_WEBHOOK_SECRET;
  if (!secret) throw new Error("BMC_WEBHOOK_SECRET is not set in .env.local");

  const now = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({
    type: `membership.${kind}`,
    live_mode: false,
    attempt: 1,
    created: now,
    event_id: randomInt(1, 2 ** 31),
    data: {
      id: Number(membershipId),
      status: kind === "cancelled" ? "canceled" : "active",
      canceled: kind === "cancelled" ? "true" : "false",
      supporter_email: email,
      membership_level_name: "Premium Listener",
      current_period_start: now,
      current_period_end: now + Number(periodDays) * 86400,
    },
  });
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  const url = `${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/api/webhooks/bmc`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-signature-sha256": signature },
    body,
  });
  console.log(res.status, await res.text());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
