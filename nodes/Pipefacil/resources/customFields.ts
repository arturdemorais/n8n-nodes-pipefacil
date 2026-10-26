import type { IDataObject, IExecuteSingleFunctions, IHttpRequestOptions, ILoadOptionsFunctions, INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { api, apiBaseUrl, record, rows } from './choices';
import { dataOutput, displayOptions, optionalFields } from './common';

const choiceTypes = ['select', 'multi_select'];
const parentTypes = [...choiceTypes, 'boolean'];
// Same palette and key format as the PipeFácil app, so options look alike wherever they are created.
const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#ef4444'];
const entities: INodePropertyOptions[] = [{ name: 'Contact', value: 'contact' }, { name: 'Lead', value: 'deal' }];
const entityName = (value: unknown) => entities.find((e) => e.value === (value ?? 'deal'))?.name ?? String(value);

export function optionValue(label: string, taken: string[]): string {
	const base = label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'opcao';
	let value = base;
	for (let suffix = 1; taken.includes(value); suffix++) value = `${base}_${suffix}`;
	return value;
}

const fieldEntity = (field: IDataObject) => field.entityType ?? field.entity ?? 'deal';
async function allFields(this: ILoadOptionsFunctions): Promise<IDataObject[]> {
	return rows((await api.call(this, '/custom-fields')).data);
}
const fieldOptions = (fields: IDataObject[]) => fields.flatMap((f) => typeof f.id === 'string'
	? [{ name: `${f.name ?? f.slug ?? f.id} (${entityName(fieldEntity(f))})`, value: f.id }] : []).sort((a, b) => a.name.localeCompare(b.name));
const currentValue = (context: ILoadOptionsFunctions, name: string) => {
	try { return context.getCurrentNodeParameter(name); } catch { return undefined; }
};

export async function getCustomFieldIdOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	return fieldOptions(await allFields.call(this));
}
export async function getChoiceFieldOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	return fieldOptions((await allFields.call(this)).filter((f) => choiceTypes.includes(String(f.fieldType))));
}
export async function getFieldChoiceOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const id = currentValue(this, 'customField');
	const field = (await allFields.call(this)).find((f) => f.id === id);
	return rows(field?.options).map((o) => ({ name: `${o.label ?? o.value}${o.inactive === true ? ' (inactive)' : ''}`, value: String(o.value) }));
}
export async function getVisibilityParentOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const fields = await allFields.call(this);
	const id = currentValue(this, 'customField');
	const entity = currentValue(this, 'operation') === 'create' ? currentValue(this, 'customFieldEntity') ?? 'deal' : fieldEntity(fields.find((f) => f.id === id) ?? {});
	return fieldOptions(fields.filter((f) => f.id !== id && fieldEntity(f) === entity && parentTypes.includes(String(f.fieldType))));
}
export async function getVisibilityValueOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const parentId = currentValue(this, '&parentFieldId');
	const parent = (await allFields.call(this)).find((f) => f.id === parentId);
	if (parent?.fieldType === 'boolean') return [{ name: 'No', value: 'false' }, { name: 'Yes', value: 'true' }];
	return rows(parent?.options).filter((o) => o.inactive !== true).map((o) => ({ name: String(o.label ?? o.value), value: String(o.value) }));
}

function newChoices(context: IExecuteSingleFunctions, existing: IDataObject[]): IDataObject[] {
	const collection = context.getNodeParameter('fieldChoices', {}) as IDataObject;
	const entries = record(collection) && Array.isArray(collection.choices) ? rows(collection.choices) : [];
	const result = existing.map((o) => ({ ...o }));
	for (const entry of entries) {
		const label = String(entry.label ?? '').trim();
		if (!label) throw new Error('Each option needs a label');
		const value = String(entry.value ?? '').trim();
		const same = result.find((o) => (value && o.value === value) || String(o.label ?? '').trim().toLowerCase() === label.toLowerCase());
		// Adding an option that already exists keeps workflows re-runnable: it only reactivates it.
		if (same) { delete same.inactive; continue; }
		result.push({ value: value || optionValue(label, result.map((o) => String(o.value))), label, color: entry.color || colors[result.length % colors.length] });
	}
	return result;
}

function visibilityRule(context: IExecuteSingleFunctions): IDataObject | undefined {
	const collection = context.getNodeParameter('visibility', {}) as IDataObject;
	const rule = record(collection.rule) ? collection.rule : undefined;
	if (!rule || !rule.parentFieldId) return undefined;
	const values = Array.isArray(rule.values) ? rule.values.map(String) : [];
	if (!values.length) throw new Error('Choose at least one value for Show Only When');
	return { parentFieldId: rule.parentFieldId, values };
}

function typeConfig(context: IExecuteSingleFunctions, fieldType: string): IDataObject | undefined {
	if (fieldType === 'currency') return { currency: context.getNodeParameter('currency', 'BRL') };
	if (fieldType !== 'event') return undefined;
	const event = context.getNodeParameter('eventSettings', {}) as IDataObject;
	return { event: { title: event.title || context.getNodeParameter('fieldName'), durationMinutes: event.durationMinutes ?? 30,
		conferenceMode: event.conferenceMode ?? 'none', ...(event.description ? { description: event.description } : {}) } };
}

export async function prepareCustomFieldCreate(this: IExecuteSingleFunctions, options: IHttpRequestOptions): Promise<IHttpRequestOptions> {
	const fieldType = this.getNodeParameter('fieldType') as string;
	const choices = choiceTypes.includes(fieldType) ? newChoices(this, []) : [];
	if (choiceTypes.includes(fieldType) && !choices.length) throw new Error('Add at least one option for a choice field');
	const config = typeConfig(this, fieldType);
	const rule = visibilityRule(this);
	options.body = { name: this.getNodeParameter('fieldName'), fieldType, entityType: this.getNodeParameter('customFieldEntity'),
		...(this.getNodeParameter('customFieldOptions', {}) as IDataObject),
		...(choices.length ? { options: choices } : {}), ...(config ? { config } : {}), ...(rule ? { visibilityRule: rule } : {}) };
	return options;
}

export async function prepareCustomFieldUpdate(this: IExecuteSingleFunctions, options: IHttpRequestOptions): Promise<IHttpRequestOptions> {
	const fields = { ...(this.getNodeParameter('customFieldUpdateFields', {}) as IDataObject) };
	const rule = visibilityRule(this);
	if (rule && fields.clearVisibilityRule === true) throw new Error('Choose either Show Only When or Remove Show Only When, not both');
	if (fields.clearVisibilityRule !== true) delete fields.clearVisibilityRule;
	if (!rule && !Object.keys(fields).length) throw new Error('Add at least one field to update');
	options.body = { ...fields, ...(rule ? { visibilityRule: rule } : {}) };
	return options;
}

/** The API stores options inside the field, so option changes read the field and save the edited list. */
export async function prepareFieldChoices(this: IExecuteSingleFunctions, options: IHttpRequestOptions): Promise<IHttpRequestOptions> {
	const id = String(this.getNodeParameter('customField'));
	const response: unknown = await this.helpers.httpRequestWithAuthentication.call(this, 'pipefacilApi', { method: 'GET', url: `${apiBaseUrl}/custom-fields/${encodeURIComponent(id)}` });
	const field = record(response) && record(response.data) ? response.data : {};
	if (!choiceTypes.includes(String(field.fieldType))) throw new Error(`"${field.name ?? id}" is not a single or multiple choice field`);
	const existing = rows(field.options);
	const operation = this.getNodeParameter('operation') as string;
	let result: IDataObject[];
	if (operation === 'addOptions') result = newChoices(this, existing);
	else {
		const value = String(this.getNodeParameter('fieldChoice'));
		const current = existing.find((o) => String(o.value) === value);
		if (!current) throw new Error(`Option "${value}" was not found in "${field.name ?? id}"`);
		if (operation === 'removeOption') {
			result = this.getNodeParameter('keepForExistingLeads', true) ? existing.map((o) => (o === current ? { ...o, inactive: true } : o)) : existing.filter((o) => o !== current);
		} else {
			const changes = this.getNodeParameter('choiceUpdateFields', {}) as IDataObject;
			if (!Object.keys(changes).length) throw new Error('Add at least one option detail to update');
			const updated: IDataObject = { ...current, ...(changes.label ? { label: String(changes.label).trim() } : {}), ...(changes.color ? { color: changes.color } : {}) };
			if (changes.active === true) delete updated.inactive;
			if (changes.active === false) updated.inactive = true;
			result = existing.map((o) => (o === current ? updated : o));
		}
	}
	if (!result.some((o) => o.inactive !== true)) throw new Error('A choice field must keep at least one active option');
	options.url = `/custom-fields/${encodeURIComponent(id)}`;
	options.body = { options: result };
	return options;
}

const fieldTypes: INodePropertyOptions[] = [
	{ name: 'Currency', value: 'currency' }, { name: 'Date', value: 'date' }, { name: 'Date and Time', value: 'datetime' },
	{ name: 'Email', value: 'email' }, { name: 'File', value: 'file_upload' }, { name: 'Long Text', value: 'textarea' },
	{ name: 'Meeting', value: 'event', description: 'Date and time that schedules a meeting on the owner calendar. Leads only.' },
	{ name: 'Multiple Choice', value: 'multi_select' }, { name: 'Number', value: 'number' }, { name: 'Phone', value: 'phone' },
	{ name: 'Single Choice', value: 'select' }, { name: 'Text', value: 'text' }, { name: 'URL', value: 'url' },
	{ name: 'Workspace Member', value: 'members' }, { name: 'Yes/No', value: 'boolean' },
];
const field = (operations: string[], method = 'getCustomFieldIdOptions'): INodeProperties => ({
	displayName: 'Custom Field Name or ID', name: 'customField', type: 'options', default: '', required: true,
	typeOptions: { loadOptionsMethod: method }, displayOptions: displayOptions('customField', operations), description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
});
const settings = (prefix = ''): INodeProperties[] => [
	{ displayName: 'API Only', name: 'apiOnly', type: 'boolean', default: false, description: 'Whether lead values can only be changed through the API. The app shows the field as read-only.' },
	{ displayName: 'Description', name: 'description', type: 'string', default: '' },
	{ displayName: 'Display Order', name: 'displayOrder', type: 'number', default: 0, typeOptions: { minValue: 0 } },
	{ displayName: 'Placeholder', name: 'placeholder', type: 'string', default: '', description: `Example text shown while the field is empty${prefix}` },
	{ displayName: 'Required', name: 'isRequired', type: 'boolean', default: false, description: 'Whether the field must be filled in' },
	{ displayName: 'Section', name: 'section', type: 'string', default: '', description: 'Group where the field appears in the app' },
];
const choiceRows = (operations: string[], description: string, show: IDataObject = {}): INodeProperties => ({
	displayName: 'Options', name: 'fieldChoices', type: 'fixedCollection', default: {}, placeholder: 'Add Option', typeOptions: { multipleValues: true },
	displayOptions: { show: { resource: ['customField'], operation: operations, ...show } }, description, options: [{ name: 'choices', displayName: 'Option', values: [
		{ displayName: 'Label', name: 'label', type: 'string', default: '', required: true },
		{ displayName: 'Color', name: 'color', type: 'color', default: '', description: 'Leave empty to use the next app color' },
		{ displayName: 'Key', name: 'value', type: 'string', default: '', description: 'Stored key. Leave empty to generate it from the label, like the app does.' },
	] }],
});

export const customFieldsDescription: INodeProperties[] = [
	{
		displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, displayOptions: displayOptions('customField'), default: 'create', options: [
			{ name: 'Add Options', value: 'addOptions', action: 'Add options to a custom field', description: 'Add options to a choice field. Existing labels are kept, not duplicated.', routing: { request: { method: 'PATCH', url: '/custom-fields' }, send: { preSend: [prepareFieldChoices] }, ...dataOutput() } },
			{ name: 'Create', value: 'create', action: 'Create a custom field', routing: { request: { method: 'POST', url: '/custom-fields' }, send: { preSend: [prepareCustomFieldCreate] }, ...dataOutput() } },
			{ name: 'Delete', value: 'delete', action: 'Delete a custom field', description: 'Delete the field and remove its values from every lead', routing: { request: { method: 'DELETE', url: '=/custom-fields/{{encodeURIComponent($parameter.customField)}}' }, output: { postReceive: [{ type: 'set', properties: { value: '={{ { "deleted": true } }}' } }] } } },
			{ name: 'Get', value: 'get', action: 'Get a custom field', routing: { request: { method: 'GET', url: '=/custom-fields/{{encodeURIComponent($parameter.customField)}}' }, ...dataOutput() } },
			{ name: 'Get Many', value: 'getAll', action: 'Get many custom fields', routing: { request: { method: 'GET', url: '/custom-fields' }, ...dataOutput() } },
			{ name: 'Remove Option', value: 'removeOption', action: 'Remove an option from a custom field', routing: { request: { method: 'PATCH', url: '/custom-fields' }, send: { preSend: [prepareFieldChoices] }, ...dataOutput() } },
			{ name: 'Update', value: 'update', action: 'Update a custom field', description: 'Change the field settings. Type, key and record type cannot change.', routing: { request: { method: 'PATCH', url: '=/custom-fields/{{encodeURIComponent($parameter.customField)}}' }, send: { preSend: [prepareCustomFieldUpdate] }, ...dataOutput() } },
			{ name: 'Update Option', value: 'updateOption', action: 'Update an option of a custom field', description: 'Rename, recolor, activate or deactivate an option', routing: { request: { method: 'PATCH', url: '/custom-fields' }, send: { preSend: [prepareFieldChoices] }, ...dataOutput() } },
		],
	},
	field(['delete', 'get', 'update']),
	field(['addOptions', 'removeOption', 'updateOption'], 'getChoiceFieldOptions'),
	{
		displayName: 'Option Name or ID', name: 'fieldChoice', type: 'options', default: '', required: true,
		typeOptions: { loadOptionsMethod: 'getFieldChoiceOptions', loadOptionsDependsOn: ['customField'] },
		displayOptions: displayOptions('customField', ['removeOption', 'updateOption']), description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Keep for Existing Leads', name: 'keepForExistingLeads', type: 'boolean', default: true, displayOptions: displayOptions('customField', 'removeOption'),
		description: 'Whether to only deactivate the option, so records that use it keep showing it. Turn off to delete it.',
	},
	optionalFields('customField', 'updateOption', 'choiceUpdateFields', 'Update Fields', 'Change only the option details you add. The stored key never changes.', [
		{ displayName: 'Active', name: 'active', type: 'boolean', default: true, description: 'Whether the option can be selected' },
		{ displayName: 'Color', name: 'color', type: 'color', default: '#6366f1' },
		{ displayName: 'Label', name: 'label', type: 'string', default: '' },
	]),
	{ displayName: 'Name', name: 'fieldName', type: 'string', default: '', required: true, displayOptions: displayOptions('customField', 'create'), placeholder: 'Segment' },
	{ displayName: 'Record Type', name: 'customFieldEntity', type: 'options', default: 'deal', options: entities, displayOptions: displayOptions('customField', 'create'), description: 'Where the field is filled in' },
	{ displayName: 'Field Type', name: 'fieldType', type: 'options', default: 'text', options: fieldTypes, displayOptions: displayOptions('customField', 'create') },
	choiceRows(['create'], 'Choices people can select', { fieldType: choiceTypes }),
	choiceRows(['addOptions'], 'Options to add. A label that already exists is reactivated instead of duplicated.'),
	{
		displayName: 'Currency', name: 'currency', type: 'options', default: 'BRL', displayOptions: { show: { resource: ['customField'], operation: ['create'], fieldType: ['currency'] } },
		options: [{ name: 'BRL — Brazilian Real', value: 'BRL' }, { name: 'EUR — Euro', value: 'EUR' }, { name: 'USD — US Dollar', value: 'USD' }],
	},
	{
		displayName: 'Meeting Settings', name: 'eventSettings', type: 'collection', placeholder: 'Add option', default: {},
		displayOptions: { show: { resource: ['customField'], operation: ['create'], fieldType: ['event'] } }, options: [
			{ displayName: 'Conference', name: 'conferenceMode', type: 'options', default: 'none', options: [{ name: 'Google Meet', value: 'google_meet' }, { name: 'None', value: 'none' }] },
			{ displayName: 'Description', name: 'description', type: 'string', default: '', typeOptions: { rows: 3 } },
			{ displayName: 'Duration (Minutes)', name: 'durationMinutes', type: 'number', default: 30, typeOptions: { minValue: 1, maxValue: 1440 } },
			{ displayName: 'Title', name: 'title', type: 'string', default: '', description: 'Meeting title. Defaults to the field name.' },
		],
	},
	optionalFields('customField', 'create', 'customFieldOptions', 'Additional Fields', 'Add only the settings you need.', [
		...settings(),
		{ displayName: 'Key', name: 'slug', type: 'string', default: '', description: 'Unique key used by the API. Generated from the name when empty and cannot change later.' },
	]),
	optionalFields('customField', 'update', 'customFieldUpdateFields', 'Update Fields', 'Change only the settings you add.', [
		...settings('. Leave empty to clear it.'),
		{ displayName: 'Name', name: 'name', type: 'string', default: '' },
		{ displayName: 'Remove Show Only When', name: 'clearVisibilityRule', type: 'boolean', default: true, description: 'Whether to always show the field again' },
	]),
	{
		displayName: 'Show Only When', name: 'visibility', type: 'fixedCollection', default: {}, placeholder: 'Add Condition', displayOptions: displayOptions('customField', ['create', 'update']),
		description: 'Show the field only when another choice or yes/no field has one of the selected values', options: [{ name: 'rule', displayName: 'Condition', values: [
			{ displayName: 'Field Name or ID', name: 'parentFieldId', type: 'options', default: '', required: true, typeOptions: { loadOptionsMethod: 'getVisibilityParentOptions', loadOptionsDependsOn: ['customField', 'customFieldEntity'] }, description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>' },
			{ displayName: 'Value Names or IDs', name: 'values', type: 'multiOptions', default: [], typeOptions: { loadOptionsMethod: 'getVisibilityValueOptions', loadOptionsDependsOn: ['&parentFieldId'] }, description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>' },
		] }],
	},
	optionalFields('customField', 'getAll', 'customFieldListFilters', 'Filters', 'Add filters only when you need a narrower list.', [
		{ displayName: 'Pipeline Name or ID', name: 'pipelineId', type: 'options', default: '', typeOptions: { loadOptionsMethod: 'getPipelineOptions' }, description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>', routing: { send: { type: 'query', property: 'pipelineId' } } },
		{ displayName: 'Record Type', name: 'entity', type: 'options', default: 'deal', options: entities, routing: { send: { type: 'query', property: 'entity' } } },
	]),
];
