'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function CreateRoomPage() {
  const router = useRouter();

  const [players, setPlayers] = useState<'4' | '3'>('4');
  const [aka, setAka] = useState<'on' | 'off'>('on');
  const [ryukyoku, setRyukyoku] = useState<'on' | 'off'>('on');
  const [roomId, setRoomId] = useState('');

  const createRoom = () => {
    if (!roomId) return;
    router.push(`/room/${roomId}`);
  };

  const button = (active: boolean) => ({
    padding: '10px 20px',
    backgroundColor: active ? '#ffffff' : '#e0e0e0',
    borderRadius: '6px',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  });

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#cfe6b8',
        backgroundImage:
          'radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '520px',
          padding: '30px',
          backgroundColor: '#dcedc8',
          borderRadius: '12px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          textAlign: 'center',
        }}
      >
        {/* 人数 */}
        <div onClick={() => setPlayers('4')} style={button(players === '4')}>
          四麻
        </div>
        <div onClick={() => setPlayers('3')} style={button(players === '3')}>
          三麻
        </div>

        {/* 赤ドラ */}
        <div onClick={() => setAka('on')} style={button(aka === 'on')}>
          赤ドラあり
        </div>
        <div onClick={() => setAka('off')} style={button(aka === 'off')}>
          赤ドラなし
        </div>

        {/* 流局 */}
        <div onClick={() => setRyukyoku('on')} style={button(ryukyoku === 'on')}>
          流局あり
        </div>
        <div
          onClick={() => setRyukyoku('off')}
          style={button(ryukyoku === 'off')}
        >
          流局なし
        </div>

        {/* ルームID */}
        <input
          placeholder="ルームID"
          value={roomId}
          onChange={(e) => setRoomId(e.currentTarget.value)}
          style={{
            gridColumn: '1 / 2',
            padding: '10px',
            fontSize: '16px',
          }}
        />

        <button
          onClick={createRoom}
          style={{
            gridColumn: '2 / 3',
            padding: '10px',
            fontSize: '16px',
            backgroundColor: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          ok
        </button>
      </div>
    </main>
  );
}
