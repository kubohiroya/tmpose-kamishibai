export const documentConfig = {
  title: 'AIを使って「紙芝居の物語に参加する仕組み」を作ろう！',
  author: 'Hiroya Kubo',
  learnedThroughGrade: 3,
  sourceFilename: 'tmpose-kamishibai-20260801.md',
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
