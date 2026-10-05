# Kept — Market & Hackathon Research Brief

*Compiled 2026-10-05. Every figure has a source and a year. "Computed" means we derived the number from cited figures. "Not found" means we couldn't source it.*

---

## 0. TL;DR — the five things that matter

1. **The hackathon's own idea list describes our product.** Under "AI Agents or Automation" it lists *"a scheduling assistant that pays contractors automatically when a job is marked complete"*, and under money movement it lists *"a payout tool for gig workers that pays out the moment a task is approved"*. Judges have five equally weighted criteria: Tech, Design, Impact, Innovation and Presentation. Kept fits two prize categories: **Best Use of Agentic Commerce** and **Best Use of PayPal + AI** ($5k each).
2. **The deadline is earlier than we planned.** The official rules say **Thu Nov 12, 2026, 12:00 pm PT**, not Nov 13. Nov 13 to Dec 15 is the judging window.
3. **Other teams are building nearly the same thing.** At least six public PayPal AI Hackathon 2026 repos do "AI-verified escrow". One of them, *EscrowEase*, uses the tagline "Freelancer escrow with an AI referee". Outside the hackathon, *FairHold* runs a PayPal-held milestone escrow with auto-release, but without AI. What separates Kept: **compiling DMs into a contract with machine-checkable criteria, a criterion-by-criterion verdict with cited evidence, anti-ghosting auto-release, an AI split ruling executed as a Payout plus a partial refund, and an MCP server for agents.** No competitor we found ships all five.
4. **PayPal's own protection doesn't cover what freelancers need.** US Purchase Protection excludes *"Significantly Not as Described claims for wholly or partly custom-made items"*. Freelance work is custom-made by definition. Friends & Family payments get no protection at all.
5. **The problem is large and well documented.** 71% of US freelancers have had trouble collecting payment (Freelancers Union, 2015). 85% are paid late at least sometimes (Remote, 2025). Freelancers in the UK are owed £5,230 on average (IPSE). 58% of US independents rely mainly on channels other than platforms to find work (MBO, 2025).

---

## 1. The hackathon: "Build what's next with PayPal and AI" (Devpost)

**Page:** https://paypalaihackathon.devpost.com/ · **Resources:** https://paypalaihackathon.devpost.com/resources · **Rules:** https://paypalaihackathon.devpost.com/rules

- **Submission window:** "Thursday Oct 1, 2026 (9:00 am Pacific Time) – Thursday Nov 12, 2026 (12:00 pm Pacific Time)" (rules page). A third-party listing says 2:00 pm PT ([DevGrants Daily](https://devgrantsdaily.com/items/2026-10-02-paypal-ai-hackathon-2026/)), so treat **12:00 pm PT Nov 12** as the hard deadline. Judging runs Nov 13 to Dec 15, and winners are announced Dec 21, 2026 ([PayPal Dev blog](https://developer.paypal.com/community/blog/PayPal_AI_Hackathon/)).
- **Participants:** 5,802 were registered when we checked the resources page on 2026-10-05.
- **Prizes ($67.5k cash, about $69.75k with credits):** 1st $12k, 2nd $8k, 3rd $5k. Five categories pay $5k each: Most Creative, Most Impactful, Best Demo Delivery, **Best Use of PayPal + AI**, and **Best Use of Agentic Commerce**. Sponsor prizes:
  - AG Grid (AG Studio): $5k / $2k / 3×$1k
  - APIMatic: 3×$1k
  - Bryntum: 3×$1k
  - Channel3: $1.5k
  - Render: $1k / $750 / $500 in credits
- **Core requirement:** "integrate the PayPal developer platform (using the free sandbox environment) along with an AI tool". No specific PayPal API is required. Projects must be new, or "significantly updated after the start of the Hackathon Submission Period."
- **What to submit:** a working demo (a hosted URL or runnable repo), a text description, a **public GitHub repo with an OSS license**, and a **demo video under 3 minutes on YouTube**.
- **Judging criteria (all weighted equally, quoted from the rules):**
  - *Technological Implementation:* "How thoroughly and skillfully does the project use PayPal Developer Platform and AI tool(s)?"
  - *Design:* "Does the project deliver a complete, coherent product experience"
  - *Potential Impact:* "Does the project make a credible, specific case for solving a real problem"
  - *Innovation/Idea:* "How creative and novel is the concept"
  - *Presentation:* "Does the video clearly demonstrate the project working end-to-end?"
- **Judges:**
  - PayPal: Jo Franchetti, Eddie Jaoude, Marco Podien, Karthik Ravi, Himraj Singh, Nathaniel Olson
  - Sponsor representatives: AG Grid, APIMatic, Bryntum, Channel3, Elastic, Postman, Render
- **"Agentic commerce":** it is a $5k prize category, but no page defines it. The closest guidance is the idea category "Build autonomous agents or workflows that use PayPal to take action on a user's behalf — not just recommend, but actually transact."

**Inspiration ideas, quoted verbatim from the resources page.** ★ marks ideas directly relevant to Kept.

- **AI Agents or Automation:** "Build autonomous agents or workflows that use PayPal to take action on a user's behalf — not just recommend, but actually transact."
  - "an AI agent that shops and checks out for you"
  - ★ "a scheduling assistant that pays contractors automatically when a job is marked complete"
  - ★ "two agents negotiating and settling a payment between themselves (agent-to-agent commerce)"
- **Money Movement Experiences:** "Build a new way to move money that's faster, simpler, or more flexible than what exists today."
  - "an app that lets you send a friend money with just a phone number"
  - ★ "a dashboard that shows freelancers every payment they've received across clients"
  - ★ "a payout tool for gig workers that pays out the moment a task is approved"
  - "splitting a group dinner bill automatically by scanning a receipt"
  - "a fundraising page that lets donors split a donation across multiple causes"
- **Business Solutions:** "Build tools that help merchants, freelancers, creators, platforms, or marketplace operators run and grow their business."
  - ★ "an invoicing tool built for freelancers who bill in multiple currencies"
  - "a tipping or membership payment tool for creators to get paid directly by fans"
  - ★ "a marketplace checkout flow that splits payment automatically between a platform and its sellers"
  - "a point-of-sale add-on for small merchants"
- **Consumer Experiences:** "Build something that makes it easier for everyday people to pay, get paid, or track their money."
  - "a budgeting app that categorizes PayPal transactions automatically"
  - ★ "a 'request money' experience embedded in a chat app"
  - "a simpler checkout flow for a niche audience (students, families, seniors)"
- **Social Impact:** "Build something that uses PayPal to expand access or drive good in the world."
  - The examples cover accessible donations, microloans, nonprofit payouts and community pooling.

**AI resources listed on the hackathon page:**

- PayPal AI Toolkit: https://github.com/paypal/AI-Toolkit
- Agent Toolkit quickstart: https://docs.paypal.ai/developer/tools/ai/agent-toolkit-quickstart
- MCP server quickstart: https://docs.paypal.ai/developer/tools/ai/mcp-quickstart (this now redirects to developer.paypal.com/docsai/…)

The AI Toolkit README lists these tool groups: Orders and Payments (create, capture, refund), Invoicing, Subscriptions, **Disputes ("list and respond to buyer disputes")**, Catalog, Shipment, and Reporting. **Payouts and authorize/void are not listed among the MCP tools**, so we need to call the REST APIs for those directly.

**Sponsors and what they offer:**

- APIMatic: "Context Plugins" for PayPal, with a webinar on Oct 7
- Render: agent deployment
- Elastic: vector search
- Bryntum: scheduling and Gantt components
- AG Grid: AG Studio dashboards and the Studio Agent Framework ([AG Grid blog](https://www.ag-grid.com/blog/hackathon-paypal-and-ag-studio/))
- Postman, Zapier, Astropods, Kernel

**Sponsor angles that fit Kept:** a Bryntum Gantt of milestones with review windows, an AG Grid dashboard of escrow and disputes, Elastic search over submitted evidence, a Postman collection for the MCP and REST API, and hosting on Render.

---

## 2. Freelancer non-payment and late payment

| Stat | Source (year) |
|---|---|
| **71%** of US freelancers have had trouble collecting payment. The average loss was **$5,968** (14% of income) in 2014. 81% of those affected were paid late and 34% were never paid. The longest wait averaged **98 days**. n=5,358. | Freelancers Union, *The Costs of Nonpayment* (2015) — https://blog.freelancersunion.org/2015/12/10/costs-nonpayment/ · PDF: https://www.onlabor.org/wp-content/uploads/2017/05/FU_NonpaymentReport_r3.pdf |
| **85%** of freelancers have invoices paid late at least some of the time. **21%+** are paid late or never more than half the time. | Remote, *Contractor Management Report* (2025) — https://remote.com/blog/contractor-management/reversing-late-payment-culture |
| **62%** of New York freelancers had at least once not been paid for work performed. 51% of them lost more than $1,000. 91% had experienced late payment. **Fewer than 1%** went through the legal system. | Authors Guild, Freelancers Union et al. survey (2022) — https://authorsguild.org/news/survey-finds-62-percent-of-ny-freelance-workers-have-lost-wages-due-to-nonpayment/ |
| UK: **35%** were paid late in the last 12 months. **18%** waited more than 3 months past the deadline. The average amount owed is **£5,230**. 20% couldn't cover basic living costs as a result. | IPSE (survey year not stated on the page; the 2020 comparison figure was £5,140) — https://www.ipse.co.uk/campaigns/prompt-payment/late-payment-within-the-self-employed-sector |
| UK economy-wide: late payment costs **£11bn a year**, and **14,000 businesses (38 a day)** close because of it. | UK Government, Late Payments consultation (Jul 2025) — https://assets.publishing.service.gov.uk/media/69c2c7c413f1436476e443a2/late-payments-consultation-response.pdf (as summarised by https://informi.co.uk/business-administration/what-the-uk-late-payment-reform-means-for-small-business-owners) |
| There are **154M–435M** online gig workers worldwide (4.4–12.5% of the global workforce). | World Bank, *Working Without Borders* (2023) — https://openknowledge.worldbank.org/entities/publication/ebc4a7e2-85c6-467b-8713-e2d77e954c6c |

Payoneer's 2023 Freelancer Insights Report (2,000+ freelancers in 122 countries; https://www.payoneer.com/resources/business/the-payoneer-2023-freelancer-insights-report/) gives no late-payment percentage that we could verify. Its headline finding is that 73% find getting new clients challenging. We also found aggregator sites citing "58% of freelancers face non-payment" and "$15B lost a year" (flexable.work). **We could not trace these to a primary source, so don't use them.**

**Off-platform vs on-platform work:**

- **42%** of US independents rely on online platforms as their *primary* way to find work. That means **about 58% rely mainly on something else**, such as referrals, their network or repeat clients (computed). 63% use any platform. 72M+ Americans work independently. Source: MBO Partners, *State of Independence* (Sep 2025) — https://www.prnewswire.com/news-releases/mbo-partners-by-beeline-releases-15th-annual-state-of-independence-study-revealing-a-growing-talent-strategy-for-businesses-302550604.html and https://www.mbopartners.com/state-of-independence/online-talent-platforms-reshape-independent-work/
- **77%** of freelancers get at least half their work from repeat clients, and LinkedIn is the top channel for new clients. Source: The Mighty Marketer, 2025 survey, n=267 — https://themightymarketer.com/freelance-marketing-survey-2025/
- **Computed comparison of money flows.** Upwork's 2025 GSV was about $4.0B ([Upwork IR, Feb 2026](https://investors.upwork.com/news-releases/news-release-details/upwork-reports-fourth-quarter-and-full-year-2025-financial)). Fiverr's 2025 GMV was $1.07B ([Fiverr IR](https://investors.fiverr.com/news-releases/news-release-details/fiverr-announces-fourth-quarter-and-full-year-2025-results)). Together that is about $5B, against **$1.27T** in US freelancer earnings alone in 2023 ([Upwork, Dec 2023](https://investors.upwork.com/news-releases/news-release-details/upwork-study-finds-64-million-americans-freelanced-2023-adding)). The two largest marketplaces therefore handle **well under 1%** of freelance earnings. The rest moves through invoices, PayPal, bank transfers and DMs, where there is no escrow. Caveat: the GSV/GMV figures are global and the earnings figure is US-only, so this comparison is illustrative.

---

## 3. Client-side pain (businesses that get burned)

- In the FBI IC3 2025 report, **non-payment/non-delivery** was the 5th most reported crime: **56,478 complaints and about $503M in losses**, down from $785M in 2024. It covers goods and services and isn't specific to freelancing. Sources: https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf and https://www.adamsandreese.com/the-ledger/fbi-releases-2025-internet-crime-report-key-takeaways-for-the-payments-industry
- **49%** of companies manage freelancer contracts and billing with in-house tools such as spreadsheets (Remote, 2025, link above).
- Platforms charge for protecting clients, which shows clients value it. Upwork gives clients fixed-price escrow and paid arbitration (see §4).
- **Not found:** a credible survey that measures how often clients pay freelancers who then don't deliver. In the pitch, frame client risk with IC3 data and an anecdote, and don't use an invented percentage.

---

## 4. Competitor landscape

**Upwork**

- Freelancer fee: a **variable 0–15% per contract since May 1, 2025**, replacing the old 20/10/5% tiers ([GoLance, 2026](https://golance.com/blogs/upwork-fees-explained-2026)).
- Client fee: a marketplace fee of **up to 7.99%** on the Basic plan, **3%** when paying by US bank account, plus a **$0.99–$14.99 contract-initiation fee** ([Upwork support](https://support.upwork.com/hc/en-us/articles/4660220468499-What-is-the-Client-Marketplace-Fee); [hireinsouth, 2026](https://www.hireinsouth.com/post/how-much-does-upwork-cost)).
- Blended take rate: **about 19.7% of GSV** in 2025 ($787.8M revenue / ~$4.0B GSV, computed).
- Fixed-price escrow:
  - **Auto-release 14 days** after the freelancer submits work.
  - Disputes go to mediation first (a decision in about 2 business days, then 2 days to accept).
  - Either side can then demand arbitration within 7 days. Arbitration is run by **BRIEF** for claims under $20k and costs **$337.50 per side**.
  - Source: [GigRadar, Apr 2026](https://gigradar.io/blog/upwork-payment-protection-fixed-price), citing Upwork's Fixed-Price Escrow Instructions.
- **Off-platform coverage:** this is Upwork's weak spot. Direct Contracts (for clients you bring yourself) exist, but reports conflict on their fees (3.4–5%). *Client-initiated* Direct Contracts get **no payment protection or dispute assistance** ([Upwork Direct Contracts](https://www.upwork.com/direct-contracts); this was not verified on a primary page because upwork.com returns 403 to bots).

**Fiverr**

- Sellers pay **20%**. Buyers pay a **5.5%** service fee plus a small-order fee on orders under about $50 (the exact amount varies by source) ([vaultleap, 2026](https://vaultleap.com/blog/fiverr-fees-explained-2026)).
- Protection only covers Fiverr's own marketplace.

**Escrow.com** ([fee calculator, retrieved 2026-10-05](https://www.escrow.com/fee-calculator))

- Fees are **2.6% with a $50 minimum** up to $5k, and 2.4% with a $130 minimum from $5k to $50k. Paying by card or PayPal adds **+3.05%**. Sellers pay $10 or $20 for wire disbursement.
- **On a $500 milestone, that is about $50, or 10% (computed).**
- Milestones are supported, with a buyer inspection period for each one ([how it works](https://www.escrow.com/milestones/how-it-works)).
- Disputes are mediated by humans, with no published timeline.

**Contra**

- 0% commission. On the free plan there is a **$15 per client payment, or $29 above $500**. Pro costs $29/month or $199/year.
- Third-party processing fees are extra ([contra.com/pricing](https://contra.com/pricing)).
- We found no published dispute process.

**Payoneer, Wise, Deel, Bonsai, HoneyBook**

These are payment, invoicing and compliance tools, and **none of them offers escrow or adjudication.**

- Payoneer card payments cost up to 3.99% + $0.49 ([vaultleap, 2026](https://vaultleap.com/blog/payoneer-fees-explained-2026)).
- Deel costs **$49 per contractor per month** ([deel.com/pricing](https://www.deel.com/pricing/)).
- Bonsai charges 2.9% + $0.30 for cards ([agiled, 2026](https://agiled.app/compare/bonsai-vs-honeybook)).
- HoneyBook charges 2.9% + $0.25 for cards.
- Wise is cross-border transfer only, with no buyer or seller protection for services.

**PayPal Goods & Services (US)**

- Fees: Checkout costs **3.49% + $0.49**. Send Money for Goods & Services costs **2.99%** ([PayPal fees, updated Oct 1, 2026](https://www.paypal.com/us/business/paypal-business-fees)).
- **Purchase Protection** ([PayPal Purchase Protection, updated Jan 26, 2026](https://www.paypal.com/us/legalhub/paypal/buyer-protection)):
  - Services are *not* excluded outright in the US (the exclusion list covers real estate, vehicles, gift cards, NFTs and similar).
  - However, it excludes **"Significantly Not as Described claims for wholly or partly custom-made items."**
  - It does not cover an item that was "properly described but did not meet your expectations."
  - It excludes **Friends & Family** payments.
  - SNAD disputes must be filed within **30 days of delivery**.
- **Seller Protection** covers intangibles and services only with "compelling evidence" of delivery, and mostly applies to unauthorized-transaction claims.
- The brief's premise needs correcting: "intangibles are excluded generally" applies to some other markets, not the current US terms. The real gap is that **no one judges whether the custom work matched the agreement.**
- There is no native escrow product. Authorizations hold funds for **29 days** (honor period: 3 days) ([PayPal docs](https://developer.paypal.com/docs/checkout/advanced/authorization-honor/)).

**AI arbitration**

- **AAA-ICDR AI Arbitrator:** launched Nov 3, 2025 for two-party, documents-only construction cases, trained on more than 1,500 awards with human review ([AAA](https://www.adr.org/press-releases/aaa-icdr-ai-arbitrator-now-available/)).
- **Arbitrus.ai:** an "AI judge" that claims rulings in about **72 hours** and costs of about $10k versus $100k for traditional arbitration ([LawNext, Jan 2025](https://www.lawnext.com/2025/01/legal-tech-startup-to-launch-ai-powered-arbitration-service-promising-reduced-costs-and-consistent-outcomes.html)).
- **Kleros:** a crypto jury court that also handles escrow disputes; the votes are human, not AI.

**Escrow-adjacent startups**

- **FairHold** (fairhold.app):
  - Milestone escrow for freelancers. "PayPal holds the funds", and it also uses Stripe.
  - Clients pay **4.9% + $0.30, capped at $99 per contract**.
  - **48-hour auto-release**, with disputes resolved in about 7 days.
  - **No AI.** It is a waitlisted pilot that started from ETHGlobal NY 2025.
- **RentAHuman** ([Built In, Mar 2026](https://builtin.com/articles/what-is-rentahuman)):
  - **AI agents hire humans** for physical tasks through an **MCP server** (60+ tools) or REST.
  - Payments are held in **escrow** in crypto, Stripe or platform credits, and released after AI-checked photo proof.
  - Claims about 600k registered workers and 5,500+ completed jobs.
  - Founders triage disputes manually. It covers physical tasks only.
- **Truce** (Ghana): escrow for Instagram commerce ([paywithtruce.com](https://paywithtruce.com/)).
- **Keptwork:** an AI dev shop with a "pay only after it works" model ([keptwork.com](https://keptwork.com/)).

**Other entries in this hackathon (public GitHub repos):**

- **EscrowEase:** "Freelancer escrow with an AI referee". Orders authorize/capture/void, approve or request-changes verdicts, 2 commits. https://github.com/Devadi321/escrowease
- **ProofPay:** compiles a brief into acceptance criteria. Image deliverables only, no disputes or auto-release. https://github.com/alexandrupop66/ProofPay
- **MilestonePay AI:** Orders AUTHORIZE, a Bryntum Gantt, Gemini, grace-period release, a 2% fee. https://github.com/fokrulanthro16-eng/milestonepay-ai
- **Stood:** evidence-gated staged payments, diaspora construction. https://github.com/ma-za-kpe/stood
- **milestone-escrow:** construction inspections, Payouts, Claude. https://github.com/smithadams0019/milestone-escrow
- **OutcomePay:** agents buy verified outcomes, AUTHORIZE plus dual-LLM checks. https://github.com/Mike-Demo/outcomepay

**The gap Kept fills:**

- Turning a DM or chat into a contract with objective, per-criterion tests.
- A verdict for each criterion with **cited evidence**, across text, files, images, URLs and GitHub.
- An **anti-ghosting auto-release** that protects the freelancer.
- **Split rulings executed automatically** as a PayPal Payout plus a partial refund. Today's options are binary (approve or void) or a human arbitrator for $675.
- An **MCP interface so agents can hire humans or agents** with escrow protection.

All of this works for **off-platform** relationships, where today's protection is effectively zero. Lead the demo with the dispute split and the MCP flow, because those are what the hackathon look-alikes lack.

---

## 5. Agentic commerce context (2025–2026)

**PayPal:**

- **Apr 29, 2025, Dev Days:** PayPal launched the "industry's first remote MCP server" and the **Agent Toolkit**, with AWS, Anthropic, Google Cloud and Microsoft on stage ([PayPal newsroom](https://newsroom.paypal-corp.com/2025-04-29-PayPal-Brings-Together-Developers,-AI-Leaders-to-Power-Agentic-Commerce-at-Dev-Days)).
- **Oct 28, 2025:** PayPal launched agentic commerce services ([PR Newswire](https://www.prnewswire.com/news-releases/paypal-launches-agentic-commerce-services-to-power-ai-driven-shopping-302596548.html)):
  - **Agent Ready** (early 2026) lets merchants accept agent payments, "with PayPal's fraud detection, buyer protection, dispute resolution" applied.
  - **Store Sync** handles catalogs in AI channels. It started with Perplexity, and partners include Wix, Cymbio, BigCommerce and Shopware.
- **Same day:** PayPal adopted **OpenAI's ACP** for ChatGPT Instant Checkout, with buyer and seller protections and dispute resolution. Merchant catalogs come to ChatGPT in 2026 via PayPal's ACP server ([PayPal newsroom](https://newsroom.paypal-corp.com/2025-10-28-OpenAI-and-PayPal-Team-Up-to-Power-Instant-Checkout-and-Agentic-Commerce-in-ChatGPT)).
- **2026:**
  - PayPal is acquiring **Cymbio** to power Store Sync ([PayPal IR](https://investor.pypl.com/news-and-events/news-details/2026/PayPal-to-Acquire-Cymbio-Accelerating-Agentic-Commerce-Capabilities/default.aspx)).
  - It describes itself as "protocol-agnostic" across ACP, Google UCP and others ([Jan 22, 2026](https://newsroom.paypal-corp.com/2026-01-22-Making-Sense-of-the-AI-Shopping-Protocol-Moment)).
  - At PayPal Beyond in Apr 2026 it showed a Commerce Concierge and an NVIDIA partnership ([PayPal newsroom](https://newsroom.paypal-corp.com/2026-04-15-The-Moment-Is-Now-What-PayPal-Beyond-Revealed-About-the-Future-of-Commerce)).
  - PayPal processed **$1.6T** in payment volume in 2024.

**Industry:**

- **Stripe and OpenAI's ACP:** released Sep 29, 2025 under Apache 2.0, using Shared Payment Tokens. It powers ChatGPT Instant Checkout ([Stripe](https://stripe.com/newsroom/news/stripe-openai-instant-checkout)).
- **Google AP2:** announced Sep 16, 2025 with 60+ partners, **including PayPal**. It uses signed Intent, Cart and Payment "mandates" (W3C VCs), and an A2A x402 extension adds stablecoins ([Digital Commerce 360](https://www.digitalcommerce360.com/2025/09/19/google-ai-payments-protocol-ap2/)).
- **Coinbase x402:** HTTP 402 micropayments. **230M+ transactions and $54M+ in volume** as of Sep 2026, so the average payment is very small ([presenc.ai tracker](https://presenc.ai/research/x402-protocol-adoption-tracker-2026); [CoinDesk, Mar 2026](https://www.coindesk.com/markets/2026/03/11/coinbase-backed-ai-payments-protocol-wants-to-fix-micropayment-but-demand-is-just-not-there-yet)).
- **Mastercard Agent Pay:** announced Apr 29, 2025, using Agentic Tokens. The first live agentic token purchase was on Sep 29, 2025 ([eco.com explainer](https://eco.com/support/en/articles/14845483-mastercard-agent-pay-explained)).
- **Visa:** Intelligent Commerce launched Apr 2025, and the **Trusted Agent Protocol** followed on Oct 14, 2025 with Cloudflare ([Visa](https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.21716.html)).
- **Anthropic Claude Commerce Agents:** launched Sep 2, 2026 with Shopify, Visa, Mastercard and Accenture. It deliberately ships **no payment layer** ([Digital Commerce 360](https://www.digitalcommerce360.com/2026/09/02/anthropic-debuts-claude-features-focused-on-agentic-commerce/); [PYMNTS](https://www.pymnts.com/news/artificial-intelligence/2026/anthropic-built-the-shopping-brain-and-skipped-the-wallet/)).
- **Market forecast:** McKinsey projects that agentic commerce could orchestrate **up to $1T of US retail and $3–5T globally by 2030** ([Digital Commerce 360, Oct 2025](https://www.digitalcommerce360.com/2025/10/20/mckinsey-forecast-5-trillion-agentic-commerce-sales-2030/)).

**Agents hiring humans, and conditional payments:**

- All the protocols above are built for **buying goods at checkout**. None of them defines *conditional release of payment for services against acceptance criteria*.
- The closest live examples are RentAHuman (escrow plus photo proof, crypto or Stripe, no PayPal), Chainlink-style oracle releases, and UQPAY's task-scoped cards.
- **Pitch line:** "ACP, AP2 and x402 let agents pay. Kept lets agents pay *for work*, safely." The hackathon's own idea of "two agents negotiating and settling a payment between themselves" is the hook.

---

## 6. The name "Kept"

**Conflicts found:**

- **"Kept by krungsri"** is a savings and investment app from Krungsri (Bank of Ayudhya, Thailand) with about 705k users. It is a notable **fintech** using the exact name ([Krungsri](https://www.krungsri.com/en/newsandactivities/krungsri-banking-news/kept-success-220000-users)).
- **Keept** (keept.app) is a personal-finance app "built for… freelancers" ([X](https://x.com/keeptapp)).
- **Keep** is a Canadian SMB fintech that raised US$76M ([BetaKit](https://betakit.com/keep-emerges-from-stealth-to-launch-canadian-small-business-banking-platform/)).
- **Keptwork** is an AI dev shop with a "pay after it works" model.
- Several small "Kept" consumer apps exist (home inventory, web archive).
- kept.app showed a "Domain For Sale" page when we checked on 2026-10-05.

**Verdict:** "Kept" is fine to use for the hackathon. It carries real trademark risk in financial services, especially in Thailand and next to Keep and Keept, if the product goes commercial.

**Alternatives (web search only; we did not run USPTO or TESS searches or check domain availability):**

| Name | Rationale | Conflicts found |
|---|---|---|
| **Upheld** | Rulings are upheld and promises are upheld, which matches the referee role | None found in fintech, payments or escrow |
| **Assay** | "To test against a standard", which describes how the referee checks criteria | None found in fintech or escrow. The word is common in mining and labs, so it is a weaker trademark. |
| **Holdwell** | Funds held well, released fairly | A Chinese parts maker (Holdwell M&E, trademark 2015) in an unrelated class. None in fintech. |

**Names we checked and rejected:**

- Pactly: contract-management SaaS and a habit app
- Truce: Ghana escrow app
- FairHold: a direct competitor
- ProofPay: a hackathon rival and a stablecoin startup
- RefPay: sports-official payments
- Umpire: sports-official scheduling
- Settld: confusable with Settle, a $100M fintech
- Greenlit: confusable with GreenLight.ai, a freelancer payroll company

---

## 7. Market size

| Metric | Value | Source (year) |
|---|---|---|
| US freelancers | **64M** (38% of the workforce), earning **$1.27T** | Upwork *Freelance Forward* (Dec 2023) — https://investors.upwork.com/news-releases/news-release-details/upwork-study-finds-64-million-americans-freelanced-2023-adding |
| US independents | **72M+**, of whom 5.6M earn more than $100k | MBO Partners (Sep 2025) — link in §2 |
| US skilled knowledge-worker freelancers | 28% of knowledge workers, generating **$1.5T** in earnings (2024) | Upwork *Future Workforce Index* (2025) — https://www.upwork.com/research/future-workforce-index-2025 |
| Global gig economy | **$3.7T** (2023), of which independent contractors account for 48% | Staffing Industry Analysts (2024) — https://www.staffingindustry.com/news/global-daily-news/global-gig-economy-reaches-37-trillion |
| Online gig workers | **154M–435M** | World Bank (2023) — link in §2 |
| Freelance platforms market | **$7.65B (2025) → $16.54B (2030)**, 16.7% CAGR. Estimates range from $6.4B to $10.3B depending on the firm. | Research & Markets via Yahoo Finance (2025) — https://finance.yahoo.com/news/trends-strategies-shaping-7-65-081200594.html |
| Digital escrow services | **$4.24B (2025) → $4.76B (2026)** | Research & Markets (2026) — https://www.researchandmarkets.com/reports/6244857/digital-escrow-services-market-report |
| Escrow-as-a-Service | $3.8B (2025), 11.6% CAGR to 2034 | Business Research Insights — https://www.businessresearchinsights.com/market-reports/escrow-as-a-service-eaas-market-118748 |

Treat the market-research-firm numbers (the last three rows) as low-confidence.

---

## Top 8 pitch-ready stats

1. **71%** of US freelancers have struggled to collect payment, losing an average of **$5,968** a year. Freelancers Union, 2015. https://blog.freelancersunion.org/2015/12/10/costs-nonpayment/
2. **85%** of freelancers get paid late, and **1 in 5** are paid late or never more than half the time. Remote, 2025. https://remote.com/blog/contractor-management/reversing-late-payment-culture
3. **62%** of NY freelancers have been stiffed at least once, and **fewer than 1%** used the courts. Authors Guild / Freelancers Union, 2022. https://authorsguild.org/news/survey-finds-62-percent-of-ny-freelance-workers-have-lost-wages-due-to-nonpayment/
4. **64M** Americans freelance and earn **$1.27T**. Upwork, 2023. https://investors.upwork.com/news-releases/news-release-details/upwork-study-finds-64-million-americans-freelanced-2023-adding
5. **58%** of US independents *don't* rely on platforms as their main source of work (computed from 42%). MBO Partners, 2025. https://www.prnewswire.com/news-releases/mbo-partners-by-beeline-releases-15th-annual-state-of-independence-study-revealing-a-growing-talent-strategy-for-businesses-302550604.html
6. Upwork keeps **about 20%** of every dollar (2025 revenue $787.8M on about $4.0B GSV, computed), and its arbitration costs **$675**. Upwork IR, 2026: https://investors.upwork.com/news-releases/news-release-details/upwork-reports-fourth-quarter-and-full-year-2025-financial · GigRadar, 2026: https://gigradar.io/blog/upwork-payment-protection-fixed-price
7. PayPal Purchase Protection excludes "Significantly Not as Described claims for **wholly or partly custom-made items**", which covers all bespoke freelance work. PayPal, Jan 2026. https://www.paypal.com/us/legalhub/paypal/buyer-protection
8. Agentic commerce could orchestrate **$3–5T** globally by 2030. McKinsey, 2025. https://www.digitalcommerce360.com/2025/10/20/mckinsey-forecast-5-trillion-agentic-commerce-sales-2030/

---

## Competitive comparison table

| Product | Take rate (2025–26) | Covers off-platform work? | Dispute method & speed | AI? |
|---|---|---|---|---|
| **Upwork** | Freelancer 0–15% variable; client up to 7.99% + $0.99–14.99; about 20% blended | Partially (Direct Contracts; client-initiated ones have no protection) | Human mediation (about 2 business days), then BRIEF arbitration at $337.50 per side; 14-day auto-release | Matching and drafting only |
| **Fiverr** | Seller 20% + buyer 5.5% (+ small-order fee) | No | Fiverr support plus resolution center (human) | No (for disputes) |
| **Escrow.com** | 2.6% ($50 minimum) up to $5k; +3.05% for card or PayPal | Yes | Human mediation; no published timeline | No |
| **FairHold** | Client 4.9% + $0.30 (capped at $99) | Yes | 48-hour dispute window, resolved in about 7 days (human) | No |
| **Contra** | 0% commission; $15–29 per payment on the free plan | Partially (your own clients via Contra) | Not published | No |
| **PayPal G&S** | 2.99% (Send Money for G&S) / 3.49% + $0.49 (Checkout) | Yes (any payee) | Resolution Center; SNAD within 30 days; custom work excluded | Internal fraud models only |
| **Payoneer / Wise / Deel / Bonsai / HoneyBook** | about 1–4% processing, or Deel at $49 per contractor per month | Yes (payment only) | None: no escrow and no adjudication | No |
| **RentAHuman** | Platform cut (undisclosed) + $9.99/month for verification | Its own marketplace (agents to humans, physical tasks) | Founders triage manually | AI photo-proof check |
| **Arbitrus.ai / AAA AI Arbitrator** | About $10k per case (Arbitrus claim); AAA fees | Not escrow, arbitration only | AI ruling in about 72 hours (Arbitrus); AAA AI is for construction documents only, with human review | Yes |
| **Kept (ours)** | TBD. Target: below Escrow.com's effective rate on small milestones. PayPal Payouts cost 2% capped at $1, or a flat $0.25 per item via the API ([PayPal fees](https://www.paypal.com/us/business/paypal-business-fees)) | **Yes, built for DM and off-platform deals** | AI referee gives cited, per-criterion verdicts in minutes; AI-mediated split ruling with Payout + partial refund; review-window auto-release | **Yes, end to end, plus an MCP server for agents** |

---

### Implementation notes from this research

- **PayPal authorizations last only 29 days.** Milestones longer than that need either a capture into a platform balance followed by a Payout, or a reauthorization. Capturing and then paying out makes us a holder of funds, so state in the demo that this runs in sandbox and that a licensed escrow partner would be needed in production.
- **Partial refunds:** `POST /v2/payments/captures/{id}/refund` with an `amount` ([docs](https://developer.paypal.com/api/payments/v2/captures-refund)). **Payouts:** `POST /v1/payments/payouts` ([docs](https://developer.paypal.com/api/payouts)). PayPal charges a **$15** standard dispute fee in the US, which is a talking point for preventing disputes before they reach PayPal.
- **What the PayPal MCP server can and can't do:** it exposes Disputes, Invoices and Orders, but not Payouts. Wrap PayPal's MCP inside our own MCP server so agents get escrow-level tools such as `create_deal`, `fund_milestone`, `submit_deliverable` and `get_verdict`.
