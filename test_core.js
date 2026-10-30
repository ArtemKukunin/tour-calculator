// node test_core.js — checks the pricing maths on the example trip
const assert = require('assert');
const { calc, buildPublic } = require('./src/core.js');
const trip = require('./data/example-trip.json');
const c = calc(trip);
assert.strictEqual(c.pax, 30);
assert.strictEqual(c.days, 6);
assert.ok(Math.abs(c.cost - (c.transport + c.hotels + c.meals + c.excursions + c.staff)) < 1e-6);
assert.ok(Math.abs(c.total - c.cost * 1.05 * 1.15) < 1e-6, 'inflation then margin');
assert.strictEqual(c.perPerson % 10, 0, 'rounded to 10');
assert.ok(c.perPerson * 30 >= c.total, 'rounding never loses money');
// two coaches when the group exceeds coach capacity
assert.ok(calc(trip, 60).transport > c.transport);
// client data must never contain costs
const pub = JSON.stringify(buildPublic(trip));
for (const k of ['margin', 'inflation', 'fuelPrice', 'rate', 'amount', 'cost']) assert.ok(!pub.includes('"' + k + '"'), k + ' leaked');
console.log('ok', c.perPerson);
