/** Coarse project categories, used to title drafts and to describe work publicly without revealing it. */
export const PROJECT_CATEGORIES: [RegExp, string][] = [
  [/landing page|website|web ?site|homepage/i, "Website / landing page"],
  [/logo|brand identity|branding/i, "Logo & brand identity"],
  [/blog posts?|articles?/i, "Blog articles"],
  [/captions?|social posts?|instagram/i, "Social media content"],
  [/illustrations?|packaging|artwork/i, "Illustration & artwork"],
  [/photo|retouch/i, "Photography & retouching"],
  [/video|edit(ing)? footage|reel/i, "Video editing"],
  [/\bapp\b|mobile app|api|backend|frontend/i, "Software development"],
  [/translat/i, "Translation"],
  [/copy(writing)?|newsletter|email sequence|product description/i, "Copywriting"],
];

export function projectCategory(text: string): string | null {
  return PROJECT_CATEGORIES.find(([re]) => re.test(text))?.[1] ?? null;
}
