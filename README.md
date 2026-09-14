# n8n-nodes-pipefacil

Node da comunidade n8n para integrar workflows ao CRM PipeFácil, da Match Sales.
Ele usa a API pública oficial para consultar e atualizar negócios, conversar com
contatos e consultar referências do workspace.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Usage](#usage)
[Resources](#resources)
[Version history](#version-history)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

O node é declarativo e cobre as rotas públicas documentadas do PipeFácil:

- Deals: criar, consultar, listar, atualizar, adicionar/remover tags e listar atividades
- Reference: contatos, empresas, funis, tags, campos personalizados e usuários
- Conversations: enviar mensagens e listar conversas/mensagens

As listas com cursor oferecem `Return All` e `Limit`. A execução de uma tarefa de
conversa pode enviar uma mensagem pela API pública.

## Credentials

Crie uma chave em **Configurações → Chaves de API** no PipeFácil e cadastre-a na
credencial `Pipefacil API` do n8n. A chave deve começar com `pf_live_` e é enviada
como `Authorization: Bearer <chave>`.

O workspace é determinado pela chave; não informe `workspaceId` no node. As chaves
são secretas e ficam armazenadas pelo sistema de credenciais do n8n.

## Compatibility

Compatível com n8n que suporte community nodes declarativos e a API de credenciais
`n8n-workflow`. O pacote foi validado com o `@n8n/node-cli` usado neste projeto.

## Usage

1. Instale o pacote como community node no n8n
2. Crie a credencial `Pipefacil API`
3. Adicione o node `PipeFácil` ao workflow
4. Escolha o recurso e a operação e preencha os campos exibidos

Na API, a interface chama o negócio de “lead”, mas o contrato chama o recurso de
“deal”. Ao mover um deal para uma etapa de perda, informe `Lost Reason`. Algumas
etapas também exigem campos personalizados.

No WhatsApp Cloud, mensagens livres dependem da janela de atendimento de 24 horas;
fora dela, use um template aprovado. O WhatsApp Lite não aplica essa janela.

## Resources

- [Documentação do PipeFácil](https://developers.matchsales.com.br/)
- [API pública](https://developers.matchsales.com.br/api/)
- [Contrato OpenAPI](https://developers.matchsales.com.br/api/openapi.json)
- [Autenticação](https://developers.matchsales.com.br/developers/authentication/)
- [Documentação de community nodes do n8n](https://docs.n8n.io/integrations/#community-nodes)

## Version history

- `0.1.0`: primeira versão com a API pública de deals, referências e conversas
