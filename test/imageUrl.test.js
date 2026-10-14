// Public image URL helpers (run after `npx tsc`)
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
    buildPublicImageUrl,
    buildUpstreamImageUrl,
    isAllowedImageType,
    sanitizeImageQuery,
} = require("../dist/jellyfin/imageUrl");

describe("image URL helpers (no client-visible secrets)", () => {
    it("buildPublicImageUrl returns app-relative /img path without api_key or host", () => {
        const url = buildPublicImageUrl("abc123", "Primary", {
            tag: "tag1",
            maxWidth: 300,
            maxHeight: 450,
        });
        assert.ok(url.startsWith("/img/abc123?"), url);
        assert.equal(url.includes("api_key"), false);
        assert.equal(url.includes("jellyfin"), false);
        assert.equal(url.includes("8096"), false);
        assert.match(url, /type=Primary/);
        assert.match(url, /tag=tag1/);
        assert.match(url, /maxWidth=300/);
        assert.match(url, /maxHeight=450/);
    });

    it("buildPublicImageUrl returns null when itemId empty", () => {
        assert.equal(buildPublicImageUrl("", "Primary"), null);
    });

    it("buildPublicImageUrl rejects disallowed image types", () => {
        assert.equal(buildPublicImageUrl("abc", "../etc"), null);
        assert.equal(buildPublicImageUrl("abc", "NotAType"), null);
    });

    it("buildUpstreamImageUrl puts api_key only on server-side Jellyfin URL", () => {
        const url = buildUpstreamImageUrl("http://jellyfin:8096", "item1", "Primary", "SECRET", {
            tag: "t",
            maxWidth: 300,
            maxHeight: 450,
        });
        assert.ok(url.startsWith("http://jellyfin:8096/Items/item1/Images/Primary?"));
        assert.match(url, /api_key=SECRET/);
        assert.match(url, /tag=t/);
    });

    it("isAllowedImageType allowlists Jellyfin image types", () => {
        assert.equal(isAllowedImageType("Primary"), true);
        assert.equal(isAllowedImageType("Thumb"), true);
        assert.equal(isAllowedImageType("primary"), false);
        assert.equal(isAllowedImageType(""), false);
    });

    it("sanitizeImageQuery clamps dimensions and drops junk", () => {
        const q = sanitizeImageQuery({
            type: "Primary",
            tag: "ok",
            maxWidth: "99999",
            maxHeight: "abc",
            evil: "1",
        });
        assert.equal(q.imageType, "Primary");
        assert.equal(q.tag, "ok");
        assert.equal(q.maxWidth, 2048);
        assert.equal(q.maxHeight, 450); // invalid height falls back to default
        assert.equal("evil" in q, false);
    });

    it("sanitizeImageQuery defaults dimensions when omitted", () => {
        const q = sanitizeImageQuery({ type: "Primary" });
        assert.equal(q.maxWidth, 300);
        assert.equal(q.maxHeight, 450);
    });
});
