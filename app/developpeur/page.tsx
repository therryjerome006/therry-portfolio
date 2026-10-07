import type { Metadata } from "next";
import { About } from "@/components/about/About";
import { Approach } from "@/components/approach/Approach";
import { Contact } from "@/components/contact/Contact";
import { Experience } from "@/components/experience/Experience";
import { Hero } from "@/components/hero/Hero";
import { LatestArticles } from "@/components/home/LatestArticles";
import { LatestMedia } from "@/components/home/LatestMedia";
import { Projects } from "@/components/projects/Projects";
import { Skills } from "@/components/skills/Skills";
import { profile } from "@/data/profile";
import { projects } from "@/data/projects";
import { getPublishedPosts } from "@/lib/blog/posts";
import { latestMedia, pickHomepageMedia } from "@/lib/media/db";
import { getSiteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Le développeur",
  description: "À propos de Therry Adler Jérôme, ses projets, ses compétences et son parcours.",
};

export default async function DeveloperPage() {
  const posts = await getPublishedPosts();
  const media = pickHomepageMedia(await latestMedia());
  const sameAs = [profile.github, profile.linkedin].filter(Boolean);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    jobTitle: profile.role,
    url: `${getSiteUrl()}/developpeur`,
    ...(profile.email ? { email: profile.email } : {}),
    ...(profile.phone ? { telephone: profile.phone } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Hero />
      <About />
      <Skills />
      <Projects projects={projects} />
      <LatestArticles posts={posts.slice(0, 3)} />
      <LatestMedia posts={media} />
      <Experience />
      <Approach />
      <Contact />
    </>
  );
}
