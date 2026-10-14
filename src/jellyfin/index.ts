import JellyfinClient from "./client";

export const client = new JellyfinClient(process.env.JELLYFIN_HOST!, process.env.JELLYFIN_USERNAME!, process.env.JELLYFIN_PASSWORD!);

// Note: Authentication is now handled in the webserver startup
// This prevents the process from exiting on auth failure during development
console.log("Jellyfin client initialized - authentication will be handled by webserver");
