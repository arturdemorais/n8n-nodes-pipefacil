import type { IDataObject, IExecuteSingleFunctions, IHttpRequestOptions, ILoadOptionsFunctions, INodeListSearchResult, INodeProperties } from 'n8n-workflow';
import { api, apiBaseUrl, record, rows } from './choices';
import { cursorPagination, dataOutput, displayOptions, optionalFields } from './common';
import { prepareFileUpload } from './notes';

const digits = (value: unknown) => String(value ?? '').replace(/\D/g, '');
const label = (name: string) => name.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

export async function searchContactRecords(this: ILoadOptionsFunctions, filter = '', paginationToken?: string): Promise<INodeListSearchResult> {
	const response = await api.call(this, '/contacts', { search: filter, limit: 100, ...(paginationToken ? { cursor: paginationToken } : {}) });
	const data = record(response.data) ? response.data : {};
	return { results: rows(data.items).flatMap((c) => typeof c.id === 'string'
		? [{ name: `${c.displayName ?? c.name ?? c.phone ?? c.id}${c.phone ? ` (${c.phone})` : ''}`, value: c.id }] : []),
		...(data.hasMore === true && typeof data.nextCursor === 'string' ? { paginationToken: data.nextCursor } : {}) };
}

/** Finds the contact whose phone matches, tolerating formatting and a missing country code. */
export async function findContactIdByPhone(this: IExecuteSingleFunctions, phone: string): Promise<string> {
	const wanted = digits(phone);
	if (wanted.length < 8) throw new Error(`"${phone}" is not a valid phone number`);
	const response: unknown = await this.helpers.httpRequestWithAuthentication.call(this, 'pipefacilApi', { method: 'GET', url: `${apiBaseUrl}/contacts`, qs: { search: wanted, limit: 50 } });
	const items = rows(record(response) && record(response.data) ? response.data.items : []);
	const exact = items.filter((c) => digits(c.phone) === wanted);
	const similar = exact.length ? exact : items.filter((c) => { const own = digits(c.phone); return own.length >= 8 && (own.endsWith(wanted) || wanted.endsWith(own)); });
	if (similar.length !== 1 || typeof similar[0].id !== 'string') {
		throw new Error(similar.length ? `More than one contact matches phone ${phone}; choose the contact from the list` : `No contact found with phone ${phone}`);
	}
	return similar[0].id;
}

export function contactPath(suffix = '') {
	return async function (this: IExecuteSingleFunctions, options: IHttpRequestOptions): Promise<IHttpRequestOptions> {
		const locator = this.getNodeParameter('contact') as IDataObject;
		const value = String(locator.value ?? '').trim();
		if (!value) throw new Error('Choose a contact');
		const id = locator.mode === 'phone' ? await findContactIdByPhone.call(this, value) : value;
		options.url = `/contacts/${encodeURIComponent(id)}${suffix}`;
		return options;
	};
}

const deleted = { output: { postReceive: [{ type: 'set' as const, properties: { value: '={{ { "deleted": true } }}' } }] } };
const textFields = ['firstName', 'lastName', 'email', 'instagramUsername'];
const contactText = (names: string[]): INodeProperties[] => names.map((name) => ({
	displayName: label(name), name, type: 'string', default: '',
	...(name === 'email' ? { placeholder: 'name@email.com' } : {}),
	...(name === 'instagramUsername' ? { description: 'Username without the @' } : {}),
	routing: { send: { type: 'body', property: name } },
}));
const notes: INodeProperties = { displayName: 'Notes', name: 'notes', type: 'string', default: '', typeOptions: { rows: 3 }, description: 'Up to 2000 characters', routing: { send: { type: 'body', property: 'notes' } } };
const internal: INodeProperties = { displayName: 'Is Internal', name: 'isInternal', type: 'boolean', default: false, description: 'Whether this is a team member or partner instead of a customer', routing: { send: { type: 'body', property: 'isInternal' } } };
const filter = (name: string, displayName: string, description: string): INodeProperties => ({ displayName, name, type: 'boolean', default: true, description, routing: { send: { type: 'query', property: name } } });

export const contactsDescription: INodeProperties[] = [
	{
		displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, displayOptions: displayOptions('contact'), default: 'create', options: [
			{ name: 'Create', value: 'create', action: 'Create a contact', description: 'Create a contact identified by its phone', routing: { request: { method: 'POST', url: '/contacts' }, ...dataOutput() } },
			{ name: 'Delete', value: 'delete', action: 'Delete a contact', description: 'Anonymize and delete a contact, keeping the lead history', routing: { request: { method: 'DELETE', url: '/contacts' }, send: { preSend: [contactPath()] }, ...deleted } },
			{ name: 'Get', value: 'get', action: 'Get a contact', routing: { request: { method: 'GET', url: '/contacts' }, send: { preSend: [contactPath()] }, ...dataOutput() } },
			{ name: 'Get Many', value: 'getAll', action: 'Get many contacts', routing: { request: { method: 'GET', url: '/contacts' } } },
			{ name: 'Remove Photo', value: 'removeAvatar', action: 'Remove a contact photo', routing: { request: { method: 'DELETE', url: '/contacts' }, send: { preSend: [contactPath('/avatar')] }, ...deleted } },
			{ name: 'Update', value: 'update', action: 'Update a contact', description: 'Change only the selected contact details', routing: { request: { method: 'PATCH', url: '/contacts' }, send: { preSend: [contactPath()] }, ...dataOutput() } },
			{ name: 'Upload Photo', value: 'uploadAvatar', action: 'Upload a contact photo', description: 'Set the contact photo from a JPEG, PNG or WebP file up to 5 MB', routing: { request: { method: 'POST', url: '/contacts' }, send: { preSend: [contactPath('/avatar'), prepareFileUpload] }, ...dataOutput() } },
		],
	},
	{
		displayName: 'Contact', name: 'contact', type: 'resourceLocator', default: { mode: 'list', value: '' }, required: true,
		displayOptions: displayOptions('contact', ['delete', 'get', 'removeAvatar', 'update', 'uploadAvatar']),
		description: 'Search the contact by name or phone, or switch to By Phone to use a phone from another node',
		modes: [
			{ displayName: 'From List', name: 'list', type: 'list', typeOptions: { searchListMethod: 'searchContactRecords', searchable: true } },
			{ displayName: 'By Phone', name: 'phone', type: 'string', placeholder: '5585999999999' },
			{ displayName: 'By ID', name: 'id', type: 'string' },
		],
	},
	{
		displayName: 'Phone', name: 'phone', type: 'string', default: '', required: true, placeholder: '5585999999999',
		displayOptions: displayOptions('contact', 'create'), description: 'Phone that identifies the contact. A phone already used in the workspace is rejected.',
		routing: { send: { type: 'body', property: 'phone' } },
	},
	optionalFields('contact', 'create', 'contactFields', 'Additional Fields', 'Add only the details you need.', [...contactText(textFields), internal, notes]),
	optionalFields('contact', 'update', 'contactUpdateFields', 'Update Fields', 'Change only the details you add. Leave a text empty to clear it.', [
		...contactText(textFields),
		{ displayName: 'Blocked', name: 'blocked', type: 'boolean', default: false, description: 'Whether the contact is blocked', routing: { send: { type: 'body', property: 'blocked' } } },
		internal, notes,
		{ displayName: 'Phone', name: 'phone', type: 'string', default: '', placeholder: '5585999999999', routing: { send: { type: 'body', property: 'phone' } } },
	]),
	{
		displayName: 'Input Binary Field', name: 'binaryProperty', type: 'string', default: 'data', required: true,
		displayOptions: displayOptions('contact', 'uploadAvatar'), description: 'Name of the input binary field containing the photo',
	},
	...cursorPagination('contact', 'getAll'),
	optionalFields('contact', 'getAll', 'contactListFilters', 'Filters', 'Add filters only when you need to narrow the list.', [
		filter('blocked', 'Blocked', 'Whether to return only blocked contacts, or only unblocked ones when off'),
		filter('hasConversation', 'Has Conversation', 'Whether to return only contacts with a conversation, or only those without one when off'),
		filter('hasDeal', 'Has Lead', 'Whether to return only contacts linked to a lead, or only those without one when off'),
		filter('hasEmail', 'Has Email', 'Whether to return only contacts with an email, or only those without one when off'),
		filter('internal', 'Is Internal', 'Whether to return only internal contacts, or only customers when off'),
		{ displayName: 'Search', name: 'search', type: 'string', default: '', description: 'Name, phone or email', routing: { send: { type: 'query', property: 'search' } } },
	]),
];
