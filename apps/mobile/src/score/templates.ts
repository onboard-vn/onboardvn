import club0 from '../../../../data/staging/score-templates/seti-search-for-extraterrestrial-intelligence-2024.json';
import club1 from '../../../../data/staging/score-templates/nucleum-2023.json';
import club2 from '../../../../data/staging/score-templates/agricola-2007.json';
import club3 from '../../../../data/staging/score-templates/agricola-15-2022.json';
import club4 from '../../../../data/staging/score-templates/amsterdam.json';
import club5 from '../../../../data/staging/score-templates/great-western-trail.json';
import club6 from '../../../../data/staging/score-templates/dune-imperium-uprising-2023.json';
import club7 from '../../../../data/staging/score-templates/terra-mystica.json';
import club8 from '../../../../data/staging/score-templates/age-of-innovation.json';
import club9 from '../../../../data/staging/score-templates/barrage.json';
import club10 from '../../../../data/staging/score-templates/trajan-2011.json';
import club11 from '../../../../data/staging/score-templates/galactic-cruise.json';
import club12 from '../../../../data/staging/score-templates/luthier.json';
import club13 from '../../../../data/staging/score-templates/entropy-2026.json';
import club14 from '../../../../data/staging/score-templates/the-old-kings-crown.json';
import club15 from '../../../../data/staging/score-templates/yinzi-ming.json';
import club16 from '../../../../data/staging/score-templates/gaia-project-2017.json';
import club17 from '../../../../data/staging/score-templates/cloudspire.json';
import club18 from '../../../../data/staging/score-templates/age-of-steam-deluxe-2019.json';
import club19 from '../../../../data/staging/score-templates/concordia-venus.json';
import club20 from '../../../../data/staging/score-templates/brass-birmingham-2018.json';
import club21 from '../../../../data/staging/score-templates/feya-s-swamp-2025.json';
import club22 from '../../../../data/staging/score-templates/vantage.json';
import club23 from '../../../../data/staging/score-templates/abomination-the-heir-of-frankenstein-2019.json';
import club24 from '../../../../data/staging/score-templates/zoo-tycoon.json';
import club25 from '../../../../data/staging/score-templates/alchemists.json';
import club26 from '../../../../data/staging/score-templates/carnegie.json';
import club27 from '../../../../data/staging/score-templates/the-voyages-of-marco-polo-2015.json';
import club28 from '../../../../data/staging/score-templates/the-castle-of-burgundy-special-edition.json';
import { scoreTemplateSchema, type ScoreTemplate } from '@onboard/shared';
import acquire from '../../../../data/staging/score-templates/acquire-1963.json';
import flip7 from '../../../../data/staging/score-templates/flip-7.json';
import grandAustria from '../../../../data/staging/score-templates/grand-austria-hotel-deluxe.json';
import scout from '../../../../data/staging/score-templates/scout-2019.json';
import theGang from '../../../../data/staging/score-templates/the-gang-2024.json';
import shadowHunters from '../../../../data/staging/score-templates/shadow-hunters.json';

export const scoreTemplates: Record<string, ScoreTemplate> = Object.fromEntries(
  [
    acquire,
    grandAustria,
    theGang,
    flip7,
    scout,
    club0,
    club1,
    club2,
    club3,
    club4,
    club5,
    club6,
    club7,
    club8,
    club9,
    club10,
    club11,
    club12,
    club13,
    club14,
    club15,
    club16,
    club17,
    club18,
    club19,
    club20,
    club21,
    club22,
    club23,
    club24,
    club25,
    club26,
    club27,
    club28,
    shadowHunters,
  ].map((raw) => {
    const t = scoreTemplateSchema.parse(raw);
    return [t.slug, t];
  }),
);

export const templateList: ScoreTemplate[] = Object.values(scoreTemplates);
