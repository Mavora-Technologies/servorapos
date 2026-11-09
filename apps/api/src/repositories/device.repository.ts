import { eq, and, desc, asc, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../config/db';
import {
  posDevices,
  deviceEnrollmentTokens,
  branches,
  users,
  cashDrawers,
  kitchenStations,
  networkPrinters,
} from '../config/schema';
import {
  RegisterDeviceInput,
  UpdateDeviceInput,
  GenerateEnrollmentTokenInput,
  ClaimEnrollmentTokenInput,
} from '../validators/device.validator';

export const listDevices = async (tenantId: number, branchId?: number, status?: string) => {
  const conditions = [
    eq(posDevices.tenantId, tenantId),
    branchId ? eq(posDevices.branchId, branchId) : undefined,
    status && status !== 'ALL' ? eq(posDevices.status, status) : undefined,
  ].filter(Boolean);

  const devices = await db
    .select({
      id: posDevices.id,
      tenantId: posDevices.tenantId,
      branchId: posDevices.branchId,
      branchName: branches.name,
      branchCode: branches.code,
      name: posDevices.name,
      deviceCode: posDevices.deviceCode,
      deviceType: posDevices.deviceType,
      operatingSystem: posDevices.operatingSystem,
      hardwareFingerprint: posDevices.hardwareFingerprint,
      ipAddress: posDevices.ipAddress,
      macAddress: posDevices.macAddress,
      appVersion: posDevices.appVersion,
      assignedDrawerId: posDevices.assignedDrawerId,
      assignedDrawerName: cashDrawers.name,
      assignedKitchenStationId: posDevices.assignedKitchenStationId,
      assignedKitchenStationName: kitchenStations.name,
      assignedReceiptPrinterId: posDevices.assignedReceiptPrinterId,
      assignedReceiptPrinterName: networkPrinters.name,
      status: posDevices.status,
      isLocked: posDevices.isLocked,
      allowOfflineSales: posDevices.allowOfflineSales,
      lastHeartbeatAt: posDevices.lastHeartbeatAt,
      lastHeartbeatIp: posDevices.lastHeartbeatIp,
      registeredByUserId: posDevices.registeredByUserId,
      registeredByUserName: sql<string | null>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
      createdAt: posDevices.createdAt,
      updatedAt: posDevices.updatedAt,
    })
    .from(posDevices)
    .innerJoin(branches, eq(posDevices.branchId, branches.id))
    .leftJoin(cashDrawers, eq(posDevices.assignedDrawerId, cashDrawers.id))
    .leftJoin(kitchenStations, eq(posDevices.assignedKitchenStationId, kitchenStations.id))
    .leftJoin(networkPrinters, eq(posDevices.assignedReceiptPrinterId, networkPrinters.id))
    .leftJoin(users, eq(posDevices.registeredByUserId, users.id))
    .where(and(...conditions))
    .orderBy(desc(posDevices.id));

  return devices;
};

export const getDeviceById = async (tenantId: number, deviceId: number) => {
  const [device] = await db
    .select({
      id: posDevices.id,
      tenantId: posDevices.tenantId,
      branchId: posDevices.branchId,
      branchName: branches.name,
      branchCode: branches.code,
      name: posDevices.name,
      deviceCode: posDevices.deviceCode,
      deviceType: posDevices.deviceType,
      operatingSystem: posDevices.operatingSystem,
      hardwareFingerprint: posDevices.hardwareFingerprint,
      ipAddress: posDevices.ipAddress,
      macAddress: posDevices.macAddress,
      appVersion: posDevices.appVersion,
      assignedDrawerId: posDevices.assignedDrawerId,
      assignedDrawerName: cashDrawers.name,
      assignedKitchenStationId: posDevices.assignedKitchenStationId,
      assignedKitchenStationName: kitchenStations.name,
      assignedReceiptPrinterId: posDevices.assignedReceiptPrinterId,
      assignedReceiptPrinterName: networkPrinters.name,
      status: posDevices.status,
      isLocked: posDevices.isLocked,
      allowOfflineSales: posDevices.allowOfflineSales,
      lastHeartbeatAt: posDevices.lastHeartbeatAt,
      lastHeartbeatIp: posDevices.lastHeartbeatIp,
      createdAt: posDevices.createdAt,
      updatedAt: posDevices.updatedAt,
    })
    .from(posDevices)
    .innerJoin(branches, eq(posDevices.branchId, branches.id))
    .leftJoin(cashDrawers, eq(posDevices.assignedDrawerId, cashDrawers.id))
    .leftJoin(kitchenStations, eq(posDevices.assignedKitchenStationId, kitchenStations.id))
    .leftJoin(networkPrinters, eq(posDevices.assignedReceiptPrinterId, networkPrinters.id))
    .where(and(eq(posDevices.id, deviceId), eq(posDevices.tenantId, tenantId)))
    .limit(1);

  return device || null;
};

export const registerDevice = async (tenantId: number, userId: number, input: RegisterDeviceInput) => {
  const [existingCode] = await db
    .select({ id: posDevices.id })
    .from(posDevices)
    .where(and(eq(posDevices.tenantId, tenantId), eq(posDevices.deviceCode, input.deviceCode)))
    .limit(1);

  if (existingCode) {
    throw new Error(`Device code "${input.deviceCode}" is already assigned to an existing terminal.`);
  }

  const [device] = await db
    .insert(posDevices)
    .values({
      tenantId,
      branchId: input.branchId,
      name: input.name,
      deviceCode: input.deviceCode,
      deviceType: input.deviceType,
      operatingSystem: input.operatingSystem,
      hardwareFingerprint: input.hardwareFingerprint || null,
      ipAddress: input.ipAddress || null,
      macAddress: input.macAddress || null,
      appVersion: input.appVersion || null,
      assignedDrawerId: input.assignedDrawerId || null,
      assignedKitchenStationId: input.assignedKitchenStationId || null,
      assignedReceiptPrinterId: input.assignedReceiptPrinterId || null,
      allowOfflineSales: input.allowOfflineSales,
      status: input.status,
      registeredByUserId: userId,
    })
    .returning();

  return device;
};

export const updateDevice = async (tenantId: number, deviceId: number, input: UpdateDeviceInput) => {
  const [existing] = await db
    .select({ id: posDevices.id })
    .from(posDevices)
    .where(and(eq(posDevices.id, deviceId), eq(posDevices.tenantId, tenantId)))
    .limit(1);

  if (!existing) {
    throw new Error('Device record not found.');
  }

  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (input.branchId !== undefined) updateData.branchId = input.branchId;
  if (input.name !== undefined) updateData.name = input.name;
  if (input.deviceCode !== undefined) updateData.deviceCode = input.deviceCode;
  if (input.deviceType !== undefined) updateData.deviceType = input.deviceType;
  if (input.operatingSystem !== undefined) updateData.operatingSystem = input.operatingSystem;
  if (input.hardwareFingerprint !== undefined) updateData.hardwareFingerprint = input.hardwareFingerprint;
  if (input.ipAddress !== undefined) updateData.ipAddress = input.ipAddress;
  if (input.macAddress !== undefined) updateData.macAddress = input.macAddress;
  if (input.appVersion !== undefined) updateData.appVersion = input.appVersion;
  if (input.assignedDrawerId !== undefined) updateData.assignedDrawerId = input.assignedDrawerId;
  if (input.assignedKitchenStationId !== undefined) updateData.assignedKitchenStationId = input.assignedKitchenStationId;
  if (input.assignedReceiptPrinterId !== undefined) updateData.assignedReceiptPrinterId = input.assignedReceiptPrinterId;
  if (input.allowOfflineSales !== undefined) updateData.allowOfflineSales = input.allowOfflineSales;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.isLocked !== undefined) updateData.isLocked = input.isLocked;

  const [updated] = await db
    .update(posDevices)
    .set(updateData)
    .where(eq(posDevices.id, deviceId))
    .returning();

  return updated;
};

export const deleteDevice = async (tenantId: number, deviceId: number) => {
  const [deleted] = await db
    .delete(posDevices)
    .where(and(eq(posDevices.id, deviceId), eq(posDevices.tenantId, tenantId)))
    .returning();

  if (!deleted) {
    throw new Error('Device record not found.');
  }

  return deleted;
};

export const createEnrollmentToken = async (
  tenantId: number,
  userId: number,
  input: GenerateEnrollmentTokenInput
) => {
  // Generate a distinct 6-character human-friendly pairing code e.g. "492-817"
  const rawNum = Math.floor(100000 + Math.random() * 900000).toString();
  const pairingCode = `${rawNum.slice(0, 3)}-${rawNum.slice(3)}`;
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + input.expiryHours * 3600 * 1000);

  const [created] = await db
    .insert(deviceEnrollmentTokens)
    .values({
      tenantId,
      branchId: input.branchId,
      pairingCode,
      token,
      deviceType: input.deviceType,
      assignedDrawerId: input.assignedDrawerId || null,
      assignedKitchenStationId: input.assignedKitchenStationId || null,
      expiresAt,
      createdByUserId: userId,
    })
    .returning();

  return created;
};

export const claimEnrollmentToken = async (tenantId: number, input: ClaimEnrollmentTokenInput) => {
  const [enrollment] = await db
    .select()
    .from(deviceEnrollmentTokens)
    .where(
      and(
        eq(deviceEnrollmentTokens.tenantId, tenantId),
        eq(deviceEnrollmentTokens.pairingCode, input.pairingCode),
        eq(deviceEnrollmentTokens.isClaimed, false)
      )
    )
    .limit(1);

  if (!enrollment) {
    throw new Error('Invalid or expired pairing code.');
  }

  if (new Date() > new Date(enrollment.expiresAt)) {
    throw new Error('This pairing code has expired. Generate a new enrollment token.');
  }

  const generatedDeviceCode = `TERM-${Math.floor(100 + Math.random() * 900)}`;

  const [newDevice] = await db
    .insert(posDevices)
    .values({
      tenantId,
      branchId: enrollment.branchId,
      name: input.deviceName,
      deviceCode: generatedDeviceCode,
      deviceType: enrollment.deviceType,
      operatingSystem: input.operatingSystem,
      hardwareFingerprint: input.hardwareFingerprint,
      appVersion: input.appVersion || null,
      assignedDrawerId: enrollment.assignedDrawerId || null,
      assignedKitchenStationId: enrollment.assignedKitchenStationId || null,
      status: 'ACTIVE',
      lastHeartbeatAt: new Date(),
    })
    .returning();

  await db
    .update(deviceEnrollmentTokens)
    .set({
      isClaimed: true,
      claimedDeviceId: newDevice.id,
    })
    .where(eq(deviceEnrollmentTokens.id, enrollment.id));

  return newDevice;
};

export const recordDeviceHeartbeat = async (tenantId: number, deviceId: number, clientIp: string) => {
  const [updated] = await db
    .update(posDevices)
    .set({
      lastHeartbeatAt: new Date(),
      lastHeartbeatIp: clientIp,
      updatedAt: new Date(),
    })
    .where(and(eq(posDevices.id, deviceId), eq(posDevices.tenantId, tenantId)))
    .returning();

  return updated;
};

export const getDeviceTelemetry = async (tenantId: number) => {
  const [totalsResult] = await db
    .select({
      totalDevices: sql<number>`count(*)`,
      activeDevices: sql<number>`count(case when ${posDevices.status} = 'ACTIVE' and ${posDevices.isLocked} = false then 1 end)`,
      lockedDevices: sql<number>`count(case when ${posDevices.isLocked} = true then 1 end)`,
      kdsDisplays: sql<number>`count(case when ${posDevices.deviceType} = 'KDS_DISPLAY' then 1 end)`,
      handheldTablets: sql<number>`count(case when ${posDevices.deviceType} = 'WAITER_TABLET' then 1 end)`,
    })
    .from(posDevices)
    .where(eq(posDevices.tenantId, tenantId));

  return {
    totalDevices: Number(totalsResult?.totalDevices || 0),
    activeDevices: Number(totalsResult?.activeDevices || 0),
    lockedDevices: Number(totalsResult?.lockedDevices || 0),
    kdsDisplays: Number(totalsResult?.kdsDisplays || 0),
    handheldTablets: Number(totalsResult?.handheldTablets || 0),
  };
};

export const getDeviceContext = async (tenantId: number, branchId?: number) => {
  const [drawersList, stationsList, printersList] = await Promise.all([
    db
      .select({ id: cashDrawers.id, name: cashDrawers.name, branchId: cashDrawers.branchId })
      .from(cashDrawers)
      .where(and(eq(cashDrawers.tenantId, tenantId), branchId ? eq(cashDrawers.branchId, branchId) : undefined))
      .orderBy(asc(cashDrawers.name)),
    db
      .select({ id: kitchenStations.id, name: kitchenStations.name, code: kitchenStations.code, branchId: kitchenStations.branchId })
      .from(kitchenStations)
      .where(and(eq(kitchenStations.tenantId, tenantId), branchId ? eq(kitchenStations.branchId, branchId) : undefined))
      .orderBy(asc(kitchenStations.name)),
    db
      .select({ id: networkPrinters.id, name: networkPrinters.name, branchId: networkPrinters.branchId })
      .from(networkPrinters)
      .where(and(eq(networkPrinters.tenantId, tenantId), branchId ? eq(networkPrinters.branchId, branchId) : undefined))
      .orderBy(asc(networkPrinters.name)),
  ]);

  return {
    drawers: drawersList,
    stations: stationsList,
    printers: printersList,
  };
};