import * as choices from './resources/choices';
import { outputProperties, getOutputFieldOptions } from './resources/output';
import { modernProperties, messageExtras, updateExtras, getCustomUpdateFields } from './resources/simple';
import { NodeConnectionTypes, type INodeType, type INodeTypeDescription, type INodeProperties } from 'n8n-workflow';
import {
	contactsDescription,
	conversationsDescription,
	customFieldsDescription,
	getChoiceFieldOptions,
	getCustomFieldIdOptions,
	getFieldChoiceOptions,
	getVisibilityParentOptions,
	getVisibilityValueOptions,
	searchContactRecords,
	notesDescription,
	tasksDescription,
	dealsDescription,
	getCustomDealFields,
	getDealFields,
	getPipelineOptions,
	getStageOptions,
	getTagOptions,
	searchDeals,
	referenceDescription,
} from './resources';

const legacyProperties = [...dealsDescription, ...notesDescription, ...tasksDescription, ...referenceDescription, ...conversationsDescription];
const simpleProperties = [...modernProperties(legacyProperties), ...messageExtras, ...updateExtras(dealsDescription.find((p) => p.name === 'customFields')!)];
function forVersion(properties: INodeProperties[], modern: boolean): INodeProperties[] {
	return properties.map((property) => ({ ...property, displayOptions: { ...property.displayOptions, show: { ...property.displayOptions?.show, '@version': modern ? [1.1] : [1] } } }));
}

export class Pipefacil implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PipeFácil',
		name: 'pipefacil',
		icon: { light: 'file:favicon.svg', dark: 'file:favicon.dark.svg' },
		group: ['output'],
		version: [1, 1.1],
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Use the PipeFácil public API to manage deals, contacts, custom fields, tasks, notes, conversations and workspace references.',
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
					{ name: 'Contact', value: 'contact' },
					{
						name: 'Conversation',
						value: 'conversation',
					},
					{ name: 'Custom Field', value: 'customField' },
					{
						name: 'Deal',
						value: 'deal',
					},
					{
						name: 'Note',
						value: 'note',
					},
					{
						name: 'Reference',
						value: 'reference',
					},
					{ name: 'Task', value: 'task' },
				],
				default: 'deal',
			},
			...forVersion(legacyProperties, false),
			...forVersion(simpleProperties, true),
			// Added after version 1.1 already used selectors, so both versions share the same inputs.
			...contactsDescription,
			...customFieldsDescription,
			...outputProperties,
		],
	};

	methods = {
		loadOptions: {
			getOutputFieldOptions,
			getUserOptions: choices.getUserOptions,
			getPipelineSequenceOptions: choices.getPipelineSequenceOptions,
			getAllStageOptions: choices.getAllStageOptions,
			getCustomFieldOptions: choices.getCustomFieldOptions,
			getDateFieldOptions: choices.getDateFieldOptions,
			getCustomFilterValueOptions: choices.getCustomFilterValueOptions,
			getPipelineOptions,
			getStageOptions,
			getTagOptions,
			getCustomFieldIdOptions,
			getChoiceFieldOptions,
			getFieldChoiceOptions,
			getVisibilityParentOptions,
			getVisibilityValueOptions,
		},
		listSearch: {
			searchDeals,
			searchCompanies: choices.searchCompanies,
			searchConversations: choices.searchConversations,
			searchContacts: choices.searchContacts,
			searchContactRecords,
		},
		resourceMapping: {
			getDealFields,
			getCustomDealFields,
			getCustomUpdateFields,
		},
	};
}
