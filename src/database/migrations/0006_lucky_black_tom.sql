CREATE TABLE `budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`category` text NOT NULL,
	`amount` integer NOT NULL,
	`month_year` text NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_budget_is_deleted` ON `budgets` (`is_deleted`);--> statement-breakpoint
CREATE INDEX `idx_budget_user_id` ON `budgets` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_budget_all` ON `budgets` (`user_id`,`month_year`,`category`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_unique_category` ON `budgets` (`user_id`,`month_year`,`category`);