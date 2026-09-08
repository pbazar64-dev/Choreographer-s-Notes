import { Stack, useLocalSearchParams } from 'expo-router';

import { getLesson } from '@/db/repositories/lessons.repo';
import { useDbQuery } from '@/db/useDbQuery';
import { EmptyState, Screen } from '@/ui';

/** Заглушка: режим проведения урока с таймером делается на этапе Э7. */
export default function RunLessonScreen() {
  const params = useLocalSearchParams<{ lessonId: string }>();
  const lessonId = Number(params.lessonId);
  const lesson = useDbQuery((db) => getLesson(db, lessonId), [lessonId]);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Проведение урока' }} />
      <EmptyState
        title="Режим урока появится на этапе Э7"
        description={
          lesson
            ? `${lesson.title} · ${lesson.groupName} · ${lesson.plannedMinutes} мин`
            : 'Конспект не найден'
        }
      />
    </Screen>
  );
}
