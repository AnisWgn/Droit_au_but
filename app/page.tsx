import dynamic from 'next/dynamic';

const GameBoard = dynamic(() => import('@/components/GameBoard'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0a0a1a',
        color: 'white',
        fontSize: '1.5rem',
        fontWeight: 'bold',
        fontFamily: 'sans-serif',
      }}
    >
      🎮 Chargement...
    </div>
  ),
});

export default function Page() {
  return <GameBoard />;
}
