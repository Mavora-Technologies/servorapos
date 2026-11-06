"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addStaffMember = void 0;
const user_validator_1 = require("../validators/user.validator");
const user_repository_1 = require("../repositories/user.repository");
const addStaffMember = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userRole = req.user?.role;
        // Guard: Only admins can create staff
        if (userRole && userRole !== 'ADMIN') {
            res.status(403).json({ status: 'error', message: 'Only administrators can add new team members.' });
            return;
        }
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const validatedData = user_validator_1.createStaffSchema.parse(req.body);
        const newStaff = await (0, user_repository_1.createStaffUser)(tenantId, validatedData);
        res.status(201).json({
            status: 'success',
            message: `${validatedData.role} account created successfully`,
            data: newStaff,
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.addStaffMember = addStaffMember;
