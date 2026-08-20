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
  badge?: string;
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

export const ORDER_BUMPS: OrderBump[] = [
  {
    id: "offer-oxford-jantar",
    enabled: true,
    title: "Jogo de Jantar 10 Peças Oxford Ryo Maresia",
    description: "Porcelana premium para sua mesa",
    price: 46.2,
    compareAt: 189.9,
    image: "/order-bumps/oxford-ryo-maresia.png",
  },
  {
    id: "offer-potes-vidro",
    enabled: true,
    title: "Kit 10 Potes de Vidro Herméticos Colinox",
    description: "Organize sua cozinha com praticidade",
    price: 36.45,
    compareAt: 139.9,
    image: "/order-bumps/potes-vidro.png",
  },
  {
    id: "offer-panela-pressao",
    enabled: true,
    title: "Panela de Pressão Colinox Antiaderente 4,2L",
    description: "Cozinhe mais rápido com segurança",
    price: 48.99,
    compareAt: 219.9,
    image: "/order-bumps/panela-pressao.png",
    badge: "MAIS VENDIDA",
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
