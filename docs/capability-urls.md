# Capability stream URLs

Public `/v/:id` links are **capability URLs** (W3C TAG finding): possession of the URL is authorization to stream that item until expiry. That model fits VRChat and similar clients that can only do a bare HTTPS GET (no cookies, no OAuth dance on the video player).

If you put this app behind an auth proxy (Cloudflare Access, Authelia, basic auth, etc.), keep `/v/*` reachable by the VR clients while gating the browse/mint UI.

## Auth lifecycle

| Layer | What | Lifetime | After expiry |
|-------|------|----------|--------------|
| Capability id | Path segment `/v/{id}` (192-bit `crypto.randomBytes` / base64url) | `PROXY_TTL_MS` (default 24h) | **No refresh.** Re-mint via `POST /i/:id` in the UI. |
| Jellyfin session | Server-side SDK token used when proxying | Managed by this process | Retried on startup; mint/stream return 503 until ready |

HMAC query params are **not** required: the path token already has high entropy. Optional HMAC would lengthen VRChat-pasted URLs without materially reducing enumeration risk.

## Persistence

- File: `PROXY_STORE_PATH` (default `./data/proxies.json`)
- Survives process restart within TTL
- Mount a volume in compose so container recreates do not drop active links

## Operator env

```
PROXY_STORE_PATH=/data/proxies.json
PROXY_TTL_MS=86400000
JELLYFIN_AUTH_RETRIES=30
JELLYFIN_AUTH_RETRY_MS=5000
```
