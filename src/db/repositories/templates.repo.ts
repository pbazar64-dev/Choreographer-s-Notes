import { asc, eq, isNull, or } from 'drizzle-orm';

import type { AppDatabase } from '../client';
import {
  lessonBlocks,
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

export function deleteTemplate(db: AppDatabase, id: number): void {
  db.delete(templates).where(eq(templates.id, id)).run();
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

/** Разворачивает шаблон в блоки конкретного урока. */
export function applyTemplateToLesson(db: AppDatabase, templateId: number, lessonId: number): void {
  const blocks = db
    .select()
    .from(templateBlocks)
    .where(eq(templateBlocks.templateId, templateId))
    .orderBy(asc(templateBlocks.sortOrder))
    .all();

  db.transaction((tx) => {
    blocks.forEach((block, index) => {
      tx.insert(lessonBlocks)
        .values({
          lessonId,
          sortOrder: index,
          title: block.title,
          kind: block.kind,
          plannedMinutes: block.plannedMinutes,
          notes: block.defaultNotes,
        })
        .run();
    });
  });
}
