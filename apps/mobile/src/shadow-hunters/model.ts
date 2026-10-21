import catalog from '../../../../plans/reports/shadow-hunters-print-review.json';

export const STORAGE_KEY = 'onboard:shadow-hunters:session:v1';
export const presets = catalog.game_mode_review.presets;
export const sets = catalog.set_registry;
export type Ruleset = 'shadow-hunters' | 'shadow-raiders';
export type Setup = {
  presetId: string;
  ruleset: Ruleset;
  playerCount: number;
  characterSetIds: string[];
  drawSetIds: string[];
  decisions: Record<string, string>;
  characterSelection?: 'sets' | 'selected50';
  excludedCharacterIds?: string[];
};
export type CardRecord = {
  key: string;
  id: string;
  name: string;
  setId: string;
  mark: string;
  version: string;
  deck: string;
  quantity: number;
  effect: string;
  notes: string[];
  sourceIds: string[];
  sources: { id: string; title: string; url?: string }[];
};
export type Decision = { id: string; text: string; title?: string };
export type Session = {
  version: 1;
  catalogRevision: string;
  startedAt: string;
  label: string;
  setup: Setup;
  cards: CardRecord[];
  rules: { title: string; text: string }[];
  decisions: Decision[];
  setLabels: string[];
};

export function setupFor(presetId: string): Setup {
  const preset = presets.find((p) => p.id === presetId) ?? presets[0]!;
  return {
    presetId: preset.id,
    ruleset: preset.ruleset_id === 'shadow-raiders' ? 'shadow-raiders' : 'shadow-hunters',
    playerCount: 5,
    characterSetIds:
      preset.id === 'raiders-airship' || preset.id === 'fangs-native' ? [] : ['sh-official-base'],
    drawSetIds: [...preset.draw_set_ids],
    decisions: {},
  };
}

const setName = (id: string) => sets.find((s) => s.id === id)?.label_vi ?? id;
const markCode = (id: string) => sets.find((s) => s.id === id)?.mark_code ?? id;
const record = (
  id: string,
  name: string,
  setId: string,
  deck: string,
  quantity: number,
  effect: string,
  sourceIds: string[],
  notes: string[] = [],
  version = 'original',
): CardRecord => ({
  key: `${id}@${setId}@${version}`,
  id,
  name,
  setId,
  mark: markCode(setId),
  version,
  deck,
  quantity,
  effect,
  notes,
  sourceIds,
  sources: sourceIds.map((sourceId) => {
    const source = (
      catalog.sources as Record<
        string,
        { title?: string; url?: string; public_download_page?: string }
      >
    )[sourceId];
    return {
      id: sourceId,
      title:
        source?.title ??
        (sourceId === 'user_remastered_archive'
          ? 'ZIP Remastered do người dùng cung cấp'
          : 'Tài liệu nguồn của bộ bài'),
      ...((source?.url ?? source?.public_download_page)
        ? { url: source.url ?? source.public_download_page }
        : {}),
    };
  }),
});

export function selectedCards(setup: Setup): CardRecord[] {
  const result: CardRecord[] = [];
  const selectedCharacters = new Set(
    sets
      .filter((s) => setup.characterSetIds.includes(s.id))
      .flatMap((s) => ('character_ids' in s ? s.character_ids : [])),
  );
  for (const c of catalog.characters) {
    if (
      !selectedCharacters.has(c.id) ||
      setup.excludedCharacterIds?.includes(c.id) ||
      (setup.characterSelection === 'selected50' &&
        !catalog.character_selection.selected_character_ids.includes(c.id))
    )
      continue;
    const setId = c.print_identity.set_id;
    result.push(
      record(
        c.id,
        c.name,
        setId,
        'character',
        1,
        `HP ${c.hp} · ${c.faction}\n${c.ability_vi}\nThắng: ${c.win_condition_vi}`,
        c.source_ids,
        [
          'Bản dịch để duyệt; đây là kho tướng, không phải danh tính đã chia.',
          ...('review_notes' in c ? (c.review_notes ?? []) : []),
        ],
      ),
    );
  }
  if (setup.drawSetIds.includes('shadow-hunters-remastered-original')) {
    for (const [color, deck] of Object.entries(catalog.additional_draw_sets[0]!.decks)) {
      for (const c of deck.cards)
        result.push(
          record(
            c.id,
            c.label_vi,
            'shadow-hunters-remastered-original',
            color,
            c.quantity,
            c.effect_vi,
            c.source_ids,
          ),
        );
    }
  }
  const airship = setup.drawSetIds.includes('sr-airship');
  for (const [color, deck] of Object.entries(catalog.draw_decks)) {
    for (const c of deck.cards) {
      for (const v of c.print_identity_variants) {
        if (!setup.drawSetIds.includes(v.set_id)) continue;
        const quantity = v.set_id === 'sr-base' && !airship ? v.quantity : v.play_quantity;
        if (!quantity) continue;
        const old = v.set_id === 'sr-base' && c.superseded_base_quantity > 0;
        const raw = c as typeof c & {
          superseded_version_effect_vi?: string;
          review_notes_vi?: string[];
          source_card_effect_vi?: string;
        };
        const effect = old
          ? raw.superseded_version_effect_vi
          : (raw.source_card_effect_vi ?? c.effect_vi);
        result.push(
          record(
            c.id,
            c.label_vi,
            v.set_id,
            color,
            quantity,
            effect ?? '',
            c.source_ids,
            raw.review_notes_vi ?? [],
            old ? 'base' : v.version_id,
          ),
        );
      }
    }
  }
  if (setup.drawSetIds.includes('jenemai-items')) {
    for (const c of catalog.optional_sets[0]!.cards)
      result.push(
        record(
          c.id,
          c.label_vi,
          'jenemai-items',
          c.color,
          c.proposed_print_quantity,
          c.effect_vi,
          c.source_ids,
          ['Số bản đề xuất: mỗi mẫu 1 lá; chưa xác minh cân bằng.'],
        ),
      );
  }
  if (setup.ruleset === 'shadow-raiders') {
    for (const c of catalog.locations) {
      if (c.print_identity.set_id === 'sr-airship' && !airship) continue;
      result.push(
        record(c.id, c.label_vi, c.print_identity.set_id, 'location', 1, c.rules_vi, c.source_ids),
      );
    }
  }
  return result;
}

export function requiredDecisions(setup: Setup): Decision[] {
  if (setup.presetId === 'fangs-native') return [];
  const result: Decision[] = [];
  const add = (id: string, text: string) => result.push({ id, text });
  if (setup.ruleset === 'shadow-hunters')
    add(
      'hunters-board',
      'Xác nhận đang dùng đủ 6 địa điểm và bàn ghép cặp Shadow Hunters; kho ZIP không có mặt trước địa điểm.',
    );
  if (setup.ruleset === 'shadow-raiders')
    add(
      'raiders-characters',
      'Chọn bộ tướng đang dùng và ghi rõ luật chuyển đổi. Kho tướng hiện tại là Hunters/cộng đồng, chưa có tướng Raiders nguyên bộ.',
    );
  if (setup.drawSetIds.includes('jenemai-items'))
    add(
      'jenemai',
      'Cấu hình này cố định mỗi mẫu Jenemai 1 lá. Chốt Ally, quyền sở hữu và thu hồi token khi chết/bị lấy cắp; xem luật trên từng thẻ. Đổi số bản cần cấu hình khác, không thay bằng ghi chú.',
    );
  if (setup.characterSetIds.some((s) => !s.startsWith('sh-official-')))
    add(
      'community-characters',
      'Chốt các luật cộng đồng chưa rõ của tướng có trong kho chọn. Không chia tướng chưa chốt được luật; lưu danh sách loại trừ tại đây.',
    );
  if (
    setup.presetId === 'custom-mix' ||
    (setup.ruleset === 'shadow-hunters' && setup.drawSetIds.some((s) => s.startsWith('sr-'))) ||
    (setup.ruleset === 'shadow-raiders' &&
      setup.drawSetIds.includes('shadow-hunters-remastered-original'))
  )
    add(
      'cross-set',
      'Ghi quy tắc chuyển đổi tên trang bị, phe, tầm đánh và địa điểm giữa các bộ. Không tự coi Raider/Citizen là Hunter/Neutral.',
    );
  if (setup.drawSetIds.some((s) => s.startsWith('sr-')))
    add(
      'robe',
      'Chốt Áo hiền triết: mặt thẻ ghi 1 sát thương giảm về 0 là đánh hụt; ghi rõ cách xử lý cùng FAQ và các hiệu ứng phụ thuộc đánh trúng.',
    );
  for (const c of selectedCards(setup).filter((c) => c.deck === 'character')) {
    if (c.id === 'muttstain-deckhand' && setup.playerCount !== 7) continue;
    const unresolved = c.notes.filter((n) =>
      /cần duyệt|chưa làm rõ|chưa chốt|không rõ|không làm rõ|không giải thích|không nói rõ|không nêu|cần bạn duyệt/.test(
        n,
      ),
    );
    if (unresolved.length)
      add(
        `character:${c.id}`,
        `${c.name}: ${unresolved.join(' ')} Ghi luật cụ thể nhóm chốt hoặc bỏ tướng này khỏi kho chia.`,
      );
  }
  return result;
}

export function setupErrors(setup: Setup): string[] {
  if (setup.presetId === 'fangs-native')
    return ['Fangs chưa đủ danh mục mặt thẻ; chưa thể bắt đầu.'];
  const errors: string[] = [];
  const validDraws = [
    'shadow-hunters-remastered-original',
    'sr-base',
    'sr-airship',
    'jenemai-items',
  ];
  if (!presets.some((p) => p.id === setup.presetId)) errors.push('Mode không hợp lệ.');
  if (setup.presetId === 'fangs-native' || setup.drawSetIds.includes('fangs-original-draw-decks'))
    errors.push('Fangs chưa đủ danh mục mặt thẻ; chưa thể bắt đầu.');
  if (setup.drawSetIds.some((s) => !validDraws.includes(s)))
    errors.push('Bộ bài chưa được hỗ trợ.');
  if (setup.characterSetIds.some((s) => !sets.some((v) => v.id === s && 'character_ids' in v)))
    errors.push('Bộ tướng không hợp lệ.');
  if (!['shadow-hunters', 'shadow-raiders'].includes(setup.ruleset))
    errors.push('Luật nền không hợp lệ.');
  const max =
    setup.ruleset === 'shadow-raiders' && setup.drawSetIds.includes('sr-airship') ? 10 : 8;
  if (!Number.isInteger(setup.playerCount) || setup.playerCount < 4 || setup.playerCount > max)
    errors.push(`Luật đã có hỗ trợ 4–${max} người.`);
  if (setup.drawSetIds.includes('sr-airship') && !setup.drawSetIds.includes('sr-base'))
    errors.push('Mở rộng Khí cầu cần bộ Raiders gốc.');
  const cards = selectedCards(setup);
  const characters = catalog.characters.filter((c) =>
    cards.some((r) => r.id === c.id && r.deck === 'character'),
  );
  const allocation =
    setup.playerCount === 8 || setup.playerCount >= 9
      ? [3, 3, setup.playerCount - 6]
      : [2, 2, setup.playerCount - 4];
  for (const [i, faction] of ['hunter', 'shadow', 'neutral'].entries()) {
    if (characters.filter((c) => c.faction === faction).length < allocation[i]!)
      errors.push(
        `Kho tướng cần ít nhất ${allocation[i]} ${faction} cho ${setup.playerCount} người.`,
      );
  }
  if (!cards.some((c) => ['white', 'black', 'green'].includes(c.deck)))
    errors.push('Chọn bộ bài bốc.');
  if (cards.some((c) => !c.effect.trim())) errors.push('Có thẻ thiếu nội dung; chưa thể bắt đầu.');
  for (const issue of requiredDecisions(setup)) {
    if (!setup.decisions[issue.id]?.trim()) errors.push(issue.text);
  }
  return errors;
}

export function rulesFor(setup: Setup): Session['rules'] {
  const raiders = setup.ruleset === 'shadow-raiders';
  const rules = [
    {
      title: 'Chuẩn bị và kết thúc',
      text: `4/5/6/7 người: 2 Hunter, 2 Shadow và lần lượt 0/1/2/3 Neutral. 8 người: 3/3/2.${raiders ? ' 9/10 người với Khí cầu: 3/3/3 hoặc 3/3/4; dùng tên phe của bộ Raiders theo quyết định chuyển đổi.' : ''} Chia kín theo phe rồi trộn. Ván kết thúc ngay khi đạt điều kiện thắng trên thẻ; mọi người đạt điều kiện cùng thắng.`,
    },
    {
      title: 'Lượt và di chuyển',
      text: raiders
        ? 'Theo chiều kim đồng hồ: di chuyển → hành động địa điểm (tùy chọn) → tấn công (tùy chọn). Gieo D4 + D6, tới địa điểm theo tổng. Bộ gốc: tổng 10 chọn địa điểm khác; trúng địa điểm hiện tại được ở lại. Với Khí cầu, tổng 10 lên khí cầu.'
        : 'Theo chiều kim đồng hồ: di chuyển bắt buộc → hành động địa điểm tùy chọn → tấn công tùy chọn. Gieo D4 + D6. Tổng 7 chọn địa điểm khác; gieo trúng nơi đang đứng thì gieo lại.',
    },
    {
      title: 'Tấn công',
      text: raiders
        ? 'Đánh người ở cùng địa điểm hoặc địa điểm kế tiếp ngược chiều kim đồng hồ. Sát thương là chênh lệch D4 và D6; hai số bằng nhau thì hụt. Trang bị có thể thay đổi cách đánh.'
        : 'Đánh người ở cùng địa điểm hoặc địa điểm ghép cặp. Sát thương là chênh lệch D4 và D6; hai số bằng nhau thì hụt. Áp dụng ngoại lệ trên trang bị.',
    },
    {
      title: 'Bốc bài và danh tính',
      text: 'Trắng/đen dùng một lần: công khai, xử lý rồi bỏ. Trang bị đặt ngửa và áp dụng hiệu ứng. Bài xanh trao kín cho mục tiêu, mục tiêu làm theo điều kiện; không công bố nội dung. Hết chồng bài thì xáo chồng bỏ tương ứng. Kỹ năng dùng đúng thời điểm trên thẻ; công khai danh tính khi dùng, trừ ngoại lệ trên thẻ.',
    },
    {
      title: 'Sát thương và loại người chơi',
      text: 'Sát thương đạt HP tối đa thì loại, công khai nhân vật và bỏ trang bị. Hạ bằng đòn tấn công được lấy 1 trang bị trước khi bỏ phần còn lại, trừ hiệu ứng thẻ. Không tự xác định thắng chỉ dựa vào còn sống hoặc phe.',
    },
  ];
  if (!raiders)
    rules.push({
      title: 'Địa điểm Hunters',
      text: '2–3 Hermit’s Cabin: bốc xanh; 4–5 Underworld Gate: chọn một chồng bài; 6 Church: trắng; 8 Weird Woods: gây 2 hoặc hồi 1 cho một người; 9 Cemetery: đen; 10 Erstwhile Altar: lấy 1 trang bị. Các hành động đều tùy chọn.',
    });
  if (setup.drawSetIds.includes('sr-airship'))
    rules.push({
      title: 'Khí cầu nữ hoàng',
      text: catalog.locations.find((c) => c.id.endsWith('airship'))!.rules_vi,
    });
  if (setup.drawSetIds.includes('jenemai-items'))
    rules.push({
      title: 'Jenemai — luật nguồn',
      text:
        catalog.optional_sets[0]!.ally_rule_vi +
        ' Chuẩn bị token nhà thờ, Spellcaster và 1–3 dấu bom; đọc quyết định nhóm về quyền sở hữu và thu hồi.',
    });
  return rules;
}

export function startSession(setup: Setup, now = new Date().toISOString()): Session {
  const errors = setupErrors(setup);
  if (errors.length) throw new Error(errors[0]);
  return JSON.parse(
    JSON.stringify({
      version: 1,
      catalogRevision: `${catalog.schema_version}:${catalog.reviewed_at}`,
      startedAt: now,
      label: presets.find((p) => p.id === setup.presetId)!.label_vi,
      setup,
      cards: selectedCards(setup),
      rules: rulesFor(setup),
      decisions: requiredDecisions(setup).map((i) => ({
        id: i.id,
        title: i.text,
        text: setup.decisions[i.id]!.trim(),
      })),
      setLabels: [...setup.characterSetIds, ...setup.drawSetIds].map(setName),
    }),
  ) as Session;
}

export function restoreSession(raw: string): Session | null {
  try {
    const s: unknown = JSON.parse(raw);
    if (!s || typeof s !== 'object') return null;
    const v = s as Session;
    if (
      v.version !== 1 ||
      typeof v.label !== 'string' ||
      typeof v.startedAt !== 'string' ||
      typeof v.catalogRevision !== 'string' ||
      !v.setup ||
      !Array.isArray(v.cards) ||
      !v.cards.length ||
      !Array.isArray(v.rules) ||
      !Array.isArray(v.decisions) ||
      !Array.isArray(v.setLabels) ||
      !v.setLabels.every((x) => typeof x === 'string') ||
      !Number.isInteger(v.setup.playerCount) ||
      !['shadow-hunters', 'shadow-raiders'].includes(v.setup.ruleset) ||
      !v.cards.every(
        (c) =>
          c &&
          ['key', 'id', 'name', 'mark', 'version', 'deck', 'effect', 'setId'].every(
            (k) => typeof c[k as keyof CardRecord] === 'string',
          ) &&
          Number.isInteger(c.quantity) &&
          c.quantity > 0 &&
          Array.isArray(c.notes) &&
          c.notes.every((n) => typeof n === 'string') &&
          Array.isArray(c.sourceIds) &&
          Array.isArray(c.sources) &&
          c.sources.every(
            (source) =>
              source &&
              typeof source.id === 'string' &&
              typeof source.title === 'string' &&
              (source.url === undefined || typeof source.url === 'string'),
          ),
      ) ||
      ![...v.rules, ...v.decisions].every((r) => r && typeof r.text === 'string') ||
      !v.rules.every((r) => typeof r.title === 'string')
    )
      return null;
    return v;
  } catch {
    return null;
  }
}
