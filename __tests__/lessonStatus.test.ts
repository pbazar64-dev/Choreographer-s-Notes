import { isLessonPlanned, lessonPlanLabel } from '@/features/lessons/status';

describe('статус конспекта', () => {
  it('запланирован, когда время блоков покрывает урок целиком', () => {
    expect(isLessonPlanned(60, 60)).toBe(true);
    expect(lessonPlanLabel(60, 60)).toBe('Запланирован');
  });

  it('не запланирован при недоборе и при перерасходе', () => {
    expect(isLessonPlanned(45, 60)).toBe(false);
    expect(isLessonPlanned(65, 60)).toBe(false);
    expect(lessonPlanLabel(0, 60)).toBe('Не запланирован');
  });

  it('пустой урок без блоков не считается запланированным', () => {
    expect(isLessonPlanned(0, 0)).toBe(false);
  });
});
