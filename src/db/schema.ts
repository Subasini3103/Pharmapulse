import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').unique(), // Optional Firebase UID for Google Sign-In
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('CUSTOMER'), // 'ADMIN' | 'PHARMACIST' | 'SUPPLIER' | 'CUSTOMER'
  status: text('status').notNull().default('ACTIVE'), // 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockoutUntil: timestamp('lockout_until'),
  resetToken: text('reset_token'),
  resetTokenExpiry: timestamp('reset_token_expiry'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Audit Logs table
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  userEmail: text('user_email'),
  action: text('action').notNull(),
  details: text('details'),
  ipAddress: text('ip_address'),
  result: text('result').notNull().default('SUCCESS'), // 'SUCCESS' | 'FAILURE'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Categories table
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Suppliers table
export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  companyName: text('company_name').notNull(),
  contactPerson: text('contact_person').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  address: text('address'),
  gstTaxNumber: text('gst_tax_number'),
  status: text('status').notNull().default('ACTIVE'),
  userId: integer('user_id').references(() => users.id), // For supplier login linking
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Customers table
export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone').notNull(),
  address: text('address'),
  dateOfBirth: text('date_of_birth'),
  gender: text('gender'),
  userId: integer('user_id').references(() => users.id), // For customer login linking
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Pharmacists table
export const pharmacists = pgTable('pharmacists', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  licenseNumber: text('license_number'),
  qualification: text('qualification'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Medicines table
export const medicines = pgTable('medicines', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  genericName: text('generic_name'),
  brandName: text('brand_name'),
  categoryId: integer('category_id').references(() => categories.id),
  description: text('description'),
  manufacturer: text('manufacturer'),
  supplierId: integer('supplier_id').references(() => suppliers.id),
  dosage: text('dosage'),
  form: text('form').notNull().default('Tablets'), // Tablets, Capsules, Syrups, Injections, Creams, Ointments, Drops, Other
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull().default('0.00'),
  prescriptionRequired: boolean('prescription_required').notNull().default(false),
  minimumStockLevel: integer('minimum_stock_level').notNull().default(10),
  maximumStockLevel: integer('maximum_stock_level').notNull().default(500),
  status: text('status').notNull().default('ACTIVE'), // 'ACTIVE' | 'DISCONTINUED'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Batches table
export const batches = pgTable('batches', {
  id: serial('id').primaryKey(),
  medicineId: integer('medicine_id').references(() => medicines.id).notNull(),
  supplierId: integer('supplier_id').references(() => suppliers.id),
  batchNumber: text('batch_number').notNull(),
  manufacturingDate: text('manufacturing_date').notNull(), // YYYY-MM-DD
  expiryDate: text('expiry_date').notNull(), // YYYY-MM-DD
  purchasePrice: numeric('purchase_price', { precision: 10, scale: 2 }).notNull().default('0.00'),
  sellingPrice: numeric('selling_price', { precision: 10, scale: 2 }).notNull().default('0.00'),
  quantity: integer('quantity').notNull().default(0),
  availableQuantity: integer('available_quantity').notNull().default(0),
  status: text('status').notNull().default('ACTIVE'), // 'ACTIVE' | 'EXPIRED' | 'RECALLED'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Prescriptions table
export const prescriptions = pgTable('prescriptions', {
  id: serial('id').primaryKey(),
  prescriptionNumber: text('prescription_number').notNull().unique(),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  doctorName: text('doctor_name').notNull(),
  prescriptionDate: text('prescription_date').notNull(), // YYYY-MM-DD
  notes: text('notes'),
  status: text('status').notNull().default('PENDING'), // 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED'
  pharmacistId: integer('pharmacist_id').references(() => pharmacists.id),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Prescription Items table
export const prescriptionItems = pgTable('prescription_items', {
  id: serial('id').primaryKey(),
  prescriptionId: integer('prescription_id').references(() => prescriptions.id).notNull(),
  medicineId: integer('medicine_id').references(() => medicines.id).notNull(),
  quantity: integer('quantity').notNull(),
  dosage: text('dosage'),
  frequency: text('frequency'),
  duration: text('duration'),
  instructions: text('instructions'),
});

// Sales table
export const sales = pgTable('sales', {
  id: serial('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  customerId: integer('customer_id').references(() => customers.id),
  pharmacistId: integer('pharmacist_id').references(() => pharmacists.id),
  prescriptionId: integer('prescription_id').references(() => prescriptions.id),
  saleDate: timestamp('sale_date').defaultNow().notNull(),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  tax: numeric('tax', { precision: 10, scale: 2 }).notNull().default('0.00'),
  discount: numeric('discount', { precision: 10, scale: 2 }).notNull().default('0.00'),
  grandTotal: numeric('grand_total', { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text('payment_method').notNull().default('CASH'), // 'CASH' | 'CARD' | 'UPI' | 'OTHER'
  status: text('status').notNull().default('COMPLETED'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Sale Items table
export const saleItems = pgTable('sale_items', {
  id: serial('id').primaryKey(),
  saleId: integer('sale_id').references(() => sales.id).notNull(),
  medicineId: integer('medicine_id').references(() => medicines.id).notNull(),
  batchId: integer('batch_id').references(() => batches.id).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
});

// Purchases (Supplies) table
export const purchases = pgTable('purchases', {
  id: serial('id').primaryKey(),
  purchaseOrderNumber: text('purchase_order_number').notNull().unique(),
  supplierId: integer('supplier_id').references(() => suppliers.id).notNull(),
  purchaseDate: timestamp('purchase_date').defaultNow().notNull(),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  status: text('status').notNull().default('RECEIVED'), // 'PENDING' | 'SHIPPED' | 'RECEIVED' | 'CANCELLED'
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Purchase Items table
export const purchaseItems = pgTable('purchase_items', {
  id: serial('id').primaryKey(),
  purchaseId: integer('purchase_id').references(() => purchases.id).notNull(),
  medicineId: integer('medicine_id').references(() => medicines.id).notNull(),
  batchNumber: text('batch_number').notNull(),
  manufacturingDate: text('manufacturing_date').notNull(),
  expiryDate: text('expiry_date').notNull(),
  quantity: integer('quantity').notNull(),
  purchasePrice: numeric('purchase_price', { precision: 10, scale: 2 }).notNull(),
  sellingPrice: numeric('selling_price', { precision: 10, scale: 2 }).notNull(),
  batchId: integer('batch_id').references(() => batches.id),
});

// Stock Movements table
export const stockMovements = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  medicineId: integer('medicine_id').references(() => medicines.id).notNull(),
  batchId: integer('batch_id').references(() => batches.id),
  type: text('type').notNull(), // 'STOCK_IN' | 'STOCK_OUT' | 'SALE' | 'RETURN' | 'DAMAGE' | 'EXPIRED' | 'ADJUSTMENT'
  quantity: integer('quantity').notNull(),
  reason: text('reason'),
  reference: text('reference'),
  userId: integer('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Notifications table
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(), // 'LOW_STOCK' | 'EXPIRING_SOON' | 'EXPIRED' | 'PENDING_PRESCRIPTION' | 'SALE_COMPLETED' | 'NEW_PURCHASE'
  title: text('title').notNull(),
  message: text('message').notNull(),
  medicineId: integer('medicine_id').references(() => medicines.id),
  batchId: integer('batch_id').references(() => batches.id),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  auditLogs: many(auditLogs),
  customer: one(customers, { fields: [users.id], references: [customers.userId] }),
  supplier: one(suppliers, { fields: [users.id], references: [suppliers.userId] }),
  pharmacist: one(pharmacists, { fields: [users.id], references: [pharmacists.userId] }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  medicines: many(medicines),
}));

export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  user: one(users, { fields: [suppliers.userId], references: [users.id] }),
  medicines: many(medicines),
  batches: many(batches),
  purchases: many(purchases),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  user: one(users, { fields: [customers.userId], references: [users.id] }),
  prescriptions: many(prescriptions),
  sales: many(sales),
}));

export const medicinesRelations = relations(medicines, ({ one, many }) => ({
  category: one(categories, { fields: [medicines.categoryId], references: [categories.id] }),
  supplier: one(suppliers, { fields: [medicines.supplierId], references: [suppliers.id] }),
  batches: many(batches),
  prescriptionItems: many(prescriptionItems),
  saleItems: many(saleItems),
  purchaseItems: many(purchaseItems),
  stockMovements: many(stockMovements),
}));

export const batchesRelations = relations(batches, ({ one, many }) => ({
  medicine: one(medicines, { fields: [batches.medicineId], references: [medicines.id] }),
  supplier: one(suppliers, { fields: [batches.supplierId], references: [suppliers.id] }),
  saleItems: many(saleItems),
  purchaseItems: many(purchaseItems),
  stockMovements: many(stockMovements),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one, many }) => ({
  customer: one(customers, { fields: [prescriptions.customerId], references: [customers.id] }),
  pharmacist: one(pharmacists, { fields: [prescriptions.pharmacistId], references: [pharmacists.id] }),
  items: many(prescriptionItems),
  sales: many(sales),
}));

export const prescriptionItemsRelations = relations(prescriptionItems, ({ one }) => ({
  prescription: one(prescriptions, { fields: [prescriptionItems.prescriptionId], references: [prescriptions.id] }),
  medicine: one(medicines, { fields: [prescriptionItems.medicineId], references: [medicines.id] }),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  customer: one(customers, { fields: [sales.customerId], references: [customers.id] }),
  pharmacist: one(pharmacists, { fields: [sales.pharmacistId], references: [pharmacists.id] }),
  prescription: one(prescriptions, { fields: [sales.prescriptionId], references: [prescriptions.id] }),
  items: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, { fields: [saleItems.saleId], references: [sales.id] }),
  medicine: one(medicines, { fields: [saleItems.medicineId], references: [medicines.id] }),
  batch: one(batches, { fields: [saleItems.batchId], references: [batches.id] }),
}));

export const purchasesRelations = relations(purchases, ({ one, many }) => ({
  supplier: one(suppliers, { fields: [purchases.supplierId], references: [suppliers.id] }),
  items: many(purchaseItems),
}));

export const purchaseItemsRelations = relations(purchaseItems, ({ one }) => ({
  purchase: one(purchases, { fields: [purchaseItems.purchaseId], references: [purchases.id] }),
  medicine: one(medicines, { fields: [purchaseItems.medicineId], references: [medicines.id] }),
  batch: one(batches, { fields: [purchaseItems.batchId], references: [batches.id] }),
}));
