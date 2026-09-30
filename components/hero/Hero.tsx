import Image from "next/image";
import Link from "next/link";
import { heroCards, type HeroCard } from "@/data/hero";
import { profile } from "@/data/profile";

export function Hero() {
  return (
    <section id="accueil" className="border-b-8 border-[#1d6fe8] bg-[#f7fbff]">
      <div className="mx-auto grid w-full max-w-6xl items-start gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.86fr_1.14fr] lg:py-20">
        <div className="relative isolate min-h-[36rem] overflow-hidden border-[3px] border-[#12263f]">
          <Image
            src="/hero/therry.jpg"
            alt={profile.name}
            fill
            priority
            sizes="(min-width: 1024px) 42vw, 100vw"
            className="origin-[center_32%] scale-[1.85] object-cover object-center"
          />
          <div className="relative flex min-h-[36rem] flex-col justify-end bg-[linear-gradient(to_top,#071018_0%,rgba(7,16,24,0.72)_22%,transparent_46%)] p-6 text-white sm:p-8">
          <p className="text-sm font-bold tracking-[0.16em] text-white uppercase">Accueil</p>
          <h1 className="mt-3 text-5xl leading-[0.95] font-bold tracking-tight text-white sm:text-6xl">
            {profile.name}
          </h1>
          <p className="mt-4 text-base font-bold tracking-[0.14em] text-[#d6e6ff] uppercase">{profile.role}</p>
          <p className="mt-5 max-w-xl text-lg leading-8 font-semibold text-white">{profile.summary}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/#projets" className="btn btn-primary w-full sm:w-auto">
              Voir mes projets
            </Link>
            <Link href="/#contact" className="btn w-full border-white text-white sm:w-auto" style={{ borderColor: "#ffffff", color: "#ffffff" }}>
              Me contacter
            </Link>
            {profile.github ? (
              <a href={profile.github} className="btn" style={{ borderColor: "#ffffff", color: "#ffffff" }} target="_blank" rel="noreferrer">
                GitHub
              </a>
            ) : null}
          </div>
          <div className="term mt-8" aria-hidden="true">
            <div className="term-bar">
              <span className="term-dots">
                <span />
                <span />
                <span />
              </span>
              <span>developer.ts</span>
            </div>
            <pre className="term-body">
              <span className="term-prompt">❯ </span>
              <span className="term-kw">return</span> learn().then(build)
              <span className="term-ghost">.then(improve)</span>
              <span className="caret text-[#3dff8a]">▍</span>
            </pre>
          </div>
          </div>
        </div>

        <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
          {heroCards.map((card) => (
            <li key={card.tech}>
              <HeroMediaCard card={card} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function HeroMediaCard({ card }: { card: HeroCard }) {
  const imageSrc = card.media.kind === "video" ? card.media.poster : card.media.src;
  const hasVideo = card.media.kind === "video" && card.media.src.length > 0;

  return (
    <article className="flex h-full flex-col border-2 border-black bg-white">
      <p className="px-3 py-2 text-sm font-bold" style={{ background: card.color, color: card.ink }}>
        {card.tech}
      </p>
      {hasVideo ? (
        <video
          controls
          playsInline
          preload="metadata"
          poster={card.media.kind === "video" ? card.media.poster : undefined}
          className="aspect-[4/3] w-full bg-black object-contain"
          aria-label={card.media.alt}
        >
          <source src={card.media.src} type="video/mp4" />
        </video>
      ) : (
        <Image
          src={imageSrc}
          alt={card.media.alt}
          width={640}
          height={480}
          className="aspect-[4/3] w-full object-contain"
          style={{ background: card.frame }}
        />
      )}
      {card.note ? (
        <p className="px-3 py-2 text-xs font-bold" style={{ color: card.color }}>
          {card.note}
        </p>
      ) : null}
    </article>
  );
}
