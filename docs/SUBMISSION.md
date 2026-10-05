## Inspiration

A freelance project often starts with a friendly message: “Could you make this for me?” The difficult questions come later. What counts as finished? How many revisions are included? Who takes the risk first?

We wanted to make those conversations easier for both people. Kept brings the agreement, delivery evidence, and payment decisions into one shared place, without asking people to abandon the chat where they met.

## What it does

Paste a conversation and Kept drafts milestones, prices, deadlines, and acceptance criteria. It highlights vague terms and common scam patterns before either side signs.

Both parties review the same scope. For creative work, they can agree on audience, style references, and review guidance. The client funds a milestone through PayPal sandbox, and the freelancer submits the work.

The AI referee reviews each criterion and explains its evidence, confidence, and reasoning. A large image is not necessarily a good illustration. A matching keyword is not proof that the brief was followed. If the evidence is insufficient, the result stays uncertain and a person decides.

If the parties disagree, an AI mediator considers the signed terms, the review, and both statements. Its split is a proposal. Both people must accept the same version before Kept initiates a payout and a refund. New statements clear earlier acceptances, and rejected proposals stay frozen for operator review.

Kept also includes review-window automation, account recovery, a first-visit tutorial, an operations console, and REST and MCP interfaces for agents.

## How we built it

The application uses Next.js, React, TypeScript, Tailwind CSS, Radix UI, and Motion. AG Grid powers searchable contract and operations views. Drizzle and libSQL store contracts, evidence, state transitions, and double-entry ledger records.

PayPal is central to the workflow: Orders creates and captures milestone payments, Payouts releases funds, Payments issues refunds, and verified webhooks reconcile payment events. Requests use stable identifiers and state checks to reduce duplicate payment risks.

Gemini 3.1 Pro Preview runs through Vertex AI for contract drafting, evidence-based review, and mediation. Users receive five successful AI requests and can then configure a personal Gemini, OpenAI, or Anthropic provider. Personal keys are encrypted at rest.

Firebase Hosting provides the public URL, Cloud Run serves the app, and a persistent libSQL server stores data across deployments. Transactional email supports verification, password resets, and invitations.

## Challenges we ran into

Creative judgment was the hardest part. We separated measurable checks from interpretation and added signed review guidance. The referee must show evidence and retain uncertainty instead of turning every preference into a pass or fail.

Untrusted deliverables can also contain instructions aimed at the model. We added hidden-instruction screening and blocked automatic release for flagged submissions. A flag is not, by itself, proof that a person acted dishonestly.

Payment state is another challenge. Browser callbacks, webhooks, and scheduled jobs can arrive more than once or at the same time. We tested duplicate events, retries, ledger balancing, and stale settlement proposals.

We also redesigned the interface to reduce text overload: a focused landing page, clear navigation, tabbed settings, and expandable review evidence.

## Accomplishments that we're proud of

Kept connects an agreement to a review and an actionable payment workflow. Both parties can see the same criteria and understand what happened. The demo lets visitors switch between client and freelancer rather than seeing only one side of the story.

We are especially proud of the safeguards around uncertain creative work and mediation consent. An AI recommendation does not bypass the signed scope or replace both parties' agreement to a settlement.

## What we learned

A useful AI reviewer needs a well-defined brief before it needs a more confident answer. Showing what is unknown can be more helpful than producing a high score.

We also learned that payment reliability depends on the small details: event deduplication, persistent state, retries, and clear distinctions between an initiated payout and a completed payout.

## What's next for Kept

The next step is a supervised pilot with freelancers and clients, using their feedback to improve creative rubrics and dispute explanations. We want richer reference comparison, stronger evaluation datasets, and an operational human-review process.

This release uses PayPal sandbox and labelled simulations. It does not move real money and is not a licensed escrow service. A real-money launch needs an approved payment model and operational readiness before it can offer custody or protection claims.
