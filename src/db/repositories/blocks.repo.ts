import { asc, eq, max, sql } from 'drizzle-orm';

import type { AppDatabase } from '../client';
import {
  blockMaterials,
  lessonBlocks,
  materials,
  type BlockMaterial,
  type LessonBlock,
  type Material,
  type NewLessonBlock,
} from '../schema';

export type BlockMaterialItem = BlockMaterial & { material: Material };

export type BlockWithMaterials = LessonBlock & {
  materials: BlockMaterialItem[];
};

export function listBlocks(db: AppDatabase, lessonId: number): LessonBlock[] {
  return db
    .select()
    .from(lessonBlocks)
    .where(eq(lessonBlocks.lessonId, lessonId))
    .orderBy(asc(lessonBlocks.sortOrder))
    .all();
}

/** Блоки урока вместе с прикреплёнными материалами. */
export function listBlocksWithMaterials(db: AppDatabase, lessonId: number): BlockWithMaterials[] {
  const blocks = listBlocks(db, lessonId);
  if (blocks.length === 0) return [];

  const links = db
    .select({ link: blockMaterials, material: materials })
    .from(blockMaterials)
    .innerJoin(materials, eq(materials.id, blockMaterials.materialId))
    .innerJoin(lessonBlocks, eq(lessonBlocks.id, blockMaterials.blockId))
    .where(eq(lessonBlocks.lessonId, lessonId))
    .orderBy(asc(blockMaterials.sortOrder))
    .all();

  return blocks.map((block) => ({
    ...block,
    materials: links
      .filter((row) => row.link.blockId === block.id)
      .map((row) => ({ ...row.link, material: row.material })),
  }));
}

export function getBlock(db: AppDatabase, id: number): LessonBlock | null {
  return db.select().from(lessonBlocks).where(eq(lessonBlocks.id, id)).get() ?? null;
}

export function nextBlockSortOrder(db: AppDatabase, lessonId: number): number {
  const row = db
    .select({ value: max(lessonBlocks.sortOrder) })
    .from(lessonBlocks)
    .where(eq(lessonBlocks.lessonId, lessonId))
    .get();

  return row?.value === null || row?.value === undefined ? 0 : Number(row.value) + 1;
}

export function createBlock(db: AppDatabase, values: NewLessonBlock): LessonBlock {
  return db.insert(lessonBlocks).values(values).returning().get();
}

export function updateBlock(
  db: AppDatabase,
  id: number,
  values: Partial<NewLessonBlock>,
): LessonBlock | null {
  return (
    db.update(lessonBlocks).set(values).where(eq(lessonBlocks.id, id)).returning().get() ?? null
  );
}

/** Удаление блока снимает связки с материалами, но не удаляет сами материалы. */
export function deleteBlock(db: AppDatabase, id: number): void {
  db.delete(lessonBlocks).where(eq(lessonBlocks.id, id)).run();
}

/** Сохраняет новый порядок блоков после перетаскивания. */
export function reorderBlocks(db: AppDatabase, orderedIds: readonly number[]): void {
  db.transaction((tx) => {
    orderedIds.forEach((id, index) => {
      tx.update(lessonBlocks).set({ sortOrder: index }).where(eq(lessonBlocks.id, id)).run();
    });
  });
}

/** Суммарное плановое время блоков урока — считается в БД, без выгрузки блоков. */
export function sumPlannedMinutes(db: AppDatabase, lessonId: number): number {
  const row = db
    .select({ value: sql<number>`coalesce(sum(${lessonBlocks.plannedMinutes}), 0)` })
    .from(lessonBlocks)
    .where(eq(lessonBlocks.lessonId, lessonId))
    .get();

  return Number(row?.value ?? 0);
}
