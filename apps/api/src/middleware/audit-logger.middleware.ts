// apps/api/src/middleware/audit-logger.middleware.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { logAuditEvent } from '../services/audit-log.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function extractClientIp(req: AuthRequest): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim().slice(0, 64);
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].trim().slice(0, 64);
  }
  return (req.ip || req.socket?.remoteAddress || null)?.slice(0, 64) ?? null;
}

function classifyRoute(
  method: string,
  originalUrl: string
): { module: string; entityType: string; action: string; entityIdFromPath: string | null } {
  const cleanPath = originalUrl.split('?')[0].replace(/^\/api\/v\d+\/?/, '');
  const segments = cleanPath.split('/').filter(Boolean);

  const root = (segments[0] || 'SYSTEM').toLowerCase();
  const sub = (segments[1] || '').toLowerCase();
  const numericId = segments.find((seg) => /^\d+$/.test(seg)) ?? null;

  const moduleMap: Record<string, string> = {
    auth: 'AUTH',
    pos: 'POS',
    orders: 'POS',
    kds: 'KDS',
    kitchen: 'KDS',
    restaurant: 'FLOOR_OPS',
    menu: 'MENU',
    inventory: 'INVENTORY',
    procurement: 'PROCUREMENT',
    suppliers: 'PROCUREMENT',
    payments: 'FINANCE',
    'cash-management': 'TREASURY',
    expenses: 'FINANCE',
    adjustments: 'FINANCE',
    customers: 'CRM',
    loyalty: 'CRM',
    marketing: 'CRM',
    staff: 'WORKFORCE_HCM',
    workforce: 'WORKFORCE_HCM',
    hr: 'WORKFORCE_HCM',
    reports: 'ANALYTICS',
    settings: 'SETTINGS',
    'ai-assistant': 'AI_COPILOT',
  };

  const moduleName = moduleMap[root] || root.toUpperCase().replace(/[^A-Z0-9_]/g, '_');

  // Specific Auth Actions
  if (root === 'auth') {
    if (sub.includes('login')) {
      return {
        module: 'AUTH',
        entityType: 'user_session',
        action: sub.includes('pin') ? 'USER_PIN_LOGIN' : 'USER_LOGIN',
        entityIdFromPath: null,
      };
    }
    if (sub.includes('logout')) {
      return {
        module: 'AUTH',
        entityType: 'user_session',
        action: 'USER_LOGOUT',
        entityIdFromPath: null,
      };
    }
    if (sub.includes('register')) {
      return {
        module: 'AUTH',
        entityType: 'tenant_user',
        action: 'USER_REGISTERED',
        entityIdFromPath: null,
      };
    }
  }

  const nonNumericSegments = segments.filter((s) => !/^\d+$/.test(s));
  const entityType = nonNumericSegments.slice(0, 2).join('_') || root;

  const verbMap: Record<string, string> = {
    POST: 'CREATED',
    PUT: 'UPDATED',
    PATCH: 'UPDATED',
    DELETE: 'DELETED',
  };

  const lastSegment = nonNumericSegments[nonNumericSegments.length - 1] || entityType;
  const action = `${entityType.toUpperCase().replace(/[^A-Z0-9_]/g, '_')}_${verbMap[method] || method}`;

  // If the last non-numeric segment is a verb-like action (e.g. toggle, settle, approve, void, bulk)
  const verbAction = ['toggle', 'settle', 'approve', 'reject', 'void', 'bulk', 'redeem', 'clock-in', 'clock-out'].includes(
    lastSegment.toLowerCase()
  )
    ? `${nonNumericSegments.slice(0, -1).join('_').toUpperCase()}_${lastSegment.toUpperCase().replace(/-/g, '_')}`
    : action;

  return {
    module: moduleName,
    entityType,
    action: verbAction.replace(/^_+|_+$/g, '') || action,
    entityIdFromPath: numericId,
  };
}

function extractEntityIdFromBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const obj = body as Record<string, unknown>;
  const data = obj.data && typeof obj.data === 'object' ? (obj.data as Record<string, unknown>) : obj;

  const candidates = [
    data.id,
    data.orderNumber,
    data.invoiceNumber,
    data.recipeId,
    (data.user as Record<string, unknown> | undefined)?.id,
  ];

  for (const val of candidates) {
    if (typeof val === 'number' || (typeof val === 'string' && val.trim().length > 0)) {
      return String(val);
    }
  }
  return null;
}

export const globalAuditLogger = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!MUTATING_METHODS.has(req.method)) {
    next();
    return;
  }

  let responsePayload: unknown = null;
  const originalJson = res.json.bind(res);

  res.json = ((body: unknown) => {
    responsePayload = body;
    return originalJson(body);
  }) as Response['json'];

  res.on('finish', () => {
    // Skip if controller already persisted a rich domain audit log or request failed validation/auth
    if (res.locals.auditLogged) return;
    if (res.statusCode < 200 || res.statusCode >= 400) return;

    const respObj =
      responsePayload && typeof responsePayload === 'object'
        ? (responsePayload as Record<string, unknown>)
        : null;
    const respData =
      respObj?.data && typeof respObj.data === 'object'
        ? (respObj.data as Record<string, unknown>)
        : null;
    const respUser =
      respData?.user && typeof respData.user === 'object'
        ? (respData.user as Record<string, unknown>)
        : null;

    // Resolve tenantId & userId from authenticated session OR login/register response payload
    const tenantId =
      req.user?.tenantId ??
      (typeof respUser?.tenantId === 'number' ? respUser.tenantId : undefined) ??
      (typeof (respData?.business as Record<string, unknown> | undefined)?.id === 'number'
        ? ((respData?.business as Record<string, unknown>).id as number)
        : undefined);

    if (!tenantId) return;

    const userId =
      req.user?.userId ??
      (typeof respUser?.id === 'number' ? respUser.id : null);

    const branchId =
      (req.body && typeof req.body.branchId === 'number' ? req.body.branchId : null) ??
      req.user?.defaultBranchId ??
      (typeof respUser?.defaultBranchId === 'number' ? respUser.defaultBranchId : null);

    const { module, entityType, action, entityIdFromPath } = classifyRoute(
      req.method,
      req.originalUrl
    );

    const entityId =
      entityIdFromPath ||
      extractEntityIdFromBody(responsePayload) ||
      (userId ? String(userId) : 'N/A');

    const reason =
      req.body && typeof req.body.reason === 'string' && req.body.reason.trim()
        ? req.body.reason.trim()
        : `${req.method} ${req.originalUrl.split('?')[0]} (${res.statusCode})`;

    const newValues =
      req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0
        ? (req.body as Record<string, unknown>)
        : null;

    void logAuditEvent(tenantId, {
      branchId,
      userId,
      action,
      module,
      entityType,
      entityId,
      reason,
      previousValues: null,
      newValues,
      ipAddress: extractClientIp(req),
    });
  });

  next();
};