// server/src/server.ts
import { createServer } from 'http';
import { Server } from 'socket.io';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from './socket-events.js';

type Player = {
  socketId: string | null;
  name: string;
  confirmed: boolean;
};

const rooms: Record<string, Player[]> = {};

const PORT = Number(process.env.PORT) || 3001; 
const httpServer = createServer();

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    // Vercelにデプロイしたあとの自分のURLをここに書く
    // 開発中は "*" のままでも動きます
    origin: 
    // process.env.NODE_ENV === 'production' 
    //   ? "https://ma-jannapp.vercel.app" 
    //   :
       "*",
    methods: ["GET", "POST"]
  },
});

// playersUpdateに渡す用のヘルパー（socketIdを除外）
const toPublic = (players: Player[]) =>
  players.map(({ name, confirmed }) => ({ name, confirmed }));

io.on('connection', (socket) => {
  console.log('connected:', socket.id);

  let currentRoomId: string | null = null;

  // ===== ルーム参加 =====
  socket.on('joinRoom', (roomId) => {
    currentRoomId = roomId;
    socket.join(roomId);

    // ルームがなければ空で作る
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    const players = rooms[roomId];

    // 既にこの socketId が登録済みなら重複追加しない（StrictMode対策）
    const alreadyIndex = players.findIndex((p) => p.socketId === socket.id);
    if (alreadyIndex !== -1) {
      socket.emit('assigned', alreadyIndex);
      socket.emit('playersUpdate', toPublic(players));
      return;
    }

    // 満席チェック（最大4人）
    if (players.length >= 4) {
      socket.emit('assigned', -1);
      socket.emit('playersUpdate', toPublic(players));
      return;
    }

    // 新しい席を末尾に追加
    const index = players.length;
    players.push({ socketId: socket.id, name: '', confirmed: false });

    socket.emit('assigned', index);
    io.to(roomId).emit('playersUpdate', toPublic(players));
  });

  // ===== 名前更新 =====
  socket.on('updateName', (index, name) => {
    if (!currentRoomId) return;
    const players = rooms[currentRoomId];
    if (!players) return;
    const player = players[index];
    if (!player) return;
    if (player.socketId !== socket.id) return;

    player.name = name;
    io.to(currentRoomId).emit('playersUpdate', toPublic(players));
  });

  // ===== 確定 / キャンセル =====
  socket.on('confirm', (index) => {
    if (!currentRoomId) return;
    const players = rooms[currentRoomId];
    if (!players) return;
    const player = players[index];
    if (!player) return;
    if (player.socketId !== socket.id) return;

    player.confirmed = !player.confirmed;
    io.to(currentRoomId).emit('playersUpdate', toPublic(players));
  });

  // ===== 切断 =====
  socket.on('disconnect', () => {
    if (!currentRoomId) return;
    const players = rooms[currentRoomId];
    if (!players) return;
    const idx = players.findIndex((p) => p.socketId === socket.id);
    if (idx !== -1) {
      // 席を削除して詰める
      players.splice(idx, 1);
      io.to(currentRoomId).emit('playersUpdate', toPublic(players));
    }
  });

  // ===== ゲーム開始 =====
  socket.on('startGame', (roomId) => {
    const players = rooms[roomId];
    if (!players) return;

    const activePlayers = players.filter((p) => p.socketId !== null);

    if (activePlayers.length < 1) return;
    if (!activePlayers.every((p) => p.confirmed)) return;
    if (players[0]?.socketId !== socket.id) return;

    io.to(roomId).emit('gameStarted');
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Socket.IO running on port ${PORT}`);
});