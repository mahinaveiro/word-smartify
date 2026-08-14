import nextConfig from 'eslint-config-next/core-web-vitals'

const config = [
  ...nextConfig,
  {
    ignores: ['.next/**', 'node_modules/**', 'source-file-list.txt', '*.txt'],
  },
]

export default config
