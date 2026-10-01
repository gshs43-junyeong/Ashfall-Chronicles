/* 개발용 정적 서버 — play/ 를 http://127.0.0.1:<포트> 로. (python3 -m http.server 와 같은 일) */
import { serve } from './lib.mjs';
const { url } = await serve();
console.log('게임: ' + url + '/index.html  (Ctrl+C 로 끝)');
