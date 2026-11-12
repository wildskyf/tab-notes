// Shared by `web-ext lint` and `web-ext build`: everything here stays out of the store package.
export default {
  ignoreFiles: [
    '.github',
    'README.md',
    'PRIVACY.md',
    'screenshot.png',
    'web-ext-config.mjs',
    'tests',
    'dist',
  ],
  artifactsDir: 'dist',
  build: {
    overwriteDest: true,
  },
}
