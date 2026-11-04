import type { IDataObject, IExecuteSingleFunctions, IHttpRequestOptions, INodeProperties, INodePropertyOptions, ILoadOptionsFunctions, ResourceMapperFields } from 'n8n-workflow';
import { displayOptions, optionalFields } from './common';
import { choice, record, apiBaseUrl } from './choices';
import { getCustomDealFields, prepareDealFilters } from './deals';
import { prepareFileUpload } from './notes';

const mapperValue = (value: unknown): IDataObject => record(value) && record(value.value) ? value.value : {};

export async function prepareSimpleCreate(this: IExecuteSingleFunctions, options: IHttpRequestOptions): Promise<IHttpRequestOptions> {
	const fields = this.getNodeParameter('leadFields', {}) as IDataObject;
	const customFields = mapperValue(this.getNodeParameter('customFields', {}));
	const tracking = this.getNodeParameter('tracking', {}) as IDataObject;
	options.body = { ...(record(options.body) ? options.body : {}), ...fields,
		...(record(fields.companyId) ? { companyId: fields.companyId.value } : {}),
		...(Object.keys(customFields).length ? { customFields } : {}),
		...(Object.keys(tracking).length ? { tracking } : {}) };
	return options;
}
export async function prepareSimpleUpdate(this: IExecuteSingleFunctions, options: IHttpRequestOptions): Promise<IHttpRequestOptions> {
	const customFields = mapperValue(this.getNodeParameter('customFields', {}));
	const contact = this.getNodeParameter('contactFields', {}) as IDataObject;
	options.body = { ...(record(options.body) ? options.body : {}),
		...(Object.keys(customFields).length ? { customFields } : {}),
		...(Object.keys(contact).length ? { contact } : {}) };
	return options;
}
export async function getCustomUpdateFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	const result = await getCustomDealFields.call(this);
	return { fields: result.fields.map((field) => ({ ...field, required: false, removed: true })) };
}
export async function prepareSimpleFilters(this: IExecuteSingleFunctions, options: IHttpRequestOptions): Promise<IHttpRequestOptions> {
	const filters = this.getNodeParameter('filters', {}) as IDataObject;
	const collection = filters.customFieldFilters;
	if (record(collection) && Array.isArray(collection.filters)) {
		const converted = collection.filters.map((f) => {
			if (!record(f)) return f;
			return { ...f, value: f.match === 'empty' ? '__empty__' : f.match === 'option' ? f.option : f.value };
		});
		const context = Object.create(this) as IExecuteSingleFunctions;
		context.getNodeParameter = ((name: string, fallback?: unknown) => name === 'filters'
			? { ...filters, customFieldFilters: { filters: converted } } : this.getNodeParameter(name, fallback as never)) as IExecuteSingleFunctions['getNodeParameter'];
		return await prepareDealFilters.call(context, options);
	}
	return await prepareDealFilters.call(this, options);
}
export async function prepareSimpleNote(this: IExecuteSingleFunctions, options: IHttpRequestOptions): Promise<IHttpRequestOptions> {
	const fields = this.getNodeParameter('noteOptions', {}) as IDataObject;
	const collection = fields.files;
	const files = record(collection) && Array.isArray(collection.files) ? collection.files : [];
	if (files.length > 10) throw new Error('A note accepts at most 10 attachments');
	const deal = this.getNodeParameter('deal') as IDataObject;
	const attachments: IDataObject[] = [];
	// Validate every binary field before starting uploads.
	for (const file of files) {
		if (!record(file) || typeof file.binaryProperty !== 'string' || !file.binaryProperty.trim()) throw new Error('Choose an input binary field for each attachment');
		this.helpers.assertBinaryData(file.binaryProperty);
	}
	for (const file of files) {
		if (!record(file)) continue;
		const context = Object.create(this) as IExecuteSingleFunctions;
		context.getNodeParameter = ((name: string, fallback?: unknown) => name === 'binaryProperty' ? file.binaryProperty : this.getNodeParameter(name, fallback as never)) as IExecuteSingleFunctions['getNodeParameter'];
		const request = await prepareFileUpload.call(context, { method: 'POST', url: `${apiBaseUrl}/deals/${encodeURIComponent(String(deal.value))}/notes/attachments` });
		const response: unknown = await this.helpers.httpRequestWithAuthentication.call(this, 'pipefacilApi', request);
		if (!record(response) || !record(response.data)) throw new Error('The attachment upload did not return a receipt');
		attachments.push(response.data);
	}
	options.body = { ...(record(options.body) ? options.body : {}), ...(attachments.length ? { attachments } : {}) };
	const content = record(options.body) ? options.body.content : undefined;
	if (!attachments.length && !(typeof content === 'string' && content.trim())) throw new Error('Provide note content or at least one attachment');
	return options;
}

function company(property: INodeProperties): INodeProperties {
	return { ...property, displayName: 'Company', type: 'resourceLocator', default: { mode: 'list', value: '' },
		description: 'Choose a company or provide its ID', modes: [
			{ displayName: 'From List', name: 'list', type: 'list', typeOptions: { searchListMethod: 'searchCompanies', searchable: true } },
			{ displayName: 'By ID', name: 'id', type: 'string' },
		], ...(property.routing ? { routing: { send: { ...property.routing.send } } } : {}) };
}
const userNames = ['responsibleUserId', 'coOwnerUserId', 'assigneeUserId', 'responsibleId', 'actorUserId'];
function simplify(property: INodeProperties): INodeProperties {
	let result = { ...property };
	if (userNames.includes(property.name)) result = choice(property, 'getUserOptions');
	if (property.name === 'responsibleUserIds') result = choice(property, 'getUserOptions', true);
	if (property.name === 'tagIds') result = choice(property, 'getTagOptions', true);
	if (property.name === 'pipelineId') result = choice(property, 'getPipelineOptions');
	if (property.name === 'pipeline') result = choice(property, 'getPipelineSequenceOptions');
	if (property.name === 'stageId') result = { ...choice(property, 'getAllStageOptions'), typeOptions: { loadOptionsMethod: 'getAllStageOptions', loadOptionsDependsOn: ['pipelineId', '&pipelineId', '&pipeline'] } };
	if (property.name === 'companyId') result = company(property);
	if (property.name === 'filter') result = { ...property, type: 'options', default: 'all', options: [
		{ name: 'All', value: 'all' }, { name: 'Closed', value: 'closed' }, { name: 'Internal', value: 'internal' }, { name: 'Returned', value: 'returned' }, { name: 'Unread', value: 'unread' },
	] };
	if (property.name === 'source') result = { ...property, type: 'options', default: 'manual', options: [
		{ name: 'Automation', value: 'automation' }, { name: 'Import', value: 'import' }, { name: 'Manual', value: 'manual' }, { name: 'Meta Lead Ad', value: 'meta_lead_ad' }, { name: 'WhatsApp', value: 'whatsapp' },
	] };
	if (property.name === 'status' && property.routing?.send?.type === 'query') result = { ...property, routing: { ...property.routing, send: { ...property.routing.send, value: '={{$value.join(",")}}' } } };
	if (property.name === 'slug') result = { ...choice(property, 'getCustomFieldOptions'), displayName: 'Custom Field Name or ID' };
	if (property.type === 'collection') result.options = (property.options as INodeProperties[]).map(simplify);
	if (property.type === 'fixedCollection') result.options = (property.options as Array<{ name: string; displayName: string; values: INodeProperties[] }>).map((group) => ({ ...group, values: group.values.map(simplify) }));
	if (property.name === 'customFieldFilters') result.options = [{ name: 'filters', displayName: 'Filter', values: [
		simplify({ displayName: 'Custom Field', name: 'slug', type: 'string', default: '', required: true }),
		{ displayName: 'Match', name: 'match', type: 'options', default: 'value', options: [
			{ name: 'Value', value: 'value' }, { name: 'Selected Option', value: 'option' }, { name: 'Not Filled In', value: 'empty' },
		] },
		{ displayName: 'Value', name: 'value', type: 'string', default: '', displayOptions: { show: { match: ['value'] } } },
		{ displayName: 'Option Name or ID', name: 'option', type: 'options', default: '', typeOptions: { loadOptionsMethod: 'getCustomFilterValueOptions', loadOptionsDependsOn: ['&slug'] }, description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>', displayOptions: { show: { match: ['option'] } } },
	] }];
	if (property.name === 'customFieldRanges') result.options = [{ name: 'ranges', displayName: 'Range', values: [
		{ ...choice({ displayName: 'Custom Field', name: 'slug', type: 'string', default: '', required: true }, 'getDateFieldOptions'), displayName: 'Date Field Name or ID' },
		{ displayName: 'From', name: 'from', type: 'dateTime', default: '' },
		{ displayName: 'To', name: 'to', type: 'dateTime', default: '' },
	] }];
	return result;
}

export function modernProperties(properties: INodeProperties[]): INodeProperties[] {
	return properties.map(simplify).map((property) => {
		const resource = property.displayOptions?.show?.resource?.[0];
		if (property.name === 'operation') {
			return { ...property, options: (property.options as INodePropertyOptions[]).map((operation) => {
				const routing = operation.routing as INodeProperties['routing'];
				const hook = resource === 'deal' ? ({ create: prepareSimpleCreate, update: prepareSimpleUpdate, getAll: prepareSimpleFilters }[String(operation.value)]) : resource === 'note' && operation.value === 'create' ? prepareSimpleNote : undefined;
				if (resource === 'conversation' && operation.value === 'sendMessage') return { ...operation, routing: { ...routing, send: { preSend: [prepareSimpleMessage] } } };
				if (resource === 'conversation' && operation.value === 'listMessages') return { ...operation, routing: { ...routing, request: { ...routing?.request, url: '=/conversations/{{encodeURIComponent($parameter.conversationKey.value)}}/messages' } } };
				if (!hook) return operation;
				return { ...operation, routing: { ...routing, send: { ...routing?.send, preSend: [hook] } } };
			}) as INodeProperties['options'] };
		}
		if (property.name === 'leadFields') {
			const names = ['phone', 'name', 'contactName', 'contactFirstName', 'contactLastName', 'email', 'notes', 'currency'];
			return optionalFields('deal', 'create', 'leadFields', 'Lead Fields', 'Add only the details you need. Phone is optional.', [
				...names.map((name) => ({ displayName: name.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()), name, type: 'string' as const, default: '' })),
				{ displayName: 'Value', name: 'value', type: 'number', default: 0, typeOptions: { minValue: 0 } },
				{ displayName: 'Close Probability', name: 'closeProbability', type: 'number', default: 0, typeOptions: { minValue: 0, maxValue: 100 } },
				{ displayName: 'Expected Close At', name: 'expectedCloseAt', type: 'dateTime', default: '' },
				simplify({ displayName: 'Responsible User', name: 'responsibleUserId', type: 'string', default: '' }),
				company({ displayName: 'Company', name: 'companyId', type: 'string', default: '' }),
				{ displayName: 'Use Assignment Strategy', name: 'useAssignmentStrategy', type: 'boolean', default: false, description: 'Whether to assign the lead using the workspace assignment strategy' },
			]);
		}
		if (property.name === 'updateFields') return { ...property, options: (property.options as INodeProperties[]).filter((field) => !['customFields', 'contact'].includes(field.name)) };
		if (property.name === 'noteOptions') return optionalFields('note', 'create', 'noteOptions', 'Attachments', 'Choose binary fields from the input. Files are uploaded and attached automatically.', [{
			displayName: 'Files', name: 'files', type: 'fixedCollection', default: {}, typeOptions: { multipleValues: true }, placeholder: 'Add File', options: [{ name: 'files', displayName: 'File', values: [
				{ displayName: 'Input Binary Field', name: 'binaryProperty', type: 'string', default: 'data', required: true, description: 'Name of the input binary field containing the attachment' },
			] }],
		}]);
		if (property.name === 'taskOptions') {
			const options = property.options as INodeProperties[];
			return { ...property, options: options.filter((field) => field.name !== 'categoryId') };
		}
		if (property.name === 'to') return { ...property, displayName: 'Recipient', type: 'resourceLocator', default: { mode: 'list', value: '' }, modes: [
			{ displayName: 'From List', name: 'list', type: 'list', typeOptions: { searchListMethod: 'searchContacts', searchable: true } },
			{ displayName: 'By Phone', name: 'id', type: 'string', placeholder: '5585999999999' },
		], routing: { send: { type: 'body', property: 'to' } } };
		if (property.name === 'text') return { ...property, required: true, typeOptions: { rows: 4 }, displayOptions: { show: { ...property.displayOptions?.show, type: ['text'] } } };
		if (property.name === 'conversationFilters') return { ...property, options: (property.options as INodeProperties[]).filter((field) => field.name !== 'channelIds') };
		if (property.name === 'messageOptions') return { ...property, displayName: 'Advanced Options', description: 'Optional channel, reply and provider settings', options: (property.options as INodeProperties[]).filter((field) => !['mediaLink', 'caption', 'filename', 'templateName', 'templateLanguageCode', 'templateComponents'].includes(field.name)) };
		if (property.name === 'conversationKey') return { ...property, displayName: 'Conversation', type: 'resourceLocator', default: { mode: 'list', value: '' }, description: 'Search for a conversation by contact name or phone', modes: [
			{ displayName: 'From List', name: 'list', type: 'list', typeOptions: { searchListMethod: 'searchConversations', searchable: true } },
			{ displayName: 'By Key', name: 'id', type: 'string' },
		] };
		return property;
	});
}

export function updateExtras(custom: INodeProperties): INodeProperties[] {
	return [
		optionalFields('deal', 'create', 'advancedLeadFields', 'Advanced Options', 'Optional delivery channel.', [{ displayName: 'Channel ID', name: 'channelId', type: 'string', default: '', routing: { send: { type: 'body', property: 'channelId' } } }]),
		optionalFields('conversation', 'listConversations', 'advancedConversationFilters', 'Advanced Filters', 'Filter by channel IDs when known.', [{ displayName: 'Channel IDs', name: 'channelIds', type: 'string', default: '', routing: { send: { type: 'query', property: 'channelIds' } } }]),
		choice({ displayName: 'Pipeline', name: 'pipelineId', type: 'string', default: '', displayOptions: displayOptions('deal', 'update'), description: 'Select the pipeline to load its custom fields' }, 'getPipelineOptions'),
		{ ...custom, description: 'Select only the custom fields to change. Omitted fields keep their current value.', displayOptions: displayOptions('deal', 'update'), typeOptions: { ...custom.typeOptions, resourceMapper: { resourceMapperMethod: 'getCustomUpdateFields', mode: 'add', addAllFields: false, supportAutoMap: false, fieldWords: { singular: 'custom field', plural: 'custom fields' } } } },
		optionalFields('deal', 'update', 'contactFields', 'Contact Fields', 'Change only the contact details you select.', ['firstName', 'lastName', 'phone', 'email', 'instagramUsername', 'notes'].map((name) => ({ displayName: name.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()), name, type: 'string', default: '' }))),
		optionalFields('task', 'create', 'advancedTaskOptions', 'Advanced Options', 'Use a custom category when its ID is known.', [{ displayName: 'Category ID', name: 'categoryId', type: 'string', default: '', routing: { send: { type: 'body', property: 'categoryId' } } }]),
	];
}

export async function prepareSimpleMessage(this: IExecuteSingleFunctions, options: IHttpRequestOptions): Promise<IHttpRequestOptions> {
	const type = this.getNodeParameter('type') as string;
	const body = record(options.body) ? options.body : {};
	if (type === 'template') {
		const variables = this.getNodeParameter('templateVariables', {}) as IDataObject;
		const parameters = record(variables) && Array.isArray(variables.variables) ? variables.variables : [];
		body.templateName = this.getNodeParameter('templateName');
		body.templateLanguageCode = this.getNodeParameter('templateLanguageCode');
		if (parameters.length) body.templateComponents = [{ type: 'body', parameters: parameters.map((p) => ({ type: 'text', text: record(p) ? String(p.text ?? '') : '' })) }];
		const advanced = this.getNodeParameter('advancedTemplateFields', {}) as IDataObject;
		if (advanced.templateComponents !== undefined) body.templateComponents = typeof advanced.templateComponents === 'string' ? JSON.parse(advanced.templateComponents) : advanced.templateComponents;
	}
	options.body = body;
	return options;
}

export const messageExtras: INodeProperties[] = [
	{
		...optionalFields('conversation', 'sendMessage', 'mediaFields', 'Media', 'Provide a public media URL.', [
			{ displayName: 'Media URL', name: 'mediaLink', type: 'string', default: '', routing: { send: { type: 'body', property: 'mediaLink' } } },
			{ displayName: 'Caption', name: 'caption', type: 'string', default: '', routing: { send: { type: 'body', property: 'caption' } } },
			{ displayName: 'Filename', name: 'filename', type: 'string', default: '', routing: { send: { type: 'body', property: 'filename' } } },
		]), displayOptions: { show: { resource: ['conversation'], operation: ['sendMessage'], type: ['audio', 'document', 'image', 'video'] } },
	},
	{ displayName: 'Template Name', name: 'templateName', type: 'string', default: '', required: true, description: 'Approved template name. The public API does not provide a template catalog.', displayOptions: { show: { resource: ['conversation'], operation: ['sendMessage'], type: ['template'] } } },
	{ displayName: 'Template Language', name: 'templateLanguageCode', type: 'string', default: 'pt_BR', required: true, displayOptions: { show: { resource: ['conversation'], operation: ['sendMessage'], type: ['template'] } } },
	{ displayName: 'Body Variables', name: 'templateVariables', type: 'fixedCollection', default: {}, typeOptions: { multipleValues: true }, placeholder: 'Add Variable', displayOptions: { show: { resource: ['conversation'], operation: ['sendMessage'], type: ['template'] } }, options: [{ displayName: 'Variable', name: 'variables', values: [
		{ displayName: 'Text', name: 'text', type: 'string', default: '', description: 'Value for the next body placeholder, in template order' },
	] }] },
	{
		...optionalFields('conversation', 'sendMessage', 'advancedTemplateFields', 'Advanced Template Options', 'For templates with header, button or other provider components.', [
			{ displayName: 'Template Components', name: 'templateComponents', type: 'json', default: '[]', description: 'Provider component array. Overrides Body Variables.' },
		]), displayOptions: { show: { resource: ['conversation'], operation: ['sendMessage'], type: ['template'] } },
	},
];
