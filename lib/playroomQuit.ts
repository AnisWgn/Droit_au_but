import * as PlayroomKit from 'playroomkit';

type PlayroomModule = typeof PlayroomKit & {
  /** Export du bundle (non listé dans types.d.ts) : singleton `Ue()` avec `leaveRoom`. */
  Multiplayer?: () => { leaveRoom?: () => void };
};

/**
 * Coupe la connexion Playroom puis redirige sans le hash `#r=…` (sinon `insertCoin` rejoindra le même salon).
 */
export function quitPlayroomSession(): void {
  try {
    const p = PlayroomKit.myPlayer() as { disconnect?: () => void } | undefined;
    p?.disconnect?.();
  } catch {
    /* noop */
  }

  try {
    (PlayroomKit as PlayroomModule).Multiplayer?.()?.leaveRoom?.();
  } catch {
    /* noop */
  }

  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  url.hash = '';
  const target = `${url.origin}${url.pathname}${url.search}`;
  window.location.href = target;
}
