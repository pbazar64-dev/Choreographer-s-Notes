/** Виды блоков урока. 'free' — «свободный»: название пользователь пишет сам в заголовке блока. */
export const BLOCK_KINDS = [
  { code: 'warmup', label: 'Разминка' },
  { code: 'cross', label: 'Кросс' },
  { code: 'floor', label: 'Партер' },
  { code: 'combination', label: 'Комбинация' },
  { code: 'stretch', label: 'Растяжка' },
  { code: 'improv', label: 'Импровизация' },
  { code: 'theory', label: 'Теория' },
  { code: 'free', label: 'Свободный' },
] as const;

export type BlockKind = (typeof BLOCK_KINDS)[number]['code'];

export const DEFAULT_BLOCK_KIND: BlockKind = 'free';

export function blockKindLabel(code: string): string {
  return BLOCK_KINDS.find((kind) => kind.code === code)?.label ?? 'Свободный';
}
