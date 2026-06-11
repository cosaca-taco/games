export type TileSuit = 'm' | 'p' | 's' | 'z';

export interface Tile {
  suit: TileSuit;
  number: number;
  id: number;
  isRed?: boolean;
}

export interface Meld {
  type: 'chi' | 'pon' | 'kan' | 'closedKan';
  tiles: Tile[];
  fromPlayer?: number;
}

export interface Player {
  id: number;
  name: string;
  isHuman: boolean;
  hand: Tile[];
  melds: Meld[];
  discards: Tile[];
  score: number;
  isRiichi: boolean;
  isDoubleRiichi: boolean;
  isTenpai: boolean;
  riichiTurn?: number;
  ippatsu: boolean;
  seatWind: number;
}

export interface GameSettings {
  redDora: boolean;
  kuitan: boolean;
  gameType: 'east' | 'hanchan';
  difficulty: 'normal' | 'strong' | 'veryStrong';
}

export type GamePhase = 'settings' | 'dealing' | 'playing' | 'claiming' | 'roundEnd' | 'gameEnd';

export interface YakuResult {
  name: string;
  nameJp: string;
  han: number;
  isYakuman: boolean;
}

export interface WinResult {
  winner: number;
  loser?: number;
  yaku: YakuResult[];
  han: number;
  fu: number;
  points: number;
  pointChanges: number[];
  isTsumo: boolean;
  winTile: Tile;
}

export interface ClaimState {
  discardedTile: Tile;
  discardedBy: number;
  possibleActions: { playerId: number; actions: ('chi' | 'pon' | 'kan' | 'ron')[] }[];
}

export interface GameState {
  players: Player[];
  wall: Tile[];
  deadWall: Tile[];
  doraIndicators: Tile[];
  uraDoraIndicators: Tile[];
  round: number;
  honba: number;
  riichiSticks: number;
  currentPlayer: number;
  phase: GamePhase;
  settings: GameSettings;
  claimState?: ClaimState;
  lastWin?: WinResult;
  kanCount: number;
  isLastTile: boolean;
  dealer: number;
  turnCount: number;
}

export interface MentsuGroup {
  tiles: Tile[];
  type: 'shuntsu' | 'koutsu';
  isOpen: boolean;
}

export interface WinCombination {
  mentsu: MentsuGroup[];
  jantou: Tile[];
  isChiitoi: boolean;
  isKokushi: boolean;
}

export interface YakuContext {
  isRiichi: boolean;
  isDoubleRiichi: boolean;
  isIppatsu: boolean;
  isTsumo: boolean;
  isChankan: boolean;
  isRinshan: boolean;
  isHaitei: boolean;
  isHoutei: boolean;
  seatWind: number;
  roundWind: number;
  doraCount: number;
  uraDoraCount: number;
  redDoraCount: number;
  isLastTile: boolean;
  isDealer: boolean;
}
