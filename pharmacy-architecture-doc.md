# Pharmacy Management System - Technical Architecture & Documentation

This document provides a complete breakdown of the project's technology stack, why those specific technologies were chosen, and a detailed explanation of the application's flow based on the 4-member team split.

---

## Part 1: Technology Stack & Justifications (What & Why?)

To build a secure, fast, and scalable Pharmacy Management System, we chose a modern **React + Node.js + PostgreSQL** stack. Here is exactly why each tool is used:

### 1. Frontend (User Interface)
*   **React.js:** A JavaScript library for building user interfaces. 
    *   *Why use it?* React allows us to build Single Page Applications (SPAs). Instead of reloading the whole webpage every time you click a button, React only updates the specific part of the screen that changed. This makes the software feel incredibly fast, like a desktop app.
*   **Vite:** The build tool and development server.
    *   *Why use it?* Older tools (like Webpack) take minutes to start up. Vite starts the server in milliseconds and instantly reflects code changes in the browser.
*   **Tailwind CSS:** A utility-first CSS framework.
    *   *Why use it?* Instead of writing thousands of lines of custom CSS in separate files, Tailwind lets us style buttons, cards, and tables directly inside the HTML using classes like `bg-blue-500`. It speeds up UI development massively.

### 2. Backend (Server & API)
*   **Node.js & Express.js:** The backend server environment and framework.
    *   *Why use it?* Using Node.js means we can write the backend in the exact same language (JavaScript/TypeScript) as the frontend. Express.js is a minimal framework that makes it incredibly easy to create API endpoints (like `GET /api/sales`).

### 3. Database & ORM
*   **PostgreSQL:** An advanced, open-source relational database.
    *   *Why use it?* A pharmacy deals with inventory, money, and strict medical records. PostgreSQL guarantees **ACID compliance**, meaning if the server crashes in the middle of a sale, the database will never be left in a corrupted "half-saved" state.
*   **Drizzle ORM:** An Object-Relational Mapper.
    *   *Why use it?* Writing raw SQL queries (like `SELECT * FROM users`) can lead to typos and errors. Drizzle allows the backend developer to query the database using TypeScript code, which auto-completes and checks for errors *before* the code runs.

---

## Part 2: Project Workflow & Explanations (The 4-Member Split)

Here is how the entire application works from start to finish, explained through the specific domains of your 4 team members. 

Let's track a single action: **"A pharmacist clicks 'Complete Sale' on the screen."**

### Member 1: Frontend Developer (The Trigger)
*   **Where they work:** `src/components/` and `src/pages/`
*   **How it works:** The Frontend developer builds the UI using React. When the pharmacist clicks the "Complete Sale" button, a React function is triggered. This function gathers all the data from the screen (which medicines were selected, the customer ID, and the discount) and packages it into a standard JSON object.
*   **Handoff:** The frontend doesn't know how to talk to the database. It must hand this JSON data over to the Integrator's tools.

### Member 4: API Integrator (The Bridge)
*   **Where they work:** `src/services/api.ts`
*   **How it works:** This member manages **Axios** (a library used to make HTTP requests over the internet). 
    1.  The React component calls a function in `api.ts`.
    2.  Axios takes the JSON data and prepares an HTTP `POST` request.
    3.  **Security (JWT):** Axios reaches into the browser's Local Storage, grabs the user's secret "JWT Access Token" (proof that they are a logged-in pharmacist), and attaches it to the request Headers.
    4.  Axios fires the request across the network to the server URL (`http://localhost:3000/api/sales`).

### Member 2: Backend API Developer (The Brains)
*   **Where they work:** `server.ts`, `src/server/middleware.ts`, `src/server/routes/salesRoutes.ts`
*   **How it works:** 
    1.  **Receiving (server.ts):** Express.js receives the incoming HTTP request on port 3000. 
    2.  **Security (middleware.ts):** Before doing anything, Express runs the `requireAuth` middleware. This checks the JWT Token. If the token is fake or expired, it immediately kicks the request out with a `401 Unauthorized` error.
    3.  **Routing:** If the token is valid, Express looks at the URL (`/api/sales`) and hands the request to `salesRoutes.ts`.
    4.  **Logic:** The backend developer's code calculates the taxes, checks if the medicines require a prescription, and validates the data.

### Member 3: Database Engineer (The Memory)
*   **Where they work:** `src/db/schema.ts`, `src/db/index.ts`
*   **How it works:** 
    1.  The backend logic (Member 2) now asks the Database Engineer's Drizzle ORM setup to make the final changes.
    2.  **Transaction:** A strict `db.transaction` is opened. 
    3.  The database deducts the medicine quantities from the `batches` table, inserts a new receipt into the `sales` table, and logs the action in `stockMovements`. 
    4.  If *anything* goes wrong (e.g., stock runs out halfway through), the transaction rolls back, and nothing is saved. If it succeeds, the data is permanently written to PostgreSQL.

### The Return Trip (Server Sending to Client)
Once Member 3's database successfully saves the data, the process works in reverse:
1.  **Backend (Member 2)** uses `res.status(201).json({ success: true, data: newSale })` to send a success message back over the internet.
2.  **Integrator (Member 4)**'s Axios code receives this JSON response and tells the Frontend it was successful.
3.  **Frontend (Member 1)** sees the success response, shows a green "Sale Completed!" popup on the screen, and clears the shopping cart UI.

This separation of concerns ensures that no single person is overwhelmed, and the code remains highly organized and secure!
