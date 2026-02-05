'use client';

import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  const createRoom = () => {
    const roomId = Math.random().toString(36).slice(2, 8);
    router.push(`/room/${roomId}`);
  };

  const joinRoom = () => {
    const roomId = prompt('ルームIDを入力してください');
    if (roomId) {
      router.push(`/room/${roomId}`);
    }
  };

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
          width: '600px',
          height: '360px',
          backgroundColor: '#dcedc8',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        <h1
          style={{
            fontSize: '48px',
            marginBottom: '40px',
            letterSpacing: '4px',
          }}
        >
          1局麻雀
        </h1>

        <div style={{ display: 'flex', gap: '40px' }}>
          <button
            onClick={() => router.push('/room')}
            style={buttonStyle}
          >
            参加
          </button>


          <button
            onClick={() => router.push('/create')}
            style={buttonStyle}
          >
            作成
          </button>

        </div>
      </div>
    </main>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '14px 36px',
  fontSize: '20px',
  backgroundColor: '#ffffff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
};
