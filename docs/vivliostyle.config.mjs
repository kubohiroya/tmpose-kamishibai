import {defineConfig} from '@vivliostyle/cli';

import {documentConfig} from './config.mjs';

function flattenDocumentTableOfContents() {
  return (documentProps) => ({
    type: 'element',
    tagName: 'ol',
    properties: {},
    children: documentProps.flatMap(({children}) => [children]
      .flat(Infinity)
      .flatMap((child) => child?.type === 'element' && child.tagName === 'ol'
        ? child.children
        : child)),
  });
}

export default defineConfig({
  title: documentConfig.title,
  author: documentConfig.author,
  language: 'ja',
  size: 'A4',
  viewerParam: 'bookMode=true',
  entry: [
    {
      rel: 'cover',
      path: documentConfig.coverFilename,
      output: documentConfig.coverHtmlFilename,
      imageSrc: 'images/image49.png',
      theme: [
        'theme.css',
        'document-theme.css',
      ],
    },
    {
      rel: 'contents',
    },
    documentConfig.sourceFilename,
  ],
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
    htmlPath: documentConfig.tocHtmlFilename,
    sectionDepth: documentConfig.tocSectionDepth,
    transformDocumentList: flattenDocumentTableOfContents,
  },
});
