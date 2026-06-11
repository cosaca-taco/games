import { Tile, Meld, MentsuGroup, WinCombination, YakuResult, WinResult } from '../types/mahjong';

export function calculateFu(
  combination: WinCombination,
  melds: Meld[],
  isTsumo: boolean,
  isOpen: boolean,
  winTile: Tile,
  seatWind: number,
  roundWind: number
): number {
  if (combination.isChiitoi) return 25;
  if (combination.isKokushi) return 30;

  let fu = 0;

  // Base fu
  if (!isOpen) {
    fu += 30; // menzen ron base
    if (isTsumo) fu = 20; // tsumo base (different)
  } else {
    fu += 20; // open base
  }

  // Tsumo fu (not for pinfu)
  if (isTsumo) {
    fu += 2;
  }

  // Menzen ron bonus
  if (!isOpen && !isTsumo) {
    fu += 10;
  }

  // Mentsu fu
  for (const m of combination.mentsu) {
    if (m.type === 'koutsu') {
      const isTerminalOrHonor = m.tiles[0].suit === 'z' || m.tiles[0].number === 1 || m.tiles[0].number === 9;
      if (m.isOpen) {
        fu += isTerminalOrHonor ? 4 : 2;
      } else {
        fu += isTerminalOrHonor ? 8 : 4;
      }
    }
    // Kan fu
    if (m.tiles.length === 4) {
      const isTerminalOrHonor = m.tiles[0].suit === 'z' || m.tiles[0].number === 1 || m.tiles[0].number === 9;
      if (m.isOpen) {
        fu += isTerminalOrHonor ? 16 : 8;
      } else {
        fu += isTerminalOrHonor ? 32 : 16;
      }
    }
  }

  // Add open meld fu
  for (const meld of melds) {
    const t = meld.tiles[0];
    const isTerminalOrHonor = t.suit === 'z' || t.number === 1 || t.number === 9;
    if (meld.type === 'pon') {
      fu += isTerminalOrHonor ? 4 : 2;
    } else if (meld.type === 'kan') {
      fu += isTerminalOrHonor ? 16 : 8;
    } else if (meld.type === 'closedKan') {
      fu += isTerminalOrHonor ? 32 : 16;
    }
  }

  // Jantou fu
  if (combination.jantou.length >= 1) {
    const pair = combination.jantou[0];
    if (pair.suit === 'z') {
      const n = pair.number;
      if (n === 5 || n === 6 || n === 7 || n === seatWind || n === roundWind) {
        fu += 2;
      }
    }
  }

  // Wait fu - simplified: kanchan or penchan = +2
  // (shanpon and tanki = 0, ryanmen = 0)
  // We detect kanchan/penchan by checking win tile position in mentsu
  for (const m of combination.mentsu) {
    if (m.type === 'shuntsu') {
      const nums = m.tiles.map(t => t.number).sort((a, b) => a - b);
      const winN = winTile.number;
      const winS = winTile.suit;
      if (m.tiles[0].suit === winS) {
        // kanchan: win tile is middle
        if (winN === nums[1]) fu += 2;
        // penchan: win is 3 of 1-2-3 or 7 of 7-8-9
        if ((nums[0] === 1 && winN === 3) || (nums[2] === 9 && winN === 7)) fu += 2;
      }
    }
  }

  // Round up to nearest 10
  return Math.ceil(fu / 10) * 10;
}

export function calculateHan(yaku: YakuResult[]): number {
  return yaku.reduce((sum, y) => sum + y.han, 0);
}

function roundUpTo100(n: number): number {
  return Math.ceil(n / 100) * 100;
}

export function hanFuToPoints(
  han: number,
  fu: number,
  isDealer: boolean
): { total: number; ron: number; tsumoDealer: number; tsumoNonDealer: number } {
  // Yakuman
  if (han >= 13) {
    const base = isDealer ? 48000 : 32000;
    return { total: base, ron: base, tsumoDealer: 16000, tsumoNonDealer: 8000 };
  }

  // Mangan+
  let pointName = '';
  if (han >= 5 || (han === 4 && fu >= 30) || (han === 3 && fu >= 70)) pointName = 'mangan';
  if (han >= 8) pointName = 'haneman';
  if (han >= 11) pointName = 'baiman';
  if (han >= 13) pointName = 'sanbaiman';

  if (pointName) {
    let base = 0;
    if (pointName === 'mangan') base = isDealer ? 12000 : 8000;
    else if (pointName === 'haneman') base = isDealer ? 18000 : 12000;
    else if (pointName === 'baiman') base = isDealer ? 24000 : 16000;
    else if (pointName === 'sanbaiman') base = isDealer ? 36000 : 24000;
    const tsumoEach = base / (isDealer ? 3 : 4);
    return {
      total: base,
      ron: base,
      tsumoDealer: roundUpTo100(tsumoEach),
      tsumoNonDealer: roundUpTo100(isDealer ? tsumoEach : tsumoEach / 2),
    };
  }

  // Normal calculation
  const basicPoints = fu * Math.pow(2, han + 2);
  if (isDealer) {
    const tsumoEach = roundUpTo100(basicPoints * 2);
    const ron = roundUpTo100(basicPoints * 6);
    return { total: ron, ron, tsumoDealer: tsumoEach, tsumoNonDealer: tsumoEach };
  } else {
    const tsumoDealer = roundUpTo100(basicPoints * 2);
    const tsumoNonDealer = roundUpTo100(basicPoints);
    const ron = roundUpTo100(basicPoints * 4);
    return { total: ron, ron, tsumoDealer, tsumoNonDealer };
  }
}

export function distributePoints(
  winResult: WinResult,
  players: { score: number; id: number }[],
  isDealer: boolean,
  honba: number,
  riichiSticks: number
): number[] {
  const n = players.length;
  const deltas = new Array(n).fill(0);
  const honbaBonus = honba * 300;

  if (winResult.isTsumo) {
    const { tsumoDealer, tsumoNonDealer } = hanFuToPoints(winResult.han, winResult.fu, isDealer);
    let total = 0;
    for (let i = 0; i < n; i++) {
      if (i === winResult.winner) continue;
      const pay = isDealer ? tsumoDealer : (i === /* dealer idx */ 0 ? tsumoDealer : tsumoNonDealer);
      // Simplified: dealer pays double
      const actualPay = tsumoDealer; // each pays tsumoDealer if dealer wins, or specific amounts otherwise
      deltas[i] -= actualPay + Math.floor(honbaBonus / 3);
      total += actualPay + Math.floor(honbaBonus / 3);
    }
    deltas[winResult.winner] = total + riichiSticks * 1000;
  } else {
    const { ron } = hanFuToPoints(winResult.han, winResult.fu, isDealer);
    const loser = winResult.loser!;
    deltas[loser] = -(ron + honbaBonus);
    deltas[winResult.winner] = ron + honbaBonus + riichiSticks * 1000;
  }

  return deltas;
}
