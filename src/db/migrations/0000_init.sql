CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `block_materials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`block_id` integer NOT NULL,
	`material_id` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`start_time_sec` integer,
	FOREIGN KEY (`block_id`) REFERENCES `lesson_blocks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `block_materials_block_idx` ON `block_materials` (`block_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `block_materials_material_idx` ON `block_materials` (`material_id`);--> statement-breakpoint
CREATE TABLE `groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`color_hex` text NOT NULL,
	`default_lesson_minutes` integer DEFAULT 60 NOT NULL,
	`default_template_id` integer,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lesson_blocks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lesson_id` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`title` text NOT NULL,
	`kind` text DEFAULT 'free' NOT NULL,
	`planned_minutes` integer DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lesson_blocks_lesson_idx` ON `lesson_blocks` (`lesson_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer NOT NULL,
	`order_number` integer DEFAULT 1 NOT NULL,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`start_time` text,
	`planned_minutes` integer DEFAULT 60 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`goal` text DEFAULT '' NOT NULL,
	`retrospective` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lessons_group_date_idx` ON `lessons` (`group_id`,`date`);--> statement-breakpoint
CREATE INDEX `lessons_date_idx` ON `lessons` (`date`);--> statement-breakpoint
CREATE TABLE `material_tags` (
	`material_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`material_id`, `tag_id`),
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `material_tags_tag_idx` ON `material_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `materials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`local_path` text,
	`url` text,
	`thumbnail_path` text,
	`duration_sec` integer,
	`file_size_bytes` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `materials_type_idx` ON `materials` (`type`);--> statement-breakpoint
CREATE INDEX `materials_created_idx` ON `materials` (`created_at`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE `template_blocks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`template_id` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`title` text NOT NULL,
	`kind` text DEFAULT 'free' NOT NULL,
	`planned_minutes` integer DEFAULT 0 NOT NULL,
	`default_notes` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `template_blocks_template_idx` ON `template_blocks` (`template_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`group_id` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE set null
);
