import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/product.controller';

const router = Router();

/**
 * @route   GET /api/products
 * @desc    Get all products with optional filters
 * @query   category, search, outlet_id
 * @access  Public
 */
router.get('/', getProducts);

/**
 * @route   GET /api/products/:id
 * @desc    Get product by ID with variants and modifiers
 * @access  Public
 */
router.get('/:id', getProductById);

/**
 * @route   POST /api/products
 * @desc    Create new product
 * @access  Protected (Admin/Manager)
 */
router.post('/', createProduct);

/**
 * @route   PUT /api/products/:id
 * @desc    Update product
 * @access  Protected (Admin/Manager)
 */
router.put('/:id', updateProduct);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete product (soft delete)
 * @access  Protected (Admin)
 */
router.delete('/:id', deleteProduct);

export default router;
