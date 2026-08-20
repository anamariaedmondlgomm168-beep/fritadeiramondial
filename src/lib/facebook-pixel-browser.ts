import { fireFacebookConversion, getPublicPixels } from "@/lib/api/admin.functions";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: (...args: unknown[]) => void;
  }
}

let injected = false;

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

export async function initFacebookPixels() {
  if (typeof window === "undefined") return;
  try {
    const { facebookPixels } = await getPublicPixels();
    const ids = facebookPixels.map((p) => p.pixelId).filter(Boolean);
    if (ids.length > 0) injectFacebookScript(ids);
  } catch (err) {
    console.error("Failed to load Facebook pixels:", err);
  }
}

export async function trackFacebookEvent(
  eventName: string,
  data?: Record<string, unknown>,
  userData?: { email?: string; phone?: string; name?: string },
) {
  if (typeof window === "undefined") return;

  const eventId = `${eventName}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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
      },
    });
  } catch (err) {
    console.error("Facebook CAPI client error:", err);
  }
}

export function isFacebookPixelReady() {
  return injected && typeof window !== "undefined" && typeof window.fbq === "function";
}
