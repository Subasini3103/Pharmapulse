import { Router } from 'express';
import { db } from '../../db/index.ts';
import {
  prescriptions,
  prescriptionItems,
  medicines,
  customers,
  pharmacists,
  notifications,
} from '../../db/schema.ts';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware.ts';
import { logAudit } from '../auth.ts';
import { eq, desc, and } from 'drizzle-orm';

const router = Router();

// GET /api/prescriptions
router.get('/', requireAuth, async (req: AuthenticatedRequest, res): Promise<any> => {
  const role = req.user?.role;
  const { status, customerId } = req.query;

  try {
    if (role === 'SUPPLIER') {
      return res.status(403).json({ success: false, message: 'Forbidden: Suppliers cannot access prescriptions' });
    }

    let query = db
      .select({
        id: prescriptions.id,
        prescriptionNumber: prescriptions.prescriptionNumber,
        customerId: prescriptions.customerId,
        customerName: customers.name,
        customerEmail: customers.email,
        customerPhone: customers.phone,
        doctorName: prescriptions.doctorName,
        prescriptionDate: prescriptions.prescriptionDate,
        notes: prescriptions.notes,
        status: prescriptions.status,
        pharmacistId: prescriptions.pharmacistId,
        pharmacistName: pharmacists.name,
        rejectionReason: prescriptions.rejectionReason,
        createdAt: prescriptions.createdAt,
      })
      .from(prescriptions)
      .leftJoin(customers, eq(prescriptions.customerId, customers.id))
      .leftJoin(pharmacists, eq(prescriptions.pharmacistId, pharmacists.id))
      .orderBy(desc(prescriptions.createdAt));

    let list = await query;

    // Object-level check: Customer only sees own prescriptions
    if (role === 'CUSTOMER') {
      if (!req.user?.customerId) {
        return res.status(200).json({ success: true, data: [] });
      }
      list = list.filter((p) => p.customerId === req.user?.customerId);
    } else if (customerId) {
      list = list.filter((p) => p.customerId === parseInt(customerId as string, 10));
    }

    if (status) {
      list = list.filter((p) => p.status === status);
    }

    // Attach items for each prescription
    const allItems = await db
      .select({
        id: prescriptionItems.id,
        prescriptionId: prescriptionItems.prescriptionId,
        medicineId: prescriptionItems.medicineId,
        medicineName: medicines.name,
        dosage: prescriptionItems.dosage,
        frequency: prescriptionItems.frequency,
        duration: prescriptionItems.duration,
        quantity: prescriptionItems.quantity,
        instructions: prescriptionItems.instructions,
      })
      .from(prescriptionItems)
      .leftJoin(medicines, eq(prescriptionItems.medicineId, medicines.id));

    const enriched = list.map((p) => ({
      ...p,
      items: allItems.filter((i) => i.prescriptionId === p.id),
    }));

    return res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch prescriptions' });
  }
});

// GET /api/prescriptions/:id
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res): Promise<any> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid prescription ID' });

  if (req.user?.role === 'SUPPLIER') {
    return res.status(403).json({ success: false, message: 'Forbidden: Access denied' });
  }

  try {
    const list = await db
      .select({
        id: prescriptions.id,
        prescriptionNumber: prescriptions.prescriptionNumber,
        customerId: prescriptions.customerId,
        customerName: customers.name,
        customerEmail: customers.email,
        customerPhone: customers.phone,
        doctorName: prescriptions.doctorName,
        prescriptionDate: prescriptions.prescriptionDate,
        notes: prescriptions.notes,
        status: prescriptions.status,
        pharmacistId: prescriptions.pharmacistId,
        pharmacistName: pharmacists.name,
        rejectionReason: prescriptions.rejectionReason,
        createdAt: prescriptions.createdAt,
      })
      .from(prescriptions)
      .leftJoin(customers, eq(prescriptions.customerId, customers.id))
      .leftJoin(pharmacists, eq(prescriptions.pharmacistId, pharmacists.id))
      .where(eq(prescriptions.id, id));

    if (list.length === 0) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    const prescription = list[0];

    // Object-level authorization check: Customer A cannot view Customer B's prescription
    if (req.user?.role === 'CUSTOMER' && req.user.customerId !== prescription.customerId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot access prescriptions belonging to another customer.',
      });
    }

    const items = await db
      .select({
        id: prescriptionItems.id,
        medicineId: prescriptionItems.medicineId,
        medicineName: medicines.name,
        dosage: prescriptionItems.dosage,
        frequency: prescriptionItems.frequency,
        duration: prescriptionItems.duration,
        quantity: prescriptionItems.quantity,
        instructions: prescriptionItems.instructions,
      })
      .from(prescriptionItems)
      .leftJoin(medicines, eq(prescriptionItems.medicineId, medicines.id))
      .where(eq(prescriptionItems.prescriptionId, id));

    return res.status(200).json({
      success: true,
      data: {
        ...prescription,
        items,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch prescription details' });
  }
});

// POST /api/prescriptions (Customer submitting own or Admin/Pharmacist creating)
router.post('/', requireAuth, async (req: AuthenticatedRequest, res): Promise<any> => {
  const { doctorName, prescriptionDate, notes, items, targetCustomerId } = req.body;

  if (!doctorName || !prescriptionDate || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Doctor name, prescription date, and at least one medicine item are required.',
    });
  }

  let finalCustomerId: number | undefined;

  if (req.user?.role === 'CUSTOMER') {
    finalCustomerId = req.user.customerId;
    if (!finalCustomerId) {
      return res.status(400).json({ success: false, message: 'Customer profile required before submitting' });
    }
  } else if (req.user?.role === 'ADMIN' || req.user?.role === 'PHARMACIST') {
    finalCustomerId = targetCustomerId ? parseInt(targetCustomerId, 10) : undefined;
    if (!finalCustomerId) {
      return res.status(400).json({ success: false, message: 'Please select a customer for this prescription.' });
    }
  } else {
    return res.status(403).json({ success: false, message: 'Suppliers cannot submit prescriptions' });
  }

  try {
    const rxNumber = `RX-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;

    const [newRx] = await db
      .insert(prescriptions)
      .values({
        prescriptionNumber: rxNumber,
        customerId: finalCustomerId,
        doctorName: doctorName.trim(),
        prescriptionDate: prescriptionDate.trim(),
        notes: notes ? notes.trim() : null,
        status: req.user.role === 'PHARMACIST' || req.user.role === 'ADMIN' ? 'APPROVED' : 'PENDING',
        pharmacistId: req.user.role === 'PHARMACIST' ? req.user.pharmacistId : null,
      })
      .returning();

    for (const item of items) {
      if (!item.medicineId || !item.quantity) continue;
      await db.insert(prescriptionItems).values({
        prescriptionId: newRx.id,
        medicineId: parseInt(item.medicineId, 10),
        quantity: parseInt(item.quantity, 10),
        dosage: item.dosage ? item.dosage.trim() : null,
        frequency: item.frequency ? item.frequency.trim() : null,
        duration: item.duration ? item.duration.trim() : null,
        instructions: item.instructions ? item.instructions.trim() : null,
      });
    }

    // Notification for Pharmacists if submitted by Customer
    if (req.user.role === 'CUSTOMER') {
      await db.insert(notifications).values({
        type: 'PENDING_PRESCRIPTION',
        title: 'New Prescription Submitted',
        message: `Prescription ${rxNumber} submitted by customer. Awaiting pharmacist approval.`,
      });
    }

    await logAudit({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      action: 'PRESCRIPTION_SUBMISSION',
      details: `Created prescription ${rxNumber} with ${items.length} items.`,
      ipAddress: req.ip || '127.0.0.1',
      result: 'SUCCESS',
    });

    return res.status(201).json({
      success: true,
      message: 'Prescription created successfully',
      data: newRx,
    });
  } catch (error) {
    console.error('Error creating prescription:', error);
    return res.status(500).json({ success: false, message: 'Failed to create prescription' });
  }
});

// POST /api/prescriptions/:id/approve (Admin & Pharmacist)
router.post('/:id/approve', requireAuth, requireRole(['ADMIN', 'PHARMACIST']), async (req: AuthenticatedRequest, res): Promise<any> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid prescription ID' });

  try {
    const rx = await db.select().from(prescriptions).where(eq(prescriptions.id, id));
    if (rx.length === 0) return res.status(404).json({ success: false, message: 'Prescription not found' });

    const [updated] = await db
      .update(prescriptions)
      .set({
        status: 'APPROVED',
        pharmacistId: req.user?.pharmacistId || null,
        rejectionReason: null,
      })
      .where(eq(prescriptions.id, id))
      .returning();

    await logAudit({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      action: 'PRESCRIPTION_APPROVAL',
      details: `Approved prescription ${rx[0].prescriptionNumber}`,
      ipAddress: req.ip || '127.0.0.1',
      result: 'SUCCESS',
    });

    return res.status(200).json({ success: true, message: 'Prescription approved successfully', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to approve prescription' });
  }
});

// POST /api/prescriptions/:id/reject (Admin & Pharmacist)
router.post('/:id/reject', requireAuth, requireRole(['ADMIN', 'PHARMACIST']), async (req: AuthenticatedRequest, res): Promise<any> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid prescription ID' });

  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ success: false, message: 'Rejection reason is required' });
  }

  try {
    const rx = await db.select().from(prescriptions).where(eq(prescriptions.id, id));
    if (rx.length === 0) return res.status(404).json({ success: false, message: 'Prescription not found' });

    const [updated] = await db
      .update(prescriptions)
      .set({
        status: 'REJECTED',
        pharmacistId: req.user?.pharmacistId || null,
        rejectionReason: reason.trim(),
      })
      .where(eq(prescriptions.id, id))
      .returning();

    await logAudit({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      action: 'PRESCRIPTION_REJECTION',
      details: `Rejected prescription ${rx[0].prescriptionNumber}. Reason: ${reason}`,
      ipAddress: req.ip || '127.0.0.1',
      result: 'SUCCESS',
    });

    return res.status(200).json({ success: true, message: 'Prescription rejected', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to reject prescription' });
  }
});

export default router;
