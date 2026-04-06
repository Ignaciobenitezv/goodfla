export const GA_MEASUREMENT_ID = "G-MXWQ3PRYHB"

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag?: (...args: any[]) => void
  }
}

export function trackEvent(
  eventName: string,
  params?: Record<string, any>
) {
  if (typeof window === "undefined") return
  if (typeof window.gtag !== "function") return

  window.gtag("event", eventName, params || {})
}