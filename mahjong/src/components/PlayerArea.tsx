import React from 'react';
import { Player, Tile, GameState } from '../types/mahjong';
import { TileComponent } from './TileComponent';
import { DiscardPile } from './DiscardPile';

interface Props {
  player: Player;
  position: 'bottom' | 'right' | 'top' | 'left';
  isCurrentTurn: boolean;
  gameState: GameState;
  onTileClick?: (tile: Tile) => void;
  selectedTile?: Tile | null;
}

const WIND_KANJI = ['東', '南', '西', '北'];

export const PlayerArea: React.FC<Props> = ({
  player,
  position,
  isCurrentTurn,
  onTileClick,
  selectedTile,
}) => {
  const isHuman = player.isHuman;
  const showFaceUp = isHuman || position === 'bottom';

  return (
    <div className={`player-area player-area-${position} ${isCurrentTurn ? 'player-current' : ''}`}>
      <div className="player-info">
        <span className="player-wind">{WIND_KANJI[player.seatWind - 1]}</span>
        <span className="player-name">{player.name}</span>
        <span className="player-score">{player.score.toLocaleString()}</span>
        {player.isRiichi && <span className="riichi-indicator">立直</span>}
        {isCurrentTurn && <span className="turn-indicator">▶</span>}
      </div>

      {player.melds.length > 0 && (
        <div className="player-melds">
          {player.melds.map((meld, i) => (
            <div key={i} className="meld-group">
              {meld.tiles.map((t, j) => (
                <TileComponent key={j} tile={t} size="sm" faceDown={meld.type === 'closedKan' && (j === 0 || j === 3)} />
              ))}
            </div>
          ))}
        </div>
      )}

      <div className={`player-hand player-hand-${position}`}>
        {player.hand.map((tile) => (
          <TileComponent
            key={tile.id}
            tile={tile}
            faceDown={!showFaceUp}
            selected={selectedTile?.id === tile.id}
            onClick={isHuman && onTileClick ? () => onTileClick(tile) : undefined}
            size={position === 'bottom' ? 'md' : 'sm'}
          />
        ))}
      </div>

      <DiscardPile tiles={player.discards} vertical={position === 'left' || position === 'right'} />
    </div>
  );
};
