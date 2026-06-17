import { Bindings } from "../../config/env";
import { db } from "../../config/db";
import { recurringReminders } from "./recurring-reminder.table";
import { users } from "../user/user.table";
import { and, eq, sql } from "drizzle-orm";
import { sendEmail } from "../../lib/email";

/**
 * Memproses seluruh pengingat transaksi berulang bulanan yang jatuh tempo pada tanggal berjalan.
 * Fungsi ini hanya mengirimkan email notifikasi pengingat (tanpa memotong saldo dompet).
 * 
 * @param env Konfigurasi bindings Cloudflare Worker.
 * @param dateOverride Opsional Date untuk mensimulasikan tanggal tertentu pada unit test.
 */
export const processRecurringReminders = async (env: Bindings, dateOverride?: Date) => {
    const database = db(env.DB);
    const today = dateOverride || new Date();
    
    // Dapatkan tanggal hari ini (UTC)
    const currentDay = today.getUTCDate();
    const currentMonthYear = today.toISOString().substring(0, 7); // Format: YYYY-MM
    const currentFullDate = today.toISOString().substring(0, 10); // Format: YYYY-MM-DD

    // Deteksi apakah hari ini adalah hari terakhir dari bulan berjalan
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth();
    const tomorrow = new Date(Date.UTC(year, month, currentDay + 1));
    const isLastDayOfMonth = tomorrow.getUTCMonth() !== month;

    // Ambil semua pengingat berulang yang aktif dan belum dihapus
    const activeReminders = await database
        .select()
        .from(recurringReminders)
        .where(
            and(
                eq(recurringReminders.is_active, true),
                eq(recurringReminders.is_deleted, false)
            )
        );

    // Filter pengingat yang jatuh tempo hari ini
    const dueReminders = activeReminders.filter((reminder) => {
        if (isLastDayOfMonth) {
            // Jika akhir bulan, proses semua reminder yang tanggalnya hari ini ATAU lebih besar (misal 29, 30, 31 di bulan Februari)
            return reminder.day_of_month >= currentDay;
        } else {
            // Jika hari biasa, hanya proses yang tanggalnya pas hari ini
            return reminder.day_of_month === currentDay;
        }
    });

    for (const reminder of dueReminders) {
        try {
            // 1. Cek apakah pengingat ini sudah pernah diingatkan di bulan berjalan
            if (reminder.last_notified_month_year === currentMonthYear) {
                continue;
            }

            // 2. Ambil detail user terkait
            const details = await database
                .select({
                    userEmail: users.email,
                    userName: users.name
                })
                .from(recurringReminders)
                .innerJoin(users, eq(users.id, recurringReminders.user_id))
                .where(eq(recurringReminders.id, reminder.id))
                .limit(1);

            if (details.length === 0) {
                continue;
            }

            const { userEmail, userName } = details[0];

            // 3. Kirim email pengingat tagihan via Resend API
            await sendEmail(env, {
                to: userEmail,
                subject: `🔔 Pengingat Tagihan: ${reminder.description} Jatuh Tempo Hari Ini`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
                        <h2 style="color: #ff9800; margin-bottom: 20px;">🔔 Pengingat Pembayaran Tagihan</h2>
                        <p>Halo <strong>${userName}</strong>,</p>
                        <p>Ini adalah pengingat otomatis bahwa tagihan/pengingat transaksi berulang Anda jatuh tempo pada hari ini:</p>
                        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                            <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Deskripsi:</strong></td>
                                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${reminder.description}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Jumlah Tagihan:</strong></td>
                                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Rp ${reminder.amount.toLocaleString("id-ID")}</strong></td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Tanggal Jatuh Tempo:</strong></td>
                                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${currentFullDate}</td>
                            </tr>
                        </table>
                        <p style="color: #666; font-size: 14px;">Catatan: Cronjob ini hanya berfungsi sebagai pengingat. Sistem tidak akan memotong saldo dompet Anda secara otomatis. Harap lakukan pembayaran dan pencatatan transaksi secara manual.</p>
                    </div>
                `
            });

            // 4. Perbarui tanggal notifikasi terakhir agar tidak terkirim ganda bulan ini
            await database
                .update(recurringReminders)
                .set({
                    last_notified_month_year: currentMonthYear,
                    updated_at: sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`
                })
                .where(eq(recurringReminders.id, reminder.id));

        } catch (err) {
            console.error(`Gagal memproses notifikasi pengingat ID ${reminder.id}:`, err);
        }
    }
};
