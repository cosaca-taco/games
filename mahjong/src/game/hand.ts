import { Tile, Meld, MentsuGroup, WinCombination } from '../types/mahjong';

const SUIT_ORDER: Record<string, number> = { m: 0, p: 1, s: 2, z: 3 };

export function sortHand(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => {
    const so = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    if (so !== 0) return so;
    return a.number - b.number;
  });
}

function countTiles(tiles: Tile[]): Map<string, Tile[]> {
  const map = new Map<string, Tile[]>();
  for (const t of tiles) {
    const k = `${t.suit}${t.number}`;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(t);
  }
  return map;
}

function findWinCombinations(tiles: Tile[]): { mentsu: MentsuGroup[]; jantou: Tile[] }[] {
  const results: { mentsu: MentsuGroup[]; jantou: Tile[] }[] = [];

  function tryPair(remaining: Tile[], found: MentsuGroup[], usedPair: boolean): void {
    if (remaining.length === 0) {
      results.push({ mentsu: found, jantou: [] });
      return;
    }

    const sorted = sortHand(remaining);
    const first = sorted[0];

    if (!usedPair) {
      const same = sorted.filter(t => t.suit === first.suit && t.number === first.number);
      if (same.length >= 2) {
        const rest = removeN(sorted, [same[0], same[1]]);
        tryMentsu(rest, found, [same[0], same[1]]);
      }
    }

    const same3 = sorted.filter(t => t.suit === first.suit && t.number === first.number);
    if (same3.length >= 3) {
      const triple = same3.slice(0, 3);
      const rest = removeN(sorted, triple);
      tryPair(rest, [...found, { tiles: triple, type: 'koutsu', isOpen: false }], usedPair);
    }

    if (first.suit !== 'z') {
      const n2 = sorted.find(t => t.suit === first.suit && t.number === first.number + 1);
      const n3 = sorted.find(t => t.suit === first.suit && t.number === first.number + 2);
      if (n2 && n3) {
        const rest = removeN(sorted, [first, n2, n3]);
        tryPair(rest, [...found, { tiles: [first, n2, n3], type: 'shuntsu', isOpen: false }], usedPair);
      }
    }
  }

  function tryMentsu(remaining: Tile[], foundMentsu: MentsuGroup[], pair: Tile[]): void {
    if (remaining.length === 0) {
      results.push({ mentsu: foundMentsu, jantou: pair });
      return;
    }

    const sorted = sortHand(remaining);
    const first = sorted[0];

    const same3 = sorted.filter(t => t.suit === first.suit && t.number === first.number);
    if (same3.length >= 3) {
      const triple = same3.slice(0, 3);
      const rest = removeN(sorted, triple);
      tryMentsu(rest, [...foundMentsu, { tiles: triple, type: 'koutsu', isOpen: false }], pair);
    }

    if (first.suit !== 'z') {
      const n2 = sorted.find(t => t.suit === first.suit && t.number === first.number + 1);
      const n3 = sorted.find(t => t.suit === first.suit && t.number === first.number + 2);
      if (n2 && n3) {
        const rest = removeN(sorted, [first, n2, n3]);
        tryMentsu(rest, [...foundMentsu, { tiles: [first, n2, n3], type: 'shuntsu', isOpen: false }], pair);
      }
    }
  }

  const sorted = sortHand(tiles);
  const seen = new Set<string>();

  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    const k = `${t.suit}${t.number}`;
    if (seen.has(k)) continue;
    seen.add(k);

    const same = sorted.filter(tt => tt.suit === t.suit && tt.number === t.number);
    if (same.length >= 2) {
      const rest = removeN(sorted, [same[0], same[1]]);
      tryMentsu(rest, [], [same[0], same[1]]);
    }
  }

  return results;
}

function removeN(tiles: Tile[], toRemove: Tile[]): Tile[] {
  const remaining = [...tiles];
  for (const t of toRemove) {
    const idx = remaining.findIndex(r => r.id === t.id);
    if (idx >= 0) remaining.splice(idx, 1);
  }
  return remaining;
}

export function checkWin(handTiles: Tile[], melds: Meld[], winTile: Tile): WinCombination[] | null {
  const allTiles = [...handTiles, winTile];
  const results: WinCombination[] = [];

  const openMelds: MentsuGroup[] = melds.map(m => ({
    tiles: m.tiles,
    type: m.type === 'chi' ? 'shuntsu' : 'koutsu',
    isOpen: m.type !== 'closedKan',
  }));

  const combos = findWinCombinations(allTiles);
  for (const combo of combos) {
    results.push({
      mentsu: [...openMelds, ...combo.mentsu],
      jantou: combo.jantou,
      isChiitoi: false,
      isKokushi: false,
    });
  }

  if (melds.length === 0) {
    const counts = countTiles(allTiles);
    const pairs: Tile[][] = [];
    let valid = true;
    for (const [, grp] of counts) {
      if (grp.length === 2) pairs.push(grp);
      else if (grp.length === 4) { pairs.push(grp.slice(0, 2)); pairs.push(grp.slice(2, 4)); }
      else { valid = false; break; }
    }
    if (valid && pairs.length === 7) {
      results.push({
        mentsu: [],
        jantou: pairs[0],
        isChiitoi: true,
        isKokushi: false,
      });
    }
  }

  if (melds.length === 0) {
    const terminals = ['m1','m9','p1','p9','s1','s9','z1','z2','z3','z4','z5','z6','z7'];
    const keys = allTiles.map(t => `${t.suit}${t.number}`);
    const uniqueTerminals = new Set(terminals.filter(k => keys.includes(k)));
    if (uniqueTerminals.size === 13) {
      const hasPair = terminals.some(k => keys.filter(kk => kk === k).length >= 2);
      if (hasPair) {
        results.push({ mentsu: [], jantou: [], isChiitoi: false, isKokushi: true });
      }
    }
  }

  return results.length > 0 ? results : null;
}

export function findShanten(tiles: Tile[], melds: Meld[]): number {
  const allTiles = [...tiles];
  let minShanten = calcRegularShanten(allTiles, melds.length);

  if (melds.length === 0) {
    const counts = countTiles(allTiles);
    let pairs = 0;
    let kinds = 0;
    for (const [, grp] of counts) {
      kinds++;
      if (grp.length >= 2) pairs++;
    }
    const chitoiShanten = 6 - pairs + (kinds < 7 ? 7 - kinds : 0);
    minShanten = Math.min(minShanten, chitoiShanten);
  }

  if (melds.length === 0) {
    const terminals = new Set(['m1','m9','p1','p9','s1','s9','z1','z2','z3','z4','z5','z6','z7']);
    const keys = allTiles.map(t => `${t.suit}${t.number}`);
    const uniqueTerminals = new Set(keys.filter(k => terminals.has(k)));
    const hasPair = [...uniqueTerminals].some(k => keys.filter(kk => kk === k).length >= 2);
    const kokushiShanten = 13 - uniqueTerminals.size - (hasPair ? 1 : 0);
    minShanten = Math.min(minShanten, kokushiShanten);
  }

  return minShanten;
}

function calcRegularShanten(tiles: Tile[], openMeldCount: number): number {
  const needed = 4 - openMeldCount;
  let best = needed * 2;

  function search(remaining: Tile[], mentsu: number, partial: number, jantou: number): void {
    const cap = needed - mentsu;
    // 残り枠を超えて partial+jantou を数えないようにキャップ
    let p = Math.min(partial, cap);
    const j = jantou;
    if (p + j > cap) p = cap - j;
    if (p < 0) p = 0;
    const sh = cap * 2 - p - j - 1;
    best = Math.min(best, sh);

    if (remaining.length === 0) return;

    const sorted = sortHand(remaining);
    const first = sorted[0];

    const sameAll = sorted.filter(t => t.suit === first.suit && t.number === first.number);
    if (sameAll.length >= 3) {
      const rest = removeN(sorted, sameAll.slice(0, 3));
      search(rest, mentsu + 1, partial, jantou);
    }

    if (first.suit !== 'z') {
      const n2 = sorted.find(t => t.suit === first.suit && t.number === first.number + 1);
      const n3 = sorted.find(t => t.suit === first.suit && t.number === first.number + 2);
      if (n2 && n3) {
        const rest = removeN(sorted, [first, n2, n3]);
        search(rest, mentsu + 1, partial, jantou);
      }
    }

    if (sameAll.length >= 2 && jantou === 0) {
      const rest = removeN(sorted, sameAll.slice(0, 2));
      search(rest, mentsu, partial, 1);
    }

    if (sameAll.length >= 2 && jantou === 1) {
      const rest = removeN(sorted, sameAll.slice(0, 2));
      search(rest, mentsu, partial + 1, jantou);
    }
    if (first.suit !== 'z') {
      const n2 = sorted.find(t => t.suit === first.suit && t.number === first.number + 1);
      if (n2) {
        const rest = removeN(sorted, [first, n2]);
        search(rest, mentsu, partial + 1, jantou);
      }
      const n3 = sorted.find(t => t.suit === first.suit && t.number === first.number + 2);
      if (n3) {
        const rest = removeN(sorted, [first, n3]);
        search(rest, mentsu, partial + 1, jantou);
      }
    }
  }

  search(tiles, 0, 0, 0);
  return best;
}

export function findTenpai(tiles: Tile[], melds: Meld[]): number[] {
  if (findShanten(tiles, melds) !== 0) return [];

  const candidates: number[] = [];
  const suits: Array<'m' | 'p' | 's' | 'z'> = ['m', 'p', 's', 'z'];
  const maxNum: Record<string, number> = { m: 9, p: 9, s: 9, z: 7 };

  for (const suit of suits) {
    for (let n = 1; n <= maxNum[suit]; n++) {
      const testTile: Tile = { suit, number: n, id: -1 };
      const won = checkWin(tiles, melds, testTile);
      if (won) candidates.push(suit === 'm' ? n : suit === 'p' ? 10 + n : suit === 's' ? 20 + n : 30 + n);
    }
  }
  return candidates;
}
