export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    ...(process.env.NODE_ENV === 'production'
      ? {
          '@fullhuman/postcss-purgecss': {
            content: ['./src/**/*.{js,jsx,ts,tsx}', './index.html'],
            defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
            safelist: {
              standard: [
                /^bg-/,
                /^text-/,
                /^border-/,
                /^hover:/,
                /^dark:/,
                /^focus:/,
                /^active:/,
                /^\[cmdk/,
                /^data-\[/,
                /^aria-\[/,
              ],
              deep: [/dark$/, /light$/],
              greedy: [/^twitch-/],
            },
          },
          cssnano: {
            preset: ['default', { discardComments: { removeAll: true } }],
          },
        }
      : {}),
  },
}
