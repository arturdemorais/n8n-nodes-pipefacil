const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Pipefacil } = require('../dist/nodes/Pipefacil/Pipefacil.node');
const { contactPath, contactsDescription } = require('../dist/nodes/Pipefacil/resources/contacts');
const { optionValue, prepareFieldChoices, prepareCustomFieldCreate, prepareCustomFieldUpdate, getVisibilityValueOptions, getFieldChoiceOptions } = require('../dist/nodes/Pipefacil/resources/customFields');

const context = (parameters, request = () => assert.fail('No request expected')) => ({
 getNodeParameter: (name, fallback) => parameters[name] ?? fallback,
 helpers: { httpRequestWithAuthentication: async (_credential, options) => request(options) },
});
const field = (options, fieldType = 'select') => ({ data: { id: 'f1', name: 'Segmento', fieldType, options } });

test('contact operations resolve the selected contact, a phone from another node, or reject ambiguity', async () => {
 assert.equal((await contactPath('/avatar').call(context({ contact: { mode: 'list', value: 'c 1' } }), {})).url, '/contacts/c%201/avatar');
 const contacts = { data: { items: [{ id: 'a', phone: '5585999990000' }, { id: 'b', phone: '5511988887777' }] } };
 let query;
 const lookup = context({ contact: { mode: 'phone', value: '+55 (85) 99999-0000' } }, (options) => { query = options.qs; return contacts; });
 assert.equal((await contactPath().call(lookup, {})).url, '/contacts/a');
 assert.deepEqual(query, { search: '5585999990000', limit: 50 });
 assert.equal((await contactPath().call(context({ contact: { mode: 'phone', value: '11988887777' } }, () => contacts), {})).url, '/contacts/b');
 await assert.rejects(contactPath().call(context({ contact: { mode: 'phone', value: '5599999999' } }, () => contacts), {}), /No contact found/);
 const twins = { data: { items: [{ id: 'a', phone: '5585999990000' }, { id: 'b', phone: '5585999990000' }] } };
 await assert.rejects(contactPath().call(context({ contact: { mode: 'phone', value: '5585999990000' } }, () => twins), {}), /More than one contact/);
});

test('contact selector is shown for every operation that targets one contact and phone is required to create', () => {
 const locator = contactsDescription.find((p) => p.name === 'contact');
 assert.deepEqual(locator.displayOptions.show.operation, ['delete', 'get', 'removeAvatar', 'update', 'uploadAvatar']);
 assert.equal(contactsDescription.find((p) => p.name === 'phone').required, true);
});

test('option keys follow the app format and never collide', () => {
 assert.equal(optionValue('Indústria & Comércio', []), 'industria_comercio');
 assert.equal(optionValue('Varejo', ['varejo', 'varejo_1']), 'varejo_2');
 assert.equal(optionValue('!!!', []), 'opcao');
});

test('adding options keeps existing ones, reactivates repeated labels and saves the full list', async () => {
 const existing = [{ value: 'varejo', label: 'Varejo', color: '#111111' }, { value: 'saude', label: 'Saúde', inactive: true }];
 const result = await prepareFieldChoices.call(context({ operation: 'addOptions', customField: 'f1', fieldChoices: { choices: [{ label: ' saúde ' }, { label: 'Varejo Online' }, { label: 'Educação', color: '#000000' }] } }, (options) => {
  assert.equal(options.method, 'GET');
  assert.ok(options.url.endsWith('/custom-fields/f1'));
  return field(existing);
 }), { url: '/custom-fields' });
 assert.equal(result.url, '/custom-fields/f1');
 assert.deepEqual(result.body.options, [
  { value: 'varejo', label: 'Varejo', color: '#111111' },
  { value: 'saude', label: 'Saúde' },
  { value: 'varejo_online', label: 'Varejo Online', color: '#ec4899' },
  { value: 'educacao', label: 'Educação', color: '#000000' },
 ]);
 assert.equal(existing[1].inactive, true);
});

test('updating and removing options change only the chosen option and keep its key', async () => {
 const existing = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }];
 const update = await prepareFieldChoices.call(context({ operation: 'updateOption', customField: 'f1', fieldChoice: 'b', choiceUpdateFields: { label: 'Bê', active: false } }, () => field(existing)), {});
 assert.deepEqual(update.body.options, [{ value: 'a', label: 'A' }, { value: 'b', label: 'Bê', inactive: true }]);
 const deactivate = await prepareFieldChoices.call(context({ operation: 'removeOption', customField: 'f1', fieldChoice: 'a' }, () => field(existing)), {});
 assert.deepEqual(deactivate.body.options, [{ value: 'a', label: 'A', inactive: true }, { value: 'b', label: 'B' }]);
 const remove = await prepareFieldChoices.call(context({ operation: 'removeOption', customField: 'f1', fieldChoice: 'a', keepForExistingLeads: false }, () => field(existing)), {});
 assert.deepEqual(remove.body.options, [{ value: 'b', label: 'B' }]);
 await assert.rejects(prepareFieldChoices.call(context({ operation: 'removeOption', customField: 'f1', fieldChoice: 'a', keepForExistingLeads: false }, () => field([{ value: 'a', label: 'A' }])), {}), /at least one active option/);
 await assert.rejects(prepareFieldChoices.call(context({ operation: 'addOptions', customField: 'f1' }, () => field(null, 'text')), {}), /not a single or multiple choice field/);
});

test('creating a field builds options, type settings and the visibility condition without JSON', async () => {
 const result = await prepareCustomFieldCreate.call(context({ fieldName: 'Segmento', fieldType: 'select', customFieldEntity: 'deal', customFieldOptions: { isRequired: false },
  fieldChoices: { choices: [{ label: 'Varejo' }, { label: 'Varejo' }] }, visibility: { rule: { parentFieldId: 'p1', values: ['true'] } } }), { url: '/custom-fields' });
 assert.deepEqual(result.body, { name: 'Segmento', fieldType: 'select', entityType: 'deal', isRequired: false,
  options: [{ value: 'varejo', label: 'Varejo', color: '#6366f1' }], visibilityRule: { parentFieldId: 'p1', values: ['true'] } });
 const meeting = await prepareCustomFieldCreate.call(context({ fieldName: 'Reunião', fieldType: 'event', customFieldEntity: 'deal' }), {});
 assert.deepEqual(meeting.body.config, { event: { title: 'Reunião', durationMinutes: 30, conferenceMode: 'none' } });
 await assert.rejects(prepareCustomFieldCreate.call(context({ fieldName: 'X', fieldType: 'multi_select', customFieldEntity: 'deal' }), {}), /at least one option/);
});

test('field update sends only chosen settings and refuses conflicting visibility changes', async () => {
 assert.deepEqual((await prepareCustomFieldUpdate.call(context({ customFieldUpdateFields: { name: 'Novo', clearVisibilityRule: false } }), {})).body, { name: 'Novo' });
 await assert.rejects(prepareCustomFieldUpdate.call(context({}), {}), /at least one field/);
 await assert.rejects(prepareCustomFieldUpdate.call(context({ customFieldUpdateFields: { clearVisibilityRule: true }, visibility: { rule: { parentFieldId: 'p', values: ['a'] } } }), {}), /not both/);
});

test('option selectors list the current field options and yes/no values', async () => {
 const fields = { data: [{ id: 'f1', fieldType: 'select', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B', inactive: true }] }, { id: 'f2', fieldType: 'boolean' }] };
 const load = (values) => ({ getCurrentNodeParameter: (name) => values[name], helpers: { httpRequestWithAuthentication: async () => fields } });
 assert.deepEqual(await getFieldChoiceOptions.call(load({ customField: 'f1' })), [{ name: 'A', value: 'a' }, { name: 'B (inactive)', value: 'b' }]);
 assert.deepEqual(await getVisibilityValueOptions.call(load({ '&parentFieldId': 'f1' })), [{ name: 'A', value: 'a' }]);
 assert.deepEqual(await getVisibilityValueOptions.call(load({ '&parentFieldId': 'f2' })), [{ name: 'No', value: 'false' }, { name: 'Yes', value: 'true' }]);
});

test('contact and custom field resources are available in both node versions with their methods registered', () => {
 const node = new Pipefacil();
 const resources = node.description.properties.find((p) => p.name === 'resource').options.map((o) => o.value);
 for (const resource of ['contact', 'customField']) {
  assert.ok(resources.includes(resource));
  const operation = node.description.properties.find((p) => p.name === 'operation' && p.displayOptions.show.resource[0] === resource);
  assert.equal(operation.displayOptions.show['@version'], undefined);
 }
 for (const method of ['getCustomFieldIdOptions', 'getChoiceFieldOptions', 'getFieldChoiceOptions', 'getVisibilityParentOptions', 'getVisibilityValueOptions']) assert.equal(typeof node.methods.loadOptions[method], 'function');
 assert.equal(typeof node.methods.listSearch.searchContactRecords, 'function');
});
