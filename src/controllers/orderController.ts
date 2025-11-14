import { Request, Response } from "express";
import { OrderService } from "../services/orderService";
import { PaymentService } from "../services/paymentService";
import { AuthRequest } from "../middleware/auth";
import { validate as isUUID } from "uuid";

// ------------------ Create Order ------------------
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const userId: string = req.user.id;
    const { cartItems, shippingAddress, billingAddress, paymentMethod } =
      req.body;

    const order = await OrderService.createOrder(userId, cartItems);

    if (shippingAddress || billingAddress) {
      await order.update({ shippingAddress, billingAddress });
    }

    let payment;
    if (paymentMethod === "upi") {
      payment = await PaymentService.createUPIPayment(order.finalAmount, {
        orderId: order.id,
        userId,
      });
    } else {
      payment = await PaymentService.createPaymentIntent(order.finalAmount, {
        orderId: order.id,
        userId,
      });
    }

    return res.json({ order, payment });
  } catch (error: any) {
    console.error("Create order error:", error);
    return res.status(400).json({ message: error.message });
  }
};

// ------------------ Confirm Order ------------------
export const confirmOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const { paymentIntentId, paymentMethodId } = req.body;

    if (!orderId || !isUUID(orderId)) {
      return res.status(400).json({ message: "Invalid order ID format" });
    }

    if (!paymentIntentId) {
      return res.status(400).json({ message: "Payment intent ID is required" });
    }

    const existingOrder = await OrderService.getOrderById(orderId);
    if (!existingOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    let paymentResult;
    try {
      paymentResult = await PaymentService.confirmPayment(
        paymentIntentId,
        paymentMethodId
      );
    } catch (paymentError: any) {
      if (
        paymentError.code === "payment_intent_unexpected_state" &&
        paymentError.payment_intent?.status === "succeeded"
      ) {
        paymentResult = {
          success: true,
          paymentIntent: paymentError.payment_intent,
          message: "Payment already completed",
        };
      } else {
        throw paymentError;
      }
    }

    if (paymentResult.success) {
      const updatedOrder = await OrderService.updateOrderStatus(
        orderId,
        "confirmed"
      );

      return res.json({
        message: "Order confirmed",
        order: updatedOrder,
        payment: paymentResult,
      });
    }

    if (paymentResult.requiresAction) {
      return res.json({
        requiresAction: true,
        clientSecret: paymentResult.clientSecret,
        orderId,
      });
    }

    return res.status(400).json({ message: paymentResult.message });
  } catch (error: any) {
    console.error("Confirm order error:", error);
    return res.status(400).json({ message: error.message });
  }
};

// ------------------ Get User Orders ------------------
export const getUserOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await OrderService.getUserOrders(userId, page, limit);
    return res.json(result);
  } catch (error: any) {
    console.error("Get user orders error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ------------------ Update Order Status ------------------
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !isUUID(id)) {
      return res.status(400).json({ message: "Invalid order ID format" });
    }

    const adminId = req.user.id;

    const order = await OrderService.updateOrderStatus(id, status, adminId);

    return res.json({
      message: "Order status updated",
      order,
    });
  } catch (error: any) {
    console.error("Update order status error:", error);
    return res.status(400).json({ message: error.message });
  }
};

// ------------------ Refund Payment ------------------
export const refundPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const { amount } = req.body;

    if (!orderId || !isUUID(orderId)) {
      return res.status(400).json({ message: "Invalid order ID format" });
    }

    const order = await OrderService.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!order.stripePaymentId) {
      return res
        .status(400)
        .json({ message: "No payment found for this order" });
    }

    const refund = await PaymentService.refundPayment(
      order.stripePaymentId,
      amount
    );

    await OrderService.updateOrderStatus(orderId, "refunded");

    return res.json({
      message: "Refund successful",
      refund,
    });
  } catch (error: any) {
    console.error("Refund error:", error);
    return res.status(400).json({ message: error.message });
  }
};

// ------------------ Get Payment Details ------------------
export const getPaymentDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!orderId || !isUUID(orderId)) {
      return res.status(400).json({ message: "Invalid order ID format" });
    }

    const order = await OrderService.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!order.stripePaymentId) {
      return res
        .status(400)
        .json({ message: "No payment found for this order" });
    }

    const payment = await PaymentService.getPaymentDetails(
      order.stripePaymentId
    );

    return res.json({
      order,
      payment: payment.paymentIntent,
    });
  } catch (error: any) {
    console.error("Get payment details error:", error);
    return res.status(400).json({ message: error.message });
  }
};

export const handlePaymentWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.headers["stripe-signature"] as string;

    if (!signature) {
      return res.status(400).json({ message: "Stripe signature missing" });
    }

    await PaymentService.handleWebhook(req.body, signature);
    return res.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return res.status(400).json({ message: error.message });
  }
};
