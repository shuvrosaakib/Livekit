import { describe, expect, it } from 'vitest';
describe('SHUVRO tutor config', () => {
    it('accepts a valid tutoring profile', () => {
        const config = {
            userName: 'Shuvro',
            mode: 'IELTS Speaking',
            level: 'B2',
            goal: 'Band 7+ speaking',
            targetBand: 7,
        };
        expect(config.mode).toBe('IELTS Speaking');
        expect(config.targetBand).toBe(7);
    });
});
