import { LocaleConfig } from 'react-native-calendars';

/** Русская локаль для календаря. Неделя начинается с понедельника (firstDay={1}). */
const locale = {
  monthNames: [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
  ],
  monthNamesShort: [
    'янв',
    'фев',
    'мар',
    'апр',
    'май',
    'июн',
    'июл',
    'авг',
    'сен',
    'окт',
    'ноя',
    'дек',
  ],
  dayNames: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
  dayNamesShort: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'],
  today: 'Сегодня',
};

const config = LocaleConfig as unknown as {
  locales: Record<string, typeof locale>;
  defaultLocale: string;
};

config.locales.ru = locale;
config.defaultLocale = 'ru';

export const CALENDAR_FIRST_DAY = 1;
