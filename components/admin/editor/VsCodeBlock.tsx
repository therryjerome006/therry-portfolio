"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { EditorState } from "@codemirror/state";
import { EditorView, placeholder } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";
import { basicSetup } from "codemirror";
import { useEffect, useRef } from "react";
import { codeLanguages, languageSupport } from "@/components/admin/editor/languages";

function VsCodeView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const host = useRef<HTMLDivElement>(null);
  const codeRef = useRef(String(node.attrs.code ?? ""));
  const updateRef = useRef(updateAttributes);
  const language = String(node.attrs.language ?? "javascript");
  codeRef.current = String(node.attrs.code ?? "");
  updateRef.current = updateAttributes;

  useEffect(() => {
    const parent = host.current;
    if (!parent) return;
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: codeRef.current,
        extensions: [
          basicSetup,
          oneDark,
          languageSupport(language),
          EditorView.lineWrapping,
          placeholder("Commencez à taper : les suggestions du langage apparaissent."),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return;
            const next = update.state.doc.toString();
            codeRef.current = next;
            updateRef.current({ code: next });
          }),
        ],
      }),
    });
    return () => view.destroy();
  }, [language]);

  return (
    <NodeViewWrapper
      className={`vscode-block my-4 border border-[#1c2836] bg-[#282c34] ${selected ? "outline outline-2 outline-[#1d6fe8]" : ""}`}
    >
      <div className="code-tools flex items-center justify-between gap-3 border-b border-[#1c2836] px-3 py-2" contentEditable={false}>
        <label className="flex items-center gap-2 font-mono text-xs text-[#8ea0b8]">
          Langage
          <select
            value={language}
            className="border border-[#3a4658] bg-[#1e2430] px-2 py-1 text-[#d7e2f0]"
            onChange={(event) => updateAttributes({ language: event.target.value })}
          >
            {codeLanguages.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <span className="hidden font-mono text-[0.68rem] text-[#8ea0b8] sm:inline">Couleurs et suggestions pendant la frappe</span>
        <button type="button" className="font-mono text-xs text-[#f0b4b4]" onClick={deleteNode}>
          Retirer
        </button>
      </div>
      <div ref={host} />
    </NodeViewWrapper>
  );
}

export const VsCodeBlock = Node.create({
  name: "vscode",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      language: { default: "javascript" },
      code: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-vscode]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-vscode": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VsCodeView, {
      stopEvent: ({ event }) => {
        const target = event.target;
        const element = target instanceof Element ? target : target instanceof globalThis.Node ? target.parentElement : null;
        return Boolean(element?.closest(".cm-editor, .code-tools"));
      },
      ignoreMutation: ({ mutation }) => {
        const target = mutation.target;
        const element = target instanceof Element ? target : target.parentElement;
        return Boolean(element?.closest(".cm-editor, .code-tools"));
      },
    });
  },
});
