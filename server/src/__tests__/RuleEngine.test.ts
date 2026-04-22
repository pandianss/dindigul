import { describe, it, expect, vi } from 'vitest';
import { RuleEvaluator } from '../rules/RuleEvaluator';

describe('RuleEvaluator', () => {
    it('should detect critical swing correctly based on config thresholds', () => {
        // Based on config.json: criticalSwing = 0.1
        const prev = 100;
        const growth = 15; // 15% swing
        
        expect(RuleEvaluator.isCriticalSwing(prev, growth)).toBe(true);
    });

    it('should return false for swing below threshold', () => {
        const prev = 100;
        const growth = 5; // 5% swing
        
        expect(RuleEvaluator.isCriticalSwing(prev, growth)).toBe(false);
    });

    it('should handle zero prev value gracefully', () => {
        expect(RuleEvaluator.isCriticalSwing(0, 10)).toBe(false);
    });
});
