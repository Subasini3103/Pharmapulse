import { Router } from 'express';
import { db } from '../../db/index.ts';
import { medicines, batches, stockMovements, categories, users } from '../../db/schema.ts';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware.ts';
import { logAudit } from '../auth.ts';
import { eq, desc, asc } from 'drizzle-orm';

const router = Router();

// GET /api/inventory
router.get('/', requireAuth, requireRole(['ADMIN', 'PHARMACIST']), async (_req, res): Promise<any> => {
  try {
    const allMedicines = await db
      .select({
        id: medicines.id,
        name: medicines.name,
        genericName: medicines.genericName,
        categoryName: categories.name,
        unitPrice: medicines.unitPrice,
        minimumStockLevel: medicines.minimumStockLevel,
        maximumStockLevel: medicines.maximumStockLevel,
        prescriptionRequired: medicines.prescriptionRequired,
        status: medicines.status,
      })
      .from(medicines)
      .leftJoin(categories, eq(medicines.categoryId, categories.id))
      .orderBy(asc(medicines.name));

    const allBatches = await db.select().from(batches);
    const now = new Date();

    const inventoryData = allMedicines.map((med) => {
      const medBatches = allBatches.filter((b) => b.medicineId === med.id);
      
      let totalStock = 0;
      let expiredStock = 0;
      let expiringSoonStock = 0;

      medBatches.forEach((b) => {
        const expDate = new Date(b.expiryDate);
        if (b.status === 'EXPIRED' || expDate < now) {
          expiredStock += b.availableQuantity;
        } else {
          totalStock += b.availableQuantity;
          const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays <= 30) {
            expiringSoonStock += b.availableQuantity;
          }
        }
      });

      const isLowStock = totalStock <= med.minimumStockLevel;
      const requiredRestock = isLowStock ? Math.max(0, med.maximumStockLevel - totalStock) : 0;

      return {
        ...med,
        totalStock,
        expiredStock,
        expiringSoonStock,
        isLowStock,
        requiredRestock,
        batchCount: medBatches.length,
        stockStatus: totalStock === 0 ? 'OUT_OF_STOCK' : isLowStock ? 'LOW_STOCK' : 'ADEQUATE',
      };
    });

    return res.status(200).json({ success: true, data: inventoryData });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch inventory' });
  }
});

// GET /api/inventory/low-stock
router.get('/low-stock', requireAuth, requireRole(['ADMIN', 'PHARMACIST']), async (_req, res): Promise<any> => {
  try {
    const allMedicines = await db
      .select({
        id: medicines.id,
        name: medicines.name,
        genericName: medicines.genericName,
        minimumStockLevel: medicines.minimumStockLevel,
        maximumStockLevel: medicines.maximumStockLevel,
        unitPrice: medicines.unitPrice,
      })
      .from(medicines);

    const allBatches = await db.select().from(batches);
    const now = new Date();

    const lowStockItems = [];

    for (const med of allMedicines) {
      const medBatches = allBatches.filter(
        (b) => b.medicineId === med.id && b.status !== 'EXPIRED' && new Date(b.expiryDate) >= now
      );
      const totalStock = medBatches.reduce((acc, b) => acc + b.availableQuantity, 0);

      if (totalStock <= med.minimumStockLevel) {
        lowStockItems.push({
          medicineId: med.id,
          name: med.name,
          genericName: med.genericName,
          currentStock: totalStock,
          minimumStock: med.minimumStockLevel,
          requiredQuantity: med.maximumStockLevel - totalStock,
          status: totalStock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
        });
      }
    }

    return res.status(200).json({ success: true, data: lowStockItems });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch low stock alerts' });
  }
});

// GET /api/inventory/expiry
router.get('/expiry', requireAuth, requireRole(['ADMIN', 'PHARMACIST']), async (_req, res): Promise<any> => {
  try {
    const allBatches = await db
      .select({
        id: batches.id,
        medicineId: batches.medicineId,
        medicineName: medicines.name,
        batchNumber: batches.batchNumber,
        expiryDate: batches.expiryDate,
        quantity: batches.quantity,
        availableQuantity: batches.availableQuantity,
        status: batches.status,
      })
      .from(batches)
      .leftJoin(medicines, eq(batches.medicineId, medicines.id))
      .orderBy(asc(batches.expiryDate));

    const now = new Date();

    const categorized = {
      expired: [] as any[],
      expiring7Days: [] as any[],
      expiring30Days: [] as any[],
      expiring90Days: [] as any[],
      safe: [] as any[],
    };

    allBatches.forEach((b) => {
      const expDate = new Date(b.expiryDate);
      const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      const item = {
        ...b,
        daysUntilExpiry: diffDays,
      };

      if (diffDays < 0 || b.status === 'EXPIRED') {
        categorized.expired.push(item);
      } else if (diffDays <= 7) {
        categorized.expiring7Days.push(item);
      } else if (diffDays <= 30) {
        categorized.expiring30Days.push(item);
      } else if (diffDays <= 90) {
        categorized.expiring90Days.push(item);
      } else {
        categorized.safe.push(item);
      }
    });

    return res.status(200).json({
      success: true,
      data: categorized,
      summary: {
        expiredCount: categorized.expired.length,
        expiring7DaysCount: categorized.expiring7Days.length,
        expiring30DaysCount: categorized.expiring30Days.length,
        expiring90DaysCount: categorized.expiring90Days.length,
        safeCount: categorized.safe.length,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch expiry data' });
  }
});

// POST /api/inventory/adjust (Admin & Pharmacist)
router.post('/adjust', requireAuth, requireRole(['ADMIN', 'PHARMACIST']), async (req: AuthenticatedRequest, res): Promise<any> => {
  const { batchId, type, quantity, reason } = req.body;

  if (!batchId || !type || quantity === undefined) {
    return res.status(400).json({
      success: false,
      message: 'batchId, type (STOCK_IN, STOCK_OUT, DAMAGE, EXPIRED, RETURN, ADJUSTMENT), and quantity are required.',
    });
  }

  const parsedQty = parseInt(quantity, 10);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    return res.status(400).json({ success: false, message: 'Quantity must be a positive integer.' });
  }

  const validTypes = ['STOCK_IN', 'STOCK_OUT', 'DAMAGE', 'EXPIRED', 'RETURN', 'ADJUSTMENT'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ success: false, message: `Type must be one of: ${validTypes.join(', ')}` });
  }

  try {
    const batchList = await db.select().from(batches).where(eq(batches.id, parseInt(batchId, 10)));
    if (batchList.length === 0) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const batch = batchList[0];
    let newAvailable = batch.availableQuantity;

    // Check if adding or subtracting
    const isDeduction = ['STOCK_OUT', 'DAMAGE', 'EXPIRED', 'ADJUSTMENT_DOWN'].includes(type) || (type === 'ADJUSTMENT' && req.body.direction === 'SUBTRACT');
    
    if (isDeduction) {
      if (batch.availableQuantity < parsedQty) {
        return res.status(400).json({
          success: false,
          message: `Cannot deduct ${parsedQty} units. Only ${batch.availableQuantity} available in batch.`,
        });
      }
      newAvailable -= parsedQty;
    } else {
      newAvailable += parsedQty;
    }

    // If marked EXPIRED, update batch status as well
    const newStatus = type === 'EXPIRED' ? 'EXPIRED' : batch.status;

    await db
      .update(batches)
      .set({
        availableQuantity: newAvailable,
        status: newStatus,
      })
      .where(eq(batches.id, batch.id));

    // Record stock movement
    await db.insert(stockMovements).values({
      medicineId: batch.medicineId,
      batchId: batch.id,
      type,
      quantity: parsedQty,
      reason: reason ? reason.trim() : `Manual ${type} adjustment`,
      reference: `ADJ-${Date.now()}`,
      userId: req.user?.userId,
    });

    await logAudit({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      action: 'STOCK_ADJUSTMENT',
      details: `${type} of ${parsedQty} units on batch ${batch.batchNumber}. Reason: ${reason || 'N/A'}`,
      ipAddress: req.ip || '127.0.0.1',
      result: 'SUCCESS',
    });

    return res.status(200).json({
      success: true,
      message: 'Stock adjusted successfully',
      data: {
        batchId: batch.id,
        previousQuantity: batch.availableQuantity,
        newQuantity: newAvailable,
        status: newStatus,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to adjust inventory' });
  }
});

// GET /api/inventory/movements
router.get('/movements', requireAuth, requireRole(['ADMIN', 'PHARMACIST']), async (req, res): Promise<any> => {
  const { medicineId, type, limit } = req.query;

  try {
    const movements = await db
      .select({
        id: stockMovements.id,
        medicineId: stockMovements.medicineId,
        medicineName: medicines.name,
        batchId: stockMovements.batchId,
        batchNumber: batches.batchNumber,
        type: stockMovements.type,
        quantity: stockMovements.quantity,
        reason: stockMovements.reason,
        reference: stockMovements.reference,
        userId: stockMovements.userId,
        userName: users.name,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .leftJoin(medicines, eq(stockMovements.medicineId, medicines.id))
      .leftJoin(batches, eq(stockMovements.batchId, batches.id))
      .leftJoin(users, eq(stockMovements.userId, users.id))
      .orderBy(desc(stockMovements.createdAt))
      .limit(limit ? parseInt(limit as string, 10) : 50);

    return res.status(200).json({ success: true, data: movements });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch stock movements' });
  }
});

export default router;
