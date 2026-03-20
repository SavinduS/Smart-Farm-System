import express from 'express';
import {
    getAllDiscounts,
    createDiscount,
    updateDiscount,
    deleteDiscount,
    getActiveDiscount,
    validateDiscount
} from '../controllers/discount.controller.js';
import { auth, requireRole } from '../middlewares/auth.js';

const router = express.Router();

router.use(express.json());

// Public or Customer-accessible
router.get('/active', getActiveDiscount);
router.post('/validate', validateDiscount);

// Admin/Employee only
router.get('/', auth, requireRole('Admin', 'Employee'), getAllDiscounts);
router.post('/', auth, requireRole('Admin', 'Employee'), createDiscount);
router.put('/:id', auth, requireRole('Admin', 'Employee'), updateDiscount);
router.delete('/:id', auth, requireRole('Admin', 'Employee'), deleteDiscount);

export default router;