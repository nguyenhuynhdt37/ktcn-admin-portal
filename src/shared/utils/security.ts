import sanitizeHtml from "sanitize-html";

function hasUnsafeControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

function extractNormalizedScheme(value: string): string | undefined {
  return Array.from(value)
    .filter((char) => char.charCodeAt(0) > 32 && char.charCodeAt(0) !== 127)
    .join("")
    .match(/^([a-z][a-z0-9+.-]*):/i)?.[1]
    ?.toLowerCase();
}

/** Sanitize at every raw HTML rendering boundary, including AI and CMS previews. */
export function sanitizeRichHtml(value: string | null | undefined): string {
  return sanitizeHtml(value ?? "", {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "img", "iframe", "video", "audio", "source"],
    allowedAttributes: {
      "*": ["id", "class", "title", "style"],
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "width", "height", "loading"],
      iframe: ["src", "width", "height", "allowfullscreen", "title"],
      video: ["src", "controls", "poster", "width", "height"],
      audio: ["src", "controls"],
      source: ["src", "type"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan", "scope"],
      col: ["span", "width"],
    },
    allowedSchemes: ["https", "http", "mailto", "tel"],
    allowProtocolRelative: false,
    allowedIframeHostnames: ["www.youtube.com", "www.youtube-nocookie.com", "player.vimeo.com"],
    transformTags: {
      a: (tagName, attribs) => {
        if (attribs.target === "_blank") {
          const tokens = new Set(
            (attribs.rel ?? "")
              .split(/\s+/)
              .map((token) => token.trim().toLowerCase())
              .filter(Boolean)
          );
          tokens.add("noopener");
          tokens.add("noreferrer");
          return {
            tagName,
            attribs: { ...attribs, rel: Array.from(tokens).join(" ") },
          };
        }
        return { tagName, attribs };
      },
    },
    allowedStyles: {
      "*": {
        "text-align": [/^(left|right|center|justify)$/],
        color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i, /^[a-z]+$/i],
        "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i, /^[a-z]+$/i],
        "font-size": [/^\d+(\.\d+)?(px|pt|em|rem|%)$/],
        "font-weight": [/^(normal|bold|[1-9]00)$/],
        "font-style": [/^(normal|italic)$/],
        "text-decoration": [/^(none|underline|line-through)$/],
        width: [/^\d+(\.\d+)?(px|pt|em|rem|%)$/],
        height: [/^\d+(\.\d+)?(px|pt|em|rem|%)$/],
      },
    },
    nestingLimit: 100,
  });
}

/**
 * Sanitize link hrefs before binding to `<a href>`.
 * Allows safe relative paths (`/foo`, `#hash`, `?query`) and `http/https/mailto/tel`.
 * Blocks `javascript:`, `data:`, control-character bypasses, and protocol-relative `//` URLs.
 */
export function sanitizeHref(value?: string | null, fallback = "#"): string {
  const href = (value ?? "").trim();
  if (!href || hasUnsafeControlChars(href)) return fallback;
  if (href.startsWith("//") || href.startsWith("/\\") || href.startsWith("\\")) {
    return fallback;
  }
  const scheme = extractNormalizedScheme(href);
  if (!scheme) {
    if (href.startsWith("/") || href.startsWith("#") || href.startsWith("?")) {
      return href;
    }
    return isValidWebsiteUrl(href) ? `https://${href}` : fallback;
  }
  return /^(https?|mailto|tel)$/.test(scheme) ? href : fallback;
}

/**
 * Sanitize external website URLs (e.g. `website`, `link_url`) for safe external navigation.
 * Returns `null` if unsafe or empty.
 */
export function toSafeExternalHref(value?: string | null): string | null {
  const href = (value ?? "").trim();
  if (!href || hasUnsafeControlChars(href)) return null;
  if (href.startsWith("//") || href.startsWith("/\\") || href.startsWith("\\")) {
    return null;
  }
  const scheme = extractNormalizedScheme(href);
  if (!scheme) {
    if (href.startsWith("/")) return href;
    return isValidWebsiteUrl(href) ? `https://${href}` : null;
  }
  if (scheme !== "http" && scheme !== "https") return null;
  try {
    const parsed = new URL(href);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? href : null;
  } catch {
    return null;
  }
}

/**
 * Validate internal navigation targets (login redirects, notification `related_url`)
 * to prevent open redirects via `//evil.com` or external URLs.
 */
export function toSafeInternalPath(value?: string | null, fallback = "/"): string {
  const path = (value ?? "").trim();
  if (!path || hasUnsafeControlChars(path)) return fallback;
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return fallback;
  }
  return path;
}

const HOST_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

/**
 * ReDoS-safe website URL validator supporting optional `http(s)://`, subdomains, ports, and query strings.
 */
export function isValidWebsiteUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 255) return false;
  if (hasUnsafeControlChars(trimmed) || /\s/.test(trimmed)) return false;
  if (trimmed.startsWith("//") || trimmed.startsWith("/")) return false;

  const scheme = extractNormalizedScheme(trimmed);
  if (scheme && scheme !== "http" && scheme !== "https") return false;

  const candidate = scheme ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const labels = parsed.hostname.split(".");
    if (labels.length < 2) return false;
    const tld = labels[labels.length - 1];
    if (!tld || !(/^[a-z]{2,24}$/i.test(tld) || /^xn--[a-z0-9]{2,}$/i.test(tld))) {
      return false;
    }
    return labels.every((label) => HOST_LABEL_RE.test(label));
  } catch {
    return false;
  }
}

/**
 * Client-side image file guard: checks MIME type, rejects SVG unless explicitly allowed, and caps size.
 */
export function validateImageFile(
  file: Pick<File, "type" | "size" | "name">,
  options: { maxSizeMb?: number; allowSvg?: boolean } = {}
): string | null {
  const maxSizeMb = options.maxSizeMb ?? 5;
  const allowSvg = options.allowSvg ?? false;
  const normalizedType = (file.type || "").toLowerCase();
  const normalizedName = (file.name || "").toLowerCase();

  if (!normalizedType.startsWith("image/")) {
    return "Vui lòng chọn tệp hình ảnh hợp lệ.";
  }
  if (!allowSvg && (normalizedType === "image/svg+xml" || normalizedName.endsWith(".svg"))) {
    return "Không hỗ trợ tải tệp SVG tại mục này.";
  }
  if (file.size > maxSizeMb * 1024 * 1024) {
    return `Dung lượng ảnh không được vượt quá ${maxSizeMb}MB.`;
  }
  return null;
}
