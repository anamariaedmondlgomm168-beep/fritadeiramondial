import { fireFacebookConversion, getPublicPixels } from "@/lib/api/admin.functions";
import {
  checkoutEventId,
  productEventPayload,
  purchaseEventId,
} from "@/lib/facebook-pixel-events";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: (...args: unknown[]) => void;
  }
}

let injected = false;

const BUYER_STORAGE_KEY = "mondial_checkout_buyer";

export interface CheckoutBuyerData {
  name?: string;
  email?: string;
  phone?: string;
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function injectFacebookScript(pixelIds: string[]) {
  if (typeof document === "undefined" || pixelIds.length === 0) return;

  document.querySelectorAll("[data-fb-pixel]").forEach((el) => el.remove());

  const loader = document.createElement("script");
  loader.setAttribute("data-fb-pixel", "loader");
  loader.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');`;
  document.head.appendChild(loader);

  pixelIds.forEach((pixelId, index) => {
    const init = document.createElement("script");
    init.setAttribute("data-fb-pixel", `init-${index}`);
    init.innerHTML = `fbq('init','${pixelId}');`;
    document.head.appendChild(init);
  });

  const pageView = document.createElement("script");
  pageView.setAttribute("data-fb-pixel", "pageview");
  pageView.innerHTML = "fbq('track','PageView');";
  document.head.appendChild(pageView);

  injected = true;
}

export function saveCheckoutBuyer(data: CheckoutBuyerData) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(BUYER_STORAGE_KEY, JSON.stringify(data));
}

export function readCheckoutBuyer(): CheckoutBuyerData | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(BUYER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CheckoutBuyerData) : undefined;
  } catch {
    return undefined;
  }
}

export async function initFacebookPixels() {
  if (typeof window === "undefined") return;
  try {
    const { facebookPixels } = await getPublicPixels();
    const ids = facebookPixels.map((pixel) => pixel.pixelId).filter(Boolean);
    if (ids.length > 0) injectFacebookScript(ids);
  } catch (err) {
    console.error("Failed to load Facebook pixels:", err);
  }
}

async function sendFacebookEvent(
  eventName: string,
  eventId: string,
  data?: Record<string, unknown>,
  userData?: CheckoutBuyerData,
) {
  if (typeof window === "undefined") return;

  if (typeof window.fbq === "function") {
    window.fbq("track", eventName, data, { eventID: eventId });
  }

  try {
    await fireFacebookConversion({
      data: {
        eventName,
        eventId,
        sourceUrl: window.location.href,
        customData: data,
        userData,
        fbp: readCookie("_fbp"),
        fbc: readCookie("_fbc"),
        clientUserAgent: navigator.userAgent,
      },
    });
  } catch (err) {
    console.error("Facebook CAPI client error:", err);
  }
}

export async function trackFacebookEvent(
  eventName: string,
  data?: Record<string, unknown>,
  userData?: CheckoutBuyerData,
  eventId?: string,
) {
  const id = eventId ?? `${eventName}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await sendFacebookEvent(eventName, id, data, userData);
}

export async function trackInitiateCheckout(input: {
  orderId: string;
  amount: number;
  userData?: CheckoutBuyerData;
}) {
  const storageKey = `fb_checkout_${input.orderId}`;
  if (sessionStorage.getItem(storageKey)) return;
  sessionStorage.setItem(storageKey, "1");

  await sendFacebookEvent(
    "InitiateCheckout",
    checkoutEventId(input.orderId),
    {
      ...productEventPayload(input.amount),
      num_items: 1,
    },
    input.userData ?? readCheckoutBuyer(),
  );
}

export async function trackPurchase(input: {
  paymentId: string;
  amount: number;
  userData?: CheckoutBuyerData;
}) {
  const storageKey = `fb_purchase_${input.paymentId}`;
  if (sessionStorage.getItem(storageKey)) return;
  sessionStorage.setItem(storageKey, "1");

  await sendFacebookEvent(
    "Purchase",
    purchaseEventId(input.paymentId),
    {
      ...productEventPayload(input.amount),
      order_id: input.paymentId,
    },
    input.userData ?? readCheckoutBuyer(),
  );
}

export function isFacebookPixelReady() {
  return injected && typeof window !== "undefined" && typeof window.fbq === "function";
}
