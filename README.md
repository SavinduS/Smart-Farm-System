# Smart Farm System

## Overview
Smart Farm System is a full-stack farm management platform that combines livestock tracking, crop planning, staff administration, payroll, and e-commerce into one dashboard. The backend is built with Node.js/Express and MongoDB, while the frontend is a React + Vite single-page application styled with Tailwind CSS.

### Highlights
- Livestock: cow registry, milk production, health records, and breeding workflows.
- Crop management: fields, inputs, plans, and application tracking for farm operations.
- Workforce: employee profiles, attendance, leave requests, tasks, and performance reviews.
- Finance: payroll settings, payouts, internal transactions, and automated invoice PDF generation.
- Commerce: product catalog, discounts, Stripe checkout + webhooks, and customer orders.
- Communications: contact forms, chat, audit logs, and report exports.

## Project Structure
- **backend/** – REST API (Express, MongoDB, Stripe, Cloudinary, Google OAuth, Nodemailer)
- **frontend/** – React client (Vite, React Query, Radix UI, Tailwind)

## Prerequisites
- Node.js 18+ and npm
- MongoDB instance (local or hosted)
- Stripe account + CLI (for local webhook testing)
- Cloudinary account (for media uploads)

## Getting Started
Clone the repository and install dependencies in each workspace:

```bash
npm install --prefix backend
npm install --prefix frontend
```

### Backend
1. Create `backend/.env` with the variables below.
2. Start MongoDB and run the API:
   ```bash
   cd backend
   npm run dev
   ```
3. (Optional) Forward Stripe webhooks locally:
   ```bash
   npm run stripe:listen
   ```

#### Backend Environment Variables
| Variable | Description |
| --- | --- |
| `PORT` | API port (default `5001`) |
| `CLIENT_URL` | Frontend origin allowed for CORS |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT signing (required) |
| `JWT_EXPIRES_IN` | JWT expiration (e.g., `7d`) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (enables Google login) |
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `SMTP_HOST` | SMTP server hostname (mailer) |
| `SMTP_PORT` | SMTP server port |
| `SMTP_SECURE` | `true` to force TLS, otherwise `false` |
| `SMTP_USER` | SMTP username (optional if server allows unauth) |
| `SMTP_PASS` | SMTP password (optional if server allows unauth) |
| `SMTP_FROM_EMAIL` | Default from email address |
| `SMTP_FROM_NAME` | Friendly sender name |
| `INVOICE_BRAND_NAME` | Label used on generated invoices |
| `INVOICE_BRAND_ADDRESS` | Invoice address block |
| `INVOICE_BRAND_EMAIL` | Contact email shown on invoices |
| `INVOICE_BRAND_PHONE` | Contact phone shown on invoices |
| `FARM_NAME` | Farm display name |
| `FARM_ADDRESS` | Farm address |
| `FARM_CONTACT` | Farm contact info |
| `NODE_ENV` | Optional Node environment flag |

Example `backend/.env`:
```env
PORT=5001
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb://127.0.0.1:27017/smart-farm
JWT_SECRET=super-secret
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
CLOUDINARY_CLOUD_NAME=demo
CLOUDINARY_API_KEY=123
CLOUDINARY_API_SECRET=abc
```

### Frontend
1. Create `frontend/.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:5001/api
   ```
2. Start the Vite dev server:
   ```bash
   cd frontend
   npm run dev
   ```

## Development Notes
- Uploaded media is served from `backend/uploads` at `/uploads/...`.
- Stripe webhooks are exposed at `/api/orders/webhook`, `/api/stripe/webhook`, and `/api/payment/webhook`.
- The backend expects JWT-authenticated requests for most resources; seed users accordingly before testing protected flows.

## Testing & Quality
- Backend tests: `cd backend && npm test`
- Frontend tests: `cd frontend && npm test`
- Frontend linting: `cd frontend && npm run lint`

## Production Build
- Build frontend assets: `cd frontend && npm run build`
- Serve the backend with a process manager (e.g., pm2) and configure environment variables as shown above. Ensure the frontend points to the deployed API base URL.
