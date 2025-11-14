import { Request, Response } from "express";
import { Product, ProductImage, ProductPricing } from "../models";
import { Op } from "sequelize";
import { AuthRequest } from "../middleware/auth";
import { validate as isUUID } from "uuid";

// ------------------ Get Products ------------------
export const getProducts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const where: any = { isActive: true };
    const include: any = [
      {
        model: ProductImage,
        as: "images",
        required: false,
      },
      {
        model: ProductPricing,
        as: "pricing",
        where: { isActive: true },
        required: false,
      },
    ];

    if (category) where.category = category;
    if (search) where.name = { [Op.like]: `%${search}%` };

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows } = await Product.findAndCountAll({
      where,
      include,
      limit: Number(limit),
      offset,
      order: [["createdAt", "DESC"]],
    });

    const products = rows.map((product) => ({
      ...product.toJSON(),
      stockStatus: product.getStockStatus(),
    }));

    res.json({
      products,
      totalPages: Math.ceil(count / Number(limit)),
      currentPage: Number(page),
      totalProducts: count,
    });
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ------------------ Get Single Product ------------------
export const getProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // UUID validation
    if (!isUUID(id)) {
      res.status(400).json({ message: "Invalid product ID format" });
      return;
    }

    const product = await Product.findByPk(id, {
      include: [
        { model: ProductImage, as: "images" },
        {
          model: ProductPricing,
          as: "pricing",
          where: { isActive: true },
          required: false,
        },
      ],
    });

    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    res.json({
      ...product.toJSON(),
      stockStatus: product.getStockStatus(),
    });
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ------------------ Create Product ------------------
export const createProduct = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      name,
      description,
      category,
      currentStock,
      lowStockThreshold,
      images,
      pricing,
    } = req.body;

    const product = await Product.create({
      name,
      description,
      category,
      currentStock,
      lowStockThreshold: lowStockThreshold || 10,
    });

    // Add Images
    if (images && images.length > 0) {
      const productImages = images.map((imageUrl: string, index: number) => ({
        productId: product.id, // UUID
        imageUrl,
        isPrimary: index === 0,
      }));

      await ProductImage.bulkCreate(productImages);
    }

    // Add Pricing
    if (pricing && pricing.length > 0) {
      const productPricing = pricing.map((price: any) => ({
        productId: product.id, // UUID
        batchStart: price.batchStart,
        batchEnd: price.batchEnd,
        price: price.price,
        costPrice: price.costPrice,
      }));

      await ProductPricing.bulkCreate(productPricing);
    }

    const createdProduct = await Product.findByPk(product.id, {
      include: [
        { model: ProductImage, as: "images" },
        { model: ProductPricing, as: "pricing" },
      ],
    });

    res.status(201).json(createdProduct);
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ------------------ Update Product ------------------
export const updateProduct = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // UUID validation
    if (!isUUID(id)) {
      res.status(400).json({ message: "Invalid product ID format" });
      return;
    }

    const product = await Product.findByPk(id);
    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    await product.update(req.body);
    res.json(product);
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ------------------ Delete Product ------------------
export const deleteProduct = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // UUID validation
    if (!isUUID(id)) {
      res.status(400).json({ message: "Invalid product ID format" });
      return;
    }

    const product = await Product.findByPk(id);
    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    await product.update({ isActive: false });

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
