// 엑셀(.xlsx) / CSV 를 행 배열(string|number|Date 의 2차원 배열)로 읽는 공통 모듈
import fs from 'node:fs';
// node 진입점의 스트리밍 압축 해제는 데이터 디스크립터를 쓰는 xlsx(스마트스토어 리뷰 엑셀 등)를 읽지 못해
// 파일 전체를 읽는 universal 진입점을 사용한다.
import { readSheet } from 'read-excel-file/universal';

/** RFC 4180 CSV 파서 — 따옴표 안의 쉼표·줄바꿈·"" 이스케이프를 처리한다. */
export function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // BOM
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((v) => v !== '')) rows.push(row);
  return rows;
}

/** UTF-8 을 먼저 시도하고, 실패하면 한국어 엑셀 기본 인코딩(CP949/EUC-KR)으로 읽는다. */
function decode(buf) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder('euc-kr').decode(buf);
  }
}

export async function readRows(file, sheet) {
  if (/\.csv$/i.test(file)) return parseCsv(decode(fs.readFileSync(file)));
  const buf = fs.readFileSync(file);
  return readSheet(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), sheet);
}
