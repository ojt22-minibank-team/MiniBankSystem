const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 8004;
const INTERNAL_KEY = 'MMSPG-SEC-KEY-2026';

app.use(cors());
app.use(express.json());

// In-memory store for payment requests
const paymentStore = new Map([
  [
    'TEST-TOKEN-123',
    {
      merchantName: 'City Mart Online Store',
      orderId: 'ORD-2026-8801',
      amount: 15000.00,
      currency: 'MMK',
      status: 'INITIATED'
    }
  ],
  [
    'TEST-TOKEN-500',
    {
      merchantName: 'Shwe Mall Electronics',
      orderId: 'ORD-2026-9902',
      amount: 50000.00,
      currency: 'MMK',
      status: 'INITIATED'
    }
  ]
]);

// Middleware to verify Group 3 internal key
const verifyInternalKey = (req, res, next) => {
  const secretKey = req.header('X-Internal-Service-Key');
  if (secretKey !== INTERNAL_KEY) {
    console.warn(`[MockGateway] Unauthorized access attempt. Key received: ${secretKey}`);
    return res.status(401).json({ error: 'Unauthorized: Invalid internal secret key' });
  }
  next();
};

// 1. Fetch Payment Details endpoint (called by Group 1 Backend during checkout loading)
app.get('/api/v1/payments/checkout-info/:token', verifyInternalKey, (req, res) => {
  const { token } = req.params;
  console.log(`[MockGateway] GET /api/v1/payments/checkout-info/${token}`);

  let payment = paymentStore.get(token);
  if (!payment) {
    // Generate dynamically for any custom token provided during testing
    payment = {
      merchantName: 'Sample Merchant Ltd.',
      orderId: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
      amount: 25000.00,
      currency: 'MMK',
      status: 'INITIATED'
    };
    paymentStore.set(token, payment);
  }

  return res.json(payment);
});

// 2. Dispatch Authorization Outcome endpoint (called by Group 1 Backend upon PIN verification)
app.post('/api/v1/payments/authorize', verifyInternalKey, (req, res) => {
  const { paymentToken, status, sourceAccountNumber, errorCode, errorMessage } = req.body;
  console.log(`[MockGateway] POST /api/v1/payments/authorize:`, req.body);

  if (status === 'AUTHORIZED') {
    const txnRef = 'MMSPG-TXN-' + Date.now();
    return res.json({
      status: 'SUCCESS',
      transactionReference: txnRef,
      message: 'Payment authorized and settled successfully'
    });
  } else {
    return res.json({
      status: 'FAILED',
      failureReason: errorMessage || 'Authorization failed',
      errorCode: errorCode || 'TRANSACTION_FAILED'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'Group 3 Mock Gateway', port: PORT });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Mock Group 3 Payment Gateway running on port ${PORT}`);
  console.log(`👉 Health check: http://localhost:${PORT}/health`);
  console.log(`👉 Test Token: TEST-TOKEN-123 (Amount: 15,000 MMK)`);
  console.log(`=======================================================`);
});
