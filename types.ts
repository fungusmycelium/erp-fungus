
export enum View {
  DASHBOARD = 'DASHBOARD',
  FINANCE = 'FINANCE',
  INVENTORY = 'INVENTORY',
  PRODUCT_CATALOG = 'PRODUCT_CATALOG',
  CRM = 'CRM',
  SALES_LIST = 'SALES_LIST',
  PURCHASES_LIST = 'PURCHASES_LIST',
  TRANSACTION_DETAILS = 'TRANSACTION_DETAILS',
  SALES_ORDER = 'SALES_ORDER',
  PURCHASE_REGISTRY = 'PURCHASE_REGISTRY',
  ANALYSIS = 'ANALYSIS',
  USERS = 'USERS',
  STANDARD_PRODUCTS = 'STANDARD_PRODUCTS'
}

export type UserRole = 'CEO' | 'SUPERVISOR' | 'VENDEDOR' | 'ADMIN' | 'OPERATOR';

export type PaymentMethod = 'Efectivo' | 'Transferencia' | 'Tarjeta';
export type ShippingMethod = 'Starken' | 'Chilexpress' | 'Bluexpress' | 'Retiro' | 'Sucursal';
export type PurchaseCategory = 'Insumos' | 'Venta' | 'Activos';

export interface OrderItem {
  id: string;
  name: string;
  qty: number;
  price: number; // Precio con IVA incluido (Venta)
  cost?: number; // Costo de adquisición (Compra)
  category?: PurchaseCategory;
}

export interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  lastPrice: number; // Precio de venta sugerido (IVA inc)
  cost: number; // Costo de adquisición neto
  category: string;
  imageUrl?: string;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  rut: string;
  address: string;
  commune: string;
  region: string;
  email: string;
  phone: string;
  shippingMethod: ShippingMethod;
  sucursalName?: string;
  isSucursalDelivery?: boolean;
  isCompany: boolean;
  businessName?: string;
  businessGiro?: string;
  lastOrderNumber?: string;
}

export interface SaleRecord {
  id: string;
  orderNumber: string;
  customerName: string;
  date: string;
  total: number;
  status: 'Completado' | 'Pendiente' | 'Cancelado';
  items: OrderItem[];
  customerDetails: Customer;
}

export interface PurchaseRecord {
  id: string;
  provider: string;
  rut: string;
  docNumber: string;
  docType: 'Factura' | 'Boleta';
  date: string;
  total: number;
  items: OrderItem[];
  giro?: string;
  paymentMethod?: PaymentMethod;
  category: PurchaseCategory;
}

export interface StandardProduct {
  id: string;
  name: string;
  category: string;
  type: 'sale' | 'purchase';
  defaultPrice: number;
  defaultCost: number;
}
