import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class PipefacilApi implements ICredentialType {
	name = 'pipefacilApi';

	displayName = 'Pipefacil API';

	icon: Icon = {
		light: 'file:../nodes/Pipefacil/favicon.svg',
		dark: 'file:../nodes/Pipefacil/favicon.dark.svg',
	};

	documentationUrl = 'https://developers.matchsales.com.br/developers/authentication/';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'Create an API key in PipeFácil under Settings → API Keys. The credential test requires permission to list workspace users.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://pipefacil-server.matchsales.com.br/api/v1',
			url: '/users',
			method: 'GET',
		},
	};
}
