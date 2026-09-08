import { asc, eq, isNull, or, sql } from 'drizzle-orm';

import type { AppDatabase } from '../client';
import {
  groups,
  lessonBlocks,
  lessons,
  templateBlocks,
  templates,
  type NewTemplate,
  type NewTemplateBlock,
  type Template,
  type TemplateBlock,
} from '../schema';

export type TemplateWithBlocks = Template & { blocks: TemplateBlock[] };

/** Шаблоны, доступные группе: её собственные + общие. */
export function listTemplatesForGroup(db: AppDatabase, groupId: number | null): Template[] {
  return db
    .select()
    .from(templates)
    .where(
      groupId === null
        ? isNull(templates.groupId)
        : or(eq(templates.groupId, groupId), isNull(templates.groupId)),
    )
    .orderBy(asc(templates.name))
    .all();
}

export function listTemplates(db: AppDatabase): Template[] {
  return db.select().from(templates).orderBy(asc(templates.name)).all();
}

export function getTemplateWithBlocks(db: AppDatabase, id: number): TemplateWithBlocks | null {
  const template = db.select().from(templates).where(eq(templates.id, id)).get();
  if (!template) return null;

  const blocks = db
    .select()
    .from(templateBlocks)
    .where(eq(templateBlocks.templateId, id))
    .orderBy(asc(templateBlocks.sortOrder))
    .all();

  return { ...template, blocks };
}

export function createTemplate(
  db: AppDatabase,
  values: NewTemplate,
  blocks: readonly Omit<NewTemplateBlock, 'templateId'>[] = [],
): TemplateWithBlocks {
  return db.transaction((tx) => {
    const template = tx.insert(templates).values(values).returning().get();
    const created = blocks.map((block, index) =>
      tx
        .insert(templateBlocks)
        .values({ ...block, templateId: template.id, sortOrder: block.sortOrder ?? index })
        .returning()
        .get(),
    );

    return { ...template, blocks: created };
  });
}

export function updateTemplate(db: AppDatabase, id: number, values: Partial<NewTemplate>) {
  return db.update(templates).set(values).where(eq(templates.id, id)).returning().get() ?? null;
}

/**
 * Удаление шаблона заодно снимает его с групп, где он стоял «по умолчанию»:
 * у groups.default_template_id нет внешнего ключа, иначе получилась бы
 * циклическая ссылка между таблицами.
 */
export function deleteTemplate(db: AppDatabase, id: number): void {
  db.transaction((tx) => {
    tx.update(groups)
      .set({ defaultTemplateId: null })
      .where(eq(groups.defaultTemplateId, id))
      .run();
    tx.delete(templates).where(eq(templates.id, id)).run();
  });
}

/** Заменяет набор блоков шаблона целиком — так проще, чем сверять поштучно. */
export function replaceTemplateBlocks(
  db: AppDatabase,
  templateId: number,
  blocks: readonly Omit<NewTemplateBlock, 'templateId'>[],
): void {
  db.transaction((tx) => {
    tx.delete(templateBlocks).where(eq(templateBlocks.templateId, templateId)).run();
    blocks.forEach((block, index) => {
      tx.insert(templateBlocks)
        .values({ ...block, templateId, sortOrder: block.sortOrder ?? index })
        .run();
    });
  });
}

/**
 * Разворачивает шаблон в блоки урока. Блоки дописываются в конец: применять
 * шаблон к уроку, где уже что-то есть, — нормальный сценарий.
 */
export function applyTemplateToLesson(
  db: AppDatabase,
  templateId: number,
  lessonId: number,
): number {
  const blocks = db
    .select()
    .from(templateBlocks)
    .where(eq(templateBlocks.templateId, templateId))
    .orderBy(asc(templateBlocks.sortOrder))
    .all();

  if (blocks.length === 0) return 0;

  return db.transaction((tx) => {
    const start = tx
      .select({ value: sql<number>`coalesce(max(${lessonBlocks.sortOrder}) + 1, 0)` })
      .from(lessonBlocks)
      .where(eq(lessonBlocks.lessonId, lessonId))
      .get();

    let sortOrder = Number(start?.value ?? 0);

    for (const block of blocks) {
      tx.insert(lessonBlocks)
        .values({
          lessonId,
          sortOrder,
          title: block.title,
          kind: block.kind,
          plannedMinutes: block.plannedMinutes,
          notes: block.defaultNotes,
        })
        .run();
      sortOrder += 1;
    }

    return blocks.length;
  });
}

/** «Сохранить структуру этого конспекта как шаблон» (п. 4.7 ТЗ). Заметки блоков переносятся. */
export function createTemplateFromLesson(
  db: AppDatabase,
  lessonId: number,
  name: string,
  groupId: number | null,
): Template | null {
  const lesson = db.select().from(lessons).where(eq(lessons.id, lessonId)).get();
  if (!lesson) return null;

  const blocks = db
    .select()
    .from(lessonBlocks)
    .where(eq(lessonBlocks.lessonId, lessonId))
    .orderBy(asc(lessonBlocks.sortOrder))
    .all();

  return db.transaction((tx) => {
    const template = tx.insert(templates).values({ name: name.trim(), groupId }).returning().get();

    blocks.forEach((block, index) => {
      tx.insert(templateBlocks)
        .values({
          templateId: template.id,
          sortOrder: index,
          title: block.title,
          kind: block.kind,
          plannedMinutes: block.plannedMinutes,
          defaultNotes: block.notes,
        })
        .run();
    });

    return template;
  });
}

/* ------------------------------------------------------- блоки шаблона */

export function listTemplateBlocks(db: AppDatabase, templateId: number): TemplateBlock[] {
  return db
    .select()
    .from(templateBlocks)
    .where(eq(templateBlocks.templateId, templateId))
    .orderBy(asc(templateBlocks.sortOrder))
    .all();
}

export function getTemplateBlock(db: AppDatabase, id: number): TemplateBlock | null {
  return db.select().from(templateBlocks).where(eq(templateBlocks.id, id)).get() ?? null;
}

export function createTemplateBlock(
  db: AppDatabase,
  templateId: number,
  values: Omit<NewTemplateBlock, 'templateId' | 'sortOrder'>,
): TemplateBlock {
  const next = db
    .select({ value: sql<number>`coalesce(max(${templateBlocks.sortOrder}) + 1, 0)` })
    .from(templateBlocks)
    .where(eq(templateBlocks.templateId, templateId))
    .get();

  return db
    .insert(templateBlocks)
    .values({ ...values, templateId, sortOrder: Number(next?.value ?? 0) })
    .returning()
    .get();
}

export function updateTemplateBlock(
  db: AppDatabase,
  id: number,
  values: Partial<NewTemplateBlock>,
): TemplateBlock | null {
  return (
    db.update(templateBlocks).set(values).where(eq(templateBlocks.id, id)).returning().get() ?? null
  );
}

export function deleteTemplateBlock(db: AppDatabase, id: number): void {
  db.delete(templateBlocks).where(eq(templateBlocks.id, id)).run();
}

export function reorderTemplateBlocks(db: AppDatabase, orderedIds: readonly number[]): void {
  db.transaction((tx) => {
    orderedIds.forEach((id, index) => {
      tx.update(templateBlocks).set({ sortOrder: index }).where(eq(templateBlocks.id, id)).run();
    });
  });
}

/** Сумма планового времени блоков шаблона — показывается в списке шаблонов. */
export function templateTotalMinutes(blocks: readonly TemplateBlock[]): number {
  return blocks.reduce((sum, block) => sum + block.plannedMinutes, 0);
}
