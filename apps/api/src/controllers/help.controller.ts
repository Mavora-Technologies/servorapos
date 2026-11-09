import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as helpRepo from '../repositories/help.repository';
import {
  createTicketSchema,
  addTicketMessageSchema,
  updateTicketStatusSchema,
  listTicketsQuerySchema,
  listKbQuerySchema,
} from '../validators/help.validator';

export const getHelpOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const [telemetry, kbArticles] = await Promise.all([
      helpRepo.getHelpDeskTelemetry(tenantId),
      helpRepo.listKbArticles(tenantId, {}),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        telemetry,
        kbArticles,
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to retrieve help overview' });
  }
};

export const getTickets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = listTicketsQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const result = await helpRepo.listTickets(tenantId, parseResult.data);

    res.status(200).json({
      status: 'success',
      data: result.tickets,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to list tickets' });
  }
};

export const getTicketDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const ticketId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(ticketId)) {
      res.status(400).json({ status: 'error', message: 'Valid ticket identifier required' });
      return;
    }

    const ticket = await helpRepo.getTicketDetails(tenantId, ticketId);
    if (!ticket) {
      res.status(404).json({ status: 'error', message: 'Ticket not found' });
      return;
    }

    res.status(200).json({ status: 'success', data: ticket });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to retrieve ticket' });
  }
};

export const postTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = createTicketSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const created = await helpRepo.createTicket(tenantId, userId, parseResult.data);

    res.status(201).json({
      status: 'success',
      data: created,
      message: `Support incident ${created.ticketNumber} registered successfully.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to submit ticket' });
  }
};

export const postTicketMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    const ticketId = parseInt(String(req.params.id), 10);

    if (!tenantId || !userId || isNaN(ticketId)) {
      res.status(400).json({ status: 'error', message: 'Valid ticket identifier required' });
      return;
    }

    const parseResult = addTicketMessageSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const message = await helpRepo.addTicketMessage(tenantId, ticketId, userId, parseResult.data);

    res.status(201).json({
      status: 'success',
      data: message,
      message: 'Reply posted to ticket thread.',
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to post message' });
  }
};

export const patchTicketStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const ticketId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(ticketId)) {
      res.status(400).json({ status: 'error', message: 'Valid ticket identifier required' });
      return;
    }

    const parseResult = updateTicketStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const updated = await helpRepo.updateTicketStatus(tenantId, ticketId, parseResult.data.status);

    res.status(200).json({
      status: 'success',
      data: updated,
      message: `Ticket status marked as ${parseResult.data.status}.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update ticket status' });
  }
};

export const getKbArticle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    if (!slug) {
      res.status(400).json({ status: 'error', message: 'Article slug is required' });
      return;
    }

    const article = await helpRepo.getKbArticleBySlug(String(slug));
    if (!article) {
      res.status(404).json({ status: 'error', message: 'Article not found' });
      return;
    }

    res.status(200).json({ status: 'success', data: article });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch article' });
  }
};