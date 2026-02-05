'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '../../contexts/SocketContext';

type Player = {
  name: string;
  confirmed: boolean;
};

export default function RoomPage() {
  const socket = useSocket();
  const router = useRouter();
  const { roomId } = useParams<{ roomId: string }>();

  const [players, setPlayers] = useState<Player[]>([]);
  const [myIndex, setMyIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!socket || !roomId) return;

    socket.emit('joinRoom', roomId);

    socket.on('assigned', (index) => {
      setMyIndex(index);
    });

    socket.on('playersUpdate', (players) => {
      setPlayers(players);
    });

    socket.on('gameStarted', () => {
      router.push(`/game/${roomId}`);
    });

    return () => {
      socket.off('assigned');
      socket.off('playersUpdate');
      socket.off('gameStarted');
    };
  }, [socket, roomId, router]);

  if (!socket) return <div>connecting...</div>;

  const allConfirmed =
    players.length === 4 && players.every((p) => p.confirmed);
  const isHost = myIndex === 0;

  return (
    <main style={bgStyle}>
      <div style={cardStyle}>
        <h2 style={titleStyle}>参加者</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {players.map((player, index) => {
            const isMe = index === myIndex;

            return (
              <div
                key={index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 60px 60px',
                  gap: 10,
                  alignItems: 'center',
                }}
              >
                <input
                  value={player.name}
                  placeholder="名前"
                  readOnly={!isMe || player.confirmed}
                  onChange={(e) =>
                    socket.emit('updateName', index, e.currentTarget.value)
                  }
                  style={{
                    ...inputStyle,
                    background: !isMe || player.confirmed ? '#eee' : '#fff',
                  }}
                />

                <input value="¥" readOnly style={inputStyle} />

                <button
                  disabled={!isMe || player.confirmed || player.name === ''}
                  onClick={() => socket.emit('confirm', index)}
                  style={{
                    ...okButtonStyle,
                    opacity:
                      !isMe || player.confirmed || player.name === ''
                        ? 0.4
                        : 1,
                  }}
                >
                  ok
                </button>
              </div>
            );
          })}
        </div>

        <button
          disabled={!allConfirmed || !isHost}
          onClick={() => socket.emit('startGame', roomId)}
          style={{
            ...startButtonStyle,
            opacity: !allConfirmed || !isHost ? 0.4 : 1,
            cursor: !allConfirmed || !isHost ? 'default' : 'pointer',
          }}
        >
          スタート
        </button>
      </div>
    </main>
  );
}

/* ===== styles ===== */

const bgStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#cfe6b8',
  backgroundImage:
    'radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)',
  backgroundSize: '40px 40px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const cardStyle: React.CSSProperties = {
  width: 700,
  padding: 30,
  backgroundColor: '#dcedc8',
  borderRadius: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
};

const titleStyle: React.CSSProperties = {
  textAlign: 'center',
  fontSize: 26,
  marginBottom: 24,
};

const inputStyle: React.CSSProperties = {
  padding: 10,
  fontSize: 16,
  border: 'none',
  borderRadius: 4,
};

const okButtonStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: 'none',
  borderRadius: 4,
  background: '#fff',
};

const startButtonStyle: React.CSSProperties = {
  marginTop: 24,
  width: '100%',
  padding: 12,
  fontSize: 18,
  background: '#e0e0e0',
  border: 'none',
  borderRadius: 6,
};
