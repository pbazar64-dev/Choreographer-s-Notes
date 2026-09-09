import { moveItem } from '@/lib/reorder';

describe('перемещение элемента списка', () => {
  const items = ['Разминка', 'Кросс', 'Партер', 'Растяжка'];

  it('двигает элемент вверх', () => {
    expect(moveItem(items, 2, 1)).toEqual(['Разминка', 'Партер', 'Кросс', 'Растяжка']);
  });

  it('двигает элемент вниз', () => {
    expect(moveItem(items, 0, 1)).toEqual(['Кросс', 'Разминка', 'Партер', 'Растяжка']);
  });

  it('не выходит за границы списка', () => {
    expect(moveItem(items, 0, -1)).toEqual(items);
    expect(moveItem(items, 3, 4)).toEqual(items);
    expect(moveItem(items, 1, 1)).toEqual(items);
  });

  it('не портит исходный массив', () => {
    const source = [...items];
    moveItem(source, 0, 3);
    expect(source).toEqual(items);
  });
});
