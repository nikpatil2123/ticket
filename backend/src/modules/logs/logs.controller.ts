import { Controller, Post, Body, Get, Query, Res, HttpStatus } from '@nestjs/common';
import { LogsService } from './logs.service';
import type { Response } from 'express';

@Controller('v1/logs')
export class LogsController {
  private readonly SECRET_PIN = process.env.LOG_VIEWER_PIN || '1234';

  constructor(private readonly logsService: LogsService) {}

  @Post()
  async createLog(@Body() body: { level: string; message: string; metadata?: any }) {
    return this.logsService.createLog(body.level || 'info', body.message, body.metadata);
  }

  @Get('view')
  async viewLogs(@Query('pin') pin: string, @Query('app_token') appToken: string, @Res() res: Response) {
    const EXPECTED_APP_TOKEN = process.env.MOBILE_APP_TOKEN || 'secure-mobile-token';
    
    // Block access if the request doesn't come from the mobile app with the correct token
    if (appToken !== EXPECTED_APP_TOKEN) {
      return res.status(HttpStatus.NOT_FOUND).send('Not Found');
    }

    if (pin !== this.SECRET_PIN) {
      // Return a beautiful HTML login page using Tailwind
      return res.status(HttpStatus.UNAUTHORIZED).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Secure Logs Login</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-zinc-950 h-screen flex items-center justify-center font-sans text-zinc-50">
          <div class="bg-zinc-950 p-8 rounded-xl w-full max-w-sm border border-zinc-800 shadow-sm">
            <div class="text-center mb-6">
              <h2 class="text-2xl font-semibold tracking-tight text-zinc-50">System Analytics</h2>
              <p class="text-zinc-400 text-sm mt-1">Enter your security PIN to access the dashboard</p>
            </div>
            <form method="GET" class="space-y-4">
              <input type="hidden" name="app_token" value="${EXPECTED_APP_TOKEN}" />
              <div>
                <input type="password" name="pin" placeholder="Enter PIN" required 
                  class="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm ring-offset-zinc-950 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition" />
              </div>
              <button type="submit" 
                class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-zinc-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-zinc-50 text-zinc-900 hover:bg-zinc-50/90 h-10 px-4 py-2 w-full">
                Access Dashboard
              </button>
            </form>
          </div>
        </body>
        </html>
      `);
    }

    // If PIN is correct, fetch logs and render Tailwind dashboard
    const logs = await this.logsService.getLogs();
    
    let rowsHtml = logs.map((log, index) => {
      const meta = log.metadata || {};
      const time = new Date(log.timestamp).toLocaleString();
      const userStr = meta.name ? `${meta.name} <br/><span class="text-xs text-zinc-400">${meta.email || ''}</span>` : (meta.userId || 'System');
      const ipStr = meta.ip || 'N/A';
      
      let badgeColor = 'bg-zinc-800 text-zinc-50 border-zinc-700';
      if (log.level === 'error') badgeColor = 'bg-red-900/50 text-red-200 border-red-900';
      if (log.level === 'warn') badgeColor = 'bg-yellow-900/50 text-yellow-200 border-yellow-900';

      return `
        <tbody x-data="{ expanded: false }" class="border-b border-zinc-800 transition-colors hover:bg-zinc-800/50 data-[state=selected]:bg-zinc-800">
          <tr>
            <td class="p-4 align-middle text-sm text-zinc-400">${time}</td>
            <td class="p-4 align-middle">
              <div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:ring-offset-2 ${badgeColor}">
                ${log.level.toUpperCase()}
              </div>
            </td>
            <td class="p-4 align-middle text-sm font-medium text-zinc-50">${userStr}</td>
            <td class="p-4 align-middle text-sm text-zinc-300">${log.message}</td>
            <td class="p-4 align-middle text-sm text-zinc-500 font-mono">${ipStr}</td>
            <td class="p-4 align-middle text-right text-sm">
              <button @click="expanded = !expanded" class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-zinc-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 hover:text-zinc-50 h-9 px-3">
                <span x-show="!expanded">View Details</span>
                <span x-show="expanded" class="text-zinc-400">Hide Details</span>
              </button>
            </td>
          </tr>
          <tr x-show="expanded" x-collapse>
            <td colspan="6" class="p-4 bg-zinc-950 border-b border-zinc-800">
              <div class="rounded-md bg-zinc-950 p-4 border border-zinc-800 overflow-x-auto text-sm">
                <pre class="text-xs text-zinc-300 font-mono"><code>${JSON.stringify(meta, null, 2)}</code></pre>
              </div>
            </td>
          </tr>
        </tbody>
      `;
    }).join('');

    if (logs.length === 0) {
      rowsHtml = '<tbody><tr><td colspan="6" class="p-4 text-center text-sm text-zinc-500">No results.</td></tr></tbody>';
    }

    return res.status(HttpStatus.OK).send(`
      <!DOCTYPE html>
      <html lang="en" class="antialiased bg-zinc-950 text-zinc-50">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Activity Dashboard</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <!-- Alpine.js for interactive collapsible rows -->
        <script defer src="https://cdn.jsdelivr.net/npm/@alpinejs/collapse@3.x.x/dist/cdn.min.js"></script>
        <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
      </head>
      <body class="font-sans p-4 md:p-8 bg-zinc-950 text-zinc-50">
        <div class="max-w-7xl mx-auto space-y-4">
          
          <div class="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
            <div>
              <h2 class="text-3xl font-bold tracking-tight">Activity Logs</h2>
              <p class="text-muted-foreground text-zinc-400">Track and monitor admin and system activity.</p>
            </div>
            <div class="flex items-center gap-3">
              <div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:ring-offset-2 border-transparent bg-zinc-50 text-zinc-900 hover:bg-zinc-50/80">
                <span class="relative flex h-2 w-2 mr-2">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live Tracking Active
              </div>
              <button onclick="window.location.reload()" class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-zinc-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 hover:text-zinc-50 h-9 w-9">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/></svg>
              </button>
            </div>
          </div>

          <div class="rounded-md border border-zinc-800 bg-zinc-950 text-zinc-50 shadow-sm">
            <div class="relative w-full overflow-auto">
              <table class="w-full caption-bottom text-sm">
                <thead class="[&_tr]:border-b border-zinc-800">
                  <tr class="border-b border-zinc-800 transition-colors hover:bg-zinc-800/50 data-[state=selected]:bg-zinc-800">
                    <th class="h-12 px-4 text-left align-middle font-medium text-zinc-400">Time</th>
                    <th class="h-12 px-4 text-left align-middle font-medium text-zinc-400">Level</th>
                    <th class="h-12 px-4 text-left align-middle font-medium text-zinc-400">User</th>
                    <th class="h-12 px-4 text-left align-middle font-medium text-zinc-400">Action</th>
                    <th class="h-12 px-4 text-left align-middle font-medium text-zinc-400">IP Address</th>
                    <th class="h-12 px-4 text-right align-middle font-medium text-zinc-400">Payload</th>
                  </tr>
                </thead>
                ${rowsHtml}
              </table>
            </div>
          </div>
          
        </div>
      </body>
      </html>
    `);
  }
}
