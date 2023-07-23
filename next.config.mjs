import withMarkdoc from '@markdoc/next.js'
import withSearch from './src/markdoc/search.mjs'
import withNavigation from './src/markdoc/navigation.mjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx', 'md'],
  experimental: {
    scrollRestoration: true,
  },
  images: {
    unoptimized: true,
  },
}

export default withNavigation(
  withSearch(withMarkdoc({ schemaPath: './src/markdoc' })(nextConfig))
)