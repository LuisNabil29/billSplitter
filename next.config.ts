import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  
  // Configuración para webpack (fallback)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // No incluir módulos de Node.js en el bundle del cliente
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
      };
    }
    return config;
  },
  
  // Configuración para Turbopack (Next.js 16+)
  turbopack: {},
  
  // Configuración experimental para excluir paquetes del bundle del cliente
  experimental: {
    serverComponentsExternalPackages: ['ioredis'],
  },
}

export default nextConfig

