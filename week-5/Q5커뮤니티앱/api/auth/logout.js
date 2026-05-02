// JWT는 stateless라 서버에서 토큰을 무효화하지 않는다.
// 클라이언트가 localStorage 등에서 토큰을 삭제하도록 안내만 한다.
// (블랙리스트가 필요하다면 Redis/DB 테이블을 추가하는 식으로 확장 가능)

function handler(_req, res) {
  return res.json({
    success: true,
    message: 'Logged out. Please discard your token on the client side.',
  });
}

module.exports = handler;
