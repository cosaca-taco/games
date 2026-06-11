import React from 'react';
import { Tile } from '../types/mahjong';
import { TileComponent } from './TileComponent';

interface DiscardPileProps {
  tiles: Tile[];
  vertical?: boolean;
}

export function DiscardPile({ tiles, vertical }: DiscardPileProps) {
  return (
    <div className={`discard-pile`}>
      <div className={`discard-grid${vertical ? ' discard-grid-vertical' : ''}`}>
        {tiles.map((tile) => (
          <TileComponent key={tile.id} tile={tile} size="sm" />
        ))}
      </div>
    </div>
  );
}
