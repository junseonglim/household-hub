// "양파 2개" 같은 한 줄을 이름 · 수량 · 단위 · 메모로 나눈다 (docs/modules/cooking.md 4.3절).
// 장보기 빠른 추가와 레시피 재료 입력이 함께 쓴다. 나뉘지 않으면 이름만 남긴다.

export type ParsedItem = {
  name: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
};

/** 숫자 대신 쓰는 양 표현은 메모로 옮긴다 ('소금 약간' → 이름 '소금', 메모 '약간') */
const VAGUE_AMOUNTS = [
  '약간',
  '적당량',
  '적당히',
  '조금',
  '취향껏',
  '한 줌',
  '한줌',
  '톡톡',
  '넉넉히',
];

const KOREAN_NUMBERS: Record<string, number> = {
  한: 1,
  하나: 1,
  두: 2,
  둘: 2,
  세: 3,
  셋: 3,
  네: 4,
  넷: 4,
  다섯: 5,
};

/** '2', '0.5', '1/2', '1,5' → 숫자. 비었으면 null, 숫자가 아니면 undefined */
export function parseQuantity(text: string): number | null | undefined {
  const value = text.trim();
  if (!value) return null;
  const fraction = /^(\d+)\s*\/\s*(\d+)$/.exec(value);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator === 0 ? undefined : Number(fraction[1]) / denominator;
  }
  if (!/^\d+(?:[.,]\d+)?$/.test(value)) return undefined;
  return Number(value.replace(',', '.'));
}

const NUMBER_AT_END = /^(.*?)\s*(\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?)\s*([^\d\s/][^\s]*)?$/;
const KOREAN_NUMBER_AT_END = new RegExp(
  `^(.+?)\\s+(${Object.keys(KOREAN_NUMBERS).join('|')})\\s*([^\\d\\s]+)$`,
);

export function parseItemLine(line: string): ParsedItem | null {
  let rest = line.trim().replace(/\s+/g, ' ');
  if (!rest) return null;

  const notes: string[] = [];
  const parenthesis = /\s*\(([^)]*)\)$/.exec(rest);
  if (parenthesis) {
    if (parenthesis[1]!.trim()) notes.push(parenthesis[1]!.trim());
    rest = rest.slice(0, parenthesis.index).trim();
  }
  const vague = VAGUE_AMOUNTS.find((word) => rest.endsWith(` ${word}`));
  if (vague) {
    notes.unshift(vague);
    rest = rest.slice(0, -vague.length).trim();
  }
  const note = notes.length > 0 ? notes.join(', ') : null;

  const numeric = NUMBER_AT_END.exec(rest);
  // '1+1 우유'처럼 숫자가 이름의 일부면 나누지 않는다
  if (numeric && numeric[1]!.trim() && !/[+\-*×]$/.test(numeric[1]!)) {
    const quantity = parseQuantity(numeric[2]!);
    if (typeof quantity === 'number') {
      return { name: numeric[1]!.trim(), quantity, unit: numeric[3] ?? null, note };
    }
  }
  const korean = KOREAN_NUMBER_AT_END.exec(rest);
  if (korean) {
    return {
      name: korean[1]!.trim(),
      quantity: KOREAN_NUMBERS[korean[2]!]!,
      unit: korean[3]!,
      note,
    };
  }
  return { name: rest || line.trim(), quantity: null, unit: null, note };
}

/** 2 + '개' → '2개', 0.5 + 'L' → '0.5L', 수량이 없으면 단위만 */
export function formatQuantity(quantity: number | null, unit: string | null): string {
  if (quantity === null) return unit ?? '';
  const rounded = Math.round(quantity * 100) / 100;
  return `${rounded}${unit ?? ''}`;
}

/** 다시 한 줄로 (레시피 재료 수정 화면에서 쓴다) */
export function formatItemLine(item: ParsedItem): string {
  const amount = formatQuantity(item.quantity, item.unit);
  const base = amount ? `${item.name} ${amount}` : item.name;
  if (!item.note) return base;
  return VAGUE_AMOUNTS.includes(item.note) ? `${base} ${item.note}` : `${base} (${item.note})`;
}

/** 같은 품목인지 비교할 때 쓰는 이름 (앞뒤 공백 제거 · 공백 하나로 · 소문자) */
export function normalizeItemName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}
