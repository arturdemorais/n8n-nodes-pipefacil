import type { IDataObject, ILoadOptionsFunctions, INodeListSearchResult, INodeProperties, INodePropertyOptions } from 'n8n-workflow';

export const apiBaseUrl = 'https://pipefacil-server.matchsales.com.br/api/v1';
export function record(value: unknown): value is IDataObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function rows(value: unknown): IDataObject[] {
	return Array.isArray(value) ? value.filter(record) : [];
}
export async function api(this: ILoadOptionsFunctions, path: string, qs: IDataObject = {}): Promise<IDataObject> {
	const response: unknown = await this.helpers.httpRequestWithAuthentication.call(this, 'pipefacilApi', { method: 'GET', url: `${apiBaseUrl}${path}`, qs });
	return record(response) ? response : {};
}
export function namedOptions(items: IDataObject[], key = 'id'): INodePropertyOptions[] {
	return items.flatMap((item) => typeof item[key] === 'string' || typeof item[key] === 'number'
		? [{ name: String(item.name ?? item.label ?? item[key]), value: item[key] as string | number }] : []);
}
export async function getUserOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const data = (await api.call(this, '/users')).data;
	return namedOptions(rows(record(data) ? data.members : []), 'userId');
}
export async function getPipelineSequenceOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	return namedOptions(rows((await api.call(this, '/pipelines')).data), 'seq');
}
export async function getAllStageOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const pipelines = rows((await api.call(this, '/pipelines')).data);
	const parameters = this.getCurrentNodeParameters() ?? {};
	const pipelineId = this.getCurrentNodeParameter('&pipelineId') ?? parameters.pipelineId ?? '';
	const pipelineSeq = this.getCurrentNodeParameter('&pipeline') ?? parameters.pipeline;
	return pipelines.filter((p) => (!pipelineId || p.id === pipelineId) && (!pipelineSeq || String(p.seq) === String(pipelineSeq)))
		.flatMap((p) => namedOptions(rows(p.stages)).map((stage) => ({ ...stage, name: `${p.name} → ${stage.name}` })));
}
export async function getCustomFieldOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	return namedOptions(rows((await api.call(this, '/custom-fields', { entity: 'deal' })).data), 'slug');
}
export async function getDateFieldOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	return namedOptions(rows((await api.call(this, '/custom-fields', { entity: 'deal' })).data).filter((f) => String(f.fieldType).includes('date')), 'slug');
}
export async function getCustomFilterValueOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const slug = this.getCurrentNodeParameter('&slug');
	const field = rows((await api.call(this, '/custom-fields', { entity: 'deal' })).data).find((f) => f.slug === slug);
	return rows(field?.options).filter((o) => o.inactive !== true).map((o) => ({ name: String(o.label ?? o.value), value: String(o.value) }));
}
export async function searchCompanies(this: ILoadOptionsFunctions, filter = '', paginationToken?: string): Promise<INodeListSearchResult> {
	const response = await api.call(this, '/companies', { query: filter, page: Number(paginationToken ?? 0), size: 100 });
	const data = record(response.data) ? response.data : {};
	return { results: namedOptions(rows(data.content)), ...(data.last === false ? { paginationToken: String(Number(data.number ?? 0) + 1) } : {}) };
}
export async function searchConversations(this: ILoadOptionsFunctions, filter = '', paginationToken?: string): Promise<INodeListSearchResult> {
	const response = await api.call(this, '/conversations', { search: filter, limit: 100, ...(paginationToken ? { cursor: paginationToken } : {}) });
	const data = record(response.data) ? response.data : {};
	return { results: rows(data.items).flatMap((c) => typeof c.id === 'string'
		? [{ name: `${c.displayName ?? c.phone ?? c.id}`, value: c.id }] : []),
		...(data.hasMore === true && typeof data.nextCursor === 'string' ? { paginationToken: data.nextCursor } : {}) };
}
export function choice(property: INodeProperties, method: string, multiple = false): INodeProperties {
	return { ...property, displayName: `${property.displayName.replace(/ IDs?$| Sequence$/, '')} ${multiple ? 'Names or IDs' : 'Name or ID'}`,
		type: multiple ? 'multiOptions' : 'options', default: multiple ? [] : '',
		typeOptions: { loadOptionsMethod: method },
		description: `Choose from the list, or specify ${multiple ? 'IDs' : 'an ID'} using an <a href="https://docs.n8n.io/code/expressions/">expression</a>`,
		...(multiple && property.routing?.send?.type === 'query' ? { routing: { ...property.routing, send: { ...property.routing.send, value: '={{$value.join(",")}}' } } } : {}),
	};
}

export async function searchContacts(this: ILoadOptionsFunctions, filter = '', paginationToken?: string): Promise<INodeListSearchResult> {
	const response = await api.call(this, '/contacts', { search: filter, limit: 200, ...(paginationToken ? { cursor: paginationToken } : {}) });
	const data = record(response.data) ? response.data : {};
	return { results: rows(data.items).flatMap((c) => typeof c.phone === 'string' && c.phone
		? [{ name: `${c.displayName ?? c.name ?? c.phone} (${c.phone})`, value: c.phone }] : []),
		...(data.hasMore === true && typeof data.nextCursor === 'string' ? { paginationToken: data.nextCursor } : {}) };
}
