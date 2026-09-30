"use client";

import { useActionState, useState } from "react";
import { sendContact, type ContactState } from "@/lib/actions/contact";
import { profile, whatsappLink } from "@/data/profile";
import { Reveal } from "@/components/reveal/Reveal";
import { Section } from "@/components/layout/Section";

const initial: ContactState = { status: "idle" };

function isPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 && /^[+\d][\d\s().-]+$/.test(value);
}

function validate(form: HTMLFormElement) {
  const data = new FormData(form);
  const errors: Record<string, string> = {};
  const name = String(data.get("name") ?? "").trim();
  const email = String(data.get("email") ?? "").trim();
  const phone = String(data.get("phone") ?? "").trim();
  const subject = String(data.get("subject") ?? "").trim();
  const message = String(data.get("message") ?? "").trim();

  if (name.length < 2) errors.name = "Indiquez votre nom.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Indiquez un email valide.";
  if (phone && !isPhone(phone)) errors.phone = "Indiquez un numéro valide, avec l'indicatif.";
  if (subject.length < 3) errors.subject = "Indiquez un sujet.";
  if (message.length < 10) errors.message = "Le message doit contenir au moins 10 caractères.";
  return errors;
}

export function Contact() {
  const [state, action, pending] = useActionState(sendContact, initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const whatsapp = whatsappLink(profile.phone, profile.whatsapp);
  const tel = profile.phone.replace(/\s/g, "");
  const links = [
    profile.email ? { label: "Email", href: `mailto:${profile.email}` } : null,
    profile.phone ? { label: "Téléphone", href: `tel:${tel}` } : null,
    profile.github ? { label: "GitHub", href: profile.github } : null,
    profile.linkedin ? { label: "LinkedIn", href: profile.linkedin } : null,
  ].filter((item): item is { label: string; href: string } => item !== null);

  return (
    <Section id="contact" style={{ background: "#f7fbff", borderTop: "8px solid #128C7E" }}>
      <Reveal>
        <p className="text-sm font-bold tracking-[0.16em] text-[#075E54] uppercase">Contact</p>
        <h2 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-[#12263f] sm:text-5xl">
          Let&apos;s build something together.
        </h2>
        <p className="mt-4 max-w-2xl text-lg leading-8 font-semibold text-[#24364c]">
          Un projet, une question ou une opportunité : écrivez-moi par message, ou directement sur WhatsApp.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="flex flex-col gap-4">
            <article className="border-2 border-black bg-white">
              <p className="px-4 py-3 text-sm font-bold" style={{ background: "#25D366", color: "#052e16" }}>
                WhatsApp
              </p>
              <div className="p-5">
                <h3 className="text-2xl font-bold text-[#12263f]">Écrire sur WhatsApp</h3>
                {profile.phone ? (
                  <p className="mt-2 text-lg font-bold text-[#075E54]">{profile.phone}</p>
                ) : (
                  <p className="mt-2 text-sm font-medium leading-6 text-[#51627a]">
                    Ajoutez votre numéro dans <span className="font-bold text-[#12263f]">data/profile.ts</span> pour
                    activer ce bouton.
                  </p>
                )}
                <p className="mt-3 text-sm leading-6 font-medium text-[#24364c]">
                  Un échange direct, sans passer par le formulaire.
                </p>
                {whatsapp ? (
                  <a
                    href={whatsapp}
                    className="mt-5 inline-flex min-h-11 items-center px-4 text-sm font-bold"
                    style={{ background: "#128C7E", color: "#ffffff" }}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ouvrir WhatsApp
                  </a>
                ) : null}
                {profile.phone ? (
                  <a href={`tel:${tel}`} className="mt-3 block text-sm font-bold text-[#12263f] underline underline-offset-4">
                    Appeler {profile.phone}
                  </a>
                ) : null}
              </div>
            </article>

            {links.length > 0 ? (
              <ul className="grid gap-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="flex items-center justify-between border-2 border-black bg-white px-4 py-3 text-sm font-bold text-[#12263f]"
                      target={link.href.startsWith("http") ? "_blank" : undefined}
                      rel={link.href.startsWith("http") ? "noreferrer" : undefined}
                    >
                      {link.label}
                      <span aria-hidden="true">→</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <form
            action={action}
            className="grid gap-4 border-2 border-black bg-white p-5 sm:p-6"
            noValidate
            onSubmit={(event) => {
              const next = validate(event.currentTarget);
              setErrors(next);
              if (Object.keys(next).length > 0) event.preventDefault();
            }}
          >
            <div>
              <h3 className="text-2xl font-bold text-[#12263f]">Message</h3>
              <p className="mt-1 text-sm font-medium text-[#51627a]">Nom, email et sujet sont nécessaires. Le numéro est facultatif.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="name" name="name" label="Nom" autoComplete="name" error={errors.name} />
              <Field id="email" name="email" type="email" label="Email" autoComplete="email" error={errors.email} />
              <Field id="phone" name="phone" type="tel" label="Numéro" autoComplete="tel" error={errors.phone} />
              <Field id="subject" name="subject" label="Sujet" error={errors.subject} />
            </div>
            <div>
              <label htmlFor="message" className="mb-2 block text-sm font-bold text-[#12263f]">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={6}
                className="field"
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? "message-error" : undefined}
              />
              {errors.message ? (
                <p id="message-error" className="mt-1 text-sm font-semibold text-danger">
                  {errors.message}
                </p>
              ) : null}
            </div>
            <button type="submit" className="btn btn-primary font-bold" disabled={pending}>
              {pending ? "Envoi…" : "Envoyer le message"}
            </button>
            {state.status !== "idle" ? (
              <p className={state.status === "error" ? "text-sm font-semibold text-danger" : "text-sm font-semibold text-ok"} role="status">
                {state.message}{" "}
                {state.mailto ? (
                  <a href={state.mailto} className="underline">
                    Ouvrir l&apos;email
                  </a>
                ) : null}
              </p>
            ) : null}
          </form>
        </div>
      </Reveal>
    </Section>
  );
}

function Field({
  id,
  label,
  error,
  ...props
}: {
  id: string;
  name: string;
  label: string;
  error?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-[#12263f]">
        {label}
      </label>
      <input id={id} className="field" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...props} />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
