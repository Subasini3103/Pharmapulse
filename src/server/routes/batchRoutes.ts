import { Router } from 'express';
import { db } from '../../db/index.ts';
import { batches, medicines, suppliers, stockMovements } from '../../db/schema.ts';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware.ts';
import { logAudit } from '../auth.ts';
import { eq, and, asc, desc } from 'drizzle-orm';

const router = Router();

// GET /api/batches
router.get('/', requireAuth, async (req: AuthenticatedRequest, res): Promise<any> => {
  const role = req.user?.role;
  const { medicineId, supplierId, status } = req.query;

  try {
    let query = db
      .select({
        id: batches.id,
        medicineId: batches.medicineId,
        medicineName: medicines.name,
        supplierId: batches.supplierId,
        supplierName: suppliers.companyName,
        batchNumber: batches.batchNumber,
        manufacturingDate: batches.manufacturingDate,
        expiryDate: batches.expiryDate,
        purchasePrice: batches.purchasePrice,
        sellingPrice: batches.sellingPrice,
        quantity: batches.quantity,
        availableQuantity: batches.availableQuantity,
        status: batches.status,
        createdAt: batches.createdAt,
      })
      .from(batches)
      .leftJoin(medicines, eq(batches.medicineId, medicines.id))
      .leftJoin(suppliers, eq(batches.supplierId, suppliers.id))
      .orderBy(asc(batches.expiryDate));

    const list = await query;
    const now = new Date();

    // Mark expired flag and compute days until expiry
    let results = list.map((b) => {
      const expDate = new Date(b.expiryDate);
      const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isExpired = diffDays < 0 || b.status === 'EXPIRED';

      let expiryCategory = 'SAFE';
      if (isExpired) expiryCategory = 'EXPIRED';
      else if (diffDays <= 7) expiryCategory = 'EXPIRING_7_DAYS';
      else if (diffDays <= 30) expiryCategory = 'EXPIRING_30_DAYS';
      else if (diffDays <= 90) expiryCategory = 'EXPIRING_90_DAYS';

      return {
        ...b,
        isExpired,
        daysUntilExpiry: diffDays,
        expiryCategory,
      };
    });

    // Object-level authorization for SUPPLIER: only see own batches
    if (role === 'SUPPLIER') {
      if (!req.user?.supplierId) {
        return res.status(403).json({ success: false, message: 'Supplier profile not linked' });
      }
      results = results.filter((b) => b.supplierId === req.user?.supplierId);
    } else if (role === 'CUSTOMER') {
      return res.status(403).json({ success: false, message: 'Forbidden: Customers cannot access internal batch lists' });
    }

    if (medicineId) {
      results = results.filter((b) => b.medicineId === parseInt(medicineId as string, 10));
    }

    if (supplierId && role !== 'SUPPLIER') {
      results = results.filter((b) => b.supplierId === parseInt(supplierId as string, 10));
    }

    if (status) {
      results = results.filter((b) => b.status === status);
    }

    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch batches' });
  }
});

// POST /api/batches (Admin & Pharmacist)
router.post('/', requireAuth, requireRole(['ADMIN', 'PHARMACIST']), async (req: AuthenticatedRequest, res): Promise<any> => {
  const {
    medicineId,
    supplierId,
    batchNumber,
    manufacturingDate,
    expiryDate,
    purchasePrice,
    sellingPrice,
    quantity,
  } = req.body;

  if (!medicineId || !batchNumber || !manufacturingDate || !expiryDate || quantity === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Medicine, batch number, manufacturing date, expiry date, and quantity are required.',
    });
  }

  // Validate dates: expiry must be after manufacturing date
  if (new Date(expiryDate) <= new Date(manufacturingDate)) {
    return res.status(400).json({
      success: false,
      message: 'Expiry date must be after manufacturing date.',
    });
  }

  const parsedQty = parseInt(quantity, 10);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    return res.status(400).json({ success: false, message: 'Quantity must be a positive integer.' });
  }

  try {
    // Prevent duplicate batch numbers for the same medicine
    const existing = await db
      .select()
      .from(batches)
      .where(
        and(
          eq(batches.medicineId, parseInt(medicineId, 10)),
          eq(batches.batchNumber, batchNumber.trim().toUpperCase())
        )
      );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Batch number ${batchNumber} already exists for this medicine.`,
      });
    }

    const pPrice = parseFloat(purchasePrice || 0).toFixed(2);
    const sPrice = parseFloat(sellingPrice || 0).toFixed(2);

    const [newBatch] = await db
      .insert(batches)
      .values({
        medicineId: parseInt(medicineId, 10),
        supplierId: supplierId ? parseInt(supplierId, 10) : null,
        batchNumber: batchNumber.trim().toUpperCase(),
        manufacturingDate: manufacturingDate.trim(),
        expiryDate: expiryDate.trim(),
        purchasePrice: pPrice,
        sellingPrice: sPrice,
        quantity: parsedQty,
        availableQuantity: parsedQty,
        status: new Date(expiryDate) < new Date() ? 'EXPIRED' : 'ACTIVE',
      })
      .returning();

    // Create stock movement record
    await db.insert(stockMovements).values({
      medicineId: newBatch.medicineId,
      batchId: newBatch.id,
      type: 'STOCK_IN',
      quantity: parsedQty,
      reason: `Batch Creation: ${newBatch.batchNumber}`,
      reference: `BATCH-${newBatch.id}`,
      userId: req.user?.userId,
    });

    await logAudit({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      action: 'BATCH_CREATION',
      details: `Added batch ${newBatch.batchNumber} with ${parsedQty} units.`,
      ipAddress: req.ip || '127.0.0.1',
      result: 'SUCCESS',
    });

    return res.status(201).json({ success: true, message: 'Batch added successfully', data: newBatch });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to add batch' });
  }
});

// PUT /api/batches/:id (Admin & Pharmacist)
router.put('/:id', requireAuth, requireRole(['ADMIN', 'PHARMACIST']), async (req: AuthenticatedRequest, res): Promise<any> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid batch ID' });

  const { status, sellingPrice, purchasePrice } = req.body;

  try {
    const [updated] = await db
      .update(batches)
      .set({
        status: status !== undefined ? status : undefined,
        sellingPrice: sellingPrice !== undefined ? parseFloat(sellingPrice).toFixed(2) : undefined,
        purchasePrice: purchasePrice !== undefined ? parseFloat(purchasePrice).toFixed(2) : undefined,
      })
      .where(eq(batches.id, id))
      .returning();

    return res.status(200).json({ success: true, message: 'Batch updated', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update batch' });
  }
});

export default router;
