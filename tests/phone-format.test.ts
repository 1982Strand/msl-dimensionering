import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPhone } from '../src/report/phone-format.ts';

for (const [input, expected] of [
  ['42400918', '42 40 09 18'],
  ['42 40 09 18', '42 40 09 18'],
  [' 4240 0918 ', '42 40 09 18'],
  ['+4542400918', '+45 42 40 09 18'],
  ['+45 42 40 09 18', '+45 42 40 09 18'],
  [' +45 4240 0918 ', '+45 42 40 09 18'],
  ['12345', '12 34 5'],
  ['42-40-09-18', '42-40-09-18'],
  [' 42 40 (09) 18 ', ' 42 40 (09) 18 '],
  ['4240+0918', '4240+0918'],
  ['42 40 ext. 9', '42 40 ext. 9'],
  ['', ''],
  ['   ', ''],
])
  test(`B-049 telefon: ${JSON.stringify(input)}`, () => assert.equal(formatPhone(input), expected));
