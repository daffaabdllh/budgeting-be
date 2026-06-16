import bcrypt from "bcryptjs";
import { DrizzleD1 } from "../../config/db";
import { findFirst, insertRecord } from "../../lib/drizzle.d1";
import { LoginInputType, RegisterInputType, ResetPasswordInputType } from "./auth.schema";
import { users } from "../user/user.table";
import { passwordResets } from "../../database/schema";
import { HTTPException } from "hono/http-exception";
import { eq } from "drizzle-orm";

export const register = async (db: DrizzleD1, data: RegisterInputType) => {
    const hashPassword = bcrypt.hashSync(data.password)
    data.password = hashPassword

    const result = await insertRecord(db, users, data)
    if (!result) throw new HTTPException(400, { message: "Failed create new account." })

    const { password, ...rest } = result
    return rest
}

export const getUserLogin = async (db: DrizzleD1, data: LoginInputType) => {
    const result = await findFirst(
        db,
        users,
        {
            id: users.id,
            name: users.name,
            email: users.email,
            phone_number: users.phone_number,
            password: users.password
        },
        eq(users.email, data.email)
    )

    if (!result || !bcrypt.compareSync(data.password, result.password)) throw new HTTPException(404, { message: "Failed login." })

    const { password, ...rest } = result
    return rest
}

export const createPasswordResetToken = async (db: DrizzleD1, email: string) => {
    // 1. Check if user exists
    const user = await findFirst(
        db,
        users,
        { id: users.id },
        eq(users.email, email)
    );
    if (!user) {
        throw new HTTPException(404, { message: "User with this email does not exist." });
    }

    // 2. Generate random secure token
    const token = crypto.randomUUID();

    // 3. Expiration time (1 hour from now)
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;

    // 4. Delete any existing tokens for this email first (to clean up old tokens)
    await db.delete(passwordResets).where(eq(passwordResets.email, email));

    // 5. Insert new reset token
    const inserted = await insertRecord(db, passwordResets, {
        email,
        token,
        expires_at: expiresAt,
    });

    if (!inserted) {
        throw new HTTPException(500, { message: "Failed to create password reset token." });
    }

    return token;
};

export const resetUserPassword = async (db: DrizzleD1, data: ResetPasswordInputType) => {
    // 1. Find the reset token
    const resetRecord = await findFirst(
        db,
        passwordResets,
        {
            email: passwordResets.email,
            expires_at: passwordResets.expires_at,
        },
        eq(passwordResets.token, data.token)
    );

    if (!resetRecord) {
        throw new HTTPException(400, { message: "Invalid or expired reset token." });
    }

    // 2. Check expiration (expires_at is unix timestamp in seconds)
    const now = Math.floor(Date.now() / 1000);
    if (resetRecord.expires_at < now) {
        // Cleanup expired token
        await db.delete(passwordResets).where(eq(passwordResets.token, data.token));
        throw new HTTPException(400, { message: "Reset token has expired." });
    }

    // 3. Hash the new password
    const hashPassword = bcrypt.hashSync(data.password);

    // 4. Update the user password
    await db
        .update(users)
        .set({ password: hashPassword })
        .where(eq(users.email, resetRecord.email));

    // 5. Delete the token so it cannot be reused
    await db.delete(passwordResets).where(eq(passwordResets.token, data.token));

    return { email: resetRecord.email };
};