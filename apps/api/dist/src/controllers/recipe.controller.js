"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRecipe = exports.saveRecipe = exports.getRecipesOverview = void 0;
const zod_1 = require("zod");
const recipeService = __importStar(require("../services/recipe.service"));
const recipe_validator_1 = require("../validators/recipe.validator");
const getRecipesOverview = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const data = await recipeService.fetchTenantRecipesOverview(tenantId);
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch recipes';
        res.status(500).json({ status: 'error', message });
    }
};
exports.getRecipesOverview = getRecipesOverview;
const saveRecipe = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = recipe_validator_1.upsertRecipeSchema.parse(req.body);
        const defaultBranchId = req.user?.defaultBranchId ?? null;
        const saved = await recipeService.saveTenantRecipe(tenantId, defaultBranchId, payload);
        res.status(200).json({
            status: 'success',
            message: 'Recipe specification and COGS saved successfully.',
            data: saved,
        });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({
                status: 'error',
                message: error.issues[0]?.message || 'Validation failed',
                errors: error.issues,
            });
            return;
        }
        const message = error instanceof Error ? error.message : 'Failed to save recipe specification';
        res.status(400).json({ status: 'error', message });
    }
};
exports.saveRecipe = saveRecipe;
const deleteRecipe = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const recipeId = Number(req.params.id);
        if (!Number.isInteger(recipeId) || recipeId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid recipe ID' });
            return;
        }
        const deleted = await recipeService.removeTenantRecipe(tenantId, recipeId);
        if (!deleted) {
            res.status(404).json({ status: 'error', message: 'Recipe specification not found' });
            return;
        }
        res.status(200).json({ status: 'success', message: 'Recipe specification deleted.' });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete recipe';
        res.status(500).json({ status: 'error', message });
    }
};
exports.deleteRecipe = deleteRecipe;
