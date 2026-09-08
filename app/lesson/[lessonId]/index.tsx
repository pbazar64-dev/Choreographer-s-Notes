import { Stack, useLocalSearchParams } from 'expo-router';

import { getLesson } from '@/db/repositories/lessons.repo';
import { useDbQuery } from '@/db/useDbQuery';
import { EmptyState, Screen } from '@/ui';

/** Заглушка: полноценный экран конспекта делается на этапе Э2. */
export default function LessonScreen() {
  const params = useLocalSearchParams<{ lessonId: string }>();
  const lessonId = Number(params.lessonId);
  const lesson = useDbQuery((db) => getLesson(db, lessonId), [lessonId]);

  return (
    <Screen>
      <Stack.Screen options={{ title: lesson?.title ?? 'Конспект' }} />
      <EmptyState
        title="Экран конспекта появится на этапе Э2"
        description={
          lesson
            ? `${lesson.groupName} · урок ${lesson.orderNumber} · ${lesson.plannedMinutes} мин`
            : 'Конспект не найден'
        }
      />
    </Screen>
  );
}
