// lib/products/description.ts
//
// Product descriptions come from Shopify as HTML. This keeps only simple formatting
// tags (paragraphs, lists, bold, headings, tables, safe links) and drops every other tag,
// every attribute (except a safe href) and any script/style content, so the HTML can be
// rendered on the product page without running anything. Client-safe, no DOM needed.

const ALLOWED = new Set([
  "p", "br", "ul", "ol", "li", "strong", "b", "em", "i", "u", "span", "div",
  "h2", "h3", "h4", "h5", "h6", "blockquote", "hr",
  "table", "thead", "tbody", "tr", "th", "td",
  "a",
]);
const VOID = new Set(["br", "hr"]);
const DROP_WITH_CONTENT = /<(script|style|iframe|object|embed|noscript|template|svg|math|form|select|textarea)\b[\s\S]*?<\/\1\s*>/gi;

const escapeText = (s: string) => s.replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A link target that is safe to keep: http(s), mailto, tel, or a site-relative path. */
function safeHref(raw: string): string | null {
  const href = raw.trim().replace(/&amp;/g, "&");
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  return null;
}

function hrefOf(attrs: string): string | null {
  const m = attrs.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
  if (!m) return null;
  return safeHref(m[2] ?? m[3] ?? m[4] ?? "");
}

const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** Sanitised description HTML, or "" when there is nothing to show. */
export function sanitizeDescriptionHtml(html: string | null | undefined): string {
  if (!html) return "";
  const cleaned = String(html)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(DROP_WITH_CONTENT, "");
  // Unclosed dangerous tags (e.g. "<script>" with no end) lose everything after them.
  const cut = cleaned.search(/<(script|style|iframe|object|embed)\b/i);
  const input = cut >= 0 ? cleaned.slice(0, cut) : cleaned;

  let out = "";
  const tag = /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)([^<>]*)>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(input))) {
    out += escapeText(input.slice(last, m.index));
    last = tag.lastIndex;
    const closing = m[1] === "/";
    const name = m[2].toLowerCase();
    if (!ALLOWED.has(name)) continue;
    if (closing) {
      if (!VOID.has(name)) out += `</${name}>`;
      continue;
    }
    if (name === "a") {
      const href = hrefOf(m[3]);
      out += href
        ? `<a href="${escapeAttr(href)}" rel="noopener noreferrer nofollow"${/^https?:/i.test(href) ? ' target="_blank"' : ""}>`
        : "<a>";
      continue;
    }
    out += `<${name}>`;
  }
  out += escapeText(input.slice(last));
  return hasText(out) ? out.trim() : "";
}

/** True when the HTML contains visible text. */
export function hasText(html: string | null | undefined): boolean {
  return !!html && html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length > 0;
}
