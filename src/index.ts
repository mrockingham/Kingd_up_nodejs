import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes';
import orderRoutes from './routes/order.routes';
import adminRoutes from './routes/admin.routes';
import productRoutes from './routes/product.routes';
import cartRoutes from './routes/cart.routes';
import cartItemRoutes from './routes/cartItem.routes';
import checkoutRoutes from './routes/checkout.routes';

import { handleStripeWebhook } from './controllers/checkout.controller';
import printfulDebugRoutes from './routes/printfulDebug.routes';
import contactRoutes from './routes/contact.route';



(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
app.get('/', (req, res) => {
  res.send('Kingd_up Node API 🚀');
});

app.post(
  '/stripe-webhook', 
  express.raw({ type: 'application/json' }), 
  handleStripeWebhook
);

app.use(cors(
  {
    origin: 'https://kingd-up-apparel-git-main-michael-rockinghams-projects.vercel.app/',
    credentials: true,
  },
));
app.use(express.json());


app.get("/ping", (req, res) =>{
  res.send(  "pong" );

} )
app.use('/auth', authRoutes);
app.use('/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/products', productRoutes);
app.use('/cart', cartRoutes);
app.use('/cart/items', cartItemRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/debug/printful', printfulDebugRoutes);
app.use('/contact', contactRoutes);



app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

