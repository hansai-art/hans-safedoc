import { expect, it } from 'vitest';
import { detectAll } from '@privacy-bridge/core';
it('ACC-DET-015 captures complete Taiwan doorplates and floors', () => {
  const result = detectAll('臺北市信義區松仁路2之2號5樓');
  expect(result.ok && result.value[0]?.surfaceText).toBe('臺北市信義區松仁路2之2號5樓');
});
