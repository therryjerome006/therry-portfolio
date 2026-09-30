import { timeline } from "@/data/experience";
import { Reveal } from "@/components/reveal/Reveal";
import { Section } from "@/components/layout/Section";

export function Experience() {
  return (
    <Section id="parcours">
      <Reveal>
        <p className="kicker">05 / Parcours</p>
        <h2 className="display mt-4 text-4xl text-ink sm:text-5xl">Où j&apos;en suis.</h2>
        <ol className="mt-10 border-l border-line">
          {timeline.map((item) => (
            <li key={item.title} className="relative pb-10 pl-8 last:pb-0">
              <span className="absolute top-1 -left-[5px] h-2.5 w-2.5 bg-accent" aria-hidden="true" />
              <p className="font-mono text-xs tracking-wide text-accent uppercase">{item.label}</p>
              <h3 className="mt-2 text-xl text-ink">{item.title}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">{item.description}</p>
            </li>
          ))}
        </ol>
      </Reveal>
    </Section>
  );
}
