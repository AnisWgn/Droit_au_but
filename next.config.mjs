import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Plusieurs lockfiles (ex. parent SIO2_Projet + ce dossier) : sans ça, Next infère une racine
   * incorrecte et le client peut charger un autre `react` que celui du bundle R3F → erreurs
   * « ReactCurrentOwner » / propriété minifiée « .d » (rejet de promesse non géré).
   */
  outputFileTracingRoot: path.join(__dirname),
  /**
   * Même avec Webpack, Next utilise cette racine pour la détection du workspace (lockfiles).
   * Sinon la résolution peut remonter au dossier parent et mélanger des dépendances.
   */
  turbopack: {
    root: path.join(__dirname),
  },
  /**
   * Ne pas aliaser `react` / `react-dom` côté client : le client Flight RSC (`react-server-dom-webpack`)
   * doit utiliser le même react-dom qu’attend Next (React 19 + `__DOM_INTERNALS_…`). Avec React 18,
   * `ReactDOMSharedInternals.d` est absent → erreur « reading 'd' » dans processFullStringRow.
   */
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  /**
   * socket.io / ws : dépendances natives optionnelles.
   * Ne pas les marquer en externals côté client (sinon le chunk ne peut pas s'exécuter dans le navigateur).
   */
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        bufferutil: false,
        'utf-8-validate': false,
      };
    }
    return config;
  },
};

export default nextConfig;
