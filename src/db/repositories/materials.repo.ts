import { and, asc, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';

import { matchesSearch, normalizeSearch } from '@/lib/search';

import type { AppDatabase } from '../client';
import {
  blockMaterials,
  lessonBlocks,
  lessons,
  materialTags,
  materials,
  tags,
  type Material,
  type MaterialType,
  type NewMaterial,
} from '../schema';

export type MaterialFilters = {
  search?: string;
  types?: readonly MaterialType[];
  tagIds?: readonly number[];
  sort?: 'created_desc' | 'created_asc' | 'size_desc' | 'title_asc';
};

export type MaterialUsage = {
  lessonId: number;
  lessonTitle: string;
  lessonDate: string;
  blockId: number;
  blockTitle: string;
};

export function listMaterials(db: AppDatabase, filters: MaterialFilters = {}): Material[] {
  const { search, types, tagIds, sort = 'created_desc' } = filters;
  const conditions: (SQL | undefined)[] = [];

  if (types && types.length > 0) {
    conditions.push(inArray(materials.type, [...types]));
  }
  if (tagIds && tagIds.length > 0) {
    const tagged = db
      .selectDistinct({ id: materialTags.materialId })
      .from(materialTags)
      .where(inArray(materialTags.tagId, [...tagIds]))
      .all()
      .map((row) => row.id);

    if (tagged.length === 0) return [];
    conditions.push(inArray(materials.id, tagged));
  }

  const orderBy = {
    created_desc: desc(materials.createdAt),
    created_asc: asc(materials.createdAt),
    size_desc: desc(materials.fileSizeBytes),
    title_asc: asc(materials.title),
  }[sort];

  const rows = db
    .select()
    .from(materials)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(orderBy)
    .all();

  // Поиск по названию — в JS: SQLite не умеет lower() для кириллицы.
  const term = normalizeSearch(search ?? '');
  if (!term) return rows;

  return rows.filter(
    (material) => matchesSearch(material.title, term) || matchesSearch(material.description, term),
  );
}

export function getMaterial(db: AppDatabase, id: number): Material | null {
  return db.select().from(materials).where(eq(materials.id, id)).get() ?? null;
}

export function getMaterialsByIds(db: AppDatabase, ids: readonly number[]): Material[] {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(materials)
    .where(inArray(materials.id, [...ids]))
    .all();
}

export function createMaterial(db: AppDatabase, values: NewMaterial): Material {
  return db.insert(materials).values(values).returning().get();
}

export function updateMaterial(
  db: AppDatabase,
  id: number,
  values: Partial<NewMaterial>,
): Material | null {
  return db.update(materials).set(values).where(eq(materials.id, id)).returning().get() ?? null;
}

/**
 * Удаляет материал и все его связки с блоками. Физическое удаление файла
 * из materials/ делает вызывающий код после подтверждения пользователем.
 */
export function deleteMaterial(db: AppDatabase, id: number): void {
  db.delete(materials).where(eq(materials.id, id)).run();
}

/** «Где используется» (п. 4.5 ТЗ): уроки и блоки, ссылающиеся на материал. */
export function getMaterialUsage(db: AppDatabase, materialId: number): MaterialUsage[] {
  return db
    .select({
      lessonId: lessons.id,
      lessonTitle: lessons.title,
      lessonDate: lessons.date,
      blockId: lessonBlocks.id,
      blockTitle: lessonBlocks.title,
    })
    .from(blockMaterials)
    .innerJoin(lessonBlocks, eq(lessonBlocks.id, blockMaterials.blockId))
    .innerJoin(lessons, eq(lessons.id, lessonBlocks.lessonId))
    .where(eq(blockMaterials.materialId, materialId))
    .orderBy(desc(lessons.date))
    .all();
}

export function getTotalMaterialsSize(db: AppDatabase): number {
  const row = db
    .select({ value: sql<number>`coalesce(sum(${materials.fileSizeBytes}), 0)` })
    .from(materials)
    .get();

  return Number(row?.value ?? 0);
}

/* ------------------------------------------------- связки блок ↔ материал */

export function attachMaterialToBlock(
  db: AppDatabase,
  params: { blockId: number; materialId: number; comment?: string; startTimeSec?: number | null },
) {
  const row = db
    .select({ value: sql<number>`coalesce(max(${blockMaterials.sortOrder}) + 1, 0)` })
    .from(blockMaterials)
    .where(eq(blockMaterials.blockId, params.blockId))
    .get();

  return db
    .insert(blockMaterials)
    .values({
      blockId: params.blockId,
      materialId: params.materialId,
      sortOrder: Number(row?.value ?? 0),
      comment: params.comment ?? '',
      startTimeSec: params.startTimeSec ?? null,
    })
    .returning()
    .get();
}

export function updateBlockMaterial(
  db: AppDatabase,
  id: number,
  values: { comment?: string; startTimeSec?: number | null; sortOrder?: number },
) {
  return (
    db.update(blockMaterials).set(values).where(eq(blockMaterials.id, id)).returning().get() ?? null
  );
}

/** Открепляет материал от блока: сам материал остаётся в общей базе. */
export function detachMaterialFromBlock(db: AppDatabase, blockMaterialId: number): void {
  db.delete(blockMaterials).where(eq(blockMaterials.id, blockMaterialId)).run();
}

/* ------------------------------------------------------------------ теги */

export function listTags(db: AppDatabase) {
  return db.select().from(tags).orderBy(asc(tags.name)).all();
}

export function ensureTag(db: AppDatabase, name: string) {
  const normalized = name.trim();
  const existing = db.select().from(tags).where(eq(tags.name, normalized)).get();
  if (existing) return existing;
  return db.insert(tags).values({ name: normalized }).returning().get();
}

export function listMaterialTags(db: AppDatabase, materialId: number) {
  return db
    .select({ id: tags.id, name: tags.name, createdAt: tags.createdAt })
    .from(materialTags)
    .innerJoin(tags, eq(tags.id, materialTags.tagId))
    .where(eq(materialTags.materialId, materialId))
    .orderBy(asc(tags.name))
    .all();
}

export function addTagToMaterial(db: AppDatabase, materialId: number, tagId: number): void {
  db.insert(materialTags).values({ materialId, tagId }).onConflictDoNothing().run();
}

export function removeTagFromMaterial(db: AppDatabase, materialId: number, tagId: number): void {
  db.delete(materialTags)
    .where(and(eq(materialTags.materialId, materialId), eq(materialTags.tagId, tagId)))
    .run();
}
