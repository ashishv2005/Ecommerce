import bcrypt from "bcryptjs";

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(password, salt);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

export const generateRandomString = (length: number): string => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export const calculateDiscount = (
  originalPrice: number,
  discountPercentage: number
): number => {
  return originalPrice * (discountPercentage / 100);
};

export const getStockStatus = (
  currentStock: number,
  lowStockThreshold: number
): string => {
  if (currentStock === 0) return "out_of_stock";
  if (currentStock <= lowStockThreshold) return "low_stock";
  return "in_stock";
};
