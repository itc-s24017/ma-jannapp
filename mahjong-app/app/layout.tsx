import { SocketProvider } from '../app/contexts/SocketContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <SocketProvider>{children}</SocketProvider>
      </body>
    </html>
  );
}
