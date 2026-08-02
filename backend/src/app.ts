import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './shared/auth/auth.js';
import { healthRoutes } from './health/health.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { productsRoutes } from './modules/products/products.routes.js';
import { customersRoutes } from './modules/customers/customers.routes.js';
import { employeesRoutes } from './modules/employees/employees.routes.js';
import { driversRoutes } from './modules/drivers/drivers.routes.js';
import { vehiclesRoutes } from './modules/vehicles/vehicles.routes.js';
import { suppliersRoutes } from './modules/suppliers/suppliers.routes.js';
import { settingsRoutes } from './modules/settings/settings.routes.js';
import { ordersRoutes } from './modules/orders/orders.routes.js';
import { customerCreditRoutes } from './modules/customer-credit/customer-credit.routes.js';
import { measurementUnitsRoutes } from './modules/measurement-units/measurement-units.routes.js';
import { rawMaterialsRoutes } from './modules/raw-materials/raw-materials.routes.js';
import { finishedStockRoutes } from './modules/finished-stock/finished-stock.routes.js';
import { brokenProductsRoutes } from './modules/broken-products/broken-products.routes.js';
import { productionRoutes } from './modules/production/production.routes.js';
import { curingRoutes } from './modules/curing/curing.routes.js';
import { csrfRoutes } from './shared/middleware/csrf.routes.js';
import { errorHandler } from './shared/middleware/error-handler.js';
import { notFoundHandler } from './shared/middleware/not-found.js';
import { generalRateLimit } from './shared/middleware/rate-limit.js';
import { requestId } from './shared/middleware/request-id.js';
import { requestLogger } from './shared/middleware/request-logger.js';
import { corsMiddleware, securityHeaders } from './shared/middleware/security.js';

export const API_BASE_PATH = '/api/v1';
export const AUTH_BASE_PATH = '/api/auth';

/**
 * Creates the Express application.
 *
 * Middleware order matters here, in two ways.
 *
 * Request identity and logging come first so every later failure is traceable,
 * and the error handler comes last so everything funnels through it.
 *
 * More subtly, the Better Auth handler must be mounted **before**
 * `express.json()`. Better Auth reads the raw request body; parsing it first
 * makes its requests hang rather than fail, which is painful to diagnose.
 * Mounting it first means `express.json()` only ever sees Greenstone routes.
 *
 * The route pattern is `/api/auth/*splat` because this is Express 5. The
 * Express 4 form, `/api/auth/*`, does not match here.
 */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  // Required for correct client IPs and secure cookies behind a proxy.
  app.set('trust proxy', 1);

  app.use(requestId());
  app.use(requestLogger());

  app.use(securityHeaders());
  app.use(corsMiddleware());

  // Better Auth owns these endpoints, their formats, and their cookies.
  // Must stay above express.json().
  app.all(`${AUTH_BASE_PATH}/*splat`, toNodeHandler(auth));

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());

  app.use(generalRateLimit());

  app.use(`${API_BASE_PATH}/health`, healthRoutes());
  app.use(`${API_BASE_PATH}/csrf-token`, csrfRoutes());
  app.use(`${API_BASE_PATH}/users`, usersRoutes());
  app.use(`${API_BASE_PATH}/products`, productsRoutes());
  app.use(`${API_BASE_PATH}/products`, finishedStockRoutes());
  app.use(`${API_BASE_PATH}/customers`, customersRoutes());
  app.use(`${API_BASE_PATH}/customers`, customerCreditRoutes());
  app.use(`${API_BASE_PATH}/employees`, employeesRoutes());
  app.use(`${API_BASE_PATH}/drivers`, driversRoutes());
  app.use(`${API_BASE_PATH}/vehicles`, vehiclesRoutes());
  app.use(`${API_BASE_PATH}/suppliers`, suppliersRoutes());
  app.use(`${API_BASE_PATH}/settings`, settingsRoutes());
  app.use(`${API_BASE_PATH}/orders`, ordersRoutes());
  app.use(`${API_BASE_PATH}/measurement-units`, measurementUnitsRoutes());
  app.use(`${API_BASE_PATH}/raw-materials`, rawMaterialsRoutes());
  app.use(`${API_BASE_PATH}/broken-products`, brokenProductsRoutes());
  app.use(`${API_BASE_PATH}/production`, productionRoutes());
  app.use(`${API_BASE_PATH}/curing`, curingRoutes());

  app.use(notFoundHandler());
  app.use(errorHandler());

  return app;
}
