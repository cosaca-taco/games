import React from 'react';
import { WinResult, Player } from '../types/mahjong';
import { TileComponent } from './TileComponent';

interface Props {
  winResult: WinResult;
  players: Player[];
  onNext: () => void;
  isGameEnd: boolean;
  onPlayAgain?: () => void;
}

export const ScoreModal: React.FC<Props> = ({ winResult, players, onNext, isGameEnd, onPlayAgain }) => {
  const winner = players[winResult.winner];
  const yakuman = winResult.yaku.some(y => y.isYakuman);
  const sorted = isGameEnd ? [...players].sort((a, b) => b.score - a.score) : [];

  return (
    <div className="modal-overlay">
      <div className="score-modal">
        {isGameEnd ? (
          <>
            <h2>ゲーム終了</h2>
            <div className="final-rankings">
              {sorted.map((p, i) => (
                <div key={p.id} className={`ranking-row rank-${i + 1}`}>
                  <span className="rank-num">{i + 1}位</span>
                  <span className="rank-name">{p.name}</span>
                  <span className="rank-score">{p.score.toLocaleString()}点</span>
                </div>
              ))}
            </div>
            <div className="game-end-buttons">
              <button className="next-btn play-again-btn" onClick={onPlayAgain}>
                もう一度プレイ
              </button>
              <button className="next-btn" onClick={onNext}>
                設定に戻る
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={`win-header ${yakuman ? 'yakuman-header' : ''}`}>
              <h2>{winner.name}の{winResult.isTsumo ? '自摸和' : '栄和'}!</h2>
              {yakuman && <div className="yakuman-badge">役満</div>}
            </div>
            <div className="win-tile-display">
              <TileComponent tile={winResult.winTile} size="lg" />
            </div>
            <div className="yaku-list">
              {winResult.yaku.map((y, i) => (
                <div key={i} className={`yaku-row ${y.isYakuman ? 'yaku-yakuman' : ''}`}>
                  <span className="yaku-name">{y.nameJp}</span>
                  <span className="yaku-han">{y.isYakuman ? '役満' : `${y.han}翻`}</span>
                </div>
              ))}
            </div>
            {!yakuman && (
              <div className="han-fu-display">
                <span>{winResult.han}翻{winResult.fu}符</span>
                <span className="total-points">{winResult.points.toLocaleString()}点</span>
              </div>
            )}
            <div className="point-changes">
              {players.map((p, i) => (
                <div key={p.id} className={`point-change ${winResult.pointChanges[i] > 0 ? 'positive' : winResult.pointChanges[i] < 0 ? 'negative' : ''}`}>
                  <span>{p.name}</span>
                  <span>{winResult.pointChanges[i] > 0 ? '+' : ''}{winResult.pointChanges[i].toLocaleString()}</span>
                  <span>→ {p.score.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <button className="next-btn" onClick={onNext}>次の局へ</button>
          </>
        )}
      </div>
    </div>
  );
};
