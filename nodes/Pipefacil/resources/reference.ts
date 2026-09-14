import type { INodeProperties } from 'n8n-workflow';
import { cursorPagination, dataOutput, displayOptions, numberQuery, stringQuery } from './common';

export const referenceDescription: INodeProperties[] = [
	{
		displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, displayOptions: displayOptions('reference'), options: [
			{ name: 'List Contacts', value: 'listContacts', action: 'List contacts', description: 'List contacts visible to the API key actor', routing: { request: { method: 'GET', url: '/contacts' } } },
			{ name: 'List Companies', value: 'listCompanies', action: 'List companies', description: 'List workspace companies', routing: { request: { method: 'GET', url: '/companies' }, ...dataOutput('data.content') } },
			{ name: 'List Pipelines', value: 'listPipelines', action: 'List pipelines', description: 'List active workspace pipelines', routing: { request: { method: 'GET', url: '/pipelines' }, ...dataOutput('data') } },
			{ name: 'List Tags', value: 'listTags', action: 'List tags', description: 'List workspace tags', routing: { request: { method: 'GET', url: '/tags' }, ...dataOutput('data') } },
			{ name: 'List Custom Fields', value: 'listCustomFields', action: 'List custom fields', description: 'List custom field definitions', routing: { request: { method: 'GET', url: '/custom-fields' }, ...dataOutput('data') } },
			{ name: 'List Users', value: 'listUsers', action: 'List users', description: 'List active workspace members', routing: { request: { method: 'GET', url: '/users' }, ...dataOutput('data') } },
		],
		default: 'listContacts',
	},
	...cursorPagination('reference', 'listContacts'),
	stringQuery('reference', 'listContacts', 'search', 'Search', 'Search contacts by name or phone.'),
	{
		displayName: 'Query', name: 'query', type: 'string', default: '', displayOptions: displayOptions('reference', 'listCompanies'), routing: { send: { type: 'query', property: 'query' } }, description: 'Search companies by name or domain',
	},
	numberQuery('reference', 'listCompanies', 'page', 'Page', 0, 'Zero-based page number.'),
	{
		displayName: 'Page Size', name: 'size', type: 'number', default: 20, typeOptions: { minValue: 1, maxValue: 100 }, displayOptions: displayOptions('reference', 'listCompanies'), routing: { send: { type: 'query', property: 'size' } }, description: 'Number of companies per page',
	},
	stringQuery('reference', 'listCustomFields', 'entity', 'Entity', 'Filter by entity, for example deal or contact.'),
	stringQuery('reference', 'listCustomFields', 'pipelineId', 'Pipeline ID', 'Filter custom fields by pipeline.'),
];
