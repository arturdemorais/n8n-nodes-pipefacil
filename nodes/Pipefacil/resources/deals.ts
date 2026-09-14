import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeListSearchResult,
	ILoadOptionsFunctions,
	INodeProperties,
	INodePropertyOptions,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';
import { bodyString, cursorPagination, dataOutput, displayOptions, optionalFields, pathString } from './common';

const create = 'create';
const update = 'update';
const get = 'get';

const apiBaseUrl = 'https://pipefacil-server.matchsales.com.br/api/v1';

type ApiRecord = IDataObject;

function isRecord(value: unknown): value is ApiRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function getResponseData(response: unknown): ApiRecord[] {
	if (!isRecord(response) || !Array.isArray(response.data)) {
		return [];
	}

	return response.data.filter(isRecord);
}

function getListItems(response: unknown): ApiRecord[] {
	if (!isRecord(response) || !isRecord(response.data) || !Array.isArray(response.data.items)) {
		return [];
	}

	return response.data.items.filter(isRecord);
}

function getScalar(value: unknown): string | undefined {
	if (typeof value === 'string' || typeof value === 'number') {
		return String(value);
	}

	return undefined;
}

async function getPipelines(this: ILoadOptionsFunctions): Promise<ApiRecord[]> {
	const response = await this.helpers.httpRequestWithAuthentication.call(this, 'pipefacilApi', {
		method: 'GET',
		url: `${apiBaseUrl}/pipelines`,
	});

	return getResponseData(response);
}

function toOption(value: unknown): INodePropertyOptions | undefined {
	if (typeof value === 'string' || typeof value === 'number') {
		return { name: String(value), value };
	}

	if (!isRecord(value)) {
		return undefined;
	}

	const optionValue = value.value ?? value.id ?? value.key ?? value.slug ?? value.name;
	if (typeof optionValue !== 'string' && typeof optionValue !== 'number') {
		return undefined;
	}

	const optionName = value.label ?? value.name ?? value.value ?? optionValue;
	return {
		name: String(optionName),
		value: optionValue,
	};
}

function customFieldType(fieldType: unknown): ResourceMapperField['type'] {
	const type = String(fieldType ?? '').toLowerCase();

	if (type.includes('select') || type === 'dropdown' || type === 'radio') {
		return 'options';
	}
	if (type.includes('boolean') || type === 'checkbox') {
		return 'boolean';
	}
	if (type.includes('number') || type.includes('currency') || type.includes('decimal')) {
		return 'number';
	}
	if (type.includes('date')) {
		return 'dateTime';
	}

	return 'string';
}

function getMapperValue(value: unknown): IDataObject {
	if (!isRecord(value) || !isRecord(value.value)) {
		return {};
	}

	return value.value;
}

export async function prepareCreateDealRequest(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const leadFields = getMapperValue(this.getNodeParameter('leadFields'));
	const customFields = getMapperValue(this.getNodeParameter('customFields'));

	requestOptions.body = {
		...(isRecord(requestOptions.body) ? requestOptions.body : {}),
		...leadFields,
		...(Object.keys(customFields).length > 0 ? { customFields } : {}),
	};

	return requestOptions;
}

export async function getDealFields(): Promise<ResourceMapperFields> {
	return {
		fields: [
			{ id: 'phone', displayName: 'Phone', defaultMatch: false, required: true, display: true },
			{ id: 'name', displayName: 'Deal Name', defaultMatch: false, required: false, display: true, removed: true },
			{ id: 'contactName', displayName: 'Contact Name', defaultMatch: false, required: false, display: true, removed: true },
			{ id: 'email', displayName: 'Email', defaultMatch: false, required: false, display: true, removed: true },
			{ id: 'notes', displayName: 'Notes', defaultMatch: false, required: false, display: true, removed: true },
			{ id: 'value', displayName: 'Value', defaultMatch: false, required: false, display: true, removed: true, type: 'number' },
			{ id: 'closeProbability', displayName: 'Close Probability', defaultMatch: false, required: false, display: true, removed: true, type: 'number' },
			{ id: 'expectedCloseAt', displayName: 'Expected Close At', defaultMatch: false, required: false, display: true, removed: true, type: 'dateTime' },
			{ id: 'currency', displayName: 'Currency', defaultMatch: false, required: false, display: true, removed: true, defaultValue: 'BRL' },
			{ id: 'companyId', displayName: 'Company ID', defaultMatch: false, required: false, display: true, removed: true },
			{ id: 'channelId', displayName: 'Channel ID', defaultMatch: false, required: false, display: true, removed: true },
			{ id: 'responsibleUserId', displayName: 'Responsible User ID', defaultMatch: false, required: false, display: true, removed: true },
			{ id: 'useAssignmentStrategy', displayName: 'Use Assignment Strategy', defaultMatch: false, required: false, display: true, removed: true, type: 'boolean' },
			{ id: 'tracking', displayName: 'Tracking', defaultMatch: false, required: false, display: true, removed: true, type: 'object' },
		],
	};
}

export async function getPipelineOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const pipelines = await getPipelines.call(this);

	return pipelines.flatMap((pipeline) => {
		const id = getString(pipeline.id);
		const name = getString(pipeline.name);
		return id && name ? [{ name, value: id }] : [];
	});
}

export async function getStageOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const pipelineId = this.getNodeParameter('pipelineId');
	if (typeof pipelineId !== 'string' || pipelineId.length === 0) {
		return [];
	}

	const pipelines = await getPipelines.call(this);
	const pipeline = pipelines.find(({ id }) => id === pipelineId);
	if (!pipeline || !Array.isArray(pipeline.stages)) {
		return [];
	}

	return pipeline.stages.flatMap((stage) => {
		if (!isRecord(stage)) {
			return [];
		}

		const id = getString(stage.id);
		const name = getString(stage.name) ?? id;
		return id && name ? [{ name, value: id }] : [];
	});
}

export async function searchDeals(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = await this.helpers.httpRequestWithAuthentication.call(this, 'pipefacilApi', {
		method: 'GET',
		url: `${apiBaseUrl}/deals`,
		qs: { limit: 50, ...(filter ? { search: filter } : {}) },
	});

	return {
		results: getListItems(response).flatMap((deal) => {
			const sequence = getScalar(deal.seq ?? deal.sequence);
			if (!sequence) {
				return [];
			}

			const name = getString(deal.name) ?? getString(deal.contactName) ?? getString(deal.phone);
			return [{ name: name ? `${name} (#${sequence})` : `Lead #${sequence}`, value: sequence }];
		}),
	};
}

export async function getCustomDealFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	const pipelineId = this.getNodeParameter('pipelineId');
	const response = await this.helpers.httpRequestWithAuthentication.call(this, 'pipefacilApi', {
		method: 'GET',
		url: `${apiBaseUrl}/custom-fields`,
		qs: {
			entity: 'deal',
			...(typeof pipelineId === 'string' && pipelineId.length > 0 ? { pipelineId } : {}),
		},
	});

	return {
		fields: getResponseData(response).flatMap((field) => {
			const slug = getString(field.slug);
			const name = getString(field.name);
			if (!slug || !name) {
				return [];
			}

			const type = customFieldType(field.fieldType);
			const options = type === 'options' && Array.isArray(field.options)
				? field.options.flatMap((option) => {
					const mappedOption = toOption(option);
					return mappedOption ? [mappedOption] : [];
				})
				: undefined;

			return [{
				id: slug,
				displayName: name,
				defaultMatch: false,
				required: field.isRequired === true,
				display: true,
				removed: field.isRequired !== true,
				type,
				...(options ? { options } : {}),
			}];
		}),
	};
}

const createDealFields: INodeProperties[] = [
	{
		displayName: 'Pipeline Name or ID',
		name: 'pipelineId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getPipelineOptions',
		},
		displayOptions: displayOptions('deal', create),
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Stage Name or ID',
		name: 'stageId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getStageOptions',
			loadOptionsDependsOn: ['pipelineId'],
		},
		displayOptions: displayOptions('deal', create),
		routing: { send: { type: 'body', property: 'stageId' } },
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Lead Fields',
		name: 'leadFields',
		type: 'resourceMapper',
		default: { mappingMode: 'defineBelow', value: null },
		noDataExpression: true,
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: 'getDealFields',
				mode: 'add',
				addAllFields: false,
				supportAutoMap: false,
				fieldWords: { singular: 'lead field', plural: 'lead fields' },
			},
		},
		displayOptions: displayOptions('deal', create),
		description: 'Phone is required. Use Add Field to include only the standard fields you need.',
	},
	{
		displayName: 'Custom Fields',
		name: 'customFields',
		type: 'resourceMapper',
		default: { mappingMode: 'defineBelow', value: null },
		noDataExpression: true,
		typeOptions: {
			loadOptionsDependsOn: ['pipelineId'],
			resourceMapper: {
				resourceMapperMethod: 'getCustomDealFields',
				mode: 'add',
				addAllFields: false,
				supportAutoMap: false,
				fieldWords: { singular: 'custom field', plural: 'custom fields' },
			},
		},
		displayOptions: displayOptions('deal', create),
		description: 'Choose a custom field with Add Custom Field. Select fields include their available options.',
	},
];

const dealLocator = (operations: string | string[]): INodeProperties => ({
	displayName: 'Lead',
	name: 'deal',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	displayOptions: displayOptions('deal', operations),
	description: 'Choose a lead, or switch to By Sequence to use a value from another node',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: { searchListMethod: 'searchDeals', searchable: true },
		},
		{
			displayName: 'By Sequence',
			name: 'id',
			type: 'string',
			placeholder: 'For example: 123',
		},
	],
});

export const dealsDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: displayOptions('deal'),
		options: [
			{ name: 'Create', value: create, action: 'Create a deal', description: 'Create a new deal', routing: { request: { method: 'POST', url: '/deals' }, send: { preSend: [prepareCreateDealRequest] } } },
			{ name: 'Get', value: get, action: 'Get a deal', description: 'Get one lead', routing: { request: { method: 'GET', url: '=/deals/{{$parameter.deal.value}}' }, ...dataOutput() } },
			{ name: 'Get Many', value: 'getAll', action: 'Get deals', description: 'List open deals', routing: { request: { method: 'GET', url: '/deals' } } },
			{ name: 'List Custom Field Values', value: 'getCustomFieldValues', action: 'List deal custom field values', description: 'List custom field values across deal statuses', routing: { request: { method: 'GET', url: '/deals/custom-field-values' } } },
			{ name: 'Update', value: update, action: 'Update a deal', description: 'Update a deal or move it between stages', routing: { request: { method: 'PATCH', url: '=/deals/{{$parameter.deal.value}}' }, ...dataOutput() } },
			{ name: 'Add Tag', value: 'addTag', action: 'Add a deal tag', description: 'Add a tag to a deal', routing: { request: { method: 'POST', url: '=/deals/{{$parameter.deal.value}}/tags' }, ...dataOutput() } },
			{ name: 'Remove Tag', value: 'removeTag', action: 'Remove a deal tag', description: 'Remove a tag from a deal', routing: { request: { method: 'DELETE', url: '=/deals/{{$parameter.deal.value}}/tags/{{$parameter.tagId}}' } } },
			{ name: 'List Activities', value: 'getActivities', action: 'List deal activities', description: 'List a deal activity log', routing: { request: { method: 'GET', url: '=/deals/{{$parameter.deal.value}}/activities' } } },
		],
		default: 'getAll',
	},
	dealLocator([get, update, 'addTag', 'removeTag', 'getActivities']),
	pathString('deal', 'removeTag', 'tagId', 'Tag ID', 'Identifier of the tag to remove.'),
	...createDealFields,
	optionalFields('deal', update, 'updateFields', 'Fields to Update', 'Add only the values that should change.', [
		{ displayName: 'Lead Name', name: 'name', type: 'string', default: '', routing: { send: { type: 'body', property: 'name' } } },
		{ displayName: 'Value', name: 'value', type: 'number', default: 0, routing: { send: { type: 'body', property: 'value' } } },
		{ displayName: 'Currency', name: 'currency', type: 'string', default: '', routing: { send: { type: 'body', property: 'currency' } } },
		{ displayName: 'Close Probability', name: 'closeProbability', type: 'number', default: 0, typeOptions: { minValue: 0, maxValue: 100 }, routing: { send: { type: 'body', property: 'closeProbability' } } },
		{ displayName: 'Expected Close At', name: 'expectedCloseAt', type: 'dateTime', default: '', routing: { send: { type: 'body', property: 'expectedCloseAt' } } },
		{ displayName: 'Stage ID', name: 'stageId', type: 'string', default: '', routing: { send: { type: 'body', property: 'stageId' } } },
		{ displayName: 'Company ID', name: 'companyId', type: 'string', default: '', routing: { send: { type: 'body', property: 'companyId' } } },
		{ displayName: 'Responsible User ID', name: 'responsibleUserId', type: 'string', default: '', routing: { send: { type: 'body', property: 'responsibleUserId' } } },
		{ displayName: 'Co-Owner User ID', name: 'coOwnerUserId', type: 'string', default: '', routing: { send: { type: 'body', property: 'coOwnerUserId' } } },
		{ displayName: 'Lost Reason', name: 'lostReason', type: 'string', default: '', routing: { send: { type: 'body', property: 'lostReason' } } },
		{ displayName: 'Notes', name: 'notes', type: 'string', default: '', routing: { send: { type: 'body', property: 'notes' } } },
		{ displayName: 'Tag IDs', name: 'tagIds', type: 'json', default: '[]', routing: { send: { type: 'body', property: 'tagIds' } } },
		{ displayName: 'Custom Fields', name: 'customFields', type: 'json', default: '{}', routing: { send: { type: 'body', property: 'customFields' } } },
		{ displayName: 'Contact', name: 'contact', type: 'json', default: '{}', routing: { send: { type: 'body', property: 'contact' } } },
	]),
	bodyString('deal', 'addTag', 'tagId', 'Tag ID', 'Identifier of the tag to add.', { required: true }),
	...cursorPagination('deal', 'getAll'),
	...cursorPagination('deal', 'getCustomFieldValues'),
	...cursorPagination('deal', 'getActivities'),
	optionalFields('deal', 'getAll', 'filters', 'Filters', 'Add a filter only when you need to narrow the lead list.', [
		{ displayName: 'Search', name: 'search', type: 'string', default: '', routing: { send: { type: 'query', property: 'search' } } },
		{ displayName: 'Stage ID', name: 'stageId', type: 'string', default: '', routing: { send: { type: 'query', property: 'stageId' } } },
		{ displayName: 'Pipeline Sequence', name: 'pipeline', type: 'number', default: 0, routing: { send: { type: 'query', property: 'pipeline' } } },
		{ displayName: 'Returning', name: 'returning', type: 'boolean', default: false, routing: { send: { type: 'query', property: 'returning' } } },
		{ displayName: 'Created From', name: 'createdFrom', type: 'dateTime', default: '', routing: { send: { type: 'query', property: 'createdFrom' } } },
		{ displayName: 'Created To', name: 'createdTo', type: 'dateTime', default: '', routing: { send: { type: 'query', property: 'createdTo' } } },
		{ displayName: 'Source', name: 'source', type: 'string', default: '', routing: { send: { type: 'query', property: 'source' } } },
		{ displayName: 'Responsible User IDs', name: 'responsibleUserIds', type: 'string', default: '', routing: { send: { type: 'query', property: 'responsibleUserIds' } } },
		{ displayName: 'Tag IDs', name: 'tagIds', type: 'string', default: '', routing: { send: { type: 'query', property: 'tagIds' } } },
		{ displayName: 'Custom Field Filter', name: 'customFields[slug]', type: 'string', default: '', routing: { send: { type: 'query', property: 'customFields[slug]' } } },
	]),
	{
		displayName: 'Status', name: 'status', type: 'multiOptions', default: [], displayOptions: displayOptions('deal', 'getCustomFieldValues'), options: [
			{ name: 'Open', value: 'open' }, { name: 'Won', value: 'won' }, { name: 'Lost', value: 'lost' },
		], routing: { send: { type: 'query', property: 'status' } }, description: 'Statuses to include. Leave empty for every status.',
	},
	optionalFields('deal', 'getCustomFieldValues', 'customFieldValueFilters', 'Filters', 'Add filters only for incremental or scoped loads.', [
		{ displayName: 'Pipeline ID', name: 'pipelineId', type: 'string', default: '', routing: { send: { type: 'query', property: 'pipelineId' } } },
		{ displayName: 'Updated From', name: 'updatedFrom', type: 'dateTime', default: '', routing: { send: { type: 'query', property: 'updatedFrom' } } },
		{ displayName: 'Updated To', name: 'updatedTo', type: 'dateTime', default: '', routing: { send: { type: 'query', property: 'updatedTo' } } },
	]),
	optionalFields('deal', 'getActivities', 'activityFilters', 'Filters', 'Add filters only when you need a narrower activity history.', [
		{ displayName: 'Activity Type', name: 'type', type: 'string', default: '', routing: { send: { type: 'query', property: 'type' } } },
		{ displayName: 'Actor Type', name: 'actorType', type: 'string', default: '', routing: { send: { type: 'query', property: 'actorType' } } },
		{ displayName: 'Actor User ID', name: 'actorUserId', type: 'string', default: '', routing: { send: { type: 'query', property: 'actorUserId' } } },
	]),
];
