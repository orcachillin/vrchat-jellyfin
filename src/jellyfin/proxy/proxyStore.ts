// src/jellyfin/proxy/proxyStore.ts

import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "fs";
import { dirname } from "path";
import { PersistedProxy } from "./proxy";

/**
 * Atomic JSON persistence for capability proxies.
 * Path defaults to PROXY_STORE_PATH or ./data/proxies.json.
 */
export default class ProxyStore {
    constructor(public readonly filePath: string) {}

    static fromEnv(): ProxyStore {
        const filePath = process.env.PROXY_STORE_PATH || "./data/proxies.json";
        return new ProxyStore(filePath);
    }

    load(): PersistedProxy[] {
        if (!existsSync(this.filePath)) {
            return [];
        }
        try {
            const raw = readFileSync(this.filePath, "utf8");
            const parsed = JSON.parse(raw) as unknown;
            if (!Array.isArray(parsed)) {
                console.error("Proxy store is not an array; starting empty:", this.filePath);
                return [];
            }
            return parsed as PersistedProxy[];
        } catch (err) {
            console.error("Failed to load proxy store; starting empty:", err);
            return [];
        }
    }

    save(entries: PersistedProxy[]): void {
        const dir = dirname(this.filePath);
        mkdirSync(dir, { recursive: true });
        const tmp = `${this.filePath}.${process.pid}.tmp`;
        writeFileSync(tmp, JSON.stringify(entries, null, 0), "utf8");
        renameSync(tmp, this.filePath);
    }
}
