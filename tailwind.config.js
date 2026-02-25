/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        yes:       '#00c853',
        no:        '#e53935',
        info:      '#00b2ff',
        main:      'var(--text-main)',
        secondary: 'var(--text-secondary)',
        active:    'var(--bg-panel-alt)',
        accent:    'var(--accent)',
        border:    'var(--border)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'hard':  '2px 2px 0px var(--border)',
        'hard-lg': '4px 4px 0px var(--border)',
        'hard-accent': '2px 2px 0px var(--accent)',
      },
      borderRadius: {
        DEFAULT: '0px',
        none:    '0px',
        sm:      '0px',
        md:      '0px',
        lg:      '0px',
        xl:      '0px',
        '2xl':   '0px',
        full:    '9999px', /* keep for circles */
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        light: {
          ...require('daisyui/src/theming/themes')['[data-theme=light]'],
          primary:           '#00c853',
          'primary-focus':   '#009940',
          'primary-content': '#0a0a0a',
          'base-100':        '#faf9f7',
          'base-200':        '#efefeb',
          'base-300':        '#e0dfdb',
          'neutral':         '#0d0d0d',
        },
      },
      {
        dark: {
          ...require('daisyui/src/theming/themes')['[data-theme=dark]'],
          primary:           '#00e676',
          'primary-focus':   '#00c853',
          'primary-content': '#0a0a0a',
          'base-100':        '#111111',
          'base-200':        '#1a1a1a',
          'base-300':        '#222222',
          'neutral':         '#f0f0ec',
        },
      },
    ],
  },
};
