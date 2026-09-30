import type { CSSProperties, ReactNode } from "react";

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function Section({
  id,
  children,
  className = "",
  style,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section id={id} className={`border-t border-line py-20 sm:py-28 ${className}`} style={style}>
      <Container>{children}</Container>
    </section>
  );
}
