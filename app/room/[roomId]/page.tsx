'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '../../contexts/SocketContext';
import MahjongGame from '../../room/[roomId]/Game/MahjongGame';

type Player = {
  name: string;
  confirmed: boolean;
};

function App() {
  return <MahjongGame />;
}

export default function RoomPage() {
  const socket = useSocket();
  const router = useRouter();
  const { roomId } = useParams<{ roomId: string }>();

  const [players, setPlayers] = useState<Player[]>([]);
  const [myIndex, setMyIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!socket || !roomId) return;

    socket.emit('joinRoom', roomId);
    socket.on('assigned', setMyIndex);
    socket.on('playersUpdate', setPlayers);
    socket.on('gameStarted', () => {
      router.push(`/game/${roomId}`);
    });
    socket.on('playersUpdate', (players) => {
    setPlayers(players);
    });

    return () => {
      socket.off('assigned');
      socket.off('playersUpdate');
      socket.off('gameStarted');
      socket.off('playersUpdate');
    };
  }, [socket, roomId, router]);

  if (!socket) return <div>connecting...</div>;

  const activePlayers = players.filter(p => p.name !== '');

const allConfirmed =
  activePlayers.length >= 1 &&
  activePlayers.every(p => p.confirmed);

  const isHost = myIndex === 0;

  return (
    <main style={bg}>
      <div style={card}>
        <h2 style={title}>参加者</h2>

        <div style={list}>
          {players.map((player, index) => {
            const isMe = index === myIndex;

            return (
              <div key={index} style={row}>
                <input
                  style={{
                    ...input,
                    background:
                      !isMe || player.confirmed ? '#eee' : '#fff',
                  }}
                  placeholder="名前"
                  value={player.name}
                  readOnly={!isMe || player.confirmed}
                  onChange={(e) =>
                    socket.emit('updateName', index, e.target.value)
                  }
                />

                <button
                  style={{
                  ...ok,
                  opacity: !isMe || !player.name ? 0.4 : 1,
                  }}
                  disabled={!isMe || player.name === ''}
                  onClick={() => socket.emit('confirm', index)}
                >
                  {player.confirmed ? 'キャンセル' : 'ok'}
                </button>

              </div>
            );
          })}
        </div>

        <button
          style={{
            ...start,
            opacity: !allConfirmed || !isHost ? 0.4 : 1,
          }}
          disabled={!allConfirmed || !isHost}
          onClick={() => socket.emit('startGame', roomId)}
        >
          スタート
        </button>
      </div>
    </main>
  );
}

/* ===== styles ===== */

const bg: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#cfe6b8',
  backgroundImage:
    'radial-gradient(rgba(0,0,0,0.06) 1px, transparent 1px)',
  backgroundSize: '40px 40px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const card: React.CSSProperties = {
  width: 720,
  padding: 32,
  background: '#dcedc8',
  borderRadius: 14,
  boxShadow: '0 6px 14px rgba(0,0,0,0.15)',
};

const title: React.CSSProperties = {
  textAlign: 'center',
  fontSize: 28,
  marginBottom: 26,
};

const list: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

const row: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 80px 60px',
  gap: 12,
  alignItems: 'center',
};

const input: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 16,
  borderRadius: 4,
  border: 'none',
};

const yen: React.CSSProperties = {
  padding: '10px',
  fontSize: 16,
  borderRadius: 4,
  border: 'none',
  textAlign: 'center',
  background: '#fff',
};

const ok: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 4,
  border: 'none',
  background: '#fff',
  cursor: 'pointer',
};

const start: React.CSSProperties = {
  marginTop: 28,
  width: '100%',
  padding: 14,
  fontSize: 18,
  borderRadius: 6,
  border: 'none',
  background: '#e0e0e0',
  cursor: 'pointer',
};
