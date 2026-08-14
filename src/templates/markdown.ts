/**
 * Renderizador de Markdown mínimo, sin dependencias.
 *
 * Existe a proposito en vez de usar `marked`: ese paquete es ESM-only desde la
 * v13 y este proyecto compila a CommonJS. En local Node 24 tolera require(ESM),
 * pero el runtime de Vercel no, y la funcion entera revienta con ERR_REQUIRE_ESM.
 *
 * Cubre exactamente lo que produce el prompt del estudio: encabezados, tablas
 * GFM, listas, parrafos, negrita, cursiva, codigo, enlaces, citas y separadores.
 * Si el prompt empieza a emitir otra sintaxis, hay que ampliarlo aqui.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Formato dentro de una linea. El orden importa: negrita antes que cursiva. */
function inline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/(^|[^_])_([^_\n]+)_/g, "$1<em>$2</em>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );
}

function splitRow(line: string): string[] {
  return line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

const isTableRow = (line: string) => /^\s*\|.*\|\s*$/.test(line);
const isTableDivider = (line: string) => /^\s*\|[\s:|-]+\|\s*$/.test(line);

export function renderMarkdown(source: string): string {
  const lines = escapeHtml(source).split("\n");
  const out: string[] = [];

  let paragraph: string[] = [];
  let listItems: string[] = [];
  let listTag: "ul" | "ol" | null = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    out.push(`<p>${inline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listTag || !listItems.length) return;
    out.push(`<${listTag}>${listItems.map((i) => `<li>${inline(i)}</li>`).join("")}</${listTag}>`);
    listItems = [];
    listTag = null;
  };

  const flushAll = () => {
    flushParagraph();
    flushList();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    if (!trimmed) {
      flushAll();
      continue;
    }

    // Separador
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushAll();
      out.push("<hr />");
      continue;
    }

    // Encabezados
    const heading = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushAll();
      const level = heading[1]!.length;
      out.push(`<h${level}>${inline(heading[2]!)}</h${level}>`);
      continue;
    }

    // Tabla GFM: fila de cabecera seguida de separador
    if (isTableRow(line) && i + 1 < lines.length && isTableDivider(lines[i + 1]!)) {
      flushAll();
      const headers = splitRow(line);
      i += 1; // consume el separador

      const body: string[][] = [];
      while (i + 1 < lines.length && isTableRow(lines[i + 1]!)) {
        i += 1;
        body.push(splitRow(lines[i]!));
      }

      const head = headers.map((h) => `<th>${inline(h)}</th>`).join("");
      const rows = body
        .map((cells) => `<tr>${cells.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
        .join("");
      out.push(`<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`);
      continue;
    }

    // Cita. Se busca `&gt;` porque el escape de HTML ya corrio sobre el texto.
    const quote = trimmed.match(/^&gt;\s?(.*)$/);
    if (quote) {
      flushAll();
      out.push(`<blockquote>${inline(quote[1]!)}</blockquote>`);
      continue;
    }

    // Listas
    const bullet = trimmed.match(/^[-*+]\s+(.*)$/);
    const numbered = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      flushParagraph();
      const tag = bullet ? "ul" : "ol";
      if (listTag && listTag !== tag) flushList();
      listTag = tag;
      listItems.push((bullet ? bullet[1] : numbered![1])!);
      continue;
    }

    // Parrafo: se acumula hasta la proxima linea en blanco
    flushList();
    paragraph.push(trimmed);
  }

  flushAll();
  return out.join("\n");
}
