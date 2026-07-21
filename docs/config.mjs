export const generalDocumentConfig = {
  title: 'TMPose紙芝居 一般ドキュメント',
  author: 'Hiroya Kubo',
  sourceDirectory: 'general',
  outputDirectory: 'general',
  tocHtmlFilename: 'toc.html',
  tocSectionDepth: 3,
  documents: [
    {
      sourceFilename: '01-user-guide.md',
      title: '紙芝居アプリ 操作説明書',
      audience: 'アプリを使う方',
      description: '台本の読み込み、再生、ポーズ認識、本番前の確認方法を説明します。',
    },
    {
      sourceFilename: '02-dsl-manual.md',
      title: '紙芝居DSLファイル作成マニュアル',
      audience: '作品を作る方',
      description: '紙芝居の台本を設計し、段階的に作成・テストする手順を説明します。',
    },
    {
      sourceFilename: '03-command-reference.md',
      title: '紙芝居DSL コマンドリファレンス',
      audience: '台本文法を調べる方',
      description: '利用できるコマンド、アクション、引数、注意事項を一覧化しています。',
    },
    {
      sourceFilename: '04-executive-summary-adult.md',
      title: '紙芝居アプリ 概要説明書 大人向け',
      audience: '保護者・教員・運営者',
      description: 'アプリの価値、仕組み、利用場面、教育的な意義を簡潔にまとめています。',
    },
    {
      sourceFilename: '05-executive-summary-kids.md',
      title: '紙芝居アプリ 概要説明書 子供向け',
      audience: '子供・初めての方',
      description: '紙芝居でできることや安全な使い方を、やさしい言葉で紹介します。',
    },
  ],
};

export const documentConfig = {
  title: 'AIを使って「紙芝居の物語に参加する仕組み」を作ろう！',
  author: 'Hiroya Kubo',
  sourceDirectory: 'workshops/2026-08-01',
  outputDirectory: 'workshops/2026-08-01',
  learnedThroughGrade: 3,
  coverFilename: 'tmpose-kamishibai-cover-20260801.md',
  coverHtmlFilename: 'index.html',
  sourceFilename: 'tmpose-kamishibai-20260801.md',
  tocHtmlFilename: 'toc.html',
  pdfFilename: 'tmpose-kamishibai-20260801.pdf',
  tocSectionDepth: 4,
  rubyOverrides: [
    '久保裕也:裕也:ひろや',
    '竜宮城:りゅうぐうじょう',
    '玉手箱:たまてばこ',
    '浦島太郎:うらしまたろう',
    '未習漢字:みしゅうかんじ',
  ],
};

export function resolveLearnedThroughGrade(value = process.env.RUBYGANA_GRADE) {
  const grade = value === undefined || value === ''
    ? documentConfig.learnedThroughGrade
    : Number(value);

  if (!Number.isInteger(grade) || grade < 1 || grade > 6) {
    throw new RangeError('RUBYGANA_GRADE must be an integer from 1 through 6.');
  }

  return grade;
}
