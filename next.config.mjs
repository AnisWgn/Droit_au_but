/** @type {import('next').NextConfig} */
const nextConfig = {
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
