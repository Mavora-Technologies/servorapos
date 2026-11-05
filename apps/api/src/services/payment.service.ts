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
  amountToAllocate: number; // Portion of the order being settled
  tenderedCash: number; // Actual notes/coins handed over by customer
}

export interface StkPushInitiateInput {
  tenantId: number;
  branchId?: number;
  orderId: number;
  cashierId: number;
  phoneNumber: string; // e.g., 0712345678 or 254712345678
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
  TransactionType: string; // "Pay Bill" or "Buy Goods"
  TransID: string; // e.g., "SLK49X12AB"
  TransTime: string; // YYYYMMDDHHmmss
  TransAmount: string; // "1500.00"
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
  amountToClaim?: number; // Optional partial claim for split payments
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
   * 1. CASH PAYMENT (Supports full or split payment + updates Cashier Shift expected cash)
   */
  static async recordCashPayment(input: CashPaymentInput) {
    if (input.amountToAllocate <= 0) {
      throw new Error('Payment allocation amount must be greater than zero.');
    }
    if (input.tenderedCash < input.amountToAllocate) {
      throw new Error('Tendered cash cannot be less than the amount allocated to the order.');
    }

    return await db.transaction(async (tx) => {
      // Lock the order row to prevent concurrent overpayment
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

      // Verify and update active Cashier Shift expected physical cash (Section 20)
      if (input.shiftId) {
        const [shift] = await tx
          .select()
          .from(cashierShifts)
          .where(
            and(
              eq(cashierShifts.tenantId, input.tenantId),
              eq(cashierShifts.id, input.shiftId),
              eq(cashierShifts.status, 'OPEN')
            )
          )
          .for('update');

        if (!shift) {
          throw new Error('Active cashier shift not found or already closed.');
        }

        const updatedExpectedCash = Number(shift.expectedCash) + appliedAmount;
        await tx
          .update(cashierShifts)
          .set({ expectedCash: updatedExpectedCash.toFixed(2) })
          .where(eq(cashierShifts.id, shift.id));
      }

      // Insert verified Cash Payment record
      const [paymentRecord] = await tx
        .insert(payments)
        .values({
          tenantId: input.tenantId,
          branchId: input.branchId ?? order.branchId ?? null,
          orderId: order.id,
          shiftId: input.shiftId ?? null,
          processedByUserId: input.cashierId,
          paymentMethod: 'CASH',
          amount: appliedAmount.toFixed(2),
          tenderedAmount: input.tenderedCash.toFixed(2),
          changeDue: changeDue.toFixed(2),
          status: 'COMPLETED',
          paidAt: new Date(),
        })
        .returning();

      // Recompute order balance, release table if complete, and queue eTIMS invoice
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
   * 2. INITIATE M-PESA DARAJA STK PUSH (Lipa na M-Pesa Online)
   * Note: Keeps external HTTP call outside the DB lock per Section 32.
   */
  static async initiateMpesaStkPush(input: StkPushInitiateInput) {
    const formattedPhone = normalizeKenyanPhone(input.phoneNumber);

    // Validate order exists and has an unpaid balance before calling Safaricom
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

    // Obtain Daraja OAuth Token & fire STK Push
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
      throw new Error(
        'M-Pesa Daraja credentials are not fully configured in environment variables.'
      );
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
        TransactionType:
          process.env.MPESA_TRANSACTION_TYPE || 'CustomerBuyGoodsOnline',
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
        stkData.errorMessage ||
          stkData.ResponseDescription ||
          'Safaricom rejected STK Push request.'
      );
    }

    // Persist PENDING payment record linked via CheckoutRequestID (Never mark PAID here!)
    const [pendingPayment] = await db
      .insert(payments)
      .values({
        tenantId: input.tenantId,
        branchId: input.branchId ?? order.branchId ?? null,
        orderId: order.id,
        processedByUserId: input.cashierId,
        paymentMethod: 'MPESA_STK',
        amount: amountToRequest.toFixed(2),
        status: 'PENDING',
        checkoutRequestId: stkData.CheckoutRequestID,
        customerPhone: formattedPhone,
      })
      .returning();

    return {
      paymentId: pendingPayment.id,
      checkoutRequestId: stkData.CheckoutRequestID,
      customerMessage: 'STK Push sent to customer phone. Awaiting PIN confirmation.',
    };
  }

  /**
   * 3. PROCESS DARAJA STK PUSH WEBHOOK CALLBACK (Idempotent & Transactional)
   */
  static async handleStkCallback(payload: DarajaStkCallbackPayload) {
    const callback = payload?.Body?.stkCallback;
    if (!callback || !callback.CheckoutRequestID) {
      throw new Error('Malformed Daraja STK callback payload.');
    }

    return await db.transaction(async (tx) => {
      // Lock payment row by CheckoutRequestID
      const [payment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.checkoutRequestId, callback.CheckoutRequestID))
        .for('update');

      if (!payment) {
        return { ignored: true, reason: 'Unknown CheckoutRequestID' };
      }

      // Idempotency guard: if webhook was already processed, exit cleanly
      if (payment.status === 'COMPLETED' || payment.status === 'FAILED') {
        return { ignored: true, reason: 'Already processed', status: payment.status };
      }

      // If customer cancelled or timed out (ResultCode !== 0)
      if (callback.ResultCode !== 0) {
        await tx
          .update(payments)
          .set({ status: 'FAILED' })
          .where(eq(payments.id, payment.id));

        return { status: 'FAILED', resultDesc: callback.ResultDesc };
      }

      // Extract MpesaReceiptNumber & verified Amount from CallbackMetadata
      const items = callback.CallbackMetadata?.Item || [];
      const receiptItem = items.find((i) => i.Name === 'MpesaReceiptNumber');
      const amountItem = items.find((i) => i.Name === 'Amount');
      const phoneItem = items.find((i) => i.Name === 'PhoneNumber');

      const mpesaReceipt = String(receiptItem?.Value || '');
      const verifiedAmount = Number(amountItem?.Value ?? payment.amount);

      // Update payment record to COMPLETED
      await tx
        .update(payments)
        .set({
          status: 'COMPLETED',
          amount: verifiedAmount.toFixed(2),
          providerReference: mpesaReceipt,
          customerPhone: phoneItem?.Value ? String(phoneItem.Value) : payment.customerPhone,
          paidAt: new Date(),
        })
        .where(eq(payments.id, payment.id));

      // Lock and update the parent Order balance
      const [order] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.tenantId, payment.tenantId), eq(orders.id, payment.orderId)))
        .for('update');

      if (order) {
        await this.recomputeOrderSettlementInTx(tx, {
          order,
          addedAmount: verifiedAmount,
          actorUserId: payment.processedByUserId ?? undefined,
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
   * 4. INGEST DARAJA C2B TILL / PAYBILL CONFIRMATION WEBHOOK
   * Auto-allocates if BillRefNumber matches an open order, otherwise places in
   * UNALLOCATED queue for the POS "Unclaimed M-Pesa Payments" feed.
   */
  static async handleC2bConfirmation(
    tenantId: number,
    branchId: number | undefined,
    payload: DarajaC2bConfirmationPayload
  ) {
    const transId = payload.TransID?.trim().toUpperCase();
    const transAmount = Number(payload.TransAmount);

    if (!transId || isNaN(transAmount) || transAmount <= 0) {
      throw new Error('Invalid C2B payload: missing TransID or TransAmount.');
    }

    return await db.transaction(async (tx) => {
      // 1. Idempotency check on (tenantId, transId)
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
          ResultDesc: 'Confirmation already processed (Idempotent)',
          c2bRecord: existingC2b,
        };
      }

      // 2. Check if BillRefNumber matches an open Order Number (Paybill auto-match)
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

      // 3. Insert C2B callback record
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

      // 4. If auto-matched via Paybill BillRefNumber, create payment & settle order
      if (matchedOrder) {
        await tx.insert(payments).values({
          tenantId,
          branchId: matchedOrder.branchId,
          orderId: matchedOrder.id,
          paymentMethod: 'MPESA_TILL',
          amount: transAmount.toFixed(2),
          status: 'COMPLETED',
          providerReference: transId,
          customerPhone: payload.MSISDN,
          paidAt: new Date(),
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
   * 5. LIST UNCLAIMED C2B TILL PAYMENTS FOR POS DRAWER
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
   * 6. CLAIM AN UNALLOCATED M-PESA BUY GOODS TILL PAYMENT ON POS
   * Uses strict FOR UPDATE row locking so two cashiers cannot claim the same TransID.
   */
  static async claimC2bTillPayment(input: ClaimC2bTillInput) {
    return await db.transaction(async (tx) => {
      // 1. Lock the C2B callback row
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
        throw new Error(
          `M-Pesa transaction ${c2b.transId} has already been claimed on another order.`
        );
      }

      const availableOnTill = Number(
        (Number(c2b.transAmount) - Number(c2b.allocatedAmount)).toFixed(2)
      );
      if (availableOnTill <= 0) {
        throw new Error(`M-Pesa transaction ${c2b.transId} has zero remaining balance.`);
      }

      // 2. Lock the target Order row
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

      // 3. Update C2B Till record status
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

      // 4. Create verified Payment record linked to the M-Pesa TransID
      const [paymentRecord] = await tx
        .insert(payments)
        .values({
          tenantId: input.tenantId,
          branchId: input.branchId ?? order.branchId ?? null,
          orderId: order.id,
          processedByUserId: input.cashierId,
          paymentMethod: 'MPESA_TILL',
          amount: actualAllocated.toFixed(2),
          status: 'COMPLETED',
          providerReference: c2b.transId,
          customerPhone: c2b.msisdn,
          paidAt: new Date(),
        })
        .returning();

      // 5. Update Order settlement & queue eTIMS fiscal invoice if complete
      const updatedOrder = await this.recomputeOrderSettlementInTx(tx, {
        order,
        addedAmount: actualAllocated,
        actorUserId: input.cashierId,
        providerRef: c2b.transId,
      });

      // 6. Write Audit Trail
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

  /**
   * INTERNAL HELPER: Updates Order amountPaid & paymentStatus, frees Dine-In table
   * if completed, and queues a KRA eTIMS Fiscal Invoice record when fully settled.
   */
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

    // If fully paid, queue a KRA eTIMS Fiscal Invoice record (Section 26A)
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

      // If Dine-In order is already Served and now Paid, mark table as Cleaning
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