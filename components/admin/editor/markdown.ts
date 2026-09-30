export type EditorMark = {
  type: string;
  attrs?: Record<string, string>;
};

export type EditorNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: EditorNode[];
  text?: string;
  marks?: EditorMark[];
};

function withMark(nodes: EditorNode[], mark: EditorMark): EditorNode[] {
  return nodes.map((node) => {
    if (node.type !== "text") return node;
    return { ...node, marks: [...(node.marks ?? []), mark] };
  });
}

function parseInline(input: string): EditorNode[] {
  const nodes: EditorNode[] = [];
  let buffer = "";
  const flush = () => {
    if (!buffer) return;
    nodes.push({ type: "text", text: buffer });
    buffer = "";
  };

  let index = 0;
  while (index < input.length) {
    if (input.startsWith("**", index)) {
      const end = input.indexOf("**", index + 2);
      if (end !== -1) {
        flush();
        nodes.push(...withMark(parseInline(input.slice(index + 2, end)), { type: "bold" }));
        index = end + 2;
        continue;
      }
    }
    if (input.startsWith("++", index)) {
      const end = input.indexOf("++", index + 2);
      if (end !== -1) {
        flush();
        nodes.push(...withMark(parseInline(input.slice(index + 2, end)), { type: "underline" }));
        index = end + 2;
        continue;
      }
    }
    if (input[index] === "`") {
      const end = input.indexOf("`", index + 1);
      if (end !== -1) {
        flush();
        nodes.push({ type: "text", text: input.slice(index + 1, end), marks: [{ type: "code" }] });
        index = end + 1;
        continue;
      }
    }
    if (input[index] === "*" && input[index + 1] !== "*") {
      const end = input.indexOf("*", index + 1);
      if (end !== -1) {
        flush();
        nodes.push(...withMark(parseInline(input.slice(index + 1, end)), { type: "italic" }));
        index = end + 1;
        continue;
      }
    }
    if (input[index] === "[") {
      const labelEnd = input.indexOf("](", index + 1);
      const hrefEnd = labelEnd === -1 ? -1 : input.indexOf(")", labelEnd + 2);
      if (labelEnd !== -1 && hrefEnd !== -1) {
        flush();
        nodes.push(
          ...withMark(parseInline(input.slice(index + 1, labelEnd)), {
            type: "link",
            attrs: { href: input.slice(labelEnd + 2, hrefEnd) },
          }),
        );
        index = hrefEnd + 1;
        continue;
      }
    }
    buffer += input[index];
    index += 1;
  }
  flush();
  return nodes.filter((node) => node.text !== "");
}

function paragraph(text: string): EditorNode {
  const content = parseInline(text);
  return content.length ? { type: "paragraph", content } : { type: "paragraph" };
}

function proseBlocks(source: string): EditorNode[] {
  const lines = source.replace(/^\n+|\n+$/g, "").split("\n");
  const blocks: EditorNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = Math.min(3, Math.max(2, heading[1].length));
      blocks.push({ type: "heading", attrs: { level }, content: parseInline(heading[2]) });
      index += 1;
      continue;
    }

    if (line.startsWith("> ")) {
      const quoted: string[] = [];
      while (index < lines.length && (lines[index] ?? "").startsWith("> ")) {
        quoted.push((lines[index] ?? "").slice(2));
        index += 1;
      }
      blocks.push({
        type: "blockquote",
        content: [paragraph(quoted.join(" "))],
      });
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: EditorNode[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index] ?? "")) {
        items.push({
          type: "listItem",
          content: [paragraph((lines[index] ?? "").replace(/^[-*]\s+/, ""))],
        });
        index += 1;
      }
      blocks.push({ type: "bulletList", content: items });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: EditorNode[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index] ?? "")) {
        items.push({
          type: "listItem",
          content: [paragraph((lines[index] ?? "").replace(/^\d+\.\s+/, ""))],
        });
        index += 1;
      }
      blocks.push({ type: "orderedList", content: items });
      continue;
    }

    const text = [line];
    index += 1;
    while (
      index < lines.length &&
      (lines[index] ?? "").trim() &&
      !/^(#{1,3}\s|>\s|[-*]\s|\d+\.\s)/.test(lines[index] ?? "")
    ) {
      text.push(lines[index] ?? "");
      index += 1;
    }
    blocks.push(paragraph(text.join(" ")));
  }

  return blocks;
}

export function markdownToDoc(markdown: string): EditorNode {
  const source = markdown.replace(/\r\n/g, "\n").trim();
  if (!source) return { type: "doc", content: [{ type: "paragraph" }] };

  const parts = source.split(/```([^\n`]*)\n([\s\S]*?)```/g);
  const content: EditorNode[] = [];
  for (let index = 0; index < parts.length; ) {
    if (index % 3 === 0) {
      content.push(...proseBlocks(parts[index] ?? ""));
      index += 1;
      continue;
    }
    const language = (parts[index] ?? "javascript").trim() || "javascript";
    const code = (parts[index + 1] ?? "").replace(/\n$/, "");
    content.push({ type: "vscode", attrs: { language, code } });
    index += 2;
  }

  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}

function inlineToMarkdown(nodes: EditorNode[] = []): string {
  return nodes
    .map((node) => {
      if (node.type === "hardBreak") return "  \n";
      if (node.type !== "text") return "";
      let text = node.text ?? "";
      const marks = node.marks ?? [];
      if (marks.some((mark) => mark.type === "code")) return `\`${text.replaceAll("`", "\\`")}\``;
      if (marks.some((mark) => mark.type === "bold")) text = `**${text}**`;
      if (marks.some((mark) => mark.type === "italic")) text = `*${text}*`;
      if (marks.some((mark) => mark.type === "underline")) text = `++${text}++`;
      const link = marks.find((mark) => mark.type === "link");
      if (link?.attrs?.href) text = `[${text}](${link.attrs.href})`;
      return text;
    })
    .join("");
}

function blockToMarkdown(node: EditorNode): string {
  if (node.type === "paragraph") return inlineToMarkdown(node.content);
  if (node.type === "heading") {
    const level = Number(node.attrs?.level ?? 2);
    return `${"#".repeat(Math.min(3, Math.max(2, level)))} ${inlineToMarkdown(node.content)}`;
  }
  if (node.type === "blockquote") {
    return (node.content ?? [])
      .map((child) => inlineToMarkdown(child.content))
      .join("\n")
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
  }
  if (node.type === "bulletList") {
    return (node.content ?? [])
      .map((item) => `- ${inlineToMarkdown(item.content?.[0]?.content)}`)
      .join("\n");
  }
  if (node.type === "orderedList") {
    return (node.content ?? [])
      .map((item, index) => `${index + 1}. ${inlineToMarkdown(item.content?.[0]?.content)}`)
      .join("\n");
  }
  if (node.type === "vscode") {
    const language = String(node.attrs?.language ?? "javascript");
    const code = String(node.attrs?.code ?? "").replace(/\n$/, "");
    return `\`\`\`${language}\n${code}\n\`\`\``;
  }
  return "";
}

export function docToMarkdown(doc: EditorNode): string {
  return (doc.content ?? [])
    .map((node) => blockToMarkdown(node))
    .join("\n\n")
    .trim();
}
