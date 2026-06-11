import React from 'react';
import { Tile } from '../types/mahjong';
import { getTileDisplay } from '../game/tiles';

const KANJI_NUM: Record<number, string> = {
  1: '一', 2: '二', 3: '三', 4: '四', 5: '五',
  6: '六', 7: '七', 8: '八', 9: '九',
};

interface TileProps {
  tile: Tile | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  selected?: boolean;
  clickable?: boolean;
  faceDown?: boolean;
  onClick?: () => void;
}

export function TileComponent({ tile, size = 'md', selected, clickable, faceDown, onClick }: TileProps) {
  if (!tile || faceDown) {
    return (
      <div
        className={`tile tile-${size} tile-face-down`}
        onClick={onClick}
      />
    );
  }

  const display = getTileDisplay(tile);
  const isKanji = tile.suit === 'z';

  return (
    <div
      className={[
        'tile',
        `tile-${size}`,
        `suit-${tile.suit}`,
        selected ? 'tile-selected' : '',
        clickable ? 'tile-clickable' : '',
      ].join(' ').trim()}
      onClick={onClick}
    >
      {isKanji ? (
        <span className="tile-kanji">{display}</span>
      ) : (
        <>
          <span className="tile-number" style={tile.isRed ? { color: '#cc0000' } : undefined}>
            {KANJI_NUM[tile.number] ?? tile.number}
          </span>
          <span className="tile-suit-label">{tile.suit.toUpperCase()}</span>
        </>
      )}
      {tile.isRed && <span className="tile-red-dot">●</span>}
    </div>
  );
}
