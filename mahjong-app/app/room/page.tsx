'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RoomInputPage() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');

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
          backgroundColor: '#e0e0e0',
          padding: '40px',
          borderRadius: '8px',
          width: '420px',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}
      >
        <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>
          ルームID入力
        </h2>

    <input
      value={roomId}
      onChange={(e) => {
        const value = (e.target as HTMLInputElement).value;
        setRoomId(value);
      }}
    style={{
        width: '100%',
        padding: '10px',
        marginBottom: '20px',
        fontSize: '16px',
      }}
    />

        <button
          onClick={() => router.push(`/room/${roomId}`)}
          style={{
            padding: '8px 24px',
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
