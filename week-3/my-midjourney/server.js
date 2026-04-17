// ========================================
// Module Imports
// ========================================
require('dotenv').config();
const express = require('express');
const path = require('path');

// ========================================
// App Initialization
// ========================================
const app = express();
const PORT = process.env.PORT || 4000;

// ========================================
// Middleware
// ========================================
app.use(express.json());

// CORS - 개발 환경에서 localhost 요청 허용
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Static file serving
app.use(express.static(path.join(__dirname)));

// ========================================
// Translation Helper (MyMemory 무료 API)
// ========================================

// 한글 포함 여부 감지
function containsKorean(text) {
  return /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/.test(text);
}

// MyMemory 무료 번역 API (한→영)
async function translateToEnglish(text) {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ko|en`;
    const res = await fetch(url);
    const data = await res.json();
    const translated = data?.responseData?.translatedText;
    if (translated && translated !== text) {
      console.log(`[번역] "${text}" → "${translated}"`);
      return translated;
    }
  } catch (err) {
    console.warn('[번역 실패] 원문 그대로 사용:', err.message);
  }
  return text; // 번역 실패 시 원문 사용
}

// ========================================
// API Routes
// ========================================

/**
 * POST /api/generate
 * fal.ai Flux Schnell 모델로 이미지 생성을 프록시합니다.
 * Body: { prompt, image_size, num_images, num_inference_steps }
 */
app.post('/api/generate', async (req, res) => {
  try {
    // FAL_API_KEY 환경변수 확인
    const FAL_API_KEY = (process.env.FAL_API_KEY || '').trim();
    if (!FAL_API_KEY) {
      return res.status(401).json({
        success: false,
        message: 'FAL_API_KEY 환경변수가 설정되지 않았습니다. .env 파일을 확인해 주세요.',
      });
    }

    // 요청 바디 검증
    const { prompt, image_size, num_images, num_inference_steps } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        message: '프롬프트를 입력해 주세요.',
      });
    }

    // 한글 감지 시 영어로 자동 번역
    let finalPrompt = prompt.trim();
    if (containsKorean(finalPrompt)) {
      finalPrompt = await translateToEnglish(finalPrompt);
    }

    // fal.ai API 호출
    const falResponse = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: finalPrompt,
        image_size: image_size || 'square_hd',
        num_images: num_images || 1,
        num_inference_steps: num_inference_steps || 4,
      }),
    });

    // fal.ai 에러 처리
    if (!falResponse.ok) {
      const errorBody = await falResponse.text();
      let errorMessage;

      try {
        const errorJson = JSON.parse(errorBody);
        errorMessage = errorJson.detail || errorJson.message || errorBody;
      } catch {
        errorMessage = errorBody;
      }

      // 상태 코드별 분기 처리
      if (falResponse.status === 401 || falResponse.status === 403) {
        return res.status(401).json({
          success: false,
          message: 'API Key가 유효하지 않습니다. FAL_API_KEY를 확인해 주세요.',
        });
      }
      if (falResponse.status === 422) {
        return res.status(422).json({
          success: false,
          message: '요청 형식이 올바르지 않습니다. 프롬프트를 확인해 주세요.',
          detail: errorMessage,
        });
      }
      if (falResponse.status === 429) {
        return res.status(429).json({
          success: false,
          message: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
        });
      }

      return res.status(falResponse.status).json({
        success: false,
        message: `fal.ai API 오류 (${falResponse.status})`,
        detail: errorMessage,
      });
    }

    // 성공 응답 전달
    const data = await falResponse.json();
    return res.json(data);

  } catch (err) {
    console.error('[/api/generate] Error:', err.message);
    return res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.',
    });
  }
});

// ========================================
// SPA Fallback
// ========================================
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ========================================
// Server Startup / Vercel Export
// ========================================
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
