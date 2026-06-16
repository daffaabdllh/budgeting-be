import { Context } from "hono";
import { getAuthCookieBaseOptions, getAuthCookies } from "../config/auth";
import { deleteCookie, setCookie } from "hono/cookie";

export function setAuthCookies(
    c: Context,
    params: {
        accessToken: string;
        refreshToken: string;
        maxAgeRefresh: number;
    }
) {
    const cookieNames = getAuthCookies(c.env);
    const cookieOptions = getAuthCookieBaseOptions(c.env);

    const maxAgeAccess = Number(c.env.ACCESS_TOKEN_TTL);

    if (cookieNames.access) {
        setCookie(c, cookieNames.access, params.accessToken, {
            ...cookieOptions,
            path: "/",
            maxAge: maxAgeAccess,
        });
    }
    if (cookieNames.refresh) {
        setCookie(c, cookieNames.refresh, params.refreshToken, {
            ...cookieOptions,
            path: "/",
            maxAge: params.maxAgeRefresh,
        });
    }
}

export function clearAuthCookies(
    c: Context,
    params: {
        accessToken: string;
        refreshToken: string;
    }
) {
    const base = getAuthCookieBaseOptions(c.env);

    deleteCookie(c, params.accessToken, {
        ...base,
        path: "/",
    });

    deleteCookie(c, params.refreshToken, {
        ...base,
        path: "/",
    });
}