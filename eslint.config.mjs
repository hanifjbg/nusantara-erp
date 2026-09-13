// Fase 0 — Nx module boundaries (AGENTS.md: akses lintas lib wajib lewat public API index.ts)
import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/out-tsc/**',
      '**/node_modules/**',
      '**/*.config.{js,mjs,cjs,ts}',
      'apps/web/next-env.d.ts',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          // false: lib domain privat dikonsumsi via source (tsconfig paths), bukan build output.
          // Pagar tetap: depConstraints per domain + larangan deep import (allow: []).
          enforceBuildableLibDependency: false,
          allowCircularSelfDependency: false,
          banTransitiveDependencies: false,
          allow: [],
          depConstraints: [
            // shared/ui tidak boleh tergantung ke domain manapun
            { sourceTag: 'domain:shared', onlyDependOnLibsWithTags: ['domain:shared'] },
            // tiap domain hanya boleh ke dirinya sendiri + shared
            { sourceTag: 'domain:identity', onlyDependOnLibsWithTags: ['domain:identity', 'domain:shared'] },
            // org boleh memakai fondasi identity (tenants/users untuk FK + helper) + shared
            {
              sourceTag: 'domain:org',
              onlyDependOnLibsWithTags: ['domain:org', 'domain:identity', 'domain:shared'],
            },
            // master-data memakai fondasi identity (tenants) + org (organizations/addresses) + shared
            {
              sourceTag: 'domain:master-data',
              onlyDependOnLibsWithTags: ['domain:master-data', 'domain:org', 'domain:identity', 'domain:shared'],
            },
            // workflow memakai fondasi identity (tenants/users) + shared
            {
              sourceTag: 'domain:workflow',
              onlyDependOnLibsWithTags: ['domain:workflow', 'domain:identity', 'domain:shared'],
            },
            // inventory memakai fondasi identity (tenants) + master-data (items/warehouses) + shared
            {
              sourceTag: 'domain:inventory',
              onlyDependOnLibsWithTags: ['domain:inventory', 'domain:master-data', 'domain:identity', 'domain:shared'],
            },
            { sourceTag: 'domain:sales-crm', onlyDependOnLibsWithTags: ['domain:sales-crm', 'domain:shared'] },
            { sourceTag: 'domain:procurement', onlyDependOnLibsWithTags: ['domain:procurement', 'domain:shared'] },
            { sourceTag: 'domain:finance', onlyDependOnLibsWithTags: ['domain:finance', 'domain:shared'] },
            { sourceTag: 'domain:pos', onlyDependOnLibsWithTags: ['domain:pos', 'domain:shared'] },
            { sourceTag: 'domain:manufacturing', onlyDependOnLibsWithTags: ['domain:manufacturing', 'domain:shared'] },
            { sourceTag: 'domain:hr-core', onlyDependOnLibsWithTags: ['domain:hr-core', 'domain:shared'] },
            { sourceTag: 'domain:payroll-id', onlyDependOnLibsWithTags: ['domain:payroll-id', 'domain:shared'] },
            {
              sourceTag: 'domain:recruitment-training',
              onlyDependOnLibsWithTags: ['domain:recruitment-training', 'domain:shared'],
            },
            { sourceTag: 'domain:fixed-assets', onlyDependOnLibsWithTags: ['domain:fixed-assets', 'domain:shared'] },
            { sourceTag: 'domain:project', onlyDependOnLibsWithTags: ['domain:project', 'domain:shared'] },
            { sourceTag: 'domain:field-service', onlyDependOnLibsWithTags: ['domain:field-service', 'domain:shared'] },
            { sourceTag: 'domain:logistics', onlyDependOnLibsWithTags: ['domain:logistics', 'domain:shared'] },
            { sourceTag: 'domain:marketplace', onlyDependOnLibsWithTags: ['domain:marketplace', 'domain:shared'] },
            { sourceTag: 'domain:support', onlyDependOnLibsWithTags: ['domain:support', 'domain:shared'] },
            { sourceTag: 'domain:document-legal', onlyDependOnLibsWithTags: ['domain:document-legal', 'domain:shared'] },
            { sourceTag: 'domain:platform', onlyDependOnLibsWithTags: ['domain:platform', 'domain:shared'] },
            // apps (web/api) boleh mengonsumsi lib manapun lewat public API
            { sourceTag: 'type:app', onlyDependOnLibsWithTags: ['*'] },
            { sourceTag: 'scope:web', onlyDependOnLibsWithTags: ['*'] },
            { sourceTag: 'scope:api', onlyDependOnLibsWithTags: ['*'] },
          ],
        },
      ],
    },
  },
];
