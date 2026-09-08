import { createBlock, listBlocksWithMaterials } from '@/db/repositories/blocks.repo';
import { createGroup } from '@/db/repositories/groups.repo';
import { createLesson, deleteLesson } from '@/db/repositories/lessons.repo';
import {
  attachMaterialsToBlock,
  createMaterial,
  detachMaterialFromBlock,
  getBlockMaterial,
  getMaterialUsage,
  listBlockMaterials,
  listMaterials,
  updateBlockMaterial,
} from '@/db/repositories/materials.repo';
import type { AppDatabase } from '@/db/client';
import { formatTimecode, parseTimecode } from '@/lib/timecode';

import { createTestDb } from './helpers/testDb';

describe('таймкод', () => {
  it('разбирает разные записи', () => {
    expect(parseTimecode('90')).toBe(90);
    expect(parseTimecode('1:30')).toBe(90);
    expect(parseTimecode('1:02:05')).toBe(3725);
    expect(parseTimecode(' 0:07 ')).toBe(7);
  });

  it('отвергает мусор и невозможное время', () => {
    expect(parseTimecode('')).toBeNull();
    expect(parseTimecode('минута')).toBeNull();
    expect(parseTimecode('1:70')).toBeNull();
    expect(parseTimecode('-5')).toBeNull();
    expect(parseTimecode('1:2:3:4')).toBeNull();
  });

  it('форматирует обратно', () => {
    expect(formatTimecode(90)).toBe('1:30');
    expect(formatTimecode(7)).toBe('0:07');
    expect(formatTimecode(3725)).toBe('1:02:05');
  });
});

describe('прикрепление материалов к блоку', () => {
  let db: AppDatabase;

  beforeEach(() => {
    db = createTestDb();
  });

  function makeBlock() {
    const group = createGroup(db, { name: 'Дети 8–10', colorHex: '#C2703D' });
    const lesson = createLesson(db, {
      groupId: group.id,
      orderNumber: 1,
      title: 'Урок 1',
      date: '2026-09-10',
      plannedMinutes: 60,
    });
    return {
      lesson,
      block: createBlock(db, { lessonId: lesson.id, title: 'Разминка' }),
    };
  }

  function makeMaterial(title: string) {
    return createMaterial(db, { type: 'video_link', title, url: 'https://example.com/v' });
  }

  it('прикрепляет несколько материалов подряд, сохраняя порядок', () => {
    const { block } = makeBlock();
    const first = makeMaterial('Разминка');
    const second = makeMaterial('Кросс');

    attachMaterialsToBlock(db, block.id, [first.id, second.id]);
    const third = makeMaterial('Растяжка');
    attachMaterialsToBlock(db, block.id, [third.id]);

    expect(listBlockMaterials(db, block.id).map((item) => item.material.title)).toEqual([
      'Разминка',
      'Кросс',
      'Растяжка',
    ]);
  });

  it('новый материал из урока попадает и в блок, и в общую базу', () => {
    const { block } = makeBlock();
    const material = createMaterial(db, {
      type: 'video_file',
      title: 'Снято на камеру',
      localPath: 'materials/new.mp4',
    });
    attachMaterialsToBlock(db, block.id, [material.id]);

    expect(listMaterials(db)).toHaveLength(1);
    expect(listBlockMaterials(db, block.id)).toHaveLength(1);
  });

  it('хранит комментарий и таймкод отдельно для каждого блока', () => {
    const { block } = makeBlock();
    const otherBlock = createBlock(db, { lessonId: block.lessonId, title: 'Комбинация' });
    const material = makeMaterial('Общее видео');

    attachMaterialsToBlock(db, block.id, [material.id]);
    attachMaterialsToBlock(db, otherBlock.id, [material.id]);

    const [first] = listBlockMaterials(db, block.id);
    const [second] = listBlockMaterials(db, otherBlock.id);
    if (!first || !second) throw new Error('связки не созданы');

    updateBlockMaterial(db, first.id, { comment: 'Первые 30 секунд', startTimeSec: 0 });
    updateBlockMaterial(db, second.id, { comment: 'Медленнее в 2 раза', startTimeSec: 45 });

    expect(getBlockMaterial(db, first.id)?.comment).toBe('Первые 30 секунд');
    expect(getBlockMaterial(db, second.id)?.startTimeSec).toBe(45);
    expect(listMaterials(db)).toHaveLength(1);
  });

  it('открепление убирает материал из блока, но не из базы', () => {
    const { block } = makeBlock();
    const material = makeMaterial('Разминка');
    attachMaterialsToBlock(db, block.id, [material.id]);

    const [link] = listBlockMaterials(db, block.id);
    if (!link) throw new Error('связка не создана');

    detachMaterialFromBlock(db, link.id);

    expect(listBlockMaterials(db, block.id)).toHaveLength(0);
    expect(listMaterials(db)).toHaveLength(1);
    expect(getMaterialUsage(db, material.id)).toHaveLength(0);
  });

  it('материалы видны в блоках конспекта и переживают удаление урока', () => {
    const { lesson, block } = makeBlock();
    const material = makeMaterial('Разминка');
    attachMaterialsToBlock(db, block.id, [material.id]);

    expect(listBlocksWithMaterials(db, lesson.id)[0]?.materials).toHaveLength(1);

    deleteLesson(db, lesson.id);
    expect(listMaterials(db)).toHaveLength(1);
  });
});
