const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isPriorityProspect, prospectScore } = require('../lib/ranking.ts');
const priority = (budget_range, confidence = 0.7, status = 'new') => isPriorityProspect({ budget_range, status }, { confidence });

test('priority requires a declared MYR amount of at least two million', () => {
 for (const budget of ['2 MYR', '500000 MYR', 'MYR 500,000', 'RM500000', '1.5M MYR', '1999k MYR']) assert.equal(priority(budget), false, budget);
 for (const budget of ['2M MYR', '2.5 million MYR', 'RM 2,000,000', 'MYR2000000', '2000k MYR', '2M+', '2.5M']) assert.equal(priority(budget), true, budget);
});

test('budget ranges use the conservative lower bound and support shared suffixes', () => {
 for (const budget of ['1.5–3M MYR', 'RM 1,500,000 to 3,000,000', '3M–1.5M MYR', '500000–2M MYR', '2M–500000 MYR', '500–2M MYR', '2M–500 MYR']) assert.equal(priority(budget), false, budget);
 for (const budget of ['2–3M MYR', '3–2M MYR', 'RM2M - 3M', '2,000,000 to 3,000,000 MYR', '2M–3', '3M–2']) assert.equal(priority(budget), true, budget);
});

test('unknown, malformed and foreign-currency budgets are not prioritized', () => {
 for (const budget of ['', 'Unknown', 'USD 2M', '2M USD', '2MYR million', '2,00,000 MYR', 'budget varies from 1M to 3M', '2 months']) assert.equal(priority(budget), false, budget);
});

test('priority still requires sufficient evidence and an active prospect', () => {
 assert.equal(priority('2.5M MYR', 0.69), false);
 assert.equal(priority('2.5M MYR', 0.7), true);
 assert.equal(priority('2.5M MYR', 0.9, 'closed-won'), false);
 assert.equal(priority('2.5M MYR', 0.9, 'closed-lost'), false);
 assert.equal(isPriorityProspect({ budget_range: '2.5M MYR', status: 'new' }), false);
});

test('pipeline score retains status priority and latest-profile confidence', () => {
 const profiles = [{ prospect_id: 'lead', confidence: 0.7 }, { prospect_id: 'lead', confidence: 0.9 }];
 assert.equal(prospectScore({ id: 'lead', status: 'engaged' }, profiles), 1.4);
 assert.equal(prospectScore({ id: 'other', status: 'new' }, profiles), 0.5);
 assert.equal(prospectScore({ id: 'lead', status: 'closed-won' }, profiles), 0);
});
