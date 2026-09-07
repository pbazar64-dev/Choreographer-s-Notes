import { relations, sql } from 'drizzle-orm';
import { index, integer, primaryKey, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

/**
 * Соглашения:
 * - метки времени (createdAt/updatedAt) — unix-миллисекунды в integer;
 * - дата урока — строка 'YYYY-MM-DD', время — 'HH:mm' (сортируются лексикографически);
 * - булевы значения — integer 0/1;
 * - пути к файлам хранятся ОТНОСИТЕЛЬНО documentDirectory ('materials/xxx.mp4').
 */

const now = sql`(unixepoch() * 1000)`;

/* ------------------------------------------------------------------ группы */

export const groups = sqliteTable('groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  colorHex: text('color_hex').notNull(),
  defaultLessonMinutes: integer('default_lesson_minutes').notNull().default(60),
  defaultTemplateId: integer('default_template_id'),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull().default(now),
});

/* ------------------------------------------------------------------ уроки */

export const lessons = sqliteTable(
  'lessons',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    groupId: integer('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    orderNumber: integer('order_number').notNull().default(1),
    title: text('title').notNull(),
    /** 'YYYY-MM-DD' */
    date: text('date').notNull(),
    /** 'HH:mm', может отсутствовать у черновика */
    startTime: text('start_time'),
    plannedMinutes: integer('planned_minutes').notNull().default(60),
    status: text('status', { enum: ['draft', 'planned', 'done'] })
      .notNull()
      .default('draft'),
    goal: text('goal').notNull().default(''),
    /** Задел под «как прошёл урок» (вторая версия). В UI первой версии не используется. */
    retrospective: text('retrospective'),
    createdAt: integer('created_at').notNull().default(now),
    updatedAt: integer('updated_at').notNull().default(now),
  },
  (table) => [
    index('lessons_group_date_idx').on(table.groupId, table.date),
    index('lessons_date_idx').on(table.date),
  ],
);

/* ------------------------------------------------------------------ блоки */

export const lessonBlocks = sqliteTable(
  'lesson_blocks',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    lessonId: integer('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
    title: text('title').notNull(),
    /** Код вида блока из справочника src/constants/blockKinds.ts */
    kind: text('kind').notNull().default('free'),
    plannedMinutes: integer('planned_minutes').notNull().default(0),
    notes: text('notes').notNull().default(''),
  },
  (table) => [index('lesson_blocks_lesson_idx').on(table.lessonId, table.sortOrder)],
);

/* -------------------------------------------------------------- материалы */

export const materials = sqliteTable(
  'materials',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    type: text('type', {
      enum: ['video_file', 'video_link', 'audio_file', 'audio_link', 'image'],
    }).notNull(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    /** Относительный путь внутри documentDirectory, например 'materials/uuid.mp4' */
    localPath: text('local_path'),
    /** Внешняя ссылка для материалов-ссылок */
    url: text('url'),
    /** Относительный путь превью, например 'thumbnails/uuid.jpg' */
    thumbnailPath: text('thumbnail_path'),
    durationSec: integer('duration_sec'),
    fileSizeBytes: integer('file_size_bytes'),
    createdAt: integer('created_at').notNull().default(now),
  },
  (table) => [
    index('materials_type_idx').on(table.type),
    index('materials_created_idx').on(table.createdAt),
  ],
);

/** Связка «материал прикреплён к блоку». Удаление связки не трогает сам материал. */
export const blockMaterials = sqliteTable(
  'block_materials',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    blockId: integer('block_id')
      .notNull()
      .references(() => lessonBlocks.id, { onDelete: 'cascade' }),
    materialId: integer('material_id')
      .notNull()
      .references(() => materials.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
    comment: text('comment').notNull().default(''),
    /** Таймкод, с которого открывать видео */
    startTimeSec: integer('start_time_sec'),
  },
  (table) => [
    index('block_materials_block_idx').on(table.blockId, table.sortOrder),
    index('block_materials_material_idx').on(table.materialId),
  ],
);

/* ------------------------------------------------------------------- теги */

export const tags = sqliteTable(
  'tags',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    createdAt: integer('created_at').notNull().default(now),
  },
  (table) => [unique('tags_name_unique').on(table.name)],
);

export const materialTags = sqliteTable(
  'material_tags',
  {
    materialId: integer('material_id')
      .notNull()
      .references(() => materials.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.materialId, table.tagId] }),
    index('material_tags_tag_idx').on(table.tagId),
  ],
);

/* --------------------------------------------------------------- шаблоны */

export const templates = sqliteTable('templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  /** null — общий шаблон, доступный всем группам */
  groupId: integer('group_id').references(() => groups.id, { onDelete: 'set null' }),
  createdAt: integer('created_at').notNull().default(now),
});

export const templateBlocks = sqliteTable(
  'template_blocks',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    templateId: integer('template_id')
      .notNull()
      .references(() => templates.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
    title: text('title').notNull(),
    kind: text('kind').notNull().default('free'),
    plannedMinutes: integer('planned_minutes').notNull().default(0),
    defaultNotes: text('default_notes').notNull().default(''),
  },
  (table) => [index('template_blocks_template_idx').on(table.templateId, table.sortOrder)],
);

/* -------------------------------------------------------------- настройки */

/** Key-value: тема, размер шрифта конспекта, дата последнего бэкапа и т.п. */
export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

/* ------------------------------------------------------------- отношения */

export const groupsRelations = relations(groups, ({ many }) => ({
  lessons: many(lessons),
  templates: many(templates),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  group: one(groups, { fields: [lessons.groupId], references: [groups.id] }),
  blocks: many(lessonBlocks),
}));

export const lessonBlocksRelations = relations(lessonBlocks, ({ one, many }) => ({
  lesson: one(lessons, { fields: [lessonBlocks.lessonId], references: [lessons.id] }),
  materials: many(blockMaterials),
}));

export const blockMaterialsRelations = relations(blockMaterials, ({ one }) => ({
  block: one(lessonBlocks, { fields: [blockMaterials.blockId], references: [lessonBlocks.id] }),
  material: one(materials, { fields: [blockMaterials.materialId], references: [materials.id] }),
}));

export const materialsRelations = relations(materials, ({ many }) => ({
  blockLinks: many(blockMaterials),
  tags: many(materialTags),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  materials: many(materialTags),
}));

export const materialTagsRelations = relations(materialTags, ({ one }) => ({
  material: one(materials, { fields: [materialTags.materialId], references: [materials.id] }),
  tag: one(tags, { fields: [materialTags.tagId], references: [tags.id] }),
}));

export const templatesRelations = relations(templates, ({ one, many }) => ({
  group: one(groups, { fields: [templates.groupId], references: [groups.id] }),
  blocks: many(templateBlocks),
}));

export const templateBlocksRelations = relations(templateBlocks, ({ one }) => ({
  template: one(templates, { fields: [templateBlocks.templateId], references: [templates.id] }),
}));

/* ------------------------------------------------------------------ типы */

export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;
export type LessonBlock = typeof lessonBlocks.$inferSelect;
export type NewLessonBlock = typeof lessonBlocks.$inferInsert;
export type Material = typeof materials.$inferSelect;
export type NewMaterial = typeof materials.$inferInsert;
export type MaterialType = Material['type'];
export type BlockMaterial = typeof blockMaterials.$inferSelect;
export type NewBlockMaterial = typeof blockMaterials.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;
export type TemplateBlock = typeof templateBlocks.$inferSelect;
export type NewTemplateBlock = typeof templateBlocks.$inferInsert;
export type LessonStatus = Lesson['status'];
