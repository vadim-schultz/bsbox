CREATE TABLE `series` (
	`code` text PRIMARY KEY NOT NULL,
	`title` text,
	`source` text NOT NULL,
	`external_key` text,
	`tz` text NOT NULL,
	`start_utc` integer NOT NULL,
	`duration_min` integer NOT NULL,
	`rrule` text,
	`edit_token_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	CONSTRAINT "series_source_check" CHECK("series"."source" IN ('outlook','teams','web')),
	CONSTRAINT "series_duration_check" CHECK("series"."duration_min" BETWEEN 5 AND 480)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `series_external_key_unique` ON `series` (`external_key`);--> statement-breakpoint
CREATE TABLE `session_minutes` (
	`session_id` text NOT NULL,
	`minute_idx` integer NOT NULL,
	`present` integer NOT NULL,
	`engaged` integer NOT NULL,
	PRIMARY KEY(`session_id`, `minute_idx`),
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`series_code` text NOT NULL,
	`start_ts` integer NOT NULL,
	`end_ts` integer NOT NULL,
	`state` text NOT NULL,
	`peak_participants` integer,
	`participation_rate` real,
	`raw` real,
	`score` real,
	`level` text,
	`finalized_at` integer,
	FOREIGN KEY (`series_code`) REFERENCES `series`(`code`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "sessions_state_check" CHECK("sessions"."state" IN ('scheduled','live','ended'))
);
--> statement-breakpoint
CREATE INDEX `sessions_series_start_idx` ON `sessions` (`series_code`,`start_ts`);