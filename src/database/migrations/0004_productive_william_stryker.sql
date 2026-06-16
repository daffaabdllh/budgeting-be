CREATE TABLE `wallets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`balance` text NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_unique_user_wallet_name` ON `wallets` ("name" COLLATE NOCASE,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_wallet_is_deleted` ON `wallets` (`is_deleted`);--> statement-breakpoint
ALTER TABLE `users` ADD `created_at` text DEFAULT '2026-06-16T00:00:00Z' NOT NULL;