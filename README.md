# Earth & Harvest - Ecommerce Backend

A complete ecommerce backend for a dog food product company built with Node.js, Express, and MongoDB.

## Features

- 🔐 **OTP-based Authentication**: Users receive OTP via email when clicking "Buy" or "Add to Cart"
- 🛒 **Shopping Cart**: Full cart management with add, update, remove, and clear functionality
- 📦 **Order Management**: Complete order lifecycle from creation to delivery
- 💳 **Payment Integration**: Nomod API integration for secure payments
- 👨‍💼 **Admin Panel**: Complete admin dashboard for managing products, orders, users, and payments
- 🔒 **JWT Authentication**: Secure token-based authentication
- 📧 **Email Service**: Automated OTP delivery via email

## Tech Stack

- **Node.js** with Express.js
- **MongoDB** with Mongoose
- **JWT** for authentication
- **Nodemailer** for email services
- **Nomod API** for payment processing

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Earth-Harvest-Backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
PORT=5000
FRONTEND_URL=http://localhost:5173
MONGO_URI=mongodb://localhost:27017/earth-harvest
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=30d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
NOMOD_API_KEY=your-nomod-api-key
```

4. Start the server:
```bash
npm run dev
```

## Creating Admin User

To create an admin user, run:
```bash
node scripts/createAdmin.js <email> <name>
```

Example:
```bash
node scripts/createAdmin.js admin@earthharvest.com "Admin User"
```

**Note**: Admin users still need to login via OTP to get a JWT token.

## API Documentation

### Authentication Routes

#### Send OTP
```
POST /api/auth/send-otp
Body: { "email": "user@example.com", "name": "User Name" }
Response: { "success": true, "message": "OTP sent successfully to email" }
```

#### Verify OTP
```
POST /api/auth/verify-otp
Body: { "email": "user@example.com", "otp": "1234" }
Response: { "success": true, "token": "jwt-token", "user": {...} }
```

#### Get Profile (Protected)
```
GET /api/auth/profile
Headers: { "Authorization": "Bearer <token>" }
```

#### Update Profile (Protected)
```
PUT /api/auth/profile
Headers: { "Authorization": "Bearer <token>" }
Body: { "name": "New Name", "phoneNumber": "...", "address": {...} }
```

### Product Routes (Public)

#### Get All Products
```
GET /api/products?page=1&limit=20&search=keyword
```

#### Get Product by ID
```
GET /api/products/:id
```

#### Get Featured Products
```
GET /api/products/featured
```

### Cart Routes (Protected)

#### Add to Cart
```
POST /api/cart/add
Headers: { "Authorization": "Bearer <token>" }
Body: { "productId": "...", "size": "5kg", "quantity": 1 }
```

#### Get Cart
```
GET /api/cart
Headers: { "Authorization": "Bearer <token>" }
```

#### Update Cart Item
```
PUT /api/cart/update
Headers: { "Authorization": "Bearer <token>" }
Body: { "itemId": "...", "quantity": 2 }
```

#### Remove from Cart
```
DELETE /api/cart/item/:itemId
Headers: { "Authorization": "Bearer <token>" }
```

#### Clear Cart
```
DELETE /api/cart/clear
Headers: { "Authorization": "Bearer <token>" }
```

### Order Routes (Protected)

#### Create Order
```
POST /api/order/create
Headers: { "Authorization": "Bearer <token>" }
Body: {
  "productId": "...",
  "sizeSelected": "5kg",
  "quantity": 1,
  "address": {...},
  "amount": 100,
  "fromCart": false,
  "cartItemId": null
}
```

#### Get User Orders
```
GET /api/order?status=Pending&page=1&limit=20
Headers: { "Authorization": "Bearer <token>" }
```

#### Get Order by ID
```
GET /api/order/:id
Headers: { "Authorization": "Bearer <token>" }
```

#### Cancel Order
```
PUT /api/order/:id/cancel
Headers: { "Authorization": "Bearer <token>" }
```

### Payment Routes

#### Create Payment Link
```
POST /api/payment/create
Headers: { "Authorization": "Bearer <token>" }
Body: { "orderId": "...", "amount": 100 }
Response: { "success": true, "paymentUrl": "...", "paymentId": "..." }
```

#### Payment Callback (Webhook)
```
POST /api/payment/callback
Body: { "payment_id": "...", "status": "paid", "order_id": "...", "amount": 100 }
```

#### Get Payment Status
```
GET /api/payment/status/:orderId
Headers: { "Authorization": "Bearer <token>" }
```

### Admin Routes (Admin Only)

#### Dashboard Stats
```
GET /api/admin/dashboard
Headers: { "Authorization": "Bearer <admin-token>" }
```

#### Product Management
```
GET /api/admin/products
POST /api/admin/products
PUT /api/admin/products/:id
DELETE /api/admin/products/:id
```

#### Order Management
```
GET /api/admin/orders?status=Confirmed&page=1
PUT /api/admin/orders/:id/status
Body: { "orderStatus": "Shipped" }
```

#### User Management
```
GET /api/admin/users?role=user&page=1
PUT /api/admin/users/:id/role
Body: { "role": "admin" }
```

#### Payment Management
```
GET /api/admin/payments?status=Success&page=1
```

## Ecommerce Flow

1. **User clicks "Buy" or "Add to Cart"**
   - Frontend calls `POST /api/auth/send-otp` with email
   - OTP is sent to user's email

2. **User enters OTP**
   - Frontend calls `POST /api/auth/verify-otp`
   - User receives JWT token

3. **Add to Cart**
   - Frontend calls `POST /api/cart/add` with JWT token
   - Item is added to user's cart

4. **Create Order**
   - Frontend calls `POST /api/order/create` with order details
   - Order is created with "Pending" status

5. **Payment**
   - Frontend calls `POST /api/payment/create` with orderId
   - User is redirected to Nomod payment page
   - After payment, Nomod calls webhook `POST /api/payment/callback`
   - Order status is updated to "Confirmed"

6. **Order Management**
   - Admin can update order status via `PUT /api/admin/orders/:id/status`

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 5000) |
| `FRONTEND_URL` | Frontend URL for CORS | Yes |
| `MONGO_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
| `JWT_EXPIRES_IN` | JWT token expiration | No (default: 30d) |
| `SMTP_HOST` | SMTP server host | Yes |
| `SMTP_PORT` | SMTP server port | No (default: 587) |
| `SMTP_USER` | SMTP username/email | Yes |
| `SMTP_PASS` | SMTP password/app password | Yes |
| `NOMOD_API_KEY` | Nomod API key | Yes |

## Email Configuration

For Gmail:
1. Enable 2-Step Verification
2. Generate an App Password
3. Use the App Password as `SMTP_PASS`

For development, you can use:
- **Mailtrap**: For testing emails
- **Ethereal Email**: For quick testing

## Project Structure

```
├── config/
│   └── db.js              # MongoDB connection
├── controllers/
│   ├── admin.controller.js
│   ├── auth.controller.js
│   ├── cart.controller.js
│   ├── order.controller.js
│   ├── payment.controller.js
│   └── product.controller.js
├── middleware/
│   └── auth.js            # JWT authentication & admin check
├── models/
│   ├── cart.js
│   ├── order.js
│   ├── payment.js
│   ├── product.js
│   └── user.js
├── routes/
│   ├── adminRoutes.js
│   ├── authRoutes.js
│   ├── cartRoutes.js
│   ├── orderRoutes.js
│   ├── paymentRoutes.js
│   └── productRoutes.js
├── scripts/
│   └── createAdmin.js      # Script to create admin user
├── utils/
│   └── emailService.js     # Email service for OTP
├── server.js               # Main server file
└── package.json
```

## Security Features

- JWT token-based authentication
- Password-less OTP login
- Role-based access control (User/Admin)
- Protected routes with middleware
- Input validation
- Secure payment processing via Nomod

## License

ISC
