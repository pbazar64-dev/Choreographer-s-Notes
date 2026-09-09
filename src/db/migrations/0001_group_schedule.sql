CREATE TABLE `group_schedule_slots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer NOT NULL,
	`weekday` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `group_schedule_group_idx` ON `group_schedule_slots` (`group_id`,`weekday`);--> statement-breakpoint
CREATE TABLE `schedule_exceptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slot_id` integer NOT NULL,
	`date` text NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`slot_id`) REFERENCES `group_schedule_slots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `schedule_exceptions_date_idx` ON `schedule_exceptions` (`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `schedule_exceptions_unique` ON `schedule_exceptions` (`slot_id`,`date`);