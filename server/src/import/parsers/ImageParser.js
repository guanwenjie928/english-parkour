// 图片 OCR 解析器 — sharp 预处理 + Tesseract.js
// 注：Tesseract.js 体积较大，生产环境建议预下载语言包

const fs = require('fs').promises;
const path = require('path');

class ImageParser {
  constructor(options = {}) {
    this.langPath = options.langPath || './data/tesseract';
    this.languages = options.languages || 'eng+chi_sim';
  }

  async parse(imageBuffer, mimeType) {
    try {
      // 动态导入 sharp（减小启动开销）
      const sharp = require('sharp');

      // 1. 预处理
      const processed = await this.preprocess(sharp, imageBuffer);

      // 2. OCR
      const text = await this.ocr(processed);

      return {
        success: true,
        text,
        format: 'ocr',
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
      };
    }
  }

  async preprocess(sharp, buffer) {
    return sharp(buffer)
      .greyscale()
      .normalize()
      .linear(1.5, -0.2)
      .median(1)
      .toFormat('png')
      .toBuffer();
  }

  async ocr(buffer) {
    // 动态导入 tesseract.js
    const { createWorker } = require('tesseract.js');

    const worker = await createWorker(this.languages, 1, {
      logger: () => {}, // 静默日志
      errorHandler: () => {},
    });

    const {
      data: { text },
    } = await worker.recognize(buffer);

    await worker.terminate();

    return text;
  }
}

module.exports = { ImageParser };
