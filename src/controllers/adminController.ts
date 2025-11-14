import { Request, Response } from "express";
import { ReportingService } from "../services/reportingService";
import { User, Product, Order } from "../models";
import { AuthRequest } from "../middleware/auth";
import { Op } from "sequelize";
import { validate as isUUID } from "uuid";

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalUsers, totalProducts, totalOrders, recentOrders, salesReport] =
      await Promise.all([
        User.count({ where: { role: "user" } }),
        Product.count({ where: { isActive: true } }),
        Order.count(),
        Order.findAll({
          where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
          limit: 10,
          order: [["createdAt", "DESC"]],
        }),
        ReportingService.getSalesReport(thirtyDaysAgo, new Date()),
      ]);

    res.json({
      totalUsers,
      totalProducts,
      totalOrders,
      recentOrders,
      salesReport: {
        totalRevenue: salesReport.totalRevenue,
        totalOrders: salesReport.totalOrders,
        totalProductsSold: salesReport.totalProductsSold,
      },
    });
  } catch (error: any) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getSalesReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate
      ? new Date(startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const end = endDate ? new Date(endDate as string) : new Date();

    const report = await ReportingService.getSalesReport(start, end);
    res.json(report);
  } catch (error: any) {
    console.error("Get sales report error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getProductPerformance = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const performance = await ReportingService.getProductPerformance();
    res.json(performance);
  } catch (error: any) {
    console.error("Get product performance error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getUserPurchaseReport = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const users = await ReportingService.getUserPurchaseReport();
    res.json(users);
  } catch (error: any) {
    console.error("Get user purchase report error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getLowPerformingProducts = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { threshold = 10 } = req.query;
    const products = await ReportingService.getLowPerformingProducts(
      Number(threshold)
    );
    res.json(products);
  } catch (error: any) {
    console.error("Get low performing products error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ------------------ Stock Alerts ------------------
export const getStockAlerts = async (req: AuthRequest, res: Response) => {
  try {
    const alerts = await ReportingService.getStockAlerts();
    res.json(alerts);
  } catch (error: any) {
    console.error("Get stock alerts error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const updateUserDiscount = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    // UUID Validation
    if (!userId || !isUUID(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const { discountEligible } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.update({ discountEligible });

    return res.json({
      message: "User discount eligibility updated successfully",
    });
  } catch (error: any) {
    console.error("Update user discount error:", error);
    return res.status(500).json({ message: error.message });
  }
};
