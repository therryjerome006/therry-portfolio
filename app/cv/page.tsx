import type { Metadata } from "next";
import Link from "next/link";
import { projects } from "@/data/projects";
import { skillGroups } from "@/data/skills";
import { timeline } from "@/data/experience";
import { profile } from "@/data/profile";
import { Container } from "@/components/layout/Section";

export const metadata: Metadata = {
  title: "CV",
  description: "Parcours, compétences et projets de Therry Adler Jérôme, Software Developer.",
  alternates: { canonical: "/cv" },
};

export default function CvPage() {
  return (
    <Container className="py-16">
      <p className="kicker">CV</p>
      <h1 className="display mt-4 text-5xl text-ink">{profile.name}</h1>
      <p className="mt-2 font-mono text-sm tracking-wide text-accent uppercase">{profile.role}</p>
      <p className="mt-6 max-w-2xl leading-8 text-muted">{profile.summary}</p>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
        Cette page reprend les informations du portfolio. Pour la remplacer par un PDF, déposez le fichier dans{" "}
        <code className="inline-code">public/cv.pdf</code> et pointez <code className="inline-code">cvUrl</code> vers{" "}
        <code className="inline-code">/cv.pdf</code> dans <code className="inline-code">data/profile.ts</code>.
      </p>

      <section className="mt-12">
        <h2 className="text-2xl text-ink">Parcours</h2>
        <ul className="mt-4 space-y-4">
          {timeline.map((item) => (
            <li key={item.title}>
              <p className="font-mono text-xs text-accent uppercase">{item.label}</p>
              <p className="mt-1 text-ink">{item.title}</p>
              <p className="text-sm leading-6 text-muted">{item.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl text-ink">Compétences</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {skillGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-ink">{group.title}</h3>
              <p className="mt-1 text-sm text-muted">{group.items.join(", ")}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl text-ink">Projets</h2>
        <ul className="mt-4 space-y-4">
          {projects.map((project) => (
            <li key={project.slug}>
              <p className="text-ink">{project.name}</p>
              <p className="text-sm leading-6 text-muted">{project.summary}</p>
              <p className="mt-1 text-sm">
                <a href={project.liveUrl} className="text-accent" target="_blank" rel="noreferrer">
                  {project.liveUrl}
                </a>
                {" · "}
                <Link href={`/projects/${project.slug}`} className="text-muted">
                  Détails
                </Link>
              </p>
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
