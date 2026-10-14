// src/webserver/index.ts

import express from "express";
import http from "http";
import ProxyManager from "../jellyfin/proxy/proxyManager";
import { client } from "../jellyfin";
import { ProxyOptions, SubtitleMethod } from "../jellyfin/proxy/proxy";
import { isAllowedImageType, sanitizeImageQuery } from "../jellyfin/imageUrl";

const app = express();

let jellyfinReady = false;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/assets", express.static("dist/client"));

function requireJellyfin(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (!jellyfinReady) {
        res.status(503).json({ error: "Jellyfin authentication not ready; retry shortly." });
        return;
    }
    next();
}

// Serve the index.html file from the correct directory
app.get("/", (req, res) => {
    res.sendFile("index.html", { root: "dist/client" });
});

app.get("/healthz", (_req, res) => {
    res.json({ ok: true, jellyfinReady });
});

// Legacy endpoint - keep for backward compatibility
app.get("/i", requireJellyfin, async (req, res) => {
    const items = await client.getPlayableMedia();
    res.json(items);
});

// New modern UI endpoints
app.get("/libraries", requireJellyfin, async (req, res) => {
    try {
        const libraries = await client.getLibraries();
        res.json(libraries);
    } catch (error) {
        console.error("Error fetching libraries:", error);
        res.status(500).json({ error: "Failed to fetch libraries" });
    }
});

app.get("/libraries/:libraryId/items", requireJellyfin, async (req, res) => {
    try {
        const { libraryId } = req.params;
        const { search, limit = "50", offset = "0" } = req.query;
        const items = await client.getLibraryItems(
            libraryId,
            search as string,
            parseInt(limit as string),
            parseInt(offset as string),
        );
        res.json(items);
    } catch (error) {
        console.error("Error fetching library items:", error);
        res.status(500).json({ error: "Failed to fetch library items" });
    }
});

app.get("/tvshows/:showId/seasons", requireJellyfin, async (req, res) => {
    try {
        const { showId } = req.params;
        const seasons = await client.getTVShowSeasons(showId);
        res.json(seasons);
    } catch (error) {
        console.error("Error fetching TV show seasons:", error);
        res.status(500).json({ error: "Failed to fetch seasons" });
    }
});

app.get("/seasons/:seasonId/episodes", requireJellyfin, async (req, res) => {
    try {
        const { seasonId } = req.params;
        const episodes = await client.getSeasonEpisodes(seasonId);
        res.json(episodes);
    } catch (error) {
        console.error("Error fetching season episodes:", error);
        res.status(500).json({ error: "Failed to fetch episodes" });
    }
});

app.get("/items/:itemId/details", requireJellyfin, async (req, res) => {
    try {
        const { itemId } = req.params;
        const details = await client.getItemDetails(itemId);
        if (!details) {
            return res.status(404).json({ error: "Item not found" });
        }
        res.json(details);
    } catch (error) {
        console.error("Error fetching item details:", error);
        res.status(500).json({ error: "Failed to fetch item details" });
    }
});

// Mint capability stream URL (gate this UI behind your auth proxy; leave /v/* open for VR clients).
// Auth lifecycle: token is the capability; after PROXY_TTL_MS expiry there is no refresh —
// operator must re-mint via this endpoint. See docs/capability-urls.md.
app.post("/i/:id", requireJellyfin, async (req, res) => {
    const itemId = req.params.id;
    const { subtitleStreamIndex } = req.body;

    const proxyOptions: ProxyOptions = {};

    if (subtitleStreamIndex != null) {
        proxyOptions.subtitleStreamIndex = subtitleStreamIndex;
        proxyOptions.subtitleMethod = SubtitleMethod.Encode;
    }

    const proxy = ProxyManager.createProxy(itemId, proxyOptions);
    res.json({
        id: proxy.id,
        expiresAt: new Date(proxy.createdAt.getTime() + ProxyManager.PROXY_TIMEOUT).toISOString(),
    });
});

// Proxy Jellyfin artwork. Browser only ever sees /img/... — api_key stays server-side.
app.get("/img/:itemId", requireJellyfin, async (req, res) => {
    const { itemId } = req.params;
    if (!itemId || itemId.includes("..") || itemId.includes("/")) {
        res.status(400).send("Invalid item id");
        return;
    }

    const sanitized = sanitizeImageQuery(req.query as Record<string, unknown>);
    if (!sanitized || !isAllowedImageType(sanitized.imageType)) {
        res.status(400).send("Invalid image type or query");
        return;
    }

    try {
        const response = await client.getItemImage(itemId, sanitized.imageType, {
            tag: sanitized.tag,
            maxWidth: sanitized.maxWidth,
            maxHeight: sanitized.maxHeight,
        });

        if (!response.ok || !response.body) {
            res.status(response.status === 404 ? 404 : 502).send("Image unavailable");
            return;
        }

        const contentType = response.headers.get("content-type");
        const cacheControl = response.headers.get("cache-control");
        const etag = response.headers.get("etag");
        if (contentType) res.setHeader("Content-Type", contentType);
        if (etag) res.setHeader("ETag", etag);
        res.setHeader("Cache-Control", cacheControl || "public, max-age=86400");

        response.body.pipe(res);
    } catch (err) {
        console.error("Error in /img/:itemId route:", err);
        res.status(500).send("Internal server error while proxying image");
    }
});

// Endpoint to fetch subtitle streams
app.get("/subtitles/:itemId", requireJellyfin, async (req, res) => {
    const itemId = req.params.itemId;
    try {
        const subtitleStreams = await client.getSubtitleStreams(itemId);
        res.json({ subtitleStreams });
    } catch (error) {
        console.error("Error fetching subtitle streams:", error);
        res.status(500).json({ error: "Failed to fetch subtitle streams." });
    }
});

// Bare GET for VRChat (no cookies). Capability id in the path is the secret.
// Do not gate on jellyfinReady here: a valid persisted capability must not become
// 503 during auth retry after restart (VRChat needs a stream, not JSON).
app.get("/v/:id", async (req, res) => {
    const proxy = ProxyManager.getProxy(req.params.id);

    if (!proxy) {
        res.status(404).send("Proxy not found or expired. Mint a new URL from the UI.");
        return;
    }

    if (!jellyfinReady) {
        res.status(503).send("Jellyfin authentication not ready; retry shortly.");
        return;
    }

    const itemId = proxy.itemId;
    const options = proxy.options;

    try {
        const response = await client.getVideoStream(itemId!, options);
        if (!response.ok || !response.body) {
            const errorText = await response.text();
            console.error(`Jellyfin stream fetch failed:`, {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                bodySnippet: errorText.slice(0, 200),
            });
            res.status(502).send("Failed to fetch video stream from Jellyfin.");
            return;
        }
        for (const [key, value] of response.headers.entries()) {
            if (key.toLowerCase() === "transfer-encoding") continue;
            res.setHeader(key, value);
        }
        response.body.pipe(res);
        console.log(`Piping stream to client with options:`, options);
    } catch (err) {
        console.error("Error in /v/:id route:", err);
        res.status(500).send("Internal server error while proxying video stream.");
    }
});

async function authenticateWithRetry() {
    const maxAttempts = parseInt(process.env.JELLYFIN_AUTH_RETRIES || "30", 10);
    const delayMs = parseInt(process.env.JELLYFIN_AUTH_RETRY_MS || "5000", 10);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const success = await client.authenticate();
        if (success) {
            jellyfinReady = true;
            console.log("Jellyfin authentication ready");
            return;
        }
        console.error(
            `Jellyfin auth failed (attempt ${attempt}/${maxAttempts}); retrying in ${delayMs}ms`,
        );
        await new Promise((r) => setTimeout(r, delayMs));
    }
    console.error("Jellyfin authentication exhausted retries; API routes will stay 503");
}

ProxyManager.init();

console.log("Starting VRChat Jellyfin server...");

const server = http.createServer(app);
const port = parseInt(process.env.WEBSERVER_PORT || "4000");

server.listen(port, () => {
    console.log(`Webserver listening on port ${port}`);
    void authenticateWithRetry();
});

server.on("error", (error) => {
    console.error("Server error:", error);
    process.exit(1);
});
