// 폼 칸 이름. 브라우저 화면과 서버 폼 해석(validators.ts)이 함께 쓴다.

/** 반복 규칙 입력 칸 이름 (처음 설정 화면에서는 앞에 't3.' 같은 접두어가 붙는다) */
export const RECURRENCE_FIELDS = {
  type: 'recurrenceType',
  weekdays: 'weekdays',
  monthDay: 'monthDay',
  everyDays: 'everyDays',
  dueDate: 'dueDate',
} as const;

/** 처음 설정 폼: 템플릿 순번마다 't{순번}.' 접두어가 붙은 칸 */
export const setupFieldPrefix = (index: number) => `t${index}.`;
