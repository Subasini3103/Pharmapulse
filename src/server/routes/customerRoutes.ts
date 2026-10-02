import { Router } from 'express';
import { db } from '../../db/index.ts';
import { customers, prescriptions, sales, users } from '../../db/schema.ts';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware.ts';
import { logAudit } from '../auth.ts';
import { eq, desc, ilike, or } from 'drizzle-orm';

const router = Router();

// GET /api/customers
router.get('/', requireAuth, async (req: AuthenticatedRequest, res): Promise<any> => {
  const role = req.user?.role;

  try {
    // CUSTOMER role can only see their own customer record!
    if (role === 'CUSTOMER') {
      if (!req.user?.customerId) {
        return res.status(403).json({ success: false, message: 'Customer record not linked' });
      }
      const ownCustomer = await db
        .select()
        .from(customers)
        .where(eq(customers.id, req.user.customerId));
      return res.status(200).json({ success: true, data: ownCustomer });
    }

    // SUPPLIER cannot list customers
    if (role === 'SUPPLIER') {
      return res.status(403).json({ success: false, message: 'Forbidden: Suppliers cannot access customer lists' });
    }

    // ADMIN and PHARMACIST can view all customers
    const { search } = req.query;
    let list;
    if (search && typeof search === 'string') {
      const q = `%${search.trim()}%`;
      list = await db
        .select()
        .from(customers)
        .where(
          or(
            ilike(customers.name, q),
            ilike(customers.email, q),
            ilike(customers.phone, q)
          )
        )
        .orderBy(desc(customers.createdAt));
    } else {
      list = await db.select().from(customers).orderBy(desc(customers.createdAt));
    }

    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch customers' });
  }
});

// GET /api/customers/:id
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res): Promise<any> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid customer ID' });

  // Object-level authorization check: Customer A cannot access Customer B's profile
  if (req.user?.role === 'CUSTOMER' && req.user.customerId !== id) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You cannot access other customers\' profiles.',
    });
  }

  if (req.user?.role === 'SUPPLIER') {
    return res.status(403).json({ success: false, message: 'Forbidden: Suppliers cannot access customer profiles' });
  }

  try {
    const list = await db.select().from(customers).where(eq(customers.id, id));
    if (list.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const customer = list[0];

    // Prescriptions for this customer
    const customerPrescriptions = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.customerId, id))
      .orderBy(desc(prescriptions.prescriptionDate));

    // Sales/Invoices for this customer
    const customerSales = await db
      .select()
      .from(sales)
      .where(eq(sales.customerId, id))
      .orderBy(desc(sales.saleDate));

    return res.status(200).json({
      success: true,
      data: {
        ...customer,
        prescriptions: customerPrescriptions,
        sales: customerSales,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch customer details' });
  }
});

// POST /api/customers (Admin & Pharmacist)
router.post('/', requireAuth, requireRole(['ADMIN', 'PHARMACIST']), async (req: AuthenticatedRequest, res): Promise<any> => {
  const { name, email, phone, address, dateOfBirth, gender } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, and phone are required fields.',
    });
  }

  try {
    const existing = await db.select().from(customers).where(eq(customers.email, email.trim().toLowerCase()));
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'A customer with this email already exists' });
    }

    const [newCust] = await db
      .insert(customers)
      .values({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: address ? address.trim() : null,
        dateOfBirth: dateOfBirth ? dateOfBirth.trim() : null,
        gender: gender || 'Other',
      })
      .returning();

    await logAudit({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      action: 'CUSTOMER_CREATION',
      details: `Created customer record: ${newCust.name} (${newCust.email})`,
      ipAddress: req.ip || '127.0.0.1',
      result: 'SUCCESS',
    });

    return res.status(201).json({ success: true, message: 'Customer created successfully', data: newCust });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create customer' });
  }
});

// PUT /api/customers/:id (Admin, Pharmacist, or Own Customer profile)
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res): Promise<any> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid customer ID' });

  // Object-level authorization check
  if (req.user?.role === 'CUSTOMER' && req.user.customerId !== id) {
    return res.status(403).json({ success: false, message: 'Forbidden: You cannot modify other customer profiles' });
  }

  if (req.user?.role === 'SUPPLIER') {
    return res.status(403).json({ success: false, message: 'Forbidden: Access denied' });
  }

  const { name, phone, address, dateOfBirth, gender } = req.body;

  try {
    const [updated] = await db
      .update(customers)
      .set({
        name: name !== undefined ? name.trim() : undefined,
        phone: phone !== undefined ? phone.trim() : undefined,
        address: address !== undefined ? address.trim() : undefined,
        dateOfBirth: dateOfBirth !== undefined ? dateOfBirth.trim() : undefined,
        gender: gender !== undefined ? gender : undefined,
      })
      .where(eq(customers.id, id))
      .returning();

    return res.status(200).json({ success: true, message: 'Profile updated successfully', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update customer' });
  }
});

// DELETE /api/customers/:id (Admin only)
router.delete('/:id', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res): Promise<any> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid customer ID' });

  try {
    await db.delete(customers).where(eq(customers.id, id));
    await logAudit({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      action: 'CUSTOMER_DELETION',
      details: `Deleted customer ID: ${id}`,
      ipAddress: req.ip || '127.0.0.1',
      result: 'SUCCESS',
    });
    return res.status(200).json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Cannot delete customer with active sales or prescriptions' });
  }
});

export default router;
