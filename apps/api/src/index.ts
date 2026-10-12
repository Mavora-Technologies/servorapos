import dotenv from 'dotenv';
dotenv.config({ path: '.env' }); // <-- Load this FIRST

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import tenantRoutes from './routes/tenant.routes';
import authRoutes from './routes/auth.routes';
import menuRoutes from './routes/menu.routes';
import orderRoutes from './routes/order.routes';
import inventoryRoutes from './routes/inventory.routes';
import kitchenRoutes from './routes/kitchen.routes';
import tableRoutes from './routes/table.routes';
import reservationRoutes from './routes/reservation.routes';
import waitlistRoutes from './routes/waitlist.routes';
import deliveryRoutes from './routes/delivery.routes';


const app: Express = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'success', message: 'Servora API is running', timestamp: new Date().toISOString() });
});

// Mount modular API routes[cite: 2]
app.use('/api/v1/tenants', tenantRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/menu', menuRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/kitchen', kitchenRoutes);
app.use('/api/v1/tables', tableRoutes);
app.use('/api/v1/reservations', reservationRoutes);
app.use('/api/v1/waitlist', waitlistRoutes);
app.use('/api/v1/delivery', deliveryRoutes);

app.use((err: any, req: Request, res: Response, next: Function) => {
  console.error(err.stack);
  res.status(500).json({ status: 'error', message: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`[server]: Servora API is running at http://localhost:${port}`);
});