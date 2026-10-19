import {
  CRITTER_KITCHEN_CATALOG,
  type CritterKitchenCriticEntry,
  type CritterKitchenRumorEntry,
} from './catalog.js';
import {
  CRITTER_KITCHEN_BASE_COURSE_IDS,
  CRITTER_KITCHEN_COURSE_IDS,
  CRITTER_KITCHEN_MEAL_CATEGORY_KEY,
  CRITTER_KITCHEN_SCALAR_KEYS,
  critterKitchenDefaultSetup,
  critterKitchenPlayerInputSchema,
  critterKitchenSetupSchema,
  type CritterKitchenCourseId,
  type CritterKitchenMeal,
  type CritterKitchenPlayerInput,
  type CritterKitchenPlayerScore,
  type CritterKitchenScoreError,
  type CritterKitchenScoreResult,
  type CritterKitchenSetup,
} from './schema.js';

type Ingredient = {
  course: CritterKitchenCourseId;
  sourceType: CritterKitchenCourseId;
  printedValue: number;
  valueBeforeSpice: number;
  spiceMultiplier: number;
  count: number;
  spicedCount: number;
  unspicedCount: number;
};

type PlayerWork = {
  input: CritterKitchenPlayerInput;
  meal: CritterKitchenMeal;
  restaurateurId: string | null;
  ingredients: Ingredient[];
  pairedWines: Array<{
    course: CritterKitchenCourseId;
    printedValue: number;
    valueBeforeSpice: number;
    count: number;
  }>;
  courseIngredientCounts: Map<CritterKitchenCourseId, number>;
  courseUnspicedCounts: Map<CritterKitchenCourseId, number>;
  preFanaticQuality: Record<CritterKitchenCourseId, number>;
  courseQuality: Record<CritterKitchenCourseId, number>;
  spiceCount: number;
  soupValue: number;
  poodleBonus: number;
  fruitBatBonus: number;
  rumorScores: Record<string, number>;
  categories: Record<string, number>;
  total: number;
  trackPosition: number;
  trackLoops: number;
  rank: number | null;
  isWinner: boolean;
};

const courseOrder = CRITTER_KITCHEN_COURSE_IDS;
const courseSet = new Set<string>(courseOrder);
const ingredientSet = new Set<string>(courseOrder);
const spiceSet = new Set<string>(
  CRITTER_KITCHEN_COURSE_IDS.filter((course) => course !== 'gelato'),
);
const catalogCriticById = new Map(CRITTER_KITCHEN_CATALOG.critics.map((card) => [card.id, card]));
const catalogRumorById = new Map(CRITTER_KITCHEN_CATALOG.rumors.map((card) => [card.id, card]));
const catalogRestaurateurById = new Map(
  CRITTER_KITCHEN_CATALOG.restaurateurs.map((card) => [card.id, card]),
);

const ZERO_CATEGORIES = {
  challengeStars: 0,
  mostSoup: 0,
  allSevenCourses: 0,
  bestOfCourse: 0,
  rumors: 0,
  bonus: 0,
  criticTrackLoopStars: 0,
  criticTrackRowStars: 0,
} as const;

function error(
  code: CritterKitchenScoreError['code'],
  message: string,
  path?: string,
): CritterKitchenScoreError {
  return path === undefined ? { code, message } : { code, message, path };
}

function emptyPlayer(identityId: string, seat: number): CritterKitchenPlayerScore {
  return {
    identityId,
    seat,
    categories: { ...ZERO_CATEGORIES },
    total: 0,
    rank: null,
    isWinner: false,
    courseQuality: {},
    rumorScores: {},
    trackPosition: 0,
    trackLoops: 0,
  };
}

function courseSlots(setup: CritterKitchenSetup): CritterKitchenCourseId[] {
  return setup.cartIds.includes('gelato')
    ? [...CRITTER_KITCHEN_COURSE_IDS]
    : [...CRITTER_KITCHEN_BASE_COURSE_IDS];
}

function keyCount(meal: CritterKitchenMeal, key: string): number {
  return meal[key] ?? 0;
}

function addKeyIssue(errors: CritterKitchenScoreError[], key: string, message: string): void {
  errors.push(error('INVALID_MEAL', message, `${CRITTER_KITCHEN_MEAL_CATEGORY_KEY}.${key}`));
}

function selectRestaurateur(
  meal: CritterKitchenMeal,
  errors: CritterKitchenScoreError[],
  playerPath: string,
): string | null {
  const selected: string[] = [];
  for (const [key, value] of Object.entries(meal)) {
    if (!key.startsWith('restaurateur.')) continue;
    const id = key.slice('restaurateur.'.length);
    if (id !== 'none' && !catalogRestaurateurById.has(id)) {
      errors.push(
        error('UNSUPPORTED_CARD', `Unknown restaurateur id: ${id}.`, `${playerPath}.meal.${key}`),
      );
      continue;
    }
    if (value !== 1) {
      errors.push(
        error(
          'INVALID_MEAL',
          'A selected restaurateur flag must have the value 1.',
          `${playerPath}.meal.${key}`,
        ),
      );
      continue;
    }
    selected.push(id);
  }
  if (selected.length !== 1) {
    errors.push(
      error('INCOMPLETE', 'Select exactly one restaurateur for this player.', `${playerPath}.meal`),
    );
  }
  for (const [key] of Object.entries(meal)) {
    if (key.startsWith('effect.') || key.startsWith('zousChef.')) {
      errors.push(
        error(
          'UNSUPPORTED_CARD',
          `This scoring input is not supported: ${key}.`,
          `${playerPath}.meal.${key}`,
        ),
      );
    }
  }
  return selected[0] ?? null;
}

function normalizeValue(
  critic: CritterKitchenCriticEntry,
  course: CritterKitchenCourseId,
  printedValue: number,
): number {
  let value = printedValue;
  if (critic.ability === 'kangaroo' && printedValue === 6) value = 9;
  if (critic.ability === 'rabbit' && course === 'carrot') value *= 2;
  return value;
}

function parseAndValidateMeal(
  input: CritterKitchenPlayerInput,
  setup: CritterKitchenSetup,
  critic: CritterKitchenCriticEntry,
  errors: CritterKitchenScoreError[],
  playerIndex: number,
): PlayerWork {
  const playerPath = `players.${playerIndex}`;
  const meal = input.meal;
  const restaurateurId = selectRestaurateur(meal, errors, playerPath);
  const selectedRestaurateur = restaurateurId
    ? catalogRestaurateurById.get(restaurateurId)
    : undefined;
  const ingredients: Ingredient[] = [];
  const pairedWines: PlayerWork['pairedWines'] = [];
  const courseIngredientCounts = new Map<CritterKitchenCourseId, number>();
  const courseUnspicedCounts = new Map<CritterKitchenCourseId, number>();
  const courseSlotsSet = new Set(courseSlots(setup));
  const spiceCount = Object.entries(meal).reduce((sum, [key, value]) => {
    if (key.startsWith('spice.') || key.startsWith('allspice.')) return sum + value;
    return sum;
  }, 0);
  for (const [key, count] of Object.entries(meal)) {
    if (count > 0 && key.startsWith('leftover.gelato.') && !setup.cartIds.includes('gelato')) {
      addKeyIssue(errors, key, 'Leftover gelato requires the Gelato cart to be enabled.');
    }
  }

  const servedEntries: Array<{
    key: string;
    course: CritterKitchenCourseId;
    sourceType: CritterKitchenCourseId;
    printedValue: number;
    count: number;
  }> = [];
  for (const [key, count] of Object.entries(meal)) {
    if (key.startsWith('effect.') || key.startsWith('zousChef.')) continue;
    if (key.startsWith('served.')) {
      const [, courseRaw, sourceRaw, valueRaw] = key.split('.');
      if (!courseSet.has(courseRaw ?? '') || !ingredientSet.has(sourceRaw ?? '')) {
        addKeyIssue(errors, key, 'Unknown course or ingredient type.');
        continue;
      }
      const course = courseRaw as CritterKitchenCourseId;
      const sourceType = sourceRaw as CritterKitchenCourseId;
      const printedValue = Number(valueRaw);
      if (!courseSlotsSet.has(course)) {
        addKeyIssue(errors, key, 'The gelato course requires the Gelato cart to be enabled.');
        continue;
      }
      if (
        sourceType !== course &&
        !(critic.ability === 'badger' && sourceType === 'mushroom' && course !== 'gelato')
      ) {
        addKeyIssue(errors, key, 'This critic does not allow that ingredient type in this course.');
        continue;
      }
      if (count > 0) servedEntries.push({ key, course, sourceType, printedValue, count });
    }
  }

  const spiceByIngredient = new Map<
    string,
    Array<{ spiceType: string; count: number; allspice: boolean }>
  >();
  for (const [key, count] of Object.entries(meal)) {
    if (count <= 0 || (!key.startsWith('spice.') && !key.startsWith('allspice.'))) continue;
    const parts = key.split('.');
    const isAllspice = parts[0] === 'allspice';
    const course = parts[1] as CritterKitchenCourseId | undefined;
    const sourceType = parts[2] as CritterKitchenCourseId | undefined;
    const printedValue = Number(parts[3]);
    const spiceType = isAllspice ? 'allspice' : (parts[4] ?? '');
    if (
      !course ||
      !sourceType ||
      !servedEntries.some(
        (entry) =>
          entry.course === course &&
          entry.sourceType === sourceType &&
          entry.printedValue === printedValue,
      )
    ) {
      addKeyIssue(
        errors,
        key,
        'A spice must be paired with a served ingredient of the same course, type, and value.',
      );
      continue;
    }
    if (!isAllspice && !spiceSet.has(spiceType)) {
      addKeyIssue(errors, key, 'Unknown spice type.');
      continue;
    }
    const keyId = `${course}.${sourceType}.${printedValue}`;
    const rows = spiceByIngredient.get(keyId) ?? [];
    rows.push({ spiceType, count, allspice: isAllspice });
    spiceByIngredient.set(keyId, rows);
  }

  for (const entry of servedEntries) {
    const ingredientId = `${entry.course}.${entry.sourceType}.${entry.printedValue}`;
    const spices = spiceByIngredient.get(ingredientId) ?? [];
    const totalSpices = spices.reduce((sum, row) => sum + row.count, 0);
    if (totalSpices > entry.count) {
      addKeyIssue(errors, entry.key, 'An ingredient can be paired with at most one spice.');
    }
    const spicedCount = Math.min(entry.count, totalSpices);
    const unspicedCount = entry.count - spicedCount;
    const incompatible = spices.filter((row) => {
      if (row.allspice) return false;
      if (critic.ability === 'badger' && entry.sourceType === 'mushroom') return false;
      if (selectedRestaurateur?.finalMealAbility === 'allspice-conversion') return false;
      return row.spiceType !== entry.sourceType;
    });
    if (incompatible.length > 0) {
      addKeyIssue(
        errors,
        entry.key,
        'A spice must match the ingredient unless Badger or Julia Wild allows it to act as allspice.',
      );
    }

    const beforeSpice = normalizeValue(critic, entry.course, entry.printedValue);
    const spiceMultiplier = totalSpices === 0 ? 1 : critic.ability === 'tree-shrew' ? 3 : 2;
    ingredients.push({
      course: entry.course,
      sourceType: entry.sourceType,
      printedValue: entry.printedValue,
      valueBeforeSpice: beforeSpice,
      spiceMultiplier,
      count: entry.count,
      spicedCount,
      unspicedCount,
    });
    courseIngredientCounts.set(
      entry.course,
      (courseIngredientCounts.get(entry.course) ?? 0) + entry.count,
    );
    if (unspicedCount > 0)
      courseUnspicedCounts.set(
        entry.course,
        (courseUnspicedCounts.get(entry.course) ?? 0) + unspicedCount,
      );
  }

  for (const [key, count] of Object.entries(meal)) {
    if (!key.startsWith('pairedWine.') || count <= 0) continue;
    if (critic.ability !== 'fruit-bat') {
      addKeyIssue(errors, key, 'Paired wine is only valid for The Fruit Bat.');
      continue;
    }
    const [, courseRaw, valueRaw] = key.split('.');
    if (
      !courseSet.has(courseRaw ?? '') ||
      !courseSlotsSet.has(courseRaw as CritterKitchenCourseId)
    ) {
      addKeyIssue(errors, key, 'Unknown or unavailable course for paired wine.');
      continue;
    }
    const course = courseRaw as CritterKitchenCourseId;
    if (count > 1)
      addKeyIssue(errors, key, 'At most one paired wine can be served with each course.');
    const printedValue = Number(valueRaw);
    const mainValues = ingredients
      .filter((ingredient) => ingredient.course === course)
      .map((ingredient) => ingredient.valueBeforeSpice);
    if (
      mainValues.length === 0 ||
      Math.max(...mainValues) !== normalizeValue(critic, course, printedValue)
    ) {
      addKeyIssue(errors, key, 'Paired wine must match the highest pre-spice value on its course.');
      continue;
    }
    pairedWines.push({
      course,
      printedValue,
      valueBeforeSpice: normalizeValue(critic, course, printedValue),
      count,
    });
    courseIngredientCounts.set(course, (courseIngredientCounts.get(course) ?? 0) + count);
    courseUnspicedCounts.set(course, (courseUnspicedCounts.get(course) ?? 0) + count);
  }

  // Critics with expanded courses place a small, explicit limit on the meal shape.
  const counts = [...courseIngredientCounts.entries()].filter(([, count]) => count > 0);
  if (critic.ability === 'mouse') {
    for (const [course, count] of counts) {
      if (course !== 'cheese' && count > 1)
        errors.push(
          error(
            'INVALID_MEAL',
            'The Mouse only allows multiple ingredients in the cheese course.',
            `${playerPath}.meal`,
          ),
        );
    }
  } else if (critic.ability === 'cow') {
    const multiCourses = counts.filter(([, count]) => count > 1);
    if (multiCourses.length > 1 || multiCourses.some(([, count]) => count > 4)) {
      errors.push(
        error(
          'INVALID_MEAL',
          'The Cow allows up to four matching ingredients in one course only.',
          `${playerPath}.meal`,
        ),
      );
    }
  } else if (critic.ability === 'pig') {
    if (counts.some(([, count]) => count > 2))
      errors.push(
        error(
          'INVALID_MEAL',
          'The Pig allows at most two ingredients in each course.',
          `${playerPath}.meal`,
        ),
      );
  } else if (critic.ability === 'raccoon') {
    for (const course of courseOrder) {
      const rows = ingredients.filter((item) => item.course === course);
      const countOfTwos = rows
        .filter((item) => item.printedValue === 2)
        .reduce((sum, item) => sum + item.count, 0);
      const countOfOthers = rows
        .filter((item) => item.printedValue !== 2)
        .reduce((sum, item) => sum + item.count, 0);
      if (
        countOfOthers > 1 ||
        rows.some((item) => item.printedValue === 2 && item.sourceType !== course)
      ) {
        errors.push(
          error(
            'INVALID_MEAL',
            `The Raccoon’s extra value-2 ingredients must match the ${course} course, with at most one other ingredient.`,
            `${playerPath}.meal`,
          ),
        );
      }
      if (countOfTwos + countOfOthers === 0) continue;
    }
  } else if (counts.some(([, count]) => count > 1)) {
    errors.push(
      error(
        'INVALID_MEAL',
        'This critic allows at most one main ingredient in each course.',
        `${playerPath}.meal`,
      ),
    );
  }

  const activeRumors = [...setup.rumorIds, ...(setup.additionalRumorIds ?? [])]
    .map((id) => catalogRumorById.get(id))
    .filter((card): card is CritterKitchenRumorEntry => card !== undefined);
  const preFanaticQuality = Object.fromEntries(
    courseOrder.map((course) => [
      course,
      ingredients
        .filter((ingredient) => ingredient.course === course)
        .reduce(
          (sum, ingredient) =>
            sum +
            ingredient.valueBeforeSpice *
              (ingredient.unspicedCount + ingredient.spicedCount * ingredient.spiceMultiplier),
          0,
        ) +
        pairedWines
          .filter((wine) => wine.course === course)
          .reduce((sum, wine) => sum + wine.valueBeforeSpice * wine.count, 0),
    ]),
  ) as Record<CritterKitchenCourseId, number>;
  const courseQuality = { ...preFanaticQuality };
  for (const rumor of activeRumors) {
    if (rumor.effect === 'fanatic' && rumor.ingredientType) {
      courseQuality[rumor.ingredientType] *= 2;
    }
  }

  const poodleBonus =
    critic.ability === 'poodle'
      ? ingredients.reduce(
          (sum, ingredient) => sum + (ingredient.valueBeforeSpice >= 6 ? ingredient.count : 0),
          0,
        )
      : 0;
  const fruitBatBonus =
    critic.ability === 'fruit-bat' ? pairedWines.reduce((sum, wine) => sum + wine.count, 0) : 0;
  const requiredScalarKeys = [
    CRITTER_KITCHEN_SCALAR_KEYS.previousStars,
    CRITTER_KITCHEN_SCALAR_KEYS.priorityPosition,
    CRITTER_KITCHEN_SCALAR_KEYS.soupCount,
    CRITTER_KITCHEN_SCALAR_KEYS.bisqueCount,
  ];
  for (const key of requiredScalarKeys) {
    if (!Object.hasOwn(meal, key))
      errors.push(
        error('INCOMPLETE', `Enter ${key} (use 0 if none).`, `${playerPath}.meal.${key}`),
      );
  }
  if (ingredients.length === 0)
    errors.push(
      error(
        'INCOMPLETE',
        'Serve at least one ingredient in the critic meal.',
        `${playerPath}.meal`,
      ),
    );
  const rumorTokenCount = keyCount(meal, CRITTER_KITCHEN_SCALAR_KEYS.rumorTokenCount);
  const rumorTokenLimit = setup.cartIds.includes('newspapers') ? 5 : 3;
  if (rumorTokenCount > rumorTokenLimit) {
    errors.push(
      error(
        'INVALID_MEAL',
        `Rumor tokens cannot exceed ${rumorTokenLimit} with the selected carts.`,
        `${playerPath}.meal.rumorTokenCount`,
      ),
    );
  }

  const soupValue =
    keyCount(meal, CRITTER_KITCHEN_SCALAR_KEYS.soupCount) +
    3 * keyCount(meal, CRITTER_KITCHEN_SCALAR_KEYS.bisqueCount);

  return {
    input,
    meal,
    restaurateurId,
    ingredients,
    pairedWines,
    courseIngredientCounts,
    courseUnspicedCounts,
    preFanaticQuality,
    courseQuality,
    spiceCount,
    soupValue,
    poodleBonus,
    fruitBatBonus,
    rumorScores: {},
    categories: { ...ZERO_CATEGORIES },
    total: 0,
    trackPosition: 0,
    trackLoops: 0,
    rank: null,
    isWinner: false,
  };
}

function itemsForRumors(player: PlayerWork): Array<{
  course: CritterKitchenCourseId;
  value: number;
  printedValue: number;
  sourceType: CritterKitchenCourseId;
}> {
  const items = player.ingredients.flatMap((ingredient) =>
    Array.from({ length: ingredient.count }, () => ({
      course: ingredient.course,
      value: ingredient.valueBeforeSpice,
      printedValue: ingredient.printedValue,
      sourceType: ingredient.sourceType,
    })),
  );
  for (const wine of player.pairedWines) {
    for (let index = 0; index < wine.count; index += 1) {
      items.push({
        course: wine.course,
        value: wine.valueBeforeSpice,
        printedValue: wine.printedValue,
        sourceType: 'wine',
      });
    }
  }
  return items;
}

function highestValuesByCourse(
  player: PlayerWork,
  slots: CritterKitchenCourseId[],
): Array<{ course: CritterKitchenCourseId; value: number }> {
  return slots.flatMap((course) => {
    const values = itemsForRumors(player)
      .filter((item) => item.course === course)
      .map((item) => item.value);
    return values.length === 0 ? [] : [{ course, value: Math.max(...values) }];
  });
}

function scoreRumor(
  rumor: CritterKitchenRumorEntry,
  players: PlayerWork[],
  slots: CritterKitchenCourseId[],
): void {
  const setScore = (player: PlayerWork, score: number): void => {
    player.rumorScores[rumor.id] = score;
  };
  if (rumor.effect === 'fanatic') {
    for (const player of players) setScore(player, 0);
    return;
  }

  const values = players.map((player) => itemsForRumors(player).map((item) => item.value));
  if (rumor.effect === 'extremely-pampered') {
    for (const player of players) {
      const byCourse = new Map<CritterKitchenCourseId, number[]>();
      for (const item of itemsForRumors(player))
        byCourse.set(item.course, [...(byCourse.get(item.course) ?? []), item.printedValue]);
      const qualifying = [...byCourse.values()].filter((courseValues) =>
        courseValues.some((value) => value >= 5),
      ).length;
      setScore(player, qualifying >= 7 ? 2 : 0);
    }
    return;
  }
  if (rumor.effect === 'hibernator') {
    for (const player of players) {
      const served = slots.filter((course) => (player.courseIngredientCounts.get(course) ?? 0) > 0);
      const rightmost = served.at(-1);
      const max = Math.max(0, ...served.map((course) => player.preFanaticQuality[course]));
      setScore(
        player,
        rightmost !== undefined && player.preFanaticQuality[rightmost] === max ? 2 : 0,
      );
    }
    return;
  }
  if (rumor.effect === 'big-cheese') {
    for (const player of players) {
      const cheeses = player.ingredients
        .filter((ingredient) => ingredient.sourceType === 'cheese')
        .map((ingredient) => ingredient.valueBeforeSpice);
      const servedCourseCount = slots.filter(
        (course) => (player.courseIngredientCounts.get(course) ?? 0) > 0,
      ).length;
      setScore(player, cheeses.length > 0 && Math.max(...cheeses) >= servedCourseCount ? 3 : 0);
    }
    return;
  }
  if (rumor.effect === 'odd-tastes') {
    for (const player of players) {
      const perCourse = highestValuesByCourse(player, slots);
      setScore(
        player,
        perCourse.length > 0 && perCourse.every(({ value }) => value % 2 === 1) ? 3 : 0,
      );
    }
    return;
  }
  if (rumor.effect === 'simple-palate') {
    const maxima = values.map((playerValues) => {
      const counts = new Map<number, number>();
      for (const value of playerValues) counts.set(value, (counts.get(value) ?? 0) + 1);
      return Math.max(0, ...counts.values());
    });
    const high = Math.max(...maxima);
    players.forEach((player, index) =>
      setScore(player, high > 0 && maxima[index] === high ? 3 : 0),
    );
    return;
  }
  if (rumor.effect === 'subtle-flavors') {
    const counts = players.map((player) => {
      const breadValues = player.ingredients
        .filter((ingredient) => ingredient.course === 'bread')
        .map((ingredient) => ingredient.valueBeforeSpice);
      if (breadValues.length === 0) return 0;
      const highestBread = Math.max(...breadValues);
      return itemsForRumors(player).filter((item) => item.value === highestBread).length;
    });
    const high = Math.max(0, ...counts);
    players.forEach((player, index) =>
      setScore(player, high > 0 && counts[index] === high ? 3 : 0),
    );
    return;
  }
  if (rumor.effect === 'mercurial') {
    players.forEach((player, index) => {
      const playerValues = values[index] ?? [];
      setScore(
        player,
        playerValues.length < 2 ? 0 : Math.max(...playerValues) - Math.min(...playerValues),
      );
    });
    return;
  }
  if (rumor.effect === 'nocturnal') {
    for (const player of players) {
      const perCourse = highestValuesByCourse(player, slots);
      const monotonic =
        perCourse.length > 0 &&
        perCourse.every((item, index) => index === 0 || item.value >= perCourse[index - 1]!.value);
      setScore(player, monotonic ? 5 : 0);
    }
    return;
  }
  if (rumor.effect === 'varied-servings') {
    const distinct = players.map(
      (player) => new Set(itemsForRumors(player).map((item) => item.value)).size,
    );
    const servedCounts = players.map((player) => itemsForRumors(player).length);
    const high = Math.max(0, ...servedCounts);
    players.forEach((player, index) =>
      setScore(player, distinct[index]! + (high > 0 && servedCounts[index] === high ? 1 : 0)),
    );
    return;
  }
  if (rumor.effect === 'unsophisticated') {
    const counts = players.map(
      (player) =>
        slots.filter(
          (course) =>
            (player.courseIngredientCounts.get(course) ?? 0) === 1 &&
            (player.courseUnspicedCounts.get(course) ?? 0) === 1,
        ).length,
    );
    const high = Math.max(0, ...counts);
    players.forEach((player, index) =>
      setScore(player, counts[index]! + (high > 0 && counts[index] === high ? 1 : 0)),
    );
    return;
  }
  if (rumor.effect === 'spice-lover') {
    players.forEach((player, index) => {
      const anyOpponentHasThree = players.some(
        (other, otherIndex) => otherIndex !== index && other.spiceCount >= 3,
      );
      setScore(player, anyOpponentHasThree ? 0 : 2);
    });
    return;
  }
  if (rumor.effect === 'tender') {
    for (const player of players) {
      const extremes = highestValuesByCourse(player, slots);
      const first = extremes[0]?.value;
      const last = extremes.at(-1)?.value;
      setScore(player, first !== undefined && last !== undefined && first + last >= 10 ? 3 : 0);
    }
    return;
  }
  if (rumor.effect === 'shortsighted') {
    for (const player of players) {
      const carrots = player.ingredients
        .filter((ingredient) => ingredient.sourceType === 'carrot')
        .map((ingredient) => ingredient.valueBeforeSpice);
      setScore(player, carrots.length === 0 ? 0 : Math.max(0, Math.max(...carrots) - 2));
    }
    return;
  }
  if (rumor.effect === 'picky') {
    for (const player of players) {
      const served = slots.filter(
        (course) => (player.courseIngredientCounts.get(course) ?? 0) > 0,
      ).length;
      setScore(
        player,
        served >= 7 && values[players.indexOf(player)]!.length > 0
          ? Math.min(...values[players.indexOf(player)]!)
          : 0,
      );
    }
    return;
  }
  if (rumor.effect === 'to-go') {
    const tokenCounts = players.map((player) =>
      Object.entries(player.meal).reduce((total, [key, count]) => {
        return key.startsWith('leftover.') || key.startsWith('leftoverSpice.')
          ? total + count
          : total;
      }, 0),
    );
    const high = Math.max(0, ...tokenCounts);
    players.forEach((player, index) => {
      setScore(
        player,
        Math.floor(tokenCounts[index]! / 2) + (high > 0 && tokenCounts[index] === high ? 1 : 0),
      );
    });
    return;
  }
  if (rumor.effect === 'wine-cellar') {
    for (const player of players) {
      const unservedWine = Object.entries(player.meal).reduce(
        (total, [key, count]) => (key.startsWith('leftover.wine.') ? total + count : total),
        0,
      );
      setScore(player, unservedWine);
    }
    return;
  }

  for (const player of players) setScore(player, 0);
}

function computeTrack(quality: number): {
  loops: number;
  position: number;
  rowStars: number;
  stars: number;
} {
  if (quality <= 0) return { loops: 0, position: 0, rowStars: 0, stars: 0 };
  const loops = Math.floor((quality - 1) / 70);
  const position = quality - loops * 70;
  const rowStars = Math.ceil(position / 7);
  return { loops, position, rowStars, stars: loops * 10 + rowStars };
}

function comparePlayers(a: PlayerWork, b: PlayerWork): number {
  if (a.total !== b.total) return b.total - a.total;
  if (a.trackPosition !== b.trackPosition) return b.trackPosition - a.trackPosition;
  const aPriority = keyCount(a.meal, CRITTER_KITCHEN_SCALAR_KEYS.priorityPosition);
  const bPriority = keyCount(b.meal, CRITTER_KITCHEN_SCALAR_KEYS.priorityPosition);
  return aPriority - bPriority;
}

function buildOutput(work: PlayerWork[]): CritterKitchenPlayerScore[] {
  const sorted = [...work].sort(comparePlayers);
  let previous: PlayerWork | undefined;
  let rank = 0;
  sorted.forEach((player, index) => {
    if (!previous || comparePlayers(previous, player) !== 0) rank = index + 1;
    player.rank = rank;
    previous = player;
  });
  const bestTotal = sorted[0]?.total;
  const bestPosition = sorted[0]?.trackPosition;
  const bestPriority = sorted[0]
    ? keyCount(sorted[0].meal, CRITTER_KITCHEN_SCALAR_KEYS.priorityPosition)
    : undefined;
  return work.map((player) => ({
    identityId: player.input.identityId,
    seat: player.input.seat,
    categories: { ...player.categories },
    total: player.total,
    rank: player.rank,
    isWinner:
      player.total === bestTotal &&
      player.trackPosition === bestPosition &&
      keyCount(player.meal, CRITTER_KITCHEN_SCALAR_KEYS.priorityPosition) === bestPriority,
    courseQuality: { ...player.courseQuality },
    rumorScores: { ...player.rumorScores },
    trackPosition: player.trackPosition,
    trackLoops: player.trackLoops,
  }));
}

/** Compute the authoritative Critter Kitchen final-meal score for all players. */
export function computeCritterKitchen(
  rawSetup: CritterKitchenSetup | unknown,
  rawPlayers: readonly CritterKitchenPlayerInput[] | readonly unknown[],
): CritterKitchenScoreResult {
  const errors: CritterKitchenScoreError[] = [];
  const warnings: string[] = [];
  const parsedSetup = critterKitchenSetupSchema.safeParse(rawSetup);
  const setup = parsedSetup.success ? parsedSetup.data : critterKitchenDefaultSetup;
  if (!parsedSetup.success) {
    for (const issue of parsedSetup.error.issues) {
      errors.push(error('INVALID_SETUP', issue.message, issue.path.join('.')));
    }
  }
  if (!Array.isArray(rawPlayers) || rawPlayers.length < 2 || rawPlayers.length > 7) {
    errors.push(error('INVALID_PLAYER_COUNT', 'Critter Kitchen supports 2 to 7 players.'));
  }
  const rawPlayerList = Array.isArray(rawPlayers) ? rawPlayers : [];
  const players: CritterKitchenPlayerInput[] = [];
  rawPlayerList.forEach((rawPlayer, index) => {
    const parsed = critterKitchenPlayerInputSchema.safeParse(rawPlayer);
    if (!parsed.success) {
      errors.push(error('INVALID_PLAYER', 'Player input is malformed.', `players.${index}`));
      for (const issue of parsed.error.issues)
        errors.push(
          error('INVALID_PLAYER', issue.message, `players.${index}.${issue.path.join('.')}`),
        );
      return;
    }
    players.push(parsed.data);
  });
  if (players.length !== rawPlayerList.length) {
    const fallbackPlayers = rawPlayerList.map((raw, index) => {
      const record =
        raw && typeof raw === 'object' ? (raw as { identityId?: unknown; seat?: unknown }) : {};
      return emptyPlayer(
        typeof record.identityId === 'string' ? record.identityId : `invalid-${index}`,
        typeof record.seat === 'number' ? record.seat : index,
      );
    });
    return { complete: false, errors, warnings, tieUnresolved: false, players: fallbackPlayers };
  }

  const identityIds = new Set(players.map((player) => player.identityId));
  const seats = new Set(players.map((player) => player.seat));
  if (identityIds.size !== players.length)
    errors.push(error('INVALID_PLAYER', 'Player identity ids must be unique.'));
  if (seats.size !== players.length)
    errors.push(error('INVALID_PLAYER', 'Player seats must be unique.'));
  if (players.length >= 6 && !setup.sixSevenPlayerMode)
    errors.push(
      error('INVALID_SETUP', 'Six- and seven-player games require the À La Cart 6–7 player mode.'),
    );

  const critic = catalogCriticById.get(setup.criticId);
  if (!critic || !critic.supported) {
    errors.push(error('UNSUPPORTED_CARD', `Unsupported critic: ${setup.criticId}.`, 'criticId'));
  }
  const safeCritic = critic?.supported ? critic : CRITTER_KITCHEN_CATALOG.critics[0]!;
  const work = players.map((player, index) =>
    parseAndValidateMeal(player, setup, safeCritic, errors, index),
  );
  const jamieCount = work.filter((player) => player.restaurateurId === 'jamie-owliver').length;
  if (jamieCount !== (setup.additionalRumorIds?.length ?? 0)) {
    errors.push(
      error(
        'INVALID_SETUP',
        'The number of additional shared rumors must match the number of Jamie Owliver cards in play.',
        'additionalRumorIds',
      ),
    );
  }
  const priorities = work.map((player) =>
    keyCount(player.meal, CRITTER_KITCHEN_SCALAR_KEYS.priorityPosition),
  );
  if (
    priorities.some((position) => position < 1 || position > players.length) ||
    new Set(priorities).size !== priorities.length
  ) {
    errors.push(
      error(
        'INVALID_PRIORITY',
        'Enter each player’s unique priority-track position from 1 (front) to player count.',
        'meal.priorityPosition',
      ),
    );
  }

  const slots = courseSlots(setup);
  const rumors = [...setup.rumorIds, ...(setup.additionalRumorIds ?? [])]
    .map((id) => catalogRumorById.get(id))
    .filter((rumor): rumor is CritterKitchenRumorEntry => rumor !== undefined && rumor.supported);
  for (const rumor of rumors) scoreRumor(rumor, work, slots);

  const maxSoup = Math.max(0, ...work.map((player) => player.soupValue));
  for (const player of work) {
    player.categories.challengeStars = keyCount(
      player.meal,
      CRITTER_KITCHEN_SCALAR_KEYS.previousStars,
    );
    player.categories.mostSoup = player.soupValue === maxSoup ? 1 : 0;
    const servedCourses = slots.filter(
      (course) => (player.courseIngredientCounts.get(course) ?? 0) > 0,
    ).length;
    player.categories.allSevenCourses = servedCourses >= 7 ? 1 : 0;
    player.categories.bestOfCourse = 0;
    player.categories.rumors = 0;
    player.categories.bonus =
      player.poodleBonus +
      player.fruitBatBonus +
      (player.restaurateurId
        ? (catalogRestaurateurById.get(player.restaurateurId)?.bonusStars ?? 0)
        : 0);
    for (const rumor of rumors) {
      if (rumor.effect !== 'fanatic') player.categories.rumors += player.rumorScores[rumor.id] ?? 0;
    }
    const quality = Object.values(player.courseQuality).reduce((sum, value) => sum + value, 0);
    const track = computeTrack(quality);
    player.trackPosition = track.position;
    player.trackLoops = track.loops;
    player.categories.criticTrackLoopStars = track.loops * 10;
    player.categories.criticTrackRowStars = track.rowStars;
    player.total = Object.values(player.categories).reduce((sum, value) => sum + value, 0);
  }

  for (const course of slots) {
    const contenders = work.filter(
      (player) => (player.courseIngredientCounts.get(course) ?? 0) > 0,
    );
    if (contenders.length === 0) continue;
    const high = Math.max(...contenders.map((player) => player.preFanaticQuality[course]));
    const award = safeCritic.ability === 'mouse' && course === 'cheese' ? 2 : 1;
    for (const player of contenders) {
      if (player.preFanaticQuality[course] === high) {
        player.categories.bestOfCourse = (player.categories.bestOfCourse ?? 0) + award;
        player.total += award;
      }
    }
  }

  const outputPlayers = buildOutput(work);
  const ordered = [...work].sort(comparePlayers);
  const tieUnresolved =
    ordered.length > 1 &&
    ordered[0] !== undefined &&
    ordered[1] !== undefined &&
    comparePlayers(ordered[0], ordered[1]) === 0;
  return {
    complete: errors.length === 0,
    errors,
    warnings,
    tieUnresolved,
    players: outputPlayers,
  };
}
