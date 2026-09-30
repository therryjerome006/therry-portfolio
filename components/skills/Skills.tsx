import { skillGroups, skillTones } from "@/data/skills";
import { Reveal } from "@/components/reveal/Reveal";
import { Section } from "@/components/layout/Section";

export function Skills() {
  return (
    <Section id="competences" style={{ background: "#e4edf8", borderTop: "8px solid #1d6fe8" }}>
      <Reveal>
        <p className="text-sm font-bold tracking-[0.16em] text-[#1d6fe8] uppercase">Compétences</p>
        <h2 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight text-[#12263f] sm:text-5xl">
          Ce que j&apos;utilise, et ce que j&apos;explore.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {skillGroups.map((group) => (
            <article key={group.title} className="border-[3px] border-[#12263f] bg-white p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-xl font-bold text-[#12263f]">{group.title}</h3>
                <p className="font-mono text-[11px] font-bold tracking-wide text-[#1d6fe8] uppercase">{group.note}</p>
              </div>
              <ul className="mt-4 flex flex-wrap gap-2">
                {group.items.map((item) => {
                  const tone = skillTones[item] ?? { background: "#1d6fe8", color: "#ffffff" };
                  return (
                    <li
                      key={item}
                      className="px-2.5 py-1.5 text-xs font-bold"
                      style={{ background: tone.background, color: tone.color }}
                    >
                      {item}
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}
