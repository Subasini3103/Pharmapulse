# PharmaPulse – Pharmacy Management System (PMS)

An enterprise-grade, full-stack Pharmacy Management System connecting a React + Vite frontend, Express + TypeScript REST API backend, and relational PostgreSQL database via Drizzle ORM.

---

## 1. System Overview

PharmaPulse delivers complete pharmaceutical inventory tracking, clinical prescription validation, automated **First-Expire, First-Out (FEFO)** batch allocation, Point of Sale (POS) dispensing, supply chain purchase order procurement, and strict Role-Based Access Control (RBAC).

---

## 2. Technology Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS, Axios, React Router, Recharts, Lucide Icons
- **Backend**: Node.js / Express, TypeScript, JSON Web Tokens (JWT), Bcrypt password hashing
- **Database**: Relational PostgreSQL via Google Cloud SQL & Drizzle ORM
- **Security**: JWT Access (30m) & Refresh (7d) tokens, account lockout protection against brute force, parameterized SQL queries, security headers, role and object-level authorization

---

## 3. Architecture & Security Model

```
React Frontend (Vite)
       |
       | REST API / Axios + JWT Bearer Tokens
       ↓
Express Backend (/api/*)
       |
       | Drizzle ORM (Connection Pool)
       ↓
Cloud SQL (PostgreSQL Database)
```

### Role-Based Access Control (RBAC)
- **ADMIN**: Complete system access, user provisioning & RBAC elevation, medicine catalog management, supplier & customer management, reports, and security audit logs.
- **PHARMACIST**: Point of Sale (POS) dispensing, automated FEFO deduction, doctor prescription review/approval, inventory alerts, and billing.
- **SUPPLIER**: Restricted to own supplier profile, supplied pharmaceutical products, and purchase orders.
- **CUSTOMER**: Publicly registered accounts restricted to own personal health records, own prescriptions, purchase history, and invoices.

### Object-Level Authorization
Backend APIs verify row ownership to prevent unauthorized data access:
- Customer A cannot view or fetch Customer B's prescriptions, purchases, or invoices (returns `403 Forbidden`).
- Supplier A cannot view Supplier B's purchase orders or batch logs (returns `403 Forbidden`).

---

## 4. Default Credentials (Seeded in PostgreSQL)

| Role | Email | Password | Access Privileges |
|---|---|---|---|
| **Chief Admin** | `admin@pharmacy.com` | `Admin@123` | Full system access & RBAC user management |
| **Pharmacist** | `sarah.pharmacist@pharmacy.com` | `Pharmacist@123` | POS checkout, prescription approval & FEFO |
| **Pharmacist 2** | `marcus.pharmacist@pharmacy.com` | `Pharmacist@123` | Clinical dispensing workstation |
| **Supplier** | `orders@medisupply.com` | `Supplier@123` | Supplier logistics portal & purchase orders |
| **Customer** | `john.miller@example.com` | `Customer@123` | Patient portal, prescriptions & invoices |

*All passwords adhere to strict security rules: minimum 8 characters, uppercase, lowercase, numeric, and special character.*

---

## 5. Automated FEFO (First-Expire, First-Out) Logic

When dispensing medications at the Point of Sale:
1. Active batches for the requested medicine are queried where `expiry_date >= CURRENT_DATE` and `available_quantity > 0`.
2. Expired batches are excluded and locked from billing.
3. Batches are sorted ascending by expiration date (`ORDER BY expiry_date ASC`).
4. The system automatically depletes units from the earliest-expiring batch first. If required quantity exceeds the batch, it continues to the subsequent earliest-expiring batch.
5. All batch quantities are updated inside an atomic database transaction.
6. A corresponding `STOCK_OUT` / `SALE` stock movement entry is logged.

---

## 6. Key API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` – Public customer account creation (strictly defaults to `CUSTOMER` role)
- `POST /api/auth/login` – Secure login with failed attempt lockout protection (generic error messages)
- `POST /api/auth/refresh` – Issue new access token using refresh token
- `POST /api/auth/logout` – Audit log logout event
- `GET /api/auth/me` – Current user session and linked customer/supplier profile

### Medicines & Categories (`/api/medicines`, `/api/categories`)
- `GET /api/medicines` – Filter by category, supplier, prescription requirement, low stock
- `POST /api/medicines` – Admin/Pharmacist create medicine
- `PUT /api/medicines/:id` – Update medicine details
- `DELETE /api/medicines/:id` – Admin-only delete or discontinue
- `GET /api/categories` – List therapeutic classifications

### Point of Sale & Invoices (`/api/sales`, `/api/invoices`)
- `GET /api/sales` – List invoices (object-level filtered for customers)
- `POST /api/sales` – Execute POS dispensing with automated FEFO batch allocation
- `GET /api/sales/:id` – Fetch printable bill with batch details and tax breakdown

### Prescriptions (`/api/prescriptions`)
- `GET /api/prescriptions` – Prescriptions list (object-level filtered)
- `POST /api/prescriptions` – Submit prescription with medicine line items
- `POST /api/prescriptions/:id/approve` – Pharmacist/Admin approval
- `POST /api/prescriptions/:id/reject` – Rejection with clinical reason

### Inventory & Stock Movements (`/api/inventory`)
- `GET /api/inventory` – Current stock levels, minimum thresholds & restock needs
- `GET /api/inventory/low-stock` – Filtered low-stock alerts
- `GET /api/inventory/expiry` – Categorized expiry queue (expired, $\le$7d, $\le$30d, $\le$90d, safe)
- `POST /api/inventory/adjust` – Write-off damaged, expired, or returned stock with audit tracking

### Purchases (`/api/purchases`)
- `GET /api/purchases` – List supplier purchase orders
- `POST /api/purchases` – Procure stock, auto-create batches, and augment inventory

### Administration (`/api/admin`)
- `GET /api/admin/users` – User management table
- `POST /api/admin/users` – Admin provision user with specified role
- `PUT /api/admin/users/:id/status` – Activate, Deactivate, or Block accounts
- `PUT /api/admin/users/:id/role` – Change user RBAC role
- `GET /api/admin/audit-logs` – System security audit logs
