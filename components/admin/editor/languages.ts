import { snippetCompletion, type Completion, type CompletionSource } from "@codemirror/autocomplete";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { python } from "@codemirror/lang-python";
import { sql } from "@codemirror/lang-sql";
import { LanguageSupport } from "@codemirror/language";
import { StreamLanguage } from "@codemirror/language";
import { shell } from "@codemirror/legacy-modes/mode/shell";

export const codeLanguages = [
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "tsx", label: "TSX" },
  { id: "jsx", label: "JSX" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "json", label: "JSON" },
  { id: "python", label: "Python" },
  { id: "sql", label: "SQL" },
  { id: "bash", label: "Bash" },
] as const;

export type CodeLanguage = (typeof codeLanguages)[number]["id"];

function modules(options: Completion[]): CompletionSource {
  return (context) => {
    const word = context.matchBefore(/[\w$.]+/);
    if (!word || (word.from === word.to && !context.explicit)) return null;
    const typed = word.text.toLowerCase();
    const matched = options.filter((option) => option.label.toLowerCase().includes(typed));
    if (!matched.length) return null;
    return { from: word.from, options: matched, validFor: /^[\w$.]*$/ };
  };
}

function withModules(base: LanguageSupport, options: Completion[]) {
  return new LanguageSupport(base.language, [base.support, base.language.data.of({ autocomplete: modules(options) })]);
}

const scriptModules = [
  snippetCompletion("console.log(${})", { label: "console.log", detail: "console", type: "function" }),
  snippetCompletion("console.error(${})", { label: "console.error", detail: "console", type: "function" }),
  snippetCompletion("fetch(${url})", { label: "fetch", detail: "réseau", type: "function" }),
  snippetCompletion("const ${name} = ${value}", { label: "const", detail: "variable", type: "keyword" }),
  snippetCompletion("function ${name}() {\n  ${}\n}", { label: "function", detail: "fonction", type: "keyword" }),
  snippetCompletion("const ${name} = async () => {\n  ${}\n}", { label: "async", detail: "promesse", type: "keyword" }),
  snippetCompletion("await ${}", { label: "await", detail: "promesse", type: "keyword" }),
  snippetCompletion("import { ${name} } from \"${module}\"", { label: "import", detail: "module", type: "keyword" }),
  snippetCompletion("export default ${}", { label: "export default", detail: "module", type: "keyword" }),
  snippetCompletion("const [value, setValue] = useState(${})", { label: "useState", detail: "react", type: "function" }),
  snippetCompletion("useEffect(() => {\n  ${}\n}, [])", { label: "useEffect", detail: "react", type: "function" }),
  snippetCompletion("const ${name} = useMemo(() => ${}, [])", { label: "useMemo", detail: "react", type: "function" }),
  snippetCompletion("const ${name} = useRef(${})", { label: "useRef", detail: "react", type: "function" }),
  snippetCompletion(".map((${item}) => ${})", { label: "map", detail: "tableau", type: "method" }),
  snippetCompletion(".filter((${item}) => ${})", { label: "filter", detail: "tableau", type: "method" }),
  snippetCompletion("JSON.parse(${})", { label: "JSON.parse", detail: "json", type: "function" }),
  snippetCompletion("JSON.stringify(${})", { label: "JSON.stringify", detail: "json", type: "function" }),
  snippetCompletion("document.querySelector(\"${}\")", { label: "querySelector", detail: "document", type: "function" }),
  snippetCompletion("addEventListener(\"${event}\", () => {\n  ${}\n})", { label: "addEventListener", detail: "événement", type: "method" }),
];

const typeModules = [
  ...scriptModules,
  snippetCompletion("interface ${Name} {\n  ${}\n}", { label: "interface", detail: "typescript", type: "keyword" }),
  snippetCompletion("type ${Name} = ${}", { label: "type", detail: "typescript", type: "keyword" }),
];

const htmlModules = [
  snippetCompletion("<div class=\"${}\">\n  ${}\n</div>", { label: "div", detail: "html", type: "type" }),
  snippetCompletion("<button type=\"button\">${}</button>", { label: "button", detail: "html", type: "type" }),
  snippetCompletion("<a href=\"${}\">${}</a>", { label: "a", detail: "html", type: "type" }),
  snippetCompletion("<img src=\"${}\" alt=\"${}\" />", { label: "img", detail: "html", type: "type" }),
  snippetCompletion("<form action=\"${}\">\n  ${}\n</form>", { label: "form", detail: "html", type: "type" }),
];

const cssModules = [
  snippetCompletion("display: flex;", { label: "display: flex", detail: "css", type: "property" }),
  snippetCompletion("color: ${};", { label: "color", detail: "css", type: "property" }),
  snippetCompletion("background: ${};", { label: "background", detail: "css", type: "property" }),
  snippetCompletion("margin: ${};", { label: "margin", detail: "css", type: "property" }),
  snippetCompletion("padding: ${};", { label: "padding", detail: "css", type: "property" }),
  snippetCompletion("@media (min-width: 640px) {\n  ${}\n}", { label: "@media", detail: "css", type: "keyword" }),
];

const pythonModules = [
  snippetCompletion("print(${})", { label: "print", detail: "python", type: "function" }),
  snippetCompletion("def ${name}():\n    ${}", { label: "def", detail: "fonction", type: "keyword" }),
  snippetCompletion("class ${Name}:\n    def __init__(self):\n        ${}", { label: "class", detail: "python", type: "class" }),
  snippetCompletion("import ${module}", { label: "import", detail: "module", type: "keyword" }),
  snippetCompletion("for ${item} in ${items}:\n    ${}", { label: "for", detail: "boucle", type: "keyword" }),
  snippetCompletion("if ${condition}:\n    ${}", { label: "if", detail: "condition", type: "keyword" }),
];

const sqlModules = [
  snippetCompletion("select ${columns} from ${table}", { label: "select", detail: "sql", type: "keyword" }),
  snippetCompletion("insert into ${table} (${columns}) values (${})", { label: "insert", detail: "sql", type: "keyword" }),
  snippetCompletion("update ${table} set ${column} = ${} where ${}", { label: "update", detail: "sql", type: "keyword" }),
  snippetCompletion("where ${}", { label: "where", detail: "sql", type: "keyword" }),
];

const bashModules = [
  snippetCompletion("echo ${}", { label: "echo", detail: "bash", type: "function" }),
  snippetCompletion("cd ${}", { label: "cd", detail: "bash", type: "keyword" }),
  snippetCompletion("npm install ${}", { label: "npm install", detail: "npm", type: "function" }),
  snippetCompletion("npm run ${dev}", { label: "npm run", detail: "npm", type: "function" }),
  snippetCompletion("git status", { label: "git status", detail: "git", type: "keyword" }),
  snippetCompletion("git add ${}", { label: "git add", detail: "git", type: "keyword" }),
];

const jsonModules = [
  snippetCompletion("{\n  \"${name}\": \"${}\"\n}", { label: "object", detail: "json", type: "keyword" }),
  snippetCompletion("[${}]", { label: "array", detail: "json", type: "keyword" }),
];

export function languageSupport(language: string) {
  switch (language) {
    case "typescript":
      return withModules(javascript({ typescript: true }), typeModules);
    case "tsx":
      return withModules(javascript({ typescript: true, jsx: true }), typeModules);
    case "jsx":
      return withModules(javascript({ jsx: true }), scriptModules);
    case "html":
      return withModules(html(), htmlModules);
    case "css":
      return withModules(css(), cssModules);
    case "json":
      return withModules(json(), jsonModules);
    case "python":
      return withModules(python(), pythonModules);
    case "sql":
      return withModules(sql(), sqlModules);
    case "bash":
      return withModules(new LanguageSupport(StreamLanguage.define(shell)), bashModules);
    default:
      return withModules(javascript(), scriptModules);
  }
}
