require('dotenv').config();
const express = require('express');
const path = require('path');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt
const SYSTEM_PROMPT = '당신은 따뜻하고 공감적인 AI 심리상담사 \'마음이\'입니다. 사용자의 감정을 이해하고 공감하며, 심리적으로 지지해주세요. 전문적인 심리상담사처럼 응답하되, 친근하고 따뜻한 말투를 사용하세요. 위기 상황에서는 전문 기관(자살예방상담전화 1393, 정신건강위기상담전화 1577-0199)을 안내해주세요.';

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// POST /api/chat - OpenAI chat completion
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, message: 'messages 배열이 필요합니다.' });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      temperature: 0.8,
      max_tokens: 1024,
    });

    const reply = completion.choices[0].message.content;
    res.json({ success: true, reply });
  } catch (err) {
    console.error('OpenAI API error:', err.message);
    res.status(500).json({ success: false, message: 'AI 응답 생성에 실패했습니다.' });
  }
});

// SPA fallback
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Local / Vercel dual-mode
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
module.exports = app;
