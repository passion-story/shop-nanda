/** 검색·공유 설명문(meta description, og:description) 권장 길이 (네이버 서치어드바이저 기준) */
export const MAX_DESCRIPTION = 80;

/** 글자 수 기준으로 max 이내가 되도록 자르고, 잘렸으면 말줄임표(…)를 붙인다. */
export function clamp(text: string, max: number): string {
  const chars = Array.from(text.replace(/\s+/g, ' ').trim());
  if (chars.length <= max) return chars.join('');
  return `${chars.slice(0, max - 1).join('').trimEnd()}…`;
}
