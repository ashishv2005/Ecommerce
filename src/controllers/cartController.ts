import { Request, Response } from "express";
import { CartService } from "../services/cartService";
import { AuthRequest } from "../middleware/auth";
import { validate as isUUID } from "uuid";

export const addToCart = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId: string = req.user.id;
    const { productId, quantity } = req.body;

    // Validate productId as UUID
    if (!productId || !isUUID(productId)) {
      res.status(400).json({ message: "Invalid product ID format" });
      return;
    }

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
    const userId: string = req.user.id;
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
    const userId: string = req.user.id;
    const { id } = req.params;
    const { quantity } = req.body;

    if (!id) {
      res.status(400).json({ message: "Cart ID is required" });
      return;
    }

    // Validate UUID
    if (!isUUID(id)) {
      res.status(400).json({ message: "Invalid cart ID format" });
      return;
    }

    const cartItem = await CartService.updateCartItem(id, userId, quantity);

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
    const userId: string = req.user.id;
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: "Cart ID is required" });
      return;
    }

    // Convert: Removing parseInt — UUID expected
    if (!isUUID(id)) {
      res.status(400).json({ message: "Invalid cart ID format" });
      return;
    }

    await CartService.removeFromCart(id, userId);

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
