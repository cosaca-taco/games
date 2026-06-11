import { Player, Tile, GameState, Meld } from '../types/mahjong';
import { sortHand, findShanten, checkWin } from './hand';
import { tilesEqual } from './tiles';

function getShantenAfterDiscard(player: Player, discard: Tile): number {
  const remaining = player.hand.filter(t => t.id !== discard.id);
  return findShanten(remaining, player.melds);
}

function isDangerous(tile: Tile, gameState: GameState, forPlayer: number): boolean {
  for (const p of gameState.players) {
    if (p.id === forPlayer) continue;
    if (p.isRiichi) {
      // Simplified: terminals and honors are safer, mid tiles dangerous
      if (tile.suit !== 'z' && tile.number >= 4 && tile.number <= 6) return true;
    }
  }
  return false;
}

export function aiDiscard(player: Player, gameState: GameState): Tile {
  const difficulty = gameState.settings.difficulty;
  const hand = [...player.hand];

  if (difficulty === 'normal') {
    // Discard tile that maximizes shanten reduction (greedy)
    let bestTile = hand[0];
    let bestShanten = 99;
    for (const t of hand) {
      const sh = getShantenAfterDiscard(player, t);
      if (sh < bestShanten) {
        bestShanten = sh;
        bestTile = t;
      }
    }
    return bestTile;
  }

  if (difficulty === 'strong') {
    // Like normal but avoid dangerous tiles when riichi opponents exist
    let bestTile = hand[0];
    let bestShanten = 99;
    for (const t of hand) {
      const sh = getShantenAfterDiscard(player, t);
      if (sh < bestShanten || (sh === bestShanten && isDangerous(bestTile, gameState, player.id) && !isDangerous(t, gameState, player.id))) {
        bestShanten = sh;
        bestTile = t;
      }
    }
    return bestTile;
  }

  // veryStrong: full tile efficiency + defense
  let bestTile = hand[0];
  let bestShanten = 99;
  let bestScore = -999;

  for (const t of hand) {
    const sh = getShantenAfterDiscard(player, t);
    let score = -sh * 10;
    // Bonus for keeping dora
    // Penalty for dangerous tile kept
    if (isDangerous(t, gameState, player.id)) score -= 5;
    if (sh < bestShanten || (sh === bestShanten && score > bestScore)) {
      bestShanten = sh;
      bestScore = score;
      bestTile = t;
    }
  }
  return bestTile;
}

export function aiShouldRiichi(player: Player, gameState: GameState, _discardTile: Tile): boolean {
  const difficulty = gameState.settings.difficulty;
  const rand = Math.random();
  if (difficulty === 'normal') return rand < 0.3;
  if (difficulty === 'strong') return rand < 0.6;
  return rand < 0.8;
}

export function aiShouldClaim(
  player: Player,
  tile: Tile,
  claimType: 'chi' | 'pon' | 'kan' | 'ron',
  gameState: GameState
): boolean {
  if (claimType === 'ron') return true;

  const difficulty = gameState.settings.difficulty;

  if (claimType === 'pon' || claimType === 'kan') {
    // Check if claiming reduces shanten significantly
    const currentShanten = findShanten(player.hand, player.melds);
    const newHand = player.hand.filter(t => !tilesEqual(t, tile)).slice(0, player.hand.length - 2);
    const newMeld: Meld = { type: claimType === 'pon' ? 'pon' : 'kan', tiles: [tile, tile, tile] };
    const newShanten = findShanten(newHand, [...player.melds, newMeld]);

    if (difficulty === 'normal') return newShanten <= currentShanten && Math.random() < 0.5;
    if (difficulty === 'strong') return newShanten < currentShanten;
    return newShanten < currentShanten || (newShanten === currentShanten && Math.random() < 0.3);
  }

  if (claimType === 'chi') {
    const currentShanten = findShanten(player.hand, player.melds);
    if (difficulty === 'normal') return currentShanten >= 1 && Math.random() < 0.4;
    if (difficulty === 'strong') return currentShanten >= 1;
    return currentShanten >= 1;
  }

  return false;
}

export function aiChooseChiTiles(player: Player, tile: Tile): [Tile, Tile] | null {
  if (tile.suit === 'z') return null;

  const hand = player.hand;
  const n = tile.number;
  const s = tile.suit;

  // Possible chi patterns: [n-2,n-1], [n-1,n+1], [n+1,n+2]
  const patterns: [number, number][] = [];
  if (n >= 3) patterns.push([n - 2, n - 1]);
  if (n >= 2 && n <= 8) patterns.push([n - 1, n + 1]);
  if (n <= 7) patterns.push([n + 1, n + 2]);

  for (const [a, b] of patterns) {
    const tileA = hand.find(t => t.suit === s && t.number === a);
    const tileB = hand.find(t => t.suit === s && t.number === b);
    if (tileA && tileB) return [tileA, tileB];
  }

  return null;
}

export function aiChooseDiscard(player: Player, gameState: GameState): Tile {
  return aiDiscard(player, gameState);
}
