INSERT INTO "score_templates" (
  "game_id",
  "variant",
  "version",
  "status",
  "definition",
  "confidence",
  "needs_review",
  "sources"
)
SELECT
  resolve_canonical_game_id(g."id"),
  'final-meal',
  2,
  'approved',
  $$
  {
    "slug": "critter-kitchen",
    "name": "Critter Kitchen",
    "year": 2025,
    "bggId": 393429,
    "templateVersion": 2,
    "variant": "final-meal",
    "playerCount": { "min": 2, "max": 7 },
    "mode": "competitive",
    "winRule": "highest",
    "scoringStyle": "end-game-categories",
    "categories": [
      {
        "scope": "player",
        "min": 0,
        "max": null,
        "countsToTotal": false,
        "key": "meal",
        "label": "Final meal inputs",
        "labelVi": "Dữ liệu bữa ăn cuối",
        "hint": "Enter the final critic meal, previously earned stars, soup/bisque, and priority position. The Critter Kitchen scorer calculates awards, rumors, course quality, score track, totals, and winner.",
        "input": "number",
        "formula": { "type": "sum" }
      }
    ],
    "tiebreakers": [
      { "description": "Highest total stars after final meal scoring" },
      { "description": "If tied, furthest score track position; if still tied, player furthest ahead on the priority track" }
    ],
    "sharedVictoryOnTie": false,
    "notes": "This version stores final meal inputs in the numeric meal record. The authoritative scoring rules are implemented by computeCritterKitchen in @onboard/shared; the generic template formula does not calculate a Critter Kitchen score.",
    "sources": [
      {
        "url": "https://cardboardalchemy.com/downloads/CritterKitchen_Rulebook.pdf",
        "title": "Critter Kitchen Rulebook (Cardboard Alchemy)",
        "type": "official-rulebook",
        "section": "pp.16-18 Critic Meal, Final Score, and Winning"
      },
      {
        "url": "https://cardboardalchemy.com/downloads/CritterKitchen_Exp_Rulebook.pdf",
        "title": "Critter Kitchen: À La Cart Rulebook (Cardboard Alchemy)",
        "type": "official-rulebook",
        "section": "p.12 Clarifications"
      }
    ],
    "confidence": "high",
    "needsReview": false
  }
  $$::jsonb,
  'high',
  false,
  $$[
    {
      "url": "https://cardboardalchemy.com/downloads/CritterKitchen_Rulebook.pdf",
      "title": "Critter Kitchen Rulebook (Cardboard Alchemy)",
      "type": "official-rulebook",
      "section": "pp.16-18 Critic Meal, Final Score, and Winning"
    },
    {
      "url": "https://cardboardalchemy.com/downloads/CritterKitchen_Exp_Rulebook.pdf",
      "title": "Critter Kitchen: À La Cart Rulebook (Cardboard Alchemy)",
      "type": "official-rulebook",
      "section": "p.12 Clarifications"
    }
  ]$$::jsonb
FROM "games" g
WHERE g."slug" = 'critter-kitchen'
ON CONFLICT ("game_id", "variant", "version") DO UPDATE
SET
  "status" = EXCLUDED."status",
  "definition" = EXCLUDED."definition",
  "confidence" = EXCLUDED."confidence",
  "needs_review" = EXCLUDED."needs_review",
  "sources" = EXCLUDED."sources";
