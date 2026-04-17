const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// --- In-Memory Data Store ---
let pokemons = [
  {
    id: 1,
    name: "이상해씨",
    nameEn: "Bulbasaur",
    types: ["풀", "독"],
    image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png",
    height: 7,
    weight: 69,
    stats: { hp: 45, attack: 49, defense: 49, spAtk: 65, spDef: 65, speed: 45 },
    abilities: ["과다성장", "엽록소"],
    moves: ["몸통박치기", "덩굴채찍", "씨뿌리기", "잠자기"]
  },
  {
    id: 4,
    name: "파이리",
    nameEn: "Charmander",
    types: ["불꽃"],
    image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png",
    height: 6,
    weight: 85,
    stats: { hp: 39, attack: 52, defense: 43, spAtk: 60, spDef: 50, speed: 65 },
    abilities: ["맹화", "태양의힘"],
    moves: ["할퀴기", "불꽃숨결", "불꽃날개치기", "연막"]
  },
  {
    id: 7,
    name: "꼬부기",
    nameEn: "Squirtle",
    types: ["물"],
    image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png",
    height: 5,
    weight: 90,
    stats: { hp: 44, attack: 48, defense: 65, spAtk: 50, spDef: 64, speed: 43 },
    abilities: ["급류", "빗속걷기"],
    moves: ["몸통박치기", "물포", "조개박기", "물의파동"]
  },
  {
    id: 25,
    name: "피카츄",
    nameEn: "Pikachu",
    types: ["전기"],
    image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
    height: 4,
    weight: 60,
    stats: { hp: 35, attack: 55, defense: 40, spAtk: 50, spDef: 50, speed: 90 },
    abilities: ["정전기", "피뢰침"],
    moves: ["전기충격", "번개", "재빠르기", "아이언테일"]
  },
  {
    id: 39,
    name: "푸린",
    nameEn: "Jigglypuff",
    types: ["노말", "페어리"],
    image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/39.png",
    height: 5,
    weight: 55,
    stats: { hp: 115, attack: 45, defense: 20, spAtk: 45, spDef: 25, speed: 20 },
    abilities: ["메인이벤트", "불굴의마음"],
    moves: ["노래", "잠자기", "따라하기", "문포스"]
  }
];

// --- API Routes ---

// GET /api/types - 전체 타입 목록 (중복 제거)
app.get('/api/types', (_req, res) => {
  try {
    const types = [...new Set(pokemons.flatMap(p => p.types))].sort();
    res.json({ success: true, data: types });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch types' });
  }
});

// GET /api/pokemons - 전체 목록 (필터/검색 지원)
app.get('/api/pokemons', (req, res) => {
  try {
    let result = [...pokemons];

    // 타입 필터
    if (req.query.type) {
      result = result.filter(p => p.types.includes(req.query.type));
    }

    // 이름 검색 (한글명 + 영문명 모두)
    if (req.query.search) {
      const keyword = req.query.search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(keyword) ||
        p.nameEn.toLowerCase().includes(keyword)
      );
    }

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch pokemons' });
  }
});

// GET /api/pokemons/:id - 특정 포켓몬 상세
app.get('/api/pokemons/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const pokemon = pokemons.find(p => p.id === id);

    if (!pokemon) {
      return res.status(404).json({ success: false, message: `Pokemon with id ${id} not found` });
    }

    res.json({ success: true, data: pokemon });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch pokemon' });
  }
});

// POST /api/pokemons - 새 포켓몬 추가
app.post('/api/pokemons', (req, res) => {
  try {
    const { id, name, nameEn, types, image, height, weight, stats, abilities, moves } = req.body;

    if (!id || !name || !nameEn || !types) {
      return res.status(400).json({ success: false, message: 'Required fields: id, name, nameEn, types' });
    }

    if (pokemons.find(p => p.id === id)) {
      return res.status(409).json({ success: false, message: `Pokemon with id ${id} already exists` });
    }

    const newPokemon = {
      id,
      name,
      nameEn,
      types: types || [],
      image: image || '',
      height: height || 0,
      weight: weight || 0,
      stats: stats || { hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 },
      abilities: abilities || [],
      moves: moves || []
    };

    pokemons.push(newPokemon);
    res.status(201).json({ success: true, data: newPokemon, message: 'Pokemon added successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add pokemon' });
  }
});

// PUT /api/pokemons/:id - 포켓몬 정보 수정
app.put('/api/pokemons/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const index = pokemons.findIndex(p => p.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: `Pokemon with id ${id} not found` });
    }

    // id는 변경 불가, 나머지 필드를 병합
    const updated = { ...pokemons[index], ...req.body, id };
    pokemons[index] = updated;

    res.json({ success: true, data: updated, message: 'Pokemon updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update pokemon' });
  }
});

// DELETE /api/pokemons/:id - 포켓몬 삭제
app.delete('/api/pokemons/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const index = pokemons.findIndex(p => p.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: `Pokemon with id ${id} not found` });
    }

    const deleted = pokemons.splice(index, 1)[0];
    res.json({ success: true, data: deleted, message: 'Pokemon deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete pokemon' });
  }
});

// --- SPA Fallback ---
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Server Start / Vercel Export ---
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
module.exports = app;
