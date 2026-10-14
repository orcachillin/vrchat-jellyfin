// src/jellyfin/proxy/proxyManager.ts

import Proxy, { ProxyOptions, PersistedProxy } from "./proxy";
import ProxyStore from "./proxyStore";

export default class ProxyManager {
    public static proxies: Map<string, Proxy> = new Map();
    private static store: ProxyStore | null = null;
    private static cleanTimer: NodeJS.Timeout | null = null;

    private static readonly DEFAULT_TTL_MS = 1000 * 60 * 60 * 24;

    /** Default capability TTL: 24 hours. Override with PROXY_TTL_MS. */
    public static get PROXY_TIMEOUT(): number {
        const parsed = parseInt(process.env.PROXY_TTL_MS || "", 10);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            return ProxyManager.DEFAULT_TTL_MS;
        }
        return parsed;
    }

    public static init(store?: ProxyStore) {
        ProxyManager.store = store ?? ProxyStore.fromEnv();
        ProxyManager.proxies = new Map();

        for (const entry of ProxyManager.store.load()) {
            const proxy = ProxyManager.fromPersisted(entry);
            if (proxy && !ProxyManager.isExpired(proxy)) {
                ProxyManager.proxies.set(proxy.id, proxy);
            }
        }

        if (ProxyManager.cleanTimer) {
            clearInterval(ProxyManager.cleanTimer);
        }
        ProxyManager.cleanTimer = setInterval(ProxyManager.cleanProxies, 1000 * 60 * 60);
        // Avoid keeping the process alive solely for the cleaner in tests
        ProxyManager.cleanTimer.unref?.();

        ProxyManager.persist();
        console.log(`ProxyManager loaded ${ProxyManager.proxies.size} active capability URL(s)`);
    }

    public static createProxy(itemId: string, options?: ProxyOptions) {
        const proxy = new Proxy(itemId, options);
        ProxyManager.proxies.set(proxy.id, proxy);
        ProxyManager.persist();
        return proxy;
    }

    /** Returns proxy if present and not expired; deletes expired entries. */
    public static getProxy(id: string) {
        const proxy = ProxyManager.proxies.get(id);
        if (!proxy) {
            return undefined;
        }
        if (ProxyManager.isExpired(proxy)) {
            ProxyManager.deleteProxy(id);
            return undefined;
        }
        return proxy;
    }

    public static deleteProxy(id: string) {
        const deleted = ProxyManager.proxies.delete(id);
        if (deleted) {
            ProxyManager.persist();
        }
        return deleted;
    }

    public static getProxies() {
        return Array.from(ProxyManager.proxies.values());
    }

    public static cleanProxies() {
        let removed = 0;
        ProxyManager.proxies.forEach((proxy) => {
            if (ProxyManager.isExpired(proxy)) {
                ProxyManager.proxies.delete(proxy.id);
                removed++;
            }
        });
        if (removed > 0) {
            ProxyManager.persist();
        }
    }

    public static isExpired(proxy: Proxy, now: Date = new Date()): boolean {
        return now.getTime() - proxy.createdAt.getTime() > ProxyManager.PROXY_TIMEOUT;
    }

    private static persist() {
        if (!ProxyManager.store) {
            return;
        }
        const entries: PersistedProxy[] = Array.from(ProxyManager.proxies.values()).map((p) => ({
            id: p.id,
            itemId: p.itemId,
            createdAt: p.createdAt.toISOString(),
            options: p.options,
        }));
        try {
            ProxyManager.store.save(entries);
        } catch (err) {
            console.error("Failed to persist proxy store:", err);
        }
    }

    private static fromPersisted(entry: PersistedProxy): Proxy | null {
        if (!entry?.id || !entry?.itemId || !entry?.createdAt) {
            return null;
        }
        const createdAt = new Date(entry.createdAt);
        if (Number.isNaN(createdAt.getTime())) {
            return null;
        }
        return new Proxy(entry.itemId, entry.options, entry.id, createdAt);
    }
}
