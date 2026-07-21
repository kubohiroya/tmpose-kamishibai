export const documentConfig = {
  title: 'TMPose紙芝居 利用・台本作成ガイド',
  author: 'Hiroya Kubo',
  learnedThroughGrade: 3,
  pdfFilename: 'tmpose-kamishibai-guide.pdf',
  rubyOverrides: [
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
