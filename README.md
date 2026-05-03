# ServEase

ServEase is a full-stack home services booking platform built with Angular, Node.js, and MySQL. It supports customers, providers, and administrators through role-based dashboards and live database-backed workflows for service browsing, booking, availability management, payments, and reviews.

## Features

- Browse services from approved providers
- View service details, provider information, reviews, and available slots
- Customer registration, login, booking, cancellation, review submission, and profile management
- Provider registration, service creation/editing, service-specific slot management, booking status updates, and profile management
- Admin approval, suspension, and reinstatement of providers
- JWT-based authentication and role-based dashboard access
- Live MySQL-backed data for public pages and dashboards

## Tech Stack

- Frontend: Angular 17, HTML, CSS, TypeScript
- Backend: Node.js
- Database: MySQL 8
- Authentication: JWT
- Password Security: PBKDF2 via Node.js `crypto`

## Project Structure

```text
ServEase/
|-- backend/
|   |-- config/
|   |-- lib/
|   |-- middleware/
|   |-- routes/
|   `-- server.js
|-- database/
|   `-- schema.sql
|-- frontend/
|   |-- src/
|   |   `-- app/
|   |       |-- pages/
|   |       |-- services/
|   |       `-- shared/
|   |-- angular.json
|   |-- package.json
|   `-- proxy.conf.json
|-- .gitignore
|-- package-lock.json
`-- README.md
```

## Backend Modules

- `backend/server.js`: starts the server, serves the frontend build, and registers API routes
- `backend/config/database.js`: MySQL connection setup
- `backend/lib/auth.js`: JWT helpers
- `backend/lib/http.js`: JSON responses, request parsing, and error handling
- `backend/lib/passwords.js`: password hashing and verification
- `backend/lib/router.js`: lightweight custom router
- `backend/routes/public.js`: public services, categories, locations, and provider info
- `backend/routes/auth.js`: login, register, reset password, change password
- `backend/routes/booking.js`: bookings, payments, cancellation, and reviews
- `backend/routes/customer.js`: customer dashboard and profile
- `backend/routes/provider.js`: provider dashboard, services, slots, and profile
- `backend/routes/admin.js`: admin dashboard and provider management

## Main User Flows

### Customer
- register and log in
- browse services
- open service details
- select a service-specific available slot
- create a booking
- pay by cash, card, or UPI
- manage bookings and submit reviews

### Provider
- register and log in
- manage services
- add/edit/delete service-specific availability slots
- confirm, complete, or cancel bookings
- update profile details

### Admin
- log in
- monitor platform activity
- approve, suspend, or reinstate providers

## Setup

### 1. Install dependencies

From the project root:

```powershell
npm install
Set-Location frontend
npm install
Set-Location ..
```

### 2. Configure environment

Create a `.env` file in the project root with values like:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD="your password"
DB_NAME=serveease
PORT=3000
JWT_SECRET=serveease_super_secret_change_in_production
JWT_EXPIRES_IN=7d
```

### 3. Load the database schema

```powershell
Get-Content .\database\schema.sql | mysql -u serveease_user -p serveease
```

If your MySQL account is different, update the command accordingly.

### 4. Run the app

Backend:

```powershell
npm run dev
```

Frontend:

```powershell
Set-Location frontend
npm start
```

Open:

- Frontend dev server: [http://localhost:4200](http://localhost:4200)
- Backend server: [http://localhost:3000](http://localhost:3000)

## Seeded Test Accounts

All seeded accounts use the same password:

```text
ServeEase@123
```

### Admin
- `admin@serveease.com`

### Customers
- `priya@example.com`
- `rahul@example.com`

### Providers
- `ravi@example.com`
- `ananya@example.com`
- `cleannest@example.com`

Notes:
- `cleannest@example.com` is seeded as a pending provider
- approved providers can be tested immediately from the provider dashboard

## Main Routes

- `/`
- `/login`
- `/register`
- `/reset-password`
- `/services`
- `/services/:id`
- `/provider/:id`
- `/booking`
- `/customer-dashboard`
- `/provider-dashboard`
- `/admin-dashboard`

## API Overview

- `/api/public/*`
- `/api/auth/*`
- `/api/bookings/*`
- `/api/customers/*`
- `/api/providers/*`
- `/api/admin/*`

## Current Highlights

- service-specific availability slots are supported
- provider service editing is supported
- cash booking flow works without mandatory online payment
- booking flow is connected to live backend and MySQL data

## Notes

- This repo is intended to contain source code only
- Generated folders like `frontend/node_modules`, `frontend/dist`, and `frontend/.angular` should not be committed
- Add screenshots later if you want the GitHub page to look even stronger
