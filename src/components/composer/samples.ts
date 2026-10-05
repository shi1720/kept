export interface SourceSample {
  label: string;
  role: "client" | "freelancer";
  text: string;
}

export const SOURCE_SAMPLES: SourceSample[] = [
  {
    label: "Instagram DM · bakery logo",
    role: "client",
    text: `Rosa: hi!! saw your work on insta, love it. I own a small bakery (Pan de Rosa) in San Antonio and I need a new logo
Kai: thank you! happy to help. what are you looking for?
Rosa: something modern but warm, maybe with a wheat or concha? we use pink a lot
Kai: love that. I can do 3 concepts, then refine the one you pick
Rosa: perfect. budget is like $3,500? need it before our reopening on the 20th
Kai: works. I'll send final files for print + social. a few revisions included ofc
Rosa: amazing ok let's do it`,
  },
  {
    label: "Email · 3 SEO blog posts",
    role: "freelancer",
    text: `Hi Sam,

Thanks for the call. To confirm: you'll write 3 blog posts for the Northwind Bikes site, roughly 1,200-1,500 words each, on (1) choosing your first e-bike, (2) e-bike maintenance basics, (3) commuting by e-bike in winter. They should be SEO optimized and in our friendly voice. We'll pay $800 per post, $2,400 total. First post in a week, the other two the week after. Please send them as Google Docs or Word.

Best,
Priya; Marketing, Northwind Bikes`,
  },
  {
    label: "Discord · Next.js landing page",
    role: "client",
    text: `dev_omar: yo, can you build the landing page for our app? nextjs + tailwind, hosted on vercel
mira.codes: sure, what sections?
dev_omar: hero, features, pricing (3 tiers), FAQ, waitlist form that posts to our API. needs to be fast, lighthouse 90+
mira.codes: got it. repo on github so you can review? I'd say $6,000, half when hero+features are up, half at the end
dev_omar: deal. we demo at a meetup in 2 weeks so we need it by then
mira.codes: 🤝 i'll add basic tests too`,
  },
  {
    label: "Suspicious DM · watch the risk flags",
    role: "freelancer",
    text: `Hello dear, I need a website for my company urgently. I will pay $2,500 but my assistant will send you a check for $4,000 by mistake, you just send the difference back by gift cards. Please also send payment request as Friends and Family to avoid fees. Before we start please do a free test design so I can see your skills. Contact me on Telegram only.`,
  },
];
