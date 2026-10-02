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
import { eq, desc, asc, and, gte } from 'drizzle-orm';

const router = Router();

// GET /api/sales (also used for /api/invoices)
router.get('/', requireAuth, async (req: AuthenticatedRequest, res): Promise<any> => {
  const role = req.user?.role;
  const { customerId, startDate, endDate } = req.query;

  try {
    if (role === 'SUPPLIER') {
      return res.status(403).json({ success: false, message: 'Forbidden: Suppliers cannot access customer sales invoices' });
    }

    let query = db
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
      .orderBy(desc(sales.saleDate));

    let list = await query;

    // Object-level check: Customer only sees their own sales
    if (role === 'CUSTOMER') {
      if (!req.user?.customerId) {
        return res.status(200).json({ success: true, data: [] });
      }
      list = list.filter((s) => s.customerId === req.user?.customerId);
    } else if (customerId) {
      list = list.filter((s) => s.customerId === parseInt(customerId as string, 10));
    }

    // Date filters
    if (startDate) {
      const s = new Date(startDate as string);
      list = list.filter((item) => new Date(item.saleDate) >= s);
    }
    if (endDate) {
      const e = new Date(endDate as string);
      list = list.filter((item) => new Date(item.saleDate) <= e);
    }

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
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();

    // 1. Prescription validation if any medicine requires it
    if (prescriptionId) {
      const rxList = await db.select().from(prescriptions).where(eq(prescriptions.id, parseInt(prescriptionId, 10)));
      if (rxList.length === 0) {
        return res.status(400).json({ success: false, message: 'Specified prescription does not exist.' });
      }
      const rx = rxList[0];
      if (rx.status !== 'APPROVED' && rx.status !== 'COMPLETED') {
        return res.status(400).json({
          success: false,
          message: `Cannot sell prescription items with status ${rx.status}. Prescription must be APPROVED.`,
        });
      }
      if (customerId && rx.customerId !== parseInt(customerId, 10)) {
        return res.status(400).json({
          success: false,
          message: 'The prescription provided does not belong to the selected customer.',
        });
      }
    }

    // 2. Prepare items, check stock, apply FEFO
    interface BatchAllocation {
      medicineId: number;
      medicineName: string;
      batchId: number;
      batchNumber: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }

    const allocations: BatchAllocation[] = [];
    let calculatedSubtotal = 0;

    for (const item of items) {
      const medId = parseInt(item.medicineId, 10);
      const reqQty = parseInt(item.quantity, 10);

      if (isNaN(medId) || isNaN(reqQty) || reqQty <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid medicine or quantity requested.' });
      }

      const medList = await db.select().from(medicines).where(eq(medicines.id, medId));
      if (medList.length === 0) {
        return res.status(404).json({ success: false, message: `Medicine ID ${medId} not found.` });
      }

      const med = medList[0];

      // Prescription requirement check
      if (med.prescriptionRequired && !prescriptionId) {
        return res.status(400).json({
          success: false,
          message: `Medicine '${med.name}' requires a doctor's prescription. Please select an approved prescription.`,
        });
      }

      // Fetch all eligible batches for this medicine:
      // status = 'ACTIVE', expiryDate >= today, availableQuantity > 0
      // ORDER BY expiryDate ASC (FIRST EXPIRE, FIRST OUT)
      const eligibleBatches = await db
        .select()
        .from(batches)
        .where(
          and(
            eq(batches.medicineId, medId),
            eq(batches.status, 'ACTIVE'),
            gte(batches.expiryDate, todayStr)
          )
        )
        .orderBy(asc(batches.expiryDate));

      const activeUnexpiredBatches = eligibleBatches.filter(
        (b) => b.availableQuantity > 0 && new Date(b.expiryDate) >= now
      );

      const totalAvailable = activeUnexpiredBatches.reduce((sum, b) => sum + b.availableQuantity, 0);

      if (totalAvailable < reqQty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient valid stock for '${med.name}'. Requested: ${reqQty}, Available (unexpired): ${totalAvailable}`,
        });
      }

      // Apply FEFO across batches
      let remainingToFulfill = reqQty;
      const unitPrice = parseFloat(med.unitPrice);

      for (const b of activeUnexpiredBatches) {
        if (remainingToFulfill <= 0) break;

        const take = Math.min(remainingToFulfill, b.availableQuantity);
        const sub = take * unitPrice;

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
      }
    }

    // 3. Tax and Grand Total calculation
    const taxRate = 0.05; // 5% pharmacy healthcare tax
    const taxAmount = parseFloat((calculatedSubtotal * taxRate).toFixed(2));
    const finalGrandTotal = Math.max(0, calculatedSubtotal + taxAmount - discountAmount);

    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;

    // 4. Database Transaction for safe atomicity
    const result = await db.transaction(async (tx) => {
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

      // Deduct from batches, insert sale items, and record stock movements
      for (const alloc of allocations) {
        // Fetch current batch inside transaction
        const [currentBatch] = await tx
          .select()
          .from(batches)
          .where(eq(batches.id, alloc.batchId));

        if (!currentBatch || currentBatch.availableQuantity < alloc.quantity) {
          throw new Error(`Concurrency error: Batch ${alloc.batchNumber} no longer has sufficient quantity.`);
        }

        const updatedAvail = currentBatch.availableQuantity - alloc.quantity;

        await tx
          .update(batches)
          .set({ availableQuantity: updatedAvail })
          .where(eq(batches.id, alloc.batchId));

        // Insert sale item
        await tx.insert(saleItems).values({
          saleId: newSale.id,
          medicineId: alloc.medicineId,
          batchId: alloc.batchId,
          quantity: alloc.quantity,
          unitPrice: alloc.unitPrice.toFixed(2),
          subtotal: alloc.subtotal.toFixed(2),
        });

        // Insert stock movement
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

      // If tied to prescription, mark prescription as COMPLETED
      if (prescriptionId) {
        await tx
          .update(prescriptions)
          .set({ status: 'COMPLETED' })
          .where(eq(prescriptions.id, parseInt(prescriptionId, 10)));
      }

      // Create notification
      await tx.insert(notifications).values({
        type: 'SALE_COMPLETED',
        title: `Sale Completed: ${invoiceNumber}`,
        message: `Sale completed for $${finalGrandTotal.toFixed(2)} via ${pMethod}.`,
      });

      return newSale;
    });

    await logAudit({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      action: 'SALE_CREATION',
      details: `Created sale ${invoiceNumber} ($${finalGrandTotal.toFixed(2)}) with ${allocations.length} batch allocations (FEFO applied).`,
      ipAddress: req.ip || '127.0.0.1',
      result: 'SUCCESS',
    });

    return res.status(201).json({
      success: true,
      message: 'Sale completed successfully. FEFO applied to inventory batches.',
      data: {
        sale: result,
        allocations,
      },
    });
  } catch (error: any) {
    console.error('Sale transaction error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to complete sale.',
    });
  }
});

export default router;
