import type { INodeProperties } from 'n8n-workflow';
import { bodyJson, bodyString, cursorPagination, dataOutput, displayOptions, stringQuery } from './common';

export const conversationsDescription: INodeProperties[] = [
	{
		displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, displayOptions: displayOptions('conversation'), options: [
			{ name: 'Send Message', value: 'sendMessage', action: 'Send a message', description: 'Send a WhatsApp message', routing: { request: { method: 'POST', url: '/conversations/messages' }, ...dataOutput() } },
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
	bodyString('conversation', 'sendMessage', 'channelId', 'Channel ID', 'Channel to send from. Takes precedence over Sender Phone Number ID.'),
	bodyString('conversation', 'sendMessage', 'senderPhoneNumberId', 'Sender Phone Number ID', 'Provider phone number ID of the sending channel.'),
	bodyString('conversation', 'sendMessage', 'mediaAssetId', 'Media Asset ID', 'Previously stored media asset identifier.'),
	bodyString('conversation', 'sendMessage', 'mediaLink', 'Media Link', 'Public URL from which the provider can fetch the media.'),
	bodyString('conversation', 'sendMessage', 'caption', 'Caption', 'Caption for media messages.'),
	bodyString('conversation', 'sendMessage', 'filename', 'Filename', 'Filename for document messages.'),
	bodyString('conversation', 'sendMessage', 'mimeType', 'MIME Type', 'MIME type of the media.'),
	bodyString('conversation', 'sendMessage', 'templateName', 'Template Name', 'Approved WhatsApp template name.'),
	bodyString('conversation', 'sendMessage', 'templateLanguageCode', 'Template Language Code', 'Language code for the template.'),
	bodyJson('conversation', 'sendMessage', 'templateComponents', 'Template Components', 'Template component values.'),
	bodyString('conversation', 'sendMessage', 'quotedMessageId', 'Quoted Message ID', 'Message identifier to reply to.'),
	...cursorPagination('conversation', 'listConversations'),
	stringQuery('conversation', 'listConversations', 'search', 'Search', 'Search conversations by contact or phone.'),
	stringQuery('conversation', 'listConversations', 'filter', 'Filter', 'Filter by inbox state, such as unread.'),
	stringQuery('conversation', 'listConversations', 'responsibleId', 'Responsible ID', 'Filter by responsible user.'),
	stringQuery('conversation', 'listConversations', 'pipelineId', 'Pipeline ID', 'Filter by pipeline.'),
	stringQuery('conversation', 'listConversations', 'stageId', 'Stage ID', 'Filter by stage.'),
	stringQuery('conversation', 'listConversations', 'source', 'Source', 'Filter by lead source.'),
	stringQuery('conversation', 'listConversations', 'channelIds', 'Channel IDs', 'Comma-separated channel identifiers.'),
	{
		displayName: 'Conversation Key', name: 'conversationKey', type: 'string', required: true, default: '', displayOptions: displayOptions('conversation', 'listMessages'), description: 'Conversation key returned by the conversation list',
	},
	...cursorPagination('conversation', 'listMessages'),
	stringQuery('conversation', 'listMessages', 'channelId', 'Channel ID', 'Restrict messages to a channel.'),
	stringQuery('conversation', 'listMessages', 'since', 'Since', 'Only messages at or after this ISO-8601 instant.'),
];
