const assert = require('node:assert/strict');
const { test } = require('node:test');
const { prepareDealFilters, getDealFields, searchDeals, prepareCreateDealRequest } = require('../dist/nodes/Pipefacil/resources/deals');
const { prepareFileUpload, notesDescription } = require('../dist/nodes/Pipefacil/resources/notes');
const { tasksDescription } = require('../dist/nodes/Pipefacil/resources/tasks');

const context = (parameters) => ({ getNodeParameter: (name, fallback) => parameters[name] ?? fallback });

test('custom filters replace the placeholder slug and preserve repeated values and existing query', async () => {
 const result = await prepareDealFilters.call(context({ filters: {
  customFieldFilters: { filters: [{ slug: 'budget', value: 'high' }, { slug: 'budget', value: '__empty__' }, { slug: 'score', value: '0' }] },
  customFieldRanges: { ranges: [{ slug: 'visit', from: '2026-10-01', to: '2026-10-31' }, { slug: 'renewal', to: '2026-12-01' }] },
 } }), { url: '/deals', qs: { search: '5585999999999', status: 'open,won', limit: 50, cursor: 'page2' } });
 assert.deepEqual(result.qs, {
  search: '5585999999999', status: 'open,won', limit: 50, cursor: 'page2',
  'customFields[budget]': ['high', '__empty__'], 'customFields[score]': '0',
  'customFieldRanges[visit][from]': '2026-10-01', 'customFieldRanges[visit][to]': '2026-10-31',
  'customFieldRanges[renewal][to]': '2026-12-01',
 });
 assert.equal(result.arrayFormat, 'repeat');
});

test('invalid slugs fail instead of silently ignoring the filter', async () => {
 await assert.rejects(prepareDealFilters.call(context({ filters: { customFieldFilters: { filters: [{ slug: ' ', value: 'high' }] } } }), { url: '/deals' }), /require a field slug/);
});

test('creation accepts a lead without a phone and preserves false and zero values', async () => {
 assert.equal((await getDealFields()).fields.find((field) => field.id === 'phone').required, false);
 const result = await prepareCreateDealRequest.call(context({ leadFields: { value: { name: 'Lead', value: 0, useAssignmentStrategy: false } }, customFields: { value: { score: 0 } }, tracking: {} }), { url: '/deals', body: { stageId: 'stage1' } });
 assert.deepEqual(result.body, { stageId: 'stage1', name: 'Lead', value: 0, useAssignmentStrategy: false, customFields: { score: 0 } });
});

test('lead selector forwards phone search and cursor and returns next page token', async () => {
 let request;
 const result = await searchDeals.call({ helpers: { httpRequestWithAuthentication: async (_credential, options) => {
  request = options;
  return { data: { items: [{ seq: 12, contact: { phone: '5585999999999' } }], hasMore: true, nextCursor: 'page3' } };
 } } }, '5585999999999', 'page2');
 assert.deepEqual(request.qs, { limit: 50, search: '5585999999999', cursor: 'page2' });
 assert.deepEqual(result, { paginationToken: 'page3', results: [{ name: '5585999999999 (#12)', value: '12' }] });
});

test('file upload produces valid multipart bytes, a matching boundary and safe filename', async () => {
 const buffer = Buffer.from([0, 1, 255, ...Buffer.from('n8nPipefacilBoundary')]);
 const result = await prepareFileUpload.call({ ...context({ binaryProperty: 'file' }), helpers: {
  assertBinaryData: (name) => { assert.equal(name, 'file'); return { fileName: 'test"\r\n.pdf', mimeType: 'application/pdf' }; },
  getBinaryDataBuffer: async (name) => { assert.equal(name, 'file'); return buffer; },
 } }, { url: '/upload', headers: { Accept: 'application/json', 'Content-Type': 'application/json' } });
 const boundary = result.headers['Content-Type'].split('boundary=')[1];
 assert.equal(boundary, 'n8nPipefacilBoundaryX');
 assert.ok(result.body.includes(buffer));
 assert.ok(result.body.toString().includes('name="file"; filename="test___.pdf"'));
 assert.ok(result.body.toString().endsWith(`\r\n--${boundary}--\r\n`));
 assert.equal(result.headers.Accept, 'application/json');
});

test('task and note operations use the documented lead endpoints and required task fields', () => {
 const taskOperation = tasksDescription.find((property) => property.name === 'operation').options[0];
 assert.equal(taskOperation.routing.request.url, '=/deals/{{$parameter.deal.value}}/tasks');
 for (const name of ['title', 'dueAt']) assert.equal(tasksDescription.find((property) => property.name === name).required, true);
 const noteOperations = notesDescription.find((property) => property.name === 'operation').options;
 assert.equal(noteOperations[0].routing.request.url, '=/deals/{{$parameter.deal.value}}/notes');
 assert.equal(noteOperations[1].routing.request.url, '=/deals/{{$parameter.deal.value}}/notes/attachments');
});
