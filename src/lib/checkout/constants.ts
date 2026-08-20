export type Voltage = "127V" | "220V";

export type ShippingOptionId = "free" | "express";

export interface ShippingOption {
  id: ShippingOptionId;
  label: string;
  description: string;
  price: number;
  eta: string;
}

export interface OrderBump {
  id: string;
  enabled: boolean;
  title: string;
  description: string;
  price: number;
  compareAt?: number;
  image?: string;
}

export const PRODUCT = {
  id: "mondial-afon-12l-bi",
  name: "Fritadeira Air Fryer Forno Oven 12L Mondial 2000W AFON-12L-BI",
  brand: "Mondial",
  price: 69.9,
  compareAt: 1299,
  image: "https://pontoquente.site/products/14e72136cf1148d7.jpg",
} as const;

export const SHIPPING_OPTIONS: ShippingOption[] = [
  {
    id: "free",
    label: "Frete Grátis",
    description: "Entrega econômica",
    price: 0,
    eta: "8 a 13 dias úteis",
  },
  {
    id: "express",
    label: "Frete Expresso",
    description: "Entrega prioritária",
    price: 9.6,
    eta: "3 a 5 dias úteis",
  },
];

/** Order bumps - edite aqui quando enviar as 3 ofertas */
export const ORDER_BUMPS: OrderBump[] = [
  {
    id: "offer-1",
    enabled: false,
    title: "Oferta 1",
    description: "Aguardando configuração",
    price: 0,
  },
  {
    id: "offer-2",
    enabled: false,
    title: "Oferta 2",
    description: "Aguardando configuração",
    price: 0,
  },
  {
    id: "offer-3",
    enabled: false,
    title: "Oferta 3",
    description: "Aguardando configuração",
    price: 0,
  },
];

export function getShippingOption(id: ShippingOptionId): ShippingOption {
  return SHIPPING_OPTIONS.find((o) => o.id === id) ?? SHIPPING_OPTIONS[0];
}

export function getEnabledOrderBumps(): OrderBump[] {
  return ORDER_BUMPS.filter((b) => b.enabled);
}

export function calculateTotal(
  shippingId: ShippingOptionId,
  selectedBumpIds: string[],
): number {
  const shipping = getShippingOption(shippingId);
  const bumps = ORDER_BUMPS.filter((b) => b.enabled && selectedBumpIds.includes(b.id));
  const bumpsTotal = bumps.reduce((sum, b) => sum + b.price, 0);
  return PRODUCT.price + shipping.price + bumpsTotal;
}
