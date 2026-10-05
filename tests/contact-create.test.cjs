const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Pipefacil } = require('../dist/nodes/Pipefacil/Pipefacil.node');
const { updateCreatedDealContact } = require('../dist/nodes/Pipefacil/resources/deals');

const response = { body: { data: { seq: 42, contactId: 'existing' } } };
const items = [{ json: response.body, pairedItem: { item: 0 } }];
const context = (fields, request) => ({ getNode: () => ({ name: 'PipeFácil', type: 'pipefacil', typeVersion: 1.1, position: [0, 0], parameters: {} }), getNodeParameter: () => fields, helpers: { httpRequestWithAuthentication: request } });

test('both node versions update the linked contact with the supplied email', async () => {
 for (const fields of [{ email: 'ana@example.com' }, { mappingMode: 'defineBelow', value: { email: 'ana@example.com' } }]) {
  let calls = 0;
  const result = await updateCreatedDealContact.call(context(fields, async (credential, options) => {
   calls++;
   assert.equal(credential, 'pipefacilApi');
   assert.equal(options.method, 'PATCH');
   assert.ok(options.url.endsWith('/deals/42'));
   assert.deepEqual(options.body, { contact: { email: 'ana@example.com' } });
  }), items, response);
  assert.equal(calls, 1);
  assert.equal(result, items);
 }
 const operations = new Pipefacil().description.properties.filter((p) => p.name === 'operation' && p.displayOptions.show.resource[0] === 'deal');
 assert.equal(operations.length, 2);
 for (const operation of operations) assert.ok(operation.options.find((o) => o.value === 'create').routing.output.postReceive.includes(updateCreatedDealContact));
});

test('creation preserves blank and omitted contact fields and never uses the deal name or notes', async () => {
 const result = await updateCreatedDealContact.call(context({ name: 'Proposal', notes: 'Deal note', email: ' ', contactName: '' }, () => assert.fail('No update expected')), items, response);
 assert.equal(result, items);
});

test('contact full name splits at the first space and explicit names take precedence', async () => {
 for (const [fields, expected] of [
  [{ contactName: ' Ana Silva Santos ' }, { firstName: 'Ana', lastName: 'Silva Santos' }],
  [{ contactName: 'Ana' }, { firstName: 'Ana' }],
  [{ contactName: 'Ignored Name', contactFirstName: 'Maria', contactLastName: '' }, { firstName: 'Maria' }],
 ]) {
  await updateCreatedDealContact.call(context(fields, async (_credential, options) => assert.deepEqual(options.body, { contact: expected })), items, response);
 }
});

test('partial failure identifies the created lead and warns against creating a duplicate', async () => {
 await assert.rejects(updateCreatedDealContact.call(context({ email: 'ana@example.com' }, async () => { throw new Error('Forbidden'); }), items, response), /Lead #42 was created.*Forbidden.*avoid duplicates/);
 await assert.rejects(updateCreatedDealContact.call(context({ email: 'ana@example.com' }, () => assert.fail('No request expected')), items, { body: { data: {} } }), /lead was created.*before retrying/);
});
