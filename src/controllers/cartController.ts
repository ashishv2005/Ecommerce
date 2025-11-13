import { Request, Response } from "express";
import { CartService } from "../services/cartService";
import { AuthRequest } from "../middleware/auth";

export const addToCart = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;

    const cartItem = await CartService.addToCart(userId, productId, quantity);
    res.status(201).json(cartItem);
  } catch (error: any) {
    console.error("Add to cart error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const getCart = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;
    const cartItems = await CartService.getUserCart(userId);
    res.json(cartItems);
  } catch (error: any) {
    console.error("Get cart error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const updateCartItem = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { quantity } = req.body;

    if (!id) {
      res.status(400).json({ message: "Cart ID is required" });
      return;
    }

    const cartId = parseInt(id, 10);
    if (isNaN(cartId)) {
      res.status(400).json({ message: "Invalid cart ID" });
      return;
    }

    const cartItem = await CartService.updateCartItem(cartId, userId, quantity);
    res.json(cartItem);
  } catch (error: any) {
    console.error("Update cart error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const removeFromCart = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: "Cart ID is required" });
      return;
    }

    const cartId = parseInt(id, 10);
    if (isNaN(cartId)) {
      res.status(400).json({ message: "Invalid cart ID" });
      return;
    }

    await CartService.removeFromCart(cartId, userId);
    res.json({ message: "Item removed from cart" });
  } catch (error: any) {
    console.error("Remove from cart error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const getAbandonedCarts = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page =
      typeof req.query.page === "string" ? parseInt(req.query.page, 10) : 1;
    const limit =
      typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 10;

    const result = await CartService.getAbandonedCarts(page, limit);
    res.json(result);
  } catch (error: any) {
    console.error("Get abandoned carts error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const sendAbandonedCartNotifications = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const count = await CartService.sendAbandonedCartNotifications();
    res.json({ message: `Notifications sent for ${count} abandoned carts` });
  } catch (error: any) {
    console.error("Send notifications error:", error);
    res.status(500).json({ message: error.message });
  }
};
