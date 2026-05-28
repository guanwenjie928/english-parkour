// 从解析后的文本中提取单词-释义对

const { parseText } = require('./parsers/TextParser');

class WordExtractor {
  static extract(rawContent, fileType) {
    switch (fileType) {
      case 'txt':
      case 'csv':
        return parseText(rawContent);

      case 'docx':
        // mammoth 提取的 HTML/文本
        return parseText(this.stripHtml(rawContent));

      case 'pdf':
        // pdf-parse 提取的文本
        return parseText(rawContent);

      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'webp':
        // OCR 后的文本
        return parseText(rawContent);

      default:
        return { format: 'unknown', results: [] };
    }
  }

  static stripHtml(html) {
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

module.exports = { WordExtractor };
