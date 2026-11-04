# n8n-nodes-pipefacil

An n8n community node for [PipeFácil CRM](https://developers.matchsales.com.br/),
by Match Sales. Manage leads, contacts, custom fields, tasks, notes and WhatsApp
conversations using the official public API.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/)
workflow automation platform.

## Installation

On a self-hosted n8n instance with community packages enabled:

1. Open **Settings → Community Nodes → Install** as the instance owner.
2. Enter `n8n-nodes-pipefacil` and follow the installation prompts.
3. Add **PipeFácil** to your workflow and configure its credentials.

See the [community node installation guide](https://docs.n8n.io/integrations/community-nodes/installation/).
n8n Cloud requires verification by n8n before a community node can be installed.
Publishing this package to npm does not, by itself, grant verified status.

## Credentials

You need a PipeFácil account with access to a workspace and permission to create
API keys. In PipeFácil, open **Settings → API Keys** and create a key with
the permissions required by your operations.

Create a **Pipefacil API** credential in n8n and paste the key, starting with
`pf_live_`, into **Access Token**. The node sends it as `Authorization: Bearer`.
n8n stores the key in its encrypted credential store. Never put the key in
workflow parameters or exported examples.

The key determines the workspace; there is no `workspaceId` parameter. The
credential connection test lists workspace users, so the key must be allowed
to access that endpoint. A key without this access may fail the connection test
even if it is authorized for a different operation.

See [API authentication](https://developers.matchsales.com.br/developers/authentication/)
for key management and permissions. Contact operations require the corresponding
`contacts.view`, `contacts.create`, `contacts.edit` or `contacts.delete` permission.
Creating tasks requires `tasks.create`. Notes and the contact update performed
after lead creation require `deals.edit`. Editing custom field definitions
requires `settings.custom_fields`.

## Operations

| Resource | Operations |
| --- | --- |
| Deal | Create, get, get many, update, add/remove tag, list activities, list custom field values |
| Contact | Create, get, get many, update, delete, upload/remove photo |
| Custom Field | Create, get, get many, update, delete, add options, update option, remove option |
| Task | Create a pending task linked to a lead |
| Note | Create a lead note with text and/or attachments, upload an attachment |
| Conversation | Send a message, list conversations, list messages |
| Reference | List contacts, companies, pipelines, tags, custom fields and users |

PipeFácil calls a deal a **lead** in its interface. The node's **Deal** resource
uses the `/deals` API routes. Only operations available in the public API are
provided; the node does not provide CRUD for every resource.

## Usage

### Read contacts

Import [the example workflow](examples/list-contacts.json) into n8n, select your
**Pipefacil API** credential on its PipeFácil node and execute it manually. It
reads up to 10 contacts and performs no writes. The example contains no credentials.

For cursor-based lists, use **Return All** to retrieve every page or **Limit** to
cap the results. **Reference → List Companies** uses **Page** (starting at 0)
and **Page Size** instead; it returns the requested page only. Custom field
definitions, pipelines, tags and users are returned as non-paginated lists.

The node returns individual list entries as n8n items. **Reference → List Users**
returns one item per workspace member. Successful delete operations, including
**Deal → Remove Tag**, return `{ "deleted": true }`.

### Create and update leads

Select **Deal → Create**, choose the pipeline and stage by name and add only the
details you need under **Lead Fields**. Phone is optional. Company and responsible
users can be selected by name. Use **Custom Fields** for the selected pipeline's
typed fields and **Tracking** for available attribution values.

After creating a lead, the node also updates the linked contact with the name
and email you supplied, including when the contact already existed. Empty or
omitted contact values are preserved. This second request requires `deals.edit`
in addition to creation permission. If it fails, the message identifies the
created lead: inspect that lead before retrying to avoid creating duplicates.

For **Deal → Update**, select the lead and add the fields you want to change.
Use **Contact Fields** for linked contact details and **Custom Fields** for typed
custom values. Selecting a pipeline loads its field schema; it does not move the
lead. Select a stage to move it. Moving to a lost stage requires **Lost Reason**;
some stages also require custom field values.

### Search leads and contacts

In **Deal → Get Many → Filters**, select pipeline, stages, responsible users and
tags. **Search (Name, Contact or Phone)** performs a text search; it does not
guarantee an exact phone match. Custom field filters support **Value**,
**Selected Option** and **Not Filled In**. Repeat a field to accept multiple values
with OR semantics. Date fields support lower and upper bounds.

Contact selectors search by name or phone. **By Phone** accepts a value from an
upstream node and tolerates formatting differences or a missing country code.
The lookup examines up to 50 search results and rejects ambiguous matches in
that result set. For large or ambiguous result sets, select **From List** or
**By ID** to target a known contact. Contact creation rejects an existing phone;
it is not an upsert.

### Tasks, notes and attachments

For tasks, select a lead, title and due date/time. Without an assignee, the API
uses the member associated with the key. Built-in categories have a selector;
custom category IDs can be supplied under **Advanced Options**.

For notes, supply text, attachments or both. In **Attachments → Files**, enter
the incoming binary field for each file, for example `data`. The node uploads and
attaches up to 10 files automatically. Uploads are not idempotent: executing the
node again performs new uploads.

**Note → Upload Attachment** is also available when you need to manage receipts
separately. Pass the unchanged receipt to the same lead's note. **Contact → Upload
Photo** accepts a JPEG, PNG or WebP binary file up to 5 MB. Binary operations need
incoming binary data and should be used as regular workflow nodes, not AI tools.

### Custom field definitions

Select field type, record type and field by name. Choice options use rows for
label and color, with a generated stored key when omitted. **Show Only When**
selects a parent choice/boolean field and the values that make the field visible.

**Add Options**, **Update Option** and **Remove Option** read the definition and
save its complete option list. Concurrent edits may overwrite one another;
serialize changes to the same field. Adding an existing label reactivates it.
By default, **Remove Option → Keep for Existing Leads** deactivates the option;
turn this off to delete it. At least one active option must remain.

### Conversations

Select the recipient or conversation by contact name or phone. Message fields
depend on the message type. For text templates, enter **Body Variables** in
template order. Templates with header/button components can use JSON under
**Advanced Template Options**.

The public API does not provide channel, template or custom task-category
catalogs. Enter the template name directly; channel and custom category IDs are
available under **Advanced Options**. WhatsApp Cloud free-form messages require
an open 24-hour customer service window; otherwise use an approved template.
WhatsApp Lite does not apply that window.

### Output controls

Supported record operations offer **Simplify**, disabled by default to preserve
the existing output. Enable it to return a compact set of the most useful fields.
When used as an AI tool, **Output** offers **Raw**, **Simplified** or **Selected
Fields**. Selected output retains available record identifiers. Activity logs,
custom field value lists, tag association receipts, upload receipts and deletion confirmations
keep their existing output.

## Compatibility

The package uses the n8n Nodes API version 1 and the declarative routing engine.
Node versions **1** and **1.1** are supported. New nodes use version **1.1**, with
name-based selectors, typed fields and automatic note attachment uploads. Existing
version **1** workflows retain their earlier forms and formats; upgrading the node
version requires reviewing and reconfiguring changed inputs.

Development checks use the versions recorded in `package-lock.json`. No minimum
n8n application version has been established through runtime testing; test on
your target n8n version before upgrading a production installation.

## Troubleshooting

- **Unauthorized or forbidden:** check that the key is active, belongs to the
  intended workspace and has permission for the operation and any selector it uses.
- **No options in a selector:** check workspace visibility and permissions for the
  corresponding reference endpoint. Use an expression with a known ID if needed.
- **Lead created, contact update failed:** inspect the lead identified in the
  message before retrying. Grant `deals.edit` for the follow-up contact update.
- **Multiple contacts match a phone:** select the exact contact from the list or
  supply its ID.
- **Missing binary data:** ensure the upstream node supplies the named binary
  field and execute the workflow with that input.
- **API validation or rate limit response:** review the API message, required
  stage fields and permissions. Reduce request frequency when rate limited. Avoid
  blindly retrying writes or uploads, which may already have completed.

## Development and publishing

```sh
npm ci
npm run lint
npm test
npm run dev
```

`npm run dev` starts a local n8n instance for manual testing. Use a test workspace
and configure its credentials in n8n. See [publishing instructions](docs/PUBLISHING.md)
and the [verification audit](docs/VERIFICATION-AUDIT.md) for release checks and
remaining external prerequisites.

## Resources

- [PipeFácil documentation](https://developers.matchsales.com.br/)
- [Public API](https://developers.matchsales.com.br/api/)
- [OpenAPI contract](https://developers.matchsales.com.br/api/openapi.json)
- [Authentication](https://developers.matchsales.com.br/developers/authentication/)
- [n8n community nodes](https://docs.n8n.io/integrations/community-nodes/)
- [Changelog](CHANGELOG.md)

## License

[MIT](LICENSE).
