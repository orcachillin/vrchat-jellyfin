// src/jellyfin/proxy/proxy.ts

import { randomBytes } from "crypto";

/** 24 bytes = 192 bits entropy (W3C TAG capability-URL guidance: >= 120 bits). */
const CAPABILITY_ID_BYTES = 24;

export default class Proxy {
    public readonly id: string;
    public readonly createdAt: Date;

    constructor(
        public itemId: string,
        public options?: ProxyOptions,
        id?: string,
        createdAt?: Date,
    ) {
        this.id = id ?? randomBytes(CAPABILITY_ID_BYTES).toString("base64url");
        this.createdAt = createdAt ?? new Date();
    }
}

export interface ProxyOptions {
    audioBitrate?: number;
    videoBitrate?: number;
    height?: number;
    width?: number;
    audioChannels?: number;
    videoStreamIndex?: number;
    audioStreamIndex?: number;
    subtitleStreamIndex?: number;
    subtitleMethod?: SubtitleMethod;
}

export enum SubtitleMethod {
    Encode = "Encode",
    Embed = "Embed",
    External = "External",
    Hls = "Hls",
    Drop = "Drop",
}

export interface PersistedProxy {
    id: string;
    itemId: string;
    createdAt: string;
    options?: ProxyOptions;
}
