/* assets/manifest.json → assets/sprites-manifest.js 로 옮겨 적는다.

   파이썬판(sync-manifest.py)과 같은 일을 한다. 빌드에서는 **이쪽을 먼저 쓴다** —
   Vercel 은 Node 빌드 이미지라 node 는 반드시 있지만 python3 은 보장되지 않는다.
   빌드가 죽으면 배포가 통째로 옛것으로 남으므로(그게 여태 두 번 난 사고다),
   빌드가 기대는 것은 적을수록 좋다.

     node tools/sync-manifest.mjs           다시 만든다
     node tools/sync-manifest.mjs --check   어긋나면 1을 돌려준다
*/
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'game', 'assets', 'manifest.json');
const DST = join(ROOT, 'game', 'assets', 'sprites-manifest.js');

const HEAD = `/* assets/sprites-manifest.js — 자동 생성물. 손으로 고치지 마세요.
   원본은 assets/manifest.json 이고, tools/sync-manifest.mjs 가 옮겨 적습니다.

   file:// 에서는 fetch 가 막혀 매니페스트를 읽을 수 없습니다. 그래서 zip 을 풀어
   index.html 을 더블클릭했을 때도 그림이 붙도록 같은 내용을 여기에 한 벌 둡니다
   (그 덕에 런처가 파이썬 서버를 띄울 이유가 없어졌습니다). */
window.SPRITE_MANIFEST = `;

const out = HEAD + JSON.stringify(JSON.parse(readFileSync(SRC, 'utf8')), null, 2) + ';\n';

if (process.argv.includes('--check')) {
  const cur = existsSync(DST) ? readFileSync(DST, 'utf8') : '';
  if (cur !== out) {
    console.error('sprites-manifest.js 가 manifest.json 과 어긋납니다 — node tools/sync-manifest.mjs');
    process.exit(1);
  }
  console.log('sprites-manifest.js 최신');
} else {
  writeFileSync(DST, out);
  console.log(`sprites-manifest.js 갱신 (${out.length}바이트)`);
}
