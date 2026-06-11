import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, Tile } from '../types/mahjong';
import { PlayerArea } from './PlayerArea';
import { ActionButtons } from './ActionButtons';
import { TileComponent } from './TileComponent';
import { getDoraFromIndicator } from '../game/yaku';

export type GameAction =
  | { type: 'discard'; tileId: number }
  | { type: 'riichi'; tileId: number }
  | { type: 'tsumo' }
  | { type: 'ron' }
  | { type: 'chi'; tiles: [Tile, Tile] }
  | { type: 'pon' }
  | { type: 'kan' }
  | { type: 'closedKan'; tile: Tile }
  | { type: 'skip' };

interface Props {
  gameState: GameState;
  onAction: (action: GameAction) => void;
  selectedTile: Tile | null;
  onTileSelect: (tile: Tile | null) => void;
  availableActions: string[];
}

const ROUND_NAMES: Record<number, string> = {
  1: '東1局', 2: '東2局', 3: '東3局', 4: '東4局',
  5: '南1局', 6: '南2局', 7: '南3局', 8: '南4局',
};

export const GameBoard: React.FC<Props> = ({
  gameState,
  onAction,
  selectedTile,
  onTileSelect,
  availableActions,
}) => {
  const { players, round, honba, riichiSticks, wall, currentPlayer, phase } = gameState;
  const doraActual = gameState.doraIndicators.map(d => getDoraFromIndicator(d));

  const handleTileClick = (tile: Tile) => {
    if (phase !== 'playing' || currentPlayer !== 0) return;
    if (selectedTile?.id === tile.id) {
      onAction({ type: 'discard', tileId: tile.id });
      onTileSelect(null);
    } else {
      onTileSelect(tile);
    }
  };

  const handleActionBtn = (action: string) => {
    switch (action) {
      case 'tsumo': onAction({ type: 'tsumo' }); break;
      case 'ron': onAction({ type: 'ron' }); break;
      case 'riichi':
        if (selectedTile) {
          onAction({ type: 'riichi', tileId: selectedTile.id });
          onTileSelect(null);
        }
        break;
      case 'pon': onAction({ type: 'pon' }); break;
      case 'kan':
        if (phase === 'claiming') {
          onAction({ type: 'kan' });
        }
        break;
      case 'closedKan':
        if (selectedTile) onAction({ type: 'closedKan', tile: selectedTile });
        break;
      case 'skip': onAction({ type: 'skip' }); break;
    }
  };

  return (
    <div className="game-board">
      <div className="board-top-row">
        <PlayerArea
          player={players[2]}
          position="top"
          isCurrentTurn={currentPlayer === 2}
          gameState={gameState}
        />
      </div>

      <div className="board-middle-row">
        <div className="board-left-col">
          <PlayerArea
            player={players[3]}
            position="left"
            isCurrentTurn={currentPlayer === 3}
            gameState={gameState}
          />
        </div>

        <div className="board-center">
          <div className="center-round">{ROUND_NAMES[round] ?? `第${round}局`}</div>
          {honba > 0 && <div className="center-honba">{honba}本場</div>}
          <div className="center-wall">残{wall.length}</div>
          {riichiSticks > 0 && <div className="center-riichi">供{riichiSticks}</div>}
          <div className="dora-label">ドラ</div>
          <div className="dora-tiles">
            {doraActual.map((d, i) => <TileComponent key={i} tile={d} size="sm" />)}
          </div>
        </div>

        <div className="board-right-col">
          <PlayerArea
            player={players[1]}
            position="right"
            isCurrentTurn={currentPlayer === 1}
            gameState={gameState}
          />
        </div>
      </div>

      <div className="board-bottom-row">
        <PlayerArea
          player={players[0]}
          position="bottom"
          isCurrentTurn={currentPlayer === 0}
          gameState={gameState}
          onTileClick={handleTileClick}
          selectedTile={selectedTile}
        />
      </div>

      {availableActions.length > 0 && (
        <div className="human-actions">
          {selectedTile && availableActions.includes('riichi') && (
            <div className="riichi-hint">立直可能 — 捨て牌を選ぶか立直ボタン</div>
          )}
          <ActionButtons
            actions={availableActions}
            onAction={handleActionBtn}
          />
          {selectedTile && phase === 'playing' && currentPlayer === 0 && !players[0].isRiichi && (
            <button
              className="discard-confirm-btn"
              onClick={() => { onAction({ type: 'discard', tileId: selectedTile.id }); onTileSelect(null); }}
            >
              捨てる
            </button>
          )}
        </div>
      )}
    </div>
  );
};
