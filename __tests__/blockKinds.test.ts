import { blockKindLabel, titleForKindChange } from '@/constants/blockKinds';

describe('название блока следует за видом', () => {
  it('подставляет вид в пустое название', () => {
    expect(titleForKindChange('', 'free', 'warmup')).toBe('Разминка');
  });

  it('заменяет название, которое подставилось само', () => {
    expect(titleForKindChange('Разминка', 'warmup', 'cross')).toBe('Кросс');
    expect(titleForKindChange('  Разминка  ', 'warmup', 'floor')).toBe('Партер');
  });

  it('не трогает название, написанное руками', () => {
    expect(titleForKindChange('Разминка у станка', 'warmup', 'cross')).toBe('Разминка у станка');
    expect(titleForKindChange('Своё название', 'free', 'theory')).toBe('Своё название');
  });

  it('знает подписи видов', () => {
    expect(blockKindLabel('improv')).toBe('Импровизация');
    expect(blockKindLabel('неизвестный')).toBe('Свободный');
  });
});
