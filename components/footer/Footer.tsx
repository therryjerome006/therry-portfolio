import { profile, whatsappLink } from "@/data/profile";

export function Footer() {
  const whatsapp = whatsappLink(profile.phone, profile.whatsapp);
  const links = [
    profile.github ? { label: "GitHub", href: profile.github } : null,
    profile.linkedin ? { label: "LinkedIn", href: profile.linkedin } : null,
    profile.email ? { label: "Email", href: `mailto:${profile.email}` } : null,
    profile.phone ? { label: "Téléphone", href: `tel:${profile.phone.replace(/\s/g, "")}` } : null,
    whatsapp ? { label: "WhatsApp", href: whatsapp } : null,
  ].filter((item): item is { label: string; href: string } => item !== null);

  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="display text-2xl text-ink">{profile.name}</p>
          <p className="mt-1 text-sm text-muted">{profile.role}</p>
        </div>
        {links.length > 0 ? (
          <ul className="flex flex-wrap gap-4 text-sm">
            {links.map((link) => (
              <li key={link.label}>
                <a href={link.href} className="text-muted hover:text-ink" target={link.href.startsWith("http") ? "_blank" : undefined} rel={link.href.startsWith("http") ? "noreferrer" : undefined}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="border-t border-line">
        <p className="mx-auto w-full max-w-6xl px-4 py-4 text-sm text-muted sm:px-6">
          © 2026 {profile.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
