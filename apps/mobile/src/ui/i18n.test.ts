import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as ts from 'typescript';
import { afterEach, describe, expect, it } from 'vitest';
import { featureUiTranslations } from '../i18n/feature-ui-translations';
import { scoreText } from '../score/localization';
import { adminUiTranslations } from '../i18n/admin-ui-translations';
import { myCafesTranslations } from '../i18n/my-cafes-translations';
import { routeUiTranslations } from '../i18n/route-ui-translations';
import { scoreUiTranslations } from '../i18n/score-ui-translations';
import { staticPageTranslations } from '../i18n/static-page-translations';
import { scoreGuideTranslations } from '../i18n/score-guide-translations';
import {
  getActiveLanguage,
  localizedContent,
  localizedScoreGuide,
  setActiveLanguage,
  translateKnown,
  t,
} from './i18n';

const placeholders = (value: string) =>
  [...new Set([...value.matchAll(/\{([a-zA-Z][\w]*)\}/g)].map((match) => match[1]))].sort();

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(path)
      : /\.tsx?$/.test(path) && !path.includes('.test.')
        ? [path]
        : [];
  });
}

afterEach(() => setActiveLanguage('vi'));

describe('global language', () => {
  it('switches authored copy and interpolates user values without translating them', () => {
    setActiveLanguage('en');
    expect(getActiveLanguage()).toBe('en');
    expect(t('Mã gửi tới {email}', { email: 'người-dùng@example.test' })).toBe(
      'Code sent to người-dùng@example.test',
    );
    setActiveLanguage('vi');
    expect(t('Mã gửi tới {email}', { email: 'người-dùng@example.test' })).toBe(
      'Mã gửi tới người-dùng@example.test',
    );
  });

  it('re-localizes stored authored errors while preserving unknown text', () => {
    setActiveLanguage('en');
    expect(translateKnown('Mật khẩu cần ít nhất 8 ký tự')).toBe(
      'Password must contain at least 8 characters',
    );
    expect(translateKnown('Mã gửi tới người-dùng@example.test')).toBe(
      'Code sent to người-dùng@example.test',
    );
    setActiveLanguage('vi');
    expect(translateKnown('Password must contain at least 8 characters')).toBe(
      'Mật khẩu cần ít nhất 8 ký tự',
    );
    expect(translateKnown('Unrecognized server response: sample-123')).toBe(
      'Unrecognized server response: sample-123',
    );
  });

  it('has nonempty paired copy with matching interpolation fields', () => {
    const maps = {
      featureUiTranslations,
      adminUiTranslations,
      myCafesTranslations,
      routeUiTranslations,
      scoreUiTranslations,
    };
    const failures: string[] = [];
    for (const [mapName, map] of Object.entries(maps)) {
      for (const [key, message] of Object.entries(map)) {
        if (!message.vi.trim() || !message.en.trim()) failures.push(`${mapName}: empty ${key}`);
        if (JSON.stringify(placeholders(message.vi)) !== JSON.stringify(placeholders(message.en))) {
          failures.push(`${mapName}: mismatched interpolation ${key}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('resolves every literal translation call used by application source', () => {
    const root = dirname(dirname(fileURLToPath(import.meta.url)));
    const failures: string[] = [];
    for (const path of sourceFiles(root)) {
      if (path.includes('/i18n/')) continue;
      const source = ts.createSourceFile(
        path,
        readFileSync(path, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
      );
      const visit = (node: ts.Node) => {
        if (
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          ['t', 'scoreText'].includes(node.expression.text) &&
          node.arguments[0] &&
          ts.isStringLiteral(node.arguments[0])
        ) {
          const key = node.arguments[0].text;
          const values = Object.fromEntries(placeholders(key).map((name) => [name, name]));
          for (const language of ['vi', 'en'] as const) {
            setActiveLanguage(language);
            try {
              if (node.expression.text === 'scoreText') scoreText(key, values);
              else t(key, values);
            } catch (error) {
              failures.push(`${path}: ${language}: ${String(error)}`);
            }
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    expect(failures).toEqual([]);
  });

  it('does not leave Vietnamese copy directly embedded in rendered JSX', () => {
    const root = dirname(dirname(fileURLToPath(import.meta.url)));
    const vietnamese = /[ăâđêôơưĂÂĐÊÔƠƯàáạảãèéẹẻẽìíịỉĩòóọỏõùúụủũỳýỵỷỹ]/i;
    const failures: string[] = [];
    for (const path of sourceFiles(root).filter((path) => path.endsWith('.tsx'))) {
      const source = ts.createSourceFile(
        path,
        readFileSync(path, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
      );
      const visit = (node: ts.Node) => {
        const text = ts.isJsxText(node)
          ? node.text
          : ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)
            ? node.initializer.text
            : null;
        if (text && vietnamese.test(text)) failures.push(`${path}: ${text.trim()}`);
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    expect(failures).toEqual([]);
  });

  it('provides English for every bundled static content and score guide entry', () => {
    setActiveLanguage('en');
    for (const [vietnamese, english] of Object.entries(staticPageTranslations)) {
      expect(localizedContent(vietnamese)).toBe(english);
    }
    for (const [vietnamese, english] of Object.entries(scoreGuideTranslations)) {
      expect(localizedScoreGuide(vietnamese)).toBe(english);
    }
  });
});
