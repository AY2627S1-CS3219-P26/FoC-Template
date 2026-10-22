import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from "dotenv";

import { auth } from './middleware.ts/auth.ts';
import connectDB from './config/db.ts';
import accountRoute from './routes/accountRoute.ts';
import reservationRoute from './routes/reservationRoute.ts';
import transactionRoute from './routes/transactionRoute.ts';

dotenv.config();

connectDB();

const app: Express = express();
const port: number = 3002;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req: Request, res: Response) => {
    res.send('credit-service is running');
});

app.use('/account', auth, accountRoute);
app.use('/credits', auth, reservationRoute);
app.use('/transactions', auth, transactionRoute);

app.listen(port, () => {
    console.log("credit-service API is running at port: " + port.toString());
});
