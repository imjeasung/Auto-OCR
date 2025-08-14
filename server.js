const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { processOCR } = require('./ocr-service');
const { formatReceiptText } = require('./gpt-service');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 업로드된 파일 저장 설정
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 제한
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('지원하지 않는 파일 형식입니다.'));
    }
  }
});

// 정적 파일 제공
app.use(express.static('public'));

// 업로드 폴더 생성
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

// favicon.ico 요청 처리 (404 오류 방지)
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// 기본 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 파일 업로드 API
app.post('/upload', upload.single('receipt'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
  }
  
  console.log('파일 업로드됨:', req.file.filename);
  
  res.json({
    success: true,
    message: '파일이 성공적으로 업로드되었습니다.',
    filename: req.file.filename
  });
});

// OCR 처리 API
app.post('/ocr', upload.single('receipt'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
  }
  
  console.log('OCR 처리 시작:', req.file.filename);
  
  try {
    const result = await processOCR(req.file.path);
    
    // 처리 완료 후 파일 삭제
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('파일 삭제 오류:', err);
    });
    
    if (result.success) {
      // GPT로 텍스트 정리
      console.log('GPT 텍스트 정리 시작...');
      const gptResult = await formatReceiptText(result.text);
      
      res.json({
        success: true,
        rawText: result.text,
        formattedText: gptResult.success ? gptResult.formattedText : null,
        gptError: gptResult.success ? null : gptResult.error,
        fields: result.fields
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('OCR 처리 중 오류:', error);
    
    // 오류 발생 시에도 파일 삭제
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('파일 삭제 오류:', err);
    });
    
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});