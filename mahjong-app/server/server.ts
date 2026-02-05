// server/server.ts
import { createServer } from 'http';
import { Server } from 'socket.io';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from './socket-events';

const httpServer = createServer();

type Player = {
  socketId: string | null;
  name: string;
  confirmed: boolean;
};

const rooms: Record<string, Player[]> = {};

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents
>(httpServer, {
  cors: { origin: '*' },
});

io.on('connection', (socket) => {
  console.log('connected:', socket.id);

  let currentRoomId: string | null = null;

  // ===== ルーム参加 =====
  socket.on('joinRoom', (roomId) => {
    currentRoomId = roomId;
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    const players = rooms[roomId];

    // 空き席を探す
    let index = players.findIndex((p) => p.socketId === null);

    // 空きがなければ追加（最大4人）
    if (index === -1) {
      if (players.length >= 4) return;

      players.push({
        socketId: socket.id,
        name: '',
        confirmed: false,
      });
      index = players.length - 1;
    } else {
      players[index].socketId = socket.id;
    }

    socket.emit('assigned', index);
    io.to(roomId).emit('playersUpdate', players);
  });

  // ===== 名前更新 =====
  socket.on('updateName', (index, name) => {
    if (!currentRoomId) return;

    const players = rooms[currentRoomId];
    const player = players?.[index];

    if (player?.socketId === socket.id) {
      player.name = name;
      io.to(currentRoomId).emit('playersUpdate', players);
    }
  });

  // ===== OK（確定） =====
  socket.on('confirm', (index) => {
    if (!currentRoomId) return;

    const players = rooms[currentRoomId];
    const player = players?.[index];

    if (player?.socketId === socket.id) {
      player.confirmed = true;
      io.to(currentRoomId).emit('playersUpdate', players);

      // ★ 全員確定していたらゲーム開始
      const allConfirmed =
        players.length === 4 &&
        players.every((p) => p.confirmed);

      if (allConfirmed) {
        io.to(currentRoomId).emit('gameStarted');
      }
    }
  });

  // ===== 切断 =====
  socket.on('disconnect', () => {
    if (!currentRoomId) return;

    const players = rooms[currentRoomId];
    if (!players) return;

    const player = players.find((p) => p.socketId === socket.id);
    if (player) {
      player.socketId = null;
      player.name = '';
      player.confirmed = false;

      io.to(currentRoomId).emit('playersUpdate', players);
    }
  });
});

httpServer.listen(3000, () => {
  console.log('Socket.IO running on :3000');
});
