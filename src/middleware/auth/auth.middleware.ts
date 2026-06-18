import { getCookie, setCookie } from "hono/cookie";
import { getAuthCookieBaseOptions, getAuthCookies } from "../../config/auth";
import { TokenManager } from "../../features/auth/auth.jwt";
import { HTTPException } from "hono/http-exception";
import { MiddlewareHandler } from "hono";
import { AppEnv } from "../../config/env";

export type AuthUser = {
    id: string;
    name: string;
    email: string;
    phone_number: string;
    salary_day?: number;
};

declare module "hono" {
    interface ContextVariableMap {
        user: AuthUser;
    }
}

export const isLoggedIn: MiddlewareHandler<AppEnv> = async (c, next) => {
    let accessToken = "";

    // 1. Try to read from cookie if configured
    const cookieNames = getAuthCookies(c.env);
    if (cookieNames.access) {
        accessToken = getCookie(c, cookieNames.access) || "";
    }

    // 2. Fallback to read from Authorization Header as bearer token
    if (!accessToken) {
        const authHeader = c.req.header("Authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
            accessToken = authHeader.substring(7);
        }
    }

    const tokenManager = new TokenManager(c.env);
    let decoded = accessToken ? await tokenManager.verifyAccessToken(accessToken) : null;

    if (!decoded) {
        // Access token is invalid or expired. Try to perform silent refresh using refresh token.
        let refreshToken = "";
        if (cookieNames.refresh) {
            refreshToken = getCookie(c, cookieNames.refresh) || "";
        }

        if (!refreshToken) {
            throw new HTTPException(401, { message: "Token akses tidak valid atau telah kedaluwarsa, dan token refresh tidak ditemukan." });
        }

        const decodedRefresh = await tokenManager.verifyRefreshToken(refreshToken);
        if (!decodedRefresh) {
            throw new HTTPException(401, { message: "Sesi Anda telah berakhir. Silakan masuk kembali." });
        }

        const decodedPayload = decodedRefresh as any;
        const newPayload = {
            id: decodedPayload.id,
            name: decodedPayload.name,
            email: decodedPayload.email,
            phone_number: decodedPayload.phone_number,
            salary_day: decodedPayload.salary_day
        };

        // Sign new access token
        const newAccessToken = await tokenManager.signAccessToken(newPayload);

        // Update the access token cookie automatically
        if (cookieNames.access) {
            const cookieOptions = getAuthCookieBaseOptions(c.env);
            setCookie(c, cookieNames.access, newAccessToken, {
                ...cookieOptions,
                path: "/",
                maxAge: Number(c.env.ACCESS_TOKEN_TTL),
            });
        }

        // Set response headers for frontend to catch and update (if they use Authorization headers instead of cookies)
        c.res.headers.set("X-New-Access-Token", newAccessToken);
        c.res.headers.append("Access-Control-Expose-Headers", "X-New-Access-Token");

        // Proceed with the new payload
        decoded = newPayload;
    }

    const decodedPayload = decoded as any;
    const userPayload: AuthUser = {
        id: decodedPayload.id,
        name: decodedPayload.name,
        email: decodedPayload.email,
        phone_number: decodedPayload.phone_number,
        salary_day: decodedPayload.salary_day
    };

    c.set("user", userPayload);

    await next();
};

export const isGuest: MiddlewareHandler<AppEnv> = async (c, next) => {
    let accessToken = "";

    // 1. Try to read from cookie if configured
    const cookieNames = getAuthCookies(c.env);
    if (cookieNames.access) {
        accessToken = getCookie(c, cookieNames.access) || "";
    }

    // 2. Fallback to read from Authorization Header as bearer token
    if (!accessToken) {
        const authHeader = c.req.header("Authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
            accessToken = authHeader.substring(7);
        }
    }

    if (accessToken) {
        const tokenManager = new TokenManager(c.env);
        const decoded = await tokenManager.verifyAccessToken(accessToken);

        if (decoded) {
            throw new HTTPException(400, { message: "Anda sudah masuk ke dalam sistem." });
        }
    }

    await next();
};