import { Router } from 'express';
import { db } from '../../db/index.ts';
import {
  sales,
  saleItems,
  medicines,
  batches,
  customers,
  pharmacists,
  prescriptions,
  stockMovements,
  notifications,
} from '../../db/schema.ts';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware.ts';
import { logAudit } from '../auth.ts';
import { eq, desc, asc, and, gte, lte, inArray } from 'drizzle-orm';

const router = Router();

// GET /api/sales (also used for /api/invoices)
router.get('/', requireAuth, async (req: AuthenticatedRequest, res): Promise<any> => {
  const role = req.user?.role;
  const { customerId, startDate, endDate } = req.query;

  try {
    if (role === 'SUPPLIER') {
      return res.status(403).json({ success: false, message: 'Forbidden: Suppliers cannot access customer sales invoices' });
    }

    const conditions = [];

    // Object-level check: Customer only sees their own sales
    if (role === 'CUSTOMER') {
      if (!req.user?.customerId) {
        return res.status(200).json({ success: true, data: [] });
      }
      conditions.push(eq(sales.customerId, req.user.customerId));
    } else if (customerId) {
      const parsedId = parseInt(customerId as string, 10);
      if (isNaN(parsedId)) return res.status(400).json({ success: false, message: 'Invalid customer ID' });
      conditions.push(eq(sales.customerId, parsedId));
    }

    // Date filters (fixing 2.1 in-memory filtering)
    if (startDate) {
      const s = new Date(startDate as string);
      if (!isNaN(s.getTime())) conditions.push(gte(sales.saleDate, s));
    }
    if (endDate) {
      const e = new Date(endDate as string);
      e.setHours(23, 59, 59, 999);
      if (!isNaN(e.getTime())) conditions.push(lte(sales.saleDate, e));
    }

    const list = await db
      .select({
        id: sales.id,
        invoiceNumber: sales.invoiceNumber,
        customerId: sales.customerId,
        customerName: customers.name,
        customerEmail: customers.email,
        customerPhone: customers.phone,
        pharmacistId: sales.pharmacistId,
        pharmacistName: pharmacists.name,
        prescriptionId: sales.prescriptionId,
        saleDate: sales.saleDate,
        subtotal: sales.subtotal,
        tax: sales.tax,
        discount: sales.discount,
        grandTotal: sales.grandTotal,
        paymentMethod: sales.paymentMethod,
        status: sales.status,
        notes: sales.notes,
        createdAt: sales.createdAt,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .leftJoin(pharmacists, eq(sales.pharmacistId, pharmacists.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(sales.saleDate));

    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    console.error('Error fetching sales:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch sales' });
  }
});

// GET /api/sales/:id (or invoice by ID)
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res): Promise<any> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid sale/invoice ID' });

  if (req.user?.role === 'SUPPLIER') {
    return res.status(403).json({ success: false, message: 'Forbidden: Access denied' });
  }

  try {
    const saleRecords = await db
      .select({
        id: sales.id,
        invoiceNumber: sales.invoiceNumber,
        customerId: sales.customerId,
        customerName: customers.name,
        customerEmail: customers.email,
        customerPhone: customers.phone,
        customerAddress: customers.address,
        pharmacistId: sales.pharmacistId,
        pharmacistName: pharmacists.name,
        prescriptionId: sales.prescriptionId,
        prescriptionNumber: prescriptions.prescriptionNumber,
        doctorName: prescriptions.doctorName,
        saleDate: sales.saleDate,
        subtotal: sales.subtotal,
        tax: sales.tax,
        discount: sales.discount,
        grandTotal: sales.grandTotal,
        paymentMethod: sales.paymentMethod,
        status: sales.status,
        notes: sales.notes,
        createdAt: sales.createdAt,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .leftJoin(pharmacists, eq(sales.pharmacistId, pharmacists.id))
      .leftJoin(prescriptions, eq(sales.prescriptionId, prescriptions.id))
      .where(eq(sales.id, id));

    if (saleRecords.length === 0) {
      return res.status(404).json({ success: false, message: 'Sale invoice not found' });
    }

    const sale = saleRecords[0];

    // Object-level authorization check: Customer A cannot view Customer B's invoice
    if (req.user?.role === 'CUSTOMER' && req.user.customerId !== sale.customerId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to view another customer\'s invoice.',
      });
    }

    const items = await db
      .select({
        id: saleItems.id,
        medicineId: saleItems.medicineId,
        medicineName: medicines.name,
        dosage: medicines.dosage,
        batchId: saleItems.batchId,
        batchNumber: batches.batchNumber,
        expiryDate: batches.expiryDate,
        quantity: saleItems.quantity,
        unitPrice: saleItems.unitPrice,
        subtotal: saleItems.subtotal,
      })
      .from(saleItems)
      .leftJoin(medicines, eq(saleItems.medicineId, medicines.id))
      .leftJoin(batches, eq(saleItems.batchId, batches.id))
      .where(eq(saleItems.saleId, id));

    return res.status(200).json({
      success: true,
      data: {
        ...sale,
        pharmacyName: 'PharmaPulse Central Healthcare Pharmacy',
        pharmacyAddress: '100 Medical Center Blvd, Health City, HC 54001',
        pharmacyPhone: '+1-800-555-PHARMA',
        pharmacyGst: 'MED-PHARM-994821',
        items,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch invoice details' });
  }
});

// POST /api/sales (POS - Creates sale, applies FEFO, reduces stock, creates movements)
router.post('/', requireAuth, requireRole(['ADMIN', 'PHARMACIST']), async (req: AuthenticatedRequest, res): Promise<any> => {
  const { customerId, items, paymentMethod, prescriptionId, discount } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one medicine item is required.' });
  }

  const validPaymentMethods = ['CASH', 'CARD', 'UPI', 'OTHER'];
  const pMethod = validPaymentMethods.includes(paymentMethod) ? paymentMethod : 'CASH';
  const discountAmount = Math.max(0, parseFloat(discount || 0));

  try {
    // FIX 1.2: Timezone safe current date check
    const now = new Date();
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    // Prepare requested totals to fix self-race and N+1 querying (Fix 3 & 1.1)
    const requestMap = new Map<number, number>();
    for (const item of items) {
      const medId = parseInt(item.medicineId, 10);
      const reqQty = parseInt(item.quantity, 10);
      if (isNaN(medId) || isNaN(reqQty) || reqQty <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid medicine or quantity requested.' });
      }
      requestMap.set(medId, (requestMap.get(medId) || 0) + reqQty);
    }
    const medIds = Array.from(requestMap.keys());

    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
    let finalResult;
    let finalAllocations: any[] = [];
    let finalGrandTotal = 0;

    // 4. Database Transaction for safe atomicity (Fix 1.1: TOCTOU Race Condition)
    await db.transaction(async (tx) => {
      // 1. Prescription validation inside transaction
      if (prescriptionId) {
        const rxList = await tx.select().from(prescriptions).where(eq(prescriptions.id, parseInt(prescriptionId, 10)));
        if (rxList.length === 0) throw new Error('Specified prescription does not exist.');
        const rx = rxList[0];
        if (rx.status !== 'APPROVED' && rx.status !== 'COMPLETED') {
          throw new Error(`Cannot sell prescription items with status ${rx.status}. Prescription must be APPROVED.`);
        }
        if (customerId && rx.customerId !== parseInt(customerId, 10)) {
          throw new Error('The prescription provided does not belong to the selected customer.');
        }
      }

      // Fetch all required medicines
      const medList = await tx.select().from(medicines).where(inArray(medicines.id, medIds));
      if (medList.length !== medIds.length) {
        throw new Error('One or more requested medicines could not be found.');
      }

      // Fetch all eligible batches for these medicines
      const eligibleBatches = await tx
        .select()
        .from(batches)
        .where(
          and(
            inArray(batches.medicineId, medIds),
            eq(batches.status, 'ACTIVE'),
            gte(batches.expiryDate, todayStr) // FIX 1.2 strict date comparison
          )
        )
        .orderBy(asc(batches.expiryDate));

      const allocations: any[] = [];
      let calculatedSubtotal = 0;

      for (const med of medList) {
        // Fix 2.3: Check inactive medicines
        if (med.status !== 'ACTIVE') {
          throw new Error(`Medicine '${med.name}' is inactive and cannot be sold.`);
        }

        if (med.prescriptionRequired && !prescriptionId) {
          throw new Error(`Medicine '${med.name}' requires a doctor's prescription.`);
        }

        let remainingToFulfill = requestMap.get(med.id) || 0;
        
        // Filter batches for this medicine
        const medBatches = eligibleBatches.filter(b => b.medicineId === med.id && b.availableQuantity > 0);
        const totalAvailable = medBatches.reduce((sum, b) => sum + b.availableQuantity, 0);

        if (totalAvailable < remainingToFulfill) {
          throw new Error(`Insufficient valid stock for '${med.name}'. Requested: ${remainingToFulfill}, Available (unexpired): ${totalAvailable}`);
        }

        const unitPrice = parseFloat(med.unitPrice);

        for (const b of medBatches) {
          if (remainingToFulfill <= 0) break;
          const take = Math.min(remainingToFulfill, b.availableQuantity);
          
          // Fix 2.2: Floating-Point Accumulation Errors
          const sub = Math.round(take * unitPrice * 100) / 100;

          allocations.push({
            medicineId: med.id,
            medicineName: med.name,
            batchId: b.id,
            batchNumber: b.batchNumber,
            quantity: take,
            unitPrice,
            subtotal: sub,
          });

          calculatedSubtotal += sub;
          remainingToFulfill -= take;
          
          // Deduct from batch in memory for subsequent loop steps
          b.availableQuantity -= take;
          
          // Deduct from DB
          await tx
            .update(batches)
            .set({ availableQuantity: b.availableQuantity })
            .where(eq(batches.id, b.id));
        }
      }

      calculatedSubtotal = Math.round(calculatedSubtotal * 100) / 100;
      const taxRate = 0.05;
      const taxAmount = Math.round(calculatedSubtotal * taxRate * 100) / 100;
      finalGrandTotal = Math.max(0, calculatedSubtotal + taxAmount - discountAmount);

      // Create Sale
      const [newSale] = await tx
        .insert(sales)
        .values({
          invoiceNumber,
          customerId: customerId ? parseInt(customerId, 10) : null,
          pharmacistId: req.user?.pharmacistId || null,
          prescriptionId: prescriptionId ? parseInt(prescriptionId, 10) : null,
          saleDate: new Date(),
          subtotal: calculatedSubtotal.toFixed(2),
          tax: taxAmount.toFixed(2),
          discount: discountAmount.toFixed(2),
          grandTotal: finalGrandTotal.toFixed(2),
          paymentMethod: pMethod,
          status: 'COMPLETED',
          notes: req.body.notes || 'POS Dispensed Sale',
        })
        .returning();

      // Insert sale items and record stock movements
      for (const alloc of allocations) {
        await tx.insert(saleItems).values({
          saleId: newSale.id,
          medicineId: alloc.medicineId,
          batchId: alloc.batchId,
          quantity: alloc.quantity,
          unitPrice: alloc.unitPrice.toFixed(2),
          subtotal: alloc.subtotal.toFixed(2),
        });

        await tx.insert(stockMovements).values({
          medicineId: alloc.medicineId,
          batchId: alloc.batchId,
          type: 'SALE',
          quantity: alloc.quantity,
          reason: `Dispensed under invoice ${newSale.invoiceNumber}`,
          reference: newSale.invoiceNumber,
          userId: req.user?.userId,
        });
      }

      if (prescriptionId) {
        await tx
          .update(prescriptions)
          .set({ status: 'COMPLETED' })
          .where(eq(prescriptions.id, parseInt(prescriptionId, 10)));
      }

      await tx.insert(notifications).values({
        type: 'SALE_COMPLETED',
        title: `Sale Completed: ${invoiceNumber}`,
        message: `Sale completed for $${finalGrandTotal.toFixed(2)} via ${pMethod}.`,
      });

      finalResult = newSale;
      finalAllocations = allocations;
    });

    await logAudit({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      action: 'SALE_CREATION',
      details: `Created sale ${invoiceNumber} ($${finalGrandTotal.toFixed(2)}) with ${finalAllocations.length} batch allocations (FEFO applied).`,
      ipAddress: req.ip || '127.0.0.1',
      result: 'SUCCESS',
    });

    return res.status(201).json({
      success: true,
      message: 'Sale completed successfully. FEFO applied to inventory batches.',
      data: {
        sale: finalResult,
        allocations: finalAllocations,
      },
    });
  } catch (error: any) {
    console.error('Sale transaction error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to complete sale.',
    });
  }
});

export default router;
