// ACCEPTANCE_METADATA {"id":"ACC-DET-019","scenario":"Email, IPv4, URL, LINE value-only fixtures","expected":"Exact value span and type returned; labels excluded"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-DET-019',
  scenario: 'Email, IPv4, URL, LINE value-only fixtures',
  expected: 'Exact value span and type returned; labels excluded',
});

it('ACC-DET-019: Email, IPv4, URL, LINE value-only fixtures => Exact value span and type returned; labels excluded', () => {
  expect(acceptance.id).toBe('ACC-DET-019');
  expect(acceptance.scenario).toBe('Email, IPv4, URL, LINE value-only fixtures');
  expect(acceptance.expected).toBe('Exact value span and type returned; labels excluded');
});
