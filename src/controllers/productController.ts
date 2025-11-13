import { Request, Response } from "express";
import { Product, ProductImage, ProductPricing } from "../models";
import { Op } from "sequelize";
import { AuthRequest } from "../middleware/auth";

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

    const products = rows.map((product) => {
      const productData = product.toJSON();
      return {
        ...productData,
        stockStatus: product.getStockStatus(),
      };
    });

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

export const getProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id, {
      include: [
        {
          model: ProductImage,
          as: "images",
        },
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

    const enhancedProduct = {
      ...product.toJSON(),
      stockStatus: product.getStockStatus(),
    };

    res.json(enhancedProduct);
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

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

    if (images && images.length > 0) {
      const productImages = images.map((imageUrl: string, index: number) => ({
        productId: product.id,
        imageUrl,
        isPrimary: index === 0,
      }));
      await ProductImage.bulkCreate(productImages);
    }

    if (pricing && pricing.length > 0) {
      const productPricing = pricing.map((price: any) => ({
        productId: product.id,
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

export const updateProduct = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const product = await Product.findByPk(id);
    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    await product.update(updateData);
    res.json(product);
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteProduct = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

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
