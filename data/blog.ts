export const blogCategories = [
  "Development",
  "Next.js",
  "React",
  "Backend",
  "Database",
  "AI",
  "Cybersecurity",
  "Projects",
  "Tutorials",
  "Personal",
] as const;

export type BlogCategory = (typeof blogCategories)[number];

export const BLOG_PAGE_SIZE = 6;
