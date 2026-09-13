import { describe, expect, it } from 'vitest';
import { defineRouting } from 'next-intl/routing';
import idMessages from './messages/id.json';
import enMessages from './messages/en.json';

describe('i18n (Fase 0)', () => {
  it('routing mendefinisikan locale id + en dengan default id', () => {
    const routing = defineRouting({
      locales: ['id', 'en'],
      defaultLocale: 'id',
      localePrefix: 'as-needed',
    });
    expect(routing.locales).toContain('id');
    expect(routing.locales).toContain('en');
    expect(routing.defaultLocale).toBe('id');
  });

  it('messages id + en punya kunci common.appName yang sama', () => {
    expect(idMessages.common.appName).toBeTruthy();
    expect(enMessages.common.appName).toBeTruthy();
    expect(Object.keys(enMessages.common)).toEqual(Object.keys(idMessages.common));
  });
});
