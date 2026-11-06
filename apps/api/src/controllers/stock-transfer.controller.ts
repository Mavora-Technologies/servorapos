// apps/api/src/controllers/stock-transfer.controller.ts
import { Response } from 'express';
import { eq, desc, and, aliasedTable, sql } from 'drizzle-orm';
import { db } from '../config/db';
import { 
  stockTransfers, 
  stockTransferItems, 
  inventoryItems, 
  stockMovements, 
  branches, 
  users,
  logisticsFleet,
  transferFleetDispatches
} from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  createTransferSchema,
  dispatchTransferSchema,
  receiveTransferSchema,
} from '../validators/stock-transfer.validator';

const sourceBranches = aliasedTable(branches, 'source_branches');
const destBranches = aliasedTable(branches, 'dest_branches');

// 1. Get All Transfers with Fleet & Valuation Telemetry
export const getStockTransfers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const transfers = await db
      .select({
        id: stockTransfers.id,
        transferNumber: stockTransfers.transferNumber,
        status: stockTransfers.status,
        sourceBranchId: stockTransfers.sourceBranchId,
        sourceBranchName: sourceBranches.name,
        destinationBranchId: stockTransfers.destinationBranchId,
        destinationBranchName: destBranches.name,
        carrierVehiclePlate: stockTransfers.carrierVehiclePlate,
        driverName: stockTransfers.driverName,
        dispatchTempProbe: stockTransfers.dispatchTempProbe,
        arrivalTempProbe: stockTransfers.arrivalTempProbe,
        totalValuation: stockTransfers.totalValuation,
        transitLossValuation: stockTransfers.transitLossValuation,
        notes: stockTransfers.notes,
        dispatchedAt: stockTransfers.dispatchedAt,
        receivedAt: stockTransfers.receivedAt,
        createdAt: stockTransfers.createdAt,
        requesterEmail: users.email,
      })
      .from(stockTransfers)
      .innerJoin(sourceBranches, eq(stockTransfers.sourceBranchId, sourceBranches.id))
      .innerJoin(destBranches, eq(stockTransfers.destinationBranchId, destBranches.id))
      .leftJoin(users, eq(stockTransfers.requestedById, users.id))
      .where(eq(stockTransfers.tenantId, tenantId))
      .orderBy(desc(stockTransfers.createdAt));

    let inTransitValuation = 0;
    let pendingCount = 0;
    let activeTransitCount = 0;

    transfers.forEach((t) => {
      if (t.status === 'IN_TRANSIT') {
        inTransitValuation += parseFloat(t.totalValuation) || 0;
        activeTransitCount++;
      } else if (t.status === 'PENDING') {
        pendingCount++;
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalTransfers: transfers.length,
          activeTransitCount,
          pendingCount,
          inTransitValuation: Number(inTransitValuation.toFixed(2)),
        },
        transfers,
      },
    });
  } catch (error: any) {
    console.error('[Get Stock Transfers Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch stock transfers' });
  }
};

// 2. Get Single Transfer Manifest with Line Items
export const getStockTransferDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const [transfer] = await db
      .select({
        id: stockTransfers.id,
        transferNumber: stockTransfers.transferNumber,
        status: stockTransfers.status,
        sourceBranchId: stockTransfers.sourceBranchId,
        sourceBranchName: sourceBranches.name,
        destinationBranchId: stockTransfers.destinationBranchId,
        destinationBranchName: destBranches.name,
        carrierVehiclePlate: stockTransfers.carrierVehiclePlate,
        driverName: stockTransfers.driverName,
        dispatchTempProbe: stockTransfers.dispatchTempProbe,
        arrivalTempProbe: stockTransfers.arrivalTempProbe,
        totalValuation: stockTransfers.totalValuation,
        transitLossValuation: stockTransfers.transitLossValuation,
        notes: stockTransfers.notes,
        dispatchedAt: stockTransfers.dispatchedAt,
        receivedAt: stockTransfers.receivedAt,
        createdAt: stockTransfers.createdAt,
        requesterEmail: users.email,
      })
      .from(stockTransfers)
      .innerJoin(sourceBranches, eq(stockTransfers.sourceBranchId, sourceBranches.id))
      .innerJoin(destBranches, eq(stockTransfers.destinationBranchId, destBranches.id))
      .leftJoin(users, eq(stockTransfers.requestedById, users.id))
      .where(and(eq(stockTransfers.id, Number(id)), eq(stockTransfers.tenantId, tenantId)))
      .limit(1);

    if (!transfer) {
      res.status(404).json({ status: 'error', message: 'Stock transfer record not found' });
      return;
    }

    const items = await db
      .select({
        id: stockTransferItems.id,
        inventoryItemId: stockTransferItems.inventoryItemId,
        itemName: inventoryItems.name,
        itemSku: inventoryItems.sku,
        itemUnit: inventoryItems.unit,
        itemCategory: inventoryItems.category,
        currentSourceStock: inventoryItems.currentStock,
        requestedQuantity: stockTransferItems.requestedQuantity,
        sentQuantity: stockTransferItems.sentQuantity,
        receivedQuantity: stockTransferItems.receivedQuantity,
        transitLossQuantity: stockTransferItems.transitLossQuantity,
        unitCost: stockTransferItems.unitCost,
        batchNumber: stockTransferItems.batchNumber,
        notes: stockTransferItems.notes,
      })
      .from(stockTransferItems)
      .innerJoin(inventoryItems, eq(stockTransferItems.inventoryItemId, inventoryItems.id))
      .where(eq(stockTransferItems.transferId, transfer.id));

    res.status(200).json({ status: 'success', data: { ...transfer, items } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 3. Create Transfer Requisition
export const createStockTransfer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = createTransferSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      const transferNum = `STO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

      let estimatedValuation = 0;
      const itemRows = [];

      for (const item of payload.items) {
        const [invItem] = await tx
          .select({ costPrice: inventoryItems.costPrice })
          .from(inventoryItems)
          .where(and(eq(inventoryItems.id, item.inventoryItemId), eq(inventoryItems.tenantId, tenantId)))
          .limit(1);

        const costNum = parseFloat(item.unitCost?.toString() || invItem?.costPrice || '0');
        const lineTotal = item.requestedQuantity * costNum;
        estimatedValuation += lineTotal;

        itemRows.push({
          inventoryItemId: item.inventoryItemId,
          requestedQuantity: item.requestedQuantity.toFixed(4),
          unitCost: costNum.toFixed(4),
        });
      }

      const [transfer] = await tx
        .insert(stockTransfers)
        .values({
          tenantId,
          transferNumber: transferNum,
          sourceBranchId: payload.sourceBranchId,
          destinationBranchId: payload.destinationBranchId,
          status: 'PENDING',
          totalValuation: estimatedValuation.toFixed(4),
          requestedById: userId ? Number(userId) : null,
          notes: payload.notes || null,
        })
        .returning();

      await tx.insert(stockTransferItems).values(
        itemRows.map((r) => ({
          ...r,
          transferId: transfer.id,
        }))
      );

      return transfer;
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

// 4. Dispatch Transfer (Deducts stock from source warehouse, synchronizes fleet vehicle, and opens transit waybill)
export const dispatchStockTransfer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;
    const { id } = req.params;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = dispatchTransferSchema.parse(req.body);

    await db.transaction(async (tx) => {
      const [transfer] = await tx
        .select()
        .from(stockTransfers)
        .where(and(eq(stockTransfers.id, Number(id)), eq(stockTransfers.tenantId, tenantId)))
        .limit(1);

      if (!transfer) throw new Error('Transfer record not found');
      if (transfer.status !== 'PENDING') throw new Error(`Transfer cannot be dispatched in state: ${transfer.status}`);

      let dispatchedValuation = 0;

      for (const itemUpdate of payload.items) {
        const [line] = await tx
          .select()
          .from(stockTransferItems)
          .where(eq(stockTransferItems.id, itemUpdate.itemId))
          .limit(1);

        if (!line) continue;

        const sentQty = itemUpdate.sentQuantity;
        const unitCostNum = parseFloat(line.unitCost);
        const lineValuation = sentQty * unitCostNum;
        dispatchedValuation += lineValuation;

        const [inv] = await tx
          .select()
          .from(inventoryItems)
          .where(eq(inventoryItems.id, line.inventoryItemId))
          .limit(1);

        if (!inv) throw new Error(`Inventory item ${line.inventoryItemId} not found`);

        const currentStockNum = parseFloat(inv.currentStock);
        const newBalance = currentStockNum - sentQty;

        if (!inv.allowNegativeStock && newBalance < 0) {
          throw new Error(`Insufficient stock for ${inv.name}. Available: ${currentStockNum} ${inv.unit}`);
        }

        // 1. Update transfer line item quantities
        await tx
          .update(stockTransferItems)
          .set({
            sentQuantity: sentQty.toFixed(4),
            batchNumber: itemUpdate.batchNumber || null,
          })
          .where(eq(stockTransferItems.id, line.id));

        // 2. Post Outward Material Movement Ledger Document
        await tx.insert(stockMovements).values({
          tenantId: Number(tenantId),
          branchId: Number(transfer.sourceBranchId),
          inventoryItemId: line.inventoryItemId,
          userId: userId ? Number(userId) : null,
          type: 'TRANSFER',
          quantity: (-sentQty).toFixed(4),
          unitCost: unitCostNum.toFixed(4),
          totalValuation: lineValuation.toFixed(4),
          balanceAfter: newBalance.toFixed(4),
          batchNumber: itemUpdate.batchNumber || null,
          documentReference: transfer.transferNumber,
          locationBin: 'Dispatched to In-Transit Fleet',
          notes: `Outward Goods Issue: STO #${transfer.transferNumber}`,
        });

        // 3. Deduct source warehouse inventory balance
        await tx
          .update(inventoryItems)
          .set({ currentStock: newBalance.toFixed(4), updatedAt: new Date() })
          .where(eq(inventoryItems.id, inv.id));
      }

      // 4. Update the transfer record with carrier details
      await tx
        .update(stockTransfers)
        .set({
          status: 'IN_TRANSIT',
          carrierVehiclePlate: payload.carrierVehiclePlate || null,
          driverName: payload.driverName || null,
          dispatchTempProbe: payload.dispatchTempProbe !== undefined ? payload.dispatchTempProbe?.toString() : null,
          totalValuation: dispatchedValuation.toFixed(4),
          dispatchedById: userId ? Number(userId) : null,
          dispatchedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(stockTransfers.id, transfer.id));

      // 5. SYNCHRONIZE LOGISTICS FLEET ASSET & OPEN TRANSIT WAYBILL
      if (payload.carrierVehiclePlate) {
        const [matchedVehicle] = await tx
          .select({
            id: logisticsFleet.id,
            vehiclePlate: logisticsFleet.vehiclePlate,
            currentStatus: logisticsFleet.currentStatus,
          })
          .from(logisticsFleet)
          .where(
            and(
              eq(logisticsFleet.tenantId, tenantId),
              sql`UPPER(REPLACE(${logisticsFleet.vehiclePlate}, ' ', '')) = UPPER(REPLACE(${payload.carrierVehiclePlate}, ' ', ''))`
            )
          )
          .limit(1);

        if (matchedVehicle) {
          // Update vehicle status in the fleet registry
          await tx
            .update(logisticsFleet)
            .set({ currentStatus: 'IN_TRANSIT', updatedAt: new Date() })
            .where(eq(logisticsFleet.id, matchedVehicle.id));

          // Create tracking record in transfer_fleet_dispatches
          await tx
            .insert(transferFleetDispatches)
            .values({
              tenantId,
              transferId: transfer.id,
              fleetVehicleId: matchedVehicle.id,
              dispatchedById: userId ? Number(userId) : null,
              dispatchStatus: 'IN_TRANSIT',
              departureTime: new Date(),
              dispatchTempProbe: payload.dispatchTempProbe !== undefined ? payload.dispatchTempProbe?.toString() : null,
              deliveryNotes: payload.notes || `Consignment dispatched for STO #${transfer.transferNumber}`,
            });
        }
      }
    });

    res.status(200).json({ status: 'success', message: 'Consignment successfully dispatched into in-transit fleet custody' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 5. Receive Transfer (Balances inventory, writes off loss, and releases carrier vehicle)
export const receiveStockTransfer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;
    const { id } = req.params;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = receiveTransferSchema.parse(req.body);

    await db.transaction(async (tx) => {
      const [transfer] = await tx
        .select()
        .from(stockTransfers)
        .where(and(eq(stockTransfers.id, Number(id)), eq(stockTransfers.tenantId, tenantId)))
        .limit(1);

      if (!transfer) throw new Error('Transfer record not found');
      if (transfer.status !== 'IN_TRANSIT') throw new Error('Only IN_TRANSIT consignments can be received');

      let totalTransitLossCost = 0;
      let hasDiscrepancy = false;

      for (const itemUpdate of payload.items) {
        const [line] = await tx
          .select()
          .from(stockTransferItems)
          .where(eq(stockTransferItems.id, itemUpdate.itemId))
          .limit(1);

        if (!line) continue;

        const sentQty = parseFloat(line.sentQuantity || '0');
        const recvQty = itemUpdate.receivedQuantity;
        const unitCostNum = parseFloat(line.unitCost);
        const lossQty = Math.max(0, sentQty - recvQty);
        const lossCost = lossQty * unitCostNum;
        totalTransitLossCost += lossCost;

        if (lossQty > 0) {
          hasDiscrepancy = true;
        }

        const [inv] = await tx
          .select()
          .from(inventoryItems)
          .where(eq(inventoryItems.id, line.inventoryItemId))
          .limit(1);

        const currentStockNum = parseFloat(inv.currentStock);
        const newBalance = currentStockNum + recvQty;
        const receivedValuation = recvQty * unitCostNum;

        // 1. Update line quantities and transit loss discrepancy
        await tx
          .update(stockTransferItems)
          .set({
            receivedQuantity: recvQty.toFixed(4),
            transitLossQuantity: lossQty.toFixed(4),
            notes: itemUpdate.notes || line.notes,
          })
          .where(eq(stockTransferItems.id, line.id));

        // 2. Post Destination Inward Material Movement Document
        if (recvQty > 0) {
          await tx.insert(stockMovements).values({
            tenantId: Number(tenantId),
            branchId: Number(transfer.destinationBranchId),
            inventoryItemId: line.inventoryItemId,
            userId: userId ? Number(userId) : null,
            type: 'TRANSFER',
            quantity: recvQty.toFixed(4),
            unitCost: unitCostNum.toFixed(4),
            totalValuation: receivedValuation.toFixed(4),
            balanceAfter: newBalance.toFixed(4),
            batchNumber: line.batchNumber || null,
            documentReference: transfer.transferNumber,
            locationBin: 'Branch Storage Receiving',
            notes: `Inward Goods Receipt: STO #${transfer.transferNumber}`,
          });

          // Credit destination branch stock
          await tx
            .update(inventoryItems)
            .set({ currentStock: newBalance.toFixed(4), updatedAt: new Date() })
            .where(eq(inventoryItems.id, inv.id));
        }

        // 3. Post Transit Shrinkage / Waste Scrap entry if discrepancies occurred
        if (lossQty > 0) {
          await tx.insert(stockMovements).values({
            tenantId: Number(tenantId),
            branchId: Number(transfer.destinationBranchId),
            inventoryItemId: line.inventoryItemId,
            userId: userId ? Number(userId) : null,
            type: 'WASTE_SCRAP',
            quantity: (-lossQty).toFixed(4),
            unitCost: unitCostNum.toFixed(4),
            totalValuation: lossCost.toFixed(4),
            balanceAfter: newBalance.toFixed(4),
            batchNumber: line.batchNumber || null,
            documentReference: transfer.transferNumber,
            locationBin: 'In-Transit Loss Write-off',
            notes: `Transit Spoilage / Shrinkage loss during shipment STO #${transfer.transferNumber}`,
          });
        }
      }

      // 4. Finalize transfer record
      await tx
        .update(stockTransfers)
        .set({
          status: hasDiscrepancy ? 'DISCREPANCY_COMPLETED' : 'COMPLETED',
          arrivalTempProbe: payload.arrivalTempProbe !== undefined ? payload.arrivalTempProbe?.toString() : null,
          transitLossValuation: totalTransitLossCost.toFixed(4),
          receivedById: userId ? Number(userId) : null,
          receivedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(stockTransfers.id, transfer.id));

      // 5. RELEASE FLEET VEHICLE BACK TO 'AVAILABLE' & CLOSE DISPATCH WAYBILL
      if (transfer.carrierVehiclePlate) {
        const [matchedVehicle] = await tx
          .select({ id: logisticsFleet.id })
          .from(logisticsFleet)
          .where(
            and(
              eq(logisticsFleet.tenantId, tenantId),
              sql`UPPER(REPLACE(${logisticsFleet.vehiclePlate}, ' ', '')) = UPPER(REPLACE(${transfer.carrierVehiclePlate}, ' ', ''))`
            )
          )
          .limit(1);

        if (matchedVehicle) {
          // Restore vehicle status in the master fleet ledger
          await tx
            .update(logisticsFleet)
            .set({ currentStatus: 'AVAILABLE', updatedAt: new Date() })
            .where(eq(logisticsFleet.id, matchedVehicle.id));

          // Mark dispatch waybill as delivered
          await tx
            .update(transferFleetDispatches)
            .set({
              dispatchStatus: 'DELIVERED',
              arrivalTime: new Date(),
              arrivalTempProbe: payload.arrivalTempProbe !== undefined ? payload.arrivalTempProbe?.toString() : null,
            })
            .where(
              and(
                eq(transferFleetDispatches.transferId, transfer.id),
                eq(transferFleetDispatches.fleetVehicleId, matchedVehicle.id)
              )
            );
        }
      }
    });

    res.status(200).json({ status: 'success', message: 'Consignment received, inventory ledger balanced, and fleet vehicle released' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 6. Get Active Logistics Fleet for Dispatch Waybills
export const getLogisticsFleetList = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const fleet = await db
      .select({
        id: logisticsFleet.id,
        vehiclePlate: logisticsFleet.vehiclePlate,
        makeModel: logisticsFleet.makeModel,
        vehicleType: logisticsFleet.vehicleType,
        driverName: logisticsFleet.driverName,
        driverPhone: logisticsFleet.driverPhone,
        maxPayloadKg: logisticsFleet.maxPayloadKg,
        isRefrigerated: logisticsFleet.isRefrigerated,
        minTargetTemp: logisticsFleet.minTargetTemp,
        maxTargetTemp: logisticsFleet.maxTargetTemp,
        currentStatus: logisticsFleet.currentStatus,
        branchId: logisticsFleet.branchId,
      })
      .from(logisticsFleet)
      .where(and(eq(logisticsFleet.tenantId, tenantId), eq(logisticsFleet.isActive, true)))
      .orderBy(desc(logisticsFleet.id));

    res.status(200).json({ status: 'success', data: fleet });
  } catch (error: any) {
    console.error('[Get Logistics Fleet Error]:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};