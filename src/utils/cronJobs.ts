import { CronJob } from "cron";
import { CartService } from "../services/cartService";
import { Op } from "sequelize";

export const abandonedCartJob = new CronJob("*/1 * * * *", async () => {
  console.log("🕒 CRON JOB RUNNING at:", new Date().toLocaleTimeString());
  try {
    await CartService.debugCartStatus();

    const count = await CartService.sendAbandonedCartNotifications();
    if (count > 0)
      console.log(`📧 ${count} abandoned cart email(s) sent successfully`);
    else console.log("🕵️ No abandoned carts found yet");
  } catch (error) {
    console.error("❌ Abandoned cart job error:", error);
  }
});

export const cleanupCartsJob = new CronJob("0 0 * * *", async () => {
  try {
    console.log("🧹 Cleaning expired carts...");
    const { Cart } = await import("../models/Cart");
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result = await Cart.destroy({
      where: {
        abandoned: true,
        expiresAt: { [Op.lt]: sevenDaysAgo },
      },
    });
    console.log(`🗑️ Cleaned up ${result} old abandoned carts`);
  } catch (error) {
    console.error("❌ Cart cleanup job error:", error);
  }
});

export const startCronJobs = () => {
  abandonedCartJob.start();
  cleanupCartsJob.start();
  console.log("✅ Cron jobs started successfully");
};
