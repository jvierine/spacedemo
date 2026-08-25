import test from 'node:test';import assert from 'node:assert/strict';import { stageDeltaV, stagingBudget } from '../js/staging.js';
test('rocket equation uses upper mass',()=>{const without=stageDeltaV({wetKg:100,dryKg:10,ispS:300},0),withPayload=stageDeltaV({wetKg:100,dryKg:10,ispS:300},100);assert.ok(withPayload<without)});
test('final requirement is target minus lower stages',()=>{const b=stagingBudget([{wetKg:100,dryKg:10,ispS:300},{wetKg:20,dryKg:2,ispS:350}],5,9000);assert.ok(Math.abs(b.finalRequired-(9000-b.deltas[0]))<1e-9);assert.equal(b.finalAvailable,b.deltas[1])});
