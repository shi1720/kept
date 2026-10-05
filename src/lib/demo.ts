import { and, eq } from "drizzle-orm";
import { createUser } from "@/lib/auth/users";
import { db } from "@/lib/db/client";
import {
  disputes,
  events,
  ledgerEntries,
  milestones,
  payments,
  payouts,
  refunds,
  pacts,
  submissions,
  artifacts,
  users,
  verdicts,
  type CriterionResult,
  type User,
} from "@/lib/db/schema";
import { loadMilestone } from "@/lib/domain/context";
import { recordEvent, setEventClock } from "@/lib/domain/events";
import { captureFunding, createFundingOrder } from "@/lib/domain/funding";
import { acceptPact, createPact, sendPact, type PactInput } from "@/lib/domain/pacts";
import { settleMilestone } from "@/lib/domain/settlement";
import { env } from "@/lib/env";
import { newId, newToken } from "@/lib/ids";
import { simulator } from "@/lib/paypal";
import { scoreVerdict } from "@/lib/ai/referee";

/**
 * "Try the demo" builds a private, isolated world for every visitor:
 * Maya (client, Lantern Coffee Roasters) and Ana (freelance designer), with
 * pacts in every interesting state so a judge can play both sides in minutes.
 * Seeded history runs on the PayPal simulator; anything the visitor funds
 * from here on goes through the real PayPal sandbox.
 */

const none = { type: "none" as const };

const DM_SOURCE = `Maya: Hey Ana! Loved your work for Bluebird Café. We're launching a holiday blend and need packaging art.
Ana: Thanks! Happy to help. What do you have in mind?
Maya: Something warm, a bit vintage, fits our Lantern brand. Bag front + a matching sticker. Budget is around $3,500.
Ana: Works for me. I'll do 2 concepts, you pick one, then I finalize. Print-ready files?
Maya: Yes please, print-ready. We need it before Nov 20 for the printer.
Ana: 👍 I'll include a few revisions.`;

function brandPact(): PactInput {
  return {
    title: "Brand identity for Lantern Coffee Roasters",
    summary:
      "Ana designs a new logo system and a compact brand guide for Lantern, a specialty roastery in Austin. Delivered in two milestones: concepts, then the final suite.",
    currency: "USD",
    creatorRole: "client",
    counterpartyName: "Ana Reyes",
    terms: { revisionsIncluded: 2, reviewWindowHours: 72, ipTransfer: "All rights transfer to Lantern Coffee Roasters when the final milestone is released." },
    clarityScore: 58,
    ambiguities: [
      { quote: "a modern but warm logo", issue: "Style words with no reference", suggestion: "Anchored to the 3 reference brands Maya shared (Heart Roasters, Onyx, Little Wolf)" },
      { quote: "a few options", issue: "Number of concepts unclear", suggestion: "Exactly 3 distinct logo concepts" },
    ],
    riskFlags: [],
    milestones: [
      {
        title: "Three logo concepts",
        description: "Three distinct logo directions presented on a single board with rationale.",
        amount: 2000,
        dueInDays: 7,
        criteria: [
          { text: "Presents exactly 3 distinct logo concepts", kind: "objective", check: { type: "min_files", value: 1 } },
          { text: "Each concept includes a one-paragraph rationale", kind: "objective", check: none },
          { text: "Concepts feel warm and craft-focused, consistent with the reference brands", kind: "subjective", check: none },
        ],
      },
      {
        title: "Final logo suite & brand guide",
        description: "Final logo in all lockups plus a 6+ page brand guide (colours, type, usage).",
        amount: 3000,
        dueInDays: 10,
        criteria: [
          { text: "Logo delivered as SVG and PNG", kind: "objective", check: { type: "file_types", values: ["svg", "png"] } },
          { text: "Brand guide specifies the colour palette with HEX values", kind: "objective", check: { type: "keywords_present", values: ["#"] } },
          { text: "Brand guide covers typography and clear-space rules", kind: "objective", check: { type: "keywords_present", values: ["typography", "clear space"] } },
          { text: "Primary logo works in a single colour", kind: "subjective", check: none },
        ],
      },
    ],
  };
}

function landingPact(): PactInput {
  return {
    title: "Pre-order landing page for the Holiday Blend",
    summary: "A one-page site where customers can pre-order Lantern's Holiday Blend, live on a public URL.",
    currency: "USD",
    creatorRole: "freelancer",
    counterpartyName: "Maya Chen",
    terms: { revisionsIncluded: 1, reviewWindowHours: 48, ipTransfer: "Lantern owns the page and its code once paid." },
    clarityScore: 41,
    ambiguities: [{ quote: "mobile friendly", issue: "Not testable as written", suggestion: "Page has a viewport meta tag and a single-column layout under 600px" }],
    riskFlags: [],
    milestones: [
      {
        title: "Live landing page",
        description: "Public landing page with product story, pricing and a pre-order call to action.",
        amount: 4500,
        dueInDays: 5,
        criteria: [
          { text: "Page is live and publicly reachable", kind: "objective", check: { type: "url_reachable" } },
          { text: "Page names the product “Holiday Blend” and shows its price", kind: "objective", check: { type: "page_contains", values: ["Holiday Blend", "$"] } },
          { text: "Page has a clear “Pre-order” call to action", kind: "objective", check: { type: "page_contains", values: ["Pre-order"] } },
          { text: "Copy has at least 150 words telling the origin story of the beans", kind: "objective", check: { type: "min_words", value: 150 } },
          { text: "Visual style matches Lantern's warm, craft brand", kind: "subjective", check: none },
          { text: "Works on phones: a single-column layout that is readable on small screens", kind: "subjective", check: none },
        ],
      },
    ],
  };
}

function captionsPact(): PactInput {
  return {
    title: "Instagram launch captions (6 posts)",
    summary: "Six on-brand Instagram captions for the Holiday Blend launch week.",
    currency: "USD",
    creatorRole: "client",
    counterpartyName: "Ana Reyes",
    terms: { revisionsIncluded: 1, reviewWindowHours: 72, ipTransfer: "Lantern owns the captions once paid." },
    clarityScore: 66,
    ambiguities: [],
    riskFlags: [],
    milestones: [
      {
        title: "Six captions",
        description: "Six captions, 60–120 words each, with 5 relevant hashtags per post.",
        amount: 1200,
        dueInDays: 4,
        criteria: [
          { text: "Delivers six distinct captions", kind: "objective", check: none },
          { text: "Each caption is 60–120 words", kind: "objective", check: none },
          { text: "Each caption ends with 5 relevant hashtags", kind: "objective", check: none },
          { text: "Tone is warm and playful, matching Lantern's voice", kind: "subjective", check: none },
        ],
      },
    ],
  };
}

const CAPTIONS = `1/ The kettle's on, the lights are low, and the Holiday Blend is finally here. Notes of dark cherry, cocoa nib and a whisper of orange peel, roasted in small batches right here in Austin. Pour a cup, call someone you love, and slow down for a minute. #HolidayBlend #LanternCoffee #AustinCoffee #SpecialtyCoffee #CozySeason

2/ Meet the farmers behind this year's blend: the Alvarado family in Huila, Colombia, who have grown coffee on the same hillside for three generations. Every bag you buy pays them 40% above fair-trade price. Good coffee, good people. #HolidayBlend #DirectTrade #LanternCoffee #CoffeeFarmers #Huila

3/ Gift idea: a bag of Holiday Blend and a handwritten note. That's it. That's the gift. #LanternCoffee #GiftIdeas #HolidayBlend #CoffeeLover #ShopSmall

4/ Our roaster Sam tasted 14 profiles before landing on this one. Lighter than last year, sweeter in the finish, and it plays beautifully with oat milk. Come taste the difference at the bar this weekend. #HolidayBlend #LanternCoffee #RoastersLife #OatLatte #AustinEats`;

function v(criteriaIds: string[], rows: [CriterionResult["result"], number, string, string][]): CriterionResult[] {
  return rows.map(([result, confidence, evidence, reasoning], i) => ({ criterionId: criteriaIds[i], result, confidence, evidence, reasoning, machineCheck: null }));
}

/** A monotonically advancing fake clock so seeded history reads like real life. */
function timeline(startDaysAgo: number, endHoursAgo: number, steps: number) {
  const start = Date.now() - startDaysAgo * 86_400_000;
  const end = Date.now() - endHoursAgo * 3_600_000;
  const step = (end - start) / Math.max(1, steps);
  let t = start;
  return () => {
    t = Math.min(end, t + step * (0.5 + Math.random()));
    return new Date(t);
  };
}

async function stampPact(pactId: string, at: Date) {
  const pactEvents = await db.select().from(events).where(eq(events.pactId, pactId));
  const firstOf = (type: string) => pactEvents.filter((e) => e.type === type).sort((a, b) => +a.createdAt - +b.createdAt)[0]?.createdAt;
  const created = firstOf("pact.created") ?? new Date(at.getTime() - 86_400_000);
  const [pactRow] = await db.select().from(pacts).where(eq(pacts.id, pactId)).limit(1);
  const authorSigned = firstOf("pact.signed");
  const counterSigned = firstOf("pact.activated");
  const clientFirst = pactRow.creatorRole === "client";
  await db
    .update(pacts)
    .set({
      createdAt: created,
      updatedAt: at,
      ...(pactRow.clientSignedAt ? { clientSignedAt: (clientFirst ? authorSigned : counterSigned) ?? pactRow.clientSignedAt } : {}),
      ...(pactRow.freelancerSignedAt ? { freelancerSignedAt: (clientFirst ? counterSigned : authorSigned) ?? pactRow.freelancerSignedAt } : {}),
    })
    .where(eq(pacts.id, pactId));
  // Align milestone, payment, submission and verdict timestamps with the seeded event timeline.
  const evts = await db.select().from(events).where(eq(events.pactId, pactId));
  const ms = await db.select().from(milestones).where(eq(milestones.pactId, pactId));
  for (const m of ms) {
    const at = (type: string) => evts.find((e) => e.milestoneId === m.id && e.type === type)?.createdAt;
    const funded = at("milestone.funded");
    const resolved = at("milestone.released") ?? at("milestone.settled") ?? at("milestone.refunded");
    const disputeOpened = at("dispute.opened");
    let reviewed =
      at("review.completed") ??
      (disputeOpened ? new Date(disputeOpened.getTime() - 3 * 3_600_000) : undefined) ??
      (resolved ? new Date(resolved.getTime() - 3_600_000) : undefined);
    // Work still in review: the delivery time must agree with the review deadline shown on the page.
    if (m.status === "in_review" && m.reviewDeadlineAt) {
      const submittedAt = new Date(m.reviewDeadlineAt.getTime() - pactRow.terms.reviewWindowHours * 3_600_000);
      reviewed = new Date(submittedAt.getTime() + 9 * 60_000);
      for (const e of evts.filter((e) => e.milestoneId === m.id && (e.type === "work.submitted" || e.type === "review.completed"))) {
        await db.update(events).set({ createdAt: e.type === "work.submitted" ? submittedAt : reviewed }).where(eq(events.id, e.id));
      }
    }
    // A finished milestone wasn't "due" weeks after it was paid.
    if (resolved && m.dueAt && m.dueAt.getTime() > resolved.getTime() + 2 * 86_400_000) {
      await db.update(milestones).set({ dueAt: new Date(resolved.getTime() + 2 * 86_400_000) }).where(eq(milestones.id, m.id));
    }
    if (funded) {
      await db.update(milestones).set({ fundedAt: funded }).where(eq(milestones.id, m.id));
      await db.update(payments).set({ createdAt: funded, capturedAt: funded }).where(eq(payments.milestoneId, m.id));
    }
    if (resolved) {
      await db.update(milestones).set({ resolvedAt: resolved }).where(eq(milestones.id, m.id));
      await db.update(payouts).set({ createdAt: resolved, updatedAt: resolved }).where(eq(payouts.milestoneId, m.id));
      await db.update(refunds).set({ createdAt: resolved }).where(eq(refunds.milestoneId, m.id));
    }
    // Ledger journals carry the time the money actually moved.
    const lines = await db.select().from(ledgerEntries).where(eq(ledgerEntries.milestoneId, m.id));
    for (const line of lines) {
      const when = /funded|processing fee/i.test(line.memo) ? funded : resolved;
      if (when) await db.update(ledgerEntries).set({ createdAt: when }).where(eq(ledgerEntries.id, line.id));
    }
    const opened = pactEvents.find((e) => e.milestoneId === m.id && e.type === "dispute.opened")?.createdAt;
    if (opened) await db.update(disputes).set({ createdAt: opened }).where(eq(disputes.milestoneId, m.id));
    if (reviewed) {
      const submitted = new Date(reviewed.getTime() - 9 * 60_000);
      await db.update(milestones).set({ submittedAt: submitted }).where(eq(milestones.id, m.id));
      await db.update(submissions).set({ createdAt: submitted }).where(eq(submissions.milestoneId, m.id));
      await db.update(verdicts).set({ createdAt: reviewed }).where(eq(verdicts.milestoneId, m.id));
    }
  }
}

/** Seeded verdicts get their score, overall result and release recommendation from the same code as live ones. */
function scored<T extends { criteriaResults: { result: "met" | "partially_met" | "not_met" | "cannot_verify" }[]; recommendedReleasePct: number }>(
  v: T,
): Omit<T, "overall" | "score" | "recommendedReleasePct"> & ReturnType<typeof scoreVerdict> {
  return { ...v, ...scoreVerdict(v.criteriaResults, v.recommendedReleasePct) };
}

export async function createDemoWorkspace(): Promise<{ client: User; freelancer: User; workspace: string }> {
  try {
    return await seedWorkspace();
  } finally {
    setEventClock(null);
  }
}

async function seedWorkspace(): Promise<{ client: User; freelancer: User; workspace: string }> {
  const ws = newToken().slice(0, 10).toLowerCase();
  const sim = simulator();
  const suffix = ws.slice(0, 4);

  const client = await createUser({
    name: "Maya Chen",
    email: `maya.${ws}@demo.kept.app`,
    headline: "Owner, Lantern Coffee Roasters · Austin, TX",
    demoWorkspace: ws,
    avatarHue: 24,
    handle: `maya-${suffix}`,
    emailVerified: true,
  });
  const freelancer = await createUser({
    name: "Ana Reyes",
    email: `ana.${ws}@demo.kept.app`,
    headline: "Brand & web designer · Manila",
    demoWorkspace: ws,
    avatarHue: 160,
    handle: `ana-${suffix}`,
    emailVerified: true,
    paypalEmail: env.paypal.demoPayoutEmail || `ana.${ws}@demo.kept.app`,
    paypalVerified: Boolean(env.paypal.demoPayoutEmail),
  });
  const pastClient = await createUser({
    name: "Jonas Weber",
    email: `jonas.${ws}@demo.kept.app`,
    headline: "Bluebird Café",
    demoWorkspace: ws,
    avatarHue: 210,
    handle: `jonas-${suffix}`,
    emailVerified: true,
  });

  await db
    .update(users)
    .set({ createdAt: new Date(Date.now() - 75 * 86_400_000) })
    .where(eq(users.demoWorkspace, ws));

  const fundSim = async (user: User, milestoneId: string) => {
    const order = await createFundingOrder(user, milestoneId, { gateway: sim });
    await captureFunding(order.orderId, { user, source: "checkout" });
  };

  const seal = async (author: User, other: User, input: PactInput) => {
    const pact = await createPact(author, input, "seed");
    await db.update(pacts).set({ sourceText: null }).where(eq(pacts.id, pact.id));
    await sendPact(author, pact.id);
    await acceptPact(other, pact.inviteToken);
    const ms = await db.select().from(milestones).where(eq(milestones.pactId, pact.id)).orderBy(milestones.position);
    return { pact, ms };
  };

  const addSubmission = async (milestoneId: string, note: string, items: { kind: "text" | "url"; name: string; content: string }[]) => {
    const subId = newId("sub");
    await db.insert(submissions).values({ id: subId, milestoneId, version: 1, note, createdById: freelancer.id });
    await db.insert(artifacts).values(items.map((it) => ({ id: newId("art"), submissionId: subId, kind: it.kind, name: it.name, content: it.content, mime: it.kind === "text" ? "text/plain" : null, sizeBytes: it.content.length })));
    return subId;
  };

  /* -- Past work for Ana's public track record ---------------------- */
  {
    setEventClock(timeline(40, 24 * 26, 8));
    const { ms } = await seal(pastClient, freelancer, {
      title: "Menu redesign for Bluebird Café",
      summary: "New menu boards and a printable takeaway menu.",
      currency: "USD",
      creatorRole: "client",
      terms: { revisionsIncluded: 2, reviewWindowHours: 72, ipTransfer: "Bluebird owns the final files." },
      ambiguities: [],
      riskFlags: [],
      milestones: [{ title: "Menu boards + takeaway menu", description: "", amount: 2600, dueInDays: 10, criteria: [{ text: "Print-ready PDF menus", kind: "objective", check: none }] }],
    });
    await fundSim(pastClient, ms[0].id);
    await db.update(milestones).set({ status: "in_review" }).where(eq(milestones.id, ms[0].id));
    await settleMilestone(ms[0].id, 100, { from: ["in_review"], actorId: pastClient.id, actorKind: "user", reason: "approved by Jonas Weber" });
    await stampPact(ms[0].pactId, new Date(Date.now() - 26 * 86_400_000));
  }

  /* -- A: brand identity; M1 released, M2 awaiting Maya's review ------ */
  {
    setEventClock(timeline(14, 20, 14));
    const { pact, ms } = await seal(client, freelancer, brandPact());
    const [m1, m2] = ms;
    await fundSim(client, m1.id);
    await db.update(milestones).set({ status: "in_review", submittedAt: new Date(Date.now() - 4 * 86400000) }).where(eq(milestones.id, m1.id));
    const { criteria: c1 } = await loadMilestone(m1.id);
    const s1 = await addSubmission(m1.id, "Three directions attached; my favourite is B.", [
      { kind: "text", name: "concepts-board.md", content: "Concept A; Lantern Glow: a hand-drawn lantern whose flame is a coffee bean. Rationale: warmth, craft, a nod to slow mornings.\n\nConcept B; The Roaster's Mark: monogram L inside a stamped circle, inspired by roaster tins. Rationale: heritage and trust.\n\nConcept C; Night Shift: geometric lantern with long shadows. Rationale: modern, distinctive on shelves." },
    ]);
    await db.insert(verdicts).values(scored({
      id: newId("vrd"), milestoneId: m1.id, submissionId: s1, provider: "kept-demo-seed", model: "seeded example verdict",
      overall: "pass", score: 100, recommendedReleasePct: 100,
      summary: "All three concepts are present and distinct, each with a clear rationale, and the hand-drawn, stamp-inspired styling is consistent with the warm craft references.",
      notesForClient: "Check that concept B scales down to sticker size before choosing it.", notesForFreelancer: "",
      criteriaResults: v(c1.map((c) => c.id), [
        ["met", 0.95, "Concept A, Concept B, Concept C each described separately", "Three distinct directions are presented."],
        ["met", 0.9, "“Rationale: warmth, craft…”, “Rationale: heritage and trust.”", "Every concept carries its own rationale."],
        ["met", 0.78, "Hand-drawn lantern, roaster-tin stamp", "The styling is warm and craft-led, in line with the references."],
      ]),
      evidence: [{ probe: "text", label: "concepts-board.md", detail: "Inline text · 74 words", ok: true }],
      latencyMs: 8400,
    }));
    await settleMilestone(m1.id, 100, { from: ["in_review"], actorId: client.id, actorKind: "user", reason: "approved by Maya Chen" });

    await fundSim(client, m2.id);
    const { criteria: c2 } = await loadMilestone(m2.id);
    const s2 = await addSubmission(m2.id, "Final suite + brand guide. SVG/PNG/PDF inside.", [
      { kind: "text", name: "brand-guide.md", content: "# Lantern Brand Guide\n\n## Colour palette\nEmber #C2410C · Roast #3B2A20 · Cream #F6EEDF · Brass #B88A3B\n\n## Typography\nHeadlines: Fraunces Semibold. Body: Inter Regular. Never set headlines in all caps.\n\n## Clear space\nKeep clear space equal to the height of the lantern flame on all sides.\n\n## Logo usage\nThe primary mark works in single-colour Roast on Cream, and reversed in Cream on Roast. Minimum size 24px / 8mm.\n\n## Photography\nWarm, natural light; hands and process over product shots." },
    ]);
    await db.update(milestones).set({ status: "in_review", submittedAt: new Date(Date.now() - 20 * 3600000), reviewDeadlineAt: new Date(Date.now() + 52 * 3600000) }).where(eq(milestones.id, m2.id));
    await db.insert(verdicts).values(scored({
      id: newId("vrd"), milestoneId: m2.id, submissionId: s2, provider: "kept-demo-seed", model: "seeded example verdict",
      overall: "partial", score: 75, recommendedReleasePct: 85,
      summary: "The brand guide is thorough; HEX palette, typography and clear-space rules are all specified and single-colour use is shown. However, the SVG and PNG logo files themselves were not attached to this submission.",
      notesForClient: "Everything in the guide checks out. Ask Ana to attach the SVG/PNG files before approving, or approve if you received them by email.",
      notesForFreelancer: "Attach the logo exports (SVG + PNG) to the submission so the file-format criterion can be verified.",
      criteriaResults: v(c2.map((c) => c.id), [
        ["not_met", 0.97, "No SVG or PNG files in the submission (only brand-guide.md)", "The required file formats were not delivered through Kept."],
        ["met", 0.98, "“Ember #C2410C · Roast #3B2A20 · Cream #F6EEDF · Brass #B88A3B”", "Four colours with HEX values are specified."],
        ["met", 0.95, "“## Typography … ## Clear space”", "Both sections exist with concrete rules."],
        ["met", 0.8, "“works in single-colour Roast on Cream”", "Single-colour usage is defined."],
      ]).map((r, i) => (i === 0 ? { ...r, machineCheck: { type: "file_types" as const, passed: false, detail: "Missing formats: svg, png" } } : i === 1 ? { ...r, machineCheck: { type: "keywords_present" as const, passed: true, detail: "All keywords present" } } : r)),
      evidence: [{ probe: "text", label: "brand-guide.md", detail: "Inline text · 112 words", ok: true }],
      latencyMs: 11200,
    }));
    await recordEvent(db, { pactId: pact.id, milestoneId: m2.id, actorKind: "ai", type: "review.completed", message: "AI referee: PARTIAL; 3/4 criteria met, score 75/100" });
    await stampPact(pact.id, new Date(Date.now() - 20 * 3_600_000));
  }

  /* -- B: landing page; funded, waiting for Ana to deliver ------------ */
  {
    setEventClock(timeline(3, 5, 4));
    const { pact, ms } = await seal(freelancer, client, landingPact());
    await fundSim(client, ms[0].id);
    await stampPact(pact.id, new Date(Date.now() - 5 * 3_600_000));
  }

  /* -- C: captions; in mediation with an AI proposal ------------------- */
  {
    setEventClock(timeline(6, 2, 7));
    const { pact, ms } = await seal(client, freelancer, captionsPact());
    const m = ms[0];
    await fundSim(client, m.id);
    const { criteria: cc } = await loadMilestone(m.id);
    const sub = await addSubmission(m.id, "Here are the captions!", [{ kind: "text", name: "captions.txt", content: CAPTIONS }]);
    await db.insert(verdicts).values(scored({
      id: newId("vrd"), milestoneId: m.id, submissionId: sub, provider: "kept-demo-seed", model: "seeded example verdict",
      overall: "partial", score: 63, recommendedReleasePct: 65,
      summary: "Four of the six agreed captions were delivered. Those four are on-voice and mostly within length; caption 3 is too short (19 words) and has 5 hashtags.",
      notesForClient: "Four usable captions were delivered; two are missing.",
      notesForFreelancer: "Deliver captions 5 and 6, and extend caption 3 to at least 60 words.",
      criteriaResults: v(cc.map((c) => c.id), [
        ["not_met", 0.97, "Captions numbered 1/ to 4/ only", "Only four of six captions were delivered."],
        ["partially_met", 0.9, "Caption 3 is 19 words; captions 1, 2 and 4 are 55–62 words", "Most delivered captions are near the range; one is far too short."],
        ["met", 0.92, "Each caption ends with five hashtags, e.g. “#HolidayBlend #LanternCoffee …”", "Hashtag requirement is met for every delivered caption."],
        ["met", 0.8, "“The kettle's on, the lights are low…”", "Warm and playful tone matches the brand."],
      ]),
      evidence: [{ probe: "text", label: "captions.txt", detail: "Inline text · 196 words", ok: true }],
      latencyMs: 9100,
    }));
    await db.update(milestones).set({ status: "disputed", submittedAt: new Date(Date.now() - 3 * 86400000) }).where(eq(milestones.id, m.id));
    await db.insert(disputes).values({
      id: newId("dsp"),
      milestoneId: m.id,
      openedById: client.id,
      reason: "We agreed on six captions and only got four. One of them is barely a sentence.",
      clientStatement: "We agreed on six captions and only got four. One of them is barely a sentence. Launch week starts Monday.",
      freelancerStatement: "I sent 4 so Maya could approve the direction before I wrote the rest; I said so in our chat. Happy to finish the last two.",
      status: "ruling_proposed",
      ruling: {
        releasePct: 65,
        rationale:
          "Four of six captions were delivered and three of those meet the length and hashtag rules, so roughly two-thirds of the agreed value was delivered. The freelancer's explanation is plausible but wasn't written into the pact, and the client now faces a launch deadline. Releasing 65% pays for the usable work; refunding 35% lets the client commission the remaining two captions elsewhere.",
        findings: [
          { point: "Only 4 of 6 captions delivered (criterion 1 not met)", favors: "client" },
          { point: "Delivered captions are on-voice and correctly hashtagged", favors: "freelancer" },
          { point: "Sending a partial set for direction approval was never agreed in the pact", favors: "client" },
        ],
        messageToParties:
          "Maya, Ana; the work delivered is good but incomplete. We propose releasing 65% ($780) to Ana and refunding 35% ($420) to Maya. If you both accept, Kept initiates the PayPal payout and refund, and shows their status.",
        provider: "kept-demo-seed",
        model: "seeded example ruling",
      },
    });
    await recordEvent(db, { pactId: pact.id, milestoneId: m.id, actorId: client.id, actorKind: "user", type: "dispute.opened", message: "Maya Chen raised an issue: “We agreed on six captions and only got four.” Funds stay frozen in escrow." });
    await recordEvent(db, { pactId: pact.id, milestoneId: m.id, actorKind: "ai", type: "dispute.ruling_proposed", message: "AI mediator proposed releasing 65% to the freelancer and refunding 35% to the client" });
    await stampPact(pact.id, new Date(Date.now() - 2 * 3_600_000));
  }

  /* -- E: photo retouching; PASS verdict, waiting on Maya (anti-ghosting demo) */
  {
    setEventClock(timeline(4, 30, 6));
    const { pact, ms } = await seal(client, freelancer, {
      title: "Menu photo retouching (12 photos)",
      summary: "Colour-correct and retouch 12 café menu photos for the new holiday menu, exported for web.",
      currency: "USD",
      creatorRole: "client",
      counterpartyName: "Ana Reyes",
      terms: { revisionsIncluded: 1, reviewWindowHours: 48, ipTransfer: "Lantern owns the edited photos once paid." },
      clarityScore: 77,
      ambiguities: [{ quote: "make them pop", issue: "Subjective with no reference", suggestion: "Warm white balance and consistent exposure across all 12 photos" }],
      riskFlags: [],
      milestones: [
        {
          title: "12 retouched photos",
          description: "Twelve edited photos delivered as a shared album with before/after notes.",
          amount: 1800,
          dueInDays: 3,
          criteria: [
            { text: "All 12 photos are delivered", kind: "objective", check: none },
            { text: "Each photo has a short before/after note", kind: "objective", check: none },
            { text: "Warm, consistent white balance across the set", kind: "subjective", check: none },
          ],
        },
      ],
    });
    const m = ms[0];
    await fundSim(client, m.id);
    const { criteria: ec } = await loadMilestone(m.id);
    const notes = Array.from({ length: 12 }, (_, i) => `${i + 1}. ${["Flat white", "Holiday Blend pour-over", "Cardamom bun", "Iced oat latte", "Espresso tonic", "Ginger loaf", "Cortado", "Chai", "Mocha", "Almond croissant", "Cold brew", "Gift box"][i]}; warmed white balance (+300K), lifted shadows, removed counter glare.`).join("\n");
    const sub = await addSubmission(m.id, "All 12 are in the album; notes below.", [
      { kind: "text", name: "retouching-notes.md", content: `Album: lantern-menu-photos (12 images, 2400×1600 JPG)\n\n${notes}` },
    ]);
    await db.insert(verdicts).values(scored({
      id: newId("vrd"), milestoneId: m.id, submissionId: sub, provider: "kept-demo-seed", model: "seeded example verdict",
      overall: "pass", score: 100, recommendedReleasePct: 100,
      summary: "All twelve photos are accounted for, each with a before/after note, and the notes describe a consistent warm white-balance treatment across the set.",
      notesForClient: "Everything agreed was delivered. If you don't respond within the review window, the payment is released automatically.",
      notesForFreelancer: "",
      criteriaResults: v(ec.map((c) => c.id), [
        ["met", 0.95, "Notes numbered 1–12, one per photo", "Twelve photos are listed."],
        ["met", 0.93, "“warmed white balance (+300K), lifted shadows, removed counter glare”", "Every entry has a before/after note."],
        ["met", 0.82, "Same +300K warm treatment applied to all 12", "The treatment is consistent across the set."],
      ]),
      evidence: [{ probe: "text", label: "retouching-notes.md", detail: "Inline text · 214 words", ok: true }],
      latencyMs: 7600,
    }));
    await db.update(milestones).set({ status: "in_review", reviewDeadlineAt: new Date(Date.now() + 30 * 3_600_000) }).where(eq(milestones.id, m.id));
    await recordEvent(db, { pactId: pact.id, milestoneId: m.id, actorKind: "ai", type: "review.completed", message: "AI referee: PASS; 3/3 criteria met, score 100/100" });
    await stampPact(pact.id, new Date(Date.now() - 18 * 3_600_000));
  }

  /* -- D: packaging; sent by Maya, waiting for Ana's signature --------- */
  {
    setEventClock(timeline(0.1, 0.5, 2));
    const pact = await createPact(client, {
      title: "Holiday Blend packaging illustration",
      summary: "Illustrated front-of-bag artwork and a matching round sticker for the Holiday Blend, delivered print-ready.",
      currency: "USD",
      creatorRole: "client",
      counterpartyName: "Ana Reyes",
      counterpartyEmail: freelancer.email,
      sourceText: DM_SOURCE,
      terms: { revisionsIncluded: 2, reviewWindowHours: 72, ipTransfer: "Full rights transfer to Lantern Coffee Roasters on final payment." },
      clarityScore: 42,
      ambiguities: [
        { quote: "Something warm, a bit vintage", issue: "Style is subjective with no reference", suggestion: "Warm palette (Ember, Cream, Roast) and vintage engraving style, matching the Lantern brand guide" },
        { quote: "a few revisions", issue: "Revision count is open-ended", suggestion: "2 rounds of revisions included" },
        { quote: "Print-ready files?", issue: "Print specs undefined", suggestion: "CMYK PDF with 3mm bleed and 300 DPI PNG" },
        { quote: "around $3,500", issue: "Price not final", suggestion: "$3,500 total: $1,500 concepts, $2,000 final artwork" },
      ],
      riskFlags: [],
      milestones: [
        {
          title: "Two illustration concepts",
          description: "Two distinct sketches for the bag front and sticker.",
          amount: 1500,
          dueInDays: 5,
          criteria: [
            { text: "Two distinct concepts, each showing the bag front and the sticker", kind: "objective", check: { type: "min_files", value: 2 } },
            { text: "Uses the Lantern palette (Ember, Cream, Roast)", kind: "subjective", check: none },
            { text: "Includes the words “Holiday Blend”", kind: "objective", check: none },
          ],
        },
        {
          title: "Print-ready final artwork",
          description: "Final artwork for the chosen concept.",
          amount: 2000,
          dueInDays: 9,
          criteria: [
            { text: "Bag front delivered as a CMYK PDF with 3mm bleed", kind: "objective", check: { type: "file_types", values: ["pdf"] } },
            { text: "Sticker delivered as PNG at least 2000×2000px", kind: "objective", check: { type: "min_image_resolution", width: 2000, height: 2000 } },
            { text: "Matches the approved concept", kind: "subjective", check: none },
          ],
        },
      ],
    }, "seed");
    await sendPact(client, pact.id);
    setEventClock(null);
  }

  return { client, freelancer, workspace: ws };
}

export async function demoCounterpart(user: User): Promise<User | null> {
  if (!user.demoWorkspace) return null;
  const others = await db.select().from(users).where(and(eq(users.demoWorkspace, user.demoWorkspace)));
  const target = user.name.startsWith("Maya") ? "Ana" : "Maya";
  return others.find((u) => u.name.startsWith(target)) ?? null;
}
