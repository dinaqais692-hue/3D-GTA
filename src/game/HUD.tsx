import React, { useState, useEffect } from 'react';
import { gameState } from './state';

export default function HUD() {
  const [showEnter, setShowEnter] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [health, setHealth] = useState(100);

  // تحديث الواجهة بناءً على حالة اللعبة كل 100 ملي ثانية
  useEffect(() => {
    const interval = setInterval(() => {
      setShowEnter(gameState.showEnterPrompt);
      setShowExit(gameState.inCar);
      setHealth(gameState.health);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none', // لضمان عدم حجب الماوس عن اللعبة
      fontFamily: 'sans-serif',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '20px'
    }}>
      {/* الجزء العلوي: شريط الصحة */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ fontSize: '24px' }}>❤️</div>
        <div style={{
          width: '200px',
          height: '20px',
          background: 'rgba(0,0,0,0.5)',
          border: '2px solid white',
          borderRadius: '10px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${health}%`,
            height: '100%',
            background: '#ff4b2b',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* الجزء الأوسط: رسائل التعليمات */}
      <div style={{ textAlign: 'center', marginBottom: '100px' }}>
        {showEnter && !showExit && (
          <div style={{
            background: 'rgba(0,0,0,0.7)',
            padding: '10px 20px',
            borderRadius: '5px',
            fontSize: '20px',
            display: 'inline-block',
            borderBottom: '4px solid #f6c90e'
          }}>
            Press <span style={{ color: '#f6c90e', fontWeight: 'bold' }}>F</span> to Enter Car
          </div>
        )}
        {showExit && (
          <div style={{
            background: 'rgba(0,0,0,0.7)',
            padding: '10px 20px',
            borderRadius: '5px',
            fontSize: '20px',
            display: 'inline-block',
            borderBottom: '4px solid #f6c90e'
          }}>
            Press <span style={{ color: '#f6c90e', fontWeight: 'bold' }}>F</span> to Exit Car
          </div>
        )}
      </div>

      {/* الجزء السفلي: التحكم */}
      <div style={{
        background: 'rgba(0,0,0,0.5)',
        padding: '15px',
        borderRadius: '8px',
        fontSize: '14px',
        width: 'fit-content'
      }}>
        <div>WASD - Move / Drive</div>
        <div>SHIFT - Sprint</div>
        <div>MOUSE - Look around</div>
      </div>
    </div>
  );
}
