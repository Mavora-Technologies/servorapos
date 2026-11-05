// apps/api/src/controllers/recipe.controller.ts
import { Response } from 'express';
import { eq, desc, inArray } from 'drizzle-orm';
import { db } from '../config/db';
import { recipes, recipeIngredients, menuItems, inventoryItems } from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';
import { upsertRecipeSchema } from '../validators/recipe.validator';

export const getRecipesOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    // 1. Fetch menu items for this tenant
    const allItems = await db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        price: menuItems.price,
      })
      .from(menuItems)
      .where(eq(menuItems.tenantId, tenantId))
      .orderBy(desc(menuItems.id));

    // 2. Fetch recipes
    const allRecipes = await db
      .select()
      .from(recipes)
      .where(eq(recipes.tenantId, tenantId));

    const recipeIds = allRecipes.map((r) => r.id);

    // 3. Fetch ingredients joined with inventory items to derive item name & live unit cost
    const ingredientsWithCost = recipeIds.length > 0
      ? await db
          .select({
            id: recipeIngredients.id,
            recipeId: recipeIngredients.recipeId,
            inventoryItemId: recipeIngredients.inventoryItemId,
            quantity: recipeIngredients.quantity,
            unit: recipeIngredients.unit,
            wastagePercentage: recipeIngredients.wastagePercentage,
            ingredientName: inventoryItems.name,
            unitCost: inventoryItems.costPrice,
          })
          .from(recipeIngredients)
          .leftJoin(inventoryItems, eq(recipeIngredients.inventoryItemId, inventoryItems.id))
          .where(inArray(recipeIngredients.recipeId, recipeIds))
      : [];

    const recipeMap = new Map();
    allRecipes.forEach((r) => {
      const items = ingredientsWithCost.filter((ing) => ing.recipeId === r.id);
      
      const totalEstimatedCost = items.reduce((sum, cur) => {
        const qty = Number(cur.quantity) || 0;
        const cost = Number(cur.unitCost) || 0;
        const wastage = Number(cur.wastagePercentage) || 0;
        const costWithWastage = qty * cost * (1 + wastage / 100);
        return sum + costWithWastage;
      }, 0);

      recipeMap.set(r.menuItemId, {
        ...r,
        ingredients: items,
        calculatedCogs: totalEstimatedCost,
      });
    });

    const data = allItems.map((item) => {
      const rec = recipeMap.get(item.id);
      const retailPrice = Number(item.price);
      const cogs = rec ? rec.calculatedCogs : 0;
      const margin = retailPrice > 0 ? ((retailPrice - cogs) / retailPrice) * 100 : 0;

      return {
        menuItemId: item.id,
        itemName: item.name,
        retailPrice: item.price,
        hasRecipe: !!rec,
        recipe: rec || null,
        marginPercent: margin.toFixed(1),
      };
    });

    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    console.error('[Recipes Overview Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch recipes' });
  }
};

export const saveRecipe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const branchId = req.user?.defaultBranchId;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = upsertRecipeSchema.parse(req.body);

    const saved = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(recipes)
        .where(eq(recipes.menuItemId, payload.menuItemId))
        .limit(1);

      let targetRecipeId: number;

      if (existing) {
        await tx
          .update(recipes)
          .set({
            prepTimeMinutes: payload.prepTimeMinutes,
            cookTimeMinutes: payload.cookTimeMinutes,
            yieldPortions: payload.yieldPortions.toFixed(2), // Convert decimal number to string
            instructions: payload.instructions,
            notes: payload.notes,
            updatedAt: new Date(),
          })
          .where(eq(recipes.id, existing.id));

        targetRecipeId = existing.id;

        await tx
          .delete(recipeIngredients)
          .where(eq(recipeIngredients.recipeId, existing.id));
      } else {
        const [inserted] = await tx
          .insert(recipes)
          .values({
            tenantId,
            branchId: branchId || null,
            menuItemId: payload.menuItemId,
            prepTimeMinutes: payload.prepTimeMinutes,
            cookTimeMinutes: payload.cookTimeMinutes,
            yieldPortions: payload.yieldPortions.toFixed(2), // Convert decimal number to string
            instructions: payload.instructions,
            notes: payload.notes,
          })
          .returning();

        targetRecipeId = inserted.id;
      }

      // Map payload items directly to the database schema structure
      const ingredientRows = payload.ingredients.map((ing: any) => ({
        tenantId,
        recipeId: targetRecipeId,
        inventoryItemId: Number(ing.inventoryItemId || ing.id || 1),
        quantity: Number(ing.quantity).toFixed(4),
        unit: ing.unit || 'pcs',
        wastagePercentage: (Number(ing.wastagePercentage) || 0).toFixed(2),
      }));

      if (ingredientRows.length > 0) {
        await tx.insert(recipeIngredients).values(ingredientRows);
      }

      return targetRecipeId;
    });

    res.status(200).json({
      status: 'success',
      message: 'Recipe specification saved',
      data: { recipeId: saved },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    console.error('[Save Recipe Error]:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};