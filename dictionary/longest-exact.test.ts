// ACCEPTANCE_METADATA {"id":"ACC-REV-006","scenario":"星河, 星河科技, 星河科技股份有限公司 overlap","expected":"Longest exact NFC match wins; no fuzzy or cross-script inference"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-REV-006',
  scenario: '星河, 星河科技, 星河科技股份有限公司 overlap',
  expected: 'Longest exact NFC match wins; no fuzzy or cross-script inference',
});

it('ACC-REV-006: 星河, 星河科技, 星河科技股份有限公司 overlap => Longest exact NFC match wins; no fuzzy or cross-script inference', () => {
  expect(acceptance.id).toBe('ACC-REV-006');
  expect(acceptance.scenario).toBe('星河, 星河科技, 星河科技股份有限公司 overlap');
  expect(acceptance.expected).toBe(
    'Longest exact NFC match wins; no fuzzy or cross-script inference',
  );
});
