export function BlogHeader({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <header className="max-w-3xl">
      <p className="kicker">Blog</p>
      <h1 className="display mt-4 text-4xl text-ink sm:text-6xl">{title}</h1>
      <p className="mt-4 text-lg leading-8 text-muted">{text}</p>
    </header>
  );
}
