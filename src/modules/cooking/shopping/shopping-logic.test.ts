import { describe, expect, it } from 'vitest';
import { guessCategory } from './category';
import { isPantryStaple, mergeIngredients } from './merge';
import { formatItemLine, formatQuantity, parseItemLine, parseQuantity } from './parse';

describe('한 줄 나누기 (빠른 추가 · 레시피 재료)', () => {
  it.each([
    ['양파 2개', { name: '양파', quantity: 2, unit: '개', note: null }],
    ['대파 1단', { name: '대파', quantity: 1, unit: '단', note: null }],
    ['돼지고기 앞다리 600g', { name: '돼지고기 앞다리', quantity: 600, unit: 'g', note: null }],
    ['우유 1.5L', { name: '우유', quantity: 1.5, unit: 'L', note: null }],
    ['양파 1/2개', { name: '양파', quantity: 0.5, unit: '개', note: null }],
    ['물 2 컵', { name: '물', quantity: 2, unit: '컵', note: null }],
    ['계란 10', { name: '계란', quantity: 10, unit: null, note: null }],
    ['두부 한 모', { name: '두부', quantity: 1, unit: '모', note: null }],
    ['비타500 2병', { name: '비타500', quantity: 2, unit: '병', note: null }],
    ['소금 약간', { name: '소금', quantity: null, unit: null, note: '약간' }],
    ['마늘 3쪽 (다진 것)', { name: '마늘', quantity: 3, unit: '쪽', note: '다진 것' }],
    ['두부', { name: '두부', quantity: null, unit: null, note: null }],
    ['1+1 우유', { name: '1+1 우유', quantity: null, unit: null, note: null }],
    ['  키친타월   ', { name: '키친타월', quantity: null, unit: null, note: null }],
  ])('%s', (line, expected) => {
    expect(parseItemLine(line)).toEqual(expected);
  });

  it('빈 줄은 무시한다', () => {
    expect(parseItemLine('   ')).toBeNull();
  });

  it('수량 칸 입력', () => {
    expect(parseQuantity('0.5')).toBe(0.5);
    expect(parseQuantity('1/2')).toBe(0.5);
    expect(parseQuantity('1,5')).toBe(1.5);
    expect(parseQuantity('')).toBeNull();
    expect(parseQuantity('조금')).toBeUndefined();
    expect(parseQuantity('1/0')).toBeUndefined();
  });

  it('다시 한 줄로 쓴다', () => {
    expect(formatQuantity(2, '개')).toBe('2개');
    expect(formatQuantity(0.333333, 'L')).toBe('0.33L');
    expect(formatQuantity(null, null)).toBe('');
    expect(formatItemLine({ name: '소금', quantity: null, unit: null, note: '약간' })).toBe(
      '소금 약간',
    );
    expect(formatItemLine({ name: '마늘', quantity: 3, unit: '쪽', note: '다진 것' })).toBe(
      '마늘 3쪽 (다진 것)',
    );
    // 다시 나누면 같은 값이 나온다
    expect(parseItemLine('마늘 3쪽 (다진 것)')).toEqual(
      parseItemLine(formatItemLine(parseItemLine('마늘 3쪽 (다진 것)')!)),
    );
  });
});

describe('카테고리 추정', () => {
  it.each([
    ['양파', '채소·과일'],
    ['청양고추', '채소·과일'],
    ['고추장', '양념·가공'],
    ['돼지고기 앞다리', '육류·해산물'],
    ['계란', '유제품·계란'],
    ['키친타월', '생활용품'],
    ['건전지 AA', '생활용품'],
    ['알 수 없는 것', '기타'],
  ])('%s → %s', (name, category) => {
    expect(guessCategory(name)).toBe(category);
  });
});

describe('식단 재료 합치기', () => {
  it('이름 · 단위가 같으면 수량을 더하고, 들어가는 메뉴를 모은다', () => {
    const merged = mergeIngredients([
      { name: '양파', quantity: 1, unit: '개', recipeTitle: '된장찌개' },
      { name: ' 양파 ', quantity: 0.5, unit: '개', recipeTitle: '카레' },
      { name: '양파', quantity: 100, unit: 'g', recipeTitle: '카레' },
      { name: '소금', quantity: null, unit: null, recipeTitle: '된장찌개' },
      { name: '소금', quantity: null, unit: null, recipeTitle: '카레' },
      { name: '양파', quantity: 1, unit: '개', recipeTitle: '된장찌개' },
    ]);
    expect(
      merged.map(({ name, quantity, unit, recipes }) => ({ name, quantity, unit, recipes })),
    ).toEqual([
      { name: '양파', quantity: 2.5, unit: '개', recipes: ['된장찌개', '카레'] },
      { name: '양파', quantity: 100, unit: 'g', recipes: ['카레'] },
      { name: '소금', quantity: null, unit: null, recipes: ['된장찌개', '카레'] },
    ]);
  });

  it('집에 늘 있는 양념은 따로 표시한다', () => {
    expect(isPantryStaple(' 간장')).toBe(true);
    expect(isPantryStaple('다진 마늘')).toBe(true);
    expect(isPantryStaple('양파')).toBe(false);
  });
});
