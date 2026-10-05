const assert = require('node:assert/strict');
const { test } = require('node:test');
const { NodeHelpers } = require('n8n-workflow');
const { Pipefacil } = require('../dist/nodes/Pipefacil/Pipefacil.node');
const choices = require('../dist/nodes/Pipefacil/resources/choices');
const simple = require('../dist/nodes/Pipefacil/resources/simple');
const description = new Pipefacil().description;
const context = (parameters) => ({ getNodeParameter: (name, fallback) => parameters[name] ?? fallback });
const visible = (resource, operation, version = 1.1) => description.properties.filter((p) => NodeHelpers.displayParameter({ resource, operation, type: 'template' }, p, { typeVersion: version }, description));

test('version 1 keeps saved inputs while version 1.1 uses simple fields and locators', () => {
 assert.equal(visible('deal','create',1).find((p) => p.name === 'leadFields').type, 'resourceMapper');
 assert.equal(visible('deal','create').find((p) => p.name === 'leadFields').type, 'collection');
 assert.equal(visible('conversation','listMessages',1).find((p) => p.name === 'conversationKey').type, 'string');
 assert.equal(visible('conversation','listMessages').find((p) => p.name === 'conversationKey').type, 'resourceLocator');
 for (const [resource, operation] of [['deal','create'],['deal','update'],['note','create'],['task','create'],['conversation','sendMessage']]) {
  const names = visible(resource,operation).map((p) => p.name);
  assert.equal(names.length, new Set(names).size, `${resource}/${operation} has duplicate active properties`);
 }
});

test('dynamic methods are registered and selectors use user IDs, not membership IDs', async () => {
 const methods = new Pipefacil().methods;
 const visit = (properties) => properties.forEach((p) => {
  if (p.typeOptions?.loadOptionsMethod) assert.equal(typeof methods.loadOptions[p.typeOptions.loadOptionsMethod], 'function');
  for (const mode of p.modes ?? []) if (mode.typeOptions?.searchListMethod) assert.equal(typeof methods.listSearch[mode.typeOptions.searchListMethod], 'function');
  for (const option of p.options ?? []) {
   if (option.values) visit(option.values);
   else if (option.type) visit([option]);
  }
 });
 visit(description.properties);
 const result = await choices.getUserOptions.call({ helpers: { httpRequestWithAuthentication: async () => ({ data: { members: [{ id:'membership', userId:'user', name:'Ana' }] } }) } });
 assert.deepEqual(result, [{ name:'Ana',value:'user' }]);
});

test('stage selectors scope nested filters and keep identical stage names distinguishable', async () => {
 const pipelines = [{ id:'a',seq:1,name:'Sales',stages:[{id:'s1',name:'New'}] }, {id:'b',seq:2,name:'Support',stages:[{id:'s2',name:'New'}]}];
 const result = await choices.getAllStageOptions.call({ getCurrentNodeParameters: () => ({}), getCurrentNodeParameter: (name) => name === '&pipeline' ? 2 : undefined, helpers: { httpRequestWithAuthentication: async () => ({data:pipelines}) } });
 assert.deepEqual(result, [{name:'Support → New',value:'s2'}]);
});

test('custom field option selector reads the current repeated row and excludes inactive members', async () => {
 const result = await choices.getCustomFilterValueOptions.call({ getCurrentNodeParameter: (name) => { assert.equal(name, '&slug'); return 'owner'; }, helpers: { httpRequestWithAuthentication: async () => ({data:[{slug:'owner', options:[{label:'Ana',value:'a'},{label:'Old',value:'b',inactive:true}]}]}) } });
 assert.deepEqual(result,[{name:'Ana',value:'a'}]);
});

test('simple lead creation unwraps company locator and keeps false and zero', async () => {
 const result = await simple.prepareSimpleCreate.call(context({ leadFields:{name:'New',companyId:{mode:'list',value:'company'},value:0,useAssignmentStrategy:false}, customFields:{value:{approved:false}},tracking:{} }),{url:'/deals',body:{stageId:'s1',tagIds:['t1']}});
 assert.deepEqual(result.body,{stageId:'s1',tagIds:['t1'],name:'New',companyId:'company',value:0,useAssignmentStrategy:false,customFields:{approved:false}});
});

test('updates send only selected fields and can explicitly clear contact text', async () => {
 const result = await simple.prepareSimpleUpdate.call(context({contactFields:{email:''},customFields:{value:{budget:0}}}), {url:'/deals/1',body:{stageId:'s1'}});
 assert.deepEqual(result.body,{stageId:'s1',contact:{email:''},customFields:{budget:0}});
});

test('friendly empty and selected-option filters serialize the documented query keys', async () => {
 const result = await simple.prepareSimpleFilters.call(context({filters:{customFieldFilters:{filters:[{slug:'budget',match:'empty'},{slug:'budget',match:'option',option:'high'}]}}}),{url:'/deals',qs:{search:'5585999999999'}});
 assert.deepEqual(result.qs, {search:'5585999999999','customFields[budget]':['__empty__','high']});
});

test('note automatically uploads binary fields and uses unchanged receipts', async () => {
 const requests=[];
 const ctx = {...context({deal:{value:'123'},noteOptions:{files:{files:[{binaryProperty:'pdf'}]}}}), helpers:{
  assertBinaryData: (field) => {assert.equal(field,'pdf');return {fileName:'file.pdf',mimeType:'application/pdf'};},
  getBinaryDataBuffer: async () => Buffer.from('pdf'),
  httpRequestWithAuthentication: async (credential, options) => { assert.equal(credential,'pipefacilApi');requests.push(options);return {data:{key:'private-key',name:'file.pdf',size:3,mimeType:'application/pdf'}}; },
 }};
 const result = await simple.prepareSimpleNote.call(ctx,{url:'/deals/123/notes',body:{content:'Note'}});
 assert.equal(requests[0].url,`${choices.apiBaseUrl}/deals/123/notes/attachments`);
 assert.ok(Buffer.isBuffer(requests[0].body));
 assert.deepEqual(result.body,{content:'Note',attachments:[{key:'private-key',name:'file.pdf',size:3,mimeType:'application/pdf'}]});
});

test('note validates all binary fields before uploading and rejects an empty note', async () => {
 let uploads=0;
 const ctx={...context({deal:{value:1},noteOptions:{files:{files:[{binaryProperty:'ok'},{binaryProperty:'missing'}]}}}),helpers:{assertBinaryData:(field)=>{if(field==='missing')throw new Error('missing');},httpRequestWithAuthentication:async()=>{uploads++;}}};
 await assert.rejects(simple.prepareSimpleNote.call(ctx,{url:'/notes',body:{}}),/missing/);
 assert.equal(uploads,0);
 await assert.rejects(simple.prepareSimpleNote.call(context({noteOptions:{},deal:{value:1}}),{url:'/notes',body:{content:' '}}),/Provide note content/);
});

test('template variables generate provider body components without JSON input', async () => {
 const result=await simple.prepareSimpleMessage.call(context({type:'template',templateName:'followup',templateLanguageCode:'pt_BR',templateVariables:{variables:[{text:'Ana'},{text:'Tuesday'}]}}),{url:'/messages',body:{to:'5511999999999',type:'template'}});
 assert.deepEqual(result.body.templateComponents,[{type:'body',parameters:[{type:'text',text:'Ana'},{type:'text',text:'Tuesday'}]}]);
 assert.equal(result.body.templateName,'followup');
});

test('company and conversation searches paginate and return API identifiers', async () => {
 const ctx={helpers:{httpRequestWithAuthentication:async(_credential,options)=>options.url.endsWith('/companies')?{data:{content:[{id:'co',seq:7,name:'Company'}],last:false,number:1}}:{data:{items:[{id:'conversation-key',displayName:'Ana',phone:'5511'}],hasMore:true,nextCursor:'next'}}}};
 assert.deepEqual(await choices.searchCompanies.call(ctx,'Company','1'),{results:[{name:'Company',value:'co'}],paginationToken:'2'});
 assert.deepEqual(await choices.searchConversations.call(ctx,'Ana'),{results:[{name:'Ana',value:'conversation-key'}],paginationToken:'next'});
});

test('locator routing sends the scalar extracted by n8n, without unwrapping it twice', () => {
 const recipient = visible('conversation','sendMessage').find((p) => p.name === 'to');
 assert.equal(recipient.routing.send.property, 'to');
 assert.equal(recipient.routing.send.value, undefined);
 const company = visible('deal','update').find((p) => p.name === 'updateFields').options.find((p) => p.name === 'companyId');
 assert.equal(company.type, 'resourceLocator');
 assert.equal(company.routing.send.property, 'companyId');
 assert.equal(company.routing.send.value, undefined);
});
