/**
 * Critter Kitchen final-meal card catalog. Rules are paraphrased from the
 * publisher rulebooks and photographed physical cards; unsupported rumors are
 * listed so callers can explain why a play cannot yet be finalized.
 */

export type CritterKitchenCatalogEntry = {
  id: string;
  label: string;
  edition: 'base' | 'a-la-cart';
  supported: boolean;
  reason?: string;
  source: string;
};

export type CritterKitchenCriticEntry = CritterKitchenCatalogEntry & {
  ability:
    | 'standard'
    | 'badger'
    | 'capybara'
    | 'cow'
    | 'fruit-bat'
    | 'jerboa'
    | 'kangaroo'
    | 'mouse'
    | 'poodle'
    | 'rabbit'
    | 'raccoon'
    | 'saint-bernard'
    | 'tree-shrew'
    | 'pig';
  inputHints?: readonly (
    | 'multiple-ingredients'
    | 'paired-wine'
    | 'any-spice'
    | 'mushroom-wild'
    | 'six-to-nine'
    | 'wine-as-allspice'
  )[];
};

export type CritterKitchenRumorEntry = CritterKitchenCatalogEntry & {
  effect:
    | 'fanatic'
    | 'extremely-pampered'
    | 'hibernator'
    | 'big-cheese'
    | 'odd-tastes'
    | 'subtle-flavors'
    | 'nocturnal'
    | 'mercurial'
    | 'varied-servings'
    | 'unsophisticated'
    | 'spice-lover'
    | 'tender'
    | 'shortsighted'
    | 'simple-palate'
    | 'wine-cellar'
    | 'to-go'
    | 'picky'
    | 'unsupported';
  ingredientType?: 'bread' | 'carrot' | 'cheese' | 'fish' | 'meat' | 'mushroom' | 'wine';
  inputHints?: readonly ('leftover-wine' | 'leftover-ingredients' | 'leftover-spices')[];
};

export type CritterKitchenRestaurateurEntry = CritterKitchenCatalogEntry & {
  bonusStars: number;
  finalMealAbility: 'extra-rumor' | 'allspice-conversion' | 'priority-track' | 'none';
};

const rulebook = 'https://cardboardalchemy.com/downloads/CritterKitchen_Rulebook.pdf';
const expansionRulebook = 'https://cardboardalchemy.com/downloads/CritterKitchen_Exp_Rulebook.pdf';
const cardImage = (imageId: string) => `https://boardgamegeek.com/image/${imageId}/critter-kitchen`;

const rumorPhotographs = {
  rumorOverview: cardImage('8930455'),
  verifiedScoreCards: cardImage('9403347'),
  oddTastes: cardImage('8930465'),
  bigCheese: cardImage('9345720'),
  picky: cardImage('9258996'),
  toGoAndVariedServings:
    'https://i0.wp.com/opinionatedgamers.com/wp-content/uploads/2025/09/PXL_20250911_234917468.jpg?ssl=1',
  wineCellar: 'https://miro.medium.com/v2/resize%3Afit%3A1400/1%2AtkTrUaYbOoPxucQ2VhuV8w.jpeg',
};

const supportedRumor = (
  id: string,
  label: string,
  effect: CritterKitchenRumorEntry['effect'],
  imageId = '8930455',
  extra: Partial<CritterKitchenRumorEntry> = {},
): CritterKitchenRumorEntry => ({
  id,
  label,
  edition: 'base',
  supported: true,
  effect,
  source:
    imageId === '9403347'
      ? rumorPhotographs.verifiedScoreCards
      : imageId === '8930465'
        ? rumorPhotographs.oddTastes
        : imageId === '9345720'
          ? rumorPhotographs.bigCheese
          : imageId === '9258996'
            ? rumorPhotographs.picky
            : rumorPhotographs.rumorOverview,
  ...extra,
});

const unsupportedRumor = (id: string, label: string): CritterKitchenRumorEntry => ({
  id,
  label,
  edition: 'base',
  supported: false,
  effect: 'unsupported',
  reason: 'The exact printed scoring condition still needs primary-card verification.',
  source: `${rulebook}#page=22`,
});

const criticSource = cardImage('8930456');
const criticEntries: CritterKitchenCriticEntry[] = [
  {
    id: 'the-mouse',
    label: 'The Mouse',
    edition: 'base',
    supported: true,
    ability: 'mouse',
    inputHints: ['multiple-ingredients'],
    source: criticSource,
  },
  {
    id: 'the-cow',
    label: 'The Cow',
    edition: 'base',
    supported: true,
    ability: 'cow',
    inputHints: ['multiple-ingredients'],
    source: criticSource,
  },
  {
    id: 'the-rabbit',
    label: 'The Rabbit',
    edition: 'base',
    supported: true,
    ability: 'rabbit',
    source: cardImage('8930458'),
  },
  {
    id: 'the-kangaroo',
    label: 'The Kangaroo',
    edition: 'base',
    supported: true,
    ability: 'kangaroo',
    inputHints: ['six-to-nine'],
    source: cardImage('8930456'),
  },
  {
    id: 'the-capybara',
    label: 'The Capybara',
    edition: 'base',
    supported: true,
    ability: 'capybara',
    source: criticSource,
  },
  {
    id: 'the-badger',
    label: 'The Badger',
    edition: 'base',
    supported: true,
    ability: 'badger',
    inputHints: ['mushroom-wild', 'any-spice'],
    source: cardImage('8930457'),
  },
  {
    id: 'the-fruit-bat',
    label: 'The Fruit Bat',
    edition: 'base',
    supported: true,
    ability: 'fruit-bat',
    inputHints: ['paired-wine'],
    source: cardImage('8930456'),
  },
  {
    id: 'the-jerboa',
    label: 'The Jerboa',
    edition: 'base',
    supported: true,
    ability: 'jerboa',
    source: criticSource,
  },
  {
    id: 'the-poodle',
    label: 'The Poodle',
    edition: 'base',
    supported: true,
    ability: 'poodle',
    source: criticSource,
  },
  {
    id: 'the-raccoon',
    label: 'The Raccoon',
    edition: 'base',
    supported: true,
    ability: 'raccoon',
    inputHints: ['multiple-ingredients'],
    source: criticSource,
  },
  {
    id: 'the-saint-bernard',
    label: 'The Saint Bernard',
    edition: 'base',
    supported: true,
    ability: 'saint-bernard',
    inputHints: ['wine-as-allspice'],
    source: criticSource,
  },
  {
    id: 'the-tree-shrew',
    label: 'The Tree Shrew',
    edition: 'base',
    supported: true,
    ability: 'tree-shrew',
    source: cardImage('8930456'),
  },
  {
    id: 'the-pig',
    label: 'The Pig',
    edition: 'a-la-cart',
    supported: true,
    ability: 'pig',
    source: cardImage('8930457'),
  },
];

const restaurateurPhotograph = cardImage('9040017');

export const CRITTER_KITCHEN_CATALOG = {
  critics: criticEntries,
  rumors: [
    ...(['bread', 'carrot', 'cheese', 'fish', 'meat', 'mushroom', 'wine'] as const).map(
      (ingredientType) =>
        supportedRumor(
          `${ingredientType}-fanatic`,
          `${ingredientType[0]?.toUpperCase()}${ingredientType.slice(1)} Fanatic`,
          'fanatic',
          '9403347',
          { ingredientType },
        ),
    ),
    supportedRumor('extremely-pampered', 'Extremely Pampered', 'extremely-pampered', '9403347'),
    supportedRumor('hibernator', 'Hibernator', 'hibernator', '9403347'),
    unsupportedRumor('psychedelic-flavor', 'Psychedelic Flavor'),
    supportedRumor('spice-lover', 'Spice Lover', 'spice-lover'),
    supportedRumor('tender', 'Tender', 'tender'),
    supportedRumor('big-cheese', 'Big Cheese', 'big-cheese', '9345720'),
    unsupportedRumor('big-dipper', 'Big Dipper'),
    supportedRumor('odd-tastes', 'Odd Tastes', 'odd-tastes', '8930465'),
    supportedRumor('simple-palate', 'Simple Palate', 'simple-palate', '9258996'),
    supportedRumor('subtle-flavors', 'Subtle Flavors', 'subtle-flavors', '9403347'),
    unsupportedRumor('super-chatty', 'Super Chatty'),
    supportedRumor('to-go', 'To Go', 'to-go', '9258996', {
      inputHints: ['leftover-ingredients', 'leftover-spices'],
      source: rumorPhotographs.toGoAndVariedServings,
    }),
    supportedRumor('wine-cellar', 'Wine Cellar', 'wine-cellar', '9258996', {
      inputHints: ['leftover-wine'],
      source: rumorPhotographs.wineCellar,
    }),
    supportedRumor('mercurial', 'Mercurial', 'mercurial'),
    supportedRumor('nocturnal', 'Nocturnal', 'nocturnal'),
    supportedRumor('picky', 'Picky', 'picky', '9258996'),
    supportedRumor('shortsighted', 'Shortsighted', 'shortsighted'),
    unsupportedRumor('sommelier', 'Sommelier'),
    supportedRumor('unsophisticated', 'Unsophisticated', 'unsophisticated'),
    unsupportedRumor('varied-leftovers', 'Varied Leftovers'),
    supportedRumor('varied-servings', 'Varied Servings', 'varied-servings', '9258996', {
      source: rumorPhotographs.toGoAndVariedServings,
    }),
  ] satisfies CritterKitchenRumorEntry[],
  carts: [
    {
      id: 'coffee',
      label: 'Coffee',
      edition: 'a-la-cart',
      supported: true,
      kind: 'challenge-only',
      source: `${expansionRulebook}#page=12`,
    },
    {
      id: 'dumplings',
      label: 'Dumplings',
      edition: 'a-la-cart',
      supported: true,
      kind: 'challenge-only',
      source: `${expansionRulebook}#page=12`,
    },
    {
      id: 'flowers',
      label: 'Flowers',
      edition: 'a-la-cart',
      supported: true,
      kind: 'challenge-only',
      source: `${expansionRulebook}#page=12`,
    },
    {
      id: 'food-drive',
      label: 'Food Drive',
      edition: 'a-la-cart',
      supported: true,
      kind: 'challenge-only',
      source: `${expansionRulebook}#page=12`,
    },
    {
      id: 'gelato',
      label: 'Gelato',
      edition: 'a-la-cart',
      supported: true,
      kind: 'extra-course',
      inputHints: ['gelato'],
      source: `${expansionRulebook}#page=12`,
    },
    {
      id: 'gold-coins',
      label: 'Gold Coins',
      edition: 'a-la-cart',
      supported: true,
      kind: 'challenge-only',
      source: `${expansionRulebook}#page=12`,
    },
    {
      id: 'newspapers',
      label: 'Newspapers',
      edition: 'a-la-cart',
      supported: true,
      kind: 'rumor-token-limit',
      inputHints: ['rumorTokenCount'],
      source: `${expansionRulebook}#page=12`,
    },
    {
      id: 'sauces',
      label: 'Sauces',
      edition: 'a-la-cart',
      supported: false,
      kind: 'unsupported',
      reason: 'The exact sauce bonus must be encoded to calculate course quality.',
      source: `${expansionRulebook}#page=12`,
    },
  ],
  restaurateurs: [
    {
      id: 'anthony-boardain',
      label: 'Anthony Boardain',
      edition: 'base',
      supported: true,
      bonusStars: 3,
      finalMealAbility: 'none',
      source: restaurateurPhotograph,
    },
    {
      id: 'bobcat-flay',
      label: 'Bobcat Flay',
      edition: 'base',
      supported: true,
      bonusStars: 2,
      finalMealAbility: 'none',
      source: restaurateurPhotograph,
    },
    {
      id: 'falcon-brown',
      label: 'Falcon Brown',
      edition: 'base',
      supported: true,
      bonusStars: 2,
      finalMealAbility: 'none',
      source: restaurateurPhotograph,
    },
    {
      id: 'goat-n-ramsay',
      label: "Goat'N Ramsay",
      edition: 'base',
      supported: true,
      bonusStars: 2,
      finalMealAbility: 'none',
      source: restaurateurPhotograph,
    },
    {
      id: 'graham-elephant',
      label: 'Graham Elephant',
      edition: 'base',
      supported: true,
      bonusStars: 2,
      finalMealAbility: 'none',
      source: restaurateurPhotograph,
    },
    {
      id: 'heron-sanchez',
      label: 'Herón Sanchez',
      edition: 'base',
      supported: true,
      bonusStars: 3,
      finalMealAbility: 'none',
      source: restaurateurPhotograph,
    },
    {
      id: 'jamie-owliver',
      label: 'Jamie Owliver',
      edition: 'base',
      supported: true,
      bonusStars: 2,
      finalMealAbility: 'extra-rumor',
      source: restaurateurPhotograph,
    },
    {
      id: 'julia-wild',
      label: 'Julia Wild',
      edition: 'base',
      supported: true,
      bonusStars: 1,
      finalMealAbility: 'allspice-conversion',
      source: restaurateurPhotograph,
    },
    {
      id: 'marcus-roostersson',
      label: 'Marcus Roostersson',
      edition: 'base',
      supported: true,
      bonusStars: 2,
      finalMealAbility: 'priority-track',
      source: restaurateurPhotograph,
    },
    {
      id: 'martha-shrewart',
      label: 'Martha Shrewart',
      edition: 'base',
      supported: true,
      bonusStars: 2,
      finalMealAbility: 'none',
      source: restaurateurPhotograph,
    },
  ] satisfies CritterKitchenRestaurateurEntry[],
} as const;

export const CRITTER_KITCHEN_SUPPORTED_RUMOR_IDS = CRITTER_KITCHEN_CATALOG.rumors
  .filter((card) => card.supported)
  .map((card) => card.id);

export const CRITTER_KITCHEN_SUPPORTED_CRITIC_IDS = CRITTER_KITCHEN_CATALOG.critics
  .filter((card) => card.supported)
  .map((card) => card.id);

export const CRITTER_KITCHEN_SUPPORTED_CART_IDS = CRITTER_KITCHEN_CATALOG.carts
  .filter((card) => card.supported)
  .map((card) => card.id);

export const CRITTER_KITCHEN_SUPPORTED_RESTAURATEUR_IDS = CRITTER_KITCHEN_CATALOG.restaurateurs
  .filter((card) => card.supported)
  .map((card) => card.id);

export const CRITTER_KITCHEN_RUMOR_SOURCE_REFERENCES = {
  officialRulebook: rulebook,
  overviewCardPhoto: rumorPhotographs.rumorOverview,
};
