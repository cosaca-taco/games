import React from 'react';

interface Props {
  availableActions: string[];
  onAction: (action: string, data?: unknown) => void;
}

const ACTION_LABELS: Record<string, string> = {
  tsumo: '自摸',
  ron: '栄和',
  riichi: '立直',
  chi: '吃',
  pon: '碰',
  kan: '槓',
  skip: 'スキップ',
  closedKan: '暗槓',
};

const ACTION_COLORS: Record<string, string> = {
  tsumo: '#cc2200',
  ron: '#cc2200',
  riichi: '#0044cc',
  chi: '#008800',
  pon: '#008800',
  kan: '#886600',
  closedKan: '#886600',
  skip: '#555',
};

export const ActionButtons: React.FC<Props> = ({ availableActions, onAction }) => {
  if (availableActions.length === 0) return null;

  return (
    <div className="action-buttons">
      {availableActions.map(action => (
        <button
          key={action}
          className="action-btn"
          style={{ backgroundColor: ACTION_COLORS[action] || '#444' }}
          onClick={() => onAction(action)}
        >
          {ACTION_LABELS[action] || action}
        </button>
      ))}
    </div>
  );
};
