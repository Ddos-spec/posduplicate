import { Router } from 'express';
import {
  getOwnerForecast,
  getRetailForecast,
  getDistributorForecast,
  getProdusenForecast,
  getForecastData
} from '../controllers/accounting.forecast.controller';

const router = Router();

// Owner comprehensive forecast
/**
 * @swagger
 * /api/accounting/forecast/owner:
 *   get:
 *     tags: [Accounting]
 *     summary: Get owner forecast
 *     responses:
 *       200:
 *         description: Owner forecast data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/owner', getOwnerForecast);

// Role-specific forecasts
/**
 * @swagger
 * /api/accounting/forecast/retail:
 *   get:
 *     tags: [Accounting]
 *     summary: Get retail forecast
 *     responses:
 *       200:
 *         description: Retail forecast data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/retail', getRetailForecast);
/**
 * @swagger
 * /api/accounting/forecast/distributor:
 *   get:
 *     tags: [Accounting]
 *     summary: Get distributor forecast
 *     responses:
 *       200:
 *         description: Distributor forecast data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/distributor', getDistributorForecast);
/**
 * @swagger
 * /api/accounting/forecast/produsen:
 *   get:
 *     tags: [Accounting]
 *     summary: Get produsen forecast
 *     responses:
 *       200:
 *         description: Produsen forecast data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/produsen', getProdusenForecast);

// Raw forecast data (for custom charts)
/**
 * @swagger
 * /api/accounting/forecast/data:
 *   get:
 *     tags: [Accounting]
 *     summary: Get forecast data
 *     responses:
 *       200:
 *         description: Forecast data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/data', getForecastData);

export default router;
