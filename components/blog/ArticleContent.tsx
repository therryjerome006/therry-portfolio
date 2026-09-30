import Image from "next/image";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "@/components/blog/CodeBlock";
import { highlightCode } from "@/lib/blog/highlight";

const components: Components = {
  a({ href, children }) {
    const external = Boolean(href?.startsWith("http"));
    return (
      <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
        {children}
      </a>
    );
  },
  img({ src, alt }) {
    const source = typeof src === "string" ? src : "";
    if (!source) return null;
    return (
      <Image
        src={source}
        alt={alt ?? ""}
        width={1200}
        height={675}
        className="h-auto w-full"
        unoptimized
      />
    );
  },
  pre({ children }) {
    return <>{children}</>;
  },
  code({ className, children }) {
    const text = String(children).replace(/\n$/, "");
    const match = /language-([\w-]+)/.exec(className ?? "");
    if (!match) return <code className="inline-code">{text}</code>;
    return <CodeBlock code={text} language={match[1]} html={highlightCode(text, match[1])} />;
  },
};

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "u"],
};

function withUnderline(content: string) {
  return content
    .split(/(```[\s\S]*?```)/g)
    .map((part, index) => (index % 2 === 1 ? part : part.replace(/\+\+([^\n+]+)\+\+/g, "<u>$1</u>")))
    .join("");
}

export function ArticleContent({ content }: { content: string }) {
  return (
    <div className="prose-article">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
        components={components}
      >
        {withUnderline(content)}
      </ReactMarkdown>
    </div>
  );
}
