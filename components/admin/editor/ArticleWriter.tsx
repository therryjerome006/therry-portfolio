"use client";

import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Code2,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { VsCodeBlock } from "@/components/admin/editor/VsCodeBlock";
import { docToMarkdown, markdownToDoc, type EditorNode } from "@/components/admin/editor/markdown";

export function ArticleWriter({
  initial,
  onChange,
}: {
  initial: string;
  onChange: (markdown: string) => void;
}) {
  const [ready, setReady] = useState(false);
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({
        placeholder: "Écrivez ici comme dans un document. Le bouton Code ajoute un éditeur avec couleurs et suggestions.",
      }),
      VsCodeBlock,
    ],
    content: markdownToDoc(initial),
    onUpdate: ({ editor: current }) => onChange(docToMarkdown(current.getJSON() as EditorNode)),
  });

  useEffect(() => {
    setReady(Boolean(editor));
  }, [editor]);

  function setLink() {
    if (!editor) return;
    const previous = String(editor.getAttributes("link").href ?? "");
    const url = window.prompt("Adresse du lien", previous || "https://");
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  return (
    <div className="word-page border-[3px] border-[#12263f] bg-white">
      <div className="word-toolbar flex flex-wrap items-center gap-2 border-b border-line bg-white px-3 py-2">
        <span className="kicker">Normal</span>
        <div className="flex flex-wrap gap-1">
          <Tool label="Gras" active={Boolean(editor?.isActive("bold"))} onClick={() => editor?.chain().focus().toggleBold().run()} disabled={!editor}>
            <Bold size={16} />
          </Tool>
          <Tool label="Italique" active={Boolean(editor?.isActive("italic"))} onClick={() => editor?.chain().focus().toggleItalic().run()} disabled={!editor}>
            <Italic size={16} />
          </Tool>
          <Tool label="Souligné" active={Boolean(editor?.isActive("underline"))} onClick={() => editor?.chain().focus().toggleUnderline().run()} disabled={!editor}>
            <UnderlineIcon size={16} />
          </Tool>
          <Tool label="Titre" active={Boolean(editor?.isActive("heading", { level: 2 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} disabled={!editor}>
            <Heading2 size={16} />
          </Tool>
          <Tool label="Sous-titre" active={Boolean(editor?.isActive("heading", { level: 3 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} disabled={!editor}>
            <Heading3 size={16} />
          </Tool>
          <Tool label="Liste" active={Boolean(editor?.isActive("bulletList"))} onClick={() => editor?.chain().focus().toggleBulletList().run()} disabled={!editor}>
            <List size={16} />
          </Tool>
          <Tool label="Liste numérotée" active={Boolean(editor?.isActive("orderedList"))} onClick={() => editor?.chain().focus().toggleOrderedList().run()} disabled={!editor}>
            <ListOrdered size={16} />
          </Tool>
          <Tool label="Citation" active={Boolean(editor?.isActive("blockquote"))} onClick={() => editor?.chain().focus().toggleBlockquote().run()} disabled={!editor}>
            <Quote size={16} />
          </Tool>
          <Tool label="Lien" active={Boolean(editor?.isActive("link"))} onClick={setLink} disabled={!editor}>
            <Link2 size={16} />
          </Tool>
          <Tool label="Annuler" onClick={() => editor?.chain().focus().undo().run()} disabled={!editor}>
            <Undo2 size={16} />
          </Tool>
          <Tool label="Rétablir" onClick={() => editor?.chain().focus().redo().run()} disabled={!editor}>
            <Redo2 size={16} />
          </Tool>
        </div>
        <span className="kicker ml-1">Code</span>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 border border-[#12263f] bg-[#12263f] px-3 text-sm font-semibold text-white"
          disabled={!editor}
          onClick={() =>
            editor
              ?.chain()
              .focus()
              .insertContent({ type: "vscode", attrs: { language: "typescript", code: "" } })
              .run()
          }
        >
          <Code2 size={16} aria-hidden="true" />
          Bloc de code
        </button>
      </div>
      {ready && editor ? (
        <EditorContent editor={editor} />
      ) : (
        <div className="min-h-[18rem] px-5 py-4 text-sm text-muted">Ouverture de l&apos;éditeur…</div>
      )}
    </div>
  );
}

function Tool({
  label,
  active = false,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      aria-pressed={active}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center border ${
        active ? "border-accent bg-accent text-white" : "border-line bg-white text-ink"
      } disabled:opacity-40`}
    >
      {children}
    </button>
  );
}
