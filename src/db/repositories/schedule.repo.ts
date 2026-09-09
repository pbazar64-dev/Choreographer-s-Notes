import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm';

import type { AppDatabase } from '../client';
import {
  groupScheduleSlots,
  scheduleExceptions,
  type GroupScheduleSlot,
  type ScheduleException,
} from '../schema';

export type SlotInput = { weekday: number; startTime: string; endTime: string };

export function listGroupSlots(db: AppDatabase, groupId: number): GroupScheduleSlot[] {
  return db
    .select()
    .from(groupScheduleSlots)
    .where(eq(groupScheduleSlots.groupId, groupId))
    .orderBy(asc(groupScheduleSlots.weekday), asc(groupScheduleSlots.startTime))
    .all();
}

export function listAllSlots(db: AppDatabase): GroupScheduleSlot[] {
  return db
    .select()
    .from(groupScheduleSlots)
    .orderBy(asc(groupScheduleSlots.weekday), asc(groupScheduleSlots.startTime))
    .all();
}

/**
 * Заменяет расписание группы целиком. Слоты, которые остались без изменений,
 * пересоздаются — вместе с ними каскадом уходят и отмены по ним.
 */
export function replaceGroupSlots(
  db: AppDatabase,
  groupId: number,
  slots: readonly SlotInput[],
): void {
  db.transaction((tx) => {
    const existing = tx
      .select()
      .from(groupScheduleSlots)
      .where(eq(groupScheduleSlots.groupId, groupId))
      .all();

    const wanted = slots.map((slot) => ({ ...slot, groupId }));

    // Убираем только те слоты, которых больше нет: так отмены переживают правку.
    const toDelete = existing.filter(
      (slot) =>
        !wanted.some(
          (item) =>
            item.weekday === slot.weekday &&
            item.startTime === slot.startTime &&
            item.endTime === slot.endTime,
        ),
    );

    if (toDelete.length > 0) {
      tx.delete(groupScheduleSlots)
        .where(
          inArray(
            groupScheduleSlots.id,
            toDelete.map((slot) => slot.id),
          ),
        )
        .run();
    }

    for (const slot of wanted) {
      const alreadyThere = existing.some(
        (item) =>
          item.weekday === slot.weekday &&
          item.startTime === slot.startTime &&
          item.endTime === slot.endTime,
      );
      if (!alreadyThere) {
        tx.insert(groupScheduleSlots).values(slot).run();
      }
    }
  });
}

export function listExceptionsBetween(
  db: AppDatabase,
  fromKey: string,
  toKey: string,
): ScheduleException[] {
  return db
    .select()
    .from(scheduleExceptions)
    .where(and(gte(scheduleExceptions.date, fromKey), lte(scheduleExceptions.date, toKey)))
    .all();
}

export function cancelSlotOnDate(db: AppDatabase, slotId: number, dateKey: string): void {
  db.insert(scheduleExceptions).values({ slotId, date: dateKey }).onConflictDoNothing().run();
}

export function restoreSlotOnDate(db: AppDatabase, slotId: number, dateKey: string): void {
  db.delete(scheduleExceptions)
    .where(and(eq(scheduleExceptions.slotId, slotId), eq(scheduleExceptions.date, dateKey)))
    .run();
}
