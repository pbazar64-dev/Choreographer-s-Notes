import { formatDuration, getLessonTimeSummary, sumBlockMinutes } from '@/lib/lessonTime';

describe('расчёт времени урока', () => {
  it('складывает плановое время блоков', () => {
    expect(sumBlockMinutes([{ plannedMinutes: 15 }, { plannedMinutes: 20 }])).toBe(35);
    expect(sumBlockMinutes([])).toBe(0);
  });

  it('показывает превышение планового времени', () => {
    const summary = getLessonTimeSummary(
      [{ plannedMinutes: 15 }, { plannedMinutes: 25 }, { plannedMinutes: 22 }],
      60,
    );

    expect(summary.blocksMinutes).toBe(62);
    expect(summary.diffMinutes).toBe(2);
    expect(summary.isOver).toBe(true);
    expect(summary.label).toBe('Запланировано 62 мин из 60');
  });

  it('распознаёт точное совпадение и недобор', () => {
    const exact = getLessonTimeSummary([{ plannedMinutes: 60 }], 60);
    expect(exact.isExact).toBe(true);
    expect(exact.isOver).toBe(false);

    const under = getLessonTimeSummary([{ plannedMinutes: 40 }], 60);
    expect(under.diffMinutes).toBe(-20);
    expect(under.isOver).toBe(false);
  });

  it('форматирует длительность, включая уход в минус', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3725)).toBe('1:02:05');
    expect(formatDuration(-30)).toBe('−0:30');
  });
});
