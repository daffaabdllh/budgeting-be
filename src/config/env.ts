import type { Context } from "hono";

export type Bindings = {
    // ── Environment Variables ─────────────────────────────────────────
    BASE_PATH: string;
    RESEND_API_KEY: string;
    FRONTEND_URL: string;

    // ── D1 Databases ──────────────────────────────────────────────────
    DB: D1Database;

    // ── R2 Buckets ────────────────────────────────────────────────────
    BUCKET: R2Bucket;

    // ── JWT Token ──────────────────────────────────────────────────
    ACCESS_TOKEN_SECRET: string;
    REFRESH_TOKEN_SECRET: string;
    ACCESS_TOKEN_TTL: string | number;
    ACCESS_TOKEN_COOKIE?: string;
    REFRESH_TOKEN_COOKIE?: string;
    NODE_ENV?: string;
    AUTH_COOKIE_REFRESH_PATH?: string;
    AUTH_COOKIE_SAMESITE?: string;
    AUTH_COOKIE_SECURE?: boolean | string;
    AUTH_COOKIE_DOMAIN?: string;
};

export type AppEnv = { Bindings: Bindings };
export type AppContext = Context<AppEnv>;
