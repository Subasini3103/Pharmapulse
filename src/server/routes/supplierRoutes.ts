import { Router } from 'express';
import { db } from '../../db/index.ts';
import { suppliers, medicines, purchases, batches, users } from '../../db/schema.ts';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware.ts';
import { logAudit } from '../auth.ts';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// GET /api/suppliers
router.get('/', requireAuth, async (req: AuthenticatedRequest, res): Promise<any> => {
  const role = req.user?.role;

  try {
    // SUPPLIER role can only see their own supplier record!
    if (role === 'SUPPLIER') {
      if (!req.user?.supplierId) {
        return res.status(403).json({ success: false, message: 'Supplier profile not linked' });
      }
      const ownSupplier = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.id, req.user.supplierId));
      return res.status(200).json({ success: true, data: ownSupplier });
    }

    // CUSTOMER role cannot browse suppliers
    if (role === 'CUSTOMER') {
      return res.status(403).json({ success: false, message: 'Forbidden: Customers cannot access supplier data' });
    }

    // ADMIN and PHARMACIST can list all suppliers
    const allSuppliers = await db.select().from(suppliers).orderBy(desc(suppliers.createdAt));
    return res.status(200).json({ success: true, data: allSuppliers });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch suppliers' });
  }
});

// GET /api/suppliers/:id
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res): Promise<any> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid supplier ID' });

  // Object-level check: Supplier can only access their own record
  if (req.user?.role === 'SUPPLIER' && req.user.supplierId !== id) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You are not authorized to view other suppliers\' information.',
    });
  }

  if (req.user?.role === 'CUSTOMER') {
    return res.status(403).json({ success: false, message: 'Forbidden: Access denied' });
  }

  try {
    const list = await db.select().from(suppliers).where(eq(suppliers.id, id));
    if (list.length === 0) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const supplier = list[0];

    // Fetch supplied medicines
    const suppliedMedicines = await db
      .select()
      .from(medicines)
      .where(eq(medicines.supplierId, id));

    // Fetch purchases/supplies
    const supplyPurchases = await db
      .select()
      .from(purchases)
      .where(eq(purchases.supplierId, id))
      .orderBy(desc(purchases.purchaseDate));

    return res.status(200).json({
      success: true,
      data: {
        ...supplier,
        medicines: suppliedMedicines,
        purchases: supplyPurchases,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch supplier details' });
  }
});

// POST /api/suppliers (Admin only)
router.post('/', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res): Promise<any> => {
  const { companyName, contactPerson, email, phone, address, gstTaxNumber } = req.body;

  if (!companyName || !contactPerson || !email || !phone) {
    return res.status(400).json({
      success: false,
      message: 'Company name, contact person, email, and phone are required.',
    });
  }

  try {
    const [newSup] = await db
      .insert(suppliers)
      .values({
        companyName: companyName.trim(),
        contactPerson: contactPerson.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: address ? address.trim() : null,
        gstTaxNumber: gstTaxNumber ? gstTaxNumber.trim() : null,
        status: 'ACTIVE',
      })
      .returning();

    await logAudit({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      action: 'SUPPLIER_CREATION',
      details: `Created supplier: ${newSup.companyName}`,
      ipAddress: req.ip || '127.0.0.1',
      result: 'SUCCESS',
    });

    return res.status(201).json({ success: true, message: 'Supplier created successfully', data: newSup });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create supplier' });
  }
});

// PUT /api/suppliers/:id (Admin or own Supplier profile)
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res): Promise<any> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid supplier ID' });

  // Object-level check: Supplier can only edit own details; Admin can edit any
  if (req.user?.role !== 'ADMIN' && (req.user?.role !== 'SUPPLIER' || req.user.supplierId !== id)) {
    return res.status(403).json({ success: false, message: 'Forbidden: You cannot modify this supplier profile' });
  }

  const { companyName, contactPerson, email, phone, address, gstTaxNumber, status } = req.body;

  try {
    const [updated] = await db
      .update(suppliers)
      .set({
        companyName: companyName !== undefined ? companyName.trim() : undefined,
        contactPerson: contactPerson !== undefined ? contactPerson.trim() : undefined,
        email: email !== undefined ? email.trim().toLowerCase() : undefined,
        phone: phone !== undefined ? phone.trim() : undefined,
        address: address !== undefined ? address.trim() : undefined,
        gstTaxNumber: gstTaxNumber !== undefined ? gstTaxNumber.trim() : undefined,
        status: req.user.role === 'ADMIN' && status !== undefined ? status : undefined,
      })
      .where(eq(suppliers.id, id))
      .returning();

    return res.status(200).json({ success: true, message: 'Supplier updated successfully', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update supplier' });
  }
});

// DELETE /api/suppliers/:id (Admin only)
router.delete('/:id', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res): Promise<any> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid supplier ID' });

  try {
    await db.delete(suppliers).where(eq(suppliers.id, id));
    await logAudit({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      action: 'SUPPLIER_DELETION',
      details: `Deleted supplier ID: ${id}`,
      ipAddress: req.ip || '127.0.0.1',
      result: 'SUCCESS',
    });
    return res.status(200).json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Cannot delete supplier because related records exist.' });
  }
});

export default router;
