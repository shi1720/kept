CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`prefix` text NOT NULL,
	`key_hash` text NOT NULL,
	`last_used_at` integer,
	`revoked_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_hash_uq` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `api_keys_user_idx` ON `api_keys` (`user_id`);--> statement-breakpoint
CREATE TABLE `artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`mime` text,
	`size_bytes` integer,
	`content` text,
	`data` blob,
	`sha256` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `artifacts_submission_idx` ON `artifacts` (`submission_id`);--> statement-breakpoint
CREATE TABLE `criteria` (
	`id` text PRIMARY KEY NOT NULL,
	`milestone_id` text NOT NULL,
	`position` integer NOT NULL,
	`text` text NOT NULL,
	`kind` text DEFAULT 'objective' NOT NULL,
	`check` text DEFAULT '{"type":"none"}' NOT NULL,
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `criteria_milestone_idx` ON `criteria` (`milestone_id`);--> statement-breakpoint
CREATE TABLE `disputes` (
	`id` text PRIMARY KEY NOT NULL,
	`milestone_id` text NOT NULL,
	`opened_by_id` text,
	`reason` text NOT NULL,
	`client_statement` text,
	`freelancer_statement` text,
	`status` text DEFAULT 'open' NOT NULL,
	`ruling` text,
	`client_accepted_at` integer,
	`freelancer_accepted_at` integer,
	`rejected_by_id` text,
	`final_release_pct` integer,
	`resolved_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`opened_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `disputes_milestone_idx` ON `disputes` (`milestone_id`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`pact_id` text,
	`milestone_id` text,
	`actor_id` text,
	`actor_kind` text NOT NULL,
	`type` text NOT NULL,
	`message` text NOT NULL,
	`data` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`pact_id`) REFERENCES `pacts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `events_pact_idx` ON `events` (`pact_id`);--> statement-breakpoint
CREATE TABLE `ledger_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`txn_id` text NOT NULL,
	`pact_id` text,
	`milestone_id` text,
	`account` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`memo` text NOT NULL,
	`reference` text,
	`demo_workspace` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`pact_id`) REFERENCES `pacts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ledger_txn_idx` ON `ledger_entries` (`txn_id`);--> statement-breakpoint
CREATE INDEX `ledger_pact_idx` ON `ledger_entries` (`pact_id`);--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`pact_id` text NOT NULL,
	`position` integer NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`amount_cents` integer NOT NULL,
	`due_at` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`revisions_used` integer DEFAULT 0 NOT NULL,
	`funded_at` integer,
	`submitted_at` integer,
	`review_deadline_at` integer,
	`resolved_at` integer,
	`released_pct` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`pact_id`) REFERENCES `pacts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `milestones_pact_idx` ON `milestones` (`pact_id`);--> statement-breakpoint
CREATE INDEX `milestones_status_idx` ON `milestones` (`status`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`pact_id` text,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`read_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE TABLE `pacts` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`creator_id` text NOT NULL,
	`creator_role` text NOT NULL,
	`client_id` text,
	`freelancer_id` text,
	`counterparty_name` text,
	`counterparty_email` text,
	`invite_token` text NOT NULL,
	`source_text` text,
	`terms` text NOT NULL,
	`clarity_score` integer,
	`ambiguities` text DEFAULT '[]' NOT NULL,
	`risk_flags` text DEFAULT '[]' NOT NULL,
	`client_signed_at` integer,
	`freelancer_signed_at` integer,
	`created_via` text DEFAULT 'web' NOT NULL,
	`demo_workspace` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`freelancer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pacts_invite_uq` ON `pacts` (`invite_token`);--> statement-breakpoint
CREATE INDEX `pacts_client_idx` ON `pacts` (`client_id`);--> statement-breakpoint
CREATE INDEX `pacts_freelancer_idx` ON `pacts` (`freelancer_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`milestone_id` text NOT NULL,
	`paypal_order_id` text NOT NULL,
	`paypal_capture_id` text,
	`status` text DEFAULT 'created' NOT NULL,
	`milestone_cents` integer NOT NULL,
	`platform_fee_cents` integer NOT NULL,
	`processing_fee_cents` integer NOT NULL,
	`total_cents` integer NOT NULL,
	`paypal_fee_cents` integer,
	`payer_email` text,
	`payer_id` text,
	`refunded_cents` integer DEFAULT 0 NOT NULL,
	`simulated` integer DEFAULT false NOT NULL,
	`raw` text,
	`captured_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_order_uq` ON `payments` (`paypal_order_id`);--> statement-breakpoint
CREATE INDEX `payments_milestone_idx` ON `payments` (`milestone_id`);--> statement-breakpoint
CREATE TABLE `payouts` (
	`id` text PRIMARY KEY NOT NULL,
	`milestone_id` text NOT NULL,
	`sender_batch_id` text NOT NULL,
	`paypal_batch_id` text,
	`paypal_item_id` text,
	`receiver_email` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`fee_cents` integer,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`simulated` integer DEFAULT false NOT NULL,
	`raw` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payouts_sender_batch_uq` ON `payouts` (`sender_batch_id`);--> statement-breakpoint
CREATE TABLE `refunds` (
	`id` text PRIMARY KEY NOT NULL,
	`payment_id` text NOT NULL,
	`milestone_id` text NOT NULL,
	`paypal_refund_id` text,
	`amount_cents` integer NOT NULL,
	`status` text NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`simulated` integer DEFAULT false NOT NULL,
	`raw` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`milestone_id` text NOT NULL,
	`version` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_by_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `submissions_milestone_idx` ON `submissions` (`milestone_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`handle` text NOT NULL,
	`headline` text,
	`password_hash` text,
	`role` text DEFAULT 'user' NOT NULL,
	`paypal_email` text,
	`paypal_payer_id` text,
	`paypal_verified` integer DEFAULT false NOT NULL,
	`avatar_hue` integer DEFAULT 160 NOT NULL,
	`demo_workspace` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_uq` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_handle_uq` ON `users` (`handle`);--> statement-breakpoint
CREATE TABLE `verdicts` (
	`id` text PRIMARY KEY NOT NULL,
	`milestone_id` text NOT NULL,
	`submission_id` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`overall` text NOT NULL,
	`score` integer NOT NULL,
	`recommended_release_pct` integer NOT NULL,
	`summary` text NOT NULL,
	`notes_for_client` text DEFAULT '' NOT NULL,
	`notes_for_freelancer` text DEFAULT '' NOT NULL,
	`criteria_results` text NOT NULL,
	`evidence` text NOT NULL,
	`injection_detected` integer DEFAULT false NOT NULL,
	`latency_ms` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `verdicts_milestone_idx` ON `verdicts` (`milestone_id`);--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`paypal_event_id` text NOT NULL,
	`event_type` text NOT NULL,
	`resource_id` text,
	`verified` integer DEFAULT false NOT NULL,
	`payload` text NOT NULL,
	`processed_at` integer,
	`error` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `webhook_events_event_uq` ON `webhook_events` (`paypal_event_id`);