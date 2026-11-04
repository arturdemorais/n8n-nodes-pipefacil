import type { INodeProperties } from 'n8n-workflow';
import { bodyString, dataOutput, displayOptions, optionalFields } from './common';
import { dealLocator } from './deals';

export const tasksDescription: INodeProperties[] = [
	{
		displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
		displayOptions: displayOptions('task'), default: 'create', options: [
			{ name: 'Create', value: 'create', action: 'Create task', description: 'Create a pending task linked to a lead', routing: { request: { method: 'POST', url: '=/deals/{{$parameter.deal.value}}/tasks' }, ...dataOutput() } },
		],
	},
	dealLocator('create', 'task'),
	bodyString('task', 'create', 'title', 'Title', 'Task title, up to 500 characters', { required: true }),
	{
		displayName: 'Due At', name: 'dueAt', type: 'dateTime', default: '', required: true,
		displayOptions: displayOptions('task', 'create'), description: 'Due date and time in ISO 8601 format',
		routing: { send: { type: 'body', property: 'dueAt' } },
	},
	optionalFields('task', 'create', 'taskOptions', 'Additional Fields', 'Set the description, assignee or category.', [
		{ displayName: 'Assignee User ID', name: 'assigneeUserId', type: 'string', default: '', description: 'Active user ID from Reference → List Users. Defaults to the API key member.', routing: { send: { type: 'body', property: 'assigneeUserId' } } },
		{ displayName: 'Category', name: 'category', type: 'options', default: 'outro', options: [
			{ name: 'Call', value: 'ligacao' }, { name: 'Email', value: 'email' }, { name: 'Follow Up', value: 'follow_up' }, { name: 'Meeting', value: 'reuniao' }, { name: 'Other', value: 'outro' },
		], routing: { send: { type: 'body', property: 'category' } } },
		{ displayName: 'Category ID', name: 'categoryId', type: 'string', default: '', description: 'Workspace category ID or system key. Takes precedence over Category.', routing: { send: { type: 'body', property: 'categoryId' } } },
		{ displayName: 'Description', name: 'description', type: 'string', default: '', typeOptions: { rows: 4 }, description: 'Task description, up to 2000 characters', routing: { send: { type: 'body', property: 'description' } } },
	]),
];
