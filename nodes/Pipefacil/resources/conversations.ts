import type { INodeProperties } from 'n8n-workflow';
import { bodyString, cursorPagination, dataOutput, displayOptions, optionalFields } from './common';

export const conversationsDescription: INodeProperties[] = [
	{
		displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, displayOptions: displayOptions('conversation'), options: [
			{ name: 'Send Message', value: 'sendMessage', action: 'Send message', description: 'Send a WhatsApp message', routing: { request: { method: 'POST', url: '/conversations/messages' }, ...dataOutput() } },
			{ name: 'List Conversations', value: 'listConversations', action: 'List conversations', description: 'List visible conversations', routing: { request: { method: 'GET', url: '/conversations' } } },
			{ name: 'List Messages', value: 'listMessages', action: 'List conversation messages', description: 'List messages from a conversation', routing: { request: { method: 'GET', url: '=/conversations/{{$parameter.conversationKey}}/messages' } } },
		],
		default: 'listConversations',
	},
	bodyString('conversation', 'sendMessage', 'to', 'To', 'Recipient phone in E.164 or the workspace normalized form.', { required: true }),
	{
		displayName: 'Type', name: 'type', type: 'options', default: 'text', displayOptions: displayOptions('conversation', 'sendMessage'), options: [
			{ name: 'Audio', value: 'audio' }, { name: 'Document', value: 'document' }, { name: 'Image', value: 'image' }, { name: 'Template', value: 'template' }, { name: 'Text', value: 'text' }, { name: 'Video', value: 'video' },
		], routing: { send: { type: 'body', property: 'type' } }, description: 'Message type',
	},
	bodyString('conversation', 'sendMessage', 'text', 'Text', 'Text body. Required for a text message.'),
	optionalFields('conversation', 'sendMessage', 'messageOptions', 'Message Options', 'Add the fields required by a media, template or reply message.', [
		{ displayName: 'Channel ID', name: 'channelId', type: 'string', default: '', routing: { send: { type: 'body', property: 'channelId' } } },
		{ displayName: 'Sender Phone Number ID', name: 'senderPhoneNumberId', type: 'string', default: '', routing: { send: { type: 'body', property: 'senderPhoneNumberId' } } },
		{ displayName: 'Media Asset ID', name: 'mediaAssetId', type: 'string', default: '', routing: { send: { type: 'body', property: 'mediaAssetId' } } },
		{ displayName: 'Media Link', name: 'mediaLink', type: 'string', default: '', routing: { send: { type: 'body', property: 'mediaLink' } } },
		{ displayName: 'Caption', name: 'caption', type: 'string', default: '', routing: { send: { type: 'body', property: 'caption' } } },
		{ displayName: 'Filename', name: 'filename', type: 'string', default: '', routing: { send: { type: 'body', property: 'filename' } } },
		{ displayName: 'MIME Type', name: 'mimeType', type: 'string', default: '', routing: { send: { type: 'body', property: 'mimeType' } } },
		{ displayName: 'Template Name', name: 'templateName', type: 'string', default: '', routing: { send: { type: 'body', property: 'templateName' } } },
		{ displayName: 'Template Language Code', name: 'templateLanguageCode', type: 'string', default: '', routing: { send: { type: 'body', property: 'templateLanguageCode' } } },
		{ displayName: 'Template Components', name: 'templateComponents', type: 'json', default: '[]', routing: { send: { type: 'body', property: 'templateComponents' } } },
		{ displayName: 'Quoted Message ID', name: 'quotedMessageId', type: 'string', default: '', routing: { send: { type: 'body', property: 'quotedMessageId' } } },
	]),
	...cursorPagination('conversation', 'listConversations'),
	optionalFields('conversation', 'listConversations', 'conversationFilters', 'Filters', 'Add a filter only when you need to narrow the conversation list.', [
		{ displayName: 'Search', name: 'search', type: 'string', default: '', routing: { send: { type: 'query', property: 'search' } } },
		{ displayName: 'Inbox State', name: 'filter', type: 'string', default: '', routing: { send: { type: 'query', property: 'filter' } } },
		{ displayName: 'Responsible ID', name: 'responsibleId', type: 'string', default: '', routing: { send: { type: 'query', property: 'responsibleId' } } },
		{ displayName: 'Pipeline ID', name: 'pipelineId', type: 'string', default: '', routing: { send: { type: 'query', property: 'pipelineId' } } },
		{ displayName: 'Stage ID', name: 'stageId', type: 'string', default: '', routing: { send: { type: 'query', property: 'stageId' } } },
		{ displayName: 'Source', name: 'source', type: 'string', default: '', routing: { send: { type: 'query', property: 'source' } } },
		{ displayName: 'Channel IDs', name: 'channelIds', type: 'string', default: '', routing: { send: { type: 'query', property: 'channelIds' } } },
	]),
	{
		displayName: 'Conversation Key', name: 'conversationKey', type: 'string', required: true, default: '', displayOptions: displayOptions('conversation', 'listMessages'), description: 'Conversation key returned by the conversation list',
	},
	...cursorPagination('conversation', 'listMessages'),
	optionalFields('conversation', 'listMessages', 'messageFilters', 'Filters', 'Add filters only when you need a narrower message history.', [
		{ displayName: 'Channel ID', name: 'channelId', type: 'string', default: '', routing: { send: { type: 'query', property: 'channelId' } } },
		{ displayName: 'Since', name: 'since', type: 'dateTime', default: '', routing: { send: { type: 'query', property: 'since' } } },
	]),
];
