# 🌱 Smart Farm System – Full-Stack Farm Management Platform

A modern, full-stack Smart Farm Management System developed as a **university group project**, designed to centralize and optimize farm operations including livestock, crops, workforce, finance, and e-commerce.

Built with **React + Vite**, **Node.js/Express**, **MongoDB**, **Tailwind**, **Stripe**, **Cloudinary**, and **Google OAuth**, the system demonstrates real-world full‑stack engineering with secure authentication, automated payroll, PDF invoicing, and integrated online product sales.

---

## 🚀 Live Demo

👉 **[https://smart-farm-system-deployed-frontend.onrender.com](https://smart-farm-system-deployed-frontend.onrender.com)**

---

## 🛠️ Tech Stack

### **Frontend**

- React (Vite)
- React Query
- Radix UI
- Tailwind CSS
- Axios
- React Router
- JWT Authentication + Google OAuth

### **Backend**

- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- Cloudinary (media uploads)
- Stripe (checkout + webhooks)
- Nodemailer (SMTP emails)
- PDFKit (invoice PDF generation)

### **DevOps / Tools**

- Render (deployment)

---

## 🌾 Key Features

### 🐄 Livestock Management

- Cow registry with breed, date of birth, identification
- Milk production logs
- Health & disease tracking
- Breeding workflows

### 🌱 Crop Management

- Field registry & seasonal plans
- Input & fertilizer tracking
- Activity logs and application timelines

### 👨‍🌾 Workforce Management

- Employee profiles
- Attendance tracking
- Leave requests
- Task assignments & performance reviews

### 💵 Finance & Payroll

- Payroll settings & payouts
- Allowances, deductions, tax configurations
- Automated PDF invoice/tax report generation
- Internal transaction history

### 🛒 E-Commerce

- Product listings
- Inventory & discount management
- Stripe checkout
- Webhook‑verified orders

### 📊 Additional Modules

- Contact forms
- Internal chat
- Audit logs
- Report exports (PDF/CSV)

---

## 📁 Project Structure

```
smart-farm-system/
│
├── backend/        # REST API (Express + MongoDB)
│   ├── models/
│   ├── controllers/
│   ├── routes/
│   ├── utils/
│   ├── config/
│   └── uploads/
│
└── frontend/       # React + Vite application
    ├── src/
    ├── components/
    ├── pages/
    ├── hooks/
    └── lib/
```

---

## ⚙️ Prerequisites

- Node.js 18+
- npm
- MongoDB (local or hosted)
- Stripe account
- Cloudinary account

---

## 🚀 Getting Started

### 1️⃣ Clone the Project

```bash
git clone <repo-url>
```

### 2️⃣ Install Dependencies

```bash
npm install --prefix backend
npm install --prefix frontend
```

---

## 🔧 Backend Setup

### Create `backend/.env`

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

### Start Backend

```bash
cd backend
npm run dev
```

### Optional: Stripe Webhooks

```bash
npm run stripe:listen
```

---

## 🌐 Frontend Setup

### Create `frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:5001/api
```

### Start Frontend

```bash
cd frontend
npm run dev
```

---

## 🧪 Testing & Quality

### Backend Tests

```bash
cd backend && npm test
```

### Frontend Tests

```bash
cd frontend && npm test
```

### Linting (Frontend)

```bash
npm run lint
```

---

## 📦 Production Build

### Build Frontend

```bash
cd frontend
npm run build
```

### Start Backend with PM2

```bash
pm2 start backend/server.js
```

### Set Production API URL

In `frontend/.env`:

```env
VITE_API_BASE_URL=https://your-backend-domain/api
```

---

## 🎓 Why This Project? (University Group Project)

This Smart Farm System was built as a **university group project** to address real agricultural management challenges:

- Centralizing livestock and crop data
- Reducing manual paperwork
- Automating payroll and financial records
- Supporting modern e-commerce for farm products
- Improving communication and operational transparency

It demonstrates full‑stack engineering skills including authentication, data modeling, real-time state management, secure payments, cloud integrations, and PDF generation.

---

## 🧑‍🤝‍🧑 Contributors (Group Project)

- Savindu Weerarathna -
- Wathsika Pallimulla - https://www.linkedin.com/in/wathsika-pallimulla-266242344/
- Wishwa Dilshan -
- Supun Anjana -
- Dulmi Kalupahana -
