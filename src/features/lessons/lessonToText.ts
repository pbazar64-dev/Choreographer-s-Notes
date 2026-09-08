import type { BlockWithMaterials } from '@/db/repositories/blocks.repo';
import type { LessonListItem } from '@/db/repositories/lessons.repo';
import { blockKindLabel } from '@/constants/blockKinds';
import { formatFullDate } from '@/lib/date';
import { getLessonTimeSummary } from '@/lib/lessonTime';

/** Конспект как обычный текст — для кнопки «Поделиться». */
export function lessonToText(
  lesson: LessonListItem,
  blocks: readonly BlockWithMaterials[],
): string {
  const summary = getLessonTimeSummary(blocks, lesson.plannedMinutes);

  const header = [
    lesson.title,
    `${lesson.groupName} · урок ${lesson.orderNumber}`,
    `${formatFullDate(lesson.date)}${lesson.startTime ? `, ${lesson.startTime}` : ''} · ${lesson.plannedMinutes} мин`,
    lesson.goal ? `Цель: ${lesson.goal}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const body = blocks
    .map((block, index) => {
      const lines = [
        `${index + 1}. ${block.title} — ${block.plannedMinutes} мин (${blockKindLabel(block.kind)})`,
      ];

      if (block.notes.trim()) {
        lines.push(block.notes.trim());
      }

      for (const item of block.materials) {
        const parts = [`— ${item.material.title}`];
        if (item.startTimeSec != null) parts.push(`с ${formatTimecode(item.startTimeSec)}`);
        if (item.comment.trim()) parts.push(item.comment.trim());
        lines.push(parts.join(', '));
      }

      return lines.join('\n');
    })
    .join('\n\n');

  return [header, body, summary.label].filter(Boolean).join('\n\n');
}

export function formatTimecode(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
