// Capability URL ProxyManager tests (run after `npx tsc`)
const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vj-proxy-"));
const storePath = path.join(tmpRoot, "proxies.json");

process.env.PROXY_STORE_PATH = storePath;
process.env.PROXY_TTL_MS = "1000"; // 1s for expiry tests

const ProxyManager = require("../dist/jellyfin/proxy/proxyManager").default;
const ProxyStore = require("../dist/jellyfin/proxy/proxyStore").default;

describe("ProxyManager capability URLs", () => {
    before(() => {
        ProxyManager.init(new ProxyStore(storePath));
    });

    beforeEach(() => {
        ProxyManager.proxies.clear();
        if (fs.existsSync(storePath)) fs.unlinkSync(storePath);
        ProxyManager.init(new ProxyStore(storePath));
    });

    after(() => {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
    });

    it("mints crypto-strong base64url ids (not Math.random short strings)", () => {
        const proxy = ProxyManager.createProxy("item-1");
        assert.match(proxy.id, /^[A-Za-z0-9_-]+$/);
        // 24 bytes base64url is typically 32 chars without padding
        assert.ok(proxy.id.length >= 32, `id length ${proxy.id.length}`);
        assert.notEqual(proxy.id, Math.random().toString(36).substring(2, 15));
    });

    it("persists across re-init (simulates restart)", () => {
        const proxy = ProxyManager.createProxy("item-persist", { subtitleStreamIndex: 2 });
        const id = proxy.id;
        assert.ok(fs.existsSync(storePath));

        ProxyManager.proxies.clear();
        ProxyManager.init(new ProxyStore(storePath));

        const loaded = ProxyManager.getProxy(id);
        assert.ok(loaded, "proxy should survive restart");
        assert.equal(loaded.itemId, "item-persist");
        assert.equal(loaded.options?.subtitleStreamIndex, 2);
    });

    it("returns undefined for unknown id", () => {
        assert.equal(ProxyManager.getProxy("does-not-exist"), undefined);
    });

    it("expires after PROXY_TTL_MS", async () => {
        const proxy = ProxyManager.createProxy("item-exp");
        const id = proxy.id;
        assert.ok(ProxyManager.getProxy(id));

        // Force createdAt into the past beyond TTL
        proxy.createdAt.setTime(Date.now() - ProxyManager.PROXY_TIMEOUT - 10);
        ProxyManager.proxies.set(id, proxy);

        assert.equal(ProxyManager.getProxy(id), undefined);
        assert.equal(ProxyManager.getProxy(id), undefined);
    });

    it("cleanProxies removes expired and persists", () => {
        const proxy = ProxyManager.createProxy("item-clean");
        proxy.createdAt.setTime(Date.now() - ProxyManager.PROXY_TIMEOUT - 50);
        ProxyManager.proxies.set(proxy.id, proxy);
        ProxyManager.cleanProxies();
        assert.equal(ProxyManager.proxies.size, 0);
        const disk = JSON.parse(fs.readFileSync(storePath, "utf8"));
        assert.equal(disk.length, 0);
    });
});
