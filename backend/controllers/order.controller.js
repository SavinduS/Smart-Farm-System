import { deflateSync, inflateSync } from 'node:zlib';
import stripe from '../config/stripe.config.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Discount from '../models/Discount.js';
import Transaction from '../models/Transaction.js';
import orderEvents from '../events/orderEvents.js';
import { generateInvoicePdf } from '../utils/invoice.js';
import { sendOrderEmail } from '../utils/mailer.js';
import { getStartOfDay } from '../utils/dateUtils.js';
import { generateTransactionId } from '../utils/transactionId.js';
import { logAudit } from '../utils/auditLogger.js';

// --- Create Stripe Checkout Session ---
export const createCheckoutSession = async (req, res, next) => {
  try {
    const { cartItems, customerInfo, discountId } = req.body;
    if (!cartItems || cartItems.length === 0 || !customerInfo) {
      return res.status(400).json({ message: "Cart items and customer information are required." });
    }

    const productResults = await Promise.all(
      cartItems.map(async (item) => {
        const product = await Product.findById(item._id);
        if (!product) throw new Error(`Product not found: ${item.name}`);
        const rawQuantity = Number(item.quantity) || 1;
        const quantity = rawQuantity > 0 ? rawQuantity : 1;
        const unitPrice = Number(product.price) || 0;
        const displayName = product.name || item.name || '';
        return {
          product,
          quantity,
          unitPrice,
          displayName,
          lineItem: {
            price_data: {
              currency: 'lkr',
              product_data: { name: product.name, images: product.images || [] },
              unit_amount: Math.round(unitPrice * 100),
            },
            quantity,
          },
          
        };
      })
    );

    const line_items = productResults.map(({ lineItem }) => lineItem);
    const cartTotal = productResults.reduce((sum, { unitPrice, quantity }) => sum + unitPrice * quantity, 0);

    const metadataSource = productResults.map(({ product, quantity, unitPrice, displayName }) => ({
      id: product._id.toString(),
      quantity,
      priceCents: Math.round(unitPrice * 100),
      name: typeof displayName === 'string' ? displayName : '',
    }));

    const canEncodeIds = metadataSource.every(({ id }) => /^[0-9a-fA-F]{24}$/.test(id));
    const encodeId = (id) => {
      if (!canEncodeIds) return id;
      try {
        return Buffer.from(id, 'hex')
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
      } catch {
        return id;
      }
    };

    const metadataFull = metadataSource.map(({ id, quantity, priceCents, name }) => {
      const entry = [encodeId(id), quantity, priceCents];
      const trimmed = name ? name.slice(0, 60) : '';
      if (trimmed) entry.push(trimmed);
      return entry;
    });
    const metadataCompact = metadataFull.map((entry) => entry.slice(0, 3));
    const metadataMinimal = metadataFull.map((entry) => entry.slice(0, 2));

    const metadataFullStr = JSON.stringify(metadataFull);
    const metadataCompactStr = JSON.stringify(metadataCompact);
    const metadataMinimalStr = JSON.stringify(metadataMinimal);

    let cartItemsFormat = 'full';
    let cartItemsValue = metadataFullStr;

    const tryDeflate = (value) => {
      try {
        return deflateSync(value).toString('base64');
      } catch (error) {
        console.error('Failed to compress cart metadata:', error);
        return null;
      }
    };

    if (cartItemsValue.length > 500) {
      cartItemsFormat = 'compact';
      cartItemsValue = metadataCompactStr;

      if (cartItemsValue.length > 500) {
        const compactCompressed = tryDeflate(metadataCompactStr);
        if (compactCompressed && compactCompressed.length <= 500) {
          cartItemsFormat = 'compact-deflate';
          cartItemsValue = compactCompressed;
        } else {
          cartItemsFormat = 'minimal';
          cartItemsValue = metadataMinimalStr;

          if (cartItemsValue.length > 500) {
            const minimalCompressed = tryDeflate(metadataMinimalStr);
            if (minimalCompressed && minimalCompressed.length <= 500) {
              cartItemsFormat = 'minimal-deflate';
              cartItemsValue = minimalCompressed;
            } else {
              throw new Error('Unable to encode cart metadata within Stripe limits.');
            }
          }
        }
      }
    }

    const cartItemsIdEncoding = canEncodeIds ? 'b64' : 'raw';

    let coupon;
    let discountDetailsForMetadata = {};
    if (discountId) {
      const discount = await Discount.findById(discountId);
      if (discount && discount.isActive) {
        const now = new Date();
        const todayStart = getStartOfDay(now);
        if (now >= discount.startDate && discount.endDate >= todayStart && cartTotal >= discount.minPurchase) {
          if (discount.type === 'PERCENTAGE') {
            coupon = await stripe.coupons.create({ percent_off: discount.value, duration: 'once', name: discount.code });
          } else {
            const amountOffCents = Math.round(discount.value * 100);
            coupon = await stripe.coupons.create({ amount_off: amountOffCents, currency: 'lkr', duration: 'once', name: discount.code });
          }
         
    
        }
        discountDetailsForMetadata = {
          discountId: discount._id.toString(),
          discountCode: discount.code,
        };
      }
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      ...(coupon && { discounts: [{ coupon: coupon.id }] }),
      success_url: `${process.env.CLIENT_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/checkout`,
      customer_email: customerInfo.email,
      metadata: {
       cartItems: cartItemsValue,
        cartItemsFormat,
        cartItemsIdEncoding,
        cartItemsVersion: '2',
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        addressLine1: customerInfo.addressLine1,
        city: customerInfo.city,
        postalCode: customerInfo.postalCode,
        ...discountDetailsForMetadata,
      },
    });

    res.status(200).json({ id: session.id, url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    next(error);
  }
};

// --- Helper: Fulfill Order (Webhook) ---
const fulfillOrder = async (session) => {
  try {
    console.log(`Fulfilling order for session: ${session.id}`);
    const metadata = session.metadata || {};
    const defaultImage = 'https://via.placeholder.com/300x300.png?text=Product';

    const decodeCartItems = () => {
      const rawCartItems = metadata.cartItems;
      if (!rawCartItems) {
        console.warn('No cartItems found in metadata');
        return [];
      }

      const parseJsonSafely = (value) => {
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      };

      const decodeIdToken = (token, encoding) => {
        if (!token) return token;
        if (encoding === 'b64') {
          try {
            const normalized = token.replace(/-/g, '+').replace(/_/g, '/');
            const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
            return Buffer.from(padded, 'base64').toString('hex');
          } catch {
            return token;
          }
        }
        return token;
      };

      const idEncoding = metadata.cartItemsIdEncoding || metadata.cartIdEncoding || 'raw';
      let format = metadata.cartItemsFormat || 'legacy';
      let payload = typeof rawCartItems === 'string' ? rawCartItems : '';

      if (format.endsWith('-deflate') && payload) {
        try {
          payload = inflateSync(Buffer.from(payload, 'base64')).toString('utf8');
          format = format.replace('-deflate', '');
        } catch (error) {
          console.error('Failed to decompress cart metadata during fulfillment:', error);
          return [];
        }
      }

      let parsed = payload ? parseJsonSafely(payload) : null;
      if (!parsed && format === 'legacy' && typeof rawCartItems === 'string') {
        parsed = parseJsonSafely(rawCartItems);
      }

      if (!Array.isArray(parsed)) {
         console.warn('Decoded cartItems is not an array');
         return [];
      }

      if (parsed.every((entry) => Array.isArray(entry))) {
        return parsed.map((entry) => {
          const [encodedId, qty, priceCents, name] = entry;
          const numericQty = Number(qty) || 0;
          const safeQty = numericQty > 0 ? numericQty : 1;
          const numericPriceCents = priceCents !== undefined && priceCents !== null
            ? Number(priceCents)
            : undefined;
          return {
            productId: decodeIdToken(encodedId, idEncoding),
            qty: safeQty,
            metadataPriceCents: Number.isFinite(numericPriceCents) ? numericPriceCents : undefined,
            metadataName: typeof name === 'string' ? name : undefined,
          };
        });
      }

      if (parsed.every((entry) => entry && typeof entry === 'object')) {
        return parsed.map((entry) => {
          const numericQty = Number(entry.qty ?? entry.quantity ?? 0) || 0;
          const safeQty = numericQty > 0 ? numericQty : 1;
          const priceValue = entry.price !== undefined && entry.price !== null ? Number(entry.price) : undefined;
          return {
            productId: entry.productId || entry._id || entry.id,
            qty: safeQty,
            metadataPrice: Number.isFinite(priceValue) ? priceValue : undefined,
            metadataName: typeof entry.name === 'string' ? entry.name : undefined,
            metadataImage: typeof entry.image === 'string' ? entry.image : undefined,
          };
        });
      }

      return [];
    };

    const decodedCartItems = decodeCartItems();
    if (decodedCartItems.length === 0) {
      console.error('No cart items decoded for session:', session.id);
      // We might still want to proceed if we can recover items from Stripe line items, 
      // but for now let's log the error.
    }

    const totalQuantity = decodedCartItems.reduce((sum, item) => sum + (item.qty || 0), 0);
    const sessionTotalCents = typeof session.amount_subtotal === 'number'
      ? session.amount_subtotal
      : typeof session.amount_total === 'number'
        ? session.amount_total
        : 0;
    const averageUnitPrice = totalQuantity > 0 ? (sessionTotalCents / totalQuantity) / 100 : 0;

    const productCache = new Map();
    const orderItems = [];

    for (const item of decodedCartItems) {
      const productId = item.productId ? item.productId.toString() : undefined;
      
      if (!productId) {
        console.warn('Skipping item with missing productId in fulfillment');
        continue;
      }

      let productDoc = null;
      if (productCache.has(productId)) {
        productDoc = productCache.get(productId);
      } else {
        try {
          productDoc = await Product.findById(productId);
        } catch (error) {
          console.error(`Failed to load product ${productId} during fulfillment:`, error);
        }
        productCache.set(productId, productDoc || null);
      }

      const priceFromMetadata = item.metadataPriceCents !== undefined
        ? item.metadataPriceCents / 100
        : item.metadataPrice;

      const resolvedName = productDoc?.name || item.metadataName || 'Product unavailable';
      const resolvedPrice = productDoc?.price !== undefined && productDoc?.price !== null
        ? Number(productDoc.price)
        : (priceFromMetadata !== undefined ? priceFromMetadata : averageUnitPrice);
      const resolvedImage = productDoc?.images?.[0] || item.metadataImage || defaultImage;

      orderItems.push({
        product: productId,
        name: resolvedName,
        qty: item.qty,
        price: resolvedPrice,
        image: resolvedImage,
      });
    }

    if (orderItems.length === 0) {
        console.error('Order items array is empty after processing. Order might fail validation.');
    }

    const customer = {
      name: metadata.customerName || session.customer_details?.name || 'Customer',
      email: session.customer_details?.email || session.customer_email || metadata.customerEmail || 'unknown@example.com',
    };

    const shippingAddress = {
      addressLine1: metadata.addressLine1 || session.customer_details?.address?.line1 || 'N/A',
      city: metadata.city || session.customer_details?.address?.city || 'N/A',
      postalCode: metadata.postalCode || session.customer_details?.address?.postal_code || 'N/A',
      country: session.customer_details?.address?.country || 'Sri Lanka',
    };

    // Optional discount
    let discountInfo;
    if (metadata.discountId) {
      const discount = await Discount.findById(metadata.discountId);
      if (discount) {
        discountInfo = {
          discountId: discount._id,
          amount: (session.total_details?.amount_discount || 0) / 100,
          code: discount.code,
          type: discount.type,
        };
        if (typeof discount.timesUsed === 'number') {
          discount.timesUsed += 1;
          await discount.save();
        }
      }
    }

    const orderNumber = await Order.generateOrderNumber();

    const order = new Order({
      orderNumber,
      customer,
      orderItems,
      shippingAddress,
      ...(discountInfo && { discount: discountInfo }),
      totalPrice: session.amount_total / 100,
      isPaid: session.payment_status === 'paid',
      paidAt: new Date(),
      stripeSessionId: session.id,
      status: 'PROCESSING',
    });

    const createdOrder = await order.save();
    console.log(`Order ${createdOrder.orderNumber} successfully created.`);

    try {
      const transaction = await Transaction.create({
        type: 'INCOME',
        transaction_id: generateTransactionId(),
        amount: createdOrder.totalPrice,
        date: createdOrder.paidAt ?? createdOrder.createdAt ?? new Date(),
        category: 'Store Orders',
        description: `Order ${createdOrder.orderNumber} payment received`,
      });
      await logAudit({
        action: 'ADD',
        recordId: transaction._id,
        transactionId: transaction.transaction_id,
        user: createdOrder.customer?.email || 'system',
        newData: transaction.toObject(),
      });
      
    } catch (error) {
      console.error('Failed to log transaction for fulfilled order:', error);
    }
    
    try {
      // We generate the invoice PDF synchronously to ensure we have it, 
      // but send the email asynchronously so we don't block the webhook response.
      const invoiceBuffer = await generateInvoicePdf(createdOrder);
      
      // Fire and forget, or handle it in the background
      sendOrderEmail(createdOrder, invoiceBuffer).catch((err) => {
        console.error(`[Background] Email delivery failed for order ${createdOrder.orderNumber}:`, err.message);
      });
      
      console.log(`Invoice generated and email dispatch initiated for order: ${createdOrder.orderNumber}`);
    } catch (error) {
      console.error('Order invoice/email preparation failed:', error.message);
    }
    
    // Decrement stock
    for (const item of orderItems) {
      if (item.product) {
        await Product.findByIdAndUpdate(item.product, { $inc: { 'stock.qty': -item.qty } });
      }
    }

    return createdOrder;
  } catch (error) {
    console.error('Error fulfilling order:', error);
    throw error;
  }
};

// --- Stripe Webhook Handler ---
export const stripeWebhookHandler = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,                               // raw body
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    try {
      await fulfillOrder(session);
      return res.status(200).json({ received: true });
    } catch (error) {
      console.error('Failed to fulfill order:', error);
      return res.status(500).json({ message: 'Order fulfillment failed.' });
    }
  }

  res.status(200).json({ received: true });
};

// --- Admin: Get All Orders ---
export const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) { next(error); }
};

// --- Admin: Get Order by ID ---
export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found." });
    res.status(200).json(order);
  } catch (error) { next(error); }
};

// --- Admin: Update Status ---
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const valid = ['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!valid.includes(status)) return res.status(400).json({ message: "Invalid status provided." });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found." });

    if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
      for (const item of order.orderItems) {
        await Product.findByIdAndUpdate(item.product, { $inc: { 'stock.qty': item.qty } });
      }
    }

    const previousStatus = order.status;
    order.status = status;
    if (status === 'DELIVERED') order.deliveredAt = new Date();
    const updatedOrder = await order.save();

    if (previousStatus !== status) {
      orderEvents.emit('statusChange', {
        orderId: order._id.toString(),
        status: updatedOrder.status,
      });
    }
    res.status(200).json(updatedOrder);
  } catch (error) { next(error); }
};

// --- Public: Get Order by Stripe Session ID ---
export const getOrderBySessionId = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    let order = await Order.findOne({ stripeSessionId: sessionId });

    // Fallback: If order not found, check Stripe to see if session is completed
    if (!order) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === 'paid' || session.status === 'complete') {
        // Double check in case of race condition
        order = await Order.findOne({ stripeSessionId: sessionId });
        if (!order) {
          console.log(`Order for session ${sessionId} not found in DB. Fulfilling now (fallback).`);
          order = await fulfillOrder(session);
        }
      }
    }

    if (!order) return res.status(404).json({ message: "Order not found." });
    res.status(200).json(order);
  } catch (error) {
    console.error("Error in getOrderBySessionId:", error);
    next(error);
  }
};

// --- User: My Orders (auth) ---
export const getMyOrders = async (req, res, next) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ message: "User not authenticated." });
    }
    const orders = await Order.find({ 'customer.email': req.user.email }).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching user's orders:", error);
    next(error);
  }
};

// --- User: Cancel Order (auth) ---
export const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found." });

    if (!req.user || order.customer.email !== req.user.email) {
      return res.status(403).json({ message: "Not authorized to cancel this order." });
    }

    if (!['PENDING', 'PROCESSING'].includes(order.status)) {
      return res.status(400).json({ message: `Cannot cancel an order with status: ${order.status}.` });
    }

    // Refund on Stripe
    try {
        if (order.isPaid && order.stripeSessionId) {
        const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
        const paymentIntentId = session?.payment_intent;
        if (paymentIntentId) await stripe.refunds.create({ payment_intent: paymentIntentId });
      }
    } catch (refundError) {
      console.error('Stripe refund failed:', refundError);
      return res.status(500).json({ message: 'Failed to refund payment.' });
    }

    // Restock
    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(item.product, { $inc: { 'stock.qty': item.qty } });
    }

    order.status = 'CANCELLED';
    order.isPaid = false;
    order.paidAt = null;
    const updatedOrder = await order.save();
    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error("Error cancelling order:", error);
    next(error);
  }
};

// --- User: Review Order Item (auth) ---
export const addOrderItemReview = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { orderItemId, rating, comment } = req.body || {};

    if (!orderItemId) {
      return res.status(400).json({ message: 'Order item is required.' });
    }

    const numericRating = Number(rating);
    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: 'Rating must be a number between 1 and 5.' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    if (!req.user || order.customer.email !== req.user.email) {
      return res.status(403).json({ message: 'Not authorized to review this order.' });
    }

    if (order.status !== 'DELIVERED') {
      return res.status(400).json({ message: 'Reviews are only available for delivered orders.' });
    }

    const orderItem = order.orderItems.id(orderItemId);
    if (!orderItem) {
      return res.status(404).json({ message: 'Order item not found.' });
    }

    if (orderItem.review) {
      return res.status(400).json({ message: 'Review already exists for this item.' });
    }

    orderItem.review = {
      rating: numericRating,
      comment,
      createdAt: new Date(),
    };

    if (!order.deliveredAt) {
      order.deliveredAt = new Date();
    }

    const updatedOrder = await order.save();

    orderEvents.emit('reviewChange', {
      orderId: order._id.toString(),
      orderItemId: orderItem._id.toString(),
      review: orderItem.review,
    });

    res.status(200).json(updatedOrder);
  } catch (error) {
    next(error);
  }
};

export const updateOrderItemReview = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { orderItemId, rating, comment } = req.body || {};

    if (!orderItemId) {
      return res.status(400).json({ message: 'Order item is required.' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    if (!req.user || order.customer.email !== req.user.email) {
      return res.status(403).json({ message: 'Not authorized to review this order.' });
    }

    if (order.status !== 'DELIVERED') {
      return res.status(400).json({ message: 'Reviews are only available for delivered orders.' });
    }

    const orderItem = order.orderItems.id(orderItemId);
    if (!orderItem) {
      return res.status(404).json({ message: 'Order item not found.' });
    }

    if (!orderItem.review) {
      return res.status(400).json({ message: 'No existing review to update for this item.' });
    }

    if (typeof rating !== 'undefined') {
      const numericRating = Number(rating);
      if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({ message: 'Rating must be a number between 1 and 5.' });
      }
      orderItem.review.rating = numericRating;
    }

    if (typeof comment !== 'undefined') {
      orderItem.review.comment = comment;
    }

    orderItem.review.updatedAt = new Date();

    if (!order.deliveredAt) {
      order.deliveredAt = new Date();
    }

    const updatedOrder = await order.save();

    orderEvents.emit('reviewChange', {
      orderId: order._id.toString(),
      orderItemId: orderItem._id.toString(),
      review: orderItem.review,
    });

    res.status(200).json(updatedOrder);
  } catch (error) {
    next(error);
  }
};