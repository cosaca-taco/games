import { GameState, GameSettings, Player, Tile, Meld, ClaimState, WinResult, YakuContext } from '../types/mahjong';
import { createAllTiles, shuffle, tilesEqual } from './tiles';
import { sortHand, findShanten, checkWin, findTenpai } from './hand';
import { detectYaku, countDora } from './yaku';
import { calculateFu, calculateHan, hanFuToPoints, distributePoints } from './score';

function createPlayer(id: number, name: string, isHuman: boolean, seatWind: number): Player {
  return {
    id,
    name,
    isHuman,
    hand: [],
    melds: [],
    discards: [],
    score: 25000,
    isRiichi: false,
    isDoubleRiichi: false,
    isTenpai: false,
    ippatsu: false,
    seatWind,
  };
}

export function initGame(settings: GameSettings): GameState {
  const players = [
    createPlayer(0, 'あなた', true, 1),
    createPlayer(1, 'CPU1', false, 2),
    createPlayer(2, 'CPU2', false, 3),
    createPlayer(3, 'CPU3', false, 4),
  ];

  return {
    players,
    wall: [],
    deadWall: [],
    doraIndicators: [],
    uraDoraIndicators: [],
    round: 1,
    honba: 0,
    riichiSticks: 0,
    currentPlayer: 0,
    phase: 'dealing',
    settings,
    kanCount: 0,
    isLastTile: false,
    dealer: 0,
    turnCount: 0,
  };
}

export function dealTiles(state: GameState): GameState {
  let allTiles = createAllTiles();
  if (!state.settings.redDora) {
    allTiles = allTiles.map(t => ({ ...t, isRed: false }));
  }
  const shuffled = shuffle(allTiles);

  const deadWall = shuffled.slice(shuffled.length - 14);
  const dealWall = [...shuffled.slice(0, shuffled.length - 14)];

  const doraIndicators = [deadWall[4]];
  const uraDoraIndicators = [deadWall[9]];

  const dealtPlayers = state.players.map(p => ({ ...p, hand: [] as Tile[], melds: [], discards: [], isRiichi: false, isDoubleRiichi: false, isTenpai: false, ippatsu: false, riichiTurn: undefined }));

  let wallIdx = 0;
  for (let round = 0; round < 3; round++) {
    for (let p = 0; p < 4; p++) {
      for (let t = 0; t < 4; t++) {
        dealtPlayers[p].hand.push(dealWall[wallIdx++]);
      }
    }
  }
  for (let p = 0; p < 4; p++) {
    dealtPlayers[p].hand.push(dealWall[wallIdx++]);
  }

  for (const p of dealtPlayers) {
    p.hand = sortHand(p.hand);
  }

  const remainingWall = dealWall.slice(wallIdx);

  const dealerTile = remainingWall.shift()!;
  dealtPlayers[state.dealer].hand.push(dealerTile);
  dealtPlayers[state.dealer].hand = sortHand(dealtPlayers[state.dealer].hand);

  return {
    ...state,
    players: dealtPlayers,
    wall: remainingWall,
    deadWall,
    doraIndicators,
    uraDoraIndicators,
    phase: 'playing',
    currentPlayer: state.dealer,
    turnCount: 0,
    kanCount: 0,
    isLastTile: false,
  };
}

export function discardTile(state: GameState, tileId: number): GameState {
  const player = state.players[state.currentPlayer];
  const tile = player.hand.find(t => t.id === tileId);
  if (!tile) return state;

  const newHand = player.hand.filter(t => t.id !== tileId);
  const newDiscards = [...player.discards, tile];

  const updatedPlayer: Player = {
    ...player,
    hand: newHand,
    discards: newDiscards,
    isTenpai: findShanten(newHand, player.melds) === 0,
  };

  const newPlayers = state.players.map((p, i) =>
    i === state.currentPlayer ? updatedPlayer : p
  );

  const claimState = checkClaims(state, newPlayers, tile, state.currentPlayer);

  if (claimState && claimState.possibleActions.length > 0) {
    return {
      ...state,
      players: newPlayers,
      phase: 'claiming',
      claimState,
    };
  }

  return advanceTurn(state, newPlayers, state.currentPlayer);
}

function checkClaims(state: GameState, players: Player[], tile: Tile, fromPlayer: number): ClaimState | null {
  const actions: ClaimState['possibleActions'] = [];

  for (let i = 0; i < 4; i++) {
    if (i === fromPlayer) continue;
    const player = players[i];
    const possibleActions: ('chi' | 'pon' | 'kan' | 'ron')[] = [];

    const winCombos = checkWin(player.hand, player.melds, tile);
    if (winCombos) {
      const context = buildYakuContext(state, player, tile, false);
      const yaku = detectYakuBest(winCombos, getAllTiles(player.hand, player.melds, tile), player.melds, context);
      if (yaku.length > 0 && !isFuriten(player, tile)) {
        possibleActions.push('ron');
      }
    }

    const matching = player.hand.filter(t => tilesEqual(t, tile));
    if (matching.length >= 2) possibleActions.push('pon');
    if (matching.length >= 3) possibleActions.push('kan');

    if ((fromPlayer + 1) % 4 === i && tile.suit !== 'z') {
      if (canChi(player.hand, tile)) possibleActions.push('chi');
    }

    if (possibleActions.length > 0) {
      actions.push({ playerId: i, actions: possibleActions });
    }
  }

  if (actions.length === 0) return null;

  return { discardedTile: tile, discardedBy: fromPlayer, possibleActions: actions };
}

function canChi(hand: Tile[], tile: Tile): boolean {
  if (tile.suit === 'z') return false;
  const n = tile.number;
  const s = tile.suit;
  const has = (num: number) => hand.some(t => t.suit === s && t.number === num);
  return (has(n - 2) && has(n - 1)) || (has(n - 1) && has(n + 1)) || (has(n + 1) && has(n + 2));
}

function isFuriten(player: Player, tile: Tile): boolean {
  return player.discards.some(d => tilesEqual(d, tile));
}

function advanceTurn(state: GameState, players: Player[], currentPlayer: number): GameState {
  const nextPlayer = (currentPlayer + 1) % 4;

  const updatedPlayers = players.map(p => ({ ...p, ippatsu: false }));

  if (state.wall.length === 0) {
    return handleDraw(state, updatedPlayers);
  }

  const newWall = [...state.wall];
  const drawnTile = newWall.shift()!;
  updatedPlayers[nextPlayer] = {
    ...updatedPlayers[nextPlayer],
    hand: sortHand([...updatedPlayers[nextPlayer].hand, drawnTile]),
  };

  return {
    ...state,
    players: updatedPlayers,
    wall: newWall,
    currentPlayer: nextPlayer,
    phase: 'playing',
    claimState: undefined,
    isLastTile: newWall.length === 0,
    turnCount: state.turnCount + 1,
  };
}

function handleDraw(state: GameState, players: Player[]): GameState {
  const updatedPlayers = players.map(p => ({
    ...p,
    isTenpai: findShanten(p.hand, p.melds) === 0,
  }));

  const tenpaiPlayers = updatedPlayers.filter(p => p.isTenpai);
  const notenPlayers = updatedPlayers.filter(p => !p.isTenpai);

  if (tenpaiPlayers.length > 0 && notenPlayers.length > 0) {
    const bonus = 3000 / tenpaiPlayers.length;
    const penalty = 3000 / notenPlayers.length;
    for (const p of updatedPlayers) {
      if (p.isTenpai) p.score += bonus;
      else p.score -= penalty;
    }
  }

  return {
    ...state,
    players: updatedPlayers,
    phase: 'roundEnd',
    lastWin: undefined,
  };
}

export function drawTile(state: GameState): GameState {
  if (state.wall.length === 0) return { ...state, isLastTile: true };

  const newWall = [...state.wall];
  const tile = newWall.shift()!;
  const player = state.players[state.currentPlayer];

  const updatedPlayer = {
    ...player,
    hand: sortHand([...player.hand, tile]),
  };

  return {
    ...state,
    players: state.players.map((p, i) => i === state.currentPlayer ? updatedPlayer : p),
    wall: newWall,
    isLastTile: newWall.length === 0,
  };
}

export function declareRiichi(state: GameState, tileId: number): GameState {
  const player = state.players[state.currentPlayer];
  const tile = player.hand.find(t => t.id === tileId);
  if (!tile) return state;

  const newHand = player.hand.filter(t => t.id !== tileId);
  const isDoubleRiichi = state.turnCount < 4;

  const updatedPlayer: Player = {
    ...player,
    hand: newHand,
    discards: [...player.discards, tile],
    isRiichi: true,
    isDoubleRiichi,
    ippatsu: true,
    riichiTurn: state.turnCount,
    score: player.score - 1000,
  };

  const newPlayers = state.players.map((p, i) => i === state.currentPlayer ? updatedPlayer : p);

  const claimState = checkClaims(state, newPlayers, tile, state.currentPlayer);
  if (claimState && claimState.possibleActions.length > 0) {
    return {
      ...state,
      players: newPlayers,
      riichiSticks: state.riichiSticks + 1,
      phase: 'claiming',
      claimState,
    };
  }

  return advanceTurn(
    { ...state, riichiSticks: state.riichiSticks + 1 },
    newPlayers,
    state.currentPlayer
  );
}

export function claimChi(state: GameState, playerIdx: number, tiles: [Tile, Tile]): GameState {
  if (!state.claimState) return state;

  const player = state.players[playerIdx];
  const discardedTile = state.claimState.discardedTile;

  const chiTiles = sortHand([tiles[0], tiles[1], discardedTile]);
  const newMeld: Meld = {
    type: 'chi',
    tiles: chiTiles,
    fromPlayer: state.claimState.discardedBy,
  };

  const newHand = player.hand.filter(t => t.id !== tiles[0].id && t.id !== tiles[1].id);

  const updatedPlayer: Player = {
    ...player,
    hand: newHand,
    melds: [...player.melds, newMeld],
  };

  return {
    ...state,
    players: state.players.map((p, i) => i === playerIdx ? updatedPlayer : p),
    currentPlayer: playerIdx,
    phase: 'playing',
    claimState: undefined,
  };
}

export function claimPon(state: GameState, playerIdx: number): GameState {
  if (!state.claimState) return state;

  const player = state.players[playerIdx];
  const discardedTile = state.claimState.discardedTile;

  const matching = player.hand.filter(t => tilesEqual(t, discardedTile)).slice(0, 2);
  const ponTiles = [matching[0], matching[1], discardedTile];
  const newMeld: Meld = {
    type: 'pon',
    tiles: ponTiles,
    fromPlayer: state.claimState.discardedBy,
  };

  const newHand = player.hand.filter(t => t.id !== matching[0].id && t.id !== matching[1].id);

  const updatedPlayer: Player = {
    ...player,
    hand: newHand,
    melds: [...player.melds, newMeld],
  };

  return {
    ...state,
    players: state.players.map((p, i) => i === playerIdx ? updatedPlayer : p),
    currentPlayer: playerIdx,
    phase: 'playing',
    claimState: undefined,
  };
}

export function claimKan(state: GameState, playerIdx: number): GameState {
  if (!state.claimState) return state;

  const player = state.players[playerIdx];
  const discardedTile = state.claimState.discardedTile;

  const matching = player.hand.filter(t => tilesEqual(t, discardedTile)).slice(0, 3);
  const kanTiles = [matching[0], matching[1], matching[2], discardedTile];
  const newMeld: Meld = {
    type: 'kan',
    tiles: kanTiles,
    fromPlayer: state.claimState.discardedBy,
  };

  const newHand = player.hand.filter(t => !matching.map(m => m.id).includes(t.id));

  const newDeadWall = [...state.deadWall];
  const drawnTile = newDeadWall.pop()!;
  const newDoraIndicators = [...state.doraIndicators, newDeadWall[4 - state.kanCount - 1]].filter(Boolean);

  const updatedPlayer: Player = {
    ...player,
    hand: sortHand([...newHand, drawnTile]),
    melds: [...player.melds, newMeld],
  };

  return {
    ...state,
    players: state.players.map((p, i) => i === playerIdx ? updatedPlayer : p),
    currentPlayer: playerIdx,
    phase: 'playing',
    claimState: undefined,
    deadWall: newDeadWall,
    doraIndicators: newDoraIndicators,
    kanCount: state.kanCount + 1,
  };
}

function getAllTiles(hand: Tile[], melds: Meld[], winTile?: Tile): Tile[] {
  const meldTiles = melds.flatMap(m => m.tiles);
  if (winTile) return [...hand, ...meldTiles, winTile];
  return [...hand, ...meldTiles];
}

function buildYakuContext(state: GameState, player: Player, winTile: Tile, isTsumo: boolean): YakuContext {
  const allTiles = getAllTiles(player.hand, player.melds, winTile);
  const doraCount = countDora(allTiles, state.doraIndicators);
  const uraDoraCount = (player.isRiichi || player.isDoubleRiichi) ? countDora(allTiles, state.uraDoraIndicators) : 0;
  const redDoraCount = allTiles.filter(t => t.isRed).length;

  return {
    isRiichi: player.isRiichi,
    isDoubleRiichi: player.isDoubleRiichi,
    isIppatsu: player.ippatsu,
    isTsumo,
    isChankan: false,
    isRinshan: false,
    isHaitei: isTsumo && state.isLastTile,
    isHoutei: !isTsumo && state.isLastTile,
    seatWind: player.seatWind,
    roundWind: state.round <= 4 ? 1 : 2,
    doraCount,
    uraDoraCount,
    redDoraCount,
    isLastTile: state.isLastTile,
    isDealer: player.id === state.dealer,
  };
}

function detectYakuBest(combos: ReturnType<typeof checkWin>, allTiles: Tile[], melds: Meld[], context: YakuContext): import('../types/mahjong').YakuResult[] {
  if (!combos) return [];
  let best: import('../types/mahjong').YakuResult[] = [];
  let bestHan = -1;

  for (const combo of combos) {
    const yaku = detectYaku(combo, allTiles, melds, context);
    const han = yaku.reduce((s, y) => s + y.han, 0);
    if (han > bestHan) {
      bestHan = han;
      best = yaku;
    }
  }
  return best;
}

export function declareWin(state: GameState, playerIdx: number): GameState {
  const player = state.players[playerIdx];
  const isTsumo = !state.claimState;
  const winTile = isTsumo
    ? player.hand[player.hand.length - 1]
    : state.claimState!.discardedTile;

  const allTiles = getAllTiles(player.hand, player.melds, isTsumo ? undefined : winTile);
  const combos = checkWin(
    isTsumo ? player.hand.slice(0, -1) : player.hand,
    player.melds,
    winTile
  );

  if (!combos) return state;

  const context = buildYakuContext(state, player, winTile, isTsumo);
  const yaku = detectYakuBest(combos, allTiles, player.melds, context);

  if (yaku.length === 0) return state;

  const nonDoraYaku = yaku.filter(y => !y.name.startsWith('Dora') && !y.name.startsWith('Ura Dora'));
  if (nonDoraYaku.length === 0) return state;

  const bestCombo = combos[0];
  const fu = calculateFu(
    bestCombo,
    player.melds,
    isTsumo,
    player.melds.some(m => m.type !== 'closedKan'),
    winTile,
    player.seatWind,
    state.round <= 4 ? 1 : 2
  );
  const han = calculateHan(yaku);
  const isDealer = playerIdx === state.dealer;
  const { total } = hanFuToPoints(han, fu, isDealer);

  const loser = isTsumo ? undefined : state.claimState?.discardedBy;
  const winResult: WinResult = {
    winner: playerIdx,
    loser,
    yaku,
    han,
    fu,
    points: total,
    pointChanges: [],
    isTsumo,
    winTile,
  };

  const pointChanges = distributePoints(
    winResult,
    state.players,
    isDealer,
    state.honba,
    state.riichiSticks
  );
  winResult.pointChanges = pointChanges;

  const newPlayers = state.players.map((p, i) => ({
    ...p,
    score: p.score + pointChanges[i],
  }));

  return {
    ...state,
    players: newPlayers,
    phase: 'roundEnd',
    lastWin: winResult,
    riichiSticks: 0,
    claimState: undefined,
  };
}

export function skipClaim(state: GameState, playerIdx: number): GameState {
  if (!state.claimState) return state;

  const claimState = state.claimState;
  const remaining = claimState.possibleActions.filter(a => a.playerId !== playerIdx);

  if (remaining.length === 0) {
    return advanceTurn(state, state.players, claimState.discardedBy);
  }

  return {
    ...state,
    claimState: { ...claimState, possibleActions: remaining },
  };
}

export function nextRound(state: GameState): GameState {
  const lastWin = state.lastWin;
  const dealerWon = lastWin && lastWin.winner === state.dealer;

  let newDealer = state.dealer;
  let newRound = state.round;
  let newHonba = state.honba;

  if (!lastWin || !dealerWon) {
    newDealer = (state.dealer + 1) % 4;
    newRound = newDealer === 0 ? state.round + 1 : state.round;
    newHonba = lastWin ? 0 : state.honba + 1;
  } else {
    newHonba = state.honba + 1;
  }

  const maxRounds = state.settings.gameType === 'east' ? 4 : 8;
  if (newRound > maxRounds) {
    return { ...state, phase: 'gameEnd' };
  }

  if (state.players.some(p => p.score < 0)) {
    return { ...state, phase: 'gameEnd' };
  }

  const newPlayers = state.players.map((p, i) => {
    const windOffset = (i - newDealer + 4) % 4;
    return { ...p, seatWind: windOffset + 1 };
  });

  const newState: GameState = {
    ...state,
    players: newPlayers,
    dealer: newDealer,
    round: newRound,
    honba: newHonba,
    riichiSticks: lastWin ? 0 : state.riichiSticks,
    phase: 'dealing',
    lastWin: undefined,
    claimState: undefined,
  };

  return dealTiles(newState);
}

export function declareClosedKan(state: GameState, tile: Tile): GameState {
  const player = state.players[state.currentPlayer];
  const matching = player.hand.filter(t => tilesEqual(t, tile));
  if (matching.length < 4) return state;

  const kanMeld: Meld = { type: 'closedKan', tiles: matching };
  const newHand = player.hand.filter(t => !matching.map(m => m.id).includes(t.id));

  const newDeadWall = [...state.deadWall];
  const drawnTile = newDeadWall.pop()!;

  const newDoraIndicators = [...state.doraIndicators];
  if (state.kanCount < 3) {
    const newDoraIdx = 4 - state.kanCount - 1;
    if (newDeadWall[newDoraIdx]) newDoraIndicators.push(newDeadWall[newDoraIdx]);
  }

  const updatedPlayer: Player = {
    ...player,
    hand: sortHand([...newHand, drawnTile]),
    melds: [...player.melds, kanMeld],
  };

  return {
    ...state,
    players: state.players.map((p, i) => i === state.currentPlayer ? updatedPlayer : p),
    deadWall: newDeadWall,
    doraIndicators: newDoraIndicators,
    kanCount: state.kanCount + 1,
    phase: 'playing',
  };
}
