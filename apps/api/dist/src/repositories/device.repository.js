"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeviceContext = exports.getDeviceTelemetry = exports.recordDeviceHeartbeat = exports.claimEnrollmentToken = exports.createEnrollmentToken = exports.deleteDevice = exports.updateDevice = exports.registerDevice = exports.getDeviceById = exports.listDevices = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const listDevices = async (tenantId, branchId, status) => {
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.posDevices.tenantId, tenantId),
        branchId ? (0, drizzle_orm_1.eq)(schema_1.posDevices.branchId, branchId) : undefined,
        status && status !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.posDevices.status, status) : undefined,
    ].filter(Boolean);
    const devices = await db_1.db
        .select({
        id: schema_1.posDevices.id,
        tenantId: schema_1.posDevices.tenantId,
        branchId: schema_1.posDevices.branchId,
        branchName: schema_1.branches.name,
        branchCode: schema_1.branches.code,
        name: schema_1.posDevices.name,
        deviceCode: schema_1.posDevices.deviceCode,
        deviceType: schema_1.posDevices.deviceType,
        operatingSystem: schema_1.posDevices.operatingSystem,
        hardwareFingerprint: schema_1.posDevices.hardwareFingerprint,
        ipAddress: schema_1.posDevices.ipAddress,
        macAddress: schema_1.posDevices.macAddress,
        appVersion: schema_1.posDevices.appVersion,
        assignedDrawerId: schema_1.posDevices.assignedDrawerId,
        assignedDrawerName: schema_1.cashDrawers.name,
        assignedKitchenStationId: schema_1.posDevices.assignedKitchenStationId,
        assignedKitchenStationName: schema_1.kitchenStations.name,
        assignedReceiptPrinterId: schema_1.posDevices.assignedReceiptPrinterId,
        assignedReceiptPrinterName: schema_1.networkPrinters.name,
        status: schema_1.posDevices.status,
        isLocked: schema_1.posDevices.isLocked,
        allowOfflineSales: schema_1.posDevices.allowOfflineSales,
        lastHeartbeatAt: schema_1.posDevices.lastHeartbeatAt,
        lastHeartbeatIp: schema_1.posDevices.lastHeartbeatIp,
        registeredByUserId: schema_1.posDevices.registeredByUserId,
        registeredByUserName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
        createdAt: schema_1.posDevices.createdAt,
        updatedAt: schema_1.posDevices.updatedAt,
    })
        .from(schema_1.posDevices)
        .innerJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.posDevices.branchId, schema_1.branches.id))
        .leftJoin(schema_1.cashDrawers, (0, drizzle_orm_1.eq)(schema_1.posDevices.assignedDrawerId, schema_1.cashDrawers.id))
        .leftJoin(schema_1.kitchenStations, (0, drizzle_orm_1.eq)(schema_1.posDevices.assignedKitchenStationId, schema_1.kitchenStations.id))
        .leftJoin(schema_1.networkPrinters, (0, drizzle_orm_1.eq)(schema_1.posDevices.assignedReceiptPrinterId, schema_1.networkPrinters.id))
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.posDevices.registeredByUserId, schema_1.users.id))
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.posDevices.id));
    return devices;
};
exports.listDevices = listDevices;
const getDeviceById = async (tenantId, deviceId) => {
    const [device] = await db_1.db
        .select({
        id: schema_1.posDevices.id,
        tenantId: schema_1.posDevices.tenantId,
        branchId: schema_1.posDevices.branchId,
        branchName: schema_1.branches.name,
        branchCode: schema_1.branches.code,
        name: schema_1.posDevices.name,
        deviceCode: schema_1.posDevices.deviceCode,
        deviceType: schema_1.posDevices.deviceType,
        operatingSystem: schema_1.posDevices.operatingSystem,
        hardwareFingerprint: schema_1.posDevices.hardwareFingerprint,
        ipAddress: schema_1.posDevices.ipAddress,
        macAddress: schema_1.posDevices.macAddress,
        appVersion: schema_1.posDevices.appVersion,
        assignedDrawerId: schema_1.posDevices.assignedDrawerId,
        assignedDrawerName: schema_1.cashDrawers.name,
        assignedKitchenStationId: schema_1.posDevices.assignedKitchenStationId,
        assignedKitchenStationName: schema_1.kitchenStations.name,
        assignedReceiptPrinterId: schema_1.posDevices.assignedReceiptPrinterId,
        assignedReceiptPrinterName: schema_1.networkPrinters.name,
        status: schema_1.posDevices.status,
        isLocked: schema_1.posDevices.isLocked,
        allowOfflineSales: schema_1.posDevices.allowOfflineSales,
        lastHeartbeatAt: schema_1.posDevices.lastHeartbeatAt,
        lastHeartbeatIp: schema_1.posDevices.lastHeartbeatIp,
        createdAt: schema_1.posDevices.createdAt,
        updatedAt: schema_1.posDevices.updatedAt,
    })
        .from(schema_1.posDevices)
        .innerJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.posDevices.branchId, schema_1.branches.id))
        .leftJoin(schema_1.cashDrawers, (0, drizzle_orm_1.eq)(schema_1.posDevices.assignedDrawerId, schema_1.cashDrawers.id))
        .leftJoin(schema_1.kitchenStations, (0, drizzle_orm_1.eq)(schema_1.posDevices.assignedKitchenStationId, schema_1.kitchenStations.id))
        .leftJoin(schema_1.networkPrinters, (0, drizzle_orm_1.eq)(schema_1.posDevices.assignedReceiptPrinterId, schema_1.networkPrinters.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.posDevices.id, deviceId), (0, drizzle_orm_1.eq)(schema_1.posDevices.tenantId, tenantId)))
        .limit(1);
    return device || null;
};
exports.getDeviceById = getDeviceById;
const registerDevice = async (tenantId, userId, input) => {
    const [existingCode] = await db_1.db
        .select({ id: schema_1.posDevices.id })
        .from(schema_1.posDevices)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.posDevices.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.posDevices.deviceCode, input.deviceCode)))
        .limit(1);
    if (existingCode) {
        throw new Error(`Device code "${input.deviceCode}" is already assigned to an existing terminal.`);
    }
    const [device] = await db_1.db
        .insert(schema_1.posDevices)
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
exports.registerDevice = registerDevice;
const updateDevice = async (tenantId, deviceId, input) => {
    const [existing] = await db_1.db
        .select({ id: schema_1.posDevices.id })
        .from(schema_1.posDevices)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.posDevices.id, deviceId), (0, drizzle_orm_1.eq)(schema_1.posDevices.tenantId, tenantId)))
        .limit(1);
    if (!existing) {
        throw new Error('Device record not found.');
    }
    const updateData = {
        updatedAt: new Date(),
    };
    if (input.branchId !== undefined)
        updateData.branchId = input.branchId;
    if (input.name !== undefined)
        updateData.name = input.name;
    if (input.deviceCode !== undefined)
        updateData.deviceCode = input.deviceCode;
    if (input.deviceType !== undefined)
        updateData.deviceType = input.deviceType;
    if (input.operatingSystem !== undefined)
        updateData.operatingSystem = input.operatingSystem;
    if (input.hardwareFingerprint !== undefined)
        updateData.hardwareFingerprint = input.hardwareFingerprint;
    if (input.ipAddress !== undefined)
        updateData.ipAddress = input.ipAddress;
    if (input.macAddress !== undefined)
        updateData.macAddress = input.macAddress;
    if (input.appVersion !== undefined)
        updateData.appVersion = input.appVersion;
    if (input.assignedDrawerId !== undefined)
        updateData.assignedDrawerId = input.assignedDrawerId;
    if (input.assignedKitchenStationId !== undefined)
        updateData.assignedKitchenStationId = input.assignedKitchenStationId;
    if (input.assignedReceiptPrinterId !== undefined)
        updateData.assignedReceiptPrinterId = input.assignedReceiptPrinterId;
    if (input.allowOfflineSales !== undefined)
        updateData.allowOfflineSales = input.allowOfflineSales;
    if (input.status !== undefined)
        updateData.status = input.status;
    if (input.isLocked !== undefined)
        updateData.isLocked = input.isLocked;
    const [updated] = await db_1.db
        .update(schema_1.posDevices)
        .set(updateData)
        .where((0, drizzle_orm_1.eq)(schema_1.posDevices.id, deviceId))
        .returning();
    return updated;
};
exports.updateDevice = updateDevice;
const deleteDevice = async (tenantId, deviceId) => {
    const [deleted] = await db_1.db
        .delete(schema_1.posDevices)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.posDevices.id, deviceId), (0, drizzle_orm_1.eq)(schema_1.posDevices.tenantId, tenantId)))
        .returning();
    if (!deleted) {
        throw new Error('Device record not found.');
    }
    return deleted;
};
exports.deleteDevice = deleteDevice;
const createEnrollmentToken = async (tenantId, userId, input) => {
    // Generate a distinct 6-character human-friendly pairing code e.g. "492-817"
    const rawNum = Math.floor(100000 + Math.random() * 900000).toString();
    const pairingCode = `${rawNum.slice(0, 3)}-${rawNum.slice(3)}`;
    const token = crypto_1.default.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + input.expiryHours * 3600 * 1000);
    const [created] = await db_1.db
        .insert(schema_1.deviceEnrollmentTokens)
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
exports.createEnrollmentToken = createEnrollmentToken;
const claimEnrollmentToken = async (tenantId, input) => {
    const [enrollment] = await db_1.db
        .select()
        .from(schema_1.deviceEnrollmentTokens)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.deviceEnrollmentTokens.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.deviceEnrollmentTokens.pairingCode, input.pairingCode), (0, drizzle_orm_1.eq)(schema_1.deviceEnrollmentTokens.isClaimed, false)))
        .limit(1);
    if (!enrollment) {
        throw new Error('Invalid or expired pairing code.');
    }
    if (new Date() > new Date(enrollment.expiresAt)) {
        throw new Error('This pairing code has expired. Generate a new enrollment token.');
    }
    const generatedDeviceCode = `TERM-${Math.floor(100 + Math.random() * 900)}`;
    const [newDevice] = await db_1.db
        .insert(schema_1.posDevices)
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
    await db_1.db
        .update(schema_1.deviceEnrollmentTokens)
        .set({
        isClaimed: true,
        claimedDeviceId: newDevice.id,
    })
        .where((0, drizzle_orm_1.eq)(schema_1.deviceEnrollmentTokens.id, enrollment.id));
    return newDevice;
};
exports.claimEnrollmentToken = claimEnrollmentToken;
const recordDeviceHeartbeat = async (tenantId, deviceId, clientIp) => {
    const [updated] = await db_1.db
        .update(schema_1.posDevices)
        .set({
        lastHeartbeatAt: new Date(),
        lastHeartbeatIp: clientIp,
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.posDevices.id, deviceId), (0, drizzle_orm_1.eq)(schema_1.posDevices.tenantId, tenantId)))
        .returning();
    return updated;
};
exports.recordDeviceHeartbeat = recordDeviceHeartbeat;
const getDeviceTelemetry = async (tenantId) => {
    const [totalsResult] = await db_1.db
        .select({
        totalDevices: (0, drizzle_orm_1.sql) `count(*)`,
        activeDevices: (0, drizzle_orm_1.sql) `count(case when ${schema_1.posDevices.status} = 'ACTIVE' and ${schema_1.posDevices.isLocked} = false then 1 end)`,
        lockedDevices: (0, drizzle_orm_1.sql) `count(case when ${schema_1.posDevices.isLocked} = true then 1 end)`,
        kdsDisplays: (0, drizzle_orm_1.sql) `count(case when ${schema_1.posDevices.deviceType} = 'KDS_DISPLAY' then 1 end)`,
        handheldTablets: (0, drizzle_orm_1.sql) `count(case when ${schema_1.posDevices.deviceType} = 'WAITER_TABLET' then 1 end)`,
    })
        .from(schema_1.posDevices)
        .where((0, drizzle_orm_1.eq)(schema_1.posDevices.tenantId, tenantId));
    return {
        totalDevices: Number(totalsResult?.totalDevices || 0),
        activeDevices: Number(totalsResult?.activeDevices || 0),
        lockedDevices: Number(totalsResult?.lockedDevices || 0),
        kdsDisplays: Number(totalsResult?.kdsDisplays || 0),
        handheldTablets: Number(totalsResult?.handheldTablets || 0),
    };
};
exports.getDeviceTelemetry = getDeviceTelemetry;
const getDeviceContext = async (tenantId, branchId) => {
    const [drawersList, stationsList, printersList] = await Promise.all([
        db_1.db
            .select({ id: schema_1.cashDrawers.id, name: schema_1.cashDrawers.name, branchId: schema_1.cashDrawers.branchId })
            .from(schema_1.cashDrawers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashDrawers.tenantId, tenantId), branchId ? (0, drizzle_orm_1.eq)(schema_1.cashDrawers.branchId, branchId) : undefined))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.cashDrawers.name)),
        db_1.db
            .select({ id: schema_1.kitchenStations.id, name: schema_1.kitchenStations.name, code: schema_1.kitchenStations.code, branchId: schema_1.kitchenStations.branchId })
            .from(schema_1.kitchenStations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.kitchenStations.tenantId, tenantId), branchId ? (0, drizzle_orm_1.eq)(schema_1.kitchenStations.branchId, branchId) : undefined))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.kitchenStations.name)),
        db_1.db
            .select({ id: schema_1.networkPrinters.id, name: schema_1.networkPrinters.name, branchId: schema_1.networkPrinters.branchId })
            .from(schema_1.networkPrinters)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.networkPrinters.tenantId, tenantId), branchId ? (0, drizzle_orm_1.eq)(schema_1.networkPrinters.branchId, branchId) : undefined))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.networkPrinters.name)),
    ]);
    return {
        drawers: drawersList,
        stations: stationsList,
        printers: printersList,
    };
};
exports.getDeviceContext = getDeviceContext;
