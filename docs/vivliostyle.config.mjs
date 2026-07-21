import {defineConfig} from '@vivliostyle/cli';

import {documentConfig} from './config.mjs';

export default defineConfig({
  title: documentConfig.title,
  author: documentConfig.author,
  language: 'ja',
  size: 'A4',
  entry: [documentConfig.sourceFilename],
  theme: [
    'theme.css',
    'document-theme.css',
  ],
  workspaceDir: '../tmp/docs-vivliostyle',
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
    sectionDepth: documentConfig.tocSectionDepth,
  },
});
