import type { INodeProperties } from 'n8n-workflow';
import { bodyJson, bodyString, dataOutput, displayOptions, optionalFields, pathString, stringQuery } from './common';

export const calendarDescription: INodeProperties[] = [
	{
		displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, displayOptions: displayOptions('calendar'), options: [
			{ name: 'List Events', value: 'listEvents', action: 'List calendar events', description: 'List calendar items in a time window', routing: { request: { method: 'GET', url: '/calendar/events' }, ...dataOutput('data.items') } },
			{ name: 'Create Meeting', value: 'createMeeting', action: 'Create a meeting', description: 'Create a native calendar meeting', routing: { request: { method: 'POST', url: '/calendar/events' }, ...dataOutput() } },
			{ name: 'Get Meeting', value: 'getMeeting', action: 'Get a meeting', description: 'Get one native meeting', routing: { request: { method: 'GET', url: '=/calendar/events/{{$parameter.eventId}}' }, ...dataOutput() } },
			{ name: 'Update Meeting', value: 'updateMeeting', action: 'Update a meeting', description: 'Update a native meeting', routing: { request: { method: 'PATCH', url: '=/calendar/events/{{$parameter.eventId}}' }, ...dataOutput() } },
			{ name: 'Delete Meeting', value: 'deleteMeeting', action: 'Delete a meeting', description: 'Delete a native meeting', routing: { request: { method: 'DELETE', url: '=/calendar/events/{{$parameter.eventId}}' } } },
		],
		default: 'listEvents',
	},
	stringQuery('calendar', 'listEvents', 'timeMin', 'Time Min', 'Window start as an ISO-8601 UTC instant.'),
	stringQuery('calendar', 'listEvents', 'timeMax', 'Time Max', 'Window end as an ISO-8601 UTC instant. Maximum 400 days after Time Min.'),
	optionalFields('calendar', 'listEvents', 'eventFilters', 'Filters', 'Add filters only when you need to narrow the event list.', [
		{ displayName: 'Member ID', name: 'memberId', type: 'string', default: '', routing: { send: { type: 'query', property: 'memberId' } } },
		{ displayName: 'Provider', name: 'provider', type: 'multiOptions', default: [], options: [{ name: 'Native', value: 'native' }, { name: 'Google', value: 'google' }], routing: { send: { type: 'query', property: 'provider' } } },
		{ displayName: 'Kind', name: 'kind', type: 'multiOptions', default: [], options: [{ name: 'Meeting', value: 'meeting' }, { name: 'Task', value: 'task' }, { name: 'Cadence Task', value: 'cadence_task' }], routing: { send: { type: 'query', property: 'kind' } } },
	]),
	pathString('calendar', ['getMeeting', 'updateMeeting', 'deleteMeeting'], 'eventId', 'Event ID', "Event identifier in provider:kind:id form, for example native:meeting:5f2c…."),
	bodyString('calendar', 'createMeeting', 'summary', 'Summary', 'Meeting title.', { required: true }),
	bodyString('calendar', 'updateMeeting', 'summary', 'Summary', 'New meeting title.'),
	bodyString('calendar', ['createMeeting', 'updateMeeting'], 'description', 'Description', 'Meeting description.'),
	bodyString('calendar', ['createMeeting', 'updateMeeting'], 'location', 'Location', 'Meeting location.'),
	bodyJson('calendar', 'createMeeting', 'start', 'Start', 'Event start as { date } or { dateTime, timeZone }.', { required: true }),
	bodyJson('calendar', 'updateMeeting', 'start', 'Start', 'New event start as { date } or { dateTime, timeZone }.'),
	bodyJson('calendar', 'createMeeting', 'end', 'End', 'Event end as { date } or { dateTime, timeZone }.', { required: true }),
	bodyJson('calendar', 'updateMeeting', 'end', 'End', 'New event end as { date } or { dateTime, timeZone }.'),
	{
		displayName: 'All Day', name: 'allDay', type: 'boolean', default: false, displayOptions: displayOptions('calendar', ['createMeeting', 'updateMeeting']), routing: { send: { type: 'body', property: 'allDay' } }, description: 'Whether this is an all-day event',
	},
	bodyString('calendar', ['createMeeting', 'updateMeeting'], 'status', 'Status', 'Event status, such as confirmed, tentative or cancelled.'),
	bodyJson('calendar', ['createMeeting', 'updateMeeting'], 'attendees', 'Attendees', 'Array of attendees, each with type member/contact and its identifier.'),
	bodyJson('calendar', ['createMeeting', 'updateMeeting'], 'extendedProperties', 'Extended Properties', 'Additional event properties.'),
	{
		displayName: 'Sync to Google', name: 'syncToGoogle', type: 'boolean', default: false, displayOptions: displayOptions('calendar', 'createMeeting'), routing: { send: { type: 'body', property: 'syncToGoogle' } }, description: 'Whether to mirror the meeting on the owner’s Google Calendar',
	},
	{
		displayName: 'Create Conference', name: 'createConference', type: 'boolean', default: false, displayOptions: displayOptions('calendar', 'createMeeting'), routing: { send: { type: 'body', property: 'createConference' } }, description: 'Whether to ask Google to create a Meet link; this implies Sync to Google',
	},
	{
		displayName: 'Record with Bot', name: 'recordWithBot', type: 'boolean', default: false, displayOptions: displayOptions('calendar', ['createMeeting', 'updateMeeting']), routing: { send: { type: 'body', property: 'recordWithBot' } }, description: 'Whether to arm the recording bot for a Google Meet or Microsoft Teams link',
	},
	bodyString('calendar', ['createMeeting', 'updateMeeting'], 'conferenceUrl', 'Conference URL', 'Existing Google Meet or Microsoft Teams link.'),
];
