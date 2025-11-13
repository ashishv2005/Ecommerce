import { Request, Response } from "express";
import { OrderService } from "../services/orderService";
import { PaymentService } from "../services/paymentService";
import { AuthRequest } from "../middleware/auth";

export const createOrder = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;
    const { cartItems, shippingAddress, billingAddress, paymentMethod } =
      req.body;

    const order = await OrderService.createOrder(userId, cartItems);

    if (shippingAddress || billingAddress) {
      await order.update({
        shippingAddress,
        billingAddress,
      });
    }

    let payment;
    if (paymentMethod === "upi") {
      payment = await PaymentService.createUPIPayment(order.finalAmount, {
        orderId: order.id.toString(),
        userId: userId.toString(),
      });
    } else {
      payment = await PaymentService.createPaymentIntent(order.finalAmount, {
        orderId: order.id.toString(),
        userId: userId.toString(),
      });
    }

    res.json({
      order,
      payment,
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const confirmOrder = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { paymentIntentId, paymentMethodId } = req.body;

    if (!orderId) {
      res.status(400).json({ message: "Order ID is required" });
      return;
    }

    if (!paymentIntentId) {
      res.status(400).json({ message: "Payment intent ID is required" });
      return;
    }

    const orderIdNumber = parseInt(orderId);
    if (isNaN(orderIdNumber)) {
      res.status(400).json({ message: "Invalid order ID" });
      return;
    }

    const existingOrder = await OrderService.getOrderById(orderIdNumber);
    if (!existingOrder) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    if (existingOrder.status === "confirmed") {
      res.json({
        message: "Order is already confirmed",
        order: existingOrder,
        payment: { success: true, message: "Payment already completed" },
      });
      return;
    }

    // Check payment status first before trying to confirm
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
          message: "Payment already completed successfully",
        };
      } else {
        throw paymentError;
      }
    }

    if (paymentResult.success) {
      const order = await OrderService.updateOrderStatus(
        orderIdNumber,
        "confirmed"
      );

      res.json({
        message: "Order confirmed successfully",
        order,
        payment: paymentResult,
      });
    } else if (paymentResult.requiresAction) {
      res.json({
        message: "Additional action required for payment",
        requiresAction: true,
        clientSecret: paymentResult.clientSecret,
        orderId: orderId,
      });
    } else {
      res.status(400).json({
        message: paymentResult.message || "Payment not completed",
      });
    }
  } catch (error: any) {
    console.error("Confirm order error:", error);

    if (error.code === "payment_intent_unexpected_state") {
      res.status(400).json({
        message: "Payment has already been processed",
        details:
          "This payment has already been completed and cannot be confirmed again",
      });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
};
export const getUserOrders = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;
    const page =
      typeof req.query.page === "string" ? parseInt(req.query.page) : 1;
    const limit =
      typeof req.query.limit === "string" ? parseInt(req.query.limit) : 10;

    const result = await OrderService.getUserOrders(userId, page, limit);
    res.json(result);
  } catch (error: any) {
    console.error("Get user orders error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const updateOrderStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.user.id;

    // Check if id is defined before parsing
    if (!id) {
      res.status(400).json({ message: "Order ID is required" });
      return;
    }

    const orderId = parseInt(id);
    if (isNaN(orderId)) {
      res.status(400).json({ message: "Invalid order ID" });
      return;
    }

    if (!status) {
      res.status(400).json({ message: "Status is required" });
      return;
    }

    const order = await OrderService.updateOrderStatus(
      orderId,
      status,
      adminId
    );
    res.json({
      message: "Order status updated successfully",
      order,
    });
  } catch (error: any) {
    console.error("Update order status error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const handlePaymentWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const signature = req.headers["stripe-signature"] as string;
    const payload = req.body;

    if (!signature) {
      res.status(400).json({ message: "Stripe signature is required" });
      return;
    }

    await PaymentService.handleWebhook(payload, signature);
    res.json({ received: true });
  } catch (error: any) {
    console.error("Payment webhook error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const refundPayment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { amount } = req.body;

    // Check if orderId is defined before parsing
    if (!orderId) {
      res.status(400).json({ message: "Order ID is required" });
      return;
    }

    // Use the correct method name getOrderById (not getOrderByld)
    const order = await OrderService.getOrderById(parseInt(orderId));
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    if (!order.stripePaymentId) {
      res.status(400).json({ message: "No payment found for this order" });
      return;
    }

    const refundResult = await PaymentService.refundPayment(
      order.stripePaymentId,
      amount
    );

    if (refundResult.success) {
      // Update order status to refunded
      await OrderService.updateOrderStatus(parseInt(orderId), "refunded");

      res.json({
        message: "Refund processed successfully",
        refund: refundResult,
      });
    } else {
      res.status(400).json({ message: "Refund failed" });
    }
  } catch (error: any) {
    console.error("Refund error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const getPaymentDetails = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { orderId } = req.params;

    // Check if orderId is defined before parsing
    if (!orderId) {
      res.status(400).json({ message: "Order ID is required" });
      return;
    }

    // Use the correct method name getOrderById (not getOrderByld)
    const order = await OrderService.getOrderById(parseInt(orderId));
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    if (!order.stripePaymentId) {
      res.status(400).json({ message: "No payment found for this order" });
      return;
    }

    const paymentDetails = await PaymentService.getPaymentDetails(
      order.stripePaymentId
    );

    if (paymentDetails.success) {
      res.json({
        order,
        payment: paymentDetails.paymentIntent,
      });
    } else {
      res.status(400).json({ message: "Failed to retrieve payment details" });
    }
  } catch (error: any) {
    console.error("Get payment details error:", error);
    res.status(400).json({ message: error.message });
  }
};
