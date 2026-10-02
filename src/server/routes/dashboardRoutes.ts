import { Router } from 'express';
import { db } from '../../db/index.ts';
import {
  medicines,
  categories,
  suppliers,
  customers,
  batches,
  prescriptions,
  sales,
  saleItems,
  purchases,
} from '../../db/schema.ts';
import { requireAuth, AuthenticatedRequest } from '../middleware.ts';
import { eq, desc, sql, and, gte, asc } from 'drizzle-orm';

const router = Router();

// GET /api/dashboard/admin
router.get('/admin', requireAuth, async (req: AuthenticatedRequest, res): Promise<any> => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Forbidden: Admin access only' });
  }

  try {
    const allMeds = await db.select().from(medicines);
    const allCats = await db.select().from(categories);
    const allSups = await db.select().from(suppliers);
    const allCusts = await db.select().from(customers);
    const allBatches = await db.select().from(batches);
    const allSales = await db.select().from(sales);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Compute stock & expiry metrics
    let totalStock = 0;
    let expiredBatchesCount = 0;
    let expiringSoonBatchesCount = 0;

    allBatches.forEach((b) => {
      const expDate = new Date(b.expiryDate);
      if (b.status === 'EXPIRED' || expDate < now) {
        expiredBatchesCount++;
      } else {
        totalStock += b.availableQuantity;
        const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          expiringSoonBatchesCount++;
        }
      }
    });

    // Low stock count
    let lowStockCount = 0;
    allMeds.forEach((m) => {
      const validBatches = allBatches.filter(
        (b) => b.medicineId === m.id && b.status !== 'EXPIRED' && new Date(b.expiryDate) >= now
      );
      const stock = validBatches.reduce((sum, b) => sum + b.availableQuantity, 0);
      if (stock <= m.minimumStockLevel) {
        lowStockCount++;
      }
    });

    // Sales metrics
    let todaySales = 0;
    let monthlySales = 0;
    let totalRevenue = 0;

    allSales.forEach((s) => {
      const sTotal = parseFloat(s.grandTotal || '0');
      totalRevenue += sTotal;

      const sDateStr = new Date(s.saleDate).toISOString().split('T')[0];
      if (sDateStr === todayStr) {
        todaySales += sTotal;
      }

      if (new Date(s.saleDate) >= firstDayOfMonth) {
        monthlySales += sTotal;
      }
    });

    // Chart: Sales by day (Last 7 days)
    const salesByDayMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      salesByDayMap[key] = 0;
    }

    allSales.forEach((s) => {
      const key = new Date(s.saleDate).toISOString().split('T')[0];
      if (salesByDayMap[key] !== undefined) {
        salesByDayMap[key] += parseFloat(s.grandTotal);
      }
    });

    const salesByDay = Object.keys(salesByDayMap).map((date) => ({
      date,
      day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      amount: parseFloat(salesByDayMap[date].toFixed(2)),
    }));

    // Top selling medicines
    const allSaleItems = await db.select().from(saleItems);
    const medSalesCount: Record<number, number> = {};
    allSaleItems.forEach((si) => {
      medSalesCount[si.medicineId] = (medSalesCount[si.medicineId] || 0) + si.quantity;
    });

    const topSelling = Object.keys(medSalesCount)
      .map((mId) => {
        const med = allMeds.find((m) => m.id === parseInt(mId, 10));
        return {
          medicineId: parseInt(mId, 10),
          name: med ? med.name : `Medicine #${mId}`,
          unitsSold: medSalesCount[parseInt(mId, 10)],
        };
      })
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5);

    // Category distribution
    const categoryCounts: Record<string, number> = {};
    allCats.forEach((c) => { categoryCounts[c.name] = 0; });
    allMeds.forEach((m) => {
      const cat = allCats.find((c) => c.id === m.categoryId);
      if (cat) {
        categoryCounts[cat.name] = (categoryCounts[cat.name] || 0) + 1;
      }
    });

    const categoryDistribution = Object.keys(categoryCounts)
      .filter((k) => categoryCounts[k] > 0)
      .map((name) => ({ name, count: categoryCounts[name] }));

    return res.status(200).json({
      success: true,
      data: {
        cards: {
          totalMedicines: allMeds.length,
          totalCategories: allCats.length,
          totalSuppliers: allSups.length,
          totalCustomers: allCusts.length,
          totalStock,
          lowStockMedicines: lowStockCount,
          expiringMedicines: expiringSoonBatchesCount,
          expiredMedicines: expiredBatchesCount,
          todaySales: parseFloat(todaySales.toFixed(2)),
          monthlySales: parseFloat(monthlySales.toFixed(2)),
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        },
        charts: {
          salesByDay,
          topSelling,
          categoryDistribution,
          stockStatus: [
            { name: 'Adequate Stock', value: allMeds.length - lowStockCount },
            { name: 'Low Stock Alert', value: lowStockCount },
          ],
        },
      },
    });
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch admin dashboard' });
  }
});

// GET /api/dashboard/pharmacist
router.get('/pharmacist', requireAuth, async (req: AuthenticatedRequest, res): Promise<any> => {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'PHARMACIST') {
    return res.status(403).json({ success: false, message: 'Forbidden: Pharmacist access only' });
  }

  try {
    const allMeds = await db.select().from(medicines);
    const allBatches = await db.select().from(batches);
    const pendingRx = await db.select().from(prescriptions).where(eq(prescriptions.status, 'PENDING'));
    const allSales = await db.select().from(sales).orderBy(desc(sales.saleDate)).limit(10);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    let todaySales = 0;
    allSales.forEach((s) => {
      if (new Date(s.saleDate).toISOString().split('T')[0] === todayStr) {
        todaySales += parseFloat(s.grandTotal);
      }
    });

    let lowStockCount = 0;
    let expiringCount = 0;
    allBatches.forEach((b) => {
      const expDate = new Date(b.expiryDate);
      const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 30 && diffDays >= 0) expiringCount++;
    });

    allMeds.forEach((m) => {
      const valid = allBatches.filter((b) => b.medicineId === m.id && new Date(b.expiryDate) >= now);
      const stock = valid.reduce((acc, b) => acc + b.availableQuantity, 0);
      if (stock <= m.minimumStockLevel) lowStockCount++;
    });

    return res.status(200).json({
      success: true,
      data: {
        todaySales: parseFloat(todaySales.toFixed(2)),
        pendingPrescriptions: pendingRx.length,
        lowStockMedicines: lowStockCount,
        expiringMedicines: expiringCount,
        totalMedicines: allMeds.length,
        recentSales: allSales,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch pharmacist dashboard' });
  }
});

// GET /api/dashboard/supplier
router.get('/supplier', requireAuth, async (req: AuthenticatedRequest, res): Promise<any> => {
  if (req.user?.role !== 'SUPPLIER' && req.user?.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Forbidden: Supplier access only' });
  }

  const supplierId = req.user?.role === 'SUPPLIER' ? req.user.supplierId : parseInt(req.query.supplierId as string, 10);

  if (!supplierId) {
    return res.status(400).json({ success: false, message: 'Supplier profile required' });
  }

  try {
    const suppliedMeds = await db.select().from(medicines).where(eq(medicines.supplierId, supplierId));
    const supplierPurchases = await db
      .select()
      .from(purchases)
      .where(eq(purchases.supplierId, supplierId))
      .orderBy(desc(purchases.purchaseDate));

    const totalSuppliedRevenue = supplierPurchases.reduce((sum, p) => sum + parseFloat(p.totalAmount), 0);

    return res.status(200).json({
      success: true,
      data: {
        totalSuppliedMedicines: suppliedMeds.length,
        activeOrders: supplierPurchases.length,
        totalRevenue: parseFloat(totalSuppliedRevenue.toFixed(2)),
        recentOrders: supplierPurchases.slice(0, 5),
        medicines: suppliedMeds,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch supplier dashboard' });
  }
});

// GET /api/dashboard/customer
router.get('/customer', requireAuth, async (req: AuthenticatedRequest, res): Promise<any> => {
  if (req.user?.role !== 'CUSTOMER' && req.user?.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Forbidden: Customer access only' });
  }

  const customerId = req.user?.role === 'CUSTOMER' ? req.user.customerId : parseInt(req.query.customerId as string, 10);

  if (!customerId) {
    return res.status(200).json({
      success: true,
      data: {
        totalSpent: 0,
        activePrescriptions: 0,
        recentPurchases: [],
      },
    });
  }

  try {
    const customerSales = await db
      .select()
      .from(sales)
      .where(eq(sales.customerId, customerId))
      .orderBy(desc(sales.saleDate));

    const customerRx = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.customerId, customerId))
      .orderBy(desc(prescriptions.createdAt));

    const totalSpent = customerSales.reduce((sum, s) => sum + parseFloat(s.grandTotal), 0);

    return res.status(200).json({
      success: true,
      data: {
        totalSpent: parseFloat(totalSpent.toFixed(2)),
        totalInvoices: customerSales.length,
        activePrescriptions: customerRx.filter((r) => r.status === 'APPROVED' || r.status === 'PENDING').length,
        recentPurchases: customerSales.slice(0, 5),
        prescriptions: customerRx.slice(0, 5),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch customer dashboard' });
  }
});

export default router;
