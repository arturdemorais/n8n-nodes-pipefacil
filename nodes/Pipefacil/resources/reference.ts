import type { INodeProperties } from 'n8n-workflow';
import { cursorPagination, dataOutput, displayOptions, optionalFields } from './common';

export const referenceDescription: INodeProperties[] = [
	{
		displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, displayOptions: displayOptions('reference'), options: [
			{ name: 'List Contacts', value: 'listContacts', action: 'List contacts', description: 'List contacts visible to the API key actor', routing: { request: { method: 'GET', url: '/contacts' } } },
			{ name: 'List Companies', value: 'listCompanies', action: 'List companies', description: 'List workspace companies', routing: { request: { method: 'GET', url: '/companies' }, ...dataOutput('data.content') } },
			{ name: 'List Pipelines', value: 'listPipelines', action: 'List pipelines', description: 'List active workspace pipelines', routing: { request: { method: 'GET', url: '/pipelines' }, ...dataOutput('data') } },
			{ name: 'List Tags', value: 'listTags', action: 'List tags', description: 'List workspace tags', routing: { request: { method: 'GET', url: '/tags' }, ...dataOutput('data') } },
			{ name: 'List Custom Fields', value: 'listCustomFields', action: 'List custom fields', description: 'List custom field definitions', routing: { request: { method: 'GET', url: '/custom-fields' }, ...dataOutput('data') } },
			{ name: 'List Users', value: 'listUsers', action: 'List users', description: 'List active workspace members', routing: { request: { method: 'GET', url: '/users' }, ...dataOutput('data.members') } },
		],
		default: 'listContacts',
	},
	...cursorPagination('reference', 'listContacts'),
	optionalFields('reference', 'listContacts', 'contactFilters', 'Filters', 'Add a filter only when you need to narrow the contact list.', [
		{ displayName: 'Search', name: 'search', type: 'string', default: '', routing: { send: { type: 'query', property: 'search' } } },
	]),
	optionalFields('reference', 'listCompanies', 'companyFilters', 'Filters', 'Add a filter only when you need to narrow the company list.', [
		{ displayName: 'Search', name: 'query', type: 'string', default: '', routing: { send: { type: 'query', property: 'query' } } },
		{ displayName: 'Page', name: 'page', type: 'number', default: 0, typeOptions: { minValue: 0 }, routing: { send: { type: 'query', property: 'page' } } },
		{ displayName: 'Page Size', name: 'size', type: 'number', default: 20, typeOptions: { minValue: 1, maxValue: 100 }, routing: { send: { type: 'query', property: 'size' } } },
	]),
	optionalFields('reference', 'listCustomFields', 'customFieldFilters', 'Filters', 'Add filters only when you need a scoped custom-field list.', [
		{ displayName: 'Entity', name: 'entity', type: 'string', default: '', routing: { send: { type: 'query', property: 'entity' } } },
		{ displayName: 'Pipeline ID', name: 'pipelineId', type: 'string', default: '', routing: { send: { type: 'query', property: 'pipelineId' } } },
	]),
];
