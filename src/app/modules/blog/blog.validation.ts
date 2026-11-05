import type { NextFunction, Request, Response } from "express";
import RequestValidationError from "../../errors/requestValidationError";

export type CreateBlogInput = {
  title: string;
  content: string;
  featuredImage: string | null;
};

const allowedTags = new Set(["p", "br", "strong", "b", "em", "i", "u", "ol", "ul", "li", "a", "img"]);
const blogImagePath = /^\/uploads\/blogs\/[a-z0-9-]+\.(?:png|jpe?g|webp|gif)$/i;

function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sanitizeBlogHtml(html: string) {
  return html.split(/(<[^>]*>)/g).map((part) => {
    if (!part.startsWith("<")) return part;
    const tag = part.match(/^<\s*(\/?)\s*([a-z][a-z0-9]*)\b([^>]*)>$/i);
    if (!tag) return "";
    const isClosing = tag[1] === "/";
    const name = tag[2]!.toLowerCase();
    if (!allowedTags.has(name)) return "";
    if (name === "br") return isClosing ? "" : "<br>";
    if (name === "img") {
      if (isClosing) return "";
      const src = tag[3]!.match(/\bsrc\s*=\s*(["'])(.*?)\1/i)?.[2];
      if (!src || !blogImagePath.test(src)) return "";
      const alt = tag[3]!.match(/\balt\s*=\s*(["'])(.*?)\1/i)?.[2] || "Blog image";
      return '<img src="' + escapeAttribute(src) + '" alt="' + escapeAttribute(alt.slice(0, 200)) + '">';
    }
    if (isClosing) return "</" + name + ">";

    if (name === "a") {
      const hrefMatch = tag[3]!.match(/\bhref\s*=\s*(["'])(.*?)\1/i);
      if (!hrefMatch) return "<a>";
      const href = hrefMatch[2]!.replace(/&amp;/g, "&");
      try {
        const url = new URL(href, "https://blog.invalid");
        if (!["http:", "https:", "mailto:"].includes(url.protocol)) return "<a>";
        return '<a href="' + escapeAttribute(url.href) + '" rel="noopener noreferrer nofollow" target="_blank">';
      } catch {
        return "<a>";
      }
    }

    if (name === "li") {
      const listType = tag[3]!.match(/\bdata-list\s*=\s*(["'])(bullet|ordered)\1/i)?.[2]?.toLowerCase();
      return listType ? '<li data-list="' + listType + '">' : "<li>";
    }
    return "<" + name + ">";
  }).join("");
}

export function parseCreateBlog(input: unknown): CreateBlogInput {
  const body = input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {};
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const rawContent = typeof body.content === "string" ? body.content.trim() : "";
  const rawFeaturedImage = typeof body.featuredImage === "string" ? body.featuredImage.trim() : "";
  const content = sanitizeBlogHtml(rawContent);
  const textContent = content
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const errors: Record<string, string> = {};
  const imageCount = content.match(/<img\b/g)?.length || 0;
  if (imageCount > 12) errors.content = "A blog can contain at most 12 images";
  if (body.featuredImage !== undefined && body.featuredImage !== null && typeof body.featuredImage !== "string") {
    errors.featuredImage = "Featured image must be a valid uploaded image";
  } else if (rawFeaturedImage && !blogImagePath.test(rawFeaturedImage)) {
    errors.featuredImage = "Featured image must be a valid uploaded image";
  }

  if (title.length < 4 || title.length > 160) {
    errors.title = "Title must contain between 4 and 160 characters";
  }
  if (rawContent.length > 120000 || textContent.length < 30 || textContent.length > 30000) {
    errors.content = "Blog text must contain between 30 and 30000 characters";
  }
  if (Object.keys(errors).length) throw new RequestValidationError(errors);

  return { title, content, featuredImage: rawFeaturedImage || null };
}

export function validateCreateBlog(req: Request, _res: Response, next: NextFunction) {
  try {
    req.body = parseCreateBlog(req.body);
    next();
  } catch (error) {
    next(error);
  }
}