import bcrypt from 'bcryptjs';
import { db } from './index.ts';
import {
  users,
  categories,
  suppliers,
  customers,
  pharmacists,
  medicines,
  batches,
  prescriptions,
  prescriptionItems,
  sales,
  saleItems,
  purchases,
  purchaseItems,
  stockMovements,
  notifications,
  auditLogs,
} from './schema.ts';

export async function seedDatabase() {
  console.log('Checking existing data...');
  const existingUsers = await db.select().from(users);
  if (existingUsers.length > 0) {
    console.log(`Database already has ${existingUsers.length} users. Skipping seed.`);
    return;
  }

  console.log('Seeding database with initial data...');

  // Passwords
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
  const pharmacistPasswordHash = await bcrypt.hash('Pharmacist@123', 10);
  const supplierPasswordHash = await bcrypt.hash('Supplier@123', 10);
  const customerPasswordHash = await bcrypt.hash('Customer@123', 10);

  // 1. Users
  // Admin
  const [adminUser] = await db.insert(users).values({
    name: 'Chief Admin',
    email: 'admin@pharmacy.com',
    phone: '+1-555-0100',
    passwordHash: adminPasswordHash,
    role: 'ADMIN',
    status: 'ACTIVE',
  }).returning();

  // 2 Pharmacists
  const [pharm1User] = await db.insert(users).values({
    name: 'Dr. Sarah Jenkins',
    email: 'sarah.pharmacist@pharmacy.com',
    phone: '+1-555-0101',
    passwordHash: pharmacistPasswordHash,
    role: 'PHARMACIST',
    status: 'ACTIVE',
  }).returning();

  const [pharm2User] = await db.insert(users).values({
    name: 'Marcus Vance',
    email: 'marcus.pharmacist@pharmacy.com',
    phone: '+1-555-0102',
    passwordHash: pharmacistPasswordHash,
    role: 'PHARMACIST',
    status: 'ACTIVE',
  }).returning();

  // 3 Suppliers
  const [sup1User] = await db.insert(users).values({
    name: 'MediSupply Corp',
    email: 'orders@medisupply.com',
    phone: '+1-555-0201',
    passwordHash: supplierPasswordHash,
    role: 'SUPPLIER',
    status: 'ACTIVE',
  }).returning();

  const [sup2User] = await db.insert(users).values({
    name: 'BioHealth Pharma Logistics',
    email: 'contact@biohealth.com',
    phone: '+1-555-0202',
    passwordHash: supplierPasswordHash,
    role: 'SUPPLIER',
    status: 'ACTIVE',
  }).returning();

  const [sup3User] = await db.insert(users).values({
    name: 'Apex Therapeutics Direct',
    email: 'sales@apexthera.com',
    phone: '+1-555-0203',
    passwordHash: supplierPasswordHash,
    role: 'SUPPLIER',
    status: 'ACTIVE',
  }).returning();

  // 5 Customers
  const customerUsers = [];
  const custData = [
    { name: 'Johnathan Miller', email: 'john.miller@example.com', phone: '+1-555-0301', address: '742 Evergreen Terrace, Springfield', dob: '1985-04-12', gender: 'Male' },
    { name: 'Elena Rostova', email: 'elena.rostova@example.com', phone: '+1-555-0302', address: '124 Conch Street, Pacific Bay', dob: '1992-09-24', gender: 'Female' },
    { name: 'David Chen', email: 'david.chen@example.com', phone: '+1-555-0303', address: '304 Maple Ave, Riverdale', dob: '1978-11-03', gender: 'Male' },
    { name: 'Sophia Martinez', email: 'sophia.m@example.com', phone: '+1-555-0304', address: '88 Oak Ridge Lane, Metropolis', dob: '2001-01-19', gender: 'Female' },
    { name: 'Robert Taylor', email: 'robert.taylor@example.com', phone: '+1-555-0305', address: '512 Pinecrest Blvd, Star City', dob: '1964-07-30', gender: 'Male' },
  ];

  for (const c of custData) {
    const [u] = await db.insert(users).values({
      name: c.name,
      email: c.email,
      phone: c.phone,
      passwordHash: customerPasswordHash,
      role: 'CUSTOMER',
      status: 'ACTIVE',
    }).returning();
    customerUsers.push(u);
  }

  // Pharmacist profiles
  const [pharm1] = await db.insert(pharmacists).values({
    userId: pharm1User.id,
    name: pharm1User.name,
    email: pharm1User.email,
    phone: pharm1User.phone,
    licenseNumber: 'RPH-94821',
    qualification: 'Pharm.D, Board Certified Pharmacotherapy Specialist',
  }).returning();

  const [pharm2] = await db.insert(pharmacists).values({
    userId: pharm2User.id,
    name: pharm2User.name,
    email: pharm2User.email,
    phone: pharm2User.phone,
    licenseNumber: 'RPH-77341',
    qualification: 'B.Pharm, Licensed Clinical Pharmacist',
  }).returning();

  // Supplier profiles
  const [supplier1] = await db.insert(suppliers).values({
    userId: sup1User.id,
    companyName: 'MediSupply Global Corp',
    contactPerson: 'David K. Larson',
    email: sup1User.email,
    phone: sup1User.phone!,
    address: '100 Industrial Pkwy, Suite 400, Chicago, IL',
    gstTaxNumber: 'US-IL-98432109',
    status: 'ACTIVE',
  }).returning();

  const [supplier2] = await db.insert(suppliers).values({
    userId: sup2User.id,
    companyName: 'BioHealth Pharma Logistics',
    contactPerson: 'Amanda Vance',
    email: sup2User.email,
    phone: sup2User.phone!,
    address: '450 Science Park Way, Cambridge, MA',
    gstTaxNumber: 'US-MA-33291845',
    status: 'ACTIVE',
  }).returning();

  const [supplier3] = await db.insert(suppliers).values({
    userId: sup3User.id,
    companyName: 'Apex Therapeutics Direct',
    contactPerson: 'Rachel Lee',
    email: sup3User.email,
    phone: sup3User.phone!,
    address: '890 BioTech Blvd, San Diego, CA',
    gstTaxNumber: 'US-CA-77884411',
    status: 'ACTIVE',
  }).returning();

  // Customer profiles
  const createdCustomers = [];
  for (let i = 0; i < customerUsers.length; i++) {
    const cData = custData[i];
    const u = customerUsers[i];
    const [cRecord] = await db.insert(customers).values({
      userId: u.id,
      name: cData.name,
      email: cData.email,
      phone: cData.phone,
      address: cData.address,
      dateOfBirth: cData.dob,
      gender: cData.gender,
    }).returning();
    createdCustomers.push(cRecord);
  }

  // 10+ Categories
  const categoryNames = [
    { name: 'Antibiotics', description: 'Antimicrobial medicines to fight bacterial infections' },
    { name: 'Pain Relief & Analgesics', description: 'Painkillers, NSAIDs, and antipyretics' },
    { name: 'Cardiovascular', description: 'Hypertension, cholesterol, and heart condition medications' },
    { name: 'Respiratory & Anti-Allergy', description: 'Antihistamines, bronchodilators, and cough syrups' },
    { name: 'Gastrointestinal', description: 'Antacids, proton pump inhibitors, and digestives' },
    { name: 'Endocrine & Diabetes', description: 'Insulins, oral hypoglycemics, and thyroid hormones' },
    { name: 'Dermatologicals & Creams', description: 'Topical steroids, antifungal creams, and antiseptics' },
    { name: 'Ophthalmic & ENT Drops', description: 'Eye drops, ear suspensions, and nasal sprays' },
    { name: 'Vitamins & Dietary Supplements', description: 'Multivitamins, minerals, and wellness nutrients' },
    { name: 'Neurological & Psychotropic', description: 'Sedatives, anticonvulsants, and mood regulators' },
    { name: 'Injectables & Infusions', description: 'Intravenous solutions, vaccines, and sterile ampoules' },
  ];

  const createdCategories: any[] = [];
  for (const cat of categoryNames) {
    const [c] = await db.insert(categories).values(cat).returning();
    createdCategories.push(c);
  }

  // 20+ Medicines
  const medDefinitions = [
    {
      name: 'Amoxicillin 500mg',
      genericName: 'Amoxicillin Trihydrate',
      brandName: 'Amoxil',
      catIdx: 0,
      manufacturer: 'GlaxoSmithKline',
      dosage: '500mg',
      form: 'Capsules',
      unitPrice: '14.50',
      rxReq: true,
      minStock: 20,
      supplierId: supplier1.id,
    },
    {
      name: 'Azithromycin 250mg',
      genericName: 'Azithromycin Dihydrate',
      brandName: 'Zithromax',
      catIdx: 0,
      manufacturer: 'Pfizer',
      dosage: '250mg',
      form: 'Tablets',
      unitPrice: '22.00',
      rxReq: true,
      minStock: 15,
      supplierId: supplier1.id,
    },
    {
      name: 'Paracetamol 650mg',
      genericName: 'Acetaminophen',
      brandName: 'Calpol / Crocin',
      catIdx: 1,
      manufacturer: 'Johnson & Johnson',
      dosage: '650mg',
      form: 'Tablets',
      unitPrice: '4.25',
      rxReq: false,
      minStock: 50,
      supplierId: supplier2.id,
    },
    {
      name: 'Ibuprofen 400mg',
      genericName: 'Ibuprofen',
      brandName: 'Advil',
      catIdx: 1,
      manufacturer: 'Haleon',
      dosage: '400mg',
      form: 'Tablets',
      unitPrice: '8.50',
      rxReq: false,
      minStock: 30,
      supplierId: supplier2.id,
    },
    {
      name: 'Tramadol 50mg',
      genericName: 'Tramadol Hydrochloride',
      brandName: 'Ultram',
      catIdx: 1,
      manufacturer: 'Grünenthal',
      dosage: '50mg',
      form: 'Capsules',
      unitPrice: '28.00',
      rxReq: true,
      minStock: 10,
      supplierId: supplier3.id,
    },
    {
      name: 'Atorvastatin 20mg',
      genericName: 'Atorvastatin Calcium',
      brandName: 'Lipitor',
      catIdx: 2,
      manufacturer: 'Viatris',
      dosage: '20mg',
      form: 'Tablets',
      unitPrice: '18.75',
      rxReq: true,
      minStock: 25,
      supplierId: supplier1.id,
    },
    {
      name: 'Amlodipine 5mg',
      genericName: 'Amlodipine Besylate',
      brandName: 'Norvasc',
      catIdx: 2,
      manufacturer: 'Pfizer',
      dosage: '5mg',
      form: 'Tablets',
      unitPrice: '9.20',
      rxReq: true,
      minStock: 20,
      supplierId: supplier2.id,
    },
    {
      name: 'Metoprolol Succinate 50mg',
      genericName: 'Metoprolol',
      brandName: 'Toprol-XL',
      catIdx: 2,
      manufacturer: 'AstraZeneca',
      dosage: '50mg',
      form: 'Tablets',
      unitPrice: '16.40',
      rxReq: true,
      minStock: 15,
      supplierId: supplier3.id,
    },
    {
      name: 'Cetirizine 10mg',
      genericName: 'Cetirizine Hydrochloride',
      brandName: 'Zyrtec',
      catIdx: 3,
      manufacturer: 'UCB Pharma',
      dosage: '10mg',
      form: 'Tablets',
      unitPrice: '6.50',
      rxReq: false,
      minStock: 30,
      supplierId: supplier2.id,
    },
    {
      name: 'Salbutamol Inhaler 100mcg',
      genericName: 'Albuterol Sulfate',
      brandName: 'Ventolin',
      catIdx: 3,
      manufacturer: 'GSK Respiratory',
      dosage: '100mcg/dose',
      form: 'Other',
      unitPrice: '35.00',
      rxReq: true,
      minStock: 10,
      supplierId: supplier1.id,
    },
    {
      name: 'Dextromethorphan Cough Syrup 100ml',
      genericName: 'Dextromethorphan HBr',
      brandName: 'Robitussin DM',
      catIdx: 3,
      manufacturer: 'Haleon',
      dosage: '15mg/5ml',
      form: 'Syrups',
      unitPrice: '11.80',
      rxReq: false,
      minStock: 15,
      supplierId: supplier3.id,
    },
    {
      name: 'Omeprazole 20mg',
      genericName: 'Omeprazole Magnesium',
      brandName: 'Prilosec',
      catIdx: 4,
      manufacturer: 'AstraZeneca',
      dosage: '20mg',
      form: 'Capsules',
      unitPrice: '12.00',
      rxReq: false,
      minStock: 25,
      supplierId: supplier2.id,
    },
    {
      name: 'Pantoprazole 40mg',
      genericName: 'Pantoprazole Sodium',
      brandName: 'Protonix',
      catIdx: 4,
      manufacturer: 'Wyeth Pharmaceuticals',
      dosage: '40mg',
      form: 'Tablets',
      unitPrice: '15.50',
      rxReq: true,
      minStock: 20,
      supplierId: supplier1.id,
    },
    {
      name: 'Metformin 500mg',
      genericName: 'Metformin Hydrochloride',
      brandName: 'Glucophage',
      catIdx: 5,
      manufacturer: 'Merck Sante',
      dosage: '500mg',
      form: 'Tablets',
      unitPrice: '7.80',
      rxReq: true,
      minStock: 40,
      supplierId: supplier2.id,
    },
    {
      name: 'Insulin Glargine 100 U/ml',
      genericName: 'Insulin Glargine Solostar',
      brandName: 'Lantus',
      catIdx: 5,
      manufacturer: 'Sanofi-Aventis',
      dosage: '100 units/ml',
      form: 'Injections',
      unitPrice: '68.00',
      rxReq: true,
      minStock: 8,
      supplierId: supplier3.id,
    },
    {
      name: 'Hydrocortisone 1% Cream 30g',
      genericName: 'Hydrocortisone',
      brandName: 'Cortaid',
      catIdx: 6,
      manufacturer: 'Johnson & Johnson',
      dosage: '1% w/w',
      form: 'Creams',
      unitPrice: '8.90',
      rxReq: false,
      minStock: 15,
      supplierId: supplier2.id,
    },
    {
      name: 'Mupirocin 2% Ointment 15g',
      genericName: 'Mupirocin',
      brandName: 'Bactroban',
      catIdx: 6,
      manufacturer: 'GSK Dermatology',
      dosage: '20mg/g',
      form: 'Ointments',
      unitPrice: '19.50',
      rxReq: true,
      minStock: 10,
      supplierId: supplier1.id,
    },
    {
      name: 'Ciprofloxacin Eye Drops 5ml',
      genericName: 'Ciprofloxacin 0.3%',
      brandName: 'Ciloxan',
      catIdx: 7,
      manufacturer: 'Alcon Laboratories',
      dosage: '0.3% w/v',
      form: 'Drops',
      unitPrice: '14.00',
      rxReq: true,
      minStock: 12,
      supplierId: supplier1.id,
    },
    {
      name: 'Vitamin D3 60,000 IU',
      genericName: 'Cholecalciferol',
      brandName: 'Calcirol Sachet',
      catIdx: 8,
      manufacturer: 'Cadila Pharma',
      dosage: '60000 IU',
      form: 'Capsules',
      unitPrice: '5.50',
      rxReq: false,
      minStock: 30,
      supplierId: supplier2.id,
    },
    {
      name: 'Multivitamin & Zinc Formula',
      genericName: 'Therapeutic Multivitamin',
      brandName: 'Centrum Complete',
      catIdx: 8,
      manufacturer: 'Haleon',
      dosage: 'Standard RDA',
      form: 'Tablets',
      unitPrice: '16.00',
      rxReq: false,
      minStock: 25,
      supplierId: supplier3.id,
    },
    {
      name: 'Clonazepam 0.5mg',
      genericName: 'Clonazepam',
      brandName: 'Klonopin',
      catIdx: 9,
      manufacturer: 'Roche',
      dosage: '0.5mg',
      form: 'Tablets',
      unitPrice: '21.00',
      rxReq: true,
      minStock: 10,
      supplierId: supplier3.id,
    },
    {
      name: 'Ceftriaxone 1g Injection Vial',
      genericName: 'Ceftriaxone Sodium',
      brandName: 'Rocephin',
      catIdx: 10,
      manufacturer: 'Roche Sterile',
      dosage: '1g IV/IM',
      form: 'Injections',
      unitPrice: '32.50',
      rxReq: true,
      minStock: 15,
      supplierId: supplier1.id,
    },
  ];

  const createdMedicines: any[] = [];
  for (const m of medDefinitions) {
    const [med] = await db.insert(medicines).values({
      name: m.name,
      genericName: m.genericName,
      brandName: m.brandName,
      categoryId: createdCategories[m.catIdx].id,
      manufacturer: m.manufacturer,
      dosage: m.dosage,
      form: m.form,
      unitPrice: m.unitPrice,
      prescriptionRequired: m.rxReq,
      minimumStockLevel: m.minStock,
      maximumStockLevel: 500,
      supplierId: m.supplierId,
      status: 'ACTIVE',
    }).returning();
    createdMedicines.push(med);
  }

  // Batches demonstrating FEFO, Safe Stock, Expiring Soon, Expired, and Low Stock
  // Current anchor date: 2026-10-01
  const batchDefinitions = [
    // Amoxicillin: 2 batches to test FEFO!
    // Batch A: Expiring in 10 days (2026-10-11)
    { medIdx: 0, batchNo: 'AMX-2026-01', mfg: '2025-10-01', exp: '2026-10-11', pPrice: '8.00', sPrice: '14.50', qty: 25, avail: 25, supId: supplier1.id, status: 'ACTIVE' },
    // Batch B: Expiring in 2027 (2027-04-15)
    { medIdx: 0, batchNo: 'AMX-2026-02', mfg: '2026-04-01', exp: '2027-04-15', pPrice: '8.20', sPrice: '14.50', qty: 50, avail: 50, supId: supplier1.id, status: 'ACTIVE' },

    // Azithromycin: Low stock + Safe batch
    { medIdx: 1, batchNo: 'AZT-2025-09', mfg: '2025-05-10', exp: '2027-05-10', pPrice: '14.00', sPrice: '22.00', qty: 8, avail: 8, supId: supplier1.id, status: 'ACTIVE' },

    // Paracetamol: 3 batches (FEFO test: 1 expired, 1 soon, 1 safe)
    // Expired batch (should never be sold)
    { medIdx: 2, batchNo: 'PCM-2024-EXP', mfg: '2024-01-10', exp: '2026-08-15', pPrice: '2.00', sPrice: '4.25', qty: 40, avail: 40, supId: supplier2.id, status: 'EXPIRED' },
    // Expiring within 7 days (2026-10-06)
    { medIdx: 2, batchNo: 'PCM-2026-FEFO1', mfg: '2025-10-01', exp: '2026-10-06', pPrice: '2.10', sPrice: '4.25', qty: 15, avail: 15, supId: supplier2.id, status: 'ACTIVE' },
    // Safe batch (2027-11-20)
    { medIdx: 2, batchNo: 'PCM-2026-FEFO2', mfg: '2026-02-15', exp: '2027-11-20', pPrice: '2.20', sPrice: '4.25', qty: 100, avail: 100, supId: supplier2.id, status: 'ACTIVE' },

    // Ibuprofen: safe batch
    { medIdx: 3, batchNo: 'IBU-26-004', mfg: '2026-01-15', exp: '2027-09-30', pPrice: '4.50', sPrice: '8.50', qty: 60, avail: 60, supId: supplier2.id, status: 'ACTIVE' },

    // Tramadol: safe batch
    { medIdx: 4, batchNo: 'TRM-26-01', mfg: '2026-03-01', exp: '2028-03-01', pPrice: '16.00', sPrice: '28.00', qty: 35, avail: 35, supId: supplier3.id, status: 'ACTIVE' },

    // Atorvastatin: 2 batches (one expiring within 25 days, one safe)
    { medIdx: 5, batchNo: 'ATV-25-08', mfg: '2025-08-01', exp: '2026-10-24', pPrice: '10.50', sPrice: '18.75', qty: 18, avail: 18, supId: supplier1.id, status: 'ACTIVE' },
    { medIdx: 5, batchNo: 'ATV-26-02', mfg: '2026-02-10', exp: '2027-10-10', pPrice: '10.80', sPrice: '18.75', qty: 45, avail: 45, supId: supplier1.id, status: 'ACTIVE' },

    // Amlodipine: safe
    { medIdx: 6, batchNo: 'AML-26-11', mfg: '2026-01-20', exp: '2028-01-15', pPrice: '4.80', sPrice: '9.20', qty: 40, avail: 40, supId: supplier2.id, status: 'ACTIVE' },

    // Metoprolol: low stock (5 available, min stock 15)
    { medIdx: 7, batchNo: 'MTP-25-03', mfg: '2025-06-15', exp: '2027-06-15', pPrice: '9.00', sPrice: '16.40', qty: 5, avail: 5, supId: supplier3.id, status: 'ACTIVE' },

    // Cetirizine: safe
    { medIdx: 8, batchNo: 'CTZ-26-01', mfg: '2026-02-01', exp: '2028-02-01', pPrice: '3.10', sPrice: '6.50', qty: 80, avail: 80, supId: supplier2.id, status: 'ACTIVE' },

    // Salbutamol: safe
    { medIdx: 9, batchNo: 'SBT-26-99', mfg: '2026-04-10', exp: '2028-04-10', pPrice: '19.00', sPrice: '35.00', qty: 25, avail: 25, supId: supplier1.id, status: 'ACTIVE' },

    // Dextromethorphan: safe
    { medIdx: 10, batchNo: 'DXM-26-12', mfg: '2026-01-05', exp: '2027-08-25', pPrice: '6.20', sPrice: '11.80', qty: 30, avail: 30, supId: supplier3.id, status: 'ACTIVE' },

    // Omeprazole: safe
    { medIdx: 11, batchNo: 'OMP-26-04', mfg: '2026-03-12', exp: '2028-03-12', pPrice: '6.00', sPrice: '12.00', qty: 50, avail: 50, supId: supplier2.id, status: 'ACTIVE' },

    // Pantoprazole: safe
    { medIdx: 12, batchNo: 'PNT-26-01', mfg: '2026-02-28', exp: '2027-12-31', pPrice: '8.00', sPrice: '15.50', qty: 40, avail: 40, supId: supplier1.id, status: 'ACTIVE' },

    // Metformin: safe
    { medIdx: 13, batchNo: 'MTF-26-88', mfg: '2026-01-11', exp: '2028-01-11', pPrice: '3.80', sPrice: '7.80', qty: 95, avail: 95, supId: supplier2.id, status: 'ACTIVE' },

    // Insulin Glargine: low stock (4 available, min stock 8)
    { medIdx: 14, batchNo: 'INS-26-GL', mfg: '2026-05-01', exp: '2027-05-01', pPrice: '42.00', sPrice: '68.00', qty: 4, avail: 4, supId: supplier3.id, status: 'ACTIVE' },

    // Hydrocortisone: safe
    { medIdx: 15, batchNo: 'HYD-26-02', mfg: '2026-02-15', exp: '2027-11-15', pPrice: '4.20', sPrice: '8.90', qty: 35, avail: 35, supId: supplier2.id, status: 'ACTIVE' },

    // Mupirocin: safe
    { medIdx: 16, batchNo: 'MUP-26-01', mfg: '2026-03-20', exp: '2027-09-20', pPrice: '11.00', sPrice: '19.50', qty: 22, avail: 22, supId: supplier1.id, status: 'ACTIVE' },

    // Ciprofloxacin: safe
    { medIdx: 17, batchNo: 'CIP-26-05', mfg: '2026-01-25', exp: '2027-07-25', pPrice: '7.50', sPrice: '14.00', qty: 28, avail: 28, supId: supplier1.id, status: 'ACTIVE' },

    // Vitamin D3: safe
    { medIdx: 18, batchNo: 'VD3-26-77', mfg: '2026-02-10', exp: '2028-02-10', pPrice: '2.50', sPrice: '5.50', qty: 75, avail: 75, supId: supplier2.id, status: 'ACTIVE' },

    // Centrum: safe
    { medIdx: 19, batchNo: 'CTR-26-09', mfg: '2026-03-01', exp: '2028-03-01', pPrice: '8.80', sPrice: '16.00', qty: 50, avail: 50, supId: supplier3.id, status: 'ACTIVE' },

    // Clonazepam: safe
    { medIdx: 20, batchNo: 'CLZ-26-03', mfg: '2026-02-14', exp: '2028-02-14', pPrice: '10.50', sPrice: '21.00', qty: 18, avail: 18, supId: supplier3.id, status: 'ACTIVE' },

    // Ceftriaxone: safe
    { medIdx: 21, batchNo: 'CEF-26-01', mfg: '2026-04-05', exp: '2027-10-05', pPrice: '17.00', sPrice: '32.50', qty: 20, avail: 20, supId: supplier1.id, status: 'ACTIVE' },
  ];

  const createdBatches: any[] = [];
  for (const b of batchDefinitions) {
    const med = createdMedicines[b.medIdx];
    const [batchRecord] = await db.insert(batches).values({
      medicineId: med.id,
      supplierId: b.supId,
      batchNumber: b.batchNo,
      manufacturingDate: b.mfg,
      expiryDate: b.exp,
      purchasePrice: b.pPrice,
      sellingPrice: b.sPrice,
      quantity: b.qty,
      availableQuantity: b.avail,
      status: b.status,
    }).returning();
    createdBatches.push(batchRecord);

    // Initial stock movement
    await db.insert(stockMovements).values({
      medicineId: med.id,
      batchId: batchRecord.id,
      type: 'STOCK_IN',
      quantity: b.qty,
      reason: 'Initial Inventory Stocking',
      reference: `INIT-BATCH-${b.batchNo}`,
      userId: adminUser.id,
    });
  }

  // Sample Prescriptions (Approved, Pending, Completed)
  // Prescription 1: Approved prescription for John Miller
  const [rx1] = await db.insert(prescriptions).values({
    prescriptionNumber: 'RX-2026-0001',
    customerId: createdCustomers[0].id,
    doctorName: 'Dr. Gregory House, M.D.',
    prescriptionDate: '2026-09-28',
    notes: 'Patient exhibits signs of severe acute bacterial infection. Prescribing Amoxicillin.',
    status: 'APPROVED',
    pharmacistId: pharm1.id,
  }).returning();

  await db.insert(prescriptionItems).values([
    {
      prescriptionId: rx1.id,
      medicineId: createdMedicines[0].id, // Amoxicillin
      quantity: 10,
      dosage: '500mg',
      frequency: 'TID (Three times daily)',
      duration: '7 days',
      instructions: 'Take after meals with plenty of water.',
    },
  ]);

  // Prescription 2: Pending prescription for Elena Rostova
  const [rx2] = await db.insert(prescriptions).values({
    prescriptionNumber: 'RX-2026-0002',
    customerId: createdCustomers[1].id,
    doctorName: 'Dr. Allison Cameron, M.D.',
    prescriptionDate: '2026-09-30',
    notes: 'Maintenance blood pressure therapy and cholesterol control.',
    status: 'PENDING',
  }).returning();

  await db.insert(prescriptionItems).values([
    {
      prescriptionId: rx2.id,
      medicineId: createdMedicines[5].id, // Atorvastatin
      quantity: 30,
      dosage: '20mg',
      frequency: 'Once daily at bedtime',
      duration: '30 days',
      instructions: 'Avoid grapefruit consumption during course.',
    },
    {
      prescriptionId: rx2.id,
      medicineId: createdMedicines[6].id, // Amlodipine
      quantity: 30,
      dosage: '5mg',
      frequency: 'Once daily in morning',
      duration: '30 days',
      instructions: 'Monitor blood pressure weekly.',
    },
  ]);

  // Prescription 3: Completed prescription for David Chen
  const [rx3] = await db.insert(prescriptions).values({
    prescriptionNumber: 'RX-2026-0003',
    customerId: createdCustomers[2].id,
    doctorName: 'Dr. Eric Foreman, M.D.',
    prescriptionDate: '2026-09-20',
    notes: 'Post-op pain management and anti-inflammatory support.',
    status: 'COMPLETED',
    pharmacistId: pharm2.id,
  }).returning();

  await db.insert(prescriptionItems).values([
    {
      prescriptionId: rx3.id,
      medicineId: createdMedicines[4].id, // Tramadol
      quantity: 10,
      dosage: '50mg',
      frequency: 'As needed every 8 hours',
      duration: '3 days',
      instructions: 'Do not drive or operate heavy machinery.',
    },
  ]);

  // Sample Completed Sales and Invoices
  // Sale 1: Dispensed prescription RX3 to David Chen
  const [sale1] = await db.insert(sales).values({
    invoiceNumber: 'INV-2026-1001',
    customerId: createdCustomers[2].id,
    pharmacistId: pharm2.id,
    prescriptionId: rx3.id,
    subtotal: '280.00',
    tax: '14.00',
    discount: '0.00',
    grandTotal: '294.00',
    paymentMethod: 'CARD',
    status: 'COMPLETED',
    notes: 'Prescription filled and paid via Visa credit card.',
  }).returning();

  await db.insert(saleItems).values([
    {
      saleId: sale1.id,
      medicineId: createdMedicines[4].id, // Tramadol
      batchId: createdBatches[5].id, // TRM-26-01
      quantity: 10,
      unitPrice: '28.00',
      subtotal: '280.00',
    },
  ]);

  // Record stock movement for Sale 1
  await db.insert(stockMovements).values({
    medicineId: createdMedicines[4].id,
    batchId: createdBatches[5].id,
    type: 'SALE',
    quantity: 10,
    reason: 'Customer Purchase INV-2026-1001',
    reference: 'INV-2026-1001',
    userId: pharm2User.id,
  });

  // Sale 2: Over-the-counter wellness sale to John Miller
  const [sale2] = await db.insert(sales).values({
    invoiceNumber: 'INV-2026-1002',
    customerId: createdCustomers[0].id,
    pharmacistId: pharm1.id,
    subtotal: '38.50',
    tax: '1.92',
    discount: '2.00',
    grandTotal: '38.42',
    paymentMethod: 'CASH',
    status: 'COMPLETED',
    notes: 'OTC multivitamins and headache relief tablets.',
  }).returning();

  await db.insert(saleItems).values([
    {
      saleId: sale2.id,
      medicineId: createdMedicines[2].id, // Paracetamol
      batchId: createdBatches[3].id, // PCM-2026-FEFO1
      quantity: 2,
      unitPrice: '4.25',
      subtotal: '8.50',
    },
    {
      saleId: sale2.id,
      medicineId: createdMedicines[19].id, // Centrum Complete
      batchId: createdBatches[18].id, // CTR-26-09
      quantity: 1,
      unitPrice: '16.00',
      subtotal: '16.00',
    },
    {
      saleId: sale2.id,
      medicineId: createdMedicines[3].id, // Ibuprofen
      batchId: createdBatches[4].id, // IBU-26-004
      quantity: 1,
      unitPrice: '8.50',
      subtotal: '8.50',
    },
    {
      saleId: sale2.id,
      medicineId: createdMedicines[18].id, // Vit D3
      batchId: createdBatches[17].id, // VD3-26-77
      quantity: 1,
      unitPrice: '5.50',
      subtotal: '5.50',
    },
  ]);

  // Sample Purchase Supply Records
  const [po1] = await db.insert(purchases).values({
    purchaseOrderNumber: 'PO-2026-0501',
    supplierId: supplier1.id,
    totalAmount: '1240.00',
    status: 'RECEIVED',
    notes: 'Antibiotics and respiratory restocking batch order.',
  }).returning();

  await db.insert(purchaseItems).values([
    {
      purchaseId: po1.id,
      medicineId: createdMedicines[0].id,
      batchNumber: 'AMX-2026-02',
      manufacturingDate: '2026-04-01',
      expiryDate: '2027-04-15',
      quantity: 50,
      purchasePrice: '8.20',
      sellingPrice: '14.50',
      batchId: createdBatches[1].id,
    },
    {
      purchaseId: po1.id,
      medicineId: createdMedicines[9].id,
      batchNumber: 'SBT-26-99',
      manufacturingDate: '2026-04-10',
      expiryDate: '2028-04-10',
      quantity: 25,
      purchasePrice: '19.00',
      sellingPrice: '35.00',
      batchId: createdBatches[9].id,
    },
  ]);

  // Notifications
  await db.insert(notifications).values([
    {
      type: 'LOW_STOCK',
      title: 'Low Stock Alert: Insulin Glargine',
      message: 'Insulin Glargine 100 U/ml has only 4 units remaining (Minimum threshold: 8 units).',
      medicineId: createdMedicines[14].id,
      batchId: createdBatches[13].id,
    },
    {
      type: 'LOW_STOCK',
      title: 'Low Stock Alert: Metoprolol Succinate',
      message: 'Metoprolol Succinate 50mg has only 5 units remaining (Minimum threshold: 15 units).',
      medicineId: createdMedicines[7].id,
      batchId: createdBatches[7].id,
    },
    {
      type: 'EXPIRING_SOON',
      title: 'Expiring Soon: Paracetamol Batch PCM-2026-FEFO1',
      message: 'Batch PCM-2026-FEFO1 expires on 2026-10-06 (Within 7 days). FEFO will prioritize dispensing.',
      medicineId: createdMedicines[2].id,
      batchId: createdBatches[3].id,
    },
    {
      type: 'EXPIRED',
      title: 'Expired Stock: Paracetamol Batch PCM-2024-EXP',
      message: 'Batch PCM-2024-EXP expired on 2026-08-15 and has been locked from sales.',
      medicineId: createdMedicines[2].id,
      batchId: createdBatches[2].id,
    },
    {
      type: 'PENDING_PRESCRIPTION',
      title: 'Prescription Pending Review',
      message: 'RX-2026-0002 for Elena Rostova requires pharmacist review and approval.',
    },
  ]);

  // Audit Logs
  await db.insert(auditLogs).values([
    {
      userId: adminUser.id,
      userEmail: adminUser.email,
      action: 'SYSTEM_INITIALIZATION',
      details: 'Database seeded with default accounts, medicine catalog, and batches.',
      ipAddress: '127.0.0.1',
      result: 'SUCCESS',
    },
    {
      userId: pharm1User.id,
      userEmail: pharm1User.email,
      action: 'PRESCRIPTION_APPROVAL',
      details: 'Approved prescription RX-2026-0001 for Johnathan Miller.',
      ipAddress: '127.0.0.1',
      result: 'SUCCESS',
    },
    {
      userId: pharm2User.id,
      userEmail: pharm2User.email,
      action: 'SALE_CREATION',
      details: 'Completed sale INV-2026-1001 for David Chen ($294.00).',
      ipAddress: '127.0.0.1',
      result: 'SUCCESS',
    },
  ]);

  console.log('Database seeding successfully completed!');
}

if (process.argv[1] && process.argv[1].includes('seed.ts')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
