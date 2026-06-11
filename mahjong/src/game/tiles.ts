import { Tile, TileSuit } from '../types/mahjong';

const HONOR_NAMES: Record<number, string> = {
  1: '東', 2: '南', 3: '西', 4: '北', 5: '白', 6: '發', 7: '中'
};

export function createAllTiles(): Tile[] {
  const tiles: Tile[] = [];
  let id = 0;

  // Man (1-9) x4
  for (let n = 1; n <= 9; n++) {
    for (let c = 0; c < 4; c++) {
      tiles.push({ suit: 'm', number: n, id: id++, isRed: n === 5 && c === 0 });
    }
  }
  // Pin (1-9) x4
  for (let n = 1; n <= 9; n++) {
    for (let c = 0; c < 4; c++) {
      tiles.push({ suit: 'p', number: n, id: id++, isRed: n === 5 && c === 0 });
    }
  }
  // Sou (1-9) x4
  for (let n = 1; n <= 9; n++) {
    for (let c = 0; c < 4; c++) {
      tiles.push({ suit: 's', number: n, id: id++, isRed: n === 5 && c === 0 });
    }
  }
  // Honors (1-7) x4
  for (let n = 1; n <= 7; n++) {
    for (let c = 0; c < 4; c++) {
      tiles.push({ suit: 'z', number: n, id: id++ });
    }
  }

  return tiles;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getTileDisplay(tile: Tile): string {
  if (tile.suit === 'z') {
    return HONOR_NAMES[tile.number] || '?';
  }
  const suitChar = tile.suit === 'm' ? '万' : tile.suit === 'p' ? '筒' : '索';
  return `${tile.number}${suitChar}`;
}

export function getTileLabel(tile: Tile): string {
  if (tile.suit === 'z') return HONOR_NAMES[tile.number] || '?';
  return `${tile.number}${tile.suit}`;
}

export function suitName(suit: TileSuit): string {
  switch (suit) {
    case 'm': return '萬';
    case 'p': return '筒';
    case 's': return '索';
    case 'z': return '字';
  }
}

export function getHonorName(number: number): string {
  return HONOR_NAMES[number] || '?';
}

export function tilesEqual(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.number === b.number;
}

export function tileKey(t: Tile): string {
  return `${t.suit}${t.number}`;
}
