'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../../server/src/socket-events';

export type TypedSocket = Socket<
  ServerToClientEvents,
  ClientToServerEvents
>;

const SocketContext = createContext<TypedSocket | null>(null);

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [socket, setSocket] = useState<TypedSocket | null>(null);

  useEffect(() => {
    const s: TypedSocket = io('https://ma-jannapp-qc4t.onrender.com');
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}
