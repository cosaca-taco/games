import React from 'react';
import { GameState, Tile } from '../types/mahjong';
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
const WIND_KANJI = ['東', '南', '西', '北'];

const ACTION_LABELS: Record<string, string> = {
  tsumo: '自摸', ron: '栄和', riichi: '立直',
  chi: '吃', pon: '碰', kan: '槓', closedKan: '暗槓', skip: 'スキップ',
};
const ACTION_COLORS: Record<string, string> = {
  tsumo: '#cc2200', ron: '#cc2200', riichi: '#0044cc',
  chi: '#008800', pon: '#008800', kan: '#886600', closedKan: '#886600', skip: '#555',
};

export const GameBoard: React.FC<Props> = ({
  gameState, onAction, selectedTile, onTileSelect, availableActions,
}) => {
  const { players, round, honba, riichiSticks, wall, currentPlayer, phase } = gameState;
  const doraActual = gameState.doraIndicators.map(d => getDoraFromIndicator(d));

  // CPU表示順: 上(2)、右(1)、左(3)
  const cpuOrder = [2, 1, 3];

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
        if (selectedTile) { onAction({ type: 'riichi', tileId: selectedTile.id }); onTileSelect(null); }
        break;
      case 'pon': onAction({ type: 'pon' }); break;
      case 'kan': if (phase === 'claiming') onAction({ type: 'kan' }); break;
      case 'closedKan': if (selectedTile) onAction({ type: 'closedKan', tile: selectedTile }); break;
      case 'chi': onAction({ type: 'chi', tiles: [] as unknown as [Tile, Tile] }); break;
      case 'skip': onAction({ type: 'skip' }); break;
    }
  };

  return (
    <div className="mb-board">

      {/* CPU 3人を縦に並べる */}
      <div className="mb-cpu-area">
        {cpuOrder.map(idx => {
          const p = players[idx];
          const isCurrent = currentPlayer === idx;
          return (
            <div key={idx} className={`mb-cpu-strip${isCurrent ? ' mb-cpu-active' : ''}`}>
              <div className="mb-cpu-info">
                <span className="mb-wind">{WIND_KANJI[p.seatWind - 1]}</span>
                <span className="mb-name">{p.name}</span>
                <span className="mb-score">{p.score.toLocaleString()}</span>
                {p.isRiichi && <span className="mb-riichi-badge">立直</span>}
                {isCurrent && <span className="mb-turn-arrow">▶</span>}
              </div>
              <div className="mb-cpu-tiles">
                {/* 副露 */}
                {p.melds.map((meld, mi) => (
                  <span key={`m${mi}`} className="mb-meld-group">
                    {meld.tiles.map((t, ti) => (
                      <TileComponent key={ti} tile={t} size="sm"
                        faceDown={meld.type === 'closedKan' && (ti === 0 || ti === 3)} />
                    ))}
                  </span>
                ))}
                {/* 伏せ牌 */}
                {p.hand.map((_, hi) => (
                  <TileComponent key={`h${hi}`} tile={null} faceDown size="sm" />
                ))}
              </div>
              {/* 捨て牌 */}
              <div className="mb-cpu-discards">
                {p.discards.map((t, di) => (
                  <TileComponent key={di} tile={t} size="sm" />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 中央情報バー */}
      <div className="mb-center-bar">
        <span className="mb-round-name">{ROUND_NAMES[round] ?? `第${round}局`}</span>
        {honba > 0 && <span className="mb-info-chip">{honba}本場</span>}
        <span className="mb-info-chip">残{wall.length}</span>
        {riichiSticks > 0 && <span className="mb-info-chip">供{riichiSticks}</span>}
        <span className="mb-dora-label">ドラ:</span>
        {doraActual.map((d, i) => <TileComponent key={i} tile={d} size="sm" />)}
      </div>

      {/* 自分エリア */}
      <div className="mb-human-area">
        {/* 自分の情報 */}
        <div className="mb-human-info">
          <span className="mb-wind">{WIND_KANJI[players[0].seatWind - 1]}</span>
          <span className="mb-name">{players[0].name}</span>
          <span className="mb-score">{players[0].score.toLocaleString()}</span>
          {players[0].isRiichi && <span className="mb-riichi-badge">立直</span>}
          {currentPlayer === 0 && <span className="mb-turn-arrow">▶</span>}
        </div>

        {/* 自分の捨て牌 */}
        <div className="mb-human-discards">
          {players[0].discards.map((t, i) => (
            <TileComponent key={i} tile={t} size="sm" />
          ))}
        </div>

        {/* 副露 */}
        {players[0].melds.length > 0 && (
          <div className="mb-human-melds">
            {players[0].melds.map((meld, mi) => (
              <span key={mi} className="mb-meld-group">
                {meld.tiles.map((t, ti) => (
                  <TileComponent key={ti} tile={t} size="sm"
                    faceDown={meld.type === 'closedKan' && (ti === 0 || ti === 3)} />
                ))}
              </span>
            ))}
          </div>
        )}

        {/* 自分の手牌 */}
        <div className="mb-human-hand">
          {players[0].hand.map(tile => (
            <TileComponent
              key={tile.id}
              tile={tile}
              size="md"
              selected={selectedTile?.id === tile.id}
              onClick={() => handleTileClick(tile)}
            />
          ))}
        </div>

        {selectedTile && phase === 'playing' && currentPlayer === 0 && !players[0].isRiichi && (
          <div className="mb-hint">もう一度タップで捨てる　または「捨てる」ボタン</div>
        )}
      </div>

      {/* アクションボタン */}
      {availableActions.length > 0 && (
        <div className="mb-actions">
          {availableActions.map(action => (
            <button
              key={action}
              className="mb-action-btn"
              style={{ backgroundColor: ACTION_COLORS[action] || '#444' }}
              onClick={() => handleActionBtn(action)}
            >
              {ACTION_LABELS[action] || action}
            </button>
          ))}
          {selectedTile && phase === 'playing' && currentPlayer === 0 && !players[0].isRiichi && (
            <button
              className="mb-action-btn"
              style={{ backgroundColor: '#cc2200' }}
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
