import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, projects } from "@/data/projects";
import { Container } from "@/components/layout/Section";
import { ProjectGallery } from "@/components/projects/ProjectGallery";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  return {
    title: project.name,
    description: project.summary,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      title: project.name,
      description: project.summary,
      url: `/projects/${project.slug}`,
      images: [project.image],
    },
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const theme = project.theme;
  const blocks = [
    { title: "Overview", text: project.overview },
    { title: "Le problème", text: project.problem },
    { title: "La solution", text: project.solution },
    { title: "Résultat", text: project.result },
  ];
  const serif = project.slug === "bon-accueil-hotel";

  return (
    <div style={{ background: theme.bg, color: theme.ink }}>
      <Container className="py-14">
        <p className="text-sm" style={{ color: theme.muted }}>
          <Link href="/#projets" style={{ color: theme.ink }}>
            Projets
          </Link>
          {" / "}
          {project.name}
        </p>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="font-mono text-xs tracking-[0.14em] uppercase" style={{ color: theme.accent }}>
              {project.status}
            </p>
            <h1 className={`mt-3 text-4xl sm:text-6xl ${serif ? "font-serif" : ""}`}>{project.name}</h1>
            <p className="mt-4 max-w-xl text-lg leading-8" style={{ color: theme.muted }}>
              {project.summary}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={project.liveUrl}
              className="inline-flex min-h-11 items-center px-4 text-sm font-medium"
              style={{ background: theme.accent, color: theme.accentInk, borderRadius: theme.buttonRadius }}
              target="_blank"
              rel="noreferrer"
            >
              Live Demo
            </a>
            {project.codeUrl ? (
              <a
                href={project.codeUrl}
                className="inline-flex min-h-11 items-center border px-4 text-sm"
                style={{ borderColor: theme.line, color: theme.ink, borderRadius: theme.buttonRadius }}
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            ) : null}
          </div>
        </div>
        <ProjectGallery media={project.media} theme={theme} />
        <div className="mt-12 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-8">
            {blocks.map((block) => (
              <section key={block.title}>
                <h2 className={`text-xl ${serif ? "font-serif text-3xl" : ""}`}>{block.title}</h2>
                <p className="mt-3 leading-8" style={{ color: theme.muted }}>
                  {block.text}
                </p>
              </section>
            ))}
          </div>
          <aside className="space-y-8">
            <section>
              <h2 className="text-xl">Fonctionnalités</h2>
              <ul className="mt-3">
                {project.features.map((feature) => (
                  <li key={feature} className="border-b py-2" style={{ borderColor: theme.line, color: theme.muted }}>
                    {feature}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="text-xl">Technologies</h2>
              {project.technologies.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {project.technologies.map((tech) => (
                    <li
                      key={tech}
                      className="border px-2 py-1 text-sm"
                      style={{ borderColor: theme.line, color: theme.muted }}
                    >
                      {tech}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm" style={{ color: theme.muted }}>
                  Stack non renseignée pour ce projet.
                </p>
              )}
            </section>
            <section>
              <h2 className="text-xl">Challenges</h2>
              <ul className="mt-3 space-y-3 text-sm leading-6" style={{ color: theme.muted }}>
                {project.challenges.map((challenge) => (
                  <li key={challenge}>{challenge}</li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </Container>
    </div>
  );
}
