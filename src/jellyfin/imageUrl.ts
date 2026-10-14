// Public (browser-safe) and upstream Jellyfin image URL helpers.

export const ALLOWED_IMAGE_TYPES = new Set([
    "Primary",
    "Art",
    "Backdrop",
    "Banner",
    "Logo",
    "Thumb",
    "Disc",
    "Box",
    "Screenshot",
    "Menu",
    "Chapter",
    "BoxRear",
    "Profile",
]);

export const DEFAULT_MAX_WIDTH = 300;
export const DEFAULT_MAX_HEIGHT = 450;
const MAX_DIMENSION = 2048;

export function isAllowedImageType(imageType: string): boolean {
    return ALLOWED_IMAGE_TYPES.has(imageType);
}

export interface ImageUrlOptions {
    tag?: string;
    maxWidth?: number;
    maxHeight?: number;
}

export interface SanitizedImageQuery {
    imageType: string;
    tag?: string;
    maxWidth?: number;
    maxHeight?: number;
}

/** Browser-facing path: never includes Jellyfin host or api_key. */
export function buildPublicImageUrl(
    itemId: string,
    imageType: string,
    options: ImageUrlOptions = {},
): string | null {
    if (!itemId || !isAllowedImageType(imageType)) {
        return null;
    }

    const params = new URLSearchParams();
    params.set("type", imageType);
    if (options.tag) {
        params.set("tag", options.tag);
    }
    const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;
    const maxHeight = options.maxHeight ?? DEFAULT_MAX_HEIGHT;
    params.set("maxWidth", String(maxWidth));
    params.set("maxHeight", String(maxHeight));

    return `/img/${encodeURIComponent(itemId)}?${params.toString()}`;
}

/** Server-only upstream URL; api_key stays off the wire to browsers. */
export function buildUpstreamImageUrl(
    serverUrl: string,
    itemId: string,
    imageType: string,
    apiKey: string,
    options: ImageUrlOptions = {},
): string {
    const base = serverUrl.replace(/\/+$/, "");
    const url = new URL(`${base}/Items/${encodeURIComponent(itemId)}/Images/${encodeURIComponent(imageType)}`);
    url.searchParams.set("api_key", apiKey);
    if (options.tag) {
        url.searchParams.set("tag", options.tag);
    }
    if (options.maxWidth != null) {
        url.searchParams.set("maxWidth", String(options.maxWidth));
    }
    if (options.maxHeight != null) {
        url.searchParams.set("maxHeight", String(options.maxHeight));
    }
    return url.toString();
}

function parseClampedInt(value: unknown, max: number = MAX_DIMENSION): number | undefined {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }
    const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
    if (!Number.isFinite(n) || n < 1) {
        return undefined;
    }
    return Math.min(Math.floor(n), max);
}

/** Parse and clamp query params for GET /img/:itemId */
export function sanitizeImageQuery(query: Record<string, unknown>): SanitizedImageQuery | null {
    const rawType = typeof query.type === "string" ? query.type : "Primary";
    if (!isAllowedImageType(rawType)) {
        return null;
    }

    const tag = typeof query.tag === "string" && query.tag.length > 0
        ? query.tag.slice(0, 128)
        : undefined;

    return {
        imageType: rawType,
        tag,
        maxWidth: parseClampedInt(query.maxWidth) ?? DEFAULT_MAX_WIDTH,
        maxHeight: parseClampedInt(query.maxHeight) ?? DEFAULT_MAX_HEIGHT,
    };
}
