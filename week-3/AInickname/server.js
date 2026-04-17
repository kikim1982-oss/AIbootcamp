require('dotenv').config();
const express = require('express');
const path = require('path');
const OpenAI = require('openai');

const app = express();
const PORT = 5000;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post('/api/nickname', async (req, res) => {
  const { name, personality, hobbies } = req.body;

  if (!name || !personality || !hobbies) {
    return res.status(400).json({ error: '이름, 성격, 취미를 모두 입력해주세요.' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '당신은 창의적이고 재미있는 별명 생성 전문가입니다. 사람의 특성을 반영한 독특하고 유머러스한 한국어 별명을 만들어주세요.',
        },
        {
          role: 'user',
          content: `이름: ${name}, 성격: ${personality}, 취미: ${hobbies}\n위 정보를 바탕으로 재미있고 창의적인 한국어 별명 3개를 만들어주세요. 반드시 JSON 형식으로만 응답하세요: {"nicknames": ["별명1", "별명2", "별명3"]}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'OpenAI 호출 중 오류가 발생했습니다.' });
  }
});

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
