import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

// Configure before any app module reads the environment.
const outbox = mkdtempSync(path.join(tmpdir(), "kept-outbox-"));
process.env.EMAIL_OUTBOX_DIR = outbox;
process.env.ADMIN_EMAILS = "boss@kept.test";

type App = {
  account: typeof import("@/lib/auth/account");
  users: typeof import("@/lib/auth/users");
  pacts: typeof import("@/lib/domain/pacts");
  queries: typeof import("@/lib/domain/queries");
  db: typeof import("@/lib/db/client")["db"];
  schema: typeof import("@/lib/db/schema");
  eq: typeof import("drizzle-orm")["eq"];
};
let app: App;

beforeAll(async () => {
  const { ensureMigrated } = await import("@/lib/db/migrate");
  await ensureMigrated();
  app = {
    account: await import("@/lib/auth/account"),
    users: await import("@/lib/auth/users"),
    pacts: await import("@/lib/domain/pacts"),
    queries: await import("@/lib/domain/queries"),
    db: (await import("@/lib/db/client")).db,
    schema: await import("@/lib/db/schema"),
    eq: (await import("drizzle-orm")).eq,
  };
});

/** The token from the newest email sent to `to`. */
function lastLink(to: string, route: "verify-email" | "reset-password"): string {
  const files = readdirSync(outbox).sort();
  for (const f of files.reverse()) {
    const mail = JSON.parse(readFileSync(path.join(outbox, f), "utf8")) as { to: string; action?: { url: string } };
    if (mail.to === to && mail.action?.url.includes(`/${route}?token=`)) return new URL(mail.action.url).searchParams.get("token")!;
  }
  throw new Error(`no ${route} email for ${to}`);
}

const reload = async (id: string) => (await app.db.select().from(app.schema.users).where(app.eq(app.schema.users.id, id)))[0];

describe("email verification", () => {
  it("doesn't grant ADMIN_EMAILS rights until the address is verified, then does", async () => {
    const u = await app.users.createUser({ name: "The Boss", email: "boss@kept.test", password: "password123" });
    expect(u.role).toBe("user");
    expect(u.emailVerifiedAt).toBeNull();

    await app.account.sendVerificationEmail(u);
    const token = lastLink("boss@kept.test", "verify-email");
    const verified = await app.account.verifyEmail(token);
    expect(verified.emailVerifiedAt).not.toBeNull();
    expect(verified.role).toBe("admin");

    await expect(app.account.verifyEmail(token)).rejects.toThrow(/invalid or has expired/);
  });

  it("rejects expired links and cancels older links when a new one is sent", async () => {
    const u = await app.users.createUser({ name: "Late Larry", email: "larry@kept.test", password: "password123" });
    await app.account.sendVerificationEmail(u);
    const first = lastLink("larry@kept.test", "verify-email");
    await app.account.sendVerificationEmail(u);
    const second = lastLink("larry@kept.test", "verify-email");
    expect(second).not.toBe(first);
    await expect(app.account.verifyEmail(first)).rejects.toThrow();

    await app.db.update(app.schema.authTokens).set({ expiresAt: new Date(Date.now() - 1000) }).where(app.eq(app.schema.authTokens.userId, u.id));
    await expect(app.account.verifyEmail(second)).rejects.toThrow(/expired/);
    expect((await reload(u.id)).emailVerifiedAt).toBeNull();
  });

  it("shows email-addressed invites only to a verified owner of the address", async () => {
    const client = await app.users.createUser({ name: "Priya Shah", email: "priya@kept.test", password: "password123", emailVerified: true });
    const pact = await app.pacts.createPact(client, {
      title: "Logo refresh",
      summary: "A new logo",
      creatorRole: "client",
      counterpartyEmail: "tomas@kept.test",
      terms: { revisionsIncluded: 1, reviewWindowHours: 72, ipTransfer: "Client owns on payment" },
      milestones: [{ title: "Logo", description: "Final logo", amount: 200, criteria: [{ text: "SVG and PNG delivered", kind: "objective", check: { type: "none" } }] }],
    });
    await app.pacts.sendPact(client, pact.id);

    // Someone registers the invitee's address before the real owner does.
    const squatter = await app.users.createUser({ name: "Not Tomas", email: "tomas@kept.test", password: "password123" });
    expect((await app.pacts.listPactsForUser(squatter)).map((p) => p.id)).not.toContain(pact.id);
    const dash = await app.queries.getDashboard(squatter);
    expect(dash.actions.some((a) => a.href.includes(pact.inviteToken))).toBe(false);
    const notes = await app.db.select().from(app.schema.notifications).where(app.eq(app.schema.notifications.userId, squatter.id));
    expect(notes).toHaveLength(0);

    // Once the address is proven, the invite appears.
    await app.account.sendVerificationEmail(squatter);
    const owner = await app.account.verifyEmail(lastLink("tomas@kept.test", "verify-email"));
    expect((await app.pacts.listPactsForUser(owner)).map((p) => p.id)).toContain(pact.id);
  });
});

describe("passwords", () => {
  it("resets a password from an emailed link, once, and ends other sessions", async () => {
    const u = await app.users.createUser({ name: "Forgetful Fay", email: "fay@kept.test", password: "old-password-1" });
    await app.account.requestPasswordReset("FAY@kept.test");
    const token = lastLink("fay@kept.test", "reset-password");
    expect(await app.account.peekToken(token, "reset_password")).toBe("valid");

    const after = await app.account.resetPassword(token, "new-password-2");
    expect(after.sessionVersion).toBe(u.sessionVersion + 1);
    expect(after.emailVerifiedAt).not.toBeNull();
    await expect(app.users.authenticate("fay@kept.test", "old-password-1")).rejects.toThrow();
    expect((await app.users.authenticate("fay@kept.test", "new-password-2")).id).toBe(u.id);

    expect(await app.account.peekToken(token, "reset_password")).toBe("invalid");
    await expect(app.account.resetPassword(token, "another-password-3")).rejects.toThrow(/invalid or has expired/);
  });

  it("says nothing about whether an account exists", async () => {
    const before = readdirSync(outbox).length;
    await expect(app.account.requestPasswordReset("nobody@kept.test")).resolves.toBeUndefined();
    expect(readdirSync(outbox).length).toBe(before);
  });

  it("changes a password only with the current one, and ends other sessions", async () => {
    const u = await app.users.createUser({ name: "Careful Cam", email: "cam@kept.test", password: "first-password" });
    await expect(app.account.changePassword(u, "wrong-password", "second-password")).rejects.toThrow(/current password/);
    await expect(app.account.changePassword(u, "first-password", "short")).rejects.toThrow(/8 characters/);
    const changed = await app.account.changePassword(u, "first-password", "second-password");
    expect(changed.sessionVersion).toBe(u.sessionVersion + 1);
    expect((await app.users.authenticate("cam@kept.test", "second-password")).id).toBe(u.id);

    const revoked = await app.account.revokeSessions(changed);
    expect(revoked.sessionVersion).toBe(changed.sessionVersion + 1);
  });

  it("issues session tokens that carry the session version", async () => {
    const { createSessionToken, verifySessionToken } = await import("@/lib/auth/session");
    const token = await createSessionToken("usr_x", 3);
    expect(await verifySessionToken(token)).toEqual({ uid: "usr_x", sv: 3 });
    expect(await verifySessionToken(`${token.slice(0, -2)}xx`)).toBeNull();
  });
});
