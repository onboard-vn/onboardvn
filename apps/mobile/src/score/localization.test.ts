import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as ts from 'typescript';
import { afterEach, describe, expect, it } from 'vitest';
import { euroGuides } from './guides/euro-guides';
import { mixedGuides } from './guides/mixed-guides';
import { strategyGuides } from './guides/strategy-guides';
import type { GameGuide } from './guides/types';
import { scoreFeedbackText, scorePlayerName, scoreText, scoreTieNote, templateScoreText } from './localization';
import { templateList } from './templates';
import { setActiveLanguage, type Language } from '../ui/i18n';

const languages: Language[] = ['vi', 'en'];

afterEach(() => setActiveLanguage('vi'));

function stringsFromGuide(guide: GameGuide): string[] {
  return [
    guide.edition,
    guide.summary,
    ...(guide.limitations ?? []),
    ...(guide.companion ? [guide.companion.label, guide.companion.hint ?? ''] : []),
    ...guide.groups.flatMap((group) => [
      group.title,
      group.hint ?? '',
      ...group.fields.flatMap((field) => [
        field.label ?? '',
        field.hint ?? '',
        ...Object.values(field.inputs ?? {}),
        ...(field.choices ?? []).map((choice) => choice.label),
        ...Object.values(field.inputChoices ?? {}).flatMap((choices) =>
          choices.map((choice) => choice.label),
        ),
      ]),
    ]),
  ].filter(Boolean);
}

function visibleStringsFromRegistry(): string[] {
  const path = join(dirname(fileURLToPath(import.meta.url)), 'registry.ts');
  const source = ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const visibleProperties = new Set(['edition', 'summary', 'title', 'label', 'hint']);
  const visibleContainers = new Set(['limitations', 'inputs']);
  const excludedProperties = new Set(['icon', 'key', 'requiredKeys', 'sources', 'url']);
  const values: string[] = [];

  const propertyName = (name: ts.PropertyName | undefined) =>
    name && (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name))
      ? name.text
      : null;

  const collect = (node: ts.Node, includeStrings = false) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (includeStrings) values.push(node.text);
      return;
    }
    if (ts.isPropertyAssignment(node)) {
      const name = propertyName(node.name);
      if (!name || excludedProperties.has(name)) return;
      collect(node.initializer, includeStrings || visibleProperties.has(name) || visibleContainers.has(name));
      return;
    }
    if (ts.isSpreadAssignment(node)) return;
    ts.forEachChild(node, (child) => collect(child, includeStrings));
  };

  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'gameGuides' && node.initializer) {
      collect(node.initializer);
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      node.left.getText(source) === 'gameGuides.vantage.companion'
    ) {
      collect(node.right);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return values;
}

describe('score localization completeness', () => {
  it('localizes known feedback and preserves unknown runtime details', () => {
    const unknownWarning = 'Rule evaluator rejected this score: maximum is 12.';

    setActiveLanguage('en');
    expect(scoreFeedbackText(unknownWarning)).toBe(unknownWarning);
    expect(scoreFeedbackText('Chọn ít nhất một người thắng.')).toBe('Select at least one winner.');
    expect(scoreFeedbackText('Hòa điểm cao nhất: Linh, Mai cùng thắng.')).toBe(
      'Tie for highest score: Linh, Mai share the win.',
    );
    expect(scoreFeedbackText('Hòa điểm cao nhất: Linh, Mai. Xem ghi chú luật bên dưới.')).toBe(
      'Tie for highest score: Linh, Mai. See the rules note below.',
    );
  });

  it('localizes generated seat names while preserving player-entered names', () => {
    const players = [
      { id: 'fallback', name: 'Người chơi 2', fallbackSeat: 2 },
      { id: 'named', name: 'Người chơi 1' },
    ];

    setActiveLanguage('en');
    expect(scorePlayerName(players[0]!)).toBe('Player 2');
    expect(scorePlayerName(players[1]!)).toBe('Người chơi 1');
    expect(scoreTieNote(players, ['fallback', 'named'], true)).toBe(
      'Tie for highest score: Player 2, Người chơi 1 share the win.',
    );
  });

  it('resolves every visible guide field in both languages', () => {
    const sourceGuides = [strategyGuides, euroGuides, mixedGuides]
      .flatMap((collection) => Object.values(collection))
      .flatMap(stringsFromGuide);
    const registryGuides = visibleStringsFromRegistry();
    const visibleCopy = [...new Set([...sourceGuides, ...registryGuides])];

    expect(visibleCopy.length).toBeGreaterThan(400);
    for (const source of visibleCopy) {
      for (const language of languages) {
        setActiveLanguage(language);
        expect(() => scoreText(source), `${language}: ${source}`).not.toThrow();
        expect(scoreText(source), `${language}: ${source}`).not.toBe('');
      }
    }
  });

  it('localizes every rendered value from the bundled scoring templates', () => {
    let checkedValues = 0;
    const resolve = (source: string) => {
      for (const language of languages) {
        setActiveLanguage(language);
        expect(() => scoreText(source), `${language}: ${source}`).not.toThrow();
        expect(scoreText(source), `${language}: ${source}`).not.toBe('');
      }
      checkedValues += 1;
    };

    for (const template of templateList) {
      for (const category of template.categories) {
        if (category.labelVi && category.labelVi !== category.label) {
          expect(templateScoreText(category.labelVi, category.label, 'vi')).toBe(category.labelVi);
          expect(templateScoreText(category.labelVi, category.label, 'en')).toBe(category.label);
        } else {
          resolve(category.label);
        }
        if (category.hint) resolve(category.hint);
        if (category.expansion) resolve(category.expansion);
        for (const input of category.inputs ?? []) resolve(input);
      }
      for (const role of template.roles ?? []) {
        if (role.labelVi && role.labelVi !== role.label) {
          expect(templateScoreText(role.labelVi, role.label, 'vi')).toBe(role.labelVi);
          expect(templateScoreText(role.labelVi, role.label, 'en')).toBe(role.label);
        } else {
          resolve(role.label);
        }
      }
      for (const tiebreaker of template.tiebreakers ?? []) {
        resolve(tiebreaker.description);
        if (tiebreaker.descriptionVi) resolve(tiebreaker.descriptionVi);
      }
    }

    expect(templateList.length).toBeGreaterThan(30);
    expect(checkedValues).toBeGreaterThan(400);
  });
});
