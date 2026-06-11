import React from 'react';
import { Tile } from '../types/mahjong';

interface Props {
  tile: Tile | null;
  faceDown?: boolean;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const HONOR_KANJI: Record<number, string> = {
  1: '東', 2: '南', 3: '西', 4: '北', 5: '白', 6: '發', 7: '中',
};

const HONOR_COLORS: Record<number, string> = {
  1: '#1a3a6e', 2: '#6e1a1a', 3: '#1a5a2a', 4: '#1a1a5a',
  5: '#f0f0f0', 6: '#1a6e1a', 7: '#cc2200',
};

export const TileComponent: React.FC<Props> = ({
  tile,
  faceDown = false,
  selected = false,
  onClick,
  size = 'md',
}) => {
  const sizeClass = size === 'sm' ? 'tile-sm' : size === 'lg' ? 'tile-lg' : 'tile-md';

  if (faceDown || !tile) {
    return (
      <div
        className={`tile tile-face-down ${sizeClass} ${onClick ? 'tile-clickable' : ''}`}
        onClick={onClick}
      />
    );
  }

  const isHonor = tile.suit === 'z';
  const suitClass = `suit-${tile.suit}`;

  let displayContent: React.ReactNode;
  if (isHonor) {
    const kanji = HONOR_KANJI[tile.number];
    const color = HONOR_COLORS[tile.number];
    displayContent = (
      <span className="tile-kanji" style={{ color, fontSize: 'inherit' }}>{kanji}</span>
    );
  } else {
    const suitSymbol = tile.suit === 'm' ? '萬' : tile.suit === 'p' ? '筒' : '索';
    displayContent = (
      <>
        <span className={`tile-number ${suitClass}`}>{tile.number}</span>
        <span className={`tile-suit-label ${suitClass}`}>{suitSymbol}</span>
      </>
    );
  }

  return (
    <div
      className={`tile ${sizeClass} ${selected ? 'tile-selected' : ''} ${onClick ? 'tile-clickable' : ''}`}
      onClick={onClick}
      title={isHonor ? HONOR_KANJI[tile.number] : `${tile.number}${tile.suit}`}
    >
      {displayContent}
      {tile.isRed && <span className="tile-red-dot">●</span>}
    </div>
  );
};
