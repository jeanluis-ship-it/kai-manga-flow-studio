const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const imageHandler = require('../api/openai-image.js');

function response() {
  return { statusCode: 200, headers: {},
    setHeader(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; } };
}
function request(body, code='development-secret-long') {
  return {method:'POST',headers:{'x-mangai-studio-key':code,'content-length':'1000'},body};
}

test('new landing and Creator inline JavaScript syntax is valid', () => {
  for(const file of ['experience/index.html','creator/index.html']) {
    const html = fs.readFileSync(path.join(__dirname,'..',file),'utf8');
    const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
    assert.ok(scripts.length > 0, file+' has inline code');
    for(const [,script] of scripts) new vm.Script(script,{filename:file});
  }
});

test('server refuses when credentials missing', async () => {
  delete process.env.OPENAI_API_KEY;
  delete process.env.MANGAI_STUDIO_ACCESS_TOKEN;
  const res = response();
  await imageHandler(request({prompt:'Describe an original manga character'}),res);
  assert.equal(res.statusCode,503);
});

test('server refuses incorrect access code and oversized input', async () => {
  process.env.OPENAI_API_KEY='fake-openai-key';
  process.env.MANGAI_STUDIO_ACCESS_TOKEN='development-secret-long';
  const denied = response();
  await imageHandler(request({prompt:'Describe an original manga character'},'incorrect'),denied);
  assert.equal(denied.statusCode,401);
  const huge=response();const req=request({prompt:'Describe an original manga character'});
  req.headers['content-length']=String(4*1024*1024);
  await imageHandler(req,huge);
  assert.equal(huge.statusCode,413);
});

test('server validates prompt and reference count without external calls', async () => {
  const bad=response();
  await imageHandler(request({prompt:'short'}),bad);
  assert.equal(bad.statusCode,400);
  const refs=response();
  await imageHandler(request({prompt:'Original manga portrait of mysterious hero',castReferences:[{},{},{}]}),refs);
  assert.equal(refs.statusCode,400);
});

test('generation sends server key and returns image data', async () => {
  const oldFetch=global.fetch;
  let url;
  try {
    global.fetch=async (endpoint,opts)=> {
      url=endpoint;
      assert.equal(opts.headers.Authorization,'Bearer fake-openai-key');
      const parsed=JSON.parse(opts.body);
      assert.equal(parsed.n,1);
      return {ok:true,json:async()=>({data:[{b64_json:'aGVsbG8='}]})};
    };
    const res=response();
    await imageHandler(request({prompt:'Original manga portrait of mysterious hero'}),res);
    assert.equal(url,'https://api.openai.com/v1/images/generations');
    assert.equal(res.statusCode,200);
    assert.match(res.body.url,/^data:image\/webp;base64,/);
  } finally {global.fetch=oldFetch;}
});

test('reference edit uses multipart rather than JSON', async () => {
  const oldFetch=global.fetch;
  let url;
  try {
    global.fetch=async (endpoint,opts)=> {
      url=endpoint;
      assert.ok(opts.body instanceof FormData);
      assert.equal(opts.body.getAll('image[]').length,1);
      return {ok:true,json:async()=>({data:[{b64_json:'aGVsbG8='}]})};
    };
    const res=response();
    const ref='data:image/png;base64,'+Buffer.from('fake-image').toString('base64');
    await imageHandler(request({prompt:'Same face three quarter view manga portrait',castReferences:[{dataUrl:ref}]}),res);
    assert.equal(url,'https://api.openai.com/v1/images/edits');
    assert.equal(res.statusCode,200);
  } finally {global.fetch=oldFetch;}
});
