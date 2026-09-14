import type { INodeProperties } from 'n8n-workflow';

export function displayOptions(resource: string, operation?: string | string[]) {
	return {
		show: {
			resource: [resource],
			...(operation
				? { operation: Array.isArray(operation) ? operation : [operation] }
				: {}),
		},
	};
}

export function dataOutput(property = 'data'): NonNullable<INodeProperties['routing']> {
	return {
		output: {
			postReceive: [
				{
					type: 'rootProperty',
					properties: { property },
				},
			],
		},
	};
}

/**
 * Keeps infrequently used request values out of the main form. The nested
 * properties retain their individual routing, so selecting an option still
 * sends the same API parameter as before.
 */
export function optionalFields(
	resource: string,
	operation: string | string[],
	name: string,
	displayName: string,
	description: string,
	options: INodeProperties[],
): INodeProperties {
	return {
		displayName,
		name,
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: displayOptions(resource, operation),
		description,
		options,
	};
}

export function cursorPagination(
	resource: string,
	operation: string | string[],
	rootProperty = 'data.items',
): INodeProperties[] {
	const show = displayOptions(resource, operation);

	return [
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			default: 50,
			typeOptions: { minValue: 1, maxValue: 200 },
			displayOptions: {
				...show,
				show: { ...show.show, returnAll: [false] },
			},
			routing: {
				send: { type: 'query', property: 'limit' },
				output: {
					postReceive: [
						{ type: 'rootProperty', properties: { property: rootProperty } },
						{ type: 'limit', properties: { maxResults: '={{$value}}' } },
					],
				},
			},
			description: 'Max number of results to return',
		},
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			displayOptions: show,
			routing: {
				send: { paginate: '={{$value}}' },
				operations: {
					pagination: {
						type: 'generic',
						properties: {
							continue: '={{$response.body.data.hasMore}}',
							request: {
								qs: { cursor: '={{$response.body.data.nextCursor}}' },
							},
						},
					},
				},
				output: {
					postReceive: [{ type: 'rootProperty', properties: { property: rootProperty } }],
				},
			},
			description: 'Whether to return all results or only up to a given limit',
		},
	];
}

export function stringQuery(
	resource: string,
	operation: string | string[],
	name: string,
	displayName: string,
	description: string,
	defaultValue = '',
): INodeProperties {
	return {
		displayName,
		name,
		type: 'string',
		default: defaultValue,
		displayOptions: displayOptions(resource, operation),
		routing: { send: { type: 'query', property: name } },
		description,
	};
}

export function numberQuery(
	resource: string,
	operation: string | string[],
	name: string,
	displayName: string,
	defaultValue: number,
	description: string,
): INodeProperties {
	return {
		displayName,
		name,
		type: 'number',
		default: defaultValue,
		displayOptions: displayOptions(resource, operation),
		routing: { send: { type: 'query', property: name } },
		description,
	};
}

export function bodyString(
	resource: string,
	operation: string | string[],
	name: string,
	displayName: string,
	description: string,
	options: Partial<INodeProperties> = {},
): INodeProperties {
	return {
		displayName,
		name,
		type: 'string',
		default: '',
		displayOptions: displayOptions(resource, operation),
		routing: { send: { type: 'body', property: name } },
		description,
		...options,
	};
}

export function bodyJson(
	resource: string,
	operation: string | string[],
	name: string,
	displayName: string,
	description: string,
	options: Partial<INodeProperties> = {},
): INodeProperties {
	return {
		displayName,
		name,
		type: 'json',
		default: '{}',
		displayOptions: displayOptions(resource, operation),
		routing: { send: { type: 'body', property: name } },
		description,
		...options,
	};
}

export function pathString(
	resource: string,
	operation: string | string[],
	name: string,
	pathLabel: string,
	description: string,
	): INodeProperties {
	return {
		displayName: pathLabel,
		name,
		type: 'string',
		default: '',
		required: true,
		displayOptions: displayOptions(resource, operation),
		description,
	};
}
