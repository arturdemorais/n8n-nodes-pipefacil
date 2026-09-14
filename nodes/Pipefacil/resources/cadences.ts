import type { INodeProperties } from 'n8n-workflow';
import { bodyString, cursorPagination, dataOutput, displayOptions, optionalFields, pathString } from './common';

export const cadencesDescription: INodeProperties[] = [
	{
		displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, displayOptions: displayOptions('cadence'), options: [
			{ name: 'List Cadences', value: 'listCadences', action: 'List cadences', description: 'List active cadence routines', routing: { request: { method: 'GET', url: '/cadences' }, ...dataOutput() } },
			{ name: 'List Enrollments', value: 'listEnrollments', action: 'List cadence enrollments', description: 'List deals enrolled in a cadence', routing: { request: { method: 'GET', url: '=/cadences/{{$parameter.cadenceId}}/enrollments' } } },
			{ name: 'Get Deal Cadence', value: 'getDealCadence', action: 'Get deal cadence', description: 'Get cadence state for a deal', routing: { request: { method: 'GET', url: '=/deals/{{$parameter.dealSeq}}/cadence' }, ...dataOutput() } },
			{ name: 'Enroll Deal', value: 'enrollDeal', action: 'Enroll deal in a cadence', description: 'Enroll a deal in an active cadence', routing: { request: { method: 'POST', url: '=/deals/{{$parameter.dealSeq}}/cadence/enroll' }, ...dataOutput() } },
			{ name: 'Unenroll Deal', value: 'unenrollDeal', action: 'Unenroll deal from a cadence', description: 'Stop the deal cadence', routing: { request: { method: 'POST', url: '=/deals/{{$parameter.dealSeq}}/cadence/unenroll' }, ...dataOutput() } },
			{ name: 'Pause Deal', value: 'pauseDeal', action: 'Pause a deal cadence', description: 'Pause the deal cadence', routing: { request: { method: 'POST', url: '=/deals/{{$parameter.dealSeq}}/cadence/pause' }, ...dataOutput() } },
			{ name: 'Resume Deal', value: 'resumeDeal', action: 'Resume a deal cadence', description: 'Resume the deal cadence', routing: { request: { method: 'POST', url: '=/deals/{{$parameter.dealSeq}}/cadence/resume' }, ...dataOutput() } },
			{ name: 'Start Deal', value: 'startDeal', action: 'Start a deal cadence', description: 'Start the deal cadence', routing: { request: { method: 'POST', url: '=/deals/{{$parameter.dealSeq}}/cadence/start' }, ...dataOutput() } },
			{ name: 'Execute Task', value: 'executeTask', action: 'Execute a cadence task', description: 'Dispatch a cadence task to its provider', routing: { request: { method: 'POST', url: '=/deals/{{$parameter.dealSeq}}/cadence/tasks/{{$parameter.taskId}}/execute' }, ...dataOutput() } },
			{ name: 'Skip Task', value: 'skipTask', action: 'Skip a cadence task', description: 'Skip a task without sending', routing: { request: { method: 'POST', url: '=/deals/{{$parameter.dealSeq}}/cadence/tasks/{{$parameter.taskId}}/skip' }, ...dataOutput() } },
			{ name: 'Complete Task Manually', value: 'completeTask', action: 'Complete a cadence task manually', description: 'Mark a task as completed without dispatch', routing: { request: { method: 'POST', url: '=/deals/{{$parameter.dealSeq}}/cadence/tasks/{{$parameter.taskId}}/complete-manual' }, ...dataOutput() } },
		],
		default: 'listCadences',
	},
	pathString('cadence', ['listEnrollments'], 'cadenceId', 'Cadence ID', 'Cadence identifier.'),
	pathString('cadence', ['getDealCadence', 'enrollDeal', 'unenrollDeal', 'pauseDeal', 'resumeDeal', 'startDeal', 'executeTask', 'skipTask', 'completeTask'], 'dealSeq', 'Deal Sequence', 'Workspace-scoped deal sequence.'),
	pathString('cadence', ['executeTask', 'skipTask', 'completeTask'], 'taskId', 'Task ID', 'Cadence task identifier.'),
	bodyString('cadence', 'enrollDeal', 'cadenceId', 'Cadence ID', 'Active cadence identifier for the deal’s pipeline.', { required: true }),
	{
		displayName: 'Start Day', name: 'startDay', type: 'number', default: 0, displayOptions: displayOptions('cadence', 'enrollDeal'),
		routing: { send: { type: 'body', property: 'startDay' } }, description: 'Optional cadence day to start from',
	},
	bodyString('cadence', 'pauseDeal', 'reason', 'Reason', 'Optional reason for pausing the cadence.'),
	...cursorPagination('cadence', 'listEnrollments'),
	optionalFields('cadence', 'listEnrollments', 'enrollmentFilters', 'Filters', 'Add filters only when you need to narrow the enrollment list.', [
		{ displayName: 'Status', name: 'status', type: 'string', default: '', routing: { send: { type: 'query', property: 'status' } } },
		{ displayName: 'Day', name: 'day', type: 'number', default: 0, routing: { send: { type: 'query', property: 'day' } } },
		{ displayName: 'Step', name: 'step', type: 'number', default: 0, routing: { send: { type: 'query', property: 'step' } } },
		{ displayName: 'At', name: 'at', type: 'dateTime', default: '', routing: { send: { type: 'query', property: 'at' } } },
	]),
	bodyString('cadence', 'executeTask', 'idempotencyKey', 'Idempotency Key', 'Required key that prevents a task from being sent twice.', { required: true }),
	bodyString('cadence', 'executeTask', 'message', 'Message', 'WhatsApp message body.'),
	bodyString('cadence', 'executeTask', 'subject', 'Subject', 'Email subject.'),
	bodyString('cadence', 'executeTask', 'htmlBody', 'HTML Body', 'HTML email body.'),
	bodyString('cadence', 'executeTask', 'textBody', 'Text Body', 'Plain-text email body.'),
	bodyString('cadence', 'executeTask', 'manualReferenceId', 'Manual Reference ID', 'Caller-owned reference for the attempt.'),
	bodyString('cadence', 'skipTask', 'reason', 'Reason', 'Why the cadence task is being skipped.', { required: true }),
];
