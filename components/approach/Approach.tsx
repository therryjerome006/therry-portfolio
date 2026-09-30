import { approach } from "@/data/approach";
import { Reveal } from "@/components/reveal/Reveal";
import { Section } from "@/components/layout/Section";

export function Approach() {
  return (
    <Section id="approche">
      <Reveal>
        <p className="kicker">06 / Mon approche</p>
        <h2 className="display mt-4 text-4xl text-ink sm:text-5xl">Cinq temps, dans cet ordre.</h2>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {approach.map((item) => (
            <li key={item.step} className="border border-line p-4">
              <p className="font-mono text-sm text-accent">{item.step}</p>
              <h3 className="mt-3 text-lg text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{item.text}</p>
            </li>
          ))}
        </ol>
      </Reveal>
    </Section>
  );
}
