/* ===== engine/assets/image.ts — 그림 한 장 불러오기 · 판 번호 · 시트 여백 재기 ===== */

/* ★ 번들 <script src="js/ashfall.js?v=NNN"> 의 ?v= 를 물려받는다 — 읽히는 순간에만 document.currentScript 가 있다.
   배포는 그림을 1년 immutable 로 캐시해서, ?v= 없는 주소는 시트를 다시 구워도 옛 그림이 나온다. */
export const ASSET_VER = (document.currentScript && (document.currentScript as HTMLScriptElement).src.split('?')[1]) || '';

/** 그림 하나를 받기 시작한다 — Image 는 곧바로 onImage 로 넘기고(자리부터 잡는다), 끝나면(실패해도) 풀리는 약속을 돌려준다. */
export function imageJob(src: string, onImage: (im: HTMLImageElement) => void): Promise<void> {
  return new Promise<void>(res => {
    const im = new Image(); im.onload = im.onerror = () => res();
    im.src = src; onImage(im);
  });
}

/** 시트 프레임 0(frameW×frameH 게임 픽셀, scale 배로 구움)의 알파를 훑어 발 여백·가로 치우침(게임 픽셀)을 잰다.
    ★ file:// 에서는 getImageData 가 SecurityError 를 던진다 — 부르는 쪽이 받아 매니페스트 값으로 떨어질 것. */
export function measurePad(im: CanvasImageSource, frameW: number, frameH: number, scale: number): { foot: number; side: number } {
  const S = scale, fw = frameW * S, fh = frameH * S;
  const cv = document.createElement('canvas'); cv.width = fw; cv.height = fh;
  const ctx = cv.getContext('2d')!;
  ctx.drawImage(im, 0, 0, fw, fh, 0, 0, fw, fh);
  const data = ctx.getImageData(0, 0, fw, fh).data;
  let bottom = -1, left = fw, right = -1;
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      if (data[(y * fw + x) * 4 + 3] <= 10) continue;
      if (y > bottom) bottom = y;
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }
  if (bottom < 0) return { foot: 0, side: 0 };
  return {
    foot: frameH - (bottom / S) - 1,
    side: ((left + right + 1) / 2 - fw / 2) / S
  };
}
