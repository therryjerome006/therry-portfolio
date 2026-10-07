import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Sans, Instrument_Serif } from "next/font/google";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { profile, siteDescription } from "@/data/profile";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "TY Space",
    template: "%s — TY Space",
  },
  description: siteDescription,
  applicationName: "TY Space",
  authors: [{ name: profile.name }],
  openGraph: {
    title: "TY Space",
    description: siteDescription,
    locale: "fr_FR",
    type: "website",
    siteName: "TY Space",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "TY Space",
    description: siteDescription,
  },
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${sans.variable} ${serif.variable} ${mono.variable} h-full antialiased`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var stored=localStorage.getItem("ty-theme");var theme=stored==="light"||stored==="dark"?stored:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=theme;}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full bg-bg text-ink">
        <a href="#contenu" className="skip-link">
          Aller au contenu
        </a>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
