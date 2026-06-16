import { Hono } from "hono";
import { AppEnv } from "../../config/env";
import { apiMiddleware } from "../../middleware/api/api.middleware";
import { zValidator } from "../../middleware/api/api.validationError";
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from "./auth.schema";
import { db } from "../../config/db"
import { getUserLogin, register, createPasswordResetToken, resetUserPassword } from "./auth.service";
import { TokenManager } from "./auth.jwt";
import { clearAuthCookies, setAuthCookies } from "../../lib/auth.cookie";
import { sendEmail } from "../../lib/email";
import { isGuest, isLoggedIn } from "../../middleware/auth/auth.middleware";
import { getAuthCookies } from "../../config/auth";

export const authRoutes = new Hono<AppEnv>()
    .use(apiMiddleware)
    .post("/register", isGuest, zValidator("json", registerSchema), async (c) => {
        const body = c.req.valid("json")

        const result = await register(db(c.env.DB), body)

        return c.api.success(result, "Success register new account, please login.")
    })
    .post("/login", isGuest, zValidator("json", loginSchema), async (c) => {
        const body = c.req.valid("json")

        const result = await getUserLogin(db(c.env.DB), body)

        const tokenManager = new TokenManager(c.env)

        const payload = {
            id: result.id,
            name: result.name,
            email: result.email,
            phone_number: result.phone_number
        }

        const refreshAge = 3600 * 24
        const maxAgeRefresh = body.remember_me ? refreshAge * 7 : refreshAge;

        const accessToken = await tokenManager.signAccessToken(payload)
        const refreshToken = await tokenManager.signRefreshToken({ ...payload, remember_me: body.remember_me }, maxAgeRefresh)
        setAuthCookies(c, { accessToken, refreshToken, maxAgeRefresh })

        return c.api.success(payload, "Login berhasil");
    })
    .get("/userinfo", isLoggedIn, async (c) => {
        const user = c.get("user");
        return c.api.success(user);
    })
    .delete("/logout", isLoggedIn, async (c) => {
        try {
            let accessToken = "";
            let refreshToken = "";
            const cookieNames = getAuthCookies(c.env);

            if (cookieNames.access && cookieNames.refresh) {
                accessToken = cookieNames.access
                refreshToken = cookieNames.refresh
            }

            clearAuthCookies(c, { accessToken, refreshToken });

            return c.body(null, 204);
        } catch (err: Error | any) {
            return c.api.error(err?.message ?? "Token refresh telah kedaluwarsa atau tidak valid.", err.status ?? 403);
        }
    })
    .post("/forgot-password", isGuest, zValidator("json", forgotPasswordSchema), async (c) => {
        const { email } = c.req.valid("json")

        // 1. Generate reset token in database
        const token = await createPasswordResetToken(db(c.env.DB), email)

        // 2. Build the password reset frontend URL
        const resetLink = `${c.env.FRONTEND_URL}/reset-password?token=${token}`

        // 3. Send email to user via Resend HTTP API
        await sendEmail(c.env, {
            to: email,
            subject: "Reset Your Password",
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
                    <h2 style="color: #333;">Password Reset Request</h2>
                    <p>Hello,</p>
                    <p>We received a request to reset the password for your account. Click the button below to set a new password:</p>
                    <div style="margin: 24px 0; text-align: center;">
                        <a href="${resetLink}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
                    </div>
                    <p style="color: #666; font-size: 14px;">This link is valid for 1 hour. If you did not request this change, you can safely ignore this email.</p>
                </div>
            `,
        })

        return c.api.success(null, "Password reset link has been sent to your email.")
    })
    .post("/reset-password", isGuest, zValidator("json", resetPasswordSchema), async (c) => {
        const body = c.req.valid("json")

        // 1. Verify token, update password and delete the token
        await resetUserPassword(db(c.env.DB), body)

        return c.api.success(null, "Password has been reset successfully. You can now login with your new password.")
    })