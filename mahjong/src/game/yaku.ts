import { Tile, Meld, MentsuGroup, WinCombination, YakuResult, YakuContext } from '../types/mahjong';

function isTerminalOrHonor(t: Tile): boolean {
  if (t.suit === 'z') return true;
  return t.number === 1 || t.number === 9;
}

function isTerminal(t: Tile): boolean {
  if (t.suit === 'z') return false;
  return t.number === 1 || t.number === 9;
}

function isHonor(t: Tile): boolean {
  return t.suit === 'z';
}

function isGreen(t: Tile): boolean {
  if (t.suit === 's' && [2, 3, 4, 6, 8].includes(t.number)) return true;
  if (t.suit === 'z' && t.number === 6) return true;
  return false;
}

function mentsuEqual(a: MentsuGroup, b: MentsuGroup): boolean {
  if (a.type !== b.type) return false;
  if (a.tiles.length !== b.tiles.length) return false;
  for (let i = 0; i < a.tiles.length; i++) {
    if (a.tiles[i].suit !== b.tiles[i].suit || a.tiles[i].number !== b.tiles[i].number) return false;
  }
  return true;
}

function isOpen(melds: Meld[]): boolean {
  return melds.some(m => m.type === 'chi' || m.type === 'pon' || m.type === 'kan');
}

export function detectYaku(
  hand: WinCombination,
  allTiles: Tile[],
  melds: Meld[],
  context: YakuContext
): YakuResult[] {
  const results: YakuResult[] = [];
  const open = isOpen(melds);

  if (hand.isKokushi) {
    results.push({ name: 'Kokushi', nameJp: '国士無双', han: 13, isYakuman: true });
    addDoraYaku(results, context);
    return results;
  }

  // Tenhou / Chihou
  if (context.isDealer && context.isTsumo && context.isLastTile === false && melds.length === 0) {
    // tenhou check is done externally
  }

  // Riichi
  if (context.isDoubleRiichi) {
    results.push({ name: 'Double Riichi', nameJp: 'ダブル立直', han: 2, isYakuman: false });
  } else if (context.isRiichi) {
    results.push({ name: 'Riichi', nameJp: '立直', han: 1, isYakuman: false });
  }

  if (context.isIppatsu && (context.isRiichi || context.isDoubleRiichi)) {
    results.push({ name: 'Ippatsu', nameJp: '一発', han: 1, isYakuman: false });
  }

  // Tsumo (closed only)
  if (context.isTsumo && !open) {
    results.push({ name: 'Menzen Tsumo', nameJp: '門前清自摸和', han: 1, isYakuman: false });
  }

  // Haitei / Houtei
  if (context.isHaitei) {
    results.push({ name: 'Haitei', nameJp: '海底摸月', han: 1, isYakuman: false });
  }
  if (context.isHoutei) {
    results.push({ name: 'Houtei', nameJp: '河底撈魚', han: 1, isYakuman: false });
  }

  // Rinshan
  if (context.isRinshan) {
    results.push({ name: 'Rinshan Kaihou', nameJp: '嶺上開花', han: 1, isYakuman: false });
  }

  // Chankan
  if (context.isChankan) {
    results.push({ name: 'Chankan', nameJp: '槍槓', han: 1, isYakuman: false });
  }

  if (hand.isChiitoi) {
    results.push({ name: 'Chiitoitsu', nameJp: '七対子', han: 2, isYakuman: false });
    addDoraYaku(results, context);
    return results;
  }

  const mentsu = hand.mentsu;

  // Tanyao
  const allSimples = allTiles.every(t => !isTerminalOrHonor(t));
  if (allSimples) {
    if (!open || context.isRiichi === false) {
      // kuitan handled in engine
      results.push({ name: 'Tanyao', nameJp: '断么九', han: 1, isYakuman: false });
    }
  }

  // Pinfu (closed, all shuntsu, non-yakuhai pair, two-sided wait)
  if (!open) {
    const allShuntsu = mentsu.filter(m => !m.isOpen).every(m => m.type === 'shuntsu');
    const openMentsuCount = mentsu.filter(m => m.isOpen).length;
    if (allShuntsu && openMentsuCount === 0) {
      const pair = hand.jantou;
      if (pair.length >= 1) {
        const pairTile = pair[0];
        const isYakuhaiPair = (pairTile.suit === 'z' && (pairTile.number === 5 || pairTile.number === 6 || pairTile.number === 7 ||
          pairTile.number === context.seatWind || pairTile.number === context.roundWind));
        if (!isYakuhaiPair) {
          results.push({ name: 'Pinfu', nameJp: '平和', han: 1, isYakuman: false });
        }
      }
    }
  }

  // Iipeiko (closed, two identical shuntsu)
  if (!open) {
    const shuntsuList = mentsu.filter(m => m.type === 'shuntsu');
    let foundIipeiko = false;
    for (let i = 0; i < shuntsuList.length; i++) {
      for (let j = i + 1; j < shuntsuList.length; j++) {
        if (mentsuEqual(shuntsuList[i], shuntsuList[j])) {
          foundIipeiko = true;
          break;
        }
      }
      if (foundIipeiko) break;
    }
    if (foundIipeiko) {
      results.push({ name: 'Iipeiko', nameJp: '一盃口', han: 1, isYakuman: false });
    }
  }

  // Yakuhai
  for (const m of mentsu) {
    if (m.type === 'koutsu' && m.tiles[0].suit === 'z') {
      const n = m.tiles[0].number;
      if (n === 5) results.push({ name: 'Haku', nameJp: '白', han: 1, isYakuman: false });
      else if (n === 6) results.push({ name: 'Hatsu', nameJp: '發', han: 1, isYakuman: false });
      else if (n === 7) results.push({ name: 'Chun', nameJp: '中', han: 1, isYakuman: false });
      else if (n === context.roundWind) results.push({ name: 'Round Wind', nameJp: '場風', han: 1, isYakuman: false });
      else if (n === context.seatWind) results.push({ name: 'Seat Wind', nameJp: '自風', han: 1, isYakuman: false });
    }
  }

  // Sanshoku doukou (three koutsu same number different suits)
  {
    const koutsuNums = new Map<number, string[]>();
    for (const m of mentsu) {
      if (m.type === 'koutsu' && m.tiles[0].suit !== 'z') {
        const n = m.tiles[0].number;
        if (!koutsuNums.has(n)) koutsuNums.set(n, []);
        koutsuNums.get(n)!.push(m.tiles[0].suit);
      }
    }
    for (const [, suits] of koutsuNums) {
      if (suits.includes('m') && suits.includes('p') && suits.includes('s')) {
        results.push({ name: 'Sanshoku Doukou', nameJp: '三色同刻', han: 2, isYakuman: false });
        break;
      }
    }
  }

  // Sanshoku doujun (three shuntsu same sequence different suits)
  {
    const shuntsuStarts = new Map<number, string[]>();
    for (const m of mentsu) {
      if (m.type === 'shuntsu') {
        const n = m.tiles[0].number;
        if (!shuntsuStarts.has(n)) shuntsuStarts.set(n, []);
        shuntsuStarts.get(n)!.push(m.tiles[0].suit);
      }
    }
    for (const [, suits] of shuntsuStarts) {
      if (suits.includes('m') && suits.includes('p') && suits.includes('s')) {
        results.push({ name: 'Sanshoku Doujun', nameJp: '三色同順', han: open ? 1 : 2, isYakuman: false });
        break;
      }
    }
  }

  // Ittsu (1-2-3, 4-5-6, 7-8-9 in same suit)
  {
    const suitShuntsu: Record<string, number[]> = { m: [], p: [], s: [] };
    for (const m of mentsu) {
      if (m.type === 'shuntsu' && m.tiles[0].suit !== 'z') {
        suitShuntsu[m.tiles[0].suit].push(m.tiles[0].number);
      }
    }
    for (const suit of ['m', 'p', 's']) {
      const starts = suitShuntsu[suit];
      if (starts.includes(1) && starts.includes(4) && starts.includes(7)) {
        results.push({ name: 'Ittsu', nameJp: '一気通貫', han: open ? 1 : 2, isYakuman: false });
        break;
      }
    }
  }

  // Toitoi (all koutsu, open ok)
  {
    const allKoutsu = mentsu.every(m => m.type === 'koutsu');
    if (allKoutsu && mentsu.length >= 4) {
      results.push({ name: 'Toitoi', nameJp: '対々和', han: 2, isYakuman: false });
    }
  }

  // Sanankou (3 concealed koutsu)
  {
    const closedKoutsu = mentsu.filter(m => m.type === 'koutsu' && !m.isOpen).length;
    if (closedKoutsu >= 3) {
      if (closedKoutsu === 4) {
        // Suuankou
        results.push({ name: 'Suuankou', nameJp: '四暗刻', han: 13, isYakuman: true });
      } else {
        results.push({ name: 'Sanankou', nameJp: '三暗刻', han: 2, isYakuman: false });
      }
    }
  }

  // Honitsu
  {
    const suits = new Set(allTiles.filter(t => t.suit !== 'z').map(t => t.suit));
    if (suits.size === 1) {
      const hasHonors = allTiles.some(t => t.suit === 'z');
      if (hasHonors) {
        results.push({ name: 'Honitsu', nameJp: '混一色', han: open ? 2 : 3, isYakuman: false });
      }
    }
  }

  // Chinitsu
  {
    const suits = new Set(allTiles.map(t => t.suit));
    if (suits.size === 1 && !suits.has('z')) {
      results.push({ name: 'Chinitsu', nameJp: '清一色', han: open ? 5 : 6, isYakuman: false });
    }
  }

  // Daisangen (3 dragon koutsu)
  {
    const dragons = mentsu.filter(m => m.type === 'koutsu' && m.tiles[0].suit === 'z' &&
      [5, 6, 7].includes(m.tiles[0].number));
    if (dragons.length === 3) {
      results.push({ name: 'Daisangen', nameJp: '大三元', han: 13, isYakuman: true });
    }
  }

  // Tsuuiisou (all honors)
  {
    if (allTiles.every(t => t.suit === 'z')) {
      results.push({ name: 'Tsuuiisou', nameJp: '字一色', han: 13, isYakuman: true });
    }
  }

  // Chinroutou (all terminals)
  {
    if (allTiles.every(t => isTerminal(t))) {
      results.push({ name: 'Chinroutou', nameJp: '清老頭', han: 13, isYakuman: true });
    }
  }

  // Ryuuiisou (all green)
  {
    if (allTiles.every(t => isGreen(t))) {
      results.push({ name: 'Ryuuiisou', nameJp: '緑一色', han: 13, isYakuman: true });
    }
  }

  // Chuurenpoutou (1-1-1-2-3-4-5-6-7-8-9-9-9 + 1 more in same suit)
  {
    if (!open && allTiles.every(t => t.suit !== 'z')) {
      const suits = new Set(allTiles.map(t => t.suit));
      if (suits.size === 1) {
        const nums = [...allTiles].map(t => t.number).sort((a, b) => a - b);
        const base = [1,1,1,2,3,4,5,6,7,8,9,9,9];
        const extra = nums.filter((n, i) => {
          const b = [...base];
          const idx = b.indexOf(n);
          if (idx >= 0) { b.splice(idx, 1); return false; }
          return true;
        });
        if (extra.length === 1) {
          results.push({ name: 'Chuurenpoutou', nameJp: '九蓮宝燈', han: 13, isYakuman: true });
        }
      }
    }
  }

  addDoraYaku(results, context);

  return results;
}

function addDoraYaku(results: YakuResult[], context: YakuContext): void {
  const totalDora = context.doraCount + context.redDoraCount;
  if (totalDora > 0) {
    results.push({ name: `Dora ${totalDora}`, nameJp: `ドラ${totalDora}`, han: totalDora, isYakuman: false });
  }
  if (context.uraDoraCount > 0) {
    results.push({ name: `Ura Dora ${context.uraDoraCount}`, nameJp: `裏ドラ${context.uraDoraCount}`, han: context.uraDoraCount, isYakuman: false });
  }
}

export function getDoraFromIndicator(indicator: Tile): Tile {
  if (indicator.suit === 'z') {
    let next = indicator.number + 1;
    if (indicator.number <= 4) {
      if (next > 4) next = 1;
    } else {
      if (next > 7) next = 5;
    }
    return { ...indicator, number: next };
  }
  let next = indicator.number + 1;
  if (next > 9) next = 1;
  return { ...indicator, number: next };
}

export function countDora(tiles: Tile[], doraIndicators: Tile[]): number {
  let count = 0;
  for (const indicator of doraIndicators) {
    const dora = getDoraFromIndicator(indicator);
    for (const t of tiles) {
      if (t.suit === dora.suit && t.number === dora.number) count++;
    }
  }
  return count;
}
