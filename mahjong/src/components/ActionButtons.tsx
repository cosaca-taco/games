import React from 'react';

interface ActionButtonsProps {
  actions: string[];
  onAction: (action: string) => void;
}

const ACTION_LABELS: Record<string, string> = {
  tsumo: 'ツモ',
  ron: 'ロン',
  riichi: 'リーチ',
  chi: 'チー',
  pon: 'ポン',
  kan: 'カン',
  closedKan: '暗槓',
  skip: 'スキップ',
};

export function ActionButtons({ actions, onAction }: ActionButtonsProps) {
  if (actions.length === 0) return null;
  return (
    <div className="action-buttons-container">
      {actions.map(action => (
        <button
          key={action}
          className={`action-btn action-btn-${action}`}
          onClick={() => onAction(action)}
        >
          {ACTION_LABELS[action] || action}
        </button>
      ))}
    </div>
  );
}
