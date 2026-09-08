import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Calendar } from 'react-native-calendars';

import {
  getUpcomingLesson,
  listLessonsBetween,
  listLessonsByDate,
} from '@/db/repositories/lessons.repo';
import { useDbQuery } from '@/db/useDbQuery';
import { WeekStrip, type DayDots } from '@/features/calendar/components/WeekStrip';
import { LessonCard } from '@/features/lessons/components/LessonCard';
import { addDays, formatFullDate, formatLessonDate, todayKey } from '@/lib/date';
import { CALENDAR_FIRST_DAY } from '@/lib/calendarLocale';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, EmptyState, Screen, SegmentedControl, Text } from '@/ui';

export default function CalendarScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [mode, setMode] = useState<'month' | 'week'>('month');
  const [selectedDate, setSelectedDate] = useState(todayKey());

  const upcoming = useDbQuery((db) => getUpcomingLesson(db, todayKey()), []);
  const dayLessons = useDbQuery((db) => listLessonsByDate(db, selectedDate), [selectedDate]);

  // Точки в календаре: берём уроки на полгода вокруг выбранной даты.
  const periodLessons = useDbQuery(
    (db) => listLessonsBetween(db, addDays(selectedDate, -180), addDays(selectedDate, 180)),
    [selectedDate],
  );

  const dots: DayDots = {};
  for (const lesson of periodLessons) {
    const list = dots[lesson.date] ?? [];
    if (!list.includes(lesson.groupColorHex)) list.push(lesson.groupColorHex);
    dots[lesson.date] = list;
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

          {dayLessons.length === 0 ? (
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
