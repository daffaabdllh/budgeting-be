import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const userId = "user-dummy-id-123";
const passwordHash = bcrypt.hashSync("password123", 10);

const walletBcaId = "wallet-bca-id-123";
const walletMandiriId = "wallet-mandiri-id-123";
const walletCashId = "wallet-cash-id-123";

const budgetMakananId = "budget-makanan-id-123";
const budgetKopiId = "budget-kopi-id-123";
const budgetListrikId = "budget-listrik-id-123";
const budgetTransportasiId = "budget-transportasi-id-123";

const sqlContent = `
-- Seeder Data Dummy

-- 1. Insert User (Password: password123)
INSERT OR REPLACE INTO users (id, name, email, phone_number, password, salary_day, created_at)
VALUES ('${userId}', 'Daffa', 'daffa@example.com', '081234567890', '${passwordHash}', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

-- 2. Insert Wallets (Adjust balance based on transaction balance sheet)
-- Initial balances + IN transactions - OUT transactions
-- BCA: 5000000 + 10000000 (Gaji) - 800000 (Belanja) - 60000 (Kopi) = 14140000
-- Mandiri: 2500000 + 1500000 (Freelance) - 250000 (Listrik) = 3750000
-- Cash: 500000 - 25000 (Makan) - 20000 (Kopi) - 100000 (Bensin) = 355000
INSERT OR REPLACE INTO wallets (id, user_id, name, balance, is_deleted, created_at)
VALUES ('${walletBcaId}', '${userId}', 'Bank BCA', '14140000', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
       ('${walletMandiriId}', '${userId}', 'Bank Mandiri', '3750000', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
       ('${walletCashId}', '${userId}', 'Cash', '355000', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

-- 3. Insert Budgets
INSERT OR REPLACE INTO budgets (id, user_id, category, amount, month_year, is_deleted, created_at)
VALUES ('${budgetMakananId}', '${userId}', 'Makanan', 1500000, '2026-06', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
       ('${budgetKopiId}', '${userId}', 'Kopi', 500000, '2026-06', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
       ('${budgetListrikId}', '${userId}', 'Listrik', 300000, '2026-06', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
       ('${budgetTransportasiId}', '${userId}', 'Transportasi', 400000, '2026-06', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

-- 4. Insert Recurring Reminders
INSERT OR REPLACE INTO recurring_reminders (id, user_id, description, amount, day_of_month, is_active, is_deleted, created_at)
VALUES ('reminder-spotify-id-123', '${userId}', 'Bayar Spotify', 55000, 20, 1, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
       ('reminder-kosan-id-123', '${userId}', 'Bayar Kosan', 1500000, 5, 1, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

-- 5. Insert Transactions
INSERT OR REPLACE INTO transactions (id, user_id, wallet_id, budget_id, type, description, amount, transaction_date, is_deleted, created_at)
VALUES ('tx-gaji-123', '${userId}', '${walletBcaId}', NULL, 'IN', 'Gaji Bulanan', 10000000, '2026-06-01', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
       ('tx-freelance-123', '${userId}', '${walletMandiriId}', NULL, 'IN', 'Freelance Project', 1500000, '2026-06-10', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
       ('tx-padang-123', '${userId}', '${walletCashId}', '${budgetMakananId}', 'OUT', 'Makan Siang Nasi Padang', 25000, '2026-06-02', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
       ('tx-belanja-123', '${userId}', '${walletBcaId}', '${budgetMakananId}', 'OUT', 'Belanja Bulanan Supermarket', 800000, '2026-06-03', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
       ('tx-starbuck-123', '${userId}', '${walletBcaId}', '${budgetKopiId}', 'OUT', 'Kopi Starbucks', 60000, '2026-06-04', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
       ('tx-kulo-123', '${userId}', '${walletCashId}', '${budgetKopiId}', 'OUT', 'Kopi Kulo', 20000, '2026-06-05', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
       ('tx-pln-123', '${userId}', '${walletMandiriId}', '${budgetListrikId}', 'OUT', 'Token Listrik PLN', 250000, '2026-06-06', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
       ('tx-bensin-123', '${userId}', '${walletCashId}', '${budgetTransportasiId}', 'OUT', 'Bensin Pertamax', 100000, '2026-06-07', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
`;

const dir = path.join(__dirname, "../database/seeder");
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(path.join(dir, "dummy.seed.sql"), sqlContent.trim());
console.log("Success generate dummy.seed.sql!");
