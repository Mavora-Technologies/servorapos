import { Response } from 'express';
import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../config/db';
import {
  supplierInvoices,
  supplierInvoiceItems,
  suppliers,
  purchaseOrders,
  goodsReceivedNotes,
  goodsReceivedItems,
  inventoryItems,
  users,
  branches,
} from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  createSupplierInvoiceSchema,
  recordInvoicePaymentSchema,
} from '../validators/supplier-invoice.validator';

// 1. Get all Supplier Invoices & Accounts Payable Metrics
export const getSupplierInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const invoices = await db
      .select({
        id: supplierInvoices.id,
        invoiceNumber: supplierInvoices.invoiceNumber,
        internalRef: supplierInvoices.internalRef,
        status: supplierInvoices.status,
        subtotal: supplierInvoices.subtotal,
        taxAmount: supplierInvoices.taxAmount,
        totalAmount: supplierInvoices.totalAmount,
        paidAmount: supplierInvoices.paidAmount,
        invoiceDate: supplierInvoices.invoiceDate,
        dueDate: supplierInvoices.dueDate,
        supplierId: supplierInvoices.supplierId,
        supplierName: suppliers.name,
        supplierKraPin: suppliers.kraPin,
        purchaseOrderId: supplierInvoices.purchaseOrderId,
        poNumber: purchaseOrders.poNumber,
        goodsReceivedNoteId: supplierInvoices.goodsReceivedNoteId,
        grnNumber: goodsReceivedNotes.grnNumber,
        branchName: branches.name,
        createdAt: supplierInvoices.createdAt,
      })
      .from(supplierInvoices)
      .innerJoin(suppliers, eq(supplierInvoices.supplierId, suppliers.id))
      .leftJoin(purchaseOrders, eq(supplierInvoices.purchaseOrderId, purchaseOrders.id))
      .leftJoin(goodsReceivedNotes, eq(supplierInvoices.goodsReceivedNoteId, goodsReceivedNotes.id))
      .leftJoin(branches, eq(supplierInvoices.branchId, branches.id))
      .where(eq(supplierInvoices.tenantId, tenantId))
      .orderBy(desc(supplierInvoices.dueDate));

    // Telemetry aggregations
    let totalOutstandingAP = 0;
    let totalPaidYTD = 0;
    let overdueCount = 0;
    const now = new Date();

    const evaluatedInvoices = invoices.map((inv) => {
      const total = parseFloat(inv.totalAmount) || 0;
      const paid = parseFloat(inv.paidAmount) || 0;
      const balance = Math.max(0, total - paid);
      const isOverdue = balance > 0 && new Date(inv.dueDate) < now;

      if (balance > 0) totalOutstandingAP += balance;
      totalPaidYTD += paid;
      if (isOverdue) overdueCount++;

      return {
        ...inv,
        balanceRemaining: balance,
        isOverdue,
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalInvoicesCount: invoices.length,
          totalOutstandingAP: Number(totalOutstandingAP.toFixed(2)),
          totalPaidYTD: Number(totalPaidYTD.toFixed(2)),
          overdueCount,
        },
        invoices: evaluatedInvoices,
      },
    });
  } catch (error: any) {
    console.error('[Get Supplier Invoices Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch supplier invoices' });
  }
};

// 2. Get Single Invoice Details with Line Items
export const getSupplierInvoiceDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const [inv] = await db
      .select({
        id: supplierInvoices.id,
        invoiceNumber: supplierInvoices.invoiceNumber,
        internalRef: supplierInvoices.internalRef,
        status: supplierInvoices.status,
        subtotal: supplierInvoices.subtotal,
        taxAmount: supplierInvoices.taxAmount,
        totalAmount: supplierInvoices.totalAmount,
        paidAmount: supplierInvoices.paidAmount,
        invoiceDate: supplierInvoices.invoiceDate,
        dueDate: supplierInvoices.dueDate,
        supplierId: supplierInvoices.supplierId,
        supplierName: suppliers.name,
        supplierKraPin: suppliers.kraPin,
        supplierEmail: suppliers.email,
        supplierPhone: suppliers.phone,
        purchaseOrderId: supplierInvoices.purchaseOrderId,
        poNumber: purchaseOrders.poNumber,
        goodsReceivedNoteId: supplierInvoices.goodsReceivedNoteId,
        grnNumber: goodsReceivedNotes.grnNumber,
        branchName: branches.name,
        notes: supplierInvoices.notes,
        createdAt: supplierInvoices.createdAt,
      })
      .from(supplierInvoices)
      .innerJoin(suppliers, eq(supplierInvoices.supplierId, suppliers.id))
      .leftJoin(purchaseOrders, eq(supplierInvoices.purchaseOrderId, purchaseOrders.id))
      .leftJoin(goodsReceivedNotes, eq(supplierInvoices.goodsReceivedNoteId, goodsReceivedNotes.id))
      .leftJoin(branches, eq(supplierInvoices.branchId, branches.id))
      .where(and(eq(supplierInvoices.id, Number(id)), eq(supplierInvoices.tenantId, tenantId)))
      .limit(1);

    if (!inv) {
      res.status(404).json({ status: 'error', message: 'Invoice not found' });
      return;
    }

    const items = await db
      .select({
        id: supplierInvoiceItems.id,
        inventoryItemId: supplierInvoiceItems.inventoryItemId,
        itemName: inventoryItems.name,
        itemSku: inventoryItems.sku,
        itemUnit: inventoryItems.unit,
        quantity: supplierInvoiceItems.quantity,
        unitPrice: supplierInvoiceItems.unitPrice,
        taxRate: supplierInvoiceItems.taxRate,
        subtotal: supplierInvoiceItems.subtotal,
        notes: supplierInvoiceItems.notes,
      })
      .from(supplierInvoiceItems)
      .innerJoin(inventoryItems, eq(supplierInvoiceItems.inventoryItemId, inventoryItems.id))
      .where(eq(supplierInvoiceItems.supplierInvoiceId, inv.id));

    // Calculate balance and overdue status for the detail view
    const total = parseFloat(inv.totalAmount) || 0;
    const paid = parseFloat(inv.paidAmount) || 0;
    const balanceRemaining = Math.max(0, total - paid);
    const isOverdue = balanceRemaining > 0 && new Date(inv.dueDate) < new Date();

    res.status(200).json({
      status: 'success',
      data: {
        ...inv,
        balanceRemaining,
        isOverdue,
        items,
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 3. Register Incoming Supplier Invoice
export const createSupplierInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const branchId = req.user?.defaultBranchId;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = createSupplierInvoiceSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      const internalNum = `PINV-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

      let subtotalSum = 0;
      let taxSum = 0;

      const preparedItems = payload.items.map((item) => {
        const lineSubtotal = item.quantity * item.unitPrice;
        const lineTax = lineSubtotal * (item.taxRate / 100);
        subtotalSum += lineSubtotal;
        taxSum += lineTax;

        return {
          inventoryItemId: item.inventoryItemId,
          quantity: item.quantity.toFixed(4),
          unitPrice: item.unitPrice.toFixed(4),
          taxRate: item.taxRate.toFixed(2),
          subtotal: lineSubtotal.toFixed(4),
          notes: item.notes || null,
        };
      });

      const totalVal = subtotalSum + taxSum;

      const [invoice] = await tx
        .insert(supplierInvoices)
        .values({
          tenantId,
          branchId: branchId || null,
          supplierId: payload.supplierId,
          purchaseOrderId: payload.purchaseOrderId || null,
          goodsReceivedNoteId: payload.goodsReceivedNoteId || null,
          invoiceNumber: payload.invoiceNumber,
          internalRef: internalNum,
          status: 'UNPAID',
          subtotal: subtotalSum.toFixed(4),
          taxAmount: taxSum.toFixed(4),
          totalAmount: totalVal.toFixed(4),
          paidAmount: '0.0000',
          invoiceDate: payload.invoiceDate ? new Date(payload.invoiceDate) : new Date(),
          dueDate: new Date(payload.dueDate),
          createdById: userId ? Number(userId) : null,
          notes: payload.notes || null,
        })
        .returning();

      const itemRows = preparedItems.map((p) => ({
        ...p,
        supplierInvoiceId: invoice.id,
      }));

      await tx.insert(supplierInvoiceItems).values(itemRows);

      return invoice;
    });

    res.status(201).json({ status: 'success', data: result });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 4. Record AP Payment
export const recordSupplierPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = recordInvoicePaymentSchema.parse(req.body);

    const [inv] = await db
      .select()
      .from(supplierInvoices)
      .where(and(eq(supplierInvoices.id, Number(id)), eq(supplierInvoices.tenantId, tenantId)))
      .limit(1);

    if (!inv) {
      res.status(404).json({ status: 'error', message: 'Supplier invoice not found' });
      return;
    }

    const currentPaid = parseFloat(inv.paidAmount) || 0;
    const totalAmount = parseFloat(inv.totalAmount) || 0;
    const newPaid = currentPaid + payload.amount;

    if (newPaid > totalAmount + 0.01) {
      res.status(400).json({
        status: 'error',
        message: `Payment amount (${payload.amount}) exceeds remaining balance (${totalAmount - currentPaid})`,
      });
      return;
    }

    const newStatus = newPaid >= totalAmount ? 'PAID' : 'PARTIALLY_PAID';

    const [updated] = await db
      .update(supplierInvoices)
      .set({
        paidAmount: newPaid.toFixed(4),
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(supplierInvoices.id, inv.id))
      .returning();

    res.status(200).json({ status: 'success', data: updated, message: 'Payment recorded successfully' });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 5. Get verified GRNs that have not yet been invoiced
export const getUninvoicedGRNs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    // Find all GRNs whose ID is NOT yet in supplier_invoices
    const uninvoiced = await db
      .select({
        id: goodsReceivedNotes.id,
        grnNumber: goodsReceivedNotes.grnNumber,
        supplierDeliveryNote: goodsReceivedNotes.supplierDeliveryNote,
        receivedDate: goodsReceivedNotes.receivedDate,
        supplierId: goodsReceivedNotes.supplierId,
        supplierName: suppliers.name,
        paymentTerms: suppliers.paymentTerms,
        leadTimeDays: suppliers.leadTimeDays,
        purchaseOrderId: goodsReceivedNotes.purchaseOrderId,
        poNumber: purchaseOrders.poNumber,
        branchId: goodsReceivedNotes.branchId,
        branchName: branches.name,
      })
      .from(goodsReceivedNotes)
      .innerJoin(suppliers, eq(goodsReceivedNotes.supplierId, suppliers.id))
      .innerJoin(purchaseOrders, eq(goodsReceivedNotes.purchaseOrderId, purchaseOrders.id))
      .leftJoin(branches, eq(goodsReceivedNotes.branchId, branches.id))
      .leftJoin(supplierInvoices, eq(goodsReceivedNotes.id, supplierInvoices.goodsReceivedNoteId))
      .where(
        and(
          eq(goodsReceivedNotes.tenantId, tenantId),
          sql`${supplierInvoices.id} IS NULL`
        )
      )
      .orderBy(desc(goodsReceivedNotes.receivedDate));

    res.status(200).json({ status: 'success', data: uninvoiced });
  } catch (error: any) {
    console.error('[Get Uninvoiced GRNs Error]:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 6. Auto-generate invoice draft payload from GRN accepted lines
export const generateInvoiceFromGRN = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { grnId } = req.params;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const [grn] = await db
      .select({
        id: goodsReceivedNotes.id,
        grnNumber: goodsReceivedNotes.grnNumber,
        supplierDeliveryNote: goodsReceivedNotes.supplierDeliveryNote,
        supplierId: goodsReceivedNotes.supplierId,
        supplierName: suppliers.name,
        paymentTerms: suppliers.paymentTerms,
        purchaseOrderId: goodsReceivedNotes.purchaseOrderId,
        branchId: goodsReceivedNotes.branchId,
      })
      .from(goodsReceivedNotes)
      .innerJoin(suppliers, eq(goodsReceivedNotes.supplierId, suppliers.id))
      .where(and(eq(goodsReceivedNotes.id, Number(grnId)), eq(goodsReceivedNotes.tenantId, tenantId)))
      .limit(1);

    if (!grn) {
      res.status(404).json({ status: 'error', message: 'GRN record not found' });
      return;
    }

    // Pull accepted items from goods_received_items
    const lines = await db
      .select({
        inventoryItemId: goodsReceivedItems.inventoryItemId,
        itemName: inventoryItems.name,
        itemUnit: inventoryItems.unit,
        quantityAccepted: goodsReceivedItems.quantityAccepted,
        unitCost: goodsReceivedItems.unitCost,
      })
      .from(goodsReceivedItems)
      .innerJoin(inventoryItems, eq(goodsReceivedItems.inventoryItemId, inventoryItems.id))
      .where(eq(goodsReceivedItems.grnId, grn.id));

    // Calculate subtotal and 16% standard VAT
    let subtotal = 0;
    const items = lines.map((l) => {
      const qty = parseFloat(l.quantityAccepted) || 0;
      const price = parseFloat(l.unitCost) || 0;
      const lineSubtotal = qty * price;
      subtotal += lineSubtotal;

      return {
        inventoryItemId: l.inventoryItemId,
        itemName: l.itemName,
        itemUnit: l.itemUnit,
        quantity: qty,
        unitPrice: price,
        taxRate: 16.0,
        subtotal: lineSubtotal,
      };
    });

    const taxAmount = subtotal * 0.16;
    const totalAmount = subtotal + taxAmount;

    // Calculate due date based on payment terms
    let creditDays = 30;
    if (grn.paymentTerms === 'NET_7') creditDays = 7;
    else if (grn.paymentTerms === 'NET_14') creditDays = 14;
    else if (grn.paymentTerms === 'COD' || grn.paymentTerms === 'PREPAID') creditDays = 0;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + creditDays);

    res.status(200).json({
      status: 'success',
      data: {
        supplierId: grn.supplierId,
        supplierName: grn.supplierName,
        purchaseOrderId: grn.purchaseOrderId,
        goodsReceivedNoteId: grn.id,
        grnNumber: grn.grnNumber,
        invoiceNumber: grn.supplierDeliveryNote || `INV-${grn.grnNumber}`,
        dueDate: dueDate.toISOString().split('T')[0],
        subtotal,
        taxAmount,
        totalAmount,
        items,
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};