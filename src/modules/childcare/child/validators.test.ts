import { describe, expect, it } from 'vitest';
import { bornSchema, registerChildSchema, updateChildSchema } from './validators';

const TODAY = '2026-10-12';
const CHILD_ID = '0199d6a0-0000-7000-8000-000000000001';
const errorsOf = (result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  result.error?.issues.map((issue) => issue.path.join('.')) ?? [];

describe('아이 등록', () => {
  it('출산 전이면 예정일이 필요하고, 오늘부터 300일 안이어야 한다', () => {
    const schema = registerChildSchema(TODAY);
    expect(schema.parse({ name: ' 콩이 ', stage: 'expecting', dueDate: '2027-03-15' })).toEqual({
      name: '콩이',
      stage: 'expecting',
      dueDate: '2027-03-15',
      birthDate: null,
      sex: null,
      weightKg: null,
      heightCm: null,
    });
    expect(errorsOf(schema.safeParse({ name: '콩이', stage: 'expecting' }))).toEqual(['dueDate']);
    expect(
      errorsOf(schema.safeParse({ name: '콩이', stage: 'expecting', dueDate: '2072-03-15' })),
    ).toEqual(['dueDate']);
  });

  it('이미 태어났으면 생년월일이 오늘이나 그 전이어야 하고, 몸무게 · 키를 반올림한다', () => {
    const schema = registerChildSchema(TODAY);
    expect(
      schema.parse({
        name: '하늘',
        stage: 'born',
        birthDate: '2026-10-01',
        sex: 'female',
        weightKg: '3.256',
        heightCm: '50.44',
      }),
    ).toMatchObject({ birthDate: '2026-10-01', sex: 'female', weightKg: 3.26, heightCm: 50.4 });
    expect(
      errorsOf(schema.safeParse({ name: '하늘', stage: 'born', birthDate: '2026-10-13' })),
    ).toEqual(['birthDate']);
    expect(
      errorsOf(
        schema.safeParse({ name: '하늘', stage: 'born', birthDate: '2026-10-01', weightKg: '32' }),
      ),
    ).toEqual(['weightKg']);
  });

  it('이름이 없거나 성별 값이 틀리면 거른다', () => {
    const result = registerChildSchema(TODAY).safeParse({
      name: ' ',
      stage: 'expecting',
      dueDate: '2027-03-15',
      sex: 'other',
    });
    expect(errorsOf(result)).toEqual(['name', 'sex']);
  });
});

describe('태어났어요 · 고치기', () => {
  it('태어난 날은 미래일 수 없다', () => {
    const schema = bornSchema(TODAY);
    expect(schema.safeParse({ childId: CHILD_ID, name: '하늘', birthDate: TODAY }).success).toBe(
      true,
    );
    expect(
      errorsOf(schema.safeParse({ childId: CHILD_ID, name: '하늘', birthDate: '2026-10-13' })),
    ).toEqual(['birthDate']);
  });

  it('출산 전 아이를 고칠 때는 예정일이 있어야 한다', () => {
    const schema = updateChildSchema(TODAY);
    expect(errorsOf(schema.safeParse({ childId: CHILD_ID, name: '콩이' }))).toEqual(['dueDate']);
    expect(
      schema.safeParse({ childId: CHILD_ID, name: '하늘', birthDate: '2026-10-01' }).success,
    ).toBe(true);
  });
});
