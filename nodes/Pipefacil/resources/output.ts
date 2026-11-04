import type {
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';
import { record } from './choices';

const fields: Record<string, string[]> = {
	deal: ['id', 'seq', 'name', 'value', 'currency', 'status', 'stageId', 'pipelineId', 'contactId', 'contact'],
	contact: ['id', 'displayName', 'firstName', 'lastName', 'phone', 'email', 'blocked', 'isInternal', 'instagramUsername', 'notes'],
	customField: ['id', 'name', 'slug', 'entityType', 'fieldType', 'isRequired', 'options', 'config', 'visibilityRule'],
	conversation: ['id', 'displayName', 'phone', 'closed', 'unreadCount', 'responsibleUserId', 'lastMessageText', 'channelId', 'lastMessageAt', 'updatedAt'],
	note: ['id', 'content', 'attachments', 'createdAt', 'updatedAt', 'authorName', 'dealId'],
	task: ['id', 'title', 'description', 'dueAt', 'status', 'categoryName', 'assignee', 'dealId', 'doneAt'],
	reference: ['id', 'name'],
};
const messageFields = ['id', 'conversationId', 'body', 'type', 'direction', 'status', 'timestamp', 'senderPhone', 'recipientPhone', 'media'];
function fieldsFor(resource: string, operation: string): string[] {
	if (resource === 'conversation' && operation !== 'listConversations') return messageFields;
	if (resource === 'reference') {
		if (operation === 'listContacts') return fields.contact;
		if (operation === 'listCustomFields') return fields.customField;
		if (operation === 'listUsers') return ['id', 'userId', 'name', 'email', 'role', 'image'];
		if (operation === 'listPipelines') return ['id', 'seq', 'name', 'stages'];
		if (operation === 'listTags') return ['id', 'name', 'color'];
		if (operation === 'listCompanies') return ['id', 'name', 'email', 'phone', 'website', 'createdAt', 'updatedAt'];
	}
	return fields[resource] ?? [];
}

export function projectOutput(
	items: INodeExecutionData[],
	resource: string,
	operation: string,
	mode: string,
	selected: string[] = [],
): INodeExecutionData[] {
	if (mode === 'raw') return items;
	const names = mode === 'selected' ? selected : fieldsFor(resource, operation);
	return items.map((item) => {
		// Deal creation retains its API envelope for compatibility in raw mode.
		const data = item.json.data;
		const source = resource === 'deal' && operation === 'create' && record(data)
			? data : item.json;
		const identifiers = ['id', 'seq', 'key', 'userId'].filter((name) => source[name] !== undefined);
		const keys = [...new Set([...identifiers, ...names])];
		return { ...item, json: Object.fromEntries(keys.filter((name) => source[name] !== undefined).map((name) => [name, source[name]])) };
	});
}

async function simplifyOutput(this: IExecuteSingleFunctions, items: INodeExecutionData[]): Promise<INodeExecutionData[]> {
	return projectOutput(items, String(this.getNodeParameter('resource')), String(this.getNodeParameter('operation')),
		this.getNodeParameter('simplify', false) ? 'simplified' : 'raw');
}

async function toolOutput(this: IExecuteSingleFunctions, items: INodeExecutionData[]): Promise<INodeExecutionData[]> {
	return projectOutput(items, String(this.getNodeParameter('resource')), String(this.getNodeParameter('operation')),
		String(this.getNodeParameter('output', 'raw')), this.getNodeParameter('outputFields', []) as string[]);
}

export async function getOutputFieldOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	return fieldsFor(String(this.getNodeParameter('resource')), String(this.getNodeParameter('operation'))).map((name) => ({ name, value: name }));
}

// Keep upload receipts and deletion confirmations intact.
const show = { resource: Object.keys(fields) };
const hide = { operation: ['delete', 'removeAvatar', 'removeTag', 'addTag', 'uploadAttachment', 'getActivities', 'getCustomFieldValues'] };

export const outputProperties: INodeProperties[] = [
	{
		displayName: 'Simplify', name: 'simplify', type: 'boolean', default: false,
		description: 'Whether to return a simplified version of the response instead of the raw data',
		displayOptions: { show: { ...show, '@tool': [false] }, hide },
		routing: { output: { postReceive: [simplifyOutput] } },
	},
	{
		displayName: 'Output', name: 'output', type: 'options', default: 'raw',
		options: [
			{ name: 'Raw', value: 'raw', description: 'Return all response fields' },
			{ name: 'Selected Fields', value: 'selected', description: 'Return selected fields and record identifiers' },
			{ name: 'Simplified', value: 'simplified', description: 'Return the most useful response fields' },
		],
		displayOptions: { show: { ...show, '@tool': [true] }, hide },
		routing: { output: { postReceive: [toolOutput] } },
	},
	{
		displayName: 'Output Field Names or IDs', name: 'outputFields', type: 'multiOptions', default: [],
		typeOptions: { loadOptionsMethod: 'getOutputFieldOptions', loadOptionsDependsOn: ['resource', 'operation'] },
		description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		displayOptions: { show: { ...show, '@tool': [true], output: ['selected'] }, hide },
	},
];
