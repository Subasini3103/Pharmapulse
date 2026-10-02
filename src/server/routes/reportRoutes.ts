import { Router } from 'express';
import { db } from '../../db/index.ts';
import {
  sales,
  saleItems,
  medicines,
  batches,
  purchases,
  purchaseItems,
  suppliers,
  customers,
} from '../../db/schema.ts';
import { requireAuth, requireRole } from '../middleware.ts';
import { desc, asc, eq } from 'drizzle-orm';

const router = Router();

// Helper to filter by time range
function getDateRange(range?: string, start?: string, end?: string): { from: Date; to: Date } {
  const now = new Date();
  let from = new Date(0); // beginning of time
  let to = new Date();

  if (range === 'today') {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (range === 'this_week') {
    const day = now.getDay();
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, 0, 0, 0);
  } else if (range === 'this_month') {
    from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  } else if (range === 'custom' && start && end) {
    from = new Date(start);
    to = new Date(end);
    to.setHours(23, 59, 59);
  }

  return { from, to };
}

// GET /api/reports/sales
router.get('/sales', requireAuth, requireRole(['ADMIN', 'PHARMACIST']), async (req, res): Promise<any> => {
  const { range, startDate, endDate } = req.query;

  try {
    const { from, to } = getDateRange(range as string, startDate as string, endDate as string);

    const allSales = await db
      .select({
        id: sales.id,
        invoiceNumber: sales.invoiceNumber,
        customerName: customers.name,
        saleDate: sales.saleDate,
        subtotal: sales.subtotal,
        tax: sales.tax,
        discount: sales.discount,
        grandTotal: sales.grandTotal,
        paymentMethod: sales.paymentMethod,
        status: sales.status,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .orderBy(desc(sales.saleDate));

    const filtered = allSales.filter((s) => {
      const d = new Date(s.saleDate);
      return d >= from && d <= to;
    });

    const totalRevenue = filtered.reduce((acc, s) => acc + parseFloat(s.grandTotal), 0);
    const totalTax = filtered.reduce((acc, s) => acc + parseFloat(s.tax), 0);
    const totalDiscount = filtered.reduce((acc, s) => acc + parseFloat(s.discount), 0);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalTransactions: filtered.length,
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          totalTax: parseFloat(totalTax.toFixed(2)),
          totalDiscount: parseFloat(totalDiscount.toFixed(2)),
        },
        records: filtered,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to generate sales report' });
  }
});

// GET /api/reports/purchases
router.get('/purchases', requireAuth, requireRole(['ADMIN', 'PHARMACIST']), async (req, res): Promise<any> => {
  const { range, startDate, endDate } = req.query;

  try {
    const { from, to } = getDateRange(range as string, startDate as string, endDate as string);

    const allPurchases = await db
      .select({
        id: purchases.id,
        purchaseOrderNumber: purchases.purchaseOrderNumber,
        supplierName: suppliers.companyName,
        purchaseDate: purchases.purchaseDate,
        totalAmount: purchases.totalAmount,
        status: purchases.status,
      })
      .from(purchases)
      .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .orderBy(desc(purchases.purchaseDate));

    const filtered = allPurchases.filter((p) => {
      const d = new Date(p.purchaseDate);
      return d >= from && d <= to;
    });

    const totalSpend = filtered.reduce((acc, p) => acc + parseFloat(p.totalAmount), 0);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalOrders: filtered.length,
          totalSpend: parseFloat(totalSpend.toFixed(2)),
        },
        records: filtered,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to generate purchase report' });
  }
});

// GET /api/reports/inventory
router.get('/inventory', requireAuth, requireRole(['ADMIN', 'PHARMACIST']), async (_req, res): Promise<any> => {
  try {
    const allMeds = await db.select().from(medicines);
    const allBatches = await db.select().from(batches);
    const now = new Date();

    const report = allMeds.map((m) => {
      const medBatches = allBatches.filter((b) => b.medicineId === m.id);
      const activeBatches = medBatches.filter(
        (b) => b.status !== 'EXPIRED' && new Date(b.expiryDate) >= now
      );
      const totalAvailable = activeBatches.reduce((acc, b) => acc + b.availableQuantity, 0);
      const expiredQuantity = medBatches
        .filter((b) => b.status === 'EXPIRED' || new Date(b.expiryDate) < now)
        .reduce((acc, b) => acc + b.availableQuantity, 0);

      const totalValuation = activeBatches.reduce(
        (acc, b) => acc + b.availableQuantity * parseFloat(b.sellingPrice),
        0
      );

      return {
        id: m.id,
        name: m.name,
        genericName: m.genericName,
        form: m.form,
        currentStock: totalAvailable,
        minimumStock: m.minimumStockLevel,
        expiredStock: expiredQuantity,
        valuation: parseFloat(totalValuation.toFixed(2)),
        status: totalAvailable === 0 ? 'OUT_OF_STOCK' : totalAvailable <= m.minimumStockLevel ? 'LOW_STOCK' : 'GOOD',
      };
    });

    const totalValuation = report.reduce((sum, r) => sum + r.valuation, 0);
    const lowStockCount = report.filter((r) => r.status === 'LOW_STOCK').length;
    const outOfStockCount = report.filter((r) => r.status === 'OUT_OF_STOCK').length;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalMedicines: allMeds.length,
          totalInventoryValuation: parseFloat(totalValuation.toFixed(2)),
          lowStockCount,
          outOfStockCount,
        },
        records: report,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to generate inventory report' });
  }
});

// GET /api/reports/expiry
router.get('/expiry', requireAuth, requireRole(['ADMIN', 'PHARMACIST']), async (_req, res): Promise<any> => {
  try {
    const allBatches = await db
      .select({
        id: batches.id,
        medicineName: medicines.name,
        batchNumber: batches.batchNumber,
        expiryDate: batches.expiryDate,
        availableQuantity: batches.availableQuantity,
        sellingPrice: batches.sellingPrice,
        status: batches.status,
      })
      .from(batches)
      .leftJoin(medicines, eq(batches.medicineId, medicines.id))
      .orderBy(asc(batches.expiryDate));

    const now = new Date();

    const categorized = allBatches.map((b) => {
      const expDate = new Date(b.expiryDate);
      const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      let riskLevel = 'SAFE';

      if (diffDays < 0 || b.status === 'EXPIRED') riskLevel = 'EXPIRED';
      else if (diffDays <= 7) riskLevel = 'CRITICAL (<=7 Days)';
      else if (diffDays <= 30) riskLevel = 'WARNING (<=30 Days)';
      else if (diffDays <= 90) riskLevel = 'ATTENTION (<=90 Days)';

      const lossValue = parseFloat(b.sellingPrice) * b.availableQuantity;

      return {
        ...b,
        daysRemaining: diffDays,
        riskLevel,
        estimatedValue: parseFloat(lossValue.toFixed(2)),
      };
    });

    const atRisk = categorized.filter((b) => b.daysRemaining <= 90);
    const expiredLoss = categorized
      .filter((b) => b.riskLevel === 'EXPIRED')
      .reduce((acc, b) => acc + b.estimatedValue, 0);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalBatches: allBatches.length,
          atRiskCount: atRisk.length,
          totalExpiredLoss: parseFloat(expiredLoss.toFixed(2)),
        },
        records: categorized,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to generate expiry report' });
  }
});

export default router;
