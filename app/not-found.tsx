import Link from "next/link";
import { Container } from "@/components/layout/Section";

export default function NotFound() {
  return (
    <Container className="py-24">
      <p className="kicker">404</p>
      <h1 className="display mt-4 text-5xl text-ink">Page introuvable.</h1>
      <Link href="/" className="btn btn-primary mt-8">
        Retour à l&apos;accueil
      </Link>
    </Container>
  );
}
