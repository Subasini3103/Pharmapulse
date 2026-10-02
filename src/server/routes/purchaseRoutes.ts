import { Router } from 'express';
import { db } from '../../db/index.ts';
import {
  purchases,
  purchaseItems,
  batches,
  medicines,
  suppliers,
  stockMovements,
  notifications,
} from '../../db/schema.ts';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware.ts';
import { logAudit } from '../auth.ts';
import { eq, desc, and } from 'drizzle-orm';

const router = Router();

// GET /api/purchases
router.get('/', requireAuth, async (req: AuthenticatedRequest, res): Promise<any> => {
  const role = req.user?.role;
  const { supplierId } = req.query;

  try {
    if (role === 'CUSTOMER') {
      return res.status(403).json({ success: false, message: 'Forbidden: Customers cannot access purchase orders' });
    }

    let query = db
      .select({
        id: purchases.id,
        purchaseOrderNumber: purchases.purchaseOrderNumber,
        supplierId: purchases.supplierId,
        supplierName: suppliers.companyName,
        supplierContact: suppliers.contactPerson,
        purchaseDate: purchases.purchaseDate,
        totalAmount: purchases.totalAmount,
        status: purchases.status,
        notes: purchases.notes,
        createdAt: purchases.createdAt,
      })
      .from(purchases)
      .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .orderBy(desc(purchases.purchaseDate));

    let list = await query;

    // Object-level check: Supplier can ONLY see their own purchase orders!
    if (role === 'SUPPLIER') {
      if (!req.user?.supplierId) {
        return res.status(200).json({ success: true, data: [] });
      }
      list = list.filter((p) => p.supplierId === req.user?.supplierId);
    } else if (supplierId) {
      list = list.filter((p) => p.supplierId === parseInt(supplierId as string, 10));
    }

    // Attach items
    const allItems = await db
      .select({
        id: purchaseItems.id,
        purchaseId: purchaseItems.purchaseId,
        medicineId: purchaseItems.medicineId,
        medicineName: medicines.name,
        batchNumber: purchaseItems.batchNumber,
        manufacturingDate: purchaseItems.manufacturingDate,
        expiryDate: purchaseItems.expiryDate,
        quantity: purchaseItems.quantity,
        purchasePrice: purchaseItems.purchasePrice,
        sellingPrice: purchaseItems.sellingPrice,
        batchId: purchaseItems.batchId,
      })
      .from(purchaseItems)
      .leftJoin(medicines, eq(purchaseItems.medicineId, medicines.id));

    const enriched = list.map((p) => ({
      ...p,
      items: allItems.filter((i) => i.purchaseId === p.id),
    }));

    return res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch purchases' });
  }
});

// GET /api/purchases/:id
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res): Promise<any> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid purchase ID' });

  if (req.user?.role === 'CUSTOMER') {
    return res.status(403).json({ success: false, message: 'Forbidden: Access denied' });
  }

  try {
    const list = await db
      .select({
        id: purchases.id,
        purchaseOrderNumber: purchases.purchaseOrderNumber,
        supplierId: purchases.supplierId,
        supplierName: suppliers.companyName,
        supplierContact: suppliers.contactPerson,
        supplierEmail: suppliers.email,
        supplierPhone: suppliers.phone,
        purchaseDate: purchases.purchaseDate,
        totalAmount: purchases.totalAmount,
        status: purchases.status,
        notes: purchases.notes,
        createdAt: purchases.createdAt,
      })
      .from(purchases)
      .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .where(eq(purchases.id, id));

    if (list.length === 0) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    const purchase = list[0];

    // Object-level authorization check: Supplier A cannot view Supplier B's purchase order
    if (req.user?.role === 'SUPPLIER' && req.user.supplierId !== purchase.supplierId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot access purchase orders of other suppliers.',
      });
    }

    const items = await db
      .select({
        id: purchaseItems.id,
        purchaseId: purchaseItems.purchaseId,
        medicineId: purchaseItems.medicineId,
        medicineName: medicines.name,
        batchNumber: purchaseItems.batchNumber,
        manufacturingDate: purchaseItems.manufacturingDate,
        expiryDate: purchaseItems.expiryDate,
        quantity: purchaseItems.quantity,
        purchasePrice: purchaseItems.purchasePrice,
        sellingPrice: purchaseItems.sellingPrice,
        batchId: purchaseItems.batchId,
      })
      .from(purchaseItems)
      .leftJoin(medicines, eq(purchaseItems.medicineId, medicines.id))
      .where(eq(purchaseItems.purchaseId, id));

    return res.status(200).json({
      success: true,
      data: {
        ...purchase,
        items,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch purchase order' });
  }
});

// POST /api/purchases (Admin & Pharmacist)
router.post('/', requireAuth, requireRole(['ADMIN', 'PHARMACIST']), async (req: AuthenticatedRequest, res): Promise<any> => {
  const { supplierId, items, notes } = req.body;

  if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Supplier ID and at least one purchase item are required.',
    });
  }

  try {
    const sId = parseInt(supplierId, 10);
    const poNumber = `PO-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;

    let calculatedTotal = 0;
    for (const item of items) {
      const q = parseInt(item.quantity, 10);
      const pp = parseFloat(item.purchasePrice);
      if (isNaN(q) || q <= 0 || isNaN(pp) || pp < 0) {
        return res.status(400).json({ success: false, message: 'Each item must have a valid quantity and purchase price.' });
      }
      calculatedTotal += q * pp;
    }

    // Database transaction to ensure atomicity
    const createdPurchase = await db.transaction(async (tx) => {
      const [newPO] = await tx
        .insert(purchases)
        .values({
          purchaseOrderNumber: poNumber,
          supplierId: sId,
          totalAmount: calculatedTotal.toFixed(2),
          status: 'RECEIVED',
          notes: notes ? notes.trim() : 'Supply delivery received',
        })
        .returning();

      for (const item of items) {
        const medId = parseInt(item.medicineId, 10);
        const qty = parseInt(item.quantity, 10);
        const pPrice = parseFloat(item.purchasePrice).toFixed(2);
        const sPrice = parseFloat(item.sellingPrice || (parseFloat(item.purchasePrice) * 1.3).toFixed(2)).toFixed(2);
        const bNum = item.batchNumber.trim().toUpperCase();

        // Check if batch already exists for this medicine
        const existingBatches = await tx
          .select()
          .from(batches)
          .where(and(eq(batches.medicineId, medId), eq(batches.batchNumber, bNum)));

        let batchId: number;

        if (existingBatches.length > 0) {
          const exBatch = existingBatches[0];
          const newAvail = exBatch.availableQuantity + qty;
          const newTotalQty = exBatch.quantity + qty;

          await tx
            .update(batches)
            .set({
              availableQuantity: newAvail,
              quantity: newTotalQty,
              purchasePrice: pPrice,
              sellingPrice: sPrice,
            })
            .where(eq(batches.id, exBatch.id));

          batchId = exBatch.id;
        } else {
          const [newBatch] = await tx
            .insert(batches)
            .values({
              medicineId: medId,
              supplierId: sId,
              batchNumber: bNum,
              manufacturingDate: item.manufacturingDate.trim(),
              expiryDate: item.expiryDate.trim(),
              purchasePrice: pPrice,
              sellingPrice: sPrice,
              quantity: qty,
              availableQuantity: qty,
              status: 'ACTIVE',
            })
            .returning();

          batchId = newBatch.id;
        }

        // Add purchase item
        await tx.insert(purchaseItems).values({
          purchaseId: newPO.id,
          medicineId: medId,
          batchNumber: bNum,
          manufacturingDate: item.manufacturingDate.trim(),
          expiryDate: item.expiryDate.trim(),
          quantity: qty,
          purchasePrice: pPrice,
          sellingPrice: sPrice,
          batchId,
        });

        // Stock movement: STOCK_IN
        await tx.insert(stockMovements).values({
          medicineId: medId,
          batchId,
          type: 'STOCK_IN',
          quantity: qty,
          reason: `Supply Purchase PO: ${newPO.purchaseOrderNumber}`,
          reference: newPO.purchaseOrderNumber,
          userId: req.user?.userId,
        });
      }

      await tx.insert(notifications).values({
        type: 'NEW_PURCHASE',
        title: `Supply Received: ${poNumber}`,
        message: `Inventory stock increased from supplier order totaling $${calculatedTotal.toFixed(2)}.`,
      });

      return newPO;
    });

    await logAudit({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      action: 'PURCHASE_CREATION',
      details: `Received purchase ${poNumber} ($${calculatedTotal.toFixed(2)}) from supplier #${sId}`,
      ipAddress: req.ip || '127.0.0.1',
      result: 'SUCCESS',
    });

    return res.status(201).json({
      success: true,
      message: 'Purchase recorded and inventory stock automatically updated.',
      data: createdPurchase,
    });
  } catch (error: any) {
    console.error('Purchase creation failed:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to record purchase.' });
  }
});

export default router;
