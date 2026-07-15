import { describe, expect, it } from 'vitest';
import { ApproximateTokenEstimator } from './approximate_token_estimator.js';

describe('ApproximateTokenEstimator', () => {
  const estimator = new ApproximateTokenEstimator();

  it('returns zero for empty text', () => {
    expect(estimator.estimate('').tokens).toBe(0);
    expect(estimator.estimate('   ').method).toBe('approximate');
  });

  it('estimates short text by words or characters', () => {
    expect(estimator.estimate('hello world').tokens).toBe(3);
  });

  it('scales with larger text', () => {
    const small = estimator.estimate('one two three').tokens;
    const large = estimator.estimate('one two three '.repeat(100)).tokens;

    expect(large).toBeGreaterThan(small);
  });
});
