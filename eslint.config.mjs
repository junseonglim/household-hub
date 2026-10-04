import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

// 모듈 의존 규칙 (docs/03-architecture.md 4절)
// - 기능 모듈끼리는 서로 import하지 않는다.
// - core는 기능 모듈을 import하지 않는다.
const featureModules = ['cleaning', 'cooking', 'childcare'];

const importPatternsFor = (moduleNames) =>
  moduleNames.flatMap((name) => [
    `@/modules/${name}`,
    `@/modules/${name}/**`,
    `**/${name}`,
    `**/${name}/**`,
  ]);

const featureBoundaries = featureModules.map((name) => ({
  files: [`src/modules/${name}/**/*.{ts,tsx}`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: importPatternsFor(featureModules.filter((other) => other !== name)),
            message:
              '모듈끼리는 직접 import하지 않습니다. core를 거치거나 app 계층에서 조합하세요 (docs/03-architecture.md 4절).',
          },
        ],
      },
    ],
  },
}));

const coreBoundary = {
  files: ['src/modules/core/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: importPatternsFor(featureModules),
            message: 'core는 기능 모듈(cleaning · cooking · childcare)에 의존하지 않습니다.',
          },
        ],
      },
    ],
  },
};

// await를 빠뜨린 Promise를 잡는다 (타입 정보가 필요한 규칙)
const promiseSafety = {
  files: ['**/*.{ts,tsx}'],
  languageOptions: {
    parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
  },
  rules: {
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': [
      'error',
      { checksVoidReturn: { attributes: false } },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  promiseSafety,
  ...featureBoundaries,
  coreBoundary,
  prettier,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'src/db/migrations/**',
    'playwright-report/**',
    'test-results/**',
  ]),
]);

export default eslintConfig;
