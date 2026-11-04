import type { IExecuteSingleFunctions, IHttpRequestOptions, INodeProperties } from 'n8n-workflow';
import { bodyString, dataOutput, displayOptions, optionalFields } from './common';
import { dealLocator } from './deals';

export async function prepareFileUpload(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const property = this.getNodeParameter('binaryProperty') as string;
	const file = this.helpers.assertBinaryData(property);
	const buffer = await this.helpers.getBinaryDataBuffer(property);
	let boundary = 'n8nPipefacilBoundary';
	while (buffer.includes(boundary)) boundary += 'X';
	const filename = (file.fileName ?? 'upload').replace(/[\r\n"\\]/g, '_');
	const mimeType = (file.mimeType ?? 'application/octet-stream').replace(/[\r\n]/g, '');
	requestOptions.headers = { ...requestOptions.headers, 'Content-Type': `multipart/form-data; boundary=${boundary}` };
	requestOptions.body = Buffer.concat([
		Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`),
		buffer,
		Buffer.from(`\r\n--${boundary}--\r\n`),
	]);
	return requestOptions;
}

export const notesDescription: INodeProperties[] = [
	{
		displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
		displayOptions: displayOptions('note'), default: 'create', options: [
			{ name: 'Create', value: 'create', action: 'Create note', description: 'Create a lead note with text, uploaded attachments or both', routing: { request: { method: 'POST', url: '=/deals/{{$parameter.deal.value}}/notes' }, ...dataOutput() } },
			{ name: 'Upload Attachment', value: 'uploadAttachment', action: 'Upload note attachment', description: 'Upload a file and return its receipt for creating a note', routing: { request: { method: 'POST', url: '=/deals/{{$parameter.deal.value}}/notes/attachments' }, send: { preSend: [prepareFileUpload] }, ...dataOutput() } },
		],
	},
	dealLocator(['create', 'uploadAttachment'], 'note'),
	bodyString('note', 'create', 'content', 'Content', 'Note text, up to 10000 characters. Provide text, attachments or both.', { typeOptions: { rows: 4 } }),
	optionalFields('note', 'create', 'noteOptions', 'Additional Fields', 'Add uploaded attachment receipts to the note.', [
		{ displayName: 'Attachments', name: 'attachments', type: 'json', default: '[]', description: 'Array of up to 10 unchanged receipts from Upload Attachment for this lead', routing: { send: { type: 'body', property: 'attachments' } } },
	]),
	{
		displayName: 'Input Binary Field', name: 'binaryProperty', type: 'string', default: 'data', required: true,
		displayOptions: displayOptions('note', 'uploadAttachment'), description: 'Name of the input binary field containing the file to upload',
	},
];
