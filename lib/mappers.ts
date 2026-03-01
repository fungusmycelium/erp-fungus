import { SaleRecord, PurchaseRecord, InventoryItem, Customer, OrderItem, ShippingMethod, StandardProduct } from '../types';

export const mapCustomer = (c: any): Customer => ({
    id: c.id,
    firstName: c.first_name,
    lastName: c.last_name,
    rut: c.rut,
    address: c.address || '',
    commune: c.commune || '',
    region: c.region || '',
    email: c.email || '',
    phone: c.phone || '',
    shippingMethod: (c.shipping_method as ShippingMethod) || 'Retiro',
    sucursalName: c.sucursal_name,
    isSucursalDelivery: c.is_sucursal_delivery,
    isCompany: c.is_company,
    businessName: c.business_name,
    businessGiro: c.business_giro,
    lastOrderNumber: '' // Not fetching this relation by default
});

export const mapSaleRecord = (s: any): SaleRecord => ({
    id: s.id,
    orderNumber: s.order_number,
    customerName: s.customer ? (s.customer.is_company ? s.customer.business_name : `${s.customer.first_name} ${s.customer.last_name}`) : 'Cliente Desconocido',
    date: s.date, // ISO String for logic
    total: Number(s.total),
    status: s.status,
    items: s.items?.map((i: any) => ({
        id: i.id,
        name: i.item_name,
        qty: i.qty,
        price: Number(i.price)
    })) || [],
    customerDetails: s.customer ? mapCustomer(s.customer) : undefined
});

export const mapPurchaseRecord = (p: any): PurchaseRecord => ({
    id: p.id,
    provider: p.provider,
    rut: p.rut,
    docNumber: p.doc_number,
    docType: p.doc_type,
    date: p.date, // ISO String for logic
    total: Number(p.total),
    paymentMethod: p.payment_method,
    category: p.category || 'Insumos',
    items: p.items?.map((i: any) => ({
        id: i.id,
        name: i.item_name,
        qty: i.qty,
        price: Number(i.cost),
        cost: Number(i.cost)
    })) || []
});

export const mapInventoryItem = (i: any): InventoryItem => ({
    id: i.id,
    name: i.name,
    stock: i.stock,
    lastPrice: Number(i.last_price),
    cost: Number(i.cost),
    category: i.category,
    imageUrl: i.image_url
});

export const mapStandardProduct = (p: any): StandardProduct => ({
    id: p.id,
    name: p.name,
    category: p.category || '',
    type: p.type,
    defaultPrice: Number(p.default_price || 0),
    defaultCost: Number(p.default_cost || 0)
});
