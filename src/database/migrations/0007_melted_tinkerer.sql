CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`wallet_id` text NOT NULL,
	`budget_id` text,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`amount` integer NOT NULL,
	`transaction_date` text NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_transaction_is_deleted` ON `transactions` (`is_deleted`);--> statement-breakpoint
CREATE INDEX `idx_transaction_user_id` ON `transactions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_transaction_wallet_id` ON `transactions` (`wallet_id`);--> statement-breakpoint
CREATE INDEX `idx_transaction_budget_id` ON `transactions` (`budget_id`);--> statement-breakpoint
CREATE INDEX `idx_transaction_date` ON `transactions` (`transaction_date`);