import React, { useState, useEffect } from 'react';
import { GameSettings } from '../types/mahjong';

interface Props {
  onStart: (settings: GameSettings) => void;
}

export const SettingsScreen: React.FC<Props> = ({ onStart }) => {
  useEffect(() => {
    document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'hidden'; };
  }, []);

  const [settings, setSettings] = useState<GameSettings>({
    redDora: true,
    kuitan: true,
    gameType: 'east',
    difficulty: 'normal',
  });

  const toggle = (key: 'redDora' | 'kuitan') => {
    setSettings(s => ({ ...s, [key]: !s[key] }));
  };

  return (
    <div className="settings-screen">
      <div className="settings-card">

        {/* 左：タイトル */}
        <div className="settings-left">
          <div className="mahjong-logo">🀄</div>
          <h1 className="settings-h1">日本麻雀</h1>
          <p className="settings-subtitle">Japanese Riichi Mahjong</p>
        </div>

        {/* 右：設定フォーム */}
        <div className="settings-right">
          <div className="settings-group">
            <h3>ゲーム設定</h3>
            <label className="settings-row">
              <span>ゲームタイプ</span>
              <select value={settings.gameType}
                onChange={e => setSettings(s => ({ ...s, gameType: e.target.value as 'east' | 'hanchan' }))}>
                <option value="east">東風戦</option>
                <option value="hanchan">半荘戦</option>
              </select>
            </label>
            <label className="settings-row">
              <span>難易度</span>
              <select value={settings.difficulty}
                onChange={e => setSettings(s => ({ ...s, difficulty: e.target.value as GameSettings['difficulty'] }))}>
                <option value="normal">普通</option>
                <option value="strong">強い</option>
                <option value="veryStrong">最強</option>
              </select>
            </label>
          </div>

          <div className="settings-group">
            <h3>ルール設定</h3>
            <label className="settings-row toggle-row">
              <span>赤ドラ</span>
              <div className={`toggle ${settings.redDora ? 'toggle-on' : 'toggle-off'}`}
                onClick={() => toggle('redDora')}>
                <div className="toggle-knob" />
              </div>
            </label>
            <label className="settings-row toggle-row">
              <span>食い断</span>
              <div className={`toggle ${settings.kuitan ? 'toggle-on' : 'toggle-off'}`}
                onClick={() => toggle('kuitan')}>
                <div className="toggle-knob" />
              </div>
            </label>
          </div>

          <button className="start-btn" onClick={() => onStart(settings)}>
            ゲーム開始
          </button>
        </div>

      </div>
    </div>
  );
};
