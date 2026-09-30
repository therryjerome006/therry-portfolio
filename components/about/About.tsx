import { Reveal } from "@/components/reveal/Reveal";
import { Section } from "@/components/layout/Section";

const principles = [
  { word: "Learning", text: "Comprendre avant de prétendre savoir." },
  { word: "Building", text: "Apprendre en livrant des applications réelles." },
  { word: "Improving", text: "Revenir sur le travail, corriger, simplifier." },
];

export function About() {
  return (
    <Section id="a-propos" style={{ background: "#ffffff", borderTop: "8px solid #12263f" }}>
      <Reveal>
        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-sm font-bold tracking-[0.16em] text-[#12263f] uppercase">À propos</p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-[#12263f] sm:text-5xl">
              Développeur en formation, orienté software.
            </h2>
            <div className="mt-6 space-y-4 text-base leading-8 font-medium text-[#24364c]">
              <p>
                Je m&apos;intéresse à l&apos;informatique, et plus précisément au développement logiciel :
                applications web, bases de données et technologies qui bougent vite.
              </p>
              <p>
                Je me forme au Centre Alcibiade Pommayrac. En parallèle, je construis des projets concrets
                pour apprendre à structurer une application, à relier une interface à des données, et à
                mettre le résultat en ligne.
              </p>
              <p>
                Je ne me présente pas comme un développeur senior. Je veux continuer à apprendre, à
                construire, puis à améliorer ce que j&apos;ai déjà livré.
              </p>
            </div>
          </div>
          <ol className="border-[3px] border-[#12263f] bg-[#f7fbff]">
            {principles.map((item, index) => (
              <li key={item.word} className={`p-5 ${index < principles.length - 1 ? "border-b-[3px] border-[#12263f]" : ""}`}>
                <p className="font-mono text-xs font-bold text-[#1d6fe8]">0{index + 1}</p>
                <p className="mt-2 text-3xl font-bold text-[#12263f]">{item.word}</p>
                <p className="mt-2 text-sm leading-6 font-medium text-[#24364c]">{item.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </Reveal>
    </Section>
  );
}
