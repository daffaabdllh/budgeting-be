import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { db as connectDb } from "../src/config/db";
import { wallets } from "../src/features/wallet/wallet.table";
import { users } from "../src/features/user/user.table";
import { recurringReminders } from "../src/features/recurring-reminder/recurring-reminder.table";
import { transactions } from "../src/features/transaction/transaction.table";
import { processRecurringReminders } from "../src/features/recurring-reminder/recurring-reminder.cron";
import { eq } from "drizzle-orm";

import sql0 from "../src/database/migrations/0000_hard_outlaw_kid.sql?raw";
import sql1 from "../src/database/migrations/0001_shocking_sage.sql?raw";
import sql2 from "../src/database/migrations/0002_aspiring_molly_hayes.sql?raw";
import sql3 from "../src/database/migrations/0003_magenta_odin.sql?raw";
import sql4 from "../src/database/migrations/0004_productive_william_stryker.sql?raw";
import sql5 from "../src/database/migrations/0005_familiar_magdalene.sql?raw";
import sql6 from "../src/database/migrations/0006_lucky_black_tom.sql?raw";
import sql7 from "../src/database/migrations/0007_melted_tinkerer.sql?raw";
import sql8 from "../src/database/migrations/0008_unique_lord_hawal.sql?raw";
import sql9 from "../src/database/migrations/0009_lonely_morph.sql?raw";
import sql10 from "../src/database/migrations/0010_wild_gambit.sql?raw";
import sql12 from "../src/database/migrations/0012_add_last_notified_month_year.sql?raw";
import sql13 from "../src/database/migrations/0013_add_user_salary_day.sql?raw";

const applyMigrations = async (d1: D1Database) => {
    const migrations = [sql0, sql1, sql2, sql3, sql4, sql5, sql6, sql7, sql8, sql9, sql10, sql12, sql13];
    for (const sqlStr of migrations) {
        const statements = sqlStr.split("--> statement-breakpoint");
        for (const statement of statements) {
            const trimmed = statement.trim();
            if (trimmed) {
                const singleLineSql = trimmed.replace(/\s+/g, " ");
                await d1.exec(singleLineSql);
            }
        }
    }
};

describe("Cronjob Transaksi Berulang Unit Tests (Notification Only)", () => {
    let db: any;
    let fetchMock: any;

    beforeEach(async () => {
        // Reset database lokal testing
        await applyMigrations(env.DB);
        db = connectDb(env.DB);

        // Bersihkan data lama jika ada
        await db.delete(transactions);
        await db.delete(recurringReminders);
        await db.delete(wallets);
        await db.delete(users);

        // Mock global fetch untuk memotong koneksi luar ke Resend API
        fetchMock = vi.fn().mockImplementation(() => {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ id: "email-id-mock" }),
                text: () => Promise.resolve("OK")
            });
        });
        vi.stubGlobal("fetch", fetchMock);

        // Seed data dasar user
        await db.insert(users).values({
            id: "user1",
            name: "Daffa Abdillah",
            email: "daffa@example.com",
            phone_number: "081234567890",
            password: "hashedpassword123"
        });

        // Seed wallet (untuk membuktikan saldo tidak berkurang)
        await db.insert(wallets).values({
            id: "w1",
            user_id: "user1",
            name: "Dompet Utama",
            balance: "500000",
            is_deleted: false
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("harus sukses mengirim email pengingat dan tidak merubah saldo wallet atau membuat transaksi", async () => {
        // Buat pengingat berulang jatuh tempo tanggal 17
        await db.insert(recurringReminders).values({
            id: "rem_1",
            user_id: "user1",
            description: "Bayar Internet Bulanan",
            amount: 350000,
            day_of_month: 17,
            is_active: true,
            is_deleted: false
        });

        // Simulasikan hari ini tanggal 17 Juni 2026
        const testDate = new Date(Date.UTC(2026, 5, 17, 10, 0, 0));

        await processRecurringReminders(env, testDate);

        // 1. Verifikasi saldo wallet tetap utuh
        const walletResult = await db.select().from(wallets).where(eq(wallets.id, "w1")).limit(1);
        expect(Number(walletResult[0].balance)).toBe(500000);

        // 2. Verifikasi tidak ada transaksi baru yang terbuat
        const txResult = await db.select().from(transactions);
        expect(txResult).toHaveLength(0);

        // 3. Verifikasi last_notified_month_year ter-update ke 2026-06
        const reminderResult = await db.select().from(recurringReminders).where(eq(recurringReminders.id, "rem_1")).limit(1);
        expect(reminderResult[0].last_notified_month_year).toBe("2026-06");

        // 4. Verifikasi email terkirim via Resend
        expect(fetchMock).toHaveBeenCalled();
        const fetchArgs = fetchMock.mock.calls[0];
        expect(fetchArgs[0]).toBe("https://api.resend.com/emails");
        const bodyObj = JSON.parse(fetchArgs[1].body);
        expect(bodyObj.to[0]).toBe("daffa@example.com");
        expect(bodyObj.subject).toContain("Pengingat Tagihan");
        expect(bodyObj.html).toContain("Rp 350.000");
    });

    it("harus menangani edge case akhir bulan dengan memproses reminder tanggal 29, 30, 31 pada hari terakhir bulan berjalan", async () => {
        // Di bulan Februari 2026 (berakhir di tanggal 28)
        // Kita seed reminder tanggal 28, 29, dan 30
        await db.insert(recurringReminders).values([
            { id: "rem_feb_28", user_id: "user1", description: "Reminder 28", amount: 1000, day_of_month: 28, is_active: true, is_deleted: false },
            { id: "rem_feb_29", user_id: "user1", description: "Reminder 29", amount: 2000, day_of_month: 29, is_active: true, is_deleted: false },
            { id: "rem_feb_30", user_id: "user1", description: "Reminder 30", amount: 3000, day_of_month: 30, is_active: true, is_deleted: false }
        ]);

        // Simulasikan hari terakhir Februari (28 Februari 2026)
        const testDate = new Date(Date.UTC(2026, 1, 28, 10, 0, 0));

        await processRecurringReminders(env, testDate);

        // Semua reminder (28, 29, 30) harus diproses dan memanggil Resend (3 kali pemanggilan fetch)
        expect(fetchMock).toHaveBeenCalledTimes(3);

        // Check if all got their last_notified_month_year set
        const reminders = await db.select().from(recurringReminders);
        expect(reminders.every((r: any) => r.last_notified_month_year === "2026-02")).toBe(true);
    });

    it("harus mencegah pengiriman email berulang kali jika cronjob terpicu lebih dari satu kali di hari yang sama", async () => {
        await db.insert(recurringReminders).values({
            id: "rem_double",
            user_id: "user1",
            description: "Netflix Premium",
            amount: 186000,
            day_of_month: 17,
            is_active: true,
            is_deleted: false
        });

        const testDate = new Date(Date.UTC(2026, 5, 17, 10, 0, 0));

        // Pemicuan ke-1
        await processRecurringReminders(env, testDate);
        expect(fetchMock).toHaveBeenCalledTimes(1);

        // Pemicuan ke-2 (di hari yang sama)
        await processRecurringReminders(env, testDate);
        // fetch tetap terpanggil 1 kali saja secara akumulatif (tidak terpanggil lagi pada pemanggilan kedua)
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
