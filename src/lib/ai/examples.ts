import { SOURCE_SAMPLES } from "@/components/composer/samples";
import type { DraftOutput } from "./schemas";

/**
 * Pre-compiled drafts for the composer's example chips, shown only when no AI provider is
 * configured (keyless local runs). They are labelled as pre-compiled in the UI; with a key,
 * every compile; including these examples; runs live.
 */
const n = { value: null, values: null, width: null, height: null } as const;

const DRAFTS: DraftOutput[] = [
  {
    title: "Logo design for Pan de Rosa bakery",
    summary: "Kai designs a new logo for Pan de Rosa, a bakery in San Antonio, ahead of its reopening. Three concepts first, then a final logo package for print and social.",
    currency: "USD",
    clientName: "Rosa",
    freelancerName: "Kai",
    milestones: [
      {
        title: "Three logo concepts",
        description: "Three distinct logo directions featuring a wheat or concha motif in the bakery's pink palette.",
        amount: 180,
        dueInDays: 6,
        criteria: [
          { text: "Presents exactly 3 distinct logo concepts", kind: "objective", check: { ...n, type: "min_files", value: 1 } },
          { text: "Each concept uses a wheat or concha motif", kind: "subjective", check: { ...n, type: "none" } },
          { text: "Each concept uses the bakery's pink as a primary colour", kind: "subjective", check: { ...n, type: "none" } },
          { text: "Each concept includes the name “Pan de Rosa”", kind: "objective", check: { ...n, type: "none" } },
        ],
      },
      {
        title: "Final logo package",
        description: "The chosen concept refined and exported for print and social media.",
        amount: 270,
        dueInDays: 5,
        criteria: [
          { text: "Logo delivered as SVG (vector) and PNG", kind: "objective", check: { ...n, type: "file_types", values: ["svg", "png"] } },
          { text: "PNG exported at least 2000×2000px for print", kind: "objective", check: { ...n, type: "min_image_resolution", width: 2000, height: 2000 } },
          { text: "Includes a square 1080×1080 version for social profiles", kind: "objective", check: { ...n, type: "none" } },
          { text: "Final logo matches the concept the client chose", kind: "subjective", check: { ...n, type: "none" } },
        ],
      },
    ],
    terms: {
      revisionsIncluded: 2,
      reviewWindowHours: 48,
      ipTransfer: "Full rights to the final logo transfer to Pan de Rosa on final payment; unused concepts stay with the designer.",
      communication: "Feedback within 2 days of each delivery so the reopening date holds.",
    },
    ambiguities: [
      { quote: "something modern but warm", issue: "Style words with no reference; the most common source of logo disputes", suggestion: "Wheat or concha motif, bakery pink as a primary colour, shown in 3 distinct directions" },
      { quote: "a few revisions included", issue: "Revision count is open-ended", suggestion: "2 rounds of revisions on the chosen concept" },
      { quote: "final files for print + social", issue: "Formats and sizes undefined", suggestion: "SVG + PNG ≥ 2000px, plus a 1080×1080 social version" },
      { quote: "before our reopening on the 20th", issue: "Deadline relative to an unstated month, with no buffer for feedback", suggestion: "Concepts in 6 days, final files 5 days after the concept is chosen" },
      { quote: "budget is like $450?", issue: "Price phrased as a question", suggestion: "$450 total: $180 for concepts, $270 for the final package" },
    ],
    riskFlags: [],
    clarityScore: 38,
  },
  {
    title: "Three SEO blog posts for Northwind Bikes",
    summary: "Sam writes three blog posts for Northwind Bikes on e-bike buying, maintenance and winter commuting, in the brand's friendly voice. $300 per post, delivered over two weeks.",
    currency: "USD",
    clientName: "Priya (Northwind Bikes)",
    freelancerName: "Sam",
    milestones: [
      {
        title: "Post 1; Choosing your first e-bike",
        description: "A 1,200–1,500 word buyer's guide.",
        amount: 300,
        dueInDays: 7,
        criteria: [
          { text: "Between 1,200 and 1,500 words", kind: "objective", check: { ...n, type: "min_words", value: 1200 } },
          { text: "Uses the target keywords “first e-bike” and “e-bike buying guide”", kind: "objective", check: { ...n, type: "keywords_present", values: ["first e-bike", "e-bike buying guide"] } },
          { text: "Includes an H1 title, at least 4 H2 sections and a meta description under 160 characters", kind: "objective", check: { ...n, type: "none" } },
          { text: "Friendly, second-person voice matching Northwind's existing blog", kind: "subjective", check: { ...n, type: "none" } },
          { text: "Delivered as a Google Doc link or .docx file", kind: "objective", check: { ...n, type: "none" } },
        ],
      },
      {
        title: "Posts 2 & 3; Maintenance basics and winter commuting",
        description: "Two posts, 1,200–1,500 words each.",
        amount: 600,
        dueInDays: 7,
        criteria: [
          { text: "Two posts, each between 1,200 and 1,500 words", kind: "objective", check: { ...n, type: "min_words", value: 2400 } },
          { text: "Post 2 covers chain, brakes, tyres and battery care", kind: "objective", check: { ...n, type: "keywords_present", values: ["chain", "brake", "tyre", "battery"] } },
          { text: "Post 3 covers clothing, lights, battery range in the cold and road safety", kind: "objective", check: { ...n, type: "keywords_present", values: ["lights", "cold", "range"] } },
          { text: "Each post has an H1, at least 4 H2 sections and a meta description", kind: "objective", check: { ...n, type: "none" } },
          { text: "No plagiarism: original writing, sources linked where facts are cited", kind: "subjective", check: { ...n, type: "none" } },
        ],
      },
    ],
    terms: {
      revisionsIncluded: 1,
      reviewWindowHours: 72,
      ipTransfer: "Northwind Bikes owns each post outright once it is paid for.",
      communication: "Priya shares the target keywords and two example posts before writing starts.",
    },
    ambiguities: [
      { quote: "SEO optimized", issue: "“Optimised” isn't measurable", suggestion: "Named target keywords per post, H1/H2 structure and a meta description under 160 characters" },
      { quote: "in our friendly voice", issue: "Voice has no reference", suggestion: "Second-person, matching two example posts Priya provides" },
      { quote: "roughly 1,200-1,500 words", issue: "“Roughly” invites a dispute at 1,150 words", suggestion: "Hard range of 1,200–1,500 words per post" },
    ],
    riskFlags: [],
    clarityScore: 72,
  },
  {
    title: "Landing page for the app launch (Next.js + Tailwind)",
    summary: "Mira builds the launch landing page in Next.js and Tailwind, hosted on Vercel, with a waitlist form posting to the client's API. Paid half after hero and features, half on completion.",
    currency: "USD",
    clientName: "Omar",
    freelancerName: "Mira",
    milestones: [
      {
        title: "Hero and features live",
        description: "Repository set up; hero and features sections deployed to a public preview URL.",
        amount: 600,
        dueInDays: 7,
        criteria: [
          { text: "Preview URL is live and publicly reachable", kind: "objective", check: { ...n, type: "url_reachable" } },
          { text: "GitHub repository uses Next.js and Tailwind and has a README with setup steps", kind: "objective", check: { ...n, type: "repo_has_path", values: ["package.json", "README.md", "tailwind"] } },
          { text: "Hero and features sections match the copy the client provided", kind: "subjective", check: { ...n, type: "none" } },
        ],
      },
      {
        title: "Complete page with waitlist",
        description: "Pricing, FAQ and a working waitlist form; performance and tests in place.",
        amount: 600,
        dueInDays: 7,
        criteria: [
          { text: "Page contains Pricing (3 tiers) and FAQ sections", kind: "objective", check: { ...n, type: "page_contains", values: ["Pricing", "FAQ"] } },
          { text: "Waitlist form POSTs to the client's API endpoint and shows a success state", kind: "objective", check: { ...n, type: "none" } },
          { text: "Repository includes basic automated tests", kind: "objective", check: { ...n, type: "repo_has_path", values: ["tests/"] } },
          { text: "Lighthouse performance score of 90+ on mobile (screenshot attached)", kind: "objective", check: { ...n, type: "none" } },
          { text: "Deployed on Vercel at the production domain", kind: "objective", check: { ...n, type: "url_reachable" } },
        ],
      },
    ],
    terms: {
      revisionsIncluded: 2,
      reviewWindowHours: 48,
      ipTransfer: "The client owns the code and design once the final milestone is paid; Mira may show it in her portfolio.",
      communication: "Async in Discord; reviews within 48 hours so the meetup demo date holds.",
    },
    ambiguities: [
      { quote: "needs to be fast, lighthouse 90+", issue: "Which Lighthouse category and device?", suggestion: "Lighthouse performance ≥ 90 on mobile, evidenced by a screenshot" },
      { quote: "i'll add basic tests too", issue: "Scope of tests undefined", suggestion: "A tests/ folder with at least the form submission covered" },
      { quote: "half when hero+features are up", issue: "“Up” could mean local or deployed", suggestion: "Deployed to a public preview URL" },
    ],
    riskFlags: [],
    clarityScore: 64,
  },
  {
    title: "Company website (on hold: scam signals detected)",
    summary: "A client asks for a company website for $2,500 but proposes an overpayment by cheque, gift-card refunds, Friends & Family payment and an unpaid test. Kept recommends not proceeding outside escrow.",
    currency: "USD",
    clientName: null,
    freelancerName: null,
    milestones: [
      {
        title: "Company website",
        description: "A four-page company website. The page list below is Kept's suggestion; confirm it with the client before funding.",
        amount: 2500,
        dueInDays: 21,
        criteria: [
          { text: "Website is live and publicly reachable at the agreed address", kind: "objective", check: { ...n, type: "url_reachable" } },
          { text: "Has Home, About, Services and Contact pages", kind: "objective", check: { ...n, type: "page_contains", values: ["About", "Services", "Contact"] } },
          { text: "Contact form sends enquiries to the client's email address", kind: "objective", check: { ...n, type: "none" } },
          { text: "Pages work on a phone without horizontal scrolling", kind: "subjective", check: { ...n, type: "none" } },
        ],
      },
    ],
    terms: {
      revisionsIncluded: 2,
      reviewWindowHours: 72,
      ipTransfer: "The client owns the website once paid in full through escrow.",
      communication: "Through Kept only. All payment goes through Kept's PayPal escrow: no cheques, gift cards, Friends & Family or unpaid tests.",
    },
    ambiguities: [
      { quote: "I need a website for my company urgently", issue: "No pages, features or content specified", suggestion: "A written page list and content plan before funding" },
      { quote: "do a free test design", issue: "Unpaid work requested up front", suggestion: "Any design work is a paid, escrowed milestone" },
    ],
    riskFlags: [
      { severity: "high", signal: "Overpayment + refund the difference", explanation: "A cheque for $4,000 against a $2,500 job, with the difference “sent back”; the cheque bounces after you've paid. A classic fraud pattern." },
      { severity: "high", signal: "Gift card payments", explanation: "Gift cards are untraceable and irreversible; legitimate clients don't pay or get refunded in gift cards." },
      { severity: "high", signal: "Friends & Family requested", explanation: "PayPal Friends & Family payments carry no purchase or seller protection; exactly what a scammer wants." },
      { severity: "medium", signal: "Unpaid test work", explanation: "“Free test designs” are a common way to extract work without paying." },
      { severity: "medium", signal: "Move to Telegram", explanation: "Moving off-platform removes any record and protection." },
    ],
    clarityScore: 12,
  },
];

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

export function exampleDraft(sourceText: string): DraftOutput | null {
  const i = SOURCE_SAMPLES.findIndex((s) => norm(s.text) === norm(sourceText));
  return i >= 0 ? DRAFTS[i] ?? null : null;
}
