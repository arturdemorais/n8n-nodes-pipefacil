const assert = require('node:assert/strict');
const { test } = require('node:test');
const { projectOutput } = require('../dist/nodes/Pipefacil/resources/output');
const { Pipefacil } = require('../dist/nodes/Pipefacil/Pipefacil.node');
const { Expression, NodeHelpers } = require('n8n-workflow');

test('raw output preserves response envelopes, binary data and item linking', () => {
 const items = [{ json: { data: { id: 'lead', seq: 12, customFields: { score: 0 } } }, pairedItem: { item: 2 }, binary: {} }];
 assert.equal(projectOutput(items, 'deal', 'create', 'raw'), items);
});

test('simplified lead creation unwraps data and retains false, zero and item metadata', () => {
 const binary = {};
 const pairedItem = { item: 2 };
 const result = projectOutput([{ json: { data: { id: 'lead', seq: 12, name: 'Lead', value: 0, customFields: { large: 'data' } } }, binary, pairedItem }], 'deal', 'create', 'simplified');
 assert.deepEqual(result, [{ json: { id: 'lead', seq: 12, name: 'Lead', value: 0 }, binary, pairedItem }]);
 assert.deepEqual(projectOutput([{ json: { id: 'contact', blocked: false, other: true } }], 'contact', 'get', 'simplified'), [{ json: { id: 'contact', blocked: false } }]);
});

test('selected output preserves identifiers without leaking unselected fields', () => {
 const items = [{ json: { id: 'contact', phone: '5585999999999', email: 'private@example.com' } }];
 assert.deepEqual(projectOutput(items, 'contact', 'get', 'selected', ['phone', 'missing']), [{ json: { id: 'contact', phone: '5585999999999' } }]);
 assert.deepEqual(projectOutput(items, 'contact', 'get', 'selected'), [{ json: { id: 'contact' } }]);
 assert.deepEqual(projectOutput([], 'contact', 'getAll', 'simplified'), []);
});

test('conversation output retains message bodies and reference output retains user identifiers', () => {
 for (const operation of ['sendMessage', 'listMessages']) {
  assert.deepEqual(projectOutput([{ json: { id: 'msg', body: 'Hello', status: 'sent', internal: 'omit' } }], 'conversation', operation, 'simplified'), [{ json: { id: 'msg', body: 'Hello', status: 'sent' } }]);
 }
 assert.deepEqual(projectOutput([{ json: { id: 'membership', userId: 'user', name: 'Alex', role: 'admin' } }], 'reference', 'listUsers', 'selected', ['name']), [{ json: { id: 'membership', userId: 'user', name: 'Alex' } }]);
});

test('normal nodes and AI tools expose the appropriate output control', () => {
 const description = new Pipefacil().description;
 const parameters = { resource: 'contact', operation: 'getAll', output: 'selected' };
 const node = { typeVersion: 1.1 };
 for (const tool of [false, true]) {
  const desc = { ...description, name: tool ? 'pipefacilTool' : 'pipefacil' };
  const visible = description.properties.filter((p) => ['simplify', 'output', 'outputFields'].includes(p.name) && NodeHelpers.displayParameter(parameters, p, node, desc));
  assert.deepEqual(visible.map((p) => p.name), tool ? ['output', 'outputFields'] : ['simplify']);
  for (const operation of ['delete', 'removeAvatar', 'uploadAttachment', 'removeTag']) {
   assert.equal(description.properties.filter((p) => ['simplify', 'output'].includes(p.name) && NodeHelpers.displayParameter({ ...parameters, operation }, p, node, desc)).length, 0);
  }
 }
});

test('reference users are individual members and tag deletion returns confirmation in both versions', () => {
 const expression = new Expression();
 const description = new Pipefacil().description;
 for (const version of [1, 1.1]) {
  const operationFor = (resource) => description.properties.find((p) => p.name === 'operation' && p.displayOptions.show.resource.includes(resource) && p.displayOptions.show['@version'].includes(version));
  const users = operationFor('reference').options.find((o) => o.value === 'listUsers');
  assert.equal(users.routing.output.postReceive[0].properties.property, 'data.members');
  const removeTag = operationFor('deal').options.find((o) => o.value === 'removeTag');
  const action = removeTag.routing.output.postReceive[0];
  assert.equal(action.type, 'set');
  assert.deepEqual(expression.resolveSimpleParameterValue(action.properties.value, {}, false), { deleted: true });
 }
});
