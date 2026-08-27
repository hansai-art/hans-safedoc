// ACCEPTANCE_METADATA {"id":"ACC-DET-006","scenario":"護照：無 newline 訂單號：123456789","expected":"Order number receives no passport context from prior line"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-DET-006',
  scenario: '護照：無 newline 訂單號：123456789',
  expected: 'Order number receives no passport context from prior line',
});

it('ACC-DET-006: 護照：無 newline 訂單號：123456789 => Order number receives no passport context from prior line', () => {
  expect(acceptance.id).toBe('ACC-DET-006');
  expect(acceptance.scenario).toBe('護照：無 newline 訂單號：123456789');
  expect(acceptance.expected).toBe('Order number receives no passport context from prior line');
});
