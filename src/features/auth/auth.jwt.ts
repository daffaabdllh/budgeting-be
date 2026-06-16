// src/utils/auth.jwt.ts
import { sign, verify } from "hono/jwt";
import type { CloudflareEnv } from "../../config/auth"; // Sesuaikan path import auth Anda

// Helper tetap sama, menerima nilai ttl detik secara dinamis
const expFromTtl = (ttl: number) => Math.floor(Date.now() / 1000) + ttl;

export class TokenManager {
    private accessTokenSecret: string;
    private refreshTokenSecret: string;
    private accessTokenTtl: number;

    // Terima env utuh yang tipenya sudah Anda buat di auth.ts
    constructor(env: CloudflareEnv) {
        if (!env) {
            throw new Error("Cloudflare environment bindings are missing.");
        }
        if (!env.ACCESS_TOKEN_SECRET) {
            throw new Error("ACCESS_TOKEN_SECRET is not defined in the environment bindings. Please check your .dev.vars or Wrangler config.");
        }
        if (!env.REFRESH_TOKEN_SECRET) {
            throw new Error("REFRESH_TOKEN_SECRET is not defined in the environment bindings. Please check your .dev.vars or Wrangler config.");
        }
        if (env.ACCESS_TOKEN_TTL === undefined || env.ACCESS_TOKEN_TTL === null || isNaN(Number(env.ACCESS_TOKEN_TTL))) {
            throw new Error("ACCESS_TOKEN_TTL is not defined or invalid in the environment bindings.");
        }

        this.accessTokenSecret = env.ACCESS_TOKEN_SECRET;
        this.refreshTokenSecret = env.REFRESH_TOKEN_SECRET;

        // Konversi ke number untuk memastikan tipenya aman saat dikalkulasi
        this.accessTokenTtl = Number(env.ACCESS_TOKEN_TTL);
    }

    async signAccessToken(payload: any): Promise<string> {
        // Menggunakan TTL dinamis dari env Cloudflare
        const exp = expFromTtl(this.accessTokenTtl);
        return await sign({ ...payload, exp }, this.accessTokenSecret);
    }

    async signRefreshToken(payload: any, ttl: number): Promise<string> {
        // Menggunakan TTL dinamis dari env Cloudflare
        const exp = expFromTtl(ttl);
        return await sign({ ...payload, exp }, this.refreshTokenSecret);
    }

    async verifyAccessToken(token: string) {
        try {
            return await verify(token, this.accessTokenSecret, "HS256");
        } catch {
            return null;
        }
    }

    async verifyRefreshToken(token: string) {
        try {
            return await verify(token, this.refreshTokenSecret, "HS256");
        } catch {
            return null;
        }
    }
}