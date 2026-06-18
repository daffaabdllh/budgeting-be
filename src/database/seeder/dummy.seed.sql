-- Seeder Data Dummy

-- 1. Insert User (Password: password123)
INSERT OR REPLACE INTO users (id, name, email, phone_number, password, salary_day, created_at)
VALUES ('user-dummy-id-123', 'Daffa', 'daffa@example.com', '081234567890', '$2b$10$2ZzpcJeCdyvU/irBx1rJEO3UuuK/bvJzaWxEAChLLrnxtrXAPhv3O', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

-- 2. Insert Wallets (Adjust balance based on transaction balance sheet)
-- Initial balances + IN transactions - OUT transactions
-- BCA: 5000000 + 10000000 (Gaji) - 800000 (Belanja) - 60000 (Kopi) = 14140000
-- Mandiri: 2500000 + 1500000 (Freelance) - 250000 (Listrik) = 3750000
-- Cash: 500000 - 25000 (Makan) - 20000 (Kopi) - 100000 (Bensin) = 355000
INSERT OR REPLACE INTO wallets (id, user_id, name, balance, is_deleted, created_at)
VALUES ('wallet-bca-id-123', 'user-dummy-id-123', 'Bank BCA', '14140000', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
       ('wallet-mandiri-id-123', 'user-dummy-id-123', 'Bank Mandiri', '3750000', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
       ('wallet-cash-id-123', 'user-dummy-id-123', 'Cash', '355000', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

-- 3. Insert Budgets
INSERT OR REPLACE INTO budgets (id, user_id, category, amount, month_year, is_deleted, created_at)
VALUES ('budget-makanan-id-123', 'user-dummy-id-123', 'Makanan', 1500000, '2026-06', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
       ('budget-kopi-id-123', 'user-dummy-id-123', 'Kopi', 500000, '2026-06', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
       ('budget-listrik-id-123', 'user-dummy-id-123', 'Listrik', 300000, '2026-06', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
       ('budget-transportasi-id-123', 'user-dummy-id-123', 'Transportasi', 400000, '2026-06', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

-- 4. Insert Recurring Reminders
INSERT OR REPLACE INTO recurring_reminders (id, user_id, description, amount, day_of_month, is_active, is_deleted, created_at)
VALUES ('reminder-spotify-id-123', 'user-dummy-id-123', 'Bayar Spotify', 55000, 20, 1, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
       ('reminder-kosan-id-123', 'user-dummy-id-123', 'Bayar Kosan', 1500000, 5, 1, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

-- 5. Insert Transactions
INSERT OR REPLACE INTO transactions (id, user_id, wallet_id, budget_id, type, description, amount, transaction_date, is_deleted, created_at)
VALUES ('tx-gaji-123', 'user-dummy-id-123', 'wallet-bca-id-123', NULL, 'IN', 'Gaji Bulanan', 10000000, '2026-06-01', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
       ('tx-freelance-123', 'user-dummy-id-123', 'wallet-mandiri-id-123', NULL, 'IN', 'Freelance Project', 1500000, '2026-06-10', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
       ('tx-padang-123', 'user-dummy-id-123', 'wallet-cash-id-123', 'budget-makanan-id-123', 'OUT', 'Makan Siang Nasi Padang', 25000, '2026-06-02', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
       ('tx-belanja-123', 'user-dummy-id-123', 'wallet-bca-id-123', 'budget-makanan-id-123', 'OUT', 'Belanja Bulanan Supermarket', 800000, '2026-06-03', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
       ('tx-starbuck-123', 'user-dummy-id-123', 'wallet-bca-id-123', 'budget-kopi-id-123', 'OUT', 'Kopi Starbucks', 60000, '2026-06-04', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
       ('tx-kulo-123', 'user-dummy-id-123', 'wallet-cash-id-123', 'budget-kopi-id-123', 'OUT', 'Kopi Kulo', 20000, '2026-06-05', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
       ('tx-pln-123', 'user-dummy-id-123', 'wallet-mandiri-id-123', 'budget-listrik-id-123', 'OUT', 'Token Listrik PLN', 250000, '2026-06-06', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
       ('tx-bensin-123', 'user-dummy-id-123', 'wallet-cash-id-123', 'budget-transportasi-id-123', 'OUT', 'Bensin Pertamax', 100000, '2026-06-07', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));