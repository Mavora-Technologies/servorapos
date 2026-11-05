// apps/api/src/services/payment.service.ts
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../config/db';
import {
  orders,
  payments,
  cashierShifts,
  mpesaC2bCallbacks,
  fiscalInvoices,
  restaurantTables,
  auditLogs,
} from '../config/schema';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CashPaymentInput {
  tenantId: number;
  branchId?: number;
  orderId: number;
  shiftId?: number;
  cashierId: number;
  amountToAllocate: number; 
  tenderedCash: number; 
}

export interface StkPushInitiateInput {
  tenantId: number;
  branchId?: number;
  orderId: number;
  cashierId: number;
  phoneNumber: string; 
  amount: number;
}

export interface DarajaStkCallbackPayload {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{ Name: string; Value?: string | number }>;
      };
    };
  };
}

export interface DarajaC2bConfirmationPayload {
  TransactionType: string; 
  TransID: string; 
  TransTime: string; 
  TransAmount: string; 
  BusinessShortCode: string;
  BillRefNumber?: string;
  InvoiceNumber?: string;
  OrgAccountBalance?: string;
  ThirdPartyTransID?: string;
  MSISDN: string;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
}

export interface ClaimC2bTillInput {
  tenantId: number;
  branchId?: number;
  c2bCallbackId: number;
  orderId: number;
  cashierId: number;
  amountToClaim?: number; 
}

// ============================================================================
// SAFARICOM PHONE & DARAJA HELPERS
// ============================================================================

function normalizeKenyanPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) {
    return `254${digits.slice(1)}`;
  }
  if (digits.startsWith('7') || digits.startsWith('1')) {
    return `254${digits}`;
  }
  if (digits.startsWith('254') && digits.length === 12) {
    return digits;
  }
  throw new Error(`Invalid Kenyan phone number format: ${phone}`);
}

function getDarajaTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${now.getFullYear()}` +
    `${pad(now.getMonth() + 1)}` +
    `${pad(now.getDate())}` +
    `${pad(now.getHours())}` +
    `${pad(now.getMinutes())}` +
    `${pad(now.getSeconds())}`
  );
}

// ============================================================================
// PAYMENT & RECONCILIATION SERVICE
// ============================================================================

export class PaymentService {
  /**
   * 1. CASH PAYMENT
   */
  static async recordCashPayment(input: CashPaymentInput) {
    if (input.amountToAllocate <= 0) {
      throw new Error('Payment allocation amount must be greater than zero.');
    }
    if (input.tenderedCash < input.amountToAllocate) {
      throw new Error('Tendered cash cannot be less than the amount allocated to the order.');
    }

    return await db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.tenantId, input.tenantId), eq(orders.id, input.orderId)))
        .for('update');

      if (!order) {
        throw new Error('Order not found.');
      }
      if (order.paymentStatus === 'Paid') {
        throw new Error(`Order ${order.orderNumber} is already fully paid.`);
      }

      const remainingBalance = Number((Number(order.total) - Number(order.amountPaid)).toFixed(2));
      const appliedAmount = Math.min(input.amountToAllocate, remainingBalance);
      const changeDue = Number((input.tenderedCash - appliedAmount).toFixed(2));

      // Insert verified Cash Payment record (matching schema payments columns)
      const [paymentRecord] = await tx
        .insert(payments)
        .values({
          tenantId: input.tenantId,
          branchId: input.branchId ?? order.branchId ?? null,
          paymentNumber: `PMT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
          paymentFlow: 'INBOUND_AR',
          paymentMethod: 'CASH_DRAWER',
          clearingAccount: 'Main Cash Drawer',
          orderId: order.id,
          processedById: input.cashierId,
          amount: appliedAmount.toFixed(2),
          status: 'POSTED',
        })
        .returning();

      const updatedOrder = await this.recomputeOrderSettlementInTx(tx, {
        order,
        addedAmount: appliedAmount,
        actorUserId: input.cashierId,
      });

      return {
        payment: paymentRecord,
        order: updatedOrder,
        changeDue,
      };
    });
  }

  /**
   * 2. INITIATE M-PESA DARAJA STK PUSH
   */
  static async initiateMpesaStkPush(input: StkPushInitiateInput) {
    const formattedPhone = normalizeKenyanPhone(input.phoneNumber);

    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.tenantId, input.tenantId), eq(orders.id, input.orderId)));

    if (!order) throw new Error('Order not found.');
    if (order.paymentStatus === 'Paid') {
      throw new Error(`Order ${order.orderNumber} is already paid.`);
    }

    const remainingBalance = Number((Number(order.total) - Number(order.amountPaid)).toFixed(2));
    const amountToRequest = Math.min(Math.ceil(input.amount), Math.ceil(remainingBalance));

    if (amountToRequest <= 0) {
      throw new Error('STK Push amount must be greater than zero.');
    }

    const shortCode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const callbackUrl = process.env.MPESA_STK_CALLBACK_URL;
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const darajaBaseUrl =
      process.env.MPESA_ENV === 'production'
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke';

    if (!shortCode || !passkey || !callbackUrl || !consumerKey || !consumerSecret) {
      throw new Error('M-Pesa Daraja credentials are not fully configured.');
    }

    const authHeader = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const tokenRes = await fetch(
      `${darajaBaseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${authHeader}` } }
    );

    if (!tokenRes.ok) {
      throw new Error(`Failed to authenticate with Safaricom Daraja (${tokenRes.status}).`);
    }

    const { access_token } = (await tokenRes.json()) as { access_token: string };
    const timestamp = getDarajaTimestamp();
    const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');

    const stkRes = await fetch(`${darajaBaseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: process.env.MPESA_TRANSACTION_TYPE || 'CustomerBuyGoodsOnline',
        Amount: amountToRequest,
        PartyA: formattedPhone,
        PartyB: process.env.MPESA_PARTY_B || shortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl,
        AccountReference: order.orderNumber.slice(0, 12),
        TransactionDesc: `Payment for ${order.orderNumber}`,
      }),
    });

    const stkData = (await stkRes.json()) as {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResponseCode?: string;
      ResponseDescription?: string;
      errorMessage?: string;
    };

    if (!stkRes.ok || stkData.ResponseCode !== '0' || !stkData.CheckoutRequestID) {
      throw new Error(
        stkData.errorMessage || stkData.ResponseDescription || 'Safaricom rejected STK Push request.'
      );
    }

    // Persist pending mpesa transaction record
    const [pendingPayment] = await db
      .insert(payments)
      .values({
        tenantId: input.tenantId,
        branchId: input.branchId ?? order.branchId ?? null,
        paymentNumber: `PMT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
        paymentFlow: 'INBOUND_AR',
        paymentMethod: 'MPESA_B2B',
        clearingAccount: 'M-Pesa Till / Paybill',
        orderId: order.id,
        processedById: input.cashierId,
        amount: amountToRequest.toFixed(2),
        status: 'POSTED',
        transactionReference: stkData.CheckoutRequestID,
      })
      .returning();

    return {
      paymentId: pendingPayment.id,
      checkoutRequestId: stkData.CheckoutRequestID,
      customerMessage: 'STK Push sent to customer phone. Awaiting PIN confirmation.',
    };
  }

  /**
   * 3. PROCESS DARAJA STK PUSH WEBHOOK CALLBACK
   */
  static async handleStkCallback(payload: DarajaStkCallbackPayload) {
    const callback = payload?.Body?.stkCallback;
    if (!callback || !callback.CheckoutRequestID) {
      throw new Error('Malformed Daraja STK callback payload.');
    }

    return await db.transaction(async (tx) => {
      const [payment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.transactionReference, callback.CheckoutRequestID))
        .for('update');

      if (!payment) {
        return { ignored: true, reason: 'Unknown CheckoutRequestID' };
      }

      if (payment.status === 'RECONCILED' || callback.ResultCode !== 0) {
        return { ignored: true, reason: 'Already processed or failed', status: payment.status };
      }

      const items = callback.CallbackMetadata?.Item || [];
      const receiptItem = items.find((i) => i.Name === 'MpesaReceiptNumber');
      const amountItem = items.find((i) => i.Name === 'Amount');

      const mpesaReceipt = String(receiptItem?.Value || '');
      const verifiedAmount = Number(amountItem?.Value ?? payment.amount);

      await tx
        .update(payments)
        .set({
          status: 'RECONCILED',
          amount: verifiedAmount.toFixed(2),
          transactionReference: mpesaReceipt,
          reconciledAt: new Date(),
        })
        .where(eq(payments.id, payment.id));

      const [order] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.tenantId, payment.tenantId), eq(orders.id, payment.orderId!)))
        .for('update');

      if (order) {
        await this.recomputeOrderSettlementInTx(tx, {
          order,
          addedAmount: verifiedAmount,
          actorUserId: payment.processedById ?? undefined,
          providerRef: mpesaReceipt,
        });
      }

      return {
        status: 'COMPLETED',
        mpesaReceipt,
        verifiedAmount,
      };
    });
  }

  /**
   * 4. INGEST DARAJA C2B TILL CONFIRMATION
   */
  static async handleC2bConfirmation(
    tenantId: number,
    branchId: number | undefined,
    payload: DarajaC2bConfirmationPayload
  ) {
    const transId = payload.TransID?.trim().toUpperCase();
    const transAmount = Number(payload.TransAmount);

    if (!transId || isNaN(transAmount) || transAmount <= 0) {
      throw new Error('Invalid C2B payload.');
    }

    return await db.transaction(async (tx) => {
      const [existingC2b] = await tx
        .select()
        .from(mpesaC2bCallbacks)
        .where(
          and(
            eq(mpesaC2bCallbacks.tenantId, tenantId),
            eq(mpesaC2bCallbacks.transId, transId)
          )
        );

      if (existingC2b) {
        return {
          ResultCode: 0,
          ResultDesc: 'Confirmation already processed',
          c2bRecord: existingC2b,
        };
      }

      let matchedOrder: typeof orders.$inferSelect | undefined;
      const cleanBillRef = payload.BillRefNumber?.trim().toUpperCase();

      if (cleanBillRef) {
        const [candidate] = await tx
          .select()
          .from(orders)
          .where(
            and(
              eq(orders.tenantId, tenantId),
              eq(orders.orderNumber, cleanBillRef)
            )
          )
          .for('update');

        if (candidate && candidate.paymentStatus !== 'Paid') {
          matchedOrder = candidate;
        }
      }

      const isAutoMatched = Boolean(matchedOrder);
      const [insertedC2b] = await tx
        .insert(mpesaC2bCallbacks)
        .values({
          tenantId,
          branchId: branchId ?? matchedOrder?.branchId ?? null,
          transId,
          transactionType: payload.TransactionType || 'CustomerBuyGoodsOnline',
          transAmount: transAmount.toFixed(2),
          businessShortCode: payload.BusinessShortCode,
          billRefNumber: payload.BillRefNumber ?? null,
          msisdn: payload.MSISDN,
          firstName: payload.FirstName ?? null,
          middleName: payload.MiddleName ?? null,
          lastName: payload.LastName ?? null,
          transTime: payload.TransTime,
          allocationStatus: isAutoMatched ? 'FULLY_ALLOCATED' : 'UNALLOCATED',
          allocatedAmount: isAutoMatched ? transAmount.toFixed(2) : '0.00',
          claimedOrderId: matchedOrder?.id ?? null,
          claimedAt: isAutoMatched ? new Date() : null,
          rawPayload: payload,
        })
        .returning();

      if (matchedOrder) {
        await tx.insert(payments).values({
          tenantId,
          branchId: matchedOrder.branchId,
          paymentNumber: `PMT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
          paymentFlow: 'INBOUND_AR',
          paymentMethod: 'MPESA_B2B',
          clearingAccount: 'M-Pesa C2B Till',
          orderId: matchedOrder.id,
          amount: transAmount.toFixed(2),
          status: 'POSTED',
          transactionReference: transId,
        });

        await this.recomputeOrderSettlementInTx(tx, {
          order: matchedOrder,
          addedAmount: transAmount,
          providerRef: transId,
        });
      }

      return {
        ResultCode: 0,
        ResultDesc: 'Confirmation received successfully',
        c2bRecord: insertedC2b,
        autoAllocatedOrderId: matchedOrder?.id ?? null,
      };
    });
  }

  /**
   * 5. LIST UNCLAIMED C2B TILL PAYMENTS
   */
  static async listUnclaimedTillPayments(tenantId: number, branchId?: number) {
    return await db
      .select()
      .from(mpesaC2bCallbacks)
      .where(
        and(
          eq(mpesaC2bCallbacks.tenantId, tenantId),
          eq(mpesaC2bCallbacks.allocationStatus, 'UNALLOCATED'),
          branchId ? eq(mpesaC2bCallbacks.branchId, branchId) : undefined
        )
      )
      .orderBy(desc(mpesaC2bCallbacks.createdAt))
      .limit(50);
  }

  /**
   * 6. CLAIM AN UNALLOCATED M-PESA TILL PAYMENT
   */
  static async claimC2bTillPayment(input: ClaimC2bTillInput) {
    return await db.transaction(async (tx) => {
      const [c2b] = await tx
        .select()
        .from(mpesaC2bCallbacks)
        .where(
          and(
            eq(mpesaC2bCallbacks.tenantId, input.tenantId),
            eq(mpesaC2bCallbacks.id, input.c2bCallbackId)
          )
        )
        .for('update');

      if (!c2b) {
        throw new Error('M-Pesa Till transaction not found.');
      }
      if (c2b.allocationStatus === 'FULLY_ALLOCATED') {
        throw new Error(`M-Pesa transaction ${c2b.transId} has already been claimed.`);
      }

      const availableOnTill = Number(
        (Number(c2b.transAmount) - Number(c2b.allocatedAmount)).toFixed(2)
      );
      if (availableOnTill <= 0) {
        throw new Error(`M-Pesa transaction ${c2b.transId} has zero remaining balance.`);
      }

      const [order] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.tenantId, input.tenantId), eq(orders.id, input.orderId)))
        .for('update');

      if (!order) {
        throw new Error('Order not found.');
      }
      if (order.paymentStatus === 'Paid') {
        throw new Error(`Order ${order.orderNumber} is already fully paid.`);
      }

      const orderRemaining = Number((Number(order.total) - Number(order.amountPaid)).toFixed(2));
      const requestedClaim = input.amountToClaim ?? availableOnTill;
      const actualAllocated = Math.min(availableOnTill, orderRemaining, requestedClaim);

      const newAllocatedTotal = Number(
        (Number(c2b.allocatedAmount) + actualAllocated).toFixed(2)
      );
      const newAllocationStatus =
        newAllocatedTotal >= Number(c2b.transAmount)
          ? 'FULLY_ALLOCATED'
          : 'PARTIALLY_ALLOCATED';

      await tx
        .update(mpesaC2bCallbacks)
        .set({
          allocatedAmount: newAllocatedTotal.toFixed(2),
          allocationStatus: newAllocationStatus,
          claimedByUserId: input.cashierId,
          claimedOrderId: order.id,
          claimedAt: new Date(),
        })
        .where(eq(mpesaC2bCallbacks.id, c2b.id));

      const [paymentRecord] = await tx
        .insert(payments)
        .values({
          tenantId: input.tenantId,
          branchId: input.branchId ?? order.branchId ?? null,
          paymentNumber: `PMT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
          paymentFlow: 'INBOUND_AR',
          paymentMethod: 'MPESA_B2B',
          clearingAccount: 'M-Pesa C2B Till',
          orderId: order.id,
          processedById: input.cashierId,
          amount: actualAllocated.toFixed(2),
          status: 'POSTED',
          transactionReference: c2b.transId,
        })
        .returning();

      const updatedOrder = await this.recomputeOrderSettlementInTx(tx, {
        order,
        addedAmount: actualAllocated,
        actorUserId: input.cashierId,
        providerRef: c2b.transId,
      });

      await tx.insert(auditLogs).values({
        tenantId: input.tenantId,
        branchId: input.branchId ?? order.branchId ?? null,
        userId: input.cashierId,
        action: 'MPESA_TILL_CLAIMED',
        module: 'FINANCE',
        entityType: 'mpesa_c2b_callbacks',
        entityId: String(c2b.id),
        newValues: {
          transId: c2b.transId,
          orderNumber: order.orderNumber,
          allocatedAmount: actualAllocated,
          allocationStatus: newAllocationStatus,
        },
      });

      return {
        payment: paymentRecord,
        order: updatedOrder,
        c2bStatus: newAllocationStatus,
      };
    });
  }

  private static async recomputeOrderSettlementInTx(
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    params: {
      order: typeof orders.$inferSelect;
      addedAmount: number;
      actorUserId?: number;
      providerRef?: string;
    }
  ) {
    const newAmountPaid = Number(
      (Number(params.order.amountPaid) + params.addedAmount).toFixed(2)
    );
    const orderTotal = Number(params.order.total);
    const isFullyPaid = newAmountPaid >= orderTotal;

    const newPaymentStatus = isFullyPaid ? 'Paid' : 'Partial';
    const newOrderStatus =
      isFullyPaid && params.order.status === 'Served'
        ? 'Completed'
        : params.order.status;

    const [updatedOrder] = await tx
      .update(orders)
      .set({
        amountPaid: newAmountPaid.toFixed(2),
        paymentStatus: newPaymentStatus,
        status: newOrderStatus,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, params.order.id))
      .returning();

    if (isFullyPaid) {
      const [existingFiscal] = await tx
        .select()
        .from(fiscalInvoices)
        .where(
          and(
            eq(fiscalInvoices.tenantId, params.order.tenantId),
            eq(fiscalInvoices.orderId, params.order.id),
            eq(fiscalInvoices.invoiceType, 'SALE')
          )
        );

      if (!existingFiscal) {
        await tx.insert(fiscalInvoices).values({
          tenantId: params.order.tenantId,
          branchId: params.order.branchId ?? null,
          orderId: params.order.id,
          invoiceType: 'SALE',
          buyerKraPin: params.order.buyerKraPin ?? null,
          fiscalStatus: 'PENDING',
        });
      }

      if (params.order.tableId && newOrderStatus === 'Completed') {
        await tx
          .update(restaurantTables)
          .set({ status: 'Cleaning', updatedAt: new Date() })
          .where(eq(restaurantTables.id, params.order.tableId));
      }
    }

    return updatedOrder;
  }
}