/**
 * En développement : journal des promesses rejetées avec la pile réelle dans la console du navigateur
 * (le terminal Next n’affiche souvent que « reading 'd' » sans stack).
 */
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const r = event.reason;
    console.error('[Droit_au_but] unhandledrejection:', r);
    if (r instanceof Error && r.stack) {
      console.error(r.stack);
    }
  });
}
