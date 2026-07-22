import {defineConfig} from '@vivliostyle/cli';

import {generalDocumentConfig} from './config.mjs';

export default defineConfig({
  title: generalDocumentConfig.title,
  author: generalDocumentConfig.author,
  language: 'ja',
  size: 'A4',
  viewerParam: 'bookMode=true',
  entry: generalDocumentConfig.documents.map(({sourceFilename}) => ({
    path: `${generalDocumentConfig.sourceDirectory}/${sourceFilename}`,
    output: sourceFilename.replace(/\.md$/u, '.html'),
  })),
  theme: [
    'theme.css',
    'general-theme.css',
  ],
  workspaceDir: '../tmp/docs-general-vivliostyle',
  copyAsset: {
    excludes: [
      'dist/**',
      'tmp/**',
      'general/**',
      'workshops/**',
    ],
  },
  toc: {
    title: '一般ドキュメント目次',
    htmlPath: generalDocumentConfig.tocHtmlFilename,
    sectionDepth: generalDocumentConfig.tocSectionDepth,
  },
});
