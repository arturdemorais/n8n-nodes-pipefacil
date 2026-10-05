# n8n-nodes-pipefacil

Node da comunidade n8n para integrar workflows ao CRM PipeFácil, da Match Sales.
Ele usa a API pública oficial para consultar e atualizar negócios, conversar com
contatos, criar tarefas e notas e consultar referências do workspace.

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
- Task: criar tarefa pendente vinculada a um lead
- Note: criar nota com texto/anexos e enviar anexos de notas

As listas com cursor oferecem `Return All` e `Limit`.

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

### Inputs simplificados (node 1.1)

Novos nodes usam a versão **1.1**. Workflows da versão **1** mantêm seus formulários e formatos anteriores; atualize a versão do node no n8n e reconfigure os campos alterados para usar a nova interface.

- **Criação de leads:** funil e etapa por nome; detalhes do contato em **Lead Fields**, adicionando só os campos necessários. Empresa tem busca por nome e responsáveis têm seleção por nome. Telefone é opcional.
- **Atualização:** etapa, empresa, responsáveis e tags por seleção. Use **Contact Fields** para alterar dados do contato e **Custom Fields** para mapear campos personalizados pelos seus nomes e tipos. O funil selecionado carrega o esquema dos campos; ele não move o lead por si só. Campos omitidos são preservados.
- **Busca de leads:** em **Deal → Get Many → Filters**, escolha funil, etapa, responsáveis e tags por nome. Use **Search (Name, Contact or Phone)** para buscar pelo telefone ou nome. A busca textual não garante igualdade exata de telefone.
- **Filtros personalizados:** escolha o campo pelo nome e **Match → Value**, **Selected Option** ou **Not Filled In**. A última opção monta `__empty__` automaticamente. Repita um campo para aceitar vários valores pela regra OU. Campos de data têm seletores próprios de início e fim.
- **Tarefas:** selecione o lead, título e prazo; responsável e categorias padrão têm seletores. Sem responsável, a API usa o membro da chave. Exige `tasks.create`.
- **Notas:** informe texto e/ou adicione arquivos em **Attachments → Files** indicando seus campos binários de entrada (ex.: `data`). O node faz upload e anexa os comprovantes automaticamente. Até 10 arquivos por nota; exige `deals.edit`. Uma nova execução faz novos uploads; esta operação não oferece idempotência na API.
- **Conversas:** destinatário e conversa têm busca por nome/telefone. Mensagens exibem campos conforme o tipo. Templates de texto têm **Body Variables** em ordem, sem montar JSON.

Seletores aceitam expressões para receber valores de outros nodes. Empresas, contatos e conversas suportam paginação na busca.

A API pública não oferece catálogos de canais, templates nem categorias personalizadas. O nome do template é informado em texto; IDs de canal e categoria personalizada ficam em **Advanced Options**. Templates com componentes de cabeçalho/botão especiais mantêm JSON em **Advanced Template Options**.

Na versão 1, notas com anexos continuam usando **Upload Attachment** e o array de comprovantes em **Attachments**. Essa operação também permanece disponível na versão 1.1 para workflows que precisam controlar os uploads separadamente.

### Desenvolvimento

- `npm test`: build e testes das requisições, filtros, paginação e uploads.
- `npm run lint`: validação pelo CLI oficial do n8n.
- `npm run dev`: inicia o n8n com o node para testes manuais com uma chave do PipeFácil.

No WhatsApp Cloud, mensagens livres dependem da janela de atendimento de 24 horas;
fora dela, use um template aprovado. O WhatsApp Lite não aplica essa janela.

## Resources

- [Documentação do PipeFácil](https://developers.matchsales.com.br/)
- [API pública](https://developers.matchsales.com.br/api/)
- [Contrato OpenAPI](https://developers.matchsales.com.br/api/openapi.json)
- [Autenticação](https://developers.matchsales.com.br/developers/authentication/)
- [Documentação de community nodes do n8n](https://docs.n8n.io/integrations/#community-nodes)

## Version history

- `0.3.0`: tarefas, notas com anexos, busca por telefone/campos personalizados e inputs simplificados no node 1.1

- `0.1.0`: primeira versão com a API pública de deals, referências e conversas
