/* ===== engine/core/mixin.ts — 큰 객체를 파일 여럿으로 나눠 붙이기 ===== */

/** 조각 객체의 속성을 설명자째(게터·세터 포함) 대상에 붙인다. 이름이 겹치면 멈춘다(뒤엣것이 조용히 덮지 않게).
    classLike 면 클래스 메서드처럼 열거되지 않게 붙인다(프로토타입에 붙일 때). */
export function mixin<T extends object>(target: T, part: object, classLike = false): T {
  const d = Object.getOwnPropertyDescriptors(part) as Record<string, PropertyDescriptor>;
  for (const k of Object.keys(d)) {
    if (Object.prototype.hasOwnProperty.call(target, k)) throw new Error('mixin: 이미 있는 이름 ' + k);
    if (classLike) d[k].enumerable = false;
  }
  Object.defineProperties(target, d);
  return target;
}
