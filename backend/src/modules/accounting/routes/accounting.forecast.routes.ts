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
router.get('/owner', getOwnerForecast);

// Role-specific forecasts
router.get('/retail', getRetailForecast);
router.get('/distributor', getDistributorForecast);
router.get('/produsen', getProdusenForecast);

// Raw forecast data (for custom charts)
router.get('/data', getForecastData);

export default router;
