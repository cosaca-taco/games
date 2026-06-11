import React from 'react';
import { Tile } from '../types/mahjong';
import { TileComponent } from './TileComponent';

interface Props {
  discards: Tile[];
  position: 'bottom' | 'right' | 'top' | 'left';
}

export const DiscardPile: React.FC<Props> = ({ discards, position }) => {
  const isVertical = position === 'right' || position === 'left';

  return (
    <div className={`discard-pile discard-pile-${position}`}>
      <div className={`discard-grid ${isVertical ? 'discard-grid-vertical' : ''}`}>
        {discards.map((tile, i) => (
          <TileComponent key={`${tile.id}-${i}`} tile={tile} size="sm" />
        ))}
      </div>
    </div>
  );
};
