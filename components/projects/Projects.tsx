"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { projectFilters, type Project, type ProjectFilter } from "@/data/projects";

export function Projects({ projects }: { projects: Project[] }) {
  const [filter, setFilter] = useState<ProjectFilter>("Tous");
  const visible =
    filter === "Tous" ? projects : projects.filter((project) => project.categories.includes(filter));

  return (
    <section
      id="projets"
      className="border-y-4 border-black bg-[#f3e6c8] py-20 text-[#111111] sm:py-28"
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <p className="text-sm font-bold tracking-[0.16em] uppercase">Projets</p>
        <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Chaque projet, avec son interface.</h2>
        <div className="mt-8 flex gap-2 overflow-x-auto pb-2" role="toolbar" aria-label="Filtrer les projets">
          {projectFilters.map((item) => {
            const selected = filter === item;
            return (
              <button
                key={item}
                type="button"
                aria-pressed={selected}
                onClick={() => setFilter(item)}
                className={`shrink-0 border-2 border-black px-3 py-2 text-sm font-bold ${
                  selected ? "bg-black text-white" : "bg-transparent text-[#111111]"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
        {visible.length === 0 ? (
          <p className="mt-8 border-2 border-black bg-[#f3e6c8] px-4 py-8 font-semibold">
            Aucun projet dans cette catégorie pour le moment.
          </p>
        ) : (
          <ul key={filter} className="project-grid mt-8 grid gap-5 md:grid-cols-2">
            {visible.map((project) => (
              <li key={project.slug}>
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const theme = project.theme;
  const hasVideo = project.media.some((item) => item.kind === "video");

  return (
    <article
      className="card-hover flex h-full flex-col overflow-hidden"
      style={{
        background: theme.surface,
        color: theme.ink,
        border: "2px solid #111111",
        borderRadius: theme.radius,
      }}
    >
      <ProjectChrome project={project} />
      <Link href={`/projects/${project.slug}`} className="relative block overflow-hidden">
        <Image
          src={project.image}
          alt={project.imageAlt}
          width={1200}
          height={750}
          className={`h-56 w-full ${project.slug === "jd-satisfaction-services-plus" ? "object-contain p-8" : "object-cover"}`}
          style={{ background: theme.bg }}
        />
        {hasVideo ? (
          <span
            className="absolute bottom-3 left-3 px-2 py-1 text-xs font-medium"
            style={{ background: theme.accent, color: theme.accentInk, borderRadius: theme.buttonRadius }}
          >
            Vidéo
          </span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className={`text-xl ${project.slug === "bon-accueil-hotel" ? "font-serif text-3xl" : ""}`}>
            <Link href={`/projects/${project.slug}`}>{project.name}</Link>
          </h3>
          <p className="border px-2 py-1 text-xs" style={{ borderColor: theme.line, color: theme.muted }}>
            {project.status}
          </p>
        </div>
        <p className="mt-3 text-sm leading-6" style={{ color: theme.muted }}>
          {project.summary}
        </p>
        {project.technologies.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {project.technologies.map((tech) => (
              <li key={tech} className="border px-2 py-1 text-xs" style={{ borderColor: theme.line, color: theme.muted }}>
                {tech}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href={project.liveUrl}
            className="inline-flex min-h-11 items-center px-4 text-sm font-medium"
            style={{ background: theme.accent, color: theme.accentInk, borderRadius: theme.buttonRadius }}
            target="_blank"
            rel="noreferrer"
          >
            Voir le projet
          </a>
          <Link
            href={`/projects/${project.slug}`}
            className="inline-flex min-h-11 items-center border px-4 text-sm"
            style={{ borderColor: theme.line, color: theme.ink, borderRadius: theme.buttonRadius }}
          >
            Détails
          </Link>
          {project.codeUrl ? (
            <a
              href={project.codeUrl}
              className="inline-flex min-h-11 items-center border px-4 text-sm"
              style={{ borderColor: theme.line, color: theme.ink, borderRadius: theme.buttonRadius }}
              target="_blank"
              rel="noreferrer"
            >
              Voir le code
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ProjectChrome({ project }: { project: Project }) {
  const theme = project.theme;

  if (project.slug === "achatplus") {
    return (
      <div style={{ background: "#ffffff" }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <Image src="/projects/achatplus/logo.png" alt="" width={120} height={36} className="h-8 w-auto" />
          <p
            className="min-w-0 flex-1 truncate border px-3 py-2 text-sm"
            style={{ borderColor: theme.line, color: theme.muted, borderRadius: "999px" }}
          >
            Que recherchez-vous ?
          </p>
        </div>
        <div className="h-1" style={{ background: "linear-gradient(90deg, #00209f 50%, #d21034 50%)" }} />
      </div>
    );
  }

  if (project.slug === "bon-accueil-hotel") {
    return (
      <div className="flex items-center justify-between px-4 py-3" style={{ background: "#fbf8f1" }}>
        <p className="font-serif text-lg" style={{ color: "#1b3d2f" }}>
          Bon Accueil
        </p>
        <p className="text-xs tracking-[0.18em] uppercase" style={{ color: "#3f7259" }}>
          Jacmel
        </p>
      </div>
    );
  }

  if (project.slug === "jd-satisfaction-services-plus") {
    return (
      <div>
        <div className="flex items-center gap-3 px-4 py-3" style={{ background: "#1a3a6b", color: "#ffffff" }}>
          <Image src="/projects/jd-satisfaction/logo.jpeg" alt="" width={40} height={40} className="h-10 w-10 object-contain" />
          <p className="text-sm font-semibold tracking-wide">JD Satisfaction Services Plus</p>
        </div>
        <div className="h-1.5" style={{ background: "#f5c518" }} />
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between px-4 py-3 font-mono text-xs tracking-[0.16em]"
      style={{ background: "#070b14", color: "#00f0ff" }}
    >
      <span>PRT E-SPORT</span>
      <span style={{ color: "#ff2d6a" }}>COMPÉTITION</span>
    </div>
  );
}
