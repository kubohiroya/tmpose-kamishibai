import {defineConfig} from '@vivliostyle/cli';

import {textbookConfig} from './config.mjs';

export default defineConfig({
  title: textbookConfig.title,
  author: textbookConfig.author,
  language: 'ja',
  size: 'A4',
  entry: [textbookConfig.sourceFilename],
  theme: [
    'theme.css',
    'textbook-theme.css',
  ],
  workspaceDir: '../tmp/textbook-vivliostyle',
  copyAsset: {
    excludes: [
      'dist/**',
      'docs/**',
      'tmp/**',
    ],
  },
  toc: {
    title: '目次',
    htmlPath: 'index.html',
    sectionDepth: textbookConfig.tocSectionDepth,
  },
});
