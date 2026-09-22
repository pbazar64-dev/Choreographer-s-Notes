/**
 * Работа с zip-архивами: и резервная копия, и набор материалов — это zip.
 *
 * Библиотека архивации подключается лениво, при первом обращении: expo-router
 * загружает все экраны при старте, и падение нативного модуля на импорте
 * уронило бы всё приложение, а не только обмен файлами.
 */
export function zipArchive() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native-zip-archive') as typeof import('react-native-zip-archive');
}
