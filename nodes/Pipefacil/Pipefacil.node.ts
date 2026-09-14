import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import {
	cadencesDescription,
	calendarDescription,
	conversationsDescription,
	dealsDescription,
	getCustomDealFields,
	getDealFields,
	getPipelineOptions,
	getStageOptions,
	referenceDescription,
} from './resources';

export class Pipefacil implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PipeFácil',
		name: 'pipefacil',
		icon: { light: 'file:favicon.svg', dark: 'file:favicon.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Use the PipeFácil public API to manage deals, conversations, calendars and cadences.',
		defaults: {
			name: 'PipeFácil',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'pipefacilApi', required: true }],
		requestDefaults: {
			baseURL: 'https://pipefacil-server.matchsales.com.br/api/v1',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Cadence',
						value: 'cadence',
					},
					{
						name: 'Calendar',
						value: 'calendar',
					},
					{
						name: 'Conversation',
						value: 'conversation',
					},
					{
						name: 'Deal',
						value: 'deal',
					},
					{
						name: 'Reference',
						value: 'reference',
					},
				],
				default: 'deal',
			},
			...dealsDescription,
			...referenceDescription,
			...calendarDescription,
			...conversationsDescription,
			...cadencesDescription,
		],
	};

	methods = {
		loadOptions: {
			getPipelineOptions,
			getStageOptions,
		},
		resourceMapping: {
			getDealFields,
			getCustomDealFields,
		},
	};
}
