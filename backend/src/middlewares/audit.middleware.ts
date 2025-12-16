import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

/**
 * Audit Logger Middleware
 * Logs state-changing actions to accounting.audit_logs
 */
export const auditLogger = async (req: Request, res: Response, next: NextFunction) => {
  // Only log state-changing methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  // Intercept response to get status and ensure we only log completed actions
  // Note: This simple implementation logs after response is sent
  res.on('finish', async () => {
    // Only log successful operations (2xx) or specific errors if needed
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        // Ensure user context exists
        if (!req.userId || !req.tenantId) {
          return;
        }

        // Determine entity type and id from URL params
        // URL convention: /api/accounting/:entity/:id
        const pathParts = req.path.split('/').filter(p => p);
        // pathParts might be ['api', 'accounting', 'journal', '123']
        
        let entityType = 'unknown';
        let entityId = 0;

        // Naive heuristics for entity detection
        if (pathParts.length >= 3) {
            entityType = pathParts[2]; // e.g., 'journal'
        }
        
        if (req.params.id) {
            entityId = parseInt(req.params.id, 10) || 0;
        }

        // For POST requests, we might want to parse the response body to get the new ID,
        // but that requires monkey-patching res.send. 
        // For now, we'll log 0 for new creations in this generic middleware.
        
        await prisma.audit_logs.create({
          data: {
            tenant_id: req.tenantId,
            user_id: req.userId,
            action_type: req.method,
            entity_type: entityType,
            entity_id: entityId,
            old_values: null, // Would require fetching before update
            new_values: req.body ? (req.body as any) : {},
            ip_address: req.ip || req.socket.remoteAddress || '',
            user_agent: req.get('User-Agent') || '',
            reason: req.body?.reason || null
          }
        });
      } catch (error) {
        console.error('Audit logging failed:', error);
      }
    }
  });

  next();
};
