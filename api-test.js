const API_BASE = 'http://localhost:3001';
const FRONTEND_BASE = 'http://localhost:3000';
const EMAIL = 'admin@paruluniversity.ac.in';
const PASSWORD = 'Admin@1234!';

let token = '';
const ctx = {}; // context for sharing data between requests

const apiEndpoints = [
  { name: 'Health Check', path: () => '/health', method: 'GET', auth: false },
  { 
    name: 'Login', 
    path: () => '/v1/auth/login', 
    method: 'POST', 
    auth: false, 
    body: () => ({ email: EMAIL, password: PASSWORD }),
    onSuccess: (data) => { token = data.access_token; }
  },
  { name: 'Get Tickets', path: () => '/v1/tickets', method: 'GET', auth: true },
  { name: 'Get Ticket Stats', path: () => '/v1/tickets/stats', method: 'GET', auth: true },
  { name: 'Get Users', path: () => '/v1/users', method: 'GET', auth: true },
  { name: 'Get Departments', path: () => '/v1/departments', method: 'GET', auth: true },
  { name: 'Get Templates', path: () => '/v1/templates', method: 'GET', auth: true },
  { 
    name: 'Create Template', 
    path: () => '/v1/templates', 
    method: 'POST', 
    auth: true, 
    body: () => ({ name: 'Test Template API', bodyText: 'This is a test template for API testing.' }),
    onSuccess: (data) => { ctx.templateId = data.data._id; }
  },
  { 
    name: 'Delete Template', 
    path: () => `/v1/templates/${ctx.templateId}`, 
    method: 'DELETE', 
    auth: true, 
    skipIf: () => !ctx.templateId
  },
];

const frontendEndpoints = [
  { name: 'Login Page', path: '/login' },
  { name: 'Team Triage Page', path: '/team/triage' },
  { name: 'Admin Analytics Page', path: '/admin/analytics' },
  { name: 'Templates Page', path: '/admin/templates' },
];

async function runTests() {
  console.log(`\n🚀 Starting Comprehensive System Check...\n`);
  
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  console.log(`--- Backend APIs (${API_BASE}) ---`);
  for (const ep of apiEndpoints) {
    if (ep.skipIf && ep.skipIf()) {
      console.log(`⏭️  [${ep.name}] Skipped (condition not met)`);
      skipped++;
      continue;
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (ep.auth) {
        if (!token) {
          console.log(`❌ [${ep.name}] Failed: Missing auth token`);
          failed++;
          continue;
        }
        headers['Authorization'] = `Bearer ${token}`;
      }

      const options = {
        method: ep.method,
        headers,
      };

      if (ep.body) {
        options.body = JSON.stringify(ep.body());
      }

      const url = `${API_BASE}${ep.path()}`;
      const res = await fetch(url, options);
      const isJson = res.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await res.json() : await res.text();

      if (res.ok) {
        console.log(`✅ [${ep.name}] Passed (${res.status} ${res.statusText})`);
        passed++;
        if (ep.onSuccess) {
          ep.onSuccess(data);
        }
      } else {
        console.log(`❌ [${ep.name}] Failed (${res.status} ${res.statusText})`);
        console.log(`   Response:`, typeof data === 'object' ? JSON.stringify(data).substring(0, 200) : data.substring(0, 200));
        failed++;
      }
    } catch (err) {
      console.log(`❌ [${ep.name}] Failed (Network Error: ${err.message})`);
      failed++;
    }
  }

  console.log(`\n--- Frontend Components (${FRONTEND_BASE}) ---`);
  for (const ep of frontendEndpoints) {
    try {
      const url = `${FRONTEND_BASE}${ep.path}`;
      const res = await fetch(url);
      if (res.ok) {
        console.log(`✅ [${ep.name}] Loaded Successfully (${res.status})`);
        passed++;
      } else {
        console.log(`❌ [${ep.name}] Failed to Load (${res.status} ${res.statusText})`);
        failed++;
      }
    } catch (err) {
      console.log(`❌ [${ep.name}] Failed (Network Error: Is the frontend server running?)`);
      failed++;
    }
  }

  console.log(`\n📊 Summary: ${passed} Passed, ${failed} Failed, ${skipped} Skipped`);
  if (failed > 0) {
    console.log(`\n⚠️ Some APIs are not working correctly.`);
  } else {
    console.log(`\n🎉 All tested APIs are working correctly!`);
  }
}

runTests();
