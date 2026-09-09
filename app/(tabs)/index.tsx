import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Calendar } from 'react-native-calendars';

import { listGroups } from '@/db/repositories/groups.repo';
import {
  getUpcomingLesson,
  listLessonsBetween,
  listLessonsByDate,
} from '@/db/repositories/lessons.repo';
import {
  cancelSlotOnDate,
  listAllSlots,
  listExceptionsBetween,
  restoreSlotOnDate,
} from '@/db/repositories/schedule.repo';
import { useDatabase } from '@/db/useDatabase';
import { useDbQuery } from '@/db/useDbQuery';
import { BackupReminder } from '@/features/backup/components/BackupReminder';
import { WeekStrip, type DayDots } from '@/features/calendar/components/WeekStrip';
import { createLessonForGroup } from '@/features/lessons/createLesson';
import { LessonCard } from '@/features/lessons/components/LessonCard';
import { ScheduleSlotCard } from '@/features/schedule/components/ScheduleSlotCard';
import { getDaySlots, scheduledDatesBetween } from '@/features/schedule/schedule';
import { bumpDbRevision } from '@/stores/dbRevision';
import { addDays, formatFullDate, formatLessonDate, todayKey } from '@/lib/date';
import { CALENDAR_FIRST_DAY } from '@/lib/calendarLocale';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, EmptyState, Screen, SegmentedControl, Text } from '@/ui';

export default function CalendarScreen() {
  const db = useDatabase();
  const router = useRouter();
  const theme = useTheme();

  const [mode, setMode] = useState<'month' | 'week'>('month');
  const [selectedDate, setSelectedDate] = useState(todayKey());

  const upcoming = useDbQuery((db) => getUpcomingLesson(db, todayKey()), []);
  const dayLessons = useDbQuery((db) => listLessonsByDate(db, selectedDate), [selectedDate]);

  // Точки в календаре: берём уроки на полгода вокруг выбранной даты.
  const periodLessons = useDbQuery(
    (database) =>
      listLessonsBetween(database, addDays(selectedDate, -180), addDays(selectedDate, 180)),
    [selectedDate],
  );

  const groups = useDbQuery((database) => listGroups(database, true), []);
  const slots = useDbQuery((database) => listAllSlots(database), []);
  const exceptions = useDbQuery(
    (database) =>
      listExceptionsBetween(database, addDays(selectedDate, -180), addDays(selectedDate, 180)),
    [selectedDate],
  );

  const daySlots = getDaySlots(slots, selectedDate, { lessons: dayLessons, exceptions });

  const dots: DayDots = {};
  for (const lesson of periodLessons) {
    const list = dots[lesson.date] ?? [];
    if (!list.includes(lesson.groupColorHex)) list.push(lesson.groupColorHex);
    dots[lesson.date] = list;
  }

  // Дни постоянного расписания тоже помечаем точкой цвета группы.
  const scheduled = scheduledDatesBetween(
    slots,
    addDays(selectedDate, -180),
    addDays(selectedDate, 180),
  );
  for (const [date, groupIds] of scheduled) {
    const list = dots[date] ?? [];
    for (const groupId of groupIds) {
      const color = groups.find((group) => group.id === groupId)?.colorHex;
      if (color && !list.includes(color)) list.push(color);
    }
    if (list.length > 0) dots[date] = list;
  }

  function handleCreateFromSlot(groupId: number, startTime: string, durationMinutes: number) {
    const group = groups.find((item) => item.id === groupId);
    if (!group) return;

    const lesson = createLessonForGroup(db, group, selectedDate, {
      startTime,
      plannedMinutes: durationMinutes,
    });
    bumpDbRevision();
    router.push(`/lesson/${lesson.id}`);
  }

  const markedDates: Record<string, object> = {};
  for (const [date, colors] of Object.entries(dots)) {
    markedDates[date] = {
      dots: colors.map((color, index) => ({ key: `${date}-${index}`, color })),
    };
  }
  markedDates[selectedDate] = {
    ...(markedDates[selectedDate] ?? {}),
    selected: true,
    selectedColor: theme.colors.accent,
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ gap: theme.spacing.md, paddingVertical: theme.spacing.lg }}
      >
        <BackupReminder />

        {upcoming ? (
          <Card accentColor={upcoming.groupColorHex}>
            <Text variant="caption" tone="muted">
              Ближайший урок · {upcoming.groupName}
            </Text>
            <Text variant="subtitle">{upcoming.title}</Text>
            <Text tone="muted">
              {formatLessonDate(upcoming.date)}
              {upcoming.startTime ? `, ${upcoming.startTime}` : ''} · {upcoming.plannedMinutes} мин
            </Text>
            <View
              style={{ flexDirection: 'row', gap: theme.spacing.sm, paddingTop: theme.spacing.sm }}
            >
              <Button
                title="Провести"
                style={{ flex: 1 }}
                onPress={() => router.push(`/lesson/${upcoming.id}/run`)}
              />
              <Button
                title="Открыть конспект"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => router.push(`/lesson/${upcoming.id}`)}
              />
            </View>
          </Card>
        ) : null}

        <SegmentedControl
          value={mode}
          onChange={setMode}
          options={[
            { value: 'month', label: 'Месяц' },
            { value: 'week', label: 'Неделя' },
          ]}
        />

        {mode === 'month' ? (
          <Calendar
            key={theme.scheme}
            current={selectedDate}
            firstDay={CALENDAR_FIRST_DAY}
            markingType="multi-dot"
            markedDates={markedDates}
            onDayPress={(day: { dateString: string }) => setSelectedDate(day.dateString)}
            enableSwipeMonths
            theme={{
              backgroundColor: theme.colors.background,
              calendarBackground: theme.colors.background,
              textSectionTitleColor: theme.colors.textMuted,
              dayTextColor: theme.colors.text,
              todayTextColor: theme.colors.accent,
              monthTextColor: theme.colors.text,
              arrowColor: theme.colors.accent,
              selectedDayBackgroundColor: theme.colors.accent,
              selectedDayTextColor: theme.colors.textInverse,
              textDisabledColor: theme.colors.border,
              textDayFontSize: 17,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 13,
            }}
          />
        ) : (
          <WeekStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} dots={dots} />
        )}

        <View style={{ gap: theme.spacing.sm, paddingTop: theme.spacing.sm }}>
          <Text variant="subtitle">{capitalize(formatFullDate(selectedDate))}</Text>

          {dayLessons.length === 0 && daySlots.length === 0 ? (
            <EmptyState
              title="В этот день уроков нет"
              description="Можно создать конспект на эту дату."
              actionTitle="Новый конспект"
              onAction={() => router.push(`/lesson/new?date=${selectedDate}`)}
            />
          ) : (
            <>
              {dayLessons.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  showGroupName
                  onPress={() => router.push(`/lesson/${lesson.id}`)}
                />
              ))}

              {daySlots
                .filter((item) => !item.hasLesson)
                .map((item) => {
                  const group = groups.find((candidate) => candidate.id === item.slot.groupId);

                  return (
                    <ScheduleSlotCard
                      key={item.slot.id}
                      groupName={group?.name ?? 'Группа'}
                      groupColorHex={group?.colorHex ?? theme.colors.border}
                      startTime={item.slot.startTime}
                      endTime={item.slot.endTime}
                      durationMinutes={item.durationMinutes}
                      cancelled={item.cancelled}
                      onCreateLesson={() =>
                        handleCreateFromSlot(
                          item.slot.groupId,
                          item.slot.startTime,
                          item.durationMinutes,
                        )
                      }
                      onCancel={() => {
                        cancelSlotOnDate(db, item.slot.id, selectedDate);
                        bumpDbRevision();
                      }}
                      onRestore={() => {
                        restoreSlotOnDate(db, item.slot.id, selectedDate);
                        bumpDbRevision();
                      }}
                    />
                  );
                })}

              <Button
                title="Новый конспект на этот день"
                variant="secondary"
                onPress={() => router.push(`/lesson/new?date=${selectedDate}`)}
              />
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
