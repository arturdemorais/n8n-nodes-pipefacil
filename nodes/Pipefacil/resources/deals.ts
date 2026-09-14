import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeProperties,
	INodePropertyOptions,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';
import { bodyJson, bodyString, cursorPagination, dataOutput, displayOptions, numberQuery, pathString, stringQuery } from './common';

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

export const dealsDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: displayOptions('deal'),
		options: [
			{ name: 'Create', value: create, action: 'Create a deal', description: 'Create a new deal', routing: { request: { method: 'POST', url: '/deals' }, send: { preSend: [prepareCreateDealRequest] } } },
			{ name: 'Get', value: get, action: 'Get a deal', description: 'Get one deal by sequence', routing: { request: { method: 'GET', url: '=/deals/{{$parameter.dealSeq}}' }, ...dataOutput() } },
			{ name: 'Get Many', value: 'getAll', action: 'Get deals', description: 'List open deals', routing: { request: { method: 'GET', url: '/deals' } } },
			{ name: 'List Custom Field Values', value: 'getCustomFieldValues', action: 'List deal custom field values', description: 'List custom field values across deal statuses', routing: { request: { method: 'GET', url: '/deals/custom-field-values' } } },
			{ name: 'Update', value: update, action: 'Update a deal', description: 'Update a deal or move it between stages', routing: { request: { method: 'PATCH', url: '=/deals/{{$parameter.dealSeq}}' }, ...dataOutput() } },
			{ name: 'Add Tag', value: 'addTag', action: 'Add a deal tag', description: 'Add a tag to a deal', routing: { request: { method: 'POST', url: '=/deals/{{$parameter.dealSeq}}/tags' }, ...dataOutput() } },
			{ name: 'Remove Tag', value: 'removeTag', action: 'Remove a deal tag', description: 'Remove a tag from a deal', routing: { request: { method: 'DELETE', url: '=/deals/{{$parameter.dealSeq}}/tags/{{$parameter.tagId}}' } } },
			{ name: 'List Activities', value: 'getActivities', action: 'List deal activities', description: 'List a deal activity log', routing: { request: { method: 'GET', url: '=/deals/{{$parameter.dealSeq}}/activities' } } },
		],
		default: 'getAll',
	},
	pathString('deal', [get, update, 'addTag', 'removeTag', 'getActivities'], 'dealSeq', 'Deal Sequence', 'Workspace-scoped deal sequence.'),
	pathString('deal', 'removeTag', 'tagId', 'Tag ID', 'Identifier of the tag to remove.'),
	...createDealFields,
	bodyString('deal', update, 'name', 'Deal Name', 'New deal name.'),
	bodyString('deal', update, 'value', 'Value', 'New monetary value.', { type: 'number', default: 0 }),
	bodyString('deal', update, 'currency', 'Currency', 'ISO currency code.'),
	bodyString('deal', update, 'closeProbability', 'Close Probability', 'Probability from 0 to 100.', { type: 'number', default: 0 }),
	bodyString('deal', update, 'expectedCloseAt', 'Expected Close At', 'Expected closing date and time in ISO-8601 format.'),
	bodyString('deal', update, 'stageId', 'Stage ID', 'Move the deal to this pipeline stage.'),
	bodyString('deal', update, 'companyId', 'Company ID', 'Company identifier associated with the deal.'),
	bodyString('deal', update, 'responsibleUserId', 'Responsible User ID', 'New responsible user.'),
	bodyString('deal', update, 'coOwnerUserId', 'Co-owner User ID', 'New co-owner user.'),
	bodyString('deal', update, 'lostReason', 'Lost Reason', 'Required when moving the deal to a lost stage.'),
	bodyString('deal', update, 'notes', 'Notes', 'New notes for the deal.'),
	bodyJson('deal', update, 'tagIds', 'Tag IDs', 'Array of tag identifiers to associate with the deal.'),
	bodyJson('deal', update, 'customFields', 'Custom Fields', 'Custom field values keyed by field slug.'),
	bodyJson('deal', update, 'contact', 'Contact', 'Contact fields to update.'),
	bodyString('deal', 'addTag', 'tagId', 'Tag ID', 'Identifier of the tag to add.', { required: true }),
	...cursorPagination('deal', 'getAll'),
	...cursorPagination('deal', 'getCustomFieldValues'),
	...cursorPagination('deal', 'getActivities'),
	stringQuery('deal', 'getAll', 'stageId', 'Stage ID', 'Filter by stage identifier.'),
	numberQuery('deal', 'getAll', 'pipeline', 'Pipeline Sequence', 0, 'Filter by workspace-scoped pipeline sequence.'),
	{
		displayName: 'Returning', name: 'returning', type: 'boolean', default: false, displayOptions: displayOptions('deal', 'getAll'),
		routing: { send: { type: 'query', property: 'returning' } }, description: 'Whether to filter returning deals',
	},
	stringQuery('deal', 'getAll', 'createdFrom', 'Created From', 'Filter from date in yyyy-MM-dd format.'),
	stringQuery('deal', 'getAll', 'createdTo', 'Created To', 'Filter through date in yyyy-MM-dd format.'),
	stringQuery('deal', 'getAll', 'source', 'Source', 'Filter by deal source slug.'),
	stringQuery('deal', 'getAll', 'responsibleUserIds', 'Responsible User IDs', 'Comma-separated responsible user identifiers.'),
	stringQuery('deal', 'getAll', 'tagIds', 'Tag IDs', 'Comma-separated tag identifiers.'),
	stringQuery('deal', 'getAll', 'search', 'Search', 'Search in deal, contact or phone.'),
	stringQuery('deal', 'getAll', 'customFields[slug]', 'Custom Field Filter', 'Filter by a custom field value, using the field slug in the parameter name.'),
	{
		displayName: 'Status', name: 'status', type: 'multiOptions', default: [], displayOptions: displayOptions('deal', 'getCustomFieldValues'), options: [
			{ name: 'Open', value: 'open' }, { name: 'Won', value: 'won' }, { name: 'Lost', value: 'lost' },
		], routing: { send: { type: 'query', property: 'status' } }, description: 'Statuses to include. Leave empty for every status.',
	},
	stringQuery('deal', 'getCustomFieldValues', 'pipelineId', 'Pipeline ID', 'Filter by pipeline identifier.'),
	stringQuery('deal', 'getCustomFieldValues', 'updatedFrom', 'Updated From', 'Incremental-load lower bound as an ISO instant or yyyy-MM-dd.'),
	stringQuery('deal', 'getCustomFieldValues', 'updatedTo', 'Updated To', 'Exclusive upper bound as an ISO instant or yyyy-MM-dd.'),
	{
		displayName: 'Activity Type', name: 'type', type: 'string', default: '', displayOptions: displayOptions('deal', 'getActivities'), routing: { send: { type: 'query', property: 'type' } }, description: 'Comma-separated activity type filters',
	},
	{
		displayName: 'Actor Type', name: 'actorType', type: 'string', default: '', displayOptions: displayOptions('deal', 'getActivities'), routing: { send: { type: 'query', property: 'actorType' } }, description: 'Comma-separated actor type filters',
	},
	stringQuery('deal', 'getActivities', 'actorUserId', 'Actor User ID', 'Filter by actor user identifier.'),
];
