const axios = require('axios');
require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function formatReceiptText(ocrText) {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다.');
    }

    const prompt = `다음은 영수증에서 OCR로 추출한 텍스트입니다. 이를 정리해서 지출증빙에 사용하기 편한 형태로 정리해주세요.

OCR 원본 텍스트:
${ocrText}

다음 형식으로 정리해주세요:
[매장 정보]
- 매장명: 
- 사업자등록번호: 
- 주소: 
- 전화번호: 

[거래 정보]
- 일시: YYYY-MM-DD HH:MM
- 영수증번호: 
- 결제방법: 

[구매 내역]
- 상품명 | 단가 | 수량 | 금액
- (각 상품별로 한 줄씩)

[금액 정보]
- 합계: 원
- 부가세: 원
- 총 결제금액: 원

정확하지 않은 정보는 "정보 없음"으로 표시해주세요.`;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-5-nano",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_completion_tokens: 5000
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('GPT 응답:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.choices && response.data.choices[0]) {
      return {
        success: true,
        formattedText: response.data.choices[0].message.content
      };
    } else {
      console.log('GPT 응답 형식 오류:', response.data);
      return {
        success: false,
        error: 'GPT 응답 형식이 올바르지 않습니다.'
      };
    }

  } catch (error) {
    console.error('GPT 처리 오류:', error.message);
    
    if (error.response) {
      return {
        success: false,
        error: `OpenAI API 오류: ${error.response.status} - ${error.response.data?.error?.message || '알 수 없는 오류'}`
      };
    } else {
      return {
        success: false,
        error: 'GPT 처리 중 오류가 발생했습니다.'
      };
    }
  }
}

module.exports = { formatReceiptText };
