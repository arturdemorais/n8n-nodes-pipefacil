const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Expression } = require('n8n-workflow');
const { Pipefacil } = require('../dist/nodes/Pipefacil/Pipefacil.node');
const { cursorPagination } = require('../dist/nodes/Pipefacil/resources/common');
const { searchDeals } = require('../dist/nodes/Pipefacil/resources/deals');

const expression = new Expression();
const evaluate = (value, data) => typeof value === 'string' && value.startsWith('=')
 ? expression.resolveSimpleParameterValue(value, data, false) : value;

// Apply the declarative actions in property order, as n8n's routing engine does.
function output(properties, body, parameters) {
 let items = [{ json: body }];
 for (const property of properties) {
  const data = { $parameter: parameters, $value: parameters[property.name] };
  for (const action of property.routing.output.postReceive) {
   if (action.enabled !== undefined && !evaluate(action.enabled, data)) continue;
   if (action.type === 'rootProperty') {
    items = items.flatMap((item) => {
     const value = action.properties.property.split('.').reduce((current, key) => current?.[key], item.json);
     return (Array.isArray(value) ? value : [value]).map((json) => ({ json }));
    });
   } else if (action.type === 'limit') {
    items = items.slice(0, evaluate(action.properties.maxResults, data));
   } else {
    throw new Error(`Unhandled action ${action.type}`);
   }
  }
 }
 return items;
}

for (const version of [1, 1.1]) {
 const properties = new Pipefacil().description.properties.filter((property) =>
  ['limit', 'returnAll'].includes(property.name) &&
  property.displayOptions.show.resource.includes('deal') &&
  property.displayOptions.show.operation.includes('getAll') &&
  property.displayOptions.show['@version'].includes(version));

 test(`v${version}: Limit 50 preserves all 11 matching deals without empty items`, () => {
  const deals = Array.from({ length: 11 }, (_, index) => ({ seq: index + 1, phone: '5585999999999' }));
  assert.deepEqual(output(properties, { data: deals, hasMore: false, nextCursor: null }, { returnAll: false, limit: 50 }), deals.map((json) => ({ json })));
  assert.deepEqual(output(properties, { data: deals }, { returnAll: false, limit: 5 }), deals.slice(0, 5).map((json) => ({ json })));
  assert.deepEqual(output(properties, { data: [] }, { returnAll: false, limit: 50 }), []);
 });

 test(`v${version}: Return All retains phone and custom filters on every page and stops`, () => {
  const returnAll = properties.find((property) => property.name === 'returnAll');
  const pagination = returnAll.routing.operations.pagination.properties;
  const parameters = { returnAll: true, limit: 50 };
  const query = { search: '5585999999999', status: 'open,won', 'customFields[budget]': ['high', '__empty__'], limit: 200 };
  const data = { $request: { qs: query }, $response: {}, $parameter: parameters, $value: true };
  assert.equal(evaluate(returnAll.routing.send.value, data), 200);
  assert.deepEqual(evaluate(pagination.request.qs, data), { ...query, cursor: undefined });

  const results = [];
  for (const [index, body] of [
   { data: [{ seq: 1 }], hasMore: true, nextCursor: 'page2' },
   { data: [{ seq: 2 }], hasMore: true, nextCursor: 'page3' },
   { data: [{ seq: 3 }], hasMore: false, nextCursor: null },
  ].entries()) {
   data.$response = { body };
   results.push(...output(properties, body, parameters));
   assert.equal(evaluate(pagination.continue, data), index < 2);
   if (index < 2) assert.deepEqual(evaluate(pagination.request.qs, data), { ...query, cursor: body.nextCursor });
  }
  assert.deepEqual(results, [1, 2, 3].map((seq) => ({ json: { seq } })));
  data.$response = { body: { data: [], hasMore: true, nextCursor: null } };
  assert.equal(evaluate(pagination.continue, data), false);
 });
}

test('nested conversation pagination retains its response format and query filters', () => {
 const properties = cursorPagination('conversation', 'listConversations');
 const pagination = properties[1].routing.operations.pagination.properties;
 const data = { $request: { qs: { search: 'Ana', limit: 200 } }, $response: {} };
 assert.deepEqual(evaluate(pagination.request.qs, data), { search: 'Ana', limit: 200, cursor: undefined });
 const body = { data: { items: [{ id: 'conversation' }], hasMore: true, nextCursor: 'next' } };
 assert.deepEqual(output(properties, body, { returnAll: false, limit: 50 }), [{ json: { id: 'conversation' } }]);
 data.$response = { body };
 assert.equal(evaluate(pagination.continue, data), true);
 assert.deepEqual(evaluate(pagination.request.qs, data), { search: 'Ana', limit: 200, cursor: 'next' });
});

test('deal selector supports the public API flat data and pagination metadata', async () => {
 const result = await searchDeals.call({ helpers: { httpRequestWithAuthentication: async () => ({
  data: [{ seq: 12, contact: { phone: '5585999999999' } }], hasMore: true, nextCursor: 'page2',
 }) } }, '5585999999999');
 assert.deepEqual(result, { paginationToken: 'page2', results: [{ name: '5585999999999 (#12)', value: '12' }] });
});
