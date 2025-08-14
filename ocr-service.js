const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const API_URL = process.env.NAVER_OCR_API_URL;
const SECRET_KEY = process.env.NAVER_OCR_SECRET_KEY;

async function processOCR(filePath) {
  try {
    console.log('API_URL:', API_URL);
    console.log('SECRET_KEY:', SECRET_KEY ? 'SET' : 'NOT SET');
    
    if (!API_URL || !SECRET_KEY) {
      throw new Error('API URL 또는 Secret Key가 설정되지 않았습니다.');
    }
    
    // 파일 확장자 추출
    const fileExt = path.extname(filePath).toLowerCase();
    let format = 'jpg';
    
    if (fileExt === '.png') format = 'png';
    else if (fileExt === '.pdf') format = 'pdf';
    
    // OCR API 요청 데이터
    const requestData = {
      images: [{
        format: format,
        name: 'receipt'
      }],
      requestId: generateRequestId(),
      version: 'V2',
      timestamp: Date.now()
    };
    
    // FormData 생성
    const formData = new FormData();
    formData.append('message', JSON.stringify(requestData));
    formData.append('file', fs.createReadStream(filePath));
    
    // API 호출
    const response = await axios.post(API_URL, formData, {
      headers: {
        'X-OCR-SECRET': SECRET_KEY,
        ...formData.getHeaders()
      },
      timeout: 30000
    });
    
    // 결과 처리
    if (response.data && response.data.images && response.data.images[0]) {
      const fields = response.data.images[0].fields;
      const extractedText = fields.map(field => field.inferText).join('\n');
      
      return {
        success: true,
        text: extractedText,
        fields: fields
      };
    } else {
      return {
        success: false,
        error: '텍스트를 찾을 수 없습니다.'
      };
    }
    
  } catch (error) {
    console.error('OCR 처리 오류:', error.message);
    
    if (error.response) {
      return {
        success: false,
        error: `OCR API 오류: ${error.response.status} - ${error.response.data?.message || '알 수 없는 오류'}`
      };
    } else {
      return {
        success: false,
        error: '네트워크 오류 또는 API 연결 실패'
      };
    }
  }
}

function generateRequestId() {
  return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

module.exports = { processOCR };