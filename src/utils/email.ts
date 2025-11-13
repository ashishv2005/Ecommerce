import nodemailer from "nodemailer";
import { config } from "../config/config";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: false,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    await transporter.sendMail({
      from: config.email.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    console.log(`Email sent to ${options.to}`);
  } catch (error) {
    console.error("Email sending failed:", error);
    throw new Error("Failed to send email");
  }
};

export const sendAbandonedCartEmail = async (
  email: string,
  cartItems: any[]
): Promise<void> => {
  const itemsHtml = cartItems
    .map(
      (item) => `
    <tr>
      <td>${item.product.name}</td>
      <td>${item.quantity}</td>
      <td>$${item.product.pricing?.[0]?.price || 0}</td>
    </tr>
  `
    )
    .join("");

  const html = `
    <h2>Don't forget your items!</h2>
    <p>You have items in your cart that are waiting to be purchased:</p>
    <table border="1" style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr>
          <th>Product</th>
          <th>Quantity</th>
          <th>Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
    <p>Complete your purchase before someone else does!</p>
    <p><a href="${config.app.url}/cart">View Your Cart</a></p>
  `;

  await sendEmail({
    to: email,
    subject: "Items in your cart are waiting!",
    html,
  });
};

export const sendOrderConfirmationEmail = async (to: string, order: any) => {
  try {
    const mailOptions = {
      from: config.email.from,
      to,
      subject: `Order Confirmation - #${order.id}`,
      text: `Your order has been confirmed successfully. Order ID: ${order.id}. Amount: ₹${order.finalAmount}`,
      html: `
        <h2>✅ Order Confirmed</h2>
        <p>Thank you for your purchase, <b>${to}</b>!</p>
        <p><b>Order ID:</b> ${order.id}</p>
        <p><b>Total:</b> ₹${order.finalAmount}</p>
        <p>We'll notify you once your order ships.</p>
        <br/>
        <p>Best regards,<br/>Ecommerce Store Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Order confirmation email sent to ${to}`);
  } catch (error) {
    console.error("Email send error:", error);
    throw new Error("Failed to send email");
  }
};

// Send order shipped email
export const sendOrderShippedEmail = async (
  to: string,
  order: any,
  trackingInfo?: string
) => {
  try {
    const mailOptions = {
      from: config.email.from,
      to,
      subject: `Your Order Has Been Shipped - #${order.id}`,
      html: `
        <h2>🚚 Order Shipped</h2>
        <p>Great news! Your order has been shipped.</p>
        <p><b>Order ID:</b> ${order.id}</p>
        <p><b>Total:</b> ₹${order.finalAmount}</p>
        ${
          trackingInfo
            ? `<p><b>Tracking Information:</b> ${trackingInfo}</p>`
            : ""
        }
        <p>You can track your order using the link below:</p>
        <p><a href="${config.app.url}/orders/${
        order.id
      }">Track Your Order</a></p>
        <br/>
        <p>Best regards,<br/>Ecommerce Store Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Order shipped email sent to ${to}`);
  } catch (error) {
    console.error("Order shipped email send error:", error);
    throw new Error("Failed to send order shipped email");
  }
};

// Send order delivered email
export const sendOrderDeliveredEmail = async (to: string, order: any) => {
  try {
    const mailOptions = {
      from: config.email.from,
      to,
      subject: `Your Order Has Been Delivered - #${order.id}`,
      html: `
        <h2>📦 Order Delivered</h2>
        <p>Your order has been successfully delivered!</p>
        <p><b>Order ID:</b> ${order.id}</p>
        <p><b>Total:</b> ₹${order.finalAmount}</p>
        <p>We hope you enjoy your purchase. If you have any questions, please contact our support team.</p>
        <p><a href="${config.app.url}/orders/${order.id}">View Order Details</a></p>
        <br/>
        <p>Best regards,<br/>Ecommerce Store Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Order delivered email sent to ${to}`);
  } catch (error) {
    console.error("Order delivered email send error:", error);
    throw new Error("Failed to send order delivered email");
  }
};

// Send order cancelled email
export const sendOrderCancelledEmail = async (
  to: string,
  order: any,
  reason?: string
) => {
  try {
    const mailOptions = {
      from: config.email.from,
      to,
      subject: `Order Cancelled - #${order.id}`,
      html: `
        <h2>❌ Order Cancelled</h2>
        <p>Your order has been cancelled.</p>
        <p><b>Order ID:</b> ${order.id}</p>
        <p><b>Total:</b> ₹${order.finalAmount}</p>
        ${reason ? `<p><b>Reason:</b> ${reason}</p>` : ""}
        <p>If this was a mistake or you have any questions, please contact our support team.</p>
        <br/>
        <p>Best regards,<br/>Ecommerce Store Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Order cancelled email sent to ${to}`);
  } catch (error) {
    console.error("Order cancelled email send error:", error);
    throw new Error("Failed to send order cancelled email");
  }
};

// Generic order status update email
export const sendOrderStatusUpdateEmail = async (
  to: string,
  order: any,
  oldStatus: string,
  newStatus: string
) => {
  try {
    const statusMessages: { [key: string]: string } = {
      pending: "is being processed",
      confirmed: "has been confirmed",
      shipped: "has been shipped",
      delivered: "has been delivered",
      cancelled: "has been cancelled",
    };

    const mailOptions = {
      from: config.email.from,
      to,
      subject: `Order Status Updated - #${order.id}`,
      html: `
        <h2>Order Status Update</h2>
        <p>Your order status has been updated from <b>${oldStatus}</b> to <b>${newStatus}</b>.</p>
        <p><b>Order ID:</b> ${order.id}</p>
        <p><b>Current Status:</b> ${newStatus}</p>
        <p><b>Message:</b> Your order ${
          statusMessages[newStatus] || "status has been updated"
        }.</p>
        <p><a href="${config.app.url}/orders/${
        order.id
      }">View Order Details</a></p>
        <br/>
        <p>Best regards,<br/>Ecommerce Store Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Order status update email sent to ${to}`);
  } catch (error) {
    console.error("Order status update email send error:", error);
    throw new Error("Failed to send order status update email");
  }
};
