import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LogsService } from './logs.service';

@Injectable()
export class ActivityLoggerInterceptor implements NestInterceptor {
  constructor(private readonly logsService: LogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, originalUrl, body, user, ip, headers } = request;

    const shouldLog = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    const isLogRoute = originalUrl.startsWith('/v1/logs');

    if (shouldLog && !isLogRoute) {
      return next.handle().pipe(
        tap({
          next: () => {
            const actionStr = this.mapAction(method, originalUrl, body);
            const clientIp = headers['x-forwarded-for'] || ip || 'unknown';
            const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Anonymous';
            
            this.logsService.createLog('info', actionStr, {
              userId: user?.id || user?.sub || 'unauthenticated',
              name: fullName,
              email: user?.email || 'unknown',
              ip: clientIp,
              method,
              path: originalUrl,
              body: this.sanitizeBody(body),
              status: 'success',
            });
          },
          error: (err) => {
            const actionStr = this.mapAction(method, originalUrl, body);
            const clientIp = headers['x-forwarded-for'] || ip || 'unknown';
            const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Anonymous';
            
            this.logsService.createLog('error', `Failed to: ${actionStr}`, {
              userId: user?.id || user?.sub || 'unauthenticated',
              name: fullName,
              email: user?.email || 'unknown',
              ip: clientIp,
              method,
              path: originalUrl,
              error: err.message,
              status: 'error',
            });
          },
        }),
      );
    }

    return next.handle();
  }

  private mapAction(method: string, url: string, body: any): string {
    const p = url.split('?')[0]; // remove query params

    if (p.includes('/tickets') && p.includes('/messages') && method === 'POST') {
      return `Sent a Message: "${body?.bodyText ? body.bodyText.substring(0, 30) + '...' : 'Unknown'}"`;
    }
    
    if (p.includes('/tickets') && (method === 'PATCH' || method === 'PUT')) {
      if (body?.status) return `Updated Ticket Status to "${body.status}"`;
      if (body?.priority) return `Updated Ticket Priority to "${body.priority}"`;
      if (body?.departmentId) return `Reassigned Ticket Department`;
      if (body?.assignedTo) return `Assigned Ticket to Agent`;
      return 'Updated Ticket Details';
    }

    if (p.includes('/tickets') && method === 'POST') return 'Created a New Ticket';
    if (p.includes('/tickets') && method === 'GET') {
      if (p.includes('/timeline')) return 'Viewed Ticket Timeline';
      return p.endsWith('/tickets') ? 'Viewed Tickets List' : 'Viewed Ticket Details';
    }
    
    if (p.includes('/auth/login') && method === 'POST') return 'Logged In';
    if (p.includes('/users') && method === 'GET') return 'Viewed Users List';
    if (p.includes('/settings') && method === 'GET') return 'Viewed Settings';
    if (p.includes('/settings') && (method === 'PUT' || method === 'POST')) return 'Updated Settings';
    if (p.includes('/health')) return 'Health Check Ping';

    // Fallback
    return `${method} ${p}`;
  }

  // Helper function to remove sensitive data like passwords before logging
  private sanitizeBody(body: any): any {
    if (!body) return {};
    const sanitized = { ...body };
    const sensitiveKeys = ['password', 'token', 'secret', 'pin', 'credentials'];
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '***REDACTED***';
      }
    }
    return sanitized;
  }
}
