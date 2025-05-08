const { describe, test, expect } = require('@jest/globals');
const kk_date = require('../index');

describe('weekStartDay tests for startOf and endOf', () => {
    test('should return Sunday as startOf and Saturday as endOf when weekStartDay is 0', () => {
        const date = new kk_date();
        date.config({ weekStartDay: 0 });
        expect(date.startOf('week').format('dddd')).toBe('Sunday');
        expect(date.endOf('week').format('dddd')).toBe('Saturday');
    });

    test('should return Monday as startOf and Sunday as endOf when weekStartDay is 1', () => {
        const date = new kk_date();
        date.config({ weekStartDay: 1 });
        expect(date.startOf('week').format('dddd')).toBe('Monday');
        expect(date.endOf('week').format('dddd')).toBe('Sunday');
    });

    test('should return Tuesday as startOf and Monday as endOf when weekStartDay is 2', () => {
        const date = new kk_date();
        date.config({ weekStartDay: 2 });
        expect(date.startOf('week').format('dddd')).toBe('Tuesday');
        expect(date.endOf('week').format('dddd')).toBe('Monday');
    });

    test('should return Wednesday as startOf and Tuesday as endOf when weekStartDay is 3', () => {
        const date = new kk_date();
        date.config({ weekStartDay: 3 });
        expect(date.startOf('week').format('dddd')).toBe('Wednesday');
        expect(date.endOf('week').format('dddd')).toBe('Tuesday');
    });

    test('should return Thursday as startOf and Wednesday as endOf when weekStartDay is 4', () => {
        const date = new kk_date();
        date.config({ weekStartDay: 4 });
        expect(date.startOf('week').format('dddd')).toBe('Thursday');
        expect(date.endOf('week').format('dddd')).toBe('Wednesday');
    });

    test('should return Friday as startOf and Thursday as endOf when weekStartDay is 5', () => {
        const date = new kk_date();
        date.config({ weekStartDay: 5 });
        expect(date.startOf('week').format('dddd')).toBe('Friday');
        expect(date.endOf('week').format('dddd')).toBe('Thursday');
    });

    test('should return Saturday as startOf and Friday as endOf when weekStartDay is 6', () => {
        const date = new kk_date();
        date.config({ weekStartDay: 6 });
        expect(date.startOf('week').format('dddd')).toBe('Saturday');
        expect(date.endOf('week').format('dddd')).toBe('Friday');
    });

    test('should return Sunday as startOf and Saturday as endOf when weekStartDay is a string', () => {
        const date = new kk_date();
        date.config({ weekStartDay: 'test' }); 
        expect(date.startOf('week').format('dddd')).toBe('Sunday');
        expect(date.endOf('week').format('dddd')).toBe('Saturday');
    });

    test('should return Sunday as startOf and Saturday as endOf when weekStartDay is negative', () => {
        const date = new kk_date();
        date.config({ weekStartDay: -1 }); 
        expect(date.startOf('week').format('dddd')).toBe('Sunday');
        expect(date.endOf('week').format('dddd')).toBe('Saturday');
    });

    test('should default to Sunday as startOf and Saturday as endOf when weekStartDay is not provided', () => {
        const date = new kk_date();
        date.config({});
        expect(date.startOf('week').format('dddd')).toBe('Sunday');
        expect(date.endOf('week').format('dddd')).toBe('Saturday');
    });
});