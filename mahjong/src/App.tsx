import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameSettings, Tile } from './types/mahjong';
import {
  initGame, dealTiles, discardTile, declareRiichi,
  claimChi, claimPon, claimKan, declareWin, skipClaim, nextRound, declareClosedKan
} from './game/engine';
import { checkWin, findShanten } from './game/hand';
import { detectYaku, countDora } from './game/yaku';
import { aiDiscard, aiShouldRiichi, aiShouldClaim, aiChooseChiTiles } from './game/ai';
import { SettingsScreen } from './components/SettingsScreen';
import { GameBoard, GameAction } from './components/GameBoard';
import { ScoreModal } from './components/ScoreModal';
import { tilesEqual } from './game/tiles';

type AppPhase = 'settings' | 'game';

function buildYakuContext(gs: GameState, playerIdx: number, winTile: Tile, isTsumo: boolean) {
  const player = gs.players[playerIdx];
  const allTiles = [...player.hand, ...player.melds.flatMap(m => m.tiles), winTile];
  return {
    isRiichi: player.isRiichi,
    isDoubleRiichi: player.isDoubleRiichi,
    isIppatsu: player.ippatsu,
    isTsumo,
    isChankan: false,
    isRinshan: false,
    isHaitei: isTsumo && gs.isLastTile,
    isHoutei: !isTsumo && gs.isLastTile,
    seatWind: player.seatWind,
    roundWind: gs.round <= 4 ? 1 : 2,
    doraCount: countDora(allTiles, gs.doraIndicators),
    uraDoraCount: player.isRiichi ? countDora(allTiles, gs.uraDoraIndicators) : 0,
    redDoraCount: allTiles.filter(t => t.isRed).length,
    isLastTile: gs.isLastTile,
    isDealer: playerIdx === gs.dealer,
  };
}

function getAvailableActions(gs: GameState): string[] {
  const actions: string[] = [];
  const { phase, currentPlayer, players, claimState } = gs;
  const player = players[0];

  if (phase === 'playing' && currentPlayer === 0) {
    const drawnTile = player.hand.find(t => t.id === gs.drawnTileId);
    const checkTile = drawnTile ?? player.hand[player.hand.length - 1];
    if (checkTile) {
      const handWithout = player.hand.filter(t => t.id !== checkTile.id);
      const combos = checkWin(handWithout, player.melds, checkTile);
      if (combos) {
        const ctx = buildYakuContext(gs, 0, checkTile, true);
        const allTiles = [...player.hand, ...player.melds.flatMap(m => m.tiles)];
        const yaku = detectYaku(combos[0], allTiles, player.melds, ctx);
        if (yaku.filter(y => !y.name.startsWith('Dora') && !y.name.startsWith('Ura Dora')).length > 0) {
          actions.push('tsumo');
        }
      }
    }
    if (player.isRiichi) {
      // 立直中：ツモ切りのみ（自摸和以外）
      if (!actions.includes('tsumo')) {
        actions.push('tsumoGiri');
      }
    } else {
      if (player.melds.filter(m => m.type !== 'closedKan').length === 0) {
        for (const t of player.hand) {
          if (findShanten(player.hand.filter(tt => tt.id !== t.id), player.melds) === 0) {
            actions.push('riichi'); break;
          }
        }
      }
      for (const t of player.hand) {
        if (player.hand.filter(tt => tilesEqual(tt, t)).length === 4) {
          actions.push('closedKan'); break;
        }
      }
    }
  }

  if (phase === 'claiming' && claimState) {
    const myActions = claimState.possibleActions.find(a => a.playerId === 0);
    if (myActions) {
      myActions.actions.forEach(a => { if (!actions.includes(a)) actions.push(a); });
      actions.push('skip');
    }
  }

  return actions;
}

export default function App() {
  const [appPhase, setAppPhase] = useState<AppPhase>('settings');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleStart = useCallback((settings: GameSettings) => {
    setGameState(dealTiles(initGame(settings)));
    setAppPhase('game');
    setSelectedTile(null);
  }, []);

  const handleAction = useCallback((action: GameAction) => {
    setGameState(prev => {
      if (!prev) return prev;
      switch (action.type) {
        case 'discard': return discardTile(prev, action.tileId);
        case 'riichi': return declareRiichi(prev, action.tileId);
        case 'tsumo': return declareWin(prev, 0);
        case 'ron': return declareWin(prev, 0);
        case 'chi': return claimChi(prev, 0, action.tiles);
        case 'pon': return claimPon(prev, 0);
        case 'kan': return prev.phase === 'claiming' ? claimKan(prev, 0) : prev;
        case 'closedKan': return declareClosedKan(prev, action.tile);
        case 'skip': return skipClaim(prev, 0);
        case 'tsumoGiri': {
          // 立直中のツモ切り：ツモ牌をそのまま捨てる
          const drawnId = prev.drawnTileId ?? prev.players[0].hand[prev.players[0].hand.length - 1]?.id;
          return drawnId !== undefined ? discardTile(prev, drawnId) : prev;
        }
        default: return prev;
      }
    });
    setSelectedTile(null);
  }, []);

  useEffect(() => {
    if (aiTimerRef.current) { clearTimeout(aiTimerRef.current); aiTimerRef.current = null; }
    if (!gameState) return;
    if (gameState.phase === 'roundEnd' || gameState.phase === 'gameEnd') return;
    if (gameState.phase === 'settings' || gameState.phase === 'dealing') return;

    const cp = gameState.currentPlayer;

    if (gameState.phase === 'playing' && cp === 0) return;

    if (gameState.phase === 'claiming' && gameState.claimState) {
      const pendingAi = gameState.claimState.possibleActions.find(a => a.playerId !== 0);
      if (!pendingAi) return;
      aiTimerRef.current = setTimeout(() => {
        setGameState(prev => {
          if (!prev?.claimState) return prev;
          const p = prev.players[pendingAi.playerId];
          const tile = prev.claimState!.discardedTile;
          if (pendingAi.actions.includes('ron')) return declareWin(prev, pendingAi.playerId);
          if (pendingAi.actions.includes('kan') && aiShouldClaim(p, tile, 'kan', prev)) return claimKan(prev, pendingAi.playerId);
          if (pendingAi.actions.includes('pon') && aiShouldClaim(p, tile, 'pon', prev)) return claimPon(prev, pendingAi.playerId);
          if (pendingAi.actions.includes('chi') && aiShouldClaim(p, tile, 'chi', prev)) {
            const chiTiles = aiChooseChiTiles(p, tile);
            if (chiTiles) return claimChi(prev, pendingAi.playerId, chiTiles);
          }
          return skipClaim(prev, pendingAi.playerId);
        });
      }, 300 + Math.random() * 200);
      return;
    }

    if (gameState.phase === 'playing' && cp !== 0) {
      aiTimerRef.current = setTimeout(() => {
        setGameState(prev => {
          if (!prev || prev.currentPlayer !== cp) return prev;
          const p = prev.players[cp];
          const lastTile = p.hand[p.hand.length - 1];
          if (lastTile) {
            const combos = checkWin(p.hand.slice(0, -1), p.melds, lastTile);
            if (combos) {
              const ctx = buildYakuContext(prev, cp, lastTile, true);
              const allTiles = [...p.hand, ...p.melds.flatMap(m => m.tiles)];
              const yaku = detectYaku(combos[0], allTiles, p.melds, ctx);
              if (yaku.filter(y => !y.name.startsWith('Dora') && !y.name.startsWith('Ura Dora')).length > 0) {
                return declareWin(prev, cp);
              }
            }
          }
          const discardChoice = aiDiscard(p, prev);
          if (!p.isRiichi && p.melds.filter(m => m.type !== 'closedKan').length === 0) {
            const remaining = p.hand.filter(t => t.id !== discardChoice.id);
            if (findShanten(remaining, p.melds) === 0 && aiShouldRiichi(p, prev, discardChoice)) {
              return declareRiichi(prev, discardChoice.id);
            }
          }
          return discardTile(prev, discardChoice.id);
        });
      }, 400 + Math.random() * 300);
    }
  }, [gameState]);

  const handleNext = useCallback(() => {
    setGameState(prev => {
      if (!prev) return null;
      if (prev.phase === 'gameEnd') { setAppPhase('settings'); return null; }
      return nextRound(prev);
    });
  }, []);

  if (appPhase === 'settings') return <SettingsScreen onStart={handleStart} />;
  if (!gameState) return null;

  const availableActions = getAvailableActions(gameState);

  return (
    <div className="app">
      <GameBoard
        gameState={gameState}
        onAction={handleAction}
        selectedTile={selectedTile}
        onTileSelect={setSelectedTile}
        availableActions={availableActions}
      />
      {(gameState.phase === 'roundEnd' || gameState.phase === 'gameEnd') && gameState.lastWin && (
        <ScoreModal
          winResult={gameState.lastWin}
          players={gameState.players}
          onNext={handleNext}
          isGameEnd={gameState.phase === 'gameEnd'}
        />
      )}
      {gameState.phase === 'roundEnd' && !gameState.lastWin && (
        <div className="modal-overlay">
          <div className="score-modal">
            <h2>流局</h2>
            <div className="tenpai-info">
              {gameState.players.map(p => (
                <div key={p.id} className="tenpai-row">
                  <span>{p.name}</span>
                  <span className={p.isTenpai ? 'tenpai-yes' : 'tenpai-no'}>
                    {p.isTenpai ? '聴牌' : 'ノーテン'}
                  </span>
                </div>
              ))}
            </div>
            <button className="next-btn" onClick={handleNext}>次の局へ</button>
          </div>
        </div>
      )}
    </div>
  );
}
