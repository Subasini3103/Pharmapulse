import { Router } from 'express';
import { db } from '../../db/index.ts';
import { medicines, categories, suppliers, batches } from '../../db/schema.ts';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware.ts';
import { logAudit } from '../auth.ts';
import { eq, ilike, and, or, sql, asc, desc } from 'drizzle-orm';

const router = Router();

// GET /api/categories
router.get('/categories', async (_req, res): Promise<any> => {
  try {
    const allCategories = await db.select().from(categories).orderBy(asc(categories.name));
    return res.status(200).json({ success: true, data: allCategories });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// POST /api/categories (Admin & Pharmacist)
router.post('/categories', requireAuth, requireRole(['ADMIN', 'PHARMACIST']), async (req: AuthenticatedRequest, res): Promise<any> => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Category name is required' });
  }

  try {
    const existing = await db.select().from(categories).where(eq(categories.name, name.trim()));
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Category already exists' });
    }

    const [newCat] = await db
      .insert(categories)
      .values({
        name: name.trim(),
        description: description ? description.trim() : null,
      })
      .returning();

    await logAudit({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      action: 'CATEGORY_CREATION',
      details: `Created category ${newCat.name}`,
      ipAddress: req.ip || '127.0.0.1',
      result: 'SUCCESS',
    });

    return res.status(201).json({ success: true, message: 'Category created', data: newCat });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create category' });
  }
});

// DELETE /api/categories/:id (Admin only)
router.delete('/categories/:id', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res): Promise<any> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid category ID' });

  try {
    // Check if any medicines reference this category
    const linkedMeds = await db.select().from(medicines).where(eq(medicines.categoryId, id));
    if (linkedMeds.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete category: ${linkedMeds.length} medicine(s) are assigned to it.`,
      });
    }

    await db.delete(categories).where(eq(categories.id, id));

    await logAudit({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      action: 'CATEGORY_DELETION',
      details: `Deleted category ID: ${id}`,
      ipAddress: req.ip || '127.0.0.1',
      result: 'SUCCESS',
    });

    return res.status(200).json({ success: true, message: 'Category deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
});

// GET /api/medicines
router.get('/medicines', async (req, res): Promise<any> => {
  const {
    search,
    categoryId,
    supplierId,
    prescriptionRequired,
    status,
    lowStockOnly,
  } = req.query;

  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // Fetch all active medicines with category and supplier
    const allMeds = await db
      .select({
        id: medicines.id,
        name: medicines.name,
        genericName: medicines.genericName,
        brandName: medicines.brandName,
        categoryId: medicines.categoryId,
        categoryName: categories.name,
        description: medicines.description,
        manufacturer: medicines.manufacturer,
        supplierId: medicines.supplierId,
        supplierName: suppliers.companyName,
        dosage: medicines.dosage,
        form: medicines.form,
        unitPrice: medicines.unitPrice,
        prescriptionRequired: medicines.prescriptionRequired,
        minimumStockLevel: medicines.minimumStockLevel,
        maximumStockLevel: medicines.maximumStockLevel,
        status: medicines.status,
        createdAt: medicines.createdAt,
        updatedAt: medicines.updatedAt,
      })
      .from(medicines)
      .leftJoin(categories, eq(medicines.categoryId, categories.id))
      .leftJoin(suppliers, eq(medicines.supplierId, suppliers.id))
      .orderBy(asc(medicines.name));

    // Fetch all batches to compute stock metrics per medicine
    const allBatches = await db.select().from(batches);

    // Compute stock & batch stats for each medicine
    const enrichedMedicines = allMeds.map((med) => {
      const medBatches = allBatches.filter((b) => b.medicineId === med.id);
      
      let totalStock = 0;
      let safeStock = 0;
      let expiredStock = 0;
      let expiringSoonStock = 0; // <= 30 days

      const now = new Date();
      const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      medBatches.forEach((b) => {
        const expDate = new Date(b.expiryDate);
        if (b.status === 'EXPIRED' || expDate < now) {
          expiredStock += b.availableQuantity;
        } else {
          totalStock += b.availableQuantity;
          if (expDate <= in30Days) {
            expiringSoonStock += b.availableQuantity;
          } else {
            safeStock += b.availableQuantity;
          }
        }
      });

      const isLowStock = totalStock <= med.minimumStockLevel;

      return {
        ...med,
        totalStock,
        safeStock,
        expiringSoonStock,
        expiredStock,
        isLowStock,
        stockStatus: totalStock === 0 ? 'OUT_OF_STOCK' : isLowStock ? 'LOW_STOCK' : 'IN_STOCK',
        batchCount: medBatches.length,
      };
    });

    // Apply filtering
    let filtered = enrichedMedicines;

    if (search && typeof search === 'string') {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(s) ||
          (m.genericName && m.genericName.toLowerCase().includes(s)) ||
          (m.brandName && m.brandName.toLowerCase().includes(s)) ||
          (m.manufacturer && m.manufacturer.toLowerCase().includes(s))
      );
    }

    if (categoryId) {
      filtered = filtered.filter((m) => m.categoryId === parseInt(categoryId as string, 10));
    }

    if (supplierId) {
      filtered = filtered.filter((m) => m.supplierId === parseInt(supplierId as string, 10));
    }

    if (prescriptionRequired !== undefined && prescriptionRequired !== '') {
      const rxReq = prescriptionRequired === 'true';
      filtered = filtered.filter((m) => m.prescriptionRequired === rxReq);
    }

    if (status) {
      filtered = filtered.filter((m) => m.status === status);
    }

    if (lowStockOnly === 'true') {
      filtered = filtered.filter((m) => m.isLowStock);
    }

    return res.status(200).json({
      success: true,
      data: filtered,
      count: filtered.length,
    });
  } catch (error) {
    console.error('Error fetching medicines:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch medicines' });
  }
});

// GET /api/medicines/:id
router.get('/medicines/:id', async (req, res): Promise<any> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid medicine ID' });

  try {
    const medList = await db
      .select({
        id: medicines.id,
        name: medicines.name,
        genericName: medicines.genericName,
        brandName: medicines.brandName,
        categoryId: medicines.categoryId,
        categoryName: categories.name,
        description: medicines.description,
        manufacturer: medicines.manufacturer,
        supplierId: medicines.supplierId,
        supplierName: suppliers.companyName,
        dosage: medicines.dosage,
        form: medicines.form,
        unitPrice: medicines.unitPrice,
        prescriptionRequired: medicines.prescriptionRequired,
        minimumStockLevel: medicines.minimumStockLevel,
        maximumStockLevel: medicines.maximumStockLevel,
        status: medicines.status,
        createdAt: medicines.createdAt,
        updatedAt: medicines.updatedAt,
      })
      .from(medicines)
      .leftJoin(categories, eq(medicines.categoryId, categories.id))
      .leftJoin(suppliers, eq(medicines.supplierId, suppliers.id))
      .where(eq(medicines.id, id));

    if (medList.length === 0) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    const med = medList[0];

    // Fetch batches for this medicine
    const medBatches = await db
      .select()
      .from(batches)
      .where(eq(batches.medicineId, id))
      .orderBy(asc(batches.expiryDate));

    let totalStock = 0;
    const now = new Date();

    const formattedBatches = medBatches.map((b) => {
      const isExp = new Date(b.expiryDate) < now || b.status === 'EXPIRED';
      if (!isExp) {
        totalStock += b.availableQuantity;
      }
      return {
        ...b,
        isExpired: isExp,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        ...med,
        totalStock,
        isLowStock: totalStock <= med.minimumStockLevel,
        batches: formattedBatches,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch medicine details' });
  }
});

// POST /api/medicines (Admin & Pharmacist)
router.post('/medicines', requireAuth, requireRole(['ADMIN', 'PHARMACIST']), async (req: AuthenticatedRequest, res): Promise<any> => {
  const {
    name,
    genericName,
    brandName,
    categoryId,
    description,
    manufacturer,
    supplierId,
    dosage,
    form,
    unitPrice,
    prescriptionRequired,
    minimumStockLevel,
    maximumStockLevel,
  } = req.body;

  if (!name || !unitPrice) {
    return res.status(400).json({
      success: false,
      message: 'Medicine name and unit price are required.',
    });
  }

  const parsedPrice = parseFloat(unitPrice);
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return res.status(400).json({ success: false, message: 'Unit price must be a valid positive number.' });
  }

  try {
    // Check duplicate
    const existing = await db.select().from(medicines).where(eq(medicines.name, name.trim()));
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'A medicine with this name already exists.' });
    }

    const [newMed] = await db
      .insert(medicines)
      .values({
        name: name.trim(),
        genericName: genericName ? genericName.trim() : null,
        brandName: brandName ? brandName.trim() : null,
        categoryId: categoryId ? parseInt(categoryId, 10) : null,
        description: description ? description.trim() : null,
        manufacturer: manufacturer ? manufacturer.trim() : null,
        supplierId: supplierId ? parseInt(supplierId, 10) : null,
        dosage: dosage ? dosage.trim() : null,
        form: form || 'Tablets',
        unitPrice: parsedPrice.toFixed(2),
        prescriptionRequired: !!prescriptionRequired,
        minimumStockLevel: minimumStockLevel ? parseInt(minimumStockLevel, 10) : 10,
        maximumStockLevel: maximumStockLevel ? parseInt(maximumStockLevel, 10) : 500,
        status: 'ACTIVE',
      })
      .returning();

    await logAudit({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      action: 'MEDICINE_CREATION',
      details: `Added medicine: ${newMed.name} ($${newMed.unitPrice})`,
      ipAddress: req.ip || '127.0.0.1',
      result: 'SUCCESS',
    });

    return res.status(201).json({
      success: true,
      message: 'Medicine added successfully.',
      data: newMed,
    });
  } catch (error) {
    console.error('Error creating medicine:', error);
    return res.status(500).json({ success: false, message: 'Failed to create medicine.' });
  }
});

// PUT /api/medicines/:id (Admin & Pharmacist)
router.put('/medicines/:id', requireAuth, requireRole(['ADMIN', 'PHARMACIST']), async (req: AuthenticatedRequest, res): Promise<any> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid medicine ID' });

  const {
    name,
    genericName,
    brandName,
    categoryId,
    description,
    manufacturer,
    supplierId,
    dosage,
    form,
    unitPrice,
    prescriptionRequired,
    minimumStockLevel,
    maximumStockLevel,
    status,
  } = req.body;

  try {
    const existing = await db.select().from(medicines).where(eq(medicines.id, id));
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    const [updated] = await db
      .update(medicines)
      .set({
        name: name !== undefined ? name.trim() : undefined,
        genericName: genericName !== undefined ? genericName.trim() : undefined,
        brandName: brandName !== undefined ? brandName.trim() : undefined,
        categoryId: categoryId !== undefined ? parseInt(categoryId, 10) : undefined,
        description: description !== undefined ? description.trim() : undefined,
        manufacturer: manufacturer !== undefined ? manufacturer.trim() : undefined,
        supplierId: supplierId !== undefined ? parseInt(supplierId, 10) : undefined,
        dosage: dosage !== undefined ? dosage.trim() : undefined,
        form: form !== undefined ? form : undefined,
        unitPrice: unitPrice !== undefined ? parseFloat(unitPrice).toFixed(2) : undefined,
        prescriptionRequired: prescriptionRequired !== undefined ? !!prescriptionRequired : undefined,
        minimumStockLevel: minimumStockLevel !== undefined ? parseInt(minimumStockLevel, 10) : undefined,
        maximumStockLevel: maximumStockLevel !== undefined ? parseInt(maximumStockLevel, 10) : undefined,
        status: status !== undefined ? status : undefined,
        updatedAt: new Date(),
      })
      .where(eq(medicines.id, id))
      .returning();

    await logAudit({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      action: 'MEDICINE_UPDATE',
      details: `Updated medicine ID: ${id} (${updated.name})`,
      ipAddress: req.ip || '127.0.0.1',
      result: 'SUCCESS',
    });

    return res.status(200).json({ success: true, message: 'Medicine updated successfully', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update medicine' });
  }
});

// DELETE /api/medicines/:id (Admin only)
router.delete('/medicines/:id', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res): Promise<any> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid medicine ID' });

  try {
    const existing = await db.select().from(medicines).where(eq(medicines.id, id));
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    // Check if there are active batches or sales referencing it
    const activeBatches = await db.select().from(batches).where(eq(batches.medicineId, id));
    if (activeBatches.length > 0) {
      // Rather than cascade breaking FK constraints, mark as DISCONTINUED
      await db.update(medicines).set({ status: 'DISCONTINUED' }).where(eq(medicines.id, id));
      await logAudit({
        userId: req.user?.userId,
        userEmail: req.user?.email,
        action: 'MEDICINE_DELETION',
        details: `Discontinued medicine ID: ${id} because it has existing batches.`,
        ipAddress: req.ip || '127.0.0.1',
        result: 'SUCCESS',
      });
      return res.status(200).json({
        success: true,
        message: 'Medicine has existing historical batches, so status was marked DISCONTINUED.',
      });
    }

    await db.delete(medicines).where(eq(medicines.id, id));

    await logAudit({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      action: 'MEDICINE_DELETION',
      details: `Deleted medicine ID: ${id}`,
      ipAddress: req.ip || '127.0.0.1',
      result: 'SUCCESS',
    });

    return res.status(200).json({ success: true, message: 'Medicine deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete medicine' });
  }
});

export default router;
