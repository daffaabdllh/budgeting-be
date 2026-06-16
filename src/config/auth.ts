// src/config/auth.ts

// Tipe data Env Cloudflare Anda (sesuaikan dengan wrangler.toml)
export type CloudflareEnv = {
    ACCESS_TOKEN_SECRET: string;
    ACCESS_TOKEN_TTL: string | number;
    REFRESH_TOKEN_SECRET: string;
    NODE_ENV?: string;
    ACCESS_TOKEN_COOKIE?: string;
    REFRESH_TOKEN_COOKIE?: string;
    AUTH_COOKIE_REFRESH_PATH?: string;
    AUTH_COOKIE_SAMESITE?: string;
    AUTH_COOKIE_SECURE?: boolean | string;
    AUTH_COOKIE_DOMAIN?: string;
};

export type SameSite = "Strict" | "Lax" | "None";

export type CookieBaseOptions = {
    httpOnly: true;
    secure: boolean;
    sameSite: SameSite;
    domain?: string;
};

// Ubah menjadi fungsi yang menerima `env`
export const getAuthCookies = (env: CloudflareEnv) => ({
    access: env.ACCESS_TOKEN_COOKIE,
    refresh: env.REFRESH_TOKEN_COOKIE,
});

function isProd(env: CloudflareEnv) {
    return env.NODE_ENV === "production";
}

function resolveSameSite(env: CloudflareEnv): SameSite {
    const v = (env.AUTH_COOKIE_SAMESITE || "lax").toLowerCase();
    if (v === "none") return "None";
    if (v === "strict") return "Strict";
    return "Lax";
}

function resolveSecure(env: CloudflareEnv, sameSite: SameSite) {
    if (sameSite === "None") return true;
    const secureVal = env.AUTH_COOKIE_SECURE;
    if (typeof secureVal === "string") {
        return secureVal === "true";
    }
    return secureVal ?? isProd(env);
}

// Fungsi utama yang akan dipanggil di Router/Service
export function getAuthCookieBaseOptions(env: CloudflareEnv): CookieBaseOptions {
    const sameSite = resolveSameSite(env);
    const secure = resolveSecure(env, sameSite);
    const domain = env.AUTH_COOKIE_DOMAIN || undefined;

    return {
        httpOnly: true,
        secure,
        sameSite,
        domain,
    };
}