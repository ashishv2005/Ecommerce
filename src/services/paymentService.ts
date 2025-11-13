import Stripe from "stripe";
import { config } from "../config/config";

const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: "2024-04-10" as any,
});

export interface PaymentMethod {
  type: "card" | "upi" | "netbanking" | "wallet";
  details: any;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  clientSecret?: string;
  status?: string;
  error?: string;
}

export class PaymentService {
  // Create payment intent with automatic methods
  static async createPaymentIntent(
    amount: number,
    metadata: any = {},
    paymentMethod?: PaymentMethod
  ) {
    try {
      // Ensure minimum ₹50
      const minAmount = 50;
      const finalAmount = amount < minAmount ? minAmount : amount;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(finalAmount * 100),
        currency: "inr",
        metadata,
        automatic_payment_methods: { enabled: true },
        description: `Payment for order ${metadata.orderId}`,
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      console.error("Stripe payment intent creation error:", error);
      throw new Error("Failed to create payment intent");
    }
  }

  // Create UPI-only payment intent
  static async createUPIPayment(amount: number, metadata: any = {}) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: "inr",
        metadata,
        payment_method_types: ["upi"], // UPI only
        description: `UPI Payment for order ${metadata.orderId}`,
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        paymentMethod: "upi",
      };
    } catch (error) {
      console.error("UPI payment creation error:", error);
      throw new Error("Failed to create UPI payment");
    }
  }

  // Confirm payment
  static async confirmPayment(
    paymentIntentId: string,
    paymentMethodId?: string
  ) {
    try {
      let paymentIntent;

      if (paymentMethodId) {
        paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
          payment_method: paymentMethodId,
          return_url: `${config.app.url}/payment/success`,
        });
      } else {
        paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      }

      if (paymentIntent.status === "succeeded") {
        return {
          success: true,
          paymentIntent,
          message: "Payment completed successfully",
        };
      } else if (paymentIntent.status === "requires_action") {
        return {
          success: false,
          requiresAction: true,
          clientSecret: paymentIntent.client_secret,
          status: paymentIntent.status,
          message: "Additional action required for payment",
        };
      } else {
        return {
          success: false,
          status: paymentIntent.status,
          message: `Payment status: ${paymentIntent.status}`,
        };
      }
    } catch (error) {
      console.error("Stripe payment confirmation error:", error);
      throw new Error("Failed to confirm payment");
    }
  }

  static async attachPaymentMethod(
    paymentMethodId: string,
    customerId?: string
  ) {
    try {
      if (customerId) {
        const paymentMethod = await stripe.paymentMethods.attach(
          paymentMethodId,
          { customer: customerId }
        );
        return { success: true, paymentMethod };
      } else {
        const paymentMethod = await stripe.paymentMethods.retrieve(
          paymentMethodId
        );
        return { success: true, paymentMethod };
      }
    } catch (error) {
      console.error("Payment method attachment error:", error);
      throw new Error("Failed to attach payment method");
    }
  }

  static async createCustomer(userId: number, email: string, name: string) {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: { userId: userId.toString() },
      });
      return { success: true, customerId: customer.id };
    } catch (error) {
      console.error("Customer creation error:", error);
      throw new Error("Failed to create customer");
    }
  }

  static async refundPayment(paymentIntentId: string, amount?: number) {
    try {
      const refundParams: any = { payment_intent: paymentIntentId };
      if (amount) refundParams.amount = Math.round(amount * 100);

      const refund = await stripe.refunds.create(refundParams);
      return {
        success: true,
        refundId: refund.id,
        status: refund.status,
        amount: refund.amount / 100,
      };
    } catch (error) {
      console.error("Refund error:", error);
      throw new Error("Failed to process refund");
    }
  }

  static async getPaymentDetails(paymentIntentId: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId
      );
      return {
        success: true,
        paymentIntent: {
          id: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          payment_method: paymentIntent.payment_method,
          created: new Date(paymentIntent.created * 1000),
          customer: paymentIntent.customer,
          description: paymentIntent.description,
        },
      };
    } catch (error) {
      console.error("Get payment details error:", error);
      throw new Error("Failed to retrieve payment details");
    }
  }

  static async handleWebhook(payload: any, signature: string) {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        config.stripe.webhookSecret
      );

      console.log(`Webhook received: ${event.type}`);

      switch (event.type) {
        case "payment_intent.succeeded":
          const succeededPayment = event.data.object;
          console.log("Payment succeeded:", succeededPayment.id);
          await this.handleSuccessfulPayment(succeededPayment);
          break;

        case "payment_intent.payment_failed":
          const failedPayment = event.data.object;
          console.log("Payment failed:", failedPayment.id);
          await this.handleFailedPayment(failedPayment);
          break;

        case "payment_intent.requires_action":
          const requiresAction = event.data.object;
          console.log("Payment requires action:", requiresAction.id);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      console.error("Webhook error:", error);
      throw new Error("Webhook signature verification failed");
    }
  }

  private static async handleSuccessfulPayment(paymentIntent: any) {
    try {
      const { Order } = await import("../models/Order");
      const orderId = paymentIntent.metadata.orderId;
      if (orderId) {
        const order = await Order.findByPk(orderId);
        if (order) {
          await order.update({
            status: "confirmed",
            stripePaymentId: paymentIntent.id,
          });
          console.log(`Order ${orderId} confirmed after successful payment`);
        }
      }
    } catch (error) {
      console.error("Error handling successful payment:", error);
    }
  }

  private static async handleFailedPayment(paymentIntent: any) {
    try {
      const { Order } = await import("../models/Order");
      const orderId = paymentIntent.metadata.orderId;
      if (orderId) {
        const order = await Order.findByPk(orderId);
        if (order) {
          await order.update({
            status: "cancelled",
            stripePaymentId: paymentIntent.id,
          });
          console.log(`Order ${orderId} cancelled due to failed payment`);
        }
      }
    } catch (error) {
      console.error("Error handling failed payment:", error);
    }
  }
}
