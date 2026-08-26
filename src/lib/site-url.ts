const DEFAULT_SITE_URL = "https://elysiancelebrations.com";

/**
 * Resolve the canonical site origin.
 *
 * `NEXT_PUBLIC_SITE_URL` is read at module scope by metadata, robots and
 * sitemap. Passing it straight to `new URL()` means a value that is not an
 * absolute URL — "example.com" with no protocol, or a stray quote — throws
 * during `next build` while collecting page data, and the whole deployment
 * fails. An environment variable is operator input, so it is validated here
 * and falls back to the default rather than taking the build down.
 */
export function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (!raw) return DEFAULT_SITE_URL;

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      console.warn(
        `NEXT_PUBLIC_SITE_URL must use http or https. Falling back to ${DEFAULT_SITE_URL}.`
      );
      return DEFAULT_SITE_URL;
    }
    return raw;
  } catch {
    console.warn(
      `NEXT_PUBLIC_SITE_URL is not an absolute URL. Falling back to ${DEFAULT_SITE_URL}.`
    );
    return DEFAULT_SITE_URL;
  }
}
