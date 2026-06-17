﻿(() => {
  /* =========================================================
   GLOBAL GUARD (avoid duplicate load / redeclare errors)
  ========================================================= */
  if (window.__SMARTCARTIFY_CARTDRAWER_V27__) return;
  window.__SMARTCARTIFY_CARTDRAWER_V27__ = true;

  const root = document.getElementById("smart-embed-root");
  if (!root) return;// (C) BuyXGetY (bxgyrule)

  // ✅ Turn ON to see table-wise logs in console (set to false for production)
  const DEBUG_TABLES = false;

  // ✅ App proxy path (prefer embed data, fallback to /apps/smart)
  let proxyPath = root.dataset.proxyPath || "/apps/smart";
  proxyPath = String(proxyPath || "").trim();
  if (proxyPath && !/^https?:\/\//i.test(proxyPath) && !proxyPath.startsWith("/")) {
    proxyPath = `/${proxyPath}`;
  }
  if (proxyPath.endsWith("/")) proxyPath = proxyPath.slice(0, -1);
  const customerLoggedIn = String(root.dataset.customerLoggedIn || "false") === "true";
  const customerTags = String(root.dataset.customerTags || "");
  const storefrontLocale =
    String(root.dataset.locale || window.Shopify?.locale || navigator.language || "")
      .trim();

  const buildProxyUrl = (cart = CART) => {
    const base = new URL(proxyPath, window.location.origin);
    const subtotalRupees = (Number(cart?.items_subtotal_price || 0) / priceDivisor()) || 0;
    const quantity = Number(cart?.item_count || 0) || getCartTotalQty();
    base.searchParams.set("subtotal", String(subtotalRupees));
    base.searchParams.set("quantity", String(quantity));
    base.searchParams.set("customer_logged_in", customerLoggedIn ? "true" : "false");
    if (customerTags) base.searchParams.set("customer_tags", customerTags);
    if (storefrontLocale) base.searchParams.set("locale", storefrontLocale);
    // Round to 30-second buckets so the browser reuses its HTTP cache within the same window
    base.searchParams.set("_sc_config_ts", String(Math.floor(Date.now() / 30000) * 30000));
    let abSeed = "";
    try {
      abSeed =
        localStorage.getItem("__SC_AB_SEED__") ||
        `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem("__SC_AB_SEED__", abSeed);
    } catch {
      abSeed = String(Date.now());
    }
    base.searchParams.set("ab_seed", abSeed);
    return `${base.pathname}${base.search}`;
  };

  /* =========================================================
   ✅ DISABLE THEME DEFAULT <cart-drawer> (Dawn / OS2 drawers)
  ========================================================= */
  const disableThemeCartDrawer = () => {
    try {
      const removeThemeDrawers = () => {
        document
          .querySelectorAll(
            "cart-drawer, cart-drawer-items, cart-notification, cart-notification-drawer"
          )
          .forEach((n) => n.remove());
      };

      let cleanupQueued = false;
      const scheduleThemeDrawerCleanup = () => {
        if (cleanupQueued) return;
        cleanupQueued = true;
        requestAnimationFrame(() => {
          cleanupQueued = false;
          removeThemeDrawers();
        });
      };

      const styleId = "smartcartify-disable-theme-cart-drawer";
      if (!document.getElementById(styleId)) {
        const st = document.createElement("style");
        st.id = styleId;
        st.textContent = `
          cart-drawer,
          cart-drawer-items,
          cart-notification,
          cart-notification-drawer{
            display:none !important;
            visibility:hidden !important;
            opacity:0 !important;
            pointer-events:none !important;
          }
            body.sc-cartify-lock-theme-cart .drawer,
            body.sc-cartify-lock-theme-cart .cart-drawer__dialog,
            body.sc-cartify-lock-theme-cart cart-drawer-component dialog{
              display:none !important;
              visibility:hidden !important;
              opacity:0 !important;
              pointer-events:none !important;
            }
        `;
        document.head.appendChild(st);
      }

      removeThemeDrawers();

      document.body.classList.add("sc-cartify-lock-theme-cart");

      if (!window.__SC_DISABLE_DRAWER_OBSERVER__) {
        window.__SC_DISABLE_DRAWER_OBSERVER__ = true;
        const obs = new MutationObserver(scheduleThemeDrawerCleanup);
        obs.observe(document.body || document.documentElement, {
          childList: true,
          subtree: true,
        });
        window.__SC_DISABLE_DRAWER_OBSERVER_REF__ = obs;
      }
    } catch { }
  };
  disableThemeCartDrawer();

  /* =========================================================
   ICON MAP (DB value → SVG)
  ========================================================= */
  const ICONS = {
    sparkles: `<i data-lucide="sparkles" aria-hidden="true"></i>`,
    truck: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><path fill-rule="evenodd" clip-rule="evenodd" d="M4 5.25C4 4.83579 4.33579 4.5 4.75 4.5H11.7414C12.9692 4.5 14.0483 5.31394 14.3856 6.49452L14.8125 7.98862C14.837 8.07452 14.9055 8.1408 14.9922 8.16247L16.6744 8.58303C17.4535 8.77779 18 9.47776 18 10.2808V11.5C18 12.2108 17.5763 12.8226 16.9676 13.0966C16.9889 13.2279 17 13.3627 17 13.5C17 14.8807 15.8807 16 14.5 16C13.1193 16 12 14.8807 12 13.5C12 13.4156 12.0042 13.3322 12.0123 13.25H8.98766C8.99582 13.3322 9 13.4156 9 13.5C9 14.8807 7.88071 16 6.5 16C5.11929 16 4 14.8807 4 13.5C4 13.1444 4.07422 12.8062 4.20802 12.5H3.75C3.33579 12.5 3 12.1642 3 11.75C3 11.3358 3.33579 11 3.75 11H6.25C6.27988 11 6.30935 11.0017 6.33831 11.0051C6.39177 11.0017 6.44568 11 6.5 11C7.19935 11 7.83163 11.2872 8.28536 11.75H12.7146C13.1684 11.2872 13.8007 11 14.5 11C15.1982 11 15.8296 11.2863 16.2832 11.7478C16.4056 11.7316 16.5 11.6268 16.5 11.5V10.2808C16.5 10.1661 16.4219 10.0661 16.3106 10.0382L14.6284 9.61769C14.0217 9.466 13.542 9.00205 13.3702 8.4007L12.9433 6.9066C12.79 6.36997 12.2995 6 11.7414 6H4.75C4.33579 6 4 5.66421 4 5.25ZM6.5 14.5C7.05228 14.5 7.5 14.0523 7.5 13.5C7.5 12.9477 7.05228 12.5 6.5 12.5C5.94772 12.5 5.5 12.9477 5.5 13.5C5.5 14.0523 5.94772 14.5 6.5 14.5ZM14.5 14.5C15.0523 14.5 15.5 14.0523 15.5 13.5C15.5 12.9477 15.0523 12.5 14.5 12.5C13.9477 12.5 13.5 12.9477 13.5 13.5C13.5 14.0523 13.9477 14.5 14.5 14.5Z"></path><path d="M3.25 8C2.83579 8 2.5 8.33579 2.5 8.75C2.5 9.16421 2.83579 9.5 3.25 9.5H8.25C8.66421 9.5 9 9.16421 9 8.75C9 8.33579 8.66421 8 8.25 8H3.25Z"></path></svg>`,
    tag: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><path d="M12.7803 8.28033C13.0732 7.98744 13.0732 7.51256 12.7803 7.21967C12.4874 6.92678 12.0126 6.92678 11.7197 7.21967L7.21967 11.7197C6.92678 12.0126 6.92678 12.4874 7.21967 12.7803C7.51256 13.0732 7.98744 13.0732 8.28033 12.7803L12.7803 8.28033Z"></path><path d="M9 8C9 8.55228 8.55228 9 8 9C7.44772 9 7 8.55228 7 8C7 7.44772 7.44772 7 8 7C8.55228 7 9 7.44772 9 8Z"></path><path d="M12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13Z"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M12.0943 3.51441C11.2723 1.72371 8.72775 1.72371 7.90568 3.51441C7.73011 3.89684 7.28948 4.07936 6.89491 3.93308C5.04741 3.24816 3.24816 5.04741 3.93308 6.89491C4.07936 7.28948 3.89684 7.73011 3.51441 7.90568C1.72371 8.72775 1.72371 11.2723 3.51441 12.0943C3.89684 12.2699 4.07936 12.7105 3.93308 13.1051C3.24816 14.9526 5.04741 16.7519 6.89491 16.0669C7.28948 15.9207 7.73011 16.1032 7.90568 16.4856C8.72775 18.2763 11.2723 18.2763 12.0943 16.4856C12.2699 16.1032 12.7105 15.9207 13.1051 16.0669C14.9526 16.7519 16.7519 14.9526 16.0669 13.1051C15.9207 12.7105 16.1032 12.2699 16.4856 12.0943C18.2763 11.2723 18.2763 8.72775 16.4856 7.90568C16.1032 7.73011 15.9207 7.28948 16.0669 6.89491C16.7519 5.04741 14.9526 3.24816 13.1051 3.93308C12.7105 4.07936 12.2699 3.89684 12.0943 3.51441ZM9.26889 4.14023C9.55587 3.51511 10.4441 3.51511 10.7311 4.14023C11.2341 5.23573 12.4963 5.75856 13.6265 5.33954C14.2715 5.10044 14.8996 5.72855 14.6605 6.3735C14.2415 7.50376 14.7643 8.76597 15.8598 9.26889C16.4849 9.55587 16.4849 10.4441 15.8598 10.7311C14.7643 11.2341 14.2415 12.4963 14.6605 13.6265C14.8996 14.2715 14.2715 14.8996 13.6265 14.6605C12.4963 14.2415 11.2341 14.7643 10.7311 15.8598C10.4441 16.4849 9.55587 16.4849 9.26889 15.8598C8.76597 14.7643 7.50376 14.2415 6.3735 14.6605C5.72855 14.8996 5.10044 14.2715 5.33954 13.6265C5.75856 12.4963 5.23573 11.2341 4.14023 10.7311C3.51511 10.4441 3.51511 9.55587 4.14023 9.26889C5.23573 8.76597 5.75856 7.50376 5.33954 6.3735C5.10044 5.72855 5.72855 5.10044 6.3735 5.33954C7.50376 5.75856 8.76597 5.23573 9.26889 4.14023Z"></path></svg>`,
    gift: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 12"><path fill-rule="evenodd" clip-rule="evenodd" d="M13.5 1.5H8V2.25C8 2.66421 7.66421 3 7.25 3C6.83579 3 6.5 2.66421 6.5 2.25V1.5H2.5C2.22386 1.5 2 1.72386 2 2V5.04268C2.2913 5.14564 2.5 5.42345 2.5 5.75C2.5 6.07655 2.2913 6.35436 2 6.45732V10C2 10.2761 2.22386 10.5 2.5 10.5H6.5V9.5C6.5 9.08579 6.83579 8.75 7.25 8.75C7.66421 8.75 8 9.08579 8 9.5V10.5H13.5C13.7761 10.5 14 10.2761 14 10V6.5H12.75C12.3358 6.5 12 6.16421 12 5.75C12 5.33579 12.3358 5 12.75 5H14V2C14 1.72386 13.7761 1.5 13.5 1.5ZM15.5 5.75V2C15.5 0.895431 14.6046 0 13.5 0H7.25H2.5C1.39543 0 0.5 0.895431 0.5 2V10C0.5 11.1046 1.39543 12 2.5 12H13.5C14.6046 12 15.5 11.1046 15.5 10V5.75ZM6.79746 3.99197C6.45366 3.23561 5.69951 2.75 4.86868 2.75C3.69632 2.75 2.75 3.70396 2.75 4.87184C2.75 6.04319 3.69915 7 4.875 7H5.73284C5.13766 7.50971 4.47708 7.92423 3.89394 8.00754C3.48389 8.06612 3.19896 8.44602 3.25754 8.85607C3.31612 9.26612 3.69602 9.55104 4.10607 9.49246C5.21669 9.3338 6.23422 8.57331 6.90944 7.9624C7.03044 7.85293 7.14433 7.74463 7.25 7.64032C7.35567 7.74463 7.46956 7.85293 7.59056 7.9624C8.26578 8.57331 9.28331 9.3338 10.3939 9.49246C10.804 9.55104 11.1839 9.26612 11.2425 8.85607C11.301 8.44602 11.0161 8.06612 10.6061 8.00754C10.0229 7.92423 9.36234 7.50971 8.76716 7H9.625C10.8009 7 11.75 6.04319 11.75 4.87184C11.75 3.70396 10.8037 2.75 9.63132 2.75C8.80049 2.75 8.04634 3.23561 7.70254 3.99197L7.25 4.98755L6.79746 3.99197ZM5.83524 5.5H4.875C4.53206 5.5 4.25 5.21926 4.25 4.87184C4.25 4.5279 4.52923 4.25 4.86868 4.25C5.1113 4.25 5.33152 4.3918 5.43191 4.61267L5.83524 5.5ZM9.625 5.5H8.66476L9.06809 4.61267C9.16848 4.3918 9.3887 4.25 9.63132 4.25C9.97077 4.25 10.25 4.5279 10.25 4.87184C10.25 5.21926 9.96794 5.5 9.625 5.5Z"></path></svg>`,
    star: `<i data-lucide="star" aria-hidden="true"></i>`,
    fire: `<i data-lucide="flame" aria-hidden="true"></i>`,
    check: `<i data-lucide="check" aria-hidden="true"></i>`,
    lock: `<i data-lucide="lock" aria-hidden="true"></i>`,
    cart: `<i data-lucide="shopping-cart" aria-hidden="true"></i>`,
    shipping: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><path fill-rule="evenodd" clip-rule="evenodd" d="M4 5.25C4 4.83579 4.33579 4.5 4.75 4.5H11.7414C12.9692 4.5 14.0483 5.31394 14.3856 6.49452L14.8125 7.98862C14.837 8.07452 14.9055 8.1408 14.9922 8.16247L16.6744 8.58303C17.4535 8.77779 18 9.47776 18 10.2808V11.5C18 12.2108 17.5763 12.8226 16.9676 13.0966C16.9889 13.2279 17 13.3627 17 13.5C17 14.8807 15.8807 16 14.5 16C13.1193 16 12 14.8807 12 13.5C12 13.4156 12.0042 13.3322 12.0123 13.25H8.98766C8.99582 13.3322 9 13.4156 9 13.5C9 14.8807 7.88071 16 6.5 16C5.11929 16 4 14.8807 4 13.5C4 13.1444 4.07422 12.8062 4.20802 12.5H3.75C3.33579 12.5 3 12.1642 3 11.75C3 11.3358 3.33579 11 3.75 11H6.25C6.27988 11 6.30935 11.0017 6.33831 11.0051C6.39177 11.0017 6.44568 11 6.5 11C7.19935 11 7.83163 11.2872 8.28536 11.75H12.7146C13.1684 11.2872 13.8007 11 14.5 11C15.1982 11 15.8296 11.2863 16.2832 11.7478C16.4056 11.7316 16.5 11.6268 16.5 11.5V10.2808C16.5 10.1661 16.4219 10.0661 16.3106 10.0382L14.6284 9.61769C14.0217 9.466 13.542 9.00205 13.3702 8.4007L12.9433 6.9066C12.79 6.36997 12.2995 6 11.7414 6H4.75C4.33579 6 4 5.66421 4 5.25ZM6.5 14.5C7.05228 14.5 7.5 14.0523 7.5 13.5C7.5 12.9477 7.05228 12.5 6.5 12.5C5.94772 12.5 5.5 12.9477 5.5 13.5C5.5 14.0523 5.94772 14.5 6.5 14.5ZM14.5 14.5C15.0523 14.5 15.5 14.0523 15.5 13.5C15.5 12.9477 15.0523 12.5 14.5 12.5C13.9477 12.5 13.5 12.9477 13.5 13.5C13.5 14.0523 13.9477 14.5 14.5 14.5Z"></path><path d="M3.25 8C2.83579 8 2.5 8.33579 2.5 8.75C2.5 9.16421 2.83579 9.5 3.25 9.5H8.25C8.66421 9.5 9 9.16421 9 8.75C9 8.33579 8.66421 8 8.25 8H3.25Z"></path></svg>`,
    discount: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 12" ><path fill-rule="evenodd" clip-rule="evenodd" d="M13.5 1.5H8V2.25C8 2.66421 7.66421 3 7.25 3C6.83579 3 6.5 2.66421 6.5 2.25V1.5H2.5C2.22386 1.5 2 1.72386 2 2V5.04268C2.2913 5.14564 2.5 5.42345 2.5 5.75C2.5 6.07655 2.2913 6.35436 2 6.45732V10C2 10.2761 2.22386 10.5 2.5 10.5H6.5V9.5C6.5 9.08579 6.83579 8.75 7.25 8.75C7.66421 8.75 8 9.08579 8 9.5V10.5H13.5C13.7761 10.5 14 10.2761 14 10V6.5H12.75C12.3358 6.5 12 6.16421 12 5.75C12 5.33579 12.3358 5 12.75 5H14V2C14 1.72386 13.7761 1.5 13.5 1.5ZM15.5 5.75V2C15.5 0.895431 14.6046 0 13.5 0H7.25H2.5C1.39543 0 0.5 0.895431 0.5 2V10C0.5 11.1046 1.39543 12 2.5 12H13.5C14.6046 12 15.5 11.1046 15.5 10V5.75ZM6.79746 3.99197C6.45366 3.23561 5.69951 2.75 4.86868 2.75C3.69632 2.75 2.75 3.70396 2.75 4.87184C2.75 6.04319 3.69915 7 4.875 7H5.73284C5.13766 7.50971 4.47708 7.92423 3.89394 8.00754C3.48389 8.06612 3.19896 8.44602 3.25754 8.85607C3.31612 9.26612 3.69602 9.55104 4.10607 9.49246C5.21669 9.3338 6.23422 8.57331 6.90944 7.9624C7.03044 7.85293 7.14433 7.74463 7.25 7.64032C7.35567 7.74463 7.46956 7.85293 7.59056 7.9624C8.26578 8.57331 9.28331 9.3338 10.3939 9.49246C10.804 9.55104 11.1839 9.26612 11.2425 8.85607C11.301 8.44602 11.0161 8.06612 10.6061 8.00754C10.0229 7.92423 9.36234 7.50971 8.76716 7H9.625C10.8009 7 11.75 6.04319 11.75 4.87184C11.75 3.70396 10.8037 2.75 9.63132 2.75C8.80049 2.75 8.04634 3.23561 7.70254 3.99197L7.25 4.98755L6.79746 3.99197ZM5.83524 5.5H4.875C4.53206 5.5 4.25 5.21926 4.25 4.87184C4.25 4.5279 4.52923 4.25 4.86868 4.25C5.1113 4.25 5.33152 4.3918 5.43191 4.61267L5.83524 5.5ZM9.625 5.5H8.66476L9.06809 4.61267C9.16848 4.3918 9.3887 4.25 9.63132 4.25C9.97077 4.25 10.25 4.5279 10.25 4.87184C10.25 5.21926 9.96794 5.5 9.625 5.5Z"></path></svg>`,
    free: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 12"><path fill-rule="evenodd" clip-rule="evenodd" d="M13.5 1.5H8V2.25C8 2.66421 7.66421 3 7.25 3C6.83579 3 6.5 2.66421 6.5 2.25V1.5H2.5C2.22386 1.5 2 1.72386 2 2V5.04268C2.2913 5.14564 2.5 5.42345 2.5 5.75C2.5 6.07655 2.2913 6.35436 2 6.45732V10C2 10.2761 2.22386 10.5 2.5 10.5H6.5V9.5C6.5 9.08579 6.83579 8.75 7.25 8.75C7.66421 8.75 8 9.08579 8 9.5V10.5H13.5C13.7761 10.5 14 10.2761 14 10V6.5H12.75C12.3358 6.5 12 6.16421 12 5.75C12 5.33579 12.3358 5 12.75 5H14V2C14 1.72386 13.7761 1.5 13.5 1.5ZM15.5 5.75V2C15.5 0.895431 14.6046 0 13.5 0H7.25H2.5C1.39543 0 0.5 0.895431 0.5 2V10C0.5 11.1046 1.39543 12 2.5 12H13.5C14.6046 12 15.5 11.1046 15.5 10V5.75ZM6.79746 3.99197C6.45366 3.23561 5.69951 2.75 4.86868 2.75C3.69632 2.75 2.75 3.70396 2.75 4.87184C2.75 6.04319 3.69915 7 4.875 7H5.73284C5.13766 7.50971 4.47708 7.92423 3.89394 8.00754C3.48389 8.06612 3.19896 8.44602 3.25754 8.85607C3.31612 9.26612 3.69602 9.55104 4.10607 9.49246C5.21669 9.3338 6.23422 8.57331 6.90944 7.9624C7.03044 7.85293 7.14433 7.74463 7.25 7.64032C7.35567 7.74463 7.46956 7.85293 7.59056 7.9624C8.26578 8.57331 9.28331 9.3338 10.3939 9.49246C10.804 9.55104 11.1839 9.26612 11.2425 8.85607C11.301 8.44602 11.0161 8.06612 10.6061 8.00754C10.0229 7.92423 9.36234 7.50971 8.76716 7H9.625C10.8009 7 11.75 6.04319 11.75 4.87184C11.75 3.70396 10.8037 2.75 9.63132 2.75C8.80049 2.75 8.04634 3.23561 7.70254 3.99197L7.25 4.98755L6.79746 3.99197ZM5.83524 5.5H4.875C4.53206 5.5 4.25 5.21926 4.25 4.87184C4.25 4.5279 4.52923 4.25 4.86868 4.25C5.1113 4.25 5.33152 4.3918 5.43191 4.61267L5.83524 5.5ZM9.625 5.5H8.66476L9.06809 4.61267C9.16848 4.3918 9.3887 4.25 9.63132 4.25C9.97077 4.25 10.25 4.5279 10.25 4.87184C10.25 5.21926 9.96794 5.5 9.625 5.5Z"></path></svg>`,
    bxgy: `<i data-lucide="shopping-bag" aria-hidden="true"></i>`,
  };
  const ICON_SVG_SET = new Set(
    Object.values(ICONS).filter(
      (v) => typeof v === "string" && String(v).trim().toLowerCase().startsWith("<svg")
    )
  );
  const ICON_HTML_SET = new Set(
    Object.values(ICONS).filter(
      (v) => typeof v === "string" && String(v).trim().toLowerCase().startsWith("<i")
    )
  );

  const ensureLucide = () => {
    if (window.lucide) return;
    if (document.getElementById("sc-lucide-js")) return;
    const script = document.createElement("script");
    script.id = "sc-lucide-js";
    script.defer = true;
    script.src = "https://unpkg.com/lucide@latest/dist/umd/lucide.min.js";
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  };
  ensureLucide();

  const STEP_SLOTS = ["step1", "step2", "step3", "step4"];

  let PROXY = null;
  let CART = null;
  let LAST_CART_SIG = "";
  const CART_CACHE_TTL_MS = 1200;
  let cartCacheValue = null;
  let cartCacheTs = 0;
  let cartFetchInFlight = null;
  const lineQtyDesired = new Map();
  const lineQtyInFlight = new Set();

  const invalidateCartCache = () => {
    cartCacheValue = null;
    cartCacheTs = 0;
  };

  let UPSELL_INDEX = 0;
  let UPSELL_TIMER = null;
  let UPSELL_DYNAMIC = null;
  let UPSELL_LOADING = false;
  let openButtonsObserver = null;
  let bindQueued = false;
  let ADD_TO_CART_BAR_STATE = {
    selectedVariantId: null,
    qty: 1,
    messageTimer: null,
    customJsKey: "",
    productKey: "",
  };
  let addToCartBarRenderTimer = null;

  let LAST_DONE = 0;
  let LAST_BXGY_DONE = false;

  // ✅ announcement bar cache
  let ANNOUNCE_MESSAGES = [];
  const ANNOUNCE_EM_LABEL_START = "[[SC_EM_LABEL_START]]";
  const ANNOUNCE_EM_VALUE_START = "[[SC_EM_VALUE_START]]";
  const ANNOUNCE_EM_CODE_START = "[[SC_EM_CODE_START]]";
  const ANNOUNCE_EM_END = "[[SC_EM_END]]";

  // Announcement sources
  let CODE_DISCOUNT_RULES = []; // discountrule with discountCode/discount_code/code field
  let BXGY_RULES = []; // discountrule type=bxgy OR has beforeOfferUnlockMessage/afterOfferUnlockMessage
  let BUYXGETY_RULES = []; // buyxgety rules list OR discountrule type=buyxgety if present

  let discountPopupShownForCode = null;
  let DISCOUNT_PANEL_STYLE_ENABLED = false;
  let OFFER_TABS_ENABLED = true;
  let ACTIVE_DRAWER_TAB = "cart";
  const STATIC_FRONTEND_CART_DESIGN = false;
  const STATIC_CART_DRAWER_DESIGN = false;
  const MANUAL_DISCOUNT_CODE_KEY = "__SC_MANUAL_DISCOUNT_CODE__";

  let __SC_PRIMED_POPUPS__ = false;
  // Free product rewards use the selectable gift popup when a milestone completes.
  const DISABLE_FREE_REWARD_POPUP = false;

  // Auto-add guard + per-key cooldown (prevents retry spam on 429/422)
  let __SC_AUTO_ADDING__ = false;
  const __SC_AUTO_ADD_COOLDOWNS__ = new Set();

  /* =========================================================
   ✅ STORAGE helpers (sessionStorage)
  ========================================================= */
  const scStore = {
    get(k) {
      try {
        return sessionStorage.getItem(k);
      } catch {
        return null;
      }
    },
    set(k, v) {
      try {
        sessionStorage.setItem(k, String(v));
      } catch { }
    },
    del(k) {
      try {
        sessionStorage.removeItem(k);
      } catch { }
    },
  };

  const keyShown = (kind, guardKey) => `__SC_SHOWN_POPUP__:${kind}:${guardKey}`;
  const keyAutoAdded = (kind, guardKey) => `__SC_AUTO_ADDED__:${kind}:${guardKey}`;
  const keyPermFailed = (kind, guardKey) => `__SC_PERM_FAILED__:${kind}:${guardKey}`;
  const keyPendingFreeGift = (guardKey) => `__SC_PENDING_FREE_GIFT__:${guardKey}`;

  /* =========================================================
   HELPERS
  ========================================================= */
  // XSS-safe string helper - escapes HTML entities to prevent injection
  const safe = (v) => {
    if (v == null) return "";
    return String(v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };
  const trimToNull = (v) => {
    const s = String(v ?? "").trim();
    return s ? s : null;
  };

  const DEFAULT_CART_ICON_SVG =
    '<svg class="icon icon-cart cart-lift" width="25" height="24" viewBox="0 0 28 26" fill="none" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M8.57235 25C9.26443 25 9.82548 24.4389 9.82548 23.7468C9.82548 23.0548 9.26443 22.4937 8.57235 22.4937C7.88026 22.4937 7.31921 23.0548 7.31921 23.7468C7.31921 24.4389 7.88026 25 8.57235 25Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>' +
    '<path d="M22.357 25C23.0491 25 23.6101 24.4389 23.6101 23.7468C23.6101 23.0548 23.0491 22.4937 22.357 22.4937C21.6649 22.4937 21.1039 23.0548 21.1039 23.7468C21.1039 24.4389 21.6649 25 22.357 25Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>' +
    '<path d="M1.11658 1H3.62284L6.95618 16.5639C7.07845 17.1339 7.39561 17.6435 7.85306 18.0048C8.3105 18.3662 8.87962 18.5568 9.46244 18.5439H21.7181C22.2885 18.5429 22.8415 18.3475 23.2858 17.9898C23.7301 17.6321 24.0391 17.1335 24.1617 16.5764L26.2294 7.26566H4.96369" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>' +
    "</svg>";

  const POLARIS_CART_ICON_SVGS = {
    cart:
      '<svg class="icon icon-cart cart-lift" width="25" height="24" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">' +
      '<path fill-rule="evenodd" d="M2.5 3.75a.75.75 0 0 1 .75-.75h1.612a1.75 1.75 0 0 1 1.732 1.5h9.656a.75.75 0 0 1 .748.808l-.358 4.653a2.75 2.75 0 0 1-2.742 2.539h-6.351l.093.78a.25.25 0 0 0 .248.22h6.362a.75.75 0 0 1 0 1.5h-6.362a1.75 1.75 0 0 1-1.738-1.543l-1.04-8.737a.25.25 0 0 0-.248-.22h-1.612a.75.75 0 0 1-.75-.75Zm4.868 7.25h6.53a1.25 1.25 0 0 0 1.246-1.154l.296-3.846h-8.667l.595 5Z"></path><path d="M10 17a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path><path d="M15 17a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path>' +
      "</svg>",
    "cart-filled":
      '<svg class="icon icon-cart cart-lift" width="25" height="24" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M3.25 3a.75.75 0 0 0 0 1.5h1.612a.25.25 0 0 1 .248.22l1.04 8.737a1.75 1.75 0 0 0 1.738 1.543h6.362a.75.75 0 0 0 0-1.5h-6.362a.25.25 0 0 1-.248-.22l-.093-.78h6.35a2.75 2.75 0 0 0 2.743-2.54l.358-4.652a.75.75 0 0 0-.748-.808h-9.656a1.75 1.75 0 0 0-1.732-1.5h-1.612Z"></path><path d="M9 18a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"></path><path d="M15 17a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path>' +
      "</svg>",
    "cart-discount":
      '<svg class="icon icon-cart cart-lift" width="25" height="24" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M3.25 3a.75.75 0 0 0 0 1.5h1.612a.25.25 0 0 1 .248.22l1.04 8.737a1.75 1.75 0 0 0 1.738 1.543h6.362a.75.75 0 0 0 0-1.5h-6.362a.25.25 0 0 1-.248-.22l-.093-.78h6.35a2.75 2.75 0 0 0 2.743-2.54l.358-4.652a.75.75 0 0 0-1.496-.116l-.358 4.654a1.25 1.25 0 0 1-1.246 1.154h-6.53l-.768-6.457a1.75 1.75 0 0 0-1.738-1.543h-1.612Z"></path><path d="M9 6.25a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"></path><path d="M13.28 6.03a.75.75 0 0 0-1.06-1.06l-3.5 3.5a.75.75 0 0 0 1.06 1.06l3.5-3.5Z"></path><path d="M14 9.25a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path><path d="M10 17a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path><path d="M15 17a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path>' +
      "</svg>",
    "cart-sale":
      '<svg class="icon icon-cart cart-lift" width="25" height="24" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">' +
      '<path fill-rule="evenodd" d="M4.25 3a.75.75 0 0 0 0 1.5h1.612a.25.25 0 0 1 .248.22l1.04 8.737a1.75 1.75 0 0 0 1.738 1.543h5.362a.75.75 0 0 0 0-1.5h-5.362a.25.25 0 0 1-.248-.22l-.093-.78h5.35a2.75 2.75 0 0 0 2.743-2.54l.358-4.652a.75.75 0 0 0-.748-.808h-8.656a1.75 1.75 0 0 0-1.732-1.5h-1.612Zm9.648 8h-5.53l-.595-5h7.667l-.296 3.846a1.25 1.25 0 0 1-1.246 1.154Z"></path><path d="M2.75 6.5a.75.75 0 0 0 0 1.5h.5a.75.75 0 0 0 0-1.5h-.5Z"></path><path d="M2.75 9.5a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5h-1.5Z"></path><path d="M2 13.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z"></path><path d="M10 17a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path><path d="M15 17a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path>' +
      "</svg>",
    "cart-up":
      '<svg class="icon icon-cart cart-lift" width="25" height="24" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M3.25 3a.75.75 0 0 0 0 1.5h1.612a.25.25 0 0 1 .248.22l1.04 8.737a1.75 1.75 0 0 0 1.738 1.543h6.362a.75.75 0 0 0 0-1.5h-6.362a.25.25 0 0 1-.248-.22l-.093-.78h6.35a2.75 2.75 0 0 0 2.743-2.54l.358-4.652a.75.75 0 0 0-1.496-.116l-.358 4.654a1.25 1.25 0 0 1-1.246 1.154h-6.53l-.768-6.457a1.75 1.75 0 0 0-1.738-1.543h-1.612Z"></path><path d="M12 9.25a.75.75 0 0 1-1.5 0v-3.69l-1.22 1.22a.75.75 0 0 1-1.06-1.06l2.5-2.5a.75.75 0 0 1 1.06 0l2.5 2.5a.75.75 0 0 1-1.06 1.06l-1.22-1.22v3.69Z"></path><path d="M10 17a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path><path d="M15 17a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path>' +
      "</svg>",
  };

  const getCartIconMarkup = () => {
    const settings = PROXY?.styleSettings || {};
    const iconType = String(settings.cartIconType || "default").toLowerCase();
    const iconUrl = trimToNull(settings.cartIconUrl);
    const defaultIcon = String(settings.cartDefaultIcon || "cart").toLowerCase();
    return iconType === "custom" && iconUrl
      ? `<img class="sc-cart-icon-img" src="${safe(iconUrl)}" alt="" loading="lazy">`
      : POLARIS_CART_ICON_SVGS[defaultIcon] || DEFAULT_CART_ICON_SVG;
  };

  const setCartIconMarkup = (node) => {
    if (!node) return;
    node.innerHTML = getCartIconMarkup();
  };

  const refreshCartIconMarkup = () => {
    setCartIconMarkup(drawer?.querySelector?.(".sc-title-icon"));
    document
      .querySelectorAll("[data-smart-cartify-open], [data-smart-cartify-fallback-open]")
      .forEach((btn) => {
        if (!(btn instanceof HTMLElement)) return;
        setCartIconMarkup(btn.querySelector(".svg-wrapper") || btn);
      });
    syncOpenButtonBadge(Number(CART?.item_count || 0));
  };

  const clamp01 = (n) => Math.max(0, Math.min(1, n));

  const to01 = (v) => {
    if (v === true) return 1;
    if (v === false) return 0;
    const n = Number(v);
    if (Number.isFinite(n)) return n ? 1 : 0;
    const s = String(v ?? "").trim().toLowerCase();
    if (["true", "yes", "on", "enabled", "active", "1"].includes(s)) return 1;
    return 0;
  };

  const isValidCssColor = (val) => {
    const v = trimToNull(val);
    if (!v) return false;
    if (String(v).trim().toLowerCase() === "transparent") return false;
    return (
      /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v) ||
      /^(rgb|rgba|hsl|hsla)\(/i.test(v) ||
      /^var\(--.+\)$/i.test(v) ||
      /^[a-z]+$/i.test(v)
    );
  };

  const isValidCssBackground = (val) => {
    const v = trimToNull(val);
    if (!v) return false;
    if (isValidCssColor(v)) return true;
    if (
      /^(linear-gradient|radial-gradient|conic-gradient|repeating-linear-gradient|repeating-radial-gradient)\(/i.test(
        v
      )
    )
      return true;
    if (/^var\(--.+\)$/i.test(v)) return true;
    if (/^url\(/i.test(v)) return true;
    return false;
  };

  const getFirstColorFromBackground = (val) => {
    const v = trimToNull(val);
    if (!v) return null;
    if (isValidCssColor(v)) return v;
    const m = String(v).match(
      /(#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\([^)]+\)|hsla?\([^)]+\))/i
    );
    return m ? m[1] : null;
  };

  const isValidCssLen = (val) => {
    const v = trimToNull(val);
    if (!v) return false;
    return (
      /^-?\d+(\.\d+)?(px|rem|em|vw|vh|%)$/i.test(v) || /^\d+(\.\d+)?$/.test(v)
    );
  };

  const normalizeLen = (val, fallbackPx) => {
    const v = trimToNull(val);
    if (!v) return fallbackPx;
    if (/^\d+(\.\d+)?$/.test(v)) return `${v}px`;
    if (isValidCssLen(v)) return v;
    return fallbackPx;
  };

  const buildCssUrl = (value) => {
    const raw = trimToNull(value);
    if (!raw) return null;
    const escaped = raw.replace(/"/g, '\\"');
    return `url("${escaped}")`;
  };

  const pick = (obj, keys, fallback = null) => {
    for (const k of keys) {
      const v = obj?.[k];
      const t = trimToNull(v);
      if (t != null) return t;
    }
    return fallback;
  };

  const pickColor = (obj, keys, fallback = null) => {
    const v = pick(obj, keys, null);
    if (v && isValidCssColor(v)) return v;
    return fallback;
  };

  const pickBackground = (obj, keys, fallback = null) => {
    const v = pick(obj, keys, null);
    if (v && isValidCssBackground(v)) return v;
    return fallback;
  };

  const pickNum = (obj, keys, fallback = null) => {
    for (const k of keys) {
      const raw = obj?.[k];
      const n = Number(raw);
      if (Number.isFinite(n)) return n;
      const t = trimToNull(raw);
      if (t && /^-?\d+(\.\d+)?$/.test(t)) return Number(t);
    }
    return fallback;
  };

  const pickTextAny = (obj, keys, fallback = "") => {
    for (const k of keys) {
      const v = obj?.[k];
      const t = trimToNull(v);
      if (t != null) return t;
    }
    return fallback;
  };

  const extractMessageText = (value) => {
    const raw = trimToNull(value);
    if (!raw) return "";
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return (
          trimToNull(parsed.text) ||
          trimToNull(parsed.message) ||
          trimToNull(parsed.title) ||
          raw
        );
      }
    } catch { }
    return raw;
  };

  const pickMessageTextAny = (obj, keys, fallback = "") => {
    for (const k of keys) {
      const text = extractMessageText(obj?.[k]);
      if (text) return text;
    }
    return fallback;
  };

  const isQuantityTriggerRule = (rule) =>
    String(rule?.triggerType ?? rule?.trigger_type ?? "amount").trim().toLowerCase() ===
    "quantity" ||
    (
      Number(rule?.xQty ?? rule?.x_qty ?? rule?.x ?? rule?.buyQty ?? rule?.buy_qty ?? rule?.buy) > 0 &&
      Number(rule?.yQty ?? rule?.y_qty ?? rule?.y ?? rule?.getQty ?? rule?.get_qty ?? rule?.get) > 0 &&
      !(Number(rule?.minPurchase ?? rule?.min_purchase ?? rule?.minSubtotal ?? rule?.min_subtotal) > 0)
    );

  const normalizeBxgyScope = (scope) => {
    const value = String(scope || "store").trim().toLowerCase();
    if (["product", "products", "specific_products", "specific-products"].includes(value)) {
      return "product";
    }
    if (["collection", "collections", "specific_collections", "specific-collections"].includes(value)) {
      return "collection";
    }
    return "store";
  };

  const getProgressBefore = (rule) => {
    const quantityKeys = [
      "quantityProgressTextBefore",
      "quantity_progress_text_before",
      "progressTextBeforeQuantity",
      "progress_text_before_quantity",
    ];
    const amountKeys = [
      "beforeText",
      "before_text",
      "beforeMessage",
      "before_message",
      "beforeOfferUnlockMessage",
      "before_offer_unlock_message",
      "progressTextBefore",
      "progress_text_before",
      "progressBefore",
      "progress_before",
      "beforeProgressText",
      "before_progress_text",
    ];
    return pickMessageTextAny(rule, isQuantityTriggerRule(rule) ? [...quantityKeys, ...amountKeys] : amountKeys);
  };

  const getProgressAfter = (rule) => {
    const quantityKeys = [
      "quantityProgressTextAfter",
      "quantity_progress_text_after",
      "progressTextAfterQuantity",
      "progress_text_after_quantity",
    ];
    const amountKeys = [
      "afterText",
      "after_text",
      "afterMessage",
      "after_message",
      "afterOfferUnlockMessage",
      "after_offer_unlock_message",
      "progressTextAfter",
      "progress_text_after",
      "progressAfter",
      "progress_after",
      "afterProgressText",
      "after_progress_text",
    ];
    return pickMessageTextAny(rule, isQuantityTriggerRule(rule) ? [...quantityKeys, ...amountKeys] : amountKeys);
  };

  const getProgressBelow = (rule) =>
    pickTextAny(rule, [
      "progressTextBelow",
      "progress_text_below",
      "progressBelow",
      "progress_below",
      "belowProgressText",
      "below_progress_text",
      "milestoneLabel",
      "milestone_label",
      "label",
      "stepLabel",
      "step_label",
    ]);

  // Zero-decimal currencies: Shopify returns prices in the smallest unit (e.g. ¥150 → 150, not 15000)
  const ZERO_DECIMAL_CURRENCIES = new Set([
    "BIF", "CLP", "GNF", "ISK", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV",
    "XAF", "XOF", "XPF", "HUF", "TWD",
  ]);
  const priceDivisor = (currency = null) => {
    const code = String(
      currency || window.Shopify?.currency?.active || ""
    ).toUpperCase().trim();
    return ZERO_DECIMAL_CURRENCIES.has(code) ? 1 : 100;
  };

  // Currency formatting - uses shop currency from Shopify.locale or defaults to shop's setting
  const formatMoney = (cents, currency = null) => {
    const shopCurrency = currency || window.Shopify?.currency?.active || "USD";
    const amount = (Number(cents) || 0) / priceDivisor(shopCurrency);
    const locale = window.Shopify?.locale || navigator.language || "en-US";
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: shopCurrency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      // Fallback for unsupported currencies
      return `${shopCurrency} ${Math.round(amount)}`;
    }
  };

  const normalizeCurrencyCode = (currency = null) => {
    const raw =
      trimToNull(currency) ||
      trimToNull(CART?.currency) ||
      trimToNull(window.Shopify?.currency?.active) ||
      "USD";
    return String(raw).toUpperCase();
  };

  const getCartSignature = (cart) => {
    const items = Array.isArray(cart?.items) ? cart.items : [];
    const itemSig = items
      .map((it) => [
        it?.id || it?.variant_id || "",
        Number(it?.quantity) || 0,
        Number(it?.final_line_price) || 0,
      ])
      .join("|");
    return [
      Number(cart?.item_count) || 0,
      Number(cart?.items_subtotal_price) || 0,
      Number(cart?.total_discount) || 0,
      itemSig,
    ].join("::");
  };

  const stripCurrencySymbolIfCodePresent = (text, currency = null) => {
    const out = String(text ?? "");
    if (!out) return out;
    const code = normalizeCurrencyCode(currency);
    if (!new RegExp(`\\b${code}\\b`, "i").test(out)) return out;
    return out
      .replace(/([$€£¥₹₩₽₺₫₴₦฿₱₲₵₡])\s*(\d)/g, "$2")
      .replace(/(\d)\s*([$€£¥₹₩₽₺₫₴₦฿₱₲₵₡])/g, "$1");
  };

  const formatMoneyWithCode = (cents, currency = null) => {
    const code = normalizeCurrencyCode(currency);
    const amount = (Number(cents) || 0) / priceDivisor(code);
    const locale = window.Shopify?.locale || navigator.language || "en-US";
    try {
      const numberOnly = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
      return `${numberOnly} ${code}`;
    } catch {
      const fallback = String(Math.round(amount * 100) / 100);
      return `${fallback} ${code}`;
    }
  };

  const isRuleEnabled = (rule) => {
    if (!rule) return false;

    const candidates = [
      rule.enabled,
      rule.enable,
      rule.isEnabled,
      rule.is_enabled,
      rule.active,
      rule.isActive,
      rule.status,
      rule.publish,
      rule.published,
      rule.isPublished,
      rule.enableStatus,
      rule.enable_status,
      rule.is_enable,
      rule.isEnable,
    ];

    const hasAny = candidates.some(
      (x) => x !== undefined && x !== null && String(x).trim() !== ""
    );
    if (!hasAny) return true;

    if (typeof rule.status === "string") {
      const st = rule.status.trim().toLowerCase();
      if (["active", "enabled", "on", "published", "true", "1"].includes(st))
        return true;
      if (["inactive", "disabled", "off", "draft", "false", "0"].includes(st))
        return false;
    }

    for (const c of candidates) {
      if (c === undefined || c === null) continue;
      if (to01(c) === 1) return true;
    }
    return false;
  };

  const pickIconKeyFromRule = (rule) => {
    if (!rule) return null;
    const candidates = [
      rule.icon,
      rule.iconChoice,
      rule.icon_choice,
      rule.iconKey,
      rule.iconName,
      rule.ruleIcon,
      rule.emoji,
      rule.milestoneIcon,
    ].filter(Boolean);

    const hit = candidates.find((x) => ICONS[String(x).toLowerCase()]);
    return hit ? String(hit).toLowerCase() : null;
  };

  const normalizeStepSlotFromAny = (rule) => {
    if (!rule) return null;

    const directCandidates = [
      rule.stepSlot,
      rule.step_slot,
      rule.stepNo,
      rule.step_no,
      rule.stepNumber,
      rule.step_number,
      rule.stepPosition,
      rule.step_position,
      rule.position,
      rule.sortOrder,
      rule.sort_order,
      rule.order,
      rule.cartStepName,
      rule.step,
    ];

    for (const c of directCandidates) {
      if (c == null) continue;
      const s0 = String(c).trim().toLowerCase();
      if (!s0) continue;

      const s = s0.replace(/[_-]/g, "").replace(/\s+/g, "");

      if (STEP_SLOTS.includes(s0)) return s0;
      if (STEP_SLOTS.includes(s)) return s;

      const m1 = s.match(/^step0*([1-4])$/);
      if (m1) return `step${m1[1]}`;

      const cartStepMatch = s.match(/^cartstep0*([1-4])$/);
      if (cartStepMatch) return `step${cartStepMatch[1]}`;

      const anyStepMatch = s0.match(/\bstep\s*([1-4])\b/);
      if (anyStepMatch) return `step${anyStepMatch[1]}`;

      const n = Number(s);
      if (Number.isFinite(n) && n >= 1 && n <= 4) return `step${n}`;
    }

    return null;
  };

  const getGoalRupees = (type, rule) => {
    if (!rule) return null;
    let raw = null;

    if (type === "shipping")
      raw =
        rule?.minSubtotal ??
        rule?.min_subtotal ??
        rule?.minAmount ??
        rule?.min_amount;
    if (type === "discount")
      raw =
        rule?.minPurchase ??
        rule?.min_purchase ??
        rule?.minSubtotal ??
        rule?.min_subtotal ??
        rule?.minAmount ??
        rule?.min_amount ??
        rule?.goal ??
        rule?.goalAmount ??
        rule?.goal_amount;
    if (type === "free")
      raw =
        rule?.minPurchase ??
        rule?.min_purchase ??
        rule?.minAmount ??
        rule?.min_amount;
    if (type === "bxgy" || type === "buyxgety")
      raw =
        rule?.minPurchase ??
        rule?.min_purchase ??
        rule?.minAmount ??
        rule?.min_amount;

    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  const getGoalQuantity = (rule) => {
    const n = Number(
      rule?.minQuantity ??
      rule?.min_quantity ??
      rule?.quantityRequired ??
      rule?.xQty ??
      rule?.x_qty ??
      rule?.x ??
      rule?.buyQty ??
      rule?.buy_qty ??
      rule?.buy
    );
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const formatQuantityGoal = (value) => {
    const qty = Math.max(0, Math.ceil(Number(value) || 0));
    return `${qty} ${qty === 1 ? "item" : "items"}`;
  };

  const getRuleProgressMetric = (type, rule) => {
    if (isQuantityTriggerRule(rule)) {
      const goal = getGoalQuantity(rule);
      return {
        metric: "quantity",
        goal,
        current: Math.max(0, Number(CART?.item_count || 0) || getCartTotalQty()),
      };
    }
    const goal = getGoalRupees(type, rule);
    return {
      metric: "amount",
      goal,
      current: (Number(CART?.items_subtotal_price || 0) / priceDivisor()) || 0,
    };
  };

  const getDiscountValueTokens = (rule) => {
    const raw = trimToNull(rule?.value ?? rule?.discountValue ?? rule?.discount_value ?? "");
    if (!raw) return { value: "", valueWithOff: "" };

    const typeHint = String(
      rule?.valueType ??
      rule?.discountType ??
      rule?.discount_type ??
      rule?.amountType ??
      rule?.rewardType ??
      rule?.reward_type ??
      ""
    )
      .trim()
      .toLowerCase();
    const numeric = Number(String(raw).replace(/[^0-9.]/g, ""));
    const hasPercentToken =
      /%|percent|percentage|rate/.test(String(raw).toLowerCase()) ||
      /percent|percentage|rate/.test(typeHint);
    const hasAmountToken = /fixed|flat|amount/.test(typeHint);
    const isPercent =
      hasPercentToken ||
      (!hasAmountToken && Number.isFinite(numeric) && numeric > 0 && numeric <= 100);

    if (isPercent && Number.isFinite(numeric) && numeric > 0) {
      const percent = String(numeric);
      return {
        value: safe(`${percent}%`),
        valueWithOff: safe(`${percent}% off`),
      };
    }

    if (hasAmountToken && Number.isFinite(numeric) && numeric > 0) {
      const money = formatMoney(
        Math.round(numeric * priceDivisor(CART?.currency)),
        CART?.currency
      );
      return {
        value: safe(money),
        valueWithOff: safe(`${money} off`),
      };
    }

    const value = String(raw).replace(/\s*off\b/gi, "").trim();
    const valueWithOff = /off\b/i.test(raw) ? raw : `${raw} off`;
    return {
      value: safe(value),
      valueWithOff: safe(valueWithOff),
    };
  };

  const normalizeDiscountProgressText = (text) => {
    let out = String(text ?? "");
    if (!out) return "";
    out = out.replace(/(\d+(?:\.\d+)?)\s*%\s*off\s*%\s*off\b/gi, "$1% off");
    out = out.replace(/(\d+(?:\.\d+)?)\s+off\s*%\s*off\b/gi, "$1% off");
    out = out.replace(/(\d+(?:\.\d+)?)\s*%\s*%\s*off\b/gi, "$1% off");
    out = out.replace(/(\d+(?:\.\d+)?)\s+off\s*%/gi, "$1%");
    out = out.replace(/\boff\s+off\b/gi, "off");
    return out.replace(/\s{2,}/g, " ").trim();
  };

  const amountToCurrencyMinorUnits = (amount, currency = CART?.currency) =>
    Math.max(0, Math.round(Number(amount || 0) * priceDivisor(currency)));

  const goalToCents = (goalRupees) => {
    if (goalRupees == null) return null;
    return amountToCurrencyMinorUnits(goalRupees);
  };

  const replaceTokens = (text, map, options = {}) => {
    const { boldTokens = false, tokenWrap = null } = options || {};
    let out = safe(text);
    if (!out) return "";
    Object.keys(map || {}).forEach((k) => {
      const val = map[k] == null ? "" : String(map[k]);
      const re = new RegExp(`{{\\s*${k}\\s*}}`, "gi");
      out = out.replace(re, () => {
        if (!val) return "";
        if (typeof tokenWrap === "function") return tokenWrap(val, k);
        return boldTokens
          ? `<strong class="sc-goal-bold">${val}</strong>`
          : val;
      });
    });
    return out;
  };

  const renderMilestoneIcon = (iconValue) => {
    const icon = String(iconValue ?? "").trim();
    if (!icon) {
      const fallback = ICONS.sparkles;
      if (ICON_HTML_SET.has(fallback)) return `<span class="sc-dot-html">${fallback}</span>`;
      if (ICON_SVG_SET.has(fallback)) return `<span class="sc-dot-svg">${fallback}</span>`;
      return `<span class="sc-dot-emoji">${safe(fallback)}</span>`;
    }
    if (ICON_SVG_SET.has(icon)) return `<span class="sc-dot-svg">${icon}</span>`;
    if (ICON_HTML_SET.has(icon)) return `<span class="sc-dot-html">${icon}</span>`;
    return `<span class="sc-dot-emoji">${safe(icon)}</span>`;
  };

  const replaceProgressText = ({
    text,
    type,
    rule,
    subtotalRupees,
    useRemainingForGoal,
    boldTokens = false,
    tokenWrap = null,
    tokenOverrides = {},
  }) => {
    const progressMetric = getRuleProgressMetric(type, rule);
    const isQuantity = progressMetric.metric === "quantity";
    const goalValue = progressMetric.goal;
    const currentValue = isQuantity
      ? progressMetric.current
      : Number(subtotalRupees || progressMetric.current || 0);
    const remainingValue =
      goalValue == null ? null : Math.max(0, Number(goalValue) - currentValue);

    const goalText =
      goalValue == null
        ? ""
        : isQuantity
          ? formatQuantityGoal(goalValue)
          : formatMoney(amountToCurrencyMinorUnits(goalValue), CART?.currency);
    const remainingText =
      remainingValue == null
        ? ""
        : isQuantity
          ? formatQuantityGoal(remainingValue)
          : formatMoney(amountToCurrencyMinorUnits(remainingValue), CART?.currency);

    const goalToken = useRemainingForGoal ? remainingText : goalText;

    const discountTokens =
      type === "discount"
        ? getDiscountValueTokens(rule)
        : { value: "", valueWithOff: "" };
    const discountCode = safe(
      rule?.discountCode ?? rule?.discount_code ?? rule?.code ?? ""
    );

    const xQty = safe(rule?.xQty ?? rule?.x_qty ?? rule?.x ?? rule?.buyQty ?? rule?.buy_qty ?? rule?.buy ?? "");
    const yQty = safe(rule?.yQty ?? rule?.y_qty ?? rule?.y ?? rule?.getQty ?? rule?.get_qty ?? rule?.get ?? "");

    const tokenMap = {
      goal: goalToken,
      amount: goalToken,
      remaining: remainingText,
      goal_amount: goalText,
      discount: discountTokens.value,
      discount_value: discountTokens.value,
      discount_value_with_off: discountTokens.valueWithOff,
      discount_code: discountCode,
      x: xQty,
      y: yQty,
      ...(tokenOverrides || {}),
    };

    const replaced = replaceTokens(
      text,
      tokenMap,
      { boldTokens, tokenWrap }
    );
    const normalized =
      type === "discount" ? normalizeDiscountProgressText(replaced) : replaced;
    return stripCurrencySymbolIfCodePresent(normalized, CART?.currency);
  };

  const renderGoalMessageHtml = (message) => {
    const raw = String(message ?? "");
    if (!raw) return "";
    if (raw.includes('<strong class="sc-goal-bold">')) return raw;

    return safe(raw).replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_match, inner) => {
      const value = String(inner || "").trim();
      return value ? `<strong class="sc-goal-bold">${value}</strong>` : "";
    });
  };

  const getProxyArray = (proxy, keys) => {
    for (const k of keys) {
      const v = proxy?.[k];
      if (Array.isArray(v)) return v;
    }
    return [];
  };

  const parseArrayish = (value) => {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const normalizeCartGoalRewardType = (goal) => {
    const type = String(goal?.type ?? goal?.Type ?? goal?.rewardType ?? "").trim().toLowerCase();
    if (["gift", "free", "free_product", "free-product", "product"].includes(type)) return "free";
    if (["shipping", "free_shipping", "free-shipping"].includes(type)) return "shipping";
    return "discount";
  };

  const getCartGoalBonusProductIds = (goal) => {
    const products = Array.isArray(goal?.bonusProducts)
      ? goal.bonusProducts
      : parseArrayish(goal?.bonusProducts);
    const rawIds =
      goal?.bonusProductIds ??
      goal?.bonus_product_ids ??
      goal?.bonusProductIDs ??
      goal?.productIds ??
      [];
    const parsed = Array.isArray(rawIds)
      ? rawIds
      : parseArrayish(rawIds);
    const stringFallbackIds =
      !parsed.length && typeof rawIds === "string" && trimToNull(rawIds)
        ? [rawIds]
        : [];
    const fallback =
      trimToNull(goal?.bonusProductId) ||
      trimToNull(goal?.bonus_product_id) ||
      trimToNull(goal?.bonus) ||
      null;
    const productIds = products
      .map((product) => trimToNull(product?.id || product?.productId))
      .filter(Boolean);
    return [...new Set([...parsed, ...stringFallbackIds, ...productIds, fallback].map(trimToNull).filter(Boolean))];
  };

  const getCartGoalBonusProducts = (goal) => {
    const products = Array.isArray(goal?.bonusProducts)
      ? goal.bonusProducts
      : parseArrayish(goal?.bonusProducts);
    const normalizedProducts = products
      .map((product) => {
        const id = trimToNull(product?.id || product?.productId);
        if (!id) return null;
        return {
          ...product,
          id,
          productId: id,
          title: trimToNull(product?.title) || "",
          image: trimToNull(product?.image) || trimToNull(product?.featuredImage?.url) || "",
          variantId: trimToNull(product?.variantId) || trimToNull(product?.variant_id) || "",
          variantTitle: trimToNull(product?.variantTitle) || trimToNull(product?.variant_title) || "",
        };
      })
      .filter(Boolean);
    console.info("[SmartCartify] cart goal bonusProducts for popup:", {
      goalId: goal?.id || null,
      goalTitle: goal?.title || goal?.menuLabel || null,
      products: normalizedProducts,
    });
    return normalizedProducts;
  };

  const parseIdArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(String);
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  };

  const getUpsellSettings = () => {
    const raw = PROXY?.upsellSettings || {};
    return {
      enabled: to01(raw.enabled) === 1,
      showAsSlider: to01(raw.showAsSlider) === 1,
      autoplay: to01(raw.autoplay) === 1,
      recommendationMode: String(raw.recommendationMode || "auto").toLowerCase(),
      sectionTitle: pickTextAny(raw, ["sectionTitle", "title"], "Recommended Products"),
      buttonText: pickTextAny(raw, ["buttonText"], "add"),
      buttonColor: pickColor(raw, ["buttonColor", "button"], "#111111"),
      buttonTextColor: pickColor(raw, ["buttonTextColor", "buttonLabelColor", "button_text_color"], "#ffffff"),
      backgroundColor: pickBackground(raw, ["backgroundColor", "background"], null),
      textColor: pickColor(raw, ["textColor", "text"], "#e2e8f0"),
      borderColor: pickColor(raw, ["borderColor", "border"], "#e2e8f0"),
      arrowColor: pickColor(raw, ["arrowColor", "arrow"], "#111827"),
      selectedProductIds: parseIdArray(raw.selectedProductIds),
      selectedCollectionIds: parseIdArray(raw.selectedCollectionIds),
    };
  };

  const getVariantOptionsFromItem = (item) =>
    Array.isArray(item?.variantOptions)
      ? item.variantOptions
      : Array.isArray(item?.options_with_values)
        ? item.options_with_values
        : Array.isArray(item?.optionsWithValues)
          ? item.optionsWithValues
          : [];

  const getPreferredVariantFromItem = (item) => {
    const options = getVariantOptionsFromItem(item);
    if (!options.length) return null;
    const sizeOpt = options.find(
      (opt) => String(opt?.name || "").trim().toLowerCase() === "size"
    );
    const pickOpt = sizeOpt || options[0];
    if (!pickOpt?.name && !pickOpt?.value) return null;
    return {
      name: String(pickOpt?.name || "Option"),
      value: String(pickOpt?.value || ""),
    };
  };

  const normalizeImage = (value) =>
    typeof value === "string" ? value : value?.url || value?.src || "";

  const getUpsellImageFromItem = (item) =>
    normalizeImage(item?.image) ||
    normalizeImage(item?.featured_image) ||
    normalizeImage(item?.product_image) ||
    normalizeImage(item?.image_url) ||
    "";

  const getUpsellImageFromProduct = (product) =>
    normalizeImage(product?.featured_image) ||
    normalizeImage(product?.images?.[0]) ||
    "";

  const normalizeVariantId = (value) => {
    if (value == null) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    if (/^\d+$/.test(raw)) return raw;
    const tryExtract = (str) => {
      const m = String(str).match(/\/(\d+)\s*$/);
      return m ? m[1] : null;
    };
    const direct = tryExtract(raw);
    if (direct) return direct;
    if (/%2F|%3A/i.test(raw)) {
      try {
        const decoded = decodeURIComponent(raw);
        const hit = tryExtract(decoded);
        if (hit) return hit;
      } catch { }
    }
    try {
      const decoded = atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
      const hit = tryExtract(decoded);
      if (hit) return hit;
    } catch { }
    return null;
  };

  const isVariantAvailable = (variant, product = null) => {
    if (variant) {
      const direct =
        variant.available ??
        variant.available_for_sale ??
        variant.availableForSale ??
        variant.isAvailable;
      if (direct === false) return false;
      if (direct === true) return true;

      const inv =
        variant.inventory_quantity ??
        variant.inventoryQuantity ??
        variant.qtyAvailable ??
        variant.quantityAvailable;
      if (inv != null && Number.isFinite(Number(inv))) return Number(inv) > 0;
    }

    if (product) {
      const pAvail =
        product.available ??
        product.available_for_sale ??
        product.availableForSale ??
        product.isAvailable;
      if (pAvail === false) return false;
      if (pAvail === true) return true;
    }

    return true;
  };

  const normalizeProxyVariants = (variants) =>
    (Array.isArray(variants) ? variants : []).map((v) => {
      const opts = Array.isArray(v?.variantOptions) ? v.variantOptions : [];
      const out = { ...v };
      opts.forEach((opt, idx) => {
        const key = `option${idx + 1}`;
        if (out[key] == null && opt?.value != null) out[key] = opt.value;
      });
      return out;
    });

  const pickOptionIndexFromVariantOptions = (options) => {
    const opts = Array.isArray(options) ? options : [];
    if (!opts.length) return 0;
    const sizeIndex = opts.findIndex(
      (opt) => String(opt?.name || "").trim().toLowerCase() === "size"
    );
    return sizeIndex >= 0 ? sizeIndex : 0;
  };

  const getOptionValuesFromVariants = (variants, optionIndex) => {
    const values = (Array.isArray(variants) ? variants : [])
      .map((v) => {
        const rawOpts = Array.isArray(v?.variantOptions) ? v.variantOptions : [];
        const opt = rawOpts[optionIndex];
        const val = opt?.value ?? v?.[`option${optionIndex + 1}`];
        return val != null ? String(val) : null;
      })
      .filter((v) => v && String(v).trim() !== "");
    return Array.from(new Set(values));
  };

  const priceToCents = (value) => {
    if (value == null) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    if (raw.includes(".")) return Math.round(n * 100);
    if (Number.isInteger(n) && n >= 1000) return n;
    return Math.round(n * 100);
  };

  const normalizeCents = (value) => {
    if (value == null) return null;
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : null;
  };

  const inferPriceIsCents = (value) => {
    if (value == null) return false;
    const raw = String(value).trim();
    if (!raw) return false;
    if (/[.,]/.test(raw)) return false;
    const n = Number(raw);
    return Number.isFinite(n) && Number.isInteger(n);
  };

  const priceToCentsFromItem = (value, item) => {
    if (value == null) return null;
    if (item?.priceIsCents) {
      return normalizeCents(value);
    }
    return priceToCents(value);
  };

  const buildUpsellItemsFromProxyProducts = (products, currency) => {
    const list = Array.isArray(products) ? products : [];
    return list.map((p) => {
      const variantsRaw = Array.isArray(p?.variants) ? p.variants : [];
      const variants = normalizeProxyVariants(variantsRaw);
      const firstVariant = variants[0] || null;
      const optionSeed = Array.isArray(firstVariant?.variantOptions)
        ? firstVariant.variantOptions
        : [];
      const optionIndex = pickOptionIndexFromVariantOptions(optionSeed);
      const productOptions = Array.isArray(p?.options) ? p.options : [];
      const optionName = String(
        optionSeed?.[optionIndex]?.name ||
        productOptions?.[optionIndex]?.name ||
        optionSeed?.[0]?.name ||
        productOptions?.[0]?.name ||
        "Option"
      );
      const optionValue = optionSeed?.[optionIndex]?.value ?? "";
      const optionValuesFromVariants = getOptionValuesFromVariants(variants, optionIndex);
      const optionValuesFromProduct =
        Array.isArray(productOptions?.[optionIndex]?.values) &&
          productOptions[optionIndex].values.length
          ? productOptions[optionIndex].values
          : [];
      const optionValues =
        optionValuesFromVariants.length > 0
          ? optionValuesFromVariants
          : optionValuesFromProduct;
      const hasVariants = variants.length > 1 && !Boolean(p?.has_only_default_variant);
      const size = hasVariants
        ? {
          name: optionName || "Option",
          value: optionValue ? String(optionValue) : "",
        }
        : null;
      const primaryVariantId =
        p?.variantId ||
        firstVariant?.id ||
        firstVariant?.variantId ||
        firstVariant?.admin_graphql_api_id ||
        null;

      const priceRaw = p?.variantPrice ?? firstVariant?.price ?? null;
      const priceIsCents = false;
      const priceCents = priceToCents(priceRaw);
      return {
        title: safe(p?.title || "Product"),
        price:
          priceCents != null ? formatMoney(priceCents, currency) : formatMoney(2500, currency),
        priceCents: priceCents != null ? priceCents : null,
        priceIsCents,
        image: normalizeImage(p?.image) || "",
        size,
        variantId: primaryVariantId,
        hasVariants,
        variants,
        optionIndex,
        optionName,
        optionValues,
      };
    });
  };

  const buildUpsellItemsFromProxyCollections = (collections, currency) => {
    const list = Array.isArray(collections) ? collections : [];
    const products = list.flatMap((c) =>
      Array.isArray(c?.products) ? c.products : []
    );
    const seen = new Set();
    const deduped = [];
    products.forEach((p) => {
      const key = String(p?.id || p?.variantId || p?.title || "");
      if (!key || seen.has(key)) return;
      seen.add(key);
      deduped.push(p);
    });
    return buildUpsellItemsFromProxyProducts(deduped, currency);
  };

  const getOrderedSelectedProducts = (settings) => {
    const list = Array.isArray(PROXY?.upsellSelectedProducts)
      ? PROXY.upsellSelectedProducts
      : [];
    if (!list.length) return [];
    const desired = Array.isArray(settings?.selectedProductIds)
      ? settings.selectedProductIds
      : [];
    const desiredIds = desired
      .map((id) => gidToId(id) || (id ? String(id) : null))
      .filter(Boolean);
    if (!desiredIds.length) return list;
    const map = new Map(list.map((p) => [String(p?.id || ""), p]));
    const ordered = desiredIds
      .map((id) => map.get(String(id)))
      .filter(Boolean);
    return ordered.length ? ordered : list;
  };

  const getOrderedSelectedCollections = (settings) => {
    const list = Array.isArray(PROXY?.upsellSelectedCollections)
      ? PROXY.upsellSelectedCollections
      : [];
    if (!list.length) return [];
    const desired = Array.isArray(settings?.selectedCollectionIds)
      ? settings.selectedCollectionIds
      : [];
    const desiredIds = desired
      .map((id) => gidToId(id) || (id ? String(id) : null))
      .filter(Boolean);
    if (!desiredIds.length) return list;
    const map = new Map(list.map((c) => [String(c?.id || ""), c]));
    const ordered = desiredIds
      .map((id) => map.get(String(id)))
      .filter(Boolean);
    return ordered.length ? ordered : list;
  };

  const buildUpsellItems = (settings) => {
    const items = Array.isArray(CART?.items) ? CART.items : [];
    const currency = normalizeCurrencyCode();

    const mapFromCart = (it) => {
      const qty = Math.max(1, Number(it?.quantity || 1));
      const unitCents =
        Number(it?.final_line_price || it?.price || 0) / qty || 0;
      const options = getVariantOptionsFromItem(it);
      const hasVariants =
        !!options.length && !Boolean(it?.product_has_only_default_variant);
      return {
        title: safe(it?.product_title || "Product"),
        price: formatMoney(unitCents, currency),
        priceCents: Number.isFinite(unitCents) ? Math.max(0, Math.round(unitCents)) : null,
        priceIsCents: true,
        image: getUpsellImageFromItem(it),
        size: hasVariants ? getPreferredVariantFromItem(it) : null,
        variantId: it?.variant_id || it?.id || null,
        hasVariants,
      };
    };

    const cartItems = items.map(mapFromCart);

    if (settings.recommendationMode === "auto") {
      if (Array.isArray(UPSELL_DYNAMIC) && UPSELL_DYNAMIC.length) {
        return UPSELL_DYNAMIC.slice(0, 5);
      }
      return cartItems.length ? cartItems : [];
    }

    if (settings.recommendationMode === "product") {
      const selectedProducts = getOrderedSelectedProducts(settings);
      if (selectedProducts.length && settings.selectedProductIds.length) {
        return buildUpsellItemsFromProxyProducts(selectedProducts, currency).slice(
          0,
          5
        );
      }
    }

    if (settings.recommendationMode === "collection") {
      const selectedCollections = getOrderedSelectedCollections(settings);
      if (selectedCollections.length && settings.selectedCollectionIds.length) {
        return buildUpsellItemsFromProxyCollections(
          selectedCollections,
          currency
        ).slice(0, 5);
      }
    }

    return cartItems.length ? cartItems : [];
  };

  const clearUpsellTimer = () => {
    if (UPSELL_TIMER) {
      clearInterval(UPSELL_TIMER);
      UPSELL_TIMER = null;
    }
  };

  const updateUpsellSliderPosition = (wrap) => {
    if (!wrap) return false;
    const track = wrap.querySelector(".sc-upsell-track");
    if (!track) return false;
    const offset = -UPSELL_INDEX * 100;
    requestAnimationFrame(() => {
      track.style.transform = `translateX(${offset}%)`;
    });
    return true;
  };

  const getPreferredVariantFromProductJson = (product, variant) => {
    const options = Array.isArray(product?.options) ? product.options : [];
    if (!options.length) return null;
    const sizeIndex = options.findIndex(
      (opt) => String(opt?.name || "").trim().toLowerCase() === "size"
    );
    const optionIndex = sizeIndex >= 0 ? sizeIndex : 0;
    const key = `option${optionIndex + 1}`;
    const value = variant?.[key];
    const name = String(options[optionIndex]?.name || "Option");
    if (!value && !name) return null;
    return {
      name,
      value: value ? String(value) : "",
    };
  };

  const fetchRelatedProducts = async (productId, currency) => {
    if (!productId) return [];
    try {
      const r = await fetch(
        `/recommendations/products.json?product_id=${encodeURIComponent(
          productId
        )}&limit=40&intent=related`,
        { headers: { Accept: "application/json" }, credentials: "same-origin" }
      );
      if (!r.ok) return [];
      const data = await r.json();
      const products = Array.isArray(data?.products) ? data.products : [];
      return products.map((p) => {
        const variants = Array.isArray(p?.variants) ? p.variants : [];
        const firstVariant = variants[0] || null;
        const priceRaw = firstVariant?.price ?? null;
        const priceIsCents = inferPriceIsCents(priceRaw);
        const priceCents = priceIsCents ? normalizeCents(priceRaw) : priceToCents(priceRaw);
        const hasVariants =
          variants.length > 1 && !Boolean(p?.has_only_default_variant);
        const size = hasVariants
          ? getPreferredVariantFromProductJson(p, firstVariant)
          : null;
        const options = Array.isArray(p?.options) ? p.options : [];
        const sizeIndex = options.findIndex(
          (opt) => String(opt?.name || "").trim().toLowerCase() === "size"
        );
        const optionIndex = sizeIndex >= 0 ? sizeIndex : 0;
        const optionName = String(options[optionIndex]?.name || size?.name || "Option");
        const optionValues =
          Array.isArray(options[optionIndex]?.values) && options[optionIndex].values.length
            ? options[optionIndex].values
            : Array.from(
              new Set(
                variants
                  .map((v) => v?.[`option${optionIndex + 1}`])
                  .filter((v) => v != null && String(v).trim() !== "")
              )
            );
        return {
          title: safe(p?.title || "Product"),
          price:
            priceCents != null ? formatMoney(priceCents, currency) : formatMoney(2500, currency),
          priceCents,
          priceIsCents,
          image: getUpsellImageFromProduct(p),
          size,
          variantId: firstVariant?.id || null,
          hasVariants,
          variants,
          optionIndex,
          optionName,
          optionValues,
        };
      });
    } catch (err) {
      console.error("[SmartCartify] related products fetch failed", err);
      return [];
    }
  };

  const ensureUpsellDynamic = async (settings) => {
    if (UPSELL_LOADING || Array.isArray(UPSELL_DYNAMIC)) return;
    if (settings.recommendationMode !== "auto") return;
    const items = Array.isArray(CART?.items) ? CART.items : [];
    const first = items.find((it) => it?.product_id);
    if (!first) return;
    UPSELL_LOADING = true;
    try {
      const currency = normalizeCurrencyCode();
      const related = await fetchRelatedProducts(first.product_id, currency);
      if (related.length) {
        const unique = [];
        const seen = new Set();
        related.forEach((p) => {
          const key = String(p.variantId || p.title || Math.random());
          if (seen.has(key)) return;
          seen.add(key);
          unique.push(p);
        });
        UPSELL_DYNAMIC = unique.slice(0, 5);
      }
    } finally {
      UPSELL_LOADING = false;
    }
  };

  const renderUpsellSection = () => {
    const wrap = drawer.querySelector(".sc-upsell");
    if (!wrap) return;

    const settings = getUpsellSettings();
    if (!settings.enabled) {
      wrap.hidden = true;
      clearUpsellTimer();
      return;
    }

    void ensureUpsellDynamic(settings);
    const items = buildUpsellItems(settings);
    if (!items.length) {
      wrap.hidden = true;
      clearUpsellTimer();
      return;
    }

    wrap.hidden = false;
    wrap.style.setProperty("--sc-upsell-bg", settings.backgroundColor || "var(--sc-drawer-bg, #ffffff)");
    wrap.style.setProperty("--sc-upsell-text", settings.textColor || "#111827");
    wrap.style.setProperty("--sc-upsell-button-bg", settings.buttonColor || "#111111");
    wrap.style.setProperty("--sc-upsell-button-text", settings.buttonTextColor || "#ffffff");
    wrap.style.setProperty("--sc-border", settings.borderColor || "#e2e8f0");
    wrap.style.setProperty("--sc-upsell-arrow", settings.arrowColor || "#111827");

    const total = items.length;
    if (UPSELL_INDEX >= total) UPSELL_INDEX = 0;
    const visibleItems = settings.showAsSlider ? items : items.slice(0, 2);
    const upsellItemMap = new Map();

    const renderCard = (item, idx) => {
      const sizeRaw = item?.size;
      const size =
        sizeRaw && typeof sizeRaw === "object"
          ? {
            name: trimToNull(sizeRaw.name) || "Size",
            value: trimToNull(sizeRaw.value) || "",
          }
          : null;
      const showSelect =
        !!item?.hasVariants &&
        Array.isArray(item?.optionValues) &&
        item.optionValues.length > 0;
      const sizeLabel = showSelect
        ? trimToNull(item?.optionName) || (size ? size.name : "")
        : "";
      const sizeSelect = size ? size.value || size.name : "";
      const rawKey = `upsell-${UPSELL_INDEX}-${idx}-${String(
        item?.variantId || item?.title || ""
      )}`;
      const safeKey = safe(rawKey);
      upsellItemMap.set(safeKey, item);
      const controlsClass = showSelect ? "sc-upsell-controls" : "sc-upsell-controls no-variant";
      const optIndex = Number(item?.optionIndex ?? 0);
      const variants = Array.isArray(item?.variants) ? item.variants : [];
      const pickedByOption = showSelect
        ? variants.find(
          (v) => String(v?.[`option${optIndex + 1}`]) === String(sizeSelect || "")
        )
        : null;
      const picked =
        pickedByOption ||
        variants.find((v) => String(v?.id || "") === String(item?.variantId || "")) ||
        variants[0] ||
        null;
      const available = isVariantAvailable(picked, item);
      const addVariantId = available
        ? safe(
          picked?.id ||
          picked?.variantId ||
          picked?.admin_graphql_api_id ||
          item?.variantId ||
          ""
        )
        : "";
      const selectMarkup = showSelect
        ? `
          <div class="sc-upsell-select-wrap">
            <select class="sc-upsell-select" data-upsell-select="${safeKey}" data-upsell-opt-index="${item?.optionIndex ?? 0}">
              ${item.optionValues
          .map((v) => {
            const sv = safe(v);
            const selected = sv === safe(sizeSelect) ? "selected" : "";
            return `<option value="${sv}" ${selected}>${sv}</option>`;
          })
          .join("")}
            </select>
            <span class="sc-upsell-select-arrow">▼</span>
          </div>
        `
        : "";
      return `
          <div class="sc-upsell-item">
            <div class="sc-upsell-row">
              <div class="sc-upsell-img">
                ${item.image ? `<img src="${safe(item.image)}" alt="${safe(item.title)}" />` : ""}
              </div>
              <div class="sc-upsell-info">
                <div class="sc-upsell-top">
                  <div class="sc-upsell-name">${safe(item.title)}</div>
                  <div class="sc-upsell-price">${safe(item.price)}</div>
                </div>
                ${sizeLabel ? `<div class="sc-upsell-sub">${safe(sizeLabel)}</div>` : ""}
                <div class="${controlsClass}">
                  ${selectMarkup}
                  <div class="sc-upsell-action">
                    <button class="sc-upsell-btn" type="button" data-upsell-add="${addVariantId}" data-upsell-key="${safeKey}" ${available ? "" : "disabled hidden"} style="${available ? `background-color:${safe(settings.buttonColor || "#111111")};color:${safe(settings.buttonTextColor || "#ffffff")};` : "display:none"}">
                      <span class="sc-upsell-btn-icon">+</span>
                      <span class="sc-upsell-btn-text">${safe(settings.buttonText)}</span>
                    </button>
                    <button class="sc-upsell-btn sc-upsell-btn-oos" type="button" disabled ${available ? "hidden" : ""
        } style="${available ? "display:none" : ""}">Sold out</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
    };

    const arrows =
      settings.showAsSlider && total > 0
        ? `
          <button class="sc-upsell-arrow left" type="button" data-upsell-prev aria-label="Previous">
            <svg width="14" height="14" viewBox="0 0 256 256" xml:space="preserve">
              <defs>
              </defs>
              <g style="stroke: none; stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: none; fill-rule: nonzero; opacity: 1;" transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)">
                <path d="M 65.75 90 c 0.896 0 1.792 -0.342 2.475 -1.025 c 1.367 -1.366 1.367 -3.583 0 -4.949 L 29.2 45 L 68.225 5.975 c 1.367 -1.367 1.367 -3.583 0 -4.95 c -1.367 -1.366 -3.583 -1.366 -4.95 0 l -41.5 41.5 c -1.367 1.366 -1.367 3.583 0 4.949 l 41.5 41.5 C 63.958 89.658 64.854 90 65.75 90 z" style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill-rule: nonzero; opacity: 1;" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round"></path>
              </g>
            </svg>
          </button>
          <button class="sc-upsell-arrow right" type="button" data-upsell-next aria-label="Next">
            <svg width="14" height="14" viewBox="0 0 256 256" xml:space="preserve">
            <defs>
            </defs>
            <g style="stroke: none; stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: none; fill-rule: nonzero; opacity: 1;" transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)">
              <path d="M 24.25 90 c -0.896 0 -1.792 -0.342 -2.475 -1.025 c -1.367 -1.366 -1.367 -3.583 0 -4.949 L 60.8 45 L 21.775 5.975 c -1.367 -1.367 -1.367 -3.583 0 -4.95 c 1.367 -1.366 3.583 -1.366 4.95 0 l 41.5 41.5 c 1.367 1.366 1.367 3.583 0 4.949 l -41.5 41.5 C 26.042 89.658 25.146 90 24.25 90 z" style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill-rule: nonzero; opacity: 1;" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round"></path>
            </g>
          </svg>
          </button>
        `
        : "";

    const sliderMarkup = settings.showAsSlider
      ? `
        <div class="sc-upsell-viewport">
          <div class="sc-upsell-track" style="transform: translateX(-${UPSELL_INDEX * 100}%);">
            ${visibleItems
        .map((item, i) => `<div class="sc-upsell-slide">${renderCard(item, i)}</div>`)
        .join("")}
          </div>
        </div>
      `
      : visibleItems.map((item, i) => renderCard(item, i)).join("");

    wrap.innerHTML = `
      <div class="sc-upsell-card">
        <div class="sc-upsell-title">${safe(settings.sectionTitle)}</div>
        <div class="sc-upsell-inner">
          ${arrows}
          ${sliderMarkup}
        </div>
      </div>
    `;

    wrap.querySelector("[data-upsell-prev]")?.addEventListener("click", () => {
      if (total <= 1) return;
      UPSELL_INDEX = UPSELL_INDEX - 1 < 0 ? total - 1 : UPSELL_INDEX - 1;
      updateUpsellSliderPosition(wrap);
    });

    wrap.querySelector("[data-upsell-next]")?.addEventListener("click", () => {
      if (total <= 1) return;
      UPSELL_INDEX = UPSELL_INDEX + 1 >= total ? 0 : UPSELL_INDEX + 1;
      updateUpsellSliderPosition(wrap);
    });

    wrap.querySelectorAll("[data-upsell-add]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        let variantId = btn.getAttribute("data-upsell-add");
        const key = btn.getAttribute("data-upsell-key");
        const itemForLog = key ? upsellItemMap.get(key) : null;
        if (!variantId) {
          const item = itemForLog;
          const variants = Array.isArray(item?.variants) ? item.variants : [];
          const picked = variants[0] || null;
          variantId = picked?.id || item?.variantId || null;
        }
        const legacyId = normalizeVariantId(variantId);
        if (!legacyId) return;
        try {
          setProgressLoading(true);
          btn.disabled = true;
          const body = new URLSearchParams();
          body.set("id", legacyId);
          body.set("quantity", "1");
          const res = await fetch("/cart/add.js", {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            },
            credentials: "same-origin",
            body,
          });
          if (!res.ok) {
            let errText = "";
            try {
              errText = await res.text();
            } catch { }
            throw new Error(`Upsell add failed (${res.status}) ${errText}`.trim());
          }
          await refreshFromNetwork();
        } catch (err) {
          console.error("[SmartCartify] upsell add failed:", err);
        } finally {
          btn.disabled = false;
          setProgressLoading(false);
        }
      });
    });

    wrap.querySelectorAll("[data-upsell-select]").forEach((select) => {
      select.addEventListener("change", () => {
        const key = select.getAttribute("data-upsell-select");
        const item = key ? upsellItemMap.get(key) : null;
        if (!item) return;
        const optIndex = Number(select.getAttribute("data-upsell-opt-index") || 0);
        const val = select.value;
        const variants = Array.isArray(item?.variants) ? item.variants : [];
        const picked =
          variants.find((v) => String(v?.[`option${optIndex + 1}`]) === String(val)) ||
          variants[0] ||
          null;
        const itemRoot = select.closest(".sc-upsell-item");
        const btn = itemRoot?.querySelector("[data-upsell-add]");
        const oos = itemRoot?.querySelector(".sc-upsell-btn-oos");
        const isAvailable = isVariantAvailable(picked, item);
        if (btn) {
          const nextId =
            picked?.id ||
            picked?.variantId ||
            picked?.admin_graphql_api_id ||
            "";
          btn.setAttribute("data-upsell-add", isAvailable ? safe(nextId) : "");
          btn.disabled = !isAvailable;
          btn.hidden = !isAvailable;
          btn.style.display = isAvailable ? "" : "none";
        }
        if (oos) {
          oos.hidden = isAvailable;
          oos.style.display = isAvailable ? "none" : "";
        }
        const priceEl = select.closest(".sc-upsell-item")?.querySelector(".sc-upsell-price");
        if (priceEl && picked?.price != null) {
          const nextCents = priceToCentsFromItem(picked.price, item);
          if (nextCents != null) priceEl.textContent = formatMoney(nextCents, normalizeCurrencyCode());
        }
      });
    });

    clearUpsellTimer();
    if (settings.showAsSlider && settings.autoplay && total > 1) {
      UPSELL_TIMER = setInterval(() => {
        UPSELL_INDEX = UPSELL_INDEX + 1 >= total ? 0 : UPSELL_INDEX + 1;
        updateUpsellSliderPosition(wrap);
      }, 5200);
    }
  };

  const logProxyTables = (proxy) => {
    if (!DEBUG_TABLES) return;
    const tables = {
      shipping: getProxyArray(proxy, ["shippingRules", "shippingRule", "shippingrule"]),
      discount: getProxyArray(proxy, ["discountRules", "discountRule", "discountrule"]),
      freeGift: getProxyArray(proxy, ["freeGiftRules", "freeGiftRule", "freegiftrule"]),
      bxgy: getProxyArray(proxy, [
        "buyxgetyRules",
        "buyxgetyRule",
        "buyxgetyrule",
        "buyXGetYRules",
        "bxgyrule",
        "bxgyRules",
        "bxgyRule",
      ]),
    };

    console.groupCollapsed("[SC] Proxy Tables");
    Object.entries(tables).forEach(([label, rows]) => {
      console.groupCollapsed(label);
      console.table(Array.isArray(rows) ? rows : []);
      console.groupEnd();
    });

    if (proxy?.styleSettings) {
      console.groupCollapsed("styleSettings");
      console.table([proxy.styleSettings]);
      console.groupEnd();
    }

    if (proxy?.upsellSettings) {
      console.groupCollapsed("upsellSettings");
      console.table([proxy.upsellSettings]);
      console.groupEnd();
    }

    console.groupEnd();
  };

  const getCartTotalQty = () => {
    const items = Array.isArray(CART?.items) ? CART.items : [];
    return items.reduce((sum, it) => sum + (Number(it?.quantity) || 0), 0);
  };

  const gidToId = (gid) => {
    const s = String(gid || "");
    const m = s.match(/\/(\d+)\s*$/);
    return m ? m[1] : null;
  };

  const getRuleKey = (rule, fallbackPrefix = "rule") => {
    const raw =
      trimToNull(rule?.id) ||
      trimToNull(rule?.ruleId) ||
      trimToNull(rule?.rule_id) ||
      trimToNull(rule?.uid) ||
      trimToNull(rule?._id) ||
      trimToNull(rule?.campaignId) ||
      trimToNull(rule?.campaign_id) ||
      trimToNull(rule?.freeProductDiscountID) ||
      trimToNull(rule?.freeProductDiscountId) ||
      trimToNull(rule?.free_product_discount_id) ||
      null;
    if (raw) return String(raw);
    const slot = normalizeStepSlotFromAny(rule);
    if (slot) return `${fallbackPrefix}:${slot}`;
    const a =
      trimToNull(rule?.campaignName) ||
      trimToNull(rule?.cartStepName) ||
      "unknown";
    return `${fallbackPrefix}:${a}`;
  };

  const getSelectedCartGoalCampaign = () => {
    const cartGoalList = getProxyArray(PROXY, [
      "cartGoalRules",
      "cartGoalRule",
      "cartgoalrule",
    ]);
    return (Array.isArray(cartGoalList) ? cartGoalList : [])
      .filter((campaign) => isRuleEnabled(campaign))
      .sort((a, b) => Number(b?.priority || 0) - Number(a?.priority || 0))[0] || null;
  };

  const buildCartGoalFreeProductRules = (campaign) => {
    if (!campaign) return [];
    const trackBy = String(campaign?.trackBy || "").toLowerCase() === "quantity" ? "quantity" : "value";
    const goals = parseArrayish(campaign?.goals);
    return goals
      .map((goal, index) => {
        const type = normalizeCartGoalRewardType(goal);
        if (type !== "free") return null;
        const threshold = Number(goal?.goal);
        const productIds = getCartGoalBonusProductIds(goal);
        const bonusProducts = getCartGoalBonusProducts(goal);
        const bonusProductId =
          trimToNull(goal?.bonusProductId) ||
          trimToNull(goal?.bonus) ||
          trimToNull(productIds[0]) ||
          "";
        const rule = {
          ...goal,
          id: `cartgoal:${campaign?.id ?? "campaign"}:${goal?.id ?? index + 1}`,
          campaignId: campaign?.id,
          campaignName: trimToNull(campaign?.campaignName) || "Cart Goal",
          enabled: true,
          type: "gift",
          ruleType: "free",
          rewardType: "free",
          cartStepName: `step${index + 1}`,
          triggerType: trackBy === "quantity" ? "quantity" : "amount",
          shopifyDiscountId: goal?.shopifyDiscountId || null,
          bonusProductId,
          bonus: bonusProductId,
          bonusProductIds: productIds,
          bonusProducts,
        };
        if (trackBy === "quantity") rule.minQuantity = Number.isFinite(threshold) ? threshold : null;
        else rule.minPurchase = Number.isFinite(threshold) ? threshold : null;
        return rule;
      })
      .filter(Boolean);
  };

  const sentAnalyticsEvents = new Set();

  const getAnalyticsRuleId = (rule) => {
    const raw =
      rule?.id ??
      rule?.ruleId ??
      rule?.rule_id ??
      rule?.campaignId ??
      rule?.campaign_id ??
      null;
    const id = Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
  };

  const getAnalyticsRules = () => {
    const rows = [];
    const addRows = (type, list) => {
      (Array.isArray(list) ? list : []).forEach((rule) => {
        if (!isRuleEnabled(rule)) return;
        const id = getAnalyticsRuleId(rule);
        if (!id) return;
        rows.push({ type, id, rule });
      });
    };

    addRows("shipping", getProxyArray(PROXY, ["shippingRules", "shippingRule", "shippingrule"]));
    addRows("discount", getProxyArray(PROXY, ["discountRules", "discountRule", "discountrule"]));
    addRows("free", getProxyArray(PROXY, ["freeGiftRules", "freeGiftRule", "freegiftrule"]));
    addRows("bxgy", getProxyArray(PROXY, [
      "buyxgetyRules",
      "buyxgetyRule",
      "buyxgetyrule",
      "buyXGetYRules",
      "bxgyrule",
      "bxgyRules",
      "bxgyRule",
    ]));
    return rows;
  };

  const sendAnalyticsEvent = (event, type, id) => {
    if (!event || !type || !id) return;
    const key = `${event}:${type}:${id}`;
    if (sentAnalyticsEvents.has(key)) return;
    sentAnalyticsEvents.add(key);

    try {
      fetch(buildProxyUrl(CART), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        keepalive: true,
        body: JSON.stringify({ event, ruleType: type, ruleId: id }),
      }).catch(() => { });
    } catch { }
  };

  const recordVisibleRuleImpressions = () => {
    getAnalyticsRules().forEach(({ type, id }) =>
      sendAnalyticsEvent("impression", type, id)
    );
  };

  const recordCompletedRuleConversions = () => {
    const subtotalCents = Number(CART?.items_subtotal_price || 0);
    getAnalyticsRules().forEach(({ type, id, rule }) => {
      const goal = goalToCents(getGoalRupees(type, rule));
      if (goal != null && subtotalCents < goal) return;
      sendAnalyticsEvent("conversion", type, id);
    });
  };

  /* =========================================================
   ✅ Buy X Get Y statuses
  ========================================================= */
  const parseObjectish = (value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
    if (typeof value !== "string") return {};
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  };

  const refsFromValue = (value) => {
    if (Array.isArray(value)) return value;
    if (value == null || value === "") return [];
    if (typeof value === "string") {
      const parsed = parseArrayish(value);
      if (parsed.length) return parsed;
      return value.split(",").map((part) => part.trim()).filter(Boolean);
    }
    return [value];
  };

  const normalizeResourceId = (value) => {
    const raw = trimToNull(
      value?.id ||
      value?.productId ||
      value?.product_id ||
      value?.collectionId ||
      value?.collection_id ||
      value?.legacyResourceId ||
      value?.legacy_resource_id ||
      value
    );
    return raw ? String(gidToId(raw) || raw) : null;
  };

  const getBxgyBuyRefs = (rule) => {
    const appliesTo = parseObjectish(rule?.appliesTo || rule?.applyTo || {});
    const products = [
      ...refsFromValue(appliesTo?.products),
      ...refsFromValue(appliesTo?.productIds),
      ...refsFromValue(appliesTo?.appliesProductIds),
      ...refsFromValue(appliesTo?.buyProductIds),
      ...refsFromValue(rule?.appliesProductIds),
      ...refsFromValue(rule?.buyProductIds),
    ].map(normalizeResourceId).filter(Boolean);
    const collections = [
      ...refsFromValue(appliesTo?.collections),
      ...refsFromValue(appliesTo?.collectionIds),
      ...refsFromValue(appliesTo?.appliesCollectionIds),
      ...refsFromValue(appliesTo?.buyCollectionIds),
      ...refsFromValue(rule?.appliesCollectionIds),
      ...refsFromValue(rule?.buyCollectionIds),
    ].map(normalizeResourceId).filter(Boolean);

    return {
      products: [...new Set(products)],
      collections: [...new Set(collections)],
    };
  };

  const isRewardCartLine = (item) => {
    const props = item?.properties || {};
    return (
      String(props?._sc_free_gift || "").trim().toLowerCase() === "true" ||
      String(props?._sc_bxgy_gift || "").trim().toLowerCase() === "true"
    );
  };

  const getCartLineCollectionIds = (item) => {
    const props = item?.properties || {};
    return [
      ...refsFromValue(props?._sc_collection_id),
      ...refsFromValue(props?._collection_id),
      ...refsFromValue(props?.collection_id),
      ...refsFromValue(props?._sc_collection_ids),
      ...refsFromValue(props?.collection_ids),
      ...refsFromValue(item?.collection_id),
      ...refsFromValue(item?.collection_ids),
      ...refsFromValue(item?.collections),
    ].map(normalizeResourceId).filter(Boolean);
  };

  const getEligibleBuyXGetYItems = (rule, cartItems = null) => {
    const items = (Array.isArray(cartItems) ? cartItems : Array.isArray(CART?.items) ? CART.items : [])
      .filter((item) => !isRewardCartLine(item));
    const scope = normalizeBxgyScope(rule?.scope || rule?.scopeName || "store");
    const refs = getBxgyBuyRefs(rule);

    if (scope === "product") {
      const allowed = new Set(refs.products);
      if (!allowed.size) return [];
      return items.filter((item) => allowed.has(String(item?.product_id || "")));
    }

    if (scope === "collection") {
      const allowed = new Set(refs.collections);
      if (!allowed.size) return [];

      const linesWithCollectionMeta = items.filter((item) => getCartLineCollectionIds(item).length);
      if (!linesWithCollectionMeta.length) return items;

      return items.filter((item) =>
        getCartLineCollectionIds(item).some((id) => allowed.has(String(id)))
      );
    }

    return items;
  };

  const getBuyXGetYStatuses = () => {
    const items = Array.isArray(CART?.items) ? CART.items : [];
    const statuses = [];

    for (const r of BUYXGETY_RULES) {
      if (!isRuleEnabled(r)) continue;

      const scope = normalizeBxgyScope(r?.scope || r?.scopeName || "store");
      const eligibleItems = getEligibleBuyXGetYItems(r, items);

      const eligibleQty = eligibleItems.reduce(
        (sum, it) => sum + (Number(it?.quantity) || 0),
        0
      );
      const eligibleSubtotalRupees =
        (eligibleItems.reduce(
          (sum, it) => sum + (Number(it?.final_line_price) || 0),
          0
        ) /
          priceDivisor(CART?.currency)) ||
        0;

      const minPurchase = Number(r?.minPurchase ?? r?.min_purchase);

      const xQty = Number(
        r?.xQty ?? r?.x_qty ?? r?.x ?? r?.buyQty ?? r?.buy_qty ?? r?.buy
      );
      const yQty = Number(
        r?.yQty ?? r?.y_qty ?? r?.y ?? r?.getQty ?? r?.get_qty ?? r?.get
      );

      const hasMin = Number.isFinite(minPurchase) && minPurchase > 0;
      const hasX = Number.isFinite(xQty) && xQty > 0;

      let complete = false;
      if (hasMin) complete = eligibleSubtotalRupees >= minPurchase;
      else if (hasX) complete = eligibleQty >= xQty;
      else complete = false;

      const beforeRaw = getProgressBefore(r);
      const afterRaw = getProgressAfter(r);

      const remainingX = Math.max(
        0,
        (Number.isFinite(xQty) ? xQty : 0) - (eligibleQty || 0)
      );

      const beforeSeed = replaceTokens(beforeRaw, {
        x: remainingX,
        y: Number.isFinite(yQty) ? yQty : "",
        goal: "",
      });

      const afterSeed = replaceTokens(afterRaw, {
        x: Number.isFinite(xQty) ? xQty : "",
        y: Number.isFinite(yQty) ? yQty : "",
        goal: "",
      });

      const beforeMsg = replaceProgressText({
        text: beforeSeed,
        type: "buyxgety",
        rule: r,
        subtotalRupees: eligibleSubtotalRupees,
        useRemainingForGoal: hasMin && !complete,
      });

      const afterMsg = replaceProgressText({
        text: afterSeed,
        type: "buyxgety",
        rule: r,
        subtotalRupees: eligibleSubtotalRupees,
        useRemainingForGoal: false,
      });

      const currentMsg = complete ? afterMsg : beforeMsg;

      statuses.push({
        rule: r,
        ruleKey: getRuleKey(r, "buyxgety"),
        scope,
        eligibleQty,
        eligibleSubtotalRupees,
        xQty,
        yQty,
        complete,
        beforeMsg,
        afterMsg,
        currentMsg,
      });
    }

    return statuses;
  };

  /* =========================================================
   ✅ BXGY STATUS (discountrule)
  ========================================================= */
  const getBxgyStatus = () => {
    const subtotalRupees =
      (Number(CART?.items_subtotal_price || 0) / priceDivisor()) || 0;
    const cartQty = getCartTotalQty();

    let best = null;

    for (const r of BXGY_RULES) {
      if (!isRuleEnabled(r)) continue;

      const minPurchase = Number(r?.minPurchase ?? r?.min_purchase);
      const xQty = Number(
        r?.xQty ?? r?.x_qty ?? r?.x ?? r?.buyQty ?? r?.buy_qty ?? r?.buy
      );
      const yQty = Number(
        r?.yQty ?? r?.y_qty ?? r?.y ?? r?.getQty ?? r?.get_qty ?? r?.get
      );

      const hasMin = Number.isFinite(minPurchase) && minPurchase > 0;
      const hasX = Number.isFinite(xQty) && xQty > 0;

      let complete = false;
      if (hasMin) complete = subtotalRupees >= minPurchase;
      else if (hasX) complete = cartQty >= xQty;
      else complete = false;

      const beforeRaw = getProgressBefore(r);
      const afterRaw = getProgressAfter(r);

      const remainingX = Math.max(
        0,
        (Number.isFinite(xQty) ? xQty : 0) - (cartQty || 0)
      );

      const beforeMsg = replaceTokens(beforeRaw, {
        x: hasX ? remainingX : Number.isFinite(xQty) ? xQty : "",
        y: Number.isFinite(yQty) ? yQty : "",
        goal: "",
      });

      const afterMsg = replaceTokens(afterRaw, {
        x: Number.isFinite(xQty) ? xQty : "",
        y: Number.isFinite(yQty) ? yQty : "",
        goal: "",
      });

      const beforeMsg2 = replaceProgressText({
        text: beforeMsg,
        type: "bxgy",
        rule: r,
        subtotalRupees,
        useRemainingForGoal: hasMin && !complete,
      });

      const afterMsg2 = replaceProgressText({
        text: afterMsg,
        type: "bxgy",
        rule: r,
        subtotalRupees,
        useRemainingForGoal: false,
      });

      const currentMsg = complete ? afterMsg2 : beforeMsg2;

      const payload = {
        rule: r,
        ruleKey: getRuleKey(r, "bxgy"),
        complete,
        beforeMsg: beforeMsg2,
        afterMsg: afterMsg2,
        currentMsg,
      };

      if (!best) best = payload;
      if (complete) {
        best = payload;
        break;
      }
    }

    return best;
  };

  /* =========================================================
   FETCHERS
  ========================================================= */
  const fetchCart = async ({ force = false } = {}) => {
    const now = Date.now();
    if (!force && cartCacheValue && now - cartCacheTs < CART_CACHE_TTL_MS) {
      return cartCacheValue;
    }
    if (!force && cartFetchInFlight) return cartFetchInFlight;

    cartFetchInFlight = fetch("/cart.js", {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`[SmartCartify] Cart fetch failed (${r.status})`);
        const j = await r.json();
        cartCacheValue = j;
        cartCacheTs = Date.now();
        return j;
      })
      .finally(() => {
        cartFetchInFlight = null;
      });

    return cartFetchInFlight;
  };

  const fetchProxy = async (cart = CART) => {
    const r = await fetch(buildProxyUrl(cart), {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });

    const ct = r.headers.get("content-type") || "";
    if (!r.ok) {
      let text = "";
      try {
        text = await r.text();
      } catch { }
      return {
        ok: true,
        _proxyError: new Error(
          `[SmartCartify] Proxy fetch failed (${r.status}). ct=${ct} body=${text.slice(
            0,
            220
          )}...`
        ),
      };
    }

    if (!ct.includes("application/json")) {
      let text = "";
      try {
        text = await r.text();
      } catch { }
      return {
        ok: true,
        _proxyError: new Error(
          `[SmartCartify] Proxy not JSON. status=${r.status} ct=${ct} body=${text.slice(
            0,
            220
          )}...`
        ),
      };
    }

    const j = await r.json();
    if (!j?.ok) {
      return {
        ok: true,
        _proxyError: new Error(j?.error || "Invalid proxy response (ok:false)"),
      };
    }
    return j;
  };

  const cartChange = async (line, quantity) => {
    invalidateCartCache();
    const r = await fetch("/cart/change.js", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ line, quantity }),
    });
    if (!r.ok) {
      let payload = null;
      let text = "";
      try {
        payload = await r.json();
      } catch {
        try {
          text = await r.text();
        } catch { }
      }
      const message =
        trimToNull(payload?.description) ||
        trimToNull(payload?.message) ||
        trimToNull(payload?.error) ||
        trimToNull(text) ||
        `[SmartCartify] Cart change failed (${r.status})`;
      const err = new Error(message);
      err.status = r.status;
      err.payload = payload;
      throw err;
    }
    const j = await r.json();
    cartCacheValue = j;
    cartCacheTs = Date.now();
    return j;
  };

  const cartUpdate = async (updates) => {
    invalidateCartCache();
    const r = await fetch("/cart/update.js", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ updates }),
    });
    if (!r.ok) throw new Error(`[SmartCartify] Cart update failed (${r.status})`);
    const j = await r.json();
    cartCacheValue = j;
    cartCacheTs = Date.now();
    return j;
  };

  /* =========================================================
   DOM
  ========================================================= */
  const overlay = document.createElement("div");
  overlay.className = "sc-overlay";
  overlay.setAttribute("aria-hidden", "true");

  const drawer = document.createElement("div");
  drawer.className = "sc-drawer";
  drawer.setAttribute("role", "dialog");
  drawer.setAttribute("aria-label", "Cart drawer");

  const addToCartBar = document.createElement("div");
  addToCartBar.className = "sc-atc-bar";
  addToCartBar.setAttribute("aria-live", "polite");
  addToCartBar.hidden = true;

  /* =========================================================
   ✅ PAPER EFFECT + CENTER popup
  ========================================================= */
  let celebrateTimer = null;

  const getConfettiOrigin = () => {
    const host = drawer;
    const w = host?.clientWidth || 0;
    const h = host?.clientHeight || 0;
    const rawX = Number(drawer?.dataset?.scConfettiX || 50);
    const rawY = Number(drawer?.dataset?.scConfettiY || h * 0.35);
    const x = Math.max(10, Math.min(90, Number.isFinite(rawX) ? rawX : 50));
    const y = Math.max(20, Math.min(h - 20, Number.isFinite(rawY) ? rawY : h * 0.35));
    return { xPercent: x, yPx: y };
  };

  const firePaperEffect = (durationMs = 3000) => {
    const host = drawer;
    if (!host) return;

    host.querySelector(".sc-paper")?.remove();

    const wrap = document.createElement("div");
    wrap.className = "sc-paper";
    host.appendChild(wrap);

    const pieces = 320;
    for (let i = 0; i < pieces; i++) {
      const p = document.createElement("i");
      p.className = "sc-paper-piece";
      p.style.left = `${Math.random() * 100}%`;
      p.style.top = `${Math.random() * 100}%`;
      p.style.setProperty("--sc-x", `${(Math.random() * 360 - 180).toFixed(1)}px`);
      p.style.animationDelay = `${Math.random() * 0.2}s`;
      p.style.animationDuration = `${2.6 + Math.random() * 0.5}s`;
      p.style.width = `${3 + Math.random() * 4}px`;
      p.style.height = `${4 + Math.random() * 5}px`;
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      wrap.appendChild(p);
    }

    setTimeout(() => wrap.remove(), durationMs + 300);
  };


  const showCenterCelebratePopup = (title, subtitle, ms = 5000) => {
    if (!drawer) return false;
    const backdrop = document.createElement("div");
    backdrop.className = "sc-celebrate-backdrop";
    backdrop.innerHTML = `
      <div class="sc-celebrate-modal">
        <p class="sc-celebrate-h">${safe(String(title || ""))}</p>
        ${subtitle ? `<p class="sc-celebrate-p">${safe(String(subtitle || ""))}</p>` : ""}
      </div>`;
    const dismiss = () => {
      backdrop.classList.remove("open");
      setTimeout(() => { try { backdrop.remove(); } catch (_) { } }, 220);
    };
    backdrop.addEventListener("click", dismiss);
    drawer.appendChild(backdrop);
    requestAnimationFrame(() => requestAnimationFrame(() => backdrop.classList.add("open")));
    setTimeout(dismiss, ms);
    return true;
  };

  /* =========================================================
   LOADING LINE under sc-progress ✅
  ========================================================= */
  const setProgressLoading = (isLoading) => {
    drawer.classList.toggle("sc-refreshing", !!isLoading);
    syncItemsLoading(!!isLoading);
  };

  const syncItemsLoading = (isLoading) => {
    drawer.classList.toggle("sc-loading-items", !!isLoading);
  };

  const isQuantityLimitMessage = (message) => {
    const m = String(message || "").toLowerCase();
    if (!m) return false;
    return (
      m.includes("maximum") ||
      m.includes("max quantity") ||
      m.includes("can't add more") ||
      m.includes("cannot add more") ||
      m.includes("only") && m.includes("left") ||
      m.includes("available") ||
      m.includes("stock") ||
      m.includes("sold out")
    );
  };

  const showCartActionMessage = (message, tone = "error") => {
    const el = drawer.querySelector("[data-sc-cart-msg]");
    const textEl = drawer.querySelector("[data-sc-cart-msg-text]");
    if (!el) return;
    const txt = trimToNull(message);
    if (!txt) {
      el.hidden = true;
      if (textEl) textEl.textContent = "";
      el.classList.remove("show", "warn", "error", "info");
      return;
    }
    if (textEl) textEl.textContent = txt;
    else el.textContent = txt;
    el.hidden = false;
    el.classList.remove("warn", "error", "info");
    el.classList.add(tone === "warn" ? "warn" : tone === "info" ? "info" : "error");
    el.classList.add("show");
  };

  const shouldSuppressCartActionMessage = (message) =>
    isQuantityLimitMessage(message);

  const setLineInputValue = (line, qty) => {
    const input = drawer.querySelector(`.sc-item[data-line="${line}"] input[data-qty="input"]`);
    if (!(input instanceof HTMLInputElement)) return;
    input.value = String(Math.max(0, Number(qty) || 0));
  };

  const setLineBusy = (line, busy) => {
    const row = drawer.querySelector(`.sc-item[data-line="${line}"]`);
    if (!(row instanceof HTMLElement)) return;
    row.classList.toggle("sc-item-pending", !!busy);
  };

  const applyLineQuantityChange = async (line, qty) => {
    const nextQty = Math.max(0, Number(qty) || 0);
    lineQtyDesired.set(line, nextQty);
    setLineInputValue(line, nextQty);
    if (lineQtyInFlight.has(line)) return;

    lineQtyInFlight.add(line);
    setLineBusy(line, true);
    setProgressLoading(true);

    try {
      while (true) {
        const desiredQty = Math.max(0, Number(lineQtyDesired.get(line)) || 0);
        CART = await cartChange(line, desiredQty);
        await enforceRewardValidity();
        renderAllFromCache();

        const latestDesired = Math.max(0, Number(lineQtyDesired.get(line)) || 0);
        if (latestDesired === desiredQty) break;
      }
      showCartActionMessage("");
    } catch (err) {
      console.error("[SmartCartify] quantity update failed:", err);
      const msg =
        trimToNull(err?.message) || "Couldn't update quantity. Please try again.";
      if (!shouldSuppressCartActionMessage(msg)) {
        showCartActionMessage(msg, "error");
      } else {
        showCartActionMessage("");
      }
      try {
        CART = await fetchCart({ force: true });
        renderAllFromCache();
      } catch (refreshErr) {
        console.error("[SmartCartify] quantity recovery failed:", refreshErr);
      }
    } finally {
      lineQtyDesired.delete(line);
      lineQtyInFlight.delete(line);
      setLineBusy(line, false);
      setProgressLoading(false);
    }
  };

  /* =========================================================
   ✅ ANNOUNCEMENT BAR
  ========================================================= */
  const copyTextToClipboard = async (text) => {
    if (!text) return false;
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch { }
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "readonly");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return !!ok;
    } catch {
      return false;
    }
  };

  const showCopyFeedback = (el) => {
    if (!el) return;
    const original = el.getAttribute("data-sc-orig") || el.textContent || "";
    if (!el.getAttribute("data-sc-orig")) {
      el.setAttribute("data-sc-orig", original);
    }
    el.textContent = "Copied";
    el.classList.add("sc-announce-copied");
    if (el.__scCopyTimer) clearTimeout(el.__scCopyTimer);
    el.__scCopyTimer = setTimeout(() => {
      const back = el.getAttribute("data-sc-orig") || original;
      el.textContent = back;
      el.classList.remove("sc-announce-copied");
    }, 1200);
  };

  const showOfferCodeCopyFeedback = (button) => {
    if (!button) return;
    button.classList.add("is-copied");
    button.setAttribute("aria-label", "Discount code copied");
    if (button.__scOfferCopyTimer) clearTimeout(button.__scOfferCopyTimer);
    button.__scOfferCopyTimer = setTimeout(() => {
      button.classList.remove("is-copied");
      button.setAttribute("aria-label", "Copy discount code");
    }, 1200);
  };

  const setAnnouncementMessages = (arr) => {
    ANNOUNCE_MESSAGES = (arr || [])
      .map((x) => stripCurrencySymbolIfCodePresent(trimToNull(x), CART?.currency))
      .map((x) => trimToNull(x))
      .filter(Boolean);

    const bar = drawer.querySelector("[data-sc-announce]");
    if (!bar) return;

    const cartItems = Array.isArray(CART?.items) ? CART.items : [];
    const cartQuantity = Math.max(
      0,
      Number(CART?.item_count || 0) || getCartTotalQty()
    );
    const isEmptyCart = cartItems.length === 0 && cartQuantity <= 0;

    if (isEmptyCart || !ANNOUNCE_MESSAGES.length) {
      bar.hidden = true;
      bar.innerHTML = "";
      return;
    }

    bar.hidden = false;

    const baseMessages =
      ANNOUNCE_MESSAGES.length === 1
        ? new Array(4).fill(ANNOUNCE_MESSAGES[0])
        : ANNOUNCE_MESSAGES;
    const renderAnnouncementHtml = (m) =>
      safe(m)
        .split(ANNOUNCE_EM_CODE_START)
        .join('<span class="sc-announce-em sc-announce-value sc-announce-code" data-sc-copy="1">')
        .split(ANNOUNCE_EM_VALUE_START)
        .join('<span class="sc-announce-em sc-announce-value">')
        .split(ANNOUNCE_EM_LABEL_START)
        .join('<span class="sc-announce-em sc-announce-label">')
        .split(ANNOUNCE_EM_END)
        .join("</span>");

    const snippet = baseMessages
      .map((m) => `<span class="info-text">${renderAnnouncementHtml(m)}</span>`)
      .join("");

    bar.innerHTML = `
      <div class="marquee-text" role="status" aria-live="polite">
        <div class="top-info-bar">
          ${snippet}${snippet}
        </div>
      </div>
    `;

    if (!bar.__scCopyBound) {
      bar.__scCopyBound = true;
      bar.addEventListener("click", async (e) => {
        const target = e.target?.closest?.("[data-sc-copy]");
        if (!target) return;
        const text = trimToNull(target.textContent);
        if (!text) return;
        const ok = await copyTextToClipboard(text);
        if (ok) showCopyFeedback(target);
      });
    }

    if (DEBUG_TABLES) {
      console.groupCollapsed("[SC] Announcement Messages");
      console.table(ANNOUNCE_MESSAGES.map((m, i) => ({ i: i + 1, message: m })));
      console.groupEnd();
    }
  };

  const getCartDiscountCodeEntry = (code) => {
    const c = trimToNull(code);
    if (!c || !CART) return null;

    const needle = c.toLowerCase();

    const totalDiscount = Number(CART?.total_discount || 0);
    if (!Number.isFinite(totalDiscount) || totalDiscount <= 0) return null;

    const discountCodes = Array.isArray(CART.discount_codes) ? CART.discount_codes : [];

    return discountCodes.find((d) => {
      const dc = String(d?.code || d || "").trim().toLowerCase();
      const amount = Number(d?.amount || 0);
      const applicable = d?.applicable;

      return (
        dc === needle &&
        amount > 0 &&
        applicable !== false
      );
    }) || null;
  };

  const isDiscountAppliedInCart = (code) => {
    return Boolean(getCartDiscountCodeEntry(code));
  };

  const getCartDiscountCodeAmountCents = (code) => {
    const entry = getCartDiscountCodeEntry(code);
    if (!entry) return null;
    const amount = Number(entry?.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return Math.max(0, Math.round(amount * priceDivisor(CART?.currency)));
  };

  const getAppliedDiscountCodes = () => {
    const out = [];
    const cartCodes = Array.isArray(CART?.discount_codes) ? CART.discount_codes : [];
    cartCodes.forEach((d) => {
      const code = trimToNull(d?.code || d);
      if (code && isDiscountAppliedInCart(code)) out.push(code);
    });
    const seen = new Set();
    return out.filter((c) => {
      const key = String(c).trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const refreshAnnouncementFromRules = () => {
    // Ensure rule caches are populated even if progress UI didn't render
    buildSteps();

    const subtotalRupees = (getCartOriginalSubtotalCents() / priceDivisor(CART?.currency)) || 0;
    const msgs = [];

    const wrapEmValue = (v) => {
      const t = trimToNull(v);
      if (!t) return "";
      return `${ANNOUNCE_EM_VALUE_START}${t}${ANNOUNCE_EM_END}`;
    };

    const wrapEmCode = (v) => {
      const t = trimToNull(v);
      if (!t) return "";
      return `${ANNOUNCE_EM_CODE_START}${t}${ANNOUNCE_EM_END}`;
    };

    const normalizeOffText = (text) => {
      let out = String(text ?? "");
      out = out.replace(/\boff\s*off\b/gi, (m) => m.slice(0, 3));
      out = out.replace(/\boffoff\b/gi, (m) => m.slice(0, 3));
      return out;
    };

    const wrapAnnouncementToken = (value, key) => {
      const tokenKey = String(key || "").toLowerCase();
      if (tokenKey === "discount_code") return wrapEmCode(value);
      return wrapEmValue(value);
    };

    const replaceTokensRaw = (text, map, options = {}) => {
      const { tokenWrap = null } = options || {};
      let out = String(text ?? "");
      if (!out) return "";
      Object.keys(map || {}).forEach((k) => {
        const val = map[k] == null ? "" : String(map[k]);
        const re = new RegExp(`{{\\s*${k}\\s*}}`, "gi");
        out = out.replace(re, () => {
          if (!val) return "";
          return typeof tokenWrap === "function" ? tokenWrap(val, k) : val;
        });
      });
      return out;
    };

    const replaceProgressTextRaw = ({
      text,
      type,
      rule,
      subtotalRupees,
      useRemainingForGoal,
      tokenWrap = null,
      tokenOverrides = {},
    }) => {
      const progressMetric = getRuleProgressMetric(type, rule);
      const isQuantity = progressMetric.metric === "quantity";
      const goalValue = progressMetric.goal;
      const currentValue = isQuantity
        ? progressMetric.current
        : Number(subtotalRupees || progressMetric.current || 0);
      const remainingValue =
        goalValue == null ? null : Math.max(0, Number(goalValue) - currentValue);

      const goalText =
        goalValue == null
          ? ""
          : isQuantity
            ? formatQuantityGoal(goalValue)
            : formatMoney(amountToCurrencyMinorUnits(goalValue), CART?.currency);
      const remainingText =
        remainingValue == null
          ? ""
          : isQuantity
            ? formatQuantityGoal(remainingValue)
            : formatMoney(amountToCurrencyMinorUnits(remainingValue), CART?.currency);

      const goalToken = useRemainingForGoal ? remainingText : goalText;

      const discountTokens =
        type === "discount"
          ? getDiscountValueTokens(rule)
          : { value: "", valueWithOff: "" };
      const discountCode = String(
        rule?.discountCode ?? rule?.discount_code ?? rule?.code ?? ""
      );

      const xQty = String(rule?.xQty ?? rule?.x_qty ?? rule?.x ?? rule?.buyQty ?? rule?.buy_qty ?? rule?.buy ?? "");
      const yQty = String(rule?.yQty ?? rule?.y_qty ?? rule?.y ?? rule?.getQty ?? rule?.get_qty ?? rule?.get ?? "");

      const tokenMap = {
        goal: goalToken,
        amount: goalToken,
        remaining: remainingText,
        goal_amount: goalText,
        discount: discountTokens.value,
        discount_value: discountTokens.value,
        discount_value_with_off: discountTokens.valueWithOff,
        discount_code: discountCode,
        x: xQty,
        y: yQty,
        ...(tokenOverrides || {}),
      };

      const replaced = replaceTokensRaw(
        text,
        tokenMap,
        { tokenWrap }
      );
      return type === "discount" ? normalizeDiscountProgressText(replaced) : replaced;
    };

    // (A) Code discount rules (before/after announcement text comes from the
    // preview-above fields, not the progress-below label).
    const codeRules = Array.isArray(CODE_DISCOUNT_RULES) ? CODE_DISCOUNT_RULES : [];
    codeRules.forEach((r) => {
      if (!isRuleEnabled(r)) return;
      const ruleCodeRaw = String(
        r?.discountCode ?? r?.discount_code ?? r?.code ?? ""
      ).trim();
      if (!ruleCodeRaw) return;
      const ruleApplied = isDiscountAppliedInCart(ruleCodeRaw);

      const isQtyTrigger = isQuantityTriggerRule(r);
      const minPurchase = Number(r?.minPurchase ?? r?.min_purchase);
      const minQuantity = Number(r?.minQuantity ?? r?.min_quantity);
      const hasMin = isQtyTrigger
        ? (Number.isFinite(minQuantity) && minQuantity > 0)
        : (Number.isFinite(minPurchase) && minPurchase > 0);
      const currentMetric = isQtyTrigger
        ? Math.max(0, Number(CART?.item_count || 0) || getCartTotalQty())
        : subtotalRupees;
      const threshold = isQtyTrigger ? minQuantity : minPurchase;
      const complete = !hasMin || currentMetric >= threshold;

      const rawBefore = trimToNull(getProgressBefore(r));
      const rawAfter = trimToNull(getProgressAfter(r));
      const fallbackBefore =
        "Add {{goal}} more to use code {{discount_code}} and get {{discount_value_with_off}}";
      const fallbackAfter =
        "{{discount_value_with_off}} unlocked with code {{discount_code}}";

      const useAfter = ruleApplied;
      const msgBaseRaw = replaceProgressTextRaw({
        text: useAfter ? rawAfter || fallbackAfter : rawBefore || fallbackBefore,
        type: "discount",
        rule: r,
        subtotalRupees,
        useRemainingForGoal: !useAfter,
        tokenWrap: wrapAnnouncementToken,
      });
      let msgBase = normalizeOffText(msgBaseRaw);

      const msg = msgBase.replace(/\s{2,}/g, " ").trim();
      if (trimToNull(msg)) msgs.push(msg);
    });

    // (B) BXGY (discountrule)
    const bx = getBxgyStatus();
    if (bx?.rule) {
      const r = bx.rule;
      const minPurchase = Number(r?.minPurchase ?? r?.min_purchase);
      const xQty = Number(r?.xQty ?? r?.x_qty ?? r?.x ?? r?.buyQty ?? r?.buy_qty ?? r?.buy);
      const yQty = Number(r?.yQty ?? r?.y_qty ?? r?.y ?? r?.getQty ?? r?.get_qty ?? r?.get);
      const hasMin = Number.isFinite(minPurchase) && minPurchase > 0;
      const hasX = Number.isFinite(xQty) && xQty > 0;
      const cartQty = getCartTotalQty();
      const remainingX = Math.max(0, (Number.isFinite(xQty) ? xQty : 0) - (cartQty || 0));

      const beforeRaw = getProgressBefore(r);
      const afterRaw = getProgressAfter(r);
      const fallbackBefore = "Buy X Get Y Discount: Buy {{x}} get {{y}}";
      const fallbackAfter = "Buy X Get Y Discount: Buy {{x}} get {{y}}";

      const msgBase = replaceProgressTextRaw({
        text: bx.complete ? (afterRaw || fallbackAfter) : (beforeRaw || fallbackBefore),
        type: "bxgy",
        rule: r,
        subtotalRupees,
        useRemainingForGoal: false,
        tokenWrap: wrapAnnouncementToken,
        tokenOverrides: bx.complete ? {} : {
          x: hasX ? remainingX : Number.isFinite(xQty) ? xQty : "",
        },
      });

      const msg = String(msgBase || "").replace(/\s{2,}/g, " ").trim();
      if (trimToNull(msg)) msgs.push(msg);
    }

    // (C) BuyXGetY (bxgyrule)
    const buyStatuses = getBuyXGetYStatuses();
    buyStatuses.forEach((st) => {
      const r = st?.rule;
      if (!r) return;
      const xQty = Number(st?.xQty ?? r?.xQty ?? r?.x_qty ?? r?.x ?? r?.buyQty ?? r?.buy_qty ?? r?.buy);
      const yQty = Number(st?.yQty ?? r?.yQty ?? r?.y_qty ?? r?.y ?? r?.getQty ?? r?.get_qty ?? r?.get);
      const eligibleQty = Number(st?.eligibleQty ?? 0);
      const remainingX = Math.max(0, (Number.isFinite(xQty) ? xQty : 0) - eligibleQty);

      const beforeRaw = getProgressBefore(r);
      const afterRaw = getProgressAfter(r);
      const fallbackBefore = "Buy X Get Y: Add {{x}} more to unlock the offer";
      const fallbackAfter = "Buy X Get Y Discount: Buy {{x}} get {{y}}";

      const msgBase = replaceProgressTextRaw({
        text: st.complete ? (afterRaw || fallbackAfter) : (beforeRaw || fallbackBefore),
        type: "buyxgety",
        rule: r,
        subtotalRupees: st.eligibleSubtotalRupees ?? subtotalRupees,
        useRemainingForGoal: !st.complete,
        tokenWrap: wrapAnnouncementToken,
        tokenOverrides: st.complete ? {} : {
          x: Number.isFinite(xQty) ? remainingX : "",
        },
      });

      const msg = String(msgBase || "").replace(/\s{2,}/g, " ").trim();
      if (trimToNull(msg)) msgs.push(msg);
    });

    // NOTE: Sections D (automatic discount) and E (free gift) are intentionally omitted.
    // Those rule types appear as progress bar steps, not in the announcement bar.

    // de-dup
    const unique = [];
    const seen = new Set();
    for (const m of msgs) {
      const key = String(m).trim().toLowerCase();
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(m);
    }

    if (!unique.length) {
      const firstCodeRule = (CODE_DISCOUNT_RULES || []).find(
        (r) =>
          isRuleEnabled(r) &&
          trimToNull(r?.discountCode ?? r?.discount_code ?? r?.code ?? "")
      );
      if (firstCodeRule) {
        const code = trimToNull(
          firstCodeRule?.discountCode ?? firstCodeRule?.discount_code ?? firstCodeRule?.code
        );
        const valRaw = trimToNull(
          firstCodeRule?.value ??
          firstCodeRule?.discountValue ??
          firstCodeRule?.discount_value ??
          ""
        );
        const valWithOff = valRaw
          ? /off\b/i.test(valRaw)
            ? valRaw
            : `${valRaw} OFF`
          : "";
        const fallbackTemplate = code
          ? `Discount Code {{discount_code}}${valWithOff ? " • {{discount_value_with_off}}" : ""}`
          : "Discount Code available";
        const fallback = replaceProgressTextRaw({
          text: fallbackTemplate,
          type: "discount",
          rule: firstCodeRule,
          subtotalRupees,
          useRemainingForGoal: false,
          tokenWrap: wrapAnnouncementToken,
        });
        unique.push(fallback);
      } else {
        const firstBuyRule =
          (BUYXGETY_RULES || []).find((r) => isRuleEnabled(r)) ||
          (BXGY_RULES || []).find((r) => isRuleEnabled(r));
        if (firstBuyRule) {
          const x = trimToNull(
            firstBuyRule?.xQty ??
            firstBuyRule?.x_qty ??
            firstBuyRule?.x ??
            firstBuyRule?.buyQty ??
            firstBuyRule?.buy_qty ??
            firstBuyRule?.buy ??
            ""
          );
          const y = trimToNull(
            firstBuyRule?.yQty ??
            firstBuyRule?.y_qty ??
            firstBuyRule?.y ??
            firstBuyRule?.getQty ??
            firstBuyRule?.get_qty ??
            firstBuyRule?.get ??
            ""
          );
          const fallback = x && y
            ? replaceProgressTextRaw({
              text: "Buy X Get Y Discount: Buy {{x}} get {{y}}",
              type: "buyxgety",
              rule: firstBuyRule,
              subtotalRupees,
              useRemainingForGoal: false,
              tokenWrap: wrapAnnouncementToken,
            })
            : "Buy X Get Y Discount";
          unique.push(fallback);
        }
      }
    }

    // Static announcement text set in Customize & Preview settings
    const staticAnnounce = trimToNull(
      PROXY?.styleSettings?.announcementBarText ??
      PROXY?.styleSettings?.announcementBarMsg ??
      ""
    );
    if (staticAnnounce) {
      const staticLower = staticAnnounce.trim().toLowerCase();
      if (!unique.some((m) => String(m).trim().toLowerCase() === staticLower)) {
        unique.unshift(staticAnnounce);
      }
    }

    setAnnouncementMessages(unique);
  };

  const getDiscountRuleCode = (rule) =>
    trimToNull(rule?.discountCode ?? rule?.discount_code ?? rule?.code ?? "");

  const getDiscountRuleMinPurchase = (rule) => {
    const n = Number(
      rule?.minPurchase ??
      rule?.min_purchase ??
      rule?.minSubtotal ??
      rule?.min_subtotal ??
      rule?.minimumPurchase ??
      rule?.minimum_purchase ??
      rule?.minimumAmount ??
      rule?.minimum_amount ??
      0
    );

    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const getCartSubtotalRupees = () => {
    return (getCartSubtotalCents() / priceDivisor(CART?.currency)) || 0;
  };

  const getDiscountRuleRemaining = (rule) => {
    const min = getDiscountRuleMinPurchase(rule);
    const subtotal = getCartSubtotalRupees();

    return Math.max(0, min - subtotal);
  };

  const findAppliedDiscountCodeRule = () => {
    const list = Array.isArray(CODE_DISCOUNT_RULES) ? CODE_DISCOUNT_RULES : [];

    for (const rule of list) {
      if (!isRuleEnabled(rule)) continue;

      const code = getDiscountRuleCode(rule);
      if (!code) continue;

      if (isDiscountAppliedInCart(code)) {
        return { rule, code };
      }
    }

    return null;
  };

  const maybeShowAppliedDiscountCodePopup = () => {
    const applied = findAppliedDiscountCodeRule();
    if (!applied) {
      if (trimToNull(discountPopupShownForCode)) {
        clearPopupShown("discount", discountPopupShownForCode);
      }
      discountPopupShownForCode = null;
      return false;
    }

    const manualCode = trimToNull(scStore.get(MANUAL_DISCOUNT_CODE_KEY));
    if (!manualCode) return false;
    if (
      String(manualCode).trim().toLowerCase() !==
      String(applied.code).trim().toLowerCase()
    ) {
      return false;
    }

    const normalized = String(applied.code).trim().toLowerCase();
    if (!normalized) return false;
    if (!canShowPopupFor("discount", normalized)) return false;

    discountPopupShownForCode = normalized;
    markPopupShown("discount", normalized);

    const subtotalRupees = (Number(CART?.items_subtotal_price || 0) / priceDivisor()) || 0;
    const txt = replaceProgressText({
      text: trimToNull(getProgressAfter(applied.rule)) || "",
      type: "discount",
      rule: applied.rule,
      subtotalRupees,
      useRemainingForGoal: false,
    });

    openDrawer();
    firePaperEffect(2800);
    showCenterCelebratePopup("Discount Applied ✅", txt || `Discount applied: ${applied.code}`, 5000);
    return true;
  };

  /* =========================================================
   STYLES ✅
  ========================================================= */
  const ensureStyles = () => {
    if (document.getElementById("smartcartify-drawer-v27-style")) return;
    const s = document.createElement("style");
    s.id = "smartcartify-drawer-v27-style";
    s.textContent = `.sc-overlay, .sc-drawer, .sc-progress, .sc-milestone, .sc-track, .sc-fill, .sc-dots{display:block !important;}

:root{
  --sc-base-font-size: 16px;
  --sc-font: inherit;
  --sc-heading-scale: 1.2;
  --sc-heading-font-size: calc(var(--sc-base-font-size) * var(--sc-heading-scale));
  --sc-button-font-size: calc(var(--sc-base-font-size) * 1.1);
  --sc-small-font-size: calc(var(--sc-base-font-size) * 0.85);
  --sc-overlay-bg: rgba(0,0,0,.45);

  --sc-bg: transparent;
  --sc-text: #000000;

  --sc-border: rgba(229,231,235,1);
  --sc-muted: rgba(107,114,128,1);

  --sc-drawer-width: min(480px,92vw);
  --sc-drawer-bg: #ffffff;
  --sc-drawer-text-color: #000000;
  --sc-drawer-header-color: #000000;

  --sc-top-bg-color: #ffffff;
  --sc-top-bg-image: none;
  --sc-top-bg-color-effective: var(--sc-top-bg-color);
  --sc-top-bg-image-effective: none;

  --sc-progress-bg: var(--sc-top-bg-color-effective);
  --sc-progress-text: var(--sc-text);

  --sc-progress: #000000;
  --sc-free-tag-color: var(--sc-progress);
  --sc-free-tag-font-size: var(--sc-small-font-size);
  --sc-stepcount:4;
  --sc-dot:28px;
  --sc-track-h:8px;
  --sc-milestone-width:min(420px, 92vw);

  --sc-radius:14px;
  --sc-btn-radius:12px;
  --sc-chip-radius:999px;

  --sc-item-bg: #f3f4f6;
  --sc-item-border: transparent;
  --sc-image-bg: rgba(243,244,246,1);

  --sc-qty-btn-bg: rgba(255,255,255,1);
  --sc-qty-btn-border: var(--sc-border);
  --sc-qty-btn-text: #111827;
  --sc-qty-input-bg: rgba(255,255,255,1);
  --sc-qty-input-border: var(--sc-border);
  --sc-qty-input-text: #111827;

  --sc-footer-bg: var(--sc-drawer-bg);
  --sc-input-bg: rgba(255,255,255,1);
  --sc-input-border: var(--sc-border);
  --sc-input-text: #111827;
  --sc-input-placeholder: rgba(156,163,175,1);

  --sc-apply-bg: #000000;
  --sc-apply-text: #ffffff;
  --sc-apply-border: rgba(17,24,39,.25);

  --sc-subtotal-bg: rgba(255,255,255,1);
  --sc-subtotal-text: #111827;
  --sc-subtotal-label: rgba(107,114,128,1);

  --sc-checkout-bg: #000000;
  --sc-checkout-text: #ffffff;
  --sc-announce-bg: var(--sc-checkout-bg);
  --sc-announce-text: #ffffff;
  --sc-badge-bg: rgba(17,24,39,.1);
  --sc-badge-text: #111827;
  --sc-icon-color: var(--sc-drawer-header-color);

  --sc-freegift-bg:var(--sc-drawer-bg);
  --sc-freegift-border: rgba(15,23,42,.08);
  --sc-freegift-shadow: 0 20px 40px rgba(15,23,42,.25);
  --sc-freegift-text: #0f172a;
  --sc-freegift-subtext: var(--sc-drawer-text-color);
  --sc-freegift-btn-bg: var(--sc-progress);
  --sc-freegift-btn-text: #ffffff;
  --sc-celebrate-backdrop: rgba(17,24,39,.25);
  --sc-celebrate-bg: #ffffff;
  --sc-celebrate-border: rgba(0,0,0,.08);
  --sc-celebrate-badge-bg: rgba(87,192,17,.14);
  --sc-celebrate-title-color: #111827;
  --sc-celebrate-title-size: var(--sc-heading-font-size);
  --sc-celebrate-text-size: var(--sc-small-font-size);

  --sc-close-bg: transparent;
  --sc-close-border: var(--sc-border);
  --sc-close-text: #ffffff;
  --sc-close-icon-color: #ffffff;
}

.sc-overlay{
  position:fixed;inset:0;
  background:var(--sc-overlay-bg);
  opacity:0;visibility:hidden;transition:.2s;
  z-index:2147483646 !important;
  pointer-events:none !important;
}
.sc-overlay.open{opacity:1;visibility:visible;pointer-events:auto !important}
.sc-close svg path {
    fill: var(--sc-icon-color) !important;
    color: var(--sc-icon-color);
}
.sc-drawer{
  position:fixed;top:0;right:0;height:100%;
  max-width:425px;
  width:100% !important;
  background: var(--sc-drawer-bg);
  background-size:cover;
  background-position:center;
  background-repeat:no-repeat;
  transform:translateX(110%);
  transition:transform .25s ease;
  z-index:2147483647 !important;
  pointer-events:none !important;
  display:flex !important;
  flex-direction:column;
  font-size:var(--sc-base-font-size);
  color:var(--sc-drawer-text-color);
}
.sc-drawer.sc-position-left{
  right:auto;
  left:0;
  transform:translateX(-110%);
}
.sc-drawer.sc-position-left.open{transform:translateX(0)}
.sc-drawer.sc-position-right{
  right:0;
  left:auto;
}
.sc-drawer.sc-mobile-bottom-sheet{
  top:auto;
  left:0;
  right:0;
  bottom:0;
  max-width:800px !important;
  margin:0 auto;
  height:min(88vh, 720px);
  transform:translateY(110%);
}
.sc-drawer.sc-mobile-bottom-sheet.open{transform:translateY(0)}
.sc-drawer.open{transform:translateX(0);pointer-events:auto !important}
.sc-drawer.sc-position-left.open{transform:translateX(0)}
.sc-drawer.sc-mobile-bottom-sheet.open{transform:translateY(0)}
.sc-drawer *{box-sizing:border-box;pointer-events:auto !important;}
  .sc-close svg {
    fill: var(--sc-close-icon-color) !important;
    color:var(--sc-close-icon-color);
}

    
body.sc-cartify-open header,
body.sc-cartify-open header-component,
body.sc-cartify-open .shopify-section-group-header-group{
  pointer-events:none !important;
}

.content-cart-smartcartify{
  display:flex;
  flex-direction:column;
  flex:1;
  min-height:0;
}

.sc-header{
  padding:10px;
  display:flex;align-items:center;justify-content:space-between;gap:12px;
  color:var(--sc-drawer-header-color);
  background-color: var(--sc-top-bg-color-effective);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  backdrop-filter: blur(6px);
  border-bottom:1px solid var(--sc-border);
}
.sc-title-wrap{
  display:flex;
  align-items:center;
  gap:10px;
  min-width:0;
}
.sc-title-icon{
  width:30px;
  height:30px;
  border-radius:10px;
  display:grid;
  place-items:center;
  color:var(--sc-icon-color);
  background:rgba(255,255,255,.12);
  flex:0 0 auto;
}
.sc-title-icon svg{
  width:18px;
  height:18px;
  display:block;
  color:var(--sc-icon-color);
}
.sc-title-icon .sc-cart-icon-img,
[data-smart-cartify-open] .sc-cart-icon-img,
.sc-mobile-open-fallback .sc-cart-icon-img{
  width:25px;
  height:24px;
  display:block;
  object-fit:contain;
}
.sc-title-icon .sc-cart-icon-img{
  width:20px;
  height:20px;
}
.sc-title{
  font-size:20px;
  font-weight:700;
  margin:0;
  color:var(--sc-drawer-header-color);
  display:flex;
  align-items:baseline;
  gap:6px;
  min-width:0;
}
.sc-title-count{
  font-size:var(--sc-base-font-size);
  font-weight:600;
  opacity:.9;
}
.sc-drawer.sc-offers-active .sc-header{
  padding:15px 15px 15px;
  align-items:flex-start;
}
.sc-drawer.sc-offers-active .sc-title-icon{
  display:none;
}

.sc-drawer.sc-offers-active .sc-close{
  width:auto;
  min-width:72px;
  height:34px;
  border-radius:999px;
  padding:0 14px;
  gap:4px;
  background:#ffffff;
  color:#20305f;
  box-shadow:0 6px 18px rgba(15,23,42,.18);
  font-size:13px;
  font-weight:800;
}
.sc-drawer.sc-offers-active .sc-close::after{
  content:"Close";
}
.sc-drawer.sc-offers-active .sc-close svg{
  width:16px;
  height:16px;
}
.sc-close{
  width:40px;height:40px;border-radius:10px;
  border:unset;
  background:var(--sc-close-bg);
  cursor:pointer;font-size:var(--sc-button-font-size);line-height:1;
  color:var(--sc-close-text);
  display:flex;
  align-items:center;
  justify-content:center;
  flex:0 0 40px;
  position:relative;
  z-index:3;
  touch-action:manipulation;
  -webkit-tap-highlight-color:transparent;
}
.sc-close svg{
  width:22px;
  height:22px;
  display:block;
  pointer-events:none;
}
.sc-close svg path{
  fill:currentColor !important;
}

/* Announcement */
.sc-announce{
  background: var(--sc-announce-bg);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  width:100%;
  padding: 0 15px;
}
.sc-announce-static{
  width:100%;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:6px 12px;
}
.sc-announce-static-text{
  display:inline-block;
  text-align:center;
  font-size:var(--sc-small-font-size);
  font-weight:700;
  color: var(--sc-announce-text);
}
.marquee-text{
  box-sizing:border-box;
  align-items:center;
  overflow:hidden;
  background:var(--sc-announce-bg);
}
.marquee-text .top-info-bar{
  font-size:var(--sc-small-font-size);
  width:200%;
  display:flex;
  gap:32px;
  animation: marquee 25s linear infinite running;
}
.marquee-text .top-info-bar:hover{animation-play-state: paused;}
.marquee-text .top-info-bar .info-text{
  padding:10px 30px;
  white-space:nowrap;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:.25em;
  transition: all .2s ease;
  color:var(--sc-announce-text);
  font-size:var(--sc-base-font-size);
}
.marquee-text .top-info-bar .info-text .sc-announce-em{
  font-weight:700;
  font-size:calc(var(--sc-base-font-size) + 1px);
  margin:0 .15em;
}
.marquee-text .top-info-bar .info-text .sc-announce-code{
  cursor:pointer;
  text-decoration:underline;
}
.marquee-text .top-info-bar .info-text .sc-announce-copied{
  opacity:0.9;
}
.marquee-text .top-info-bar .info-text a{color: var(--sc-announce-text);text-decoration:none;}
@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translate(-50%); } }

/* Progress */
.sc-goal-bold {
  font-weight: 700;
}
.sc-progress {
    background: var(--sc-progress-bg);
    color: var(--sc-progress-text);
    position: relative;
    flex: 0 0 auto;
    overflow: hidden;
    top:4px;
}
.sc-label{
  font-size:var(--sc-base-font-size) !important;
  font-weight:700;margin:0 0 12px;
  text-align:center;
  min-height:22px;
  padding:0 28px;
  color: var(--sc-progress-text);
}

.sc-progress-loading{
  position:absolute;left:0;right:0;bottom:0;height:3px;overflow:hidden;
  opacity:0;transform:translateY(6px);
  transition:opacity .15s ease, transform .15s ease;
}
.sc-refreshing .sc-progress-loading{opacity:1;transform:translateY(0);}
.sc-progress-loading::before{
  content:"";position:absolute;left:-40%;top:0;height:100%;width:40%;
  background:rgba(255,255,255,.75);animation:scLine .9s linear infinite;
}
@keyframes scLine{0%{left:-40%}100%{left:110%}}
@keyframes scSpin{to{transform:rotate(360deg)}}

.sc-milestone{width:min(100%, var(--sc-milestone-width));margin:0 auto;padding: 0 10px;}
.sc-track{position:relative;height:72px;}
.sc-track::before{
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: 18px;
    height: max(var(--sc-track-h), 8px);
    transform: translateY(-50%);
    background: color-mix(in srgb, var(--sc-progress) 22%, transparent);
    border-radius: 999px;
}
.sc-fill{
  position:absolute;left:0;
  top:18px;
  height:max(var(--sc-track-h), 8px);
  transform:translateY(-50%);
  width:0%;
  background:var(--sc-progress);
  border-radius:999px;
  transition:width .25s ease;
  z-index:1;
}
.sc-dots{position:absolute;inset:0;z-index:2;pointer-events:none;}

.sc-dot-wrap{
  position:absolute;
  top:0px;
  transform:translateX(-50%);
  display:flex;
  flex-direction:column;
  align-items:center;
  width:96px;
}
.sc-dot-wrap.last{transform:translateX(-70%);}
.sc-dot-html svg{
    height:19px !important;
    width:19px !important;
}
.sc-dot-bubble{
  width:34px;
  height:34px;
  border-radius:999px;
  background:var(--sc-progress-bg);
  color:var(--sc-icon-color);
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:var(--sc-base-font-size);
  border: 2px solid var(--sc-border);
  box-shadow:0 1px 4px rgba(15,23,42,.18);
}
.sc-dot-bubble .sc-dot-svg{
  display:flex;
  align-items:center;
  justify-content:center;
  line-height:0;
}
.sc-dot-bubble .sc-dot-svg svg{
  width:19px;
  height:19px;
  display:block;
  fill: currentColor;
}
 .sc-upsell-arrow svg g {
    fill: var(--sc-icon-color) !important;
}
.sc-dot-bubble .sc-dot-html svg{
  width:19px;
  height:19px;
  display:block;
  fill: currentColor;
}
.sc-dot-bubble .sc-dot-html{
  display:flex;
  align-items:center;
  justify-content:center;
  line-height:0;
}
.sc-dot-bubble .sc-dot-html i{
  font-size:19px;
  line-height:1;
  display:block;
}
.sc-dot-bubble .sc-dot-emoji{
  line-height:1;
}
.sc-dot-wrap.done .sc-dot-bubble{background:var(--sc-progress);border-color:var(--sc-progress);color:var(--sc-checkout-text)}
.sc-dot-wrap.done .sc-dot-bubble svg{
  fill:currentColor;
}
.sc-dot-wrap.active .sc-dot-bubble{background:var(--sc-progress-bg);color:var(--sc-icon-color)}

.sc-progress.sc-cart-goal-progress .sc-label{
  margin-bottom:0px;
  font-weight:500;
  color:var(--sc-progress-text);
}
.sc-progress.sc-cart-goal-progress .sc-milestone{
  width:min(100%, var(--sc-milestone-width));
  border-bottom: 1px solid #d9d7d9;
}
.sc-progress.sc-cart-goal-progress .sc-track{
  height:62px;
  width:100%;
}
.sc-progress.sc-cart-goal-progress .sc-track::before{
  top:18px;
  height:max(var(--sc-track-h), 8px);
}
.sc-progress.sc-cart-goal-progress .sc-fill{
  top:18px;
  height:max(var(--sc-track-h), 8px);
}
.sc-progress.sc-cart-goal-progress .sc-dot-bubble{
  width:34px;
  height:34px;
  border:2px solid var(--sc-border);
  background:var(--sc-progress-bg);
  color:var(--sc-icon-color);
  box-shadow:0 1px 4px rgba(15,23,42,.18);
}
.sc-progress.sc-cart-goal-progress .sc-dot-bubble svg{
  width:19px;
  height:19px;
  display:block;
  fill:currentColor;
  stroke:none;
}
.sc-progress.sc-cart-goal-progress .sc-dot-wrap.done .sc-dot-bubble{
  background:var(--sc-progress);
  border-color:var(--sc-progress);
  color:#ffffff;
}
.sc-progress.sc-cart-goal-progress .sc-dot-wrap.done .sc-dot-bubble svg{
  fill:currentColor;
  stroke:none;
}
.sc-progress.sc-cart-goal-progress .sc-dot-wrap:not(.done) .sc-dot-bubble{
  background:var(--sc-progress-bg);
  color:var(--sc-icon-color);
}
.sc-progress.sc-cart-goal-progress .sc-dot-text{
  margin-top:2px;
  width:96px;
  max-width:96px;
  min-width:0;
  overflow:hidden;
  display:block;
  -webkit-line-clamp:unset;
  white-space:nowrap;
  text-overflow:ellipsis;
}

.sc-dot-text{
  font-size:var(--sc-small-font-size);
  color:var(--sc-progress-text);
  text-align:center;
  line-height:13px;
  width:96px;
  max-width:96px;
  margin-top:6px;
  overflow:hidden;
  display:block;
  text-overflow:ellipsis;
  word-break:normal;
  white-space:nowrap;
}

.sc-legends{display:none !important;}


.sc-items{
  position:relative;
  flex:1;
  overflow:hidden;
  padding:0;
  backdrop-filter:blur(6px);
  color:#000000;
  margin: 5px;
  padding: 0px;
  display:flex;
  flex-direction:column;
  gap:10px;
  flex:1 1 auto;
  min-height:0;
  overflow:auto;
  scrollbar-width:none; /* Firefox */
  -ms-overflow-style:none; /* IE/Edge legacy */
}
.sc-items-list{
  display:flex;
  flex-direction:column;
  gap:10px;
}

.sc-cart-msg{
  margin:0 0 10px;
  padding:12px 14px;
  border-radius:14px;
  font-size:var(--sc-small-font-size);
  font-weight:600;
  line-height:1.35;
  border:1px solid transparent;
  display:none;
  align-items:flex-start;
  justify-content:space-between;
  gap:10px;
}
.sc-cart-msg.show{
  display:flex;
}
.sc-cart-msg-text{
  margin:0;
  flex:1;
}
.sc-cart-msg-close{
  border:none;
  background:transparent;
  color:inherit;
  width:20px;
  height:20px;
  padding:0;
  margin:0;
  line-height:1;
  font-size:18px;
  font-weight:700;
  cursor:pointer;
  opacity:.8;
}
.sc-cart-msg-close:hover{
  opacity:1;
}
.sc-cart-msg.warn{
  background:rgba(254,226,226,.55);
  border-color:rgba(239,68,68,.4);
  color:#b23a3a;
}
.sc-cart-msg.error{
  background:rgba(254,226,226,.84);
  border-color:rgba(239,68,68,.4);
  color:#991b1b;
}
.sc-cart-msg.info{
  background:rgba(219,234,254,.84);
  border-color:rgba(59,130,246,.35);
  color:#1e3a8a;
}

.sc-items-list::-webkit-scrollbar{width:0;height:0;display:none;} /* Chrome/Safari */
.sc-items-footer{
  // display:flex;
  flex-direction:column;
  gap:10px;
  margin-top:auto;
}
.sc-items-footer:empty{display:none !important;}
.sc-items-loading{
  position:absolute;
  inset:0;
  display:none;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:0;
  background:rgba(255,255,255,.88);
  z-index:2;
}
.sc-loading-items .sc-items-loading{
  display:flex;
}
.sc-items-spinner{
  width:34px;
  height:34px;
  border-radius:50%;
  border:3px solid #e5e7eb;
  border-top-color:var(--sc-progress);
  animation:scSpin .8s linear infinite;
}
.sc-items-loading-text{
  font-size:var(--sc-small-font-size);
  color:#111827;
  font-weight:600;
}
.sc-drawer.sc-empty-state .sc-items-footer,
.sc-drawer.sc-empty-state .sc-footer{
  display:none !important;
}
.sc-empty{
  margin:16px;padding:18px;
  border:1px dashed var(--sc-border);
  border-radius:var(--sc-radius);
  font-size: var(--sc-small-font-size);
  color: #000000;
  text-align:center;
}
.sc-empty svg{
  width:64px;
  height:64px;
  display:block;
  margin:0 auto 10px;
}
.sc-empty-text{
  font-weight:700;
}

.sc-item{
  position:relative;
  display:grid;
  grid-template-columns:90px minmax(0, 1fr);
  align-items:flex-start;
  gap:10px;
  padding:5px;
  border:1px solid var(--sc-item-border);
  border-radius:6px;
}
.sc-item:last-child{
  border-bottom:1px solid var(--sc-item-border);
}
.sc-img{
  width:60px;
  height:50px;
  overflow:hidden;
  background:var(--sc-image-bg);
  border-radius:4px;
  flex:0 0 auto;
}
.sc-img img{width:100%;height:100%;object-fit:cover;object-position:top;display:block;}
.sc-mid{
  min-width:0;
  display:flex;
  flex-direction:column;
  gap:8px;
  padding-right:0px;
}
.sc-name{
  margin:0;
  font-size:30px !important;
  font-size:clamp(20px, calc(var(--sc-base-font-size) * 1.5), 30px) !important;
  font-weight:700;
  line-height:18px !important;
  color:var(--sc-drawer-text-color);
}
.sc-name a{
  color:inherit;
  text-decoration:none;
  font-size:var(--sc-base-font-size) !important;
}
.sc-name a:hover{text-decoration:underline;}
.sc-meta{
  display:flex;
  flex-direction:column;
  gap:3px;
}
.sc-meta-line{
  margin:0;
  font-weight:500;
  color:var(--sc-text);
  font-size:var(--sc-base-font-size) !important;
  line-height:15px !important;
}
.sc-progress-loading {
    display: none !important;
}
.sc-mid-bottom{
  display:flex;
  align-items:flex-end;
  justify-content:space-between;
  gap:12px;
  margin-top:4px;
}
.sc-item-reward .sc-mid-bottom{
  align-items:flex-start;
}
.sc-qty{
  display:inline-flex;
  align-items:center;
  gap:8px;
  overflow:visible;
  background:transparent;
}
.sc-qty button{
  width:40px;
  height:25px;
  border:1px solid var(--sc-qty-btn-border);
  border-radius:2px;
  background:var(--sc-qty-btn-bg);
  cursor:pointer;
  font-size:20px;
  font-weight:500;
  line-height:1;
  color:var(--sc-qty-btn-text);
}

.sc-qty button:hover {
    filter: brightness(1);
    background: var(--sc-checkout-bg);
    color: aliceblue;
}
.sc-qty button:active{transform:scale(0.98);}
.sc-qty input{
  width:10px;
  height:26px;
  border:none;
  background:transparent;
  text-align:center;
  outline:none;
  color:var(--sc-qty-input-text);
  font-size:var(--sc-base-font-size) !important;
  font-weight:600;
  padding:0;
}
.sc-qty input[type="number"]{
  appearance:textfield;
  -moz-appearance:textfield;
}
.sc-qty input[type="number"]::-webkit-outer-spin-button,
.sc-qty input[type="number"]::-webkit-inner-spin-button{
  -webkit-appearance:none;
  margin:0;
}
.sc-item.sc-item-pending .sc-qty{
  position:relative;
}
.sc-item.sc-item-pending .sc-qty::after{
  content:"";
  width:12px;
  height:12px;
  border-radius:50%;
  border:2px solid #e5e7eb;
  border-top-color:var(--sc-progress);
  animation:scSpin .8s linear infinite;
}
.sc-pricebox{
  flex:0 0 auto;
  display:flex;
  flex-direction:column;
  align-items:flex-end;
  gap:2px;
  margin-left:auto;
  white-space:nowrap;
  padding-top:0;
}
.sc-compare{font-size:var(--sc-small-font-size);color:#9ca3af;text-decoration:line-through;font-weight:700;}
.sc-price{
  font-size:var(--sc-base-font-size) !important;
  color:var(--sc-drawer-text-color);
}
.sc-price.sc-price-free{
  color:var(--sc-drawer-text-color);}
.sc-free-tag{
  display:inline-block;
  margin-left:6px;
  font-size:var(--sc-free-tag-font-size);
  color:var(--sc-free-tag-color);
  font-weight:700;
  line-height:1.25;
}
.sc-free-tag-under{
  margin-left:0;
  margin-top:0;
}
.sc-reward-line-badge{
    min-width: 0;
    text-align: left;
    color: var(--sc-badge-text);
    background: rgb(17 24 39 / 82%);
    width: fit-content;
    padding: 1px 10px;
    border-radius: 10px;
}
.sc-qty-stack{
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  gap:4px;
  min-width:0;
}
.sc-bxgy-line-badge{
  margin-left:0;
  color:var(--sc-free-tag-color);
  font-weight:800;
  white-space:nowrap;
}

.sc-upsell{
  padding: 0px 12px;
  order:2;
  background: var(--sc-upsell-bg);
}
.sc-upsell-card{
  padding: 6px 4px;
}
.sc-upsell-title{
  font-size: 16px;
  font-weight: 700;
  text-align: center;
  letter-spacing: 0.2px;
  color: var(--sc-upsell-text, var(--sc-drawer-text-color));
}
.sc-upsell-inner {
    background: var(--sc-upsell-bg, #ffffff);
    padding: 2px 10px;
    position: relative;
    overflow: visible;
    width: 96%;
    margin: 0 auto;
}
.sc-upsell-viewport{
  overflow: hidden;
}
.sc-upsell-track{
  display: flex;
  width: 100%;
  transition: transform 450ms ease;
  gap: 0;
}
.sc-upsell-item + .sc-upsell-item{
  margin-top: 12px;
}
.sc-upsell-slide{
  flex: 0 0 100%;
  min-width: 100%;
}
.sc-upsell-row{
  display: grid;
  grid-template-columns: 72px 1fr auto;
  gap: 14px;
  align-items: center;
}
.sc-upsell-info{
  display: grid;
  gap: 4px;
  min-width: 0;
}
.sc-upsell-top{
  display: flex;
  gap: 10px;
  align-items: baseline;
  justify-content: space-between;
}
.sc-upsell-img{
  width: 50px;
  height: 50px;
  background: #f1f5f9;
  overflow: hidden;
  display: grid;
  place-items: center;
}
.sc-upsell-img img{
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.sc-upsell-name{
  font-weight: 700;
  font-size: var(--sc-base-font-size);
  color: var(--sc-upsell-text, var(--sc-drawer-text-color));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sc-upsell-sub{
  font-size: 12px;
  color: var(--sc-upsell-text, var(--sc-drawer-text-color));
  opacity: 0.8;
  display: block;
  text-transform: capitalize;
  display: none;
}
.sc-upsell-price{
  font-weight: 700;
  color: var(--sc-upsell-text, var(--sc-drawer-text-color));
  white-space: nowrap;
}
.sc-upsell-controls{
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  margin-top: 6px;
  gap: 10px;
}
.sc-upsell-controls.no-variant{
  grid-template-columns: auto;
  justify-content: start;
}
.sc-upsell-select-wrap{
  position: relative;
}
.sc-upsell-select{
  width: 100%;
  border: 1px solid var(--sc-border);
  padding: 6px 28px 6px 10px;
  font-size: var(--sc-small-font-size);
  color: var(--sc-upsell-text, var(--sc-drawer-text-color));
  background: #ffffff;
  min-height: 32px;
  min-width: 120px;
  appearance: none;
}
.sc-upsell-select:focus{
  outline: none;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
  border-color: #2563eb;
}
.sc-upsell-select-arrow{
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--sc-upsell-arrow, #111827);
  pointer-events: none;
  font-size: 8px;
}
.sc-upsell-btn{
  background: var(--sc-upsell-button-bg, #111111) !important;
  background-color: var(--sc-upsell-button-bg, #111111) !important;
  border: 1px solid var(--sc-border, #e2e8f0);
  color: var(--sc-upsell-button-text, #ffffff) !important;
  padding: 6px 10px;
  font-size: 12px;
  min-height: 32px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.sc-upsell-btn-icon{
  font-size: 14px;
  font-weight: 900;
  line-height: 1;
}
.sc-upsell-btn-oos{
  border:1px solid #9ca3af;
  background:#f3f4f6;
  color:#6b7280;
  font-weight:700;
  text-transform:uppercase;
}
.sc-upsell-btn-oos[hidden]{display:none !important;}
.sc-upsell-arrow{
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: unset;
  display: grid;
  place-items: center;
  color: var(--sc-upsell-arrow, #111827);
  font-weight: 800;
  font-size: 22px;
  line-height: 1;
  box-shadow: unset;
  cursor: pointer;
  z-index: 2;
  background:unset;
}
.sc-upsell-arrow:hover{
  transform: translateY(-50%) scale(1.04);
}
.sc-upsell-arrow.left{left: -28px;}
.sc-upsell-arrow.right{right: -28px;}

/* remove icon */
.sc-remove-x {
    position: absolute;
    top: 7px;
    right: 5px;
    width: 20px;
    height: 20px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 22px;
    font-weight: 500;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--sc-text);
}
.sc-remove-x .sc-remove-char{
  display:block;
  font-size:inherit;
  line-height:1;
  color: var(--sc-drawer-text-color);
}
.sc-remove-x:hover{opacity:.85}

/* Footer */
.sc-footer {
    padding: 5px 10px 5px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    backdrop-filter: blur(6px);
    color: var(--sc-drawer-text-color);
    background: var(--sc-footer-bg);
    position: sticky;
    bottom: 0;
    z-index: 8;
    --tw-shadow: 0 1px 3px 0 rgb(0 0 0 / 48%), 0 1px 2px -1px rgb(0 0 0 / 42%) !important;
    --tw-shadow-colored: 0 1px 3px 0 var(--tw-shadow-color), 0 1px 2px -1px var(--tw-shadow-color) !important;
    box-shadow: 0 0 #0000, 0 0 #0000, 0 1px 3px #0000001a, 0 1px 2px -1px #0000001a !important;
    box-shadow: var(--tw-ring-offset-shadow, 0 0 rgba(0, 0, 0, 0)), var(--tw-ring-shadow, 0 0 rgba(0, 0, 0, 0)), var(--tw-shadow) !important;
    margin: 5px;
    border-radius: 5px;
}
.sc-footer.sc-footer-static{
  position:relative;
  bottom:auto;
}
.sc-footer .sc-footer-milestones{
  margin:0 12px;
}
.sc-discount{display:none !important;gap:10px;align-items:center;margin-bottom: 5px;order:4;flex-wrap:wrap;padding: 0 15px;}
.sc-discount:not([hidden]){display:flex !important;}
.sc-discount input{
  flex:1;height:44px;
  border: 1px solid var(--sc-input-border);
  background:transparent;
  padding:0 14px;font-size:var(--sc-base-font-size);
  color:var(--sc-input-text);
  box-shadow: unset !important;
    outline: unset !important;
    outline-offset: unset !important
}
.sc-discount input::placeholder{color:var(--sc-input-placeholder);}

.sc-discount button{
  min-width:110px;
  height:44px;
  border:1px solid var(--sc-apply-border);
  background: var(--sc-apply-bg);
  color: var(--sc-apply-text);
  cursor:pointer;
  // border-radius: var(--sc-btn-radius);
}
.sc-discount-msg{
  width:100%;
  margin-top:4px;
  font-size:var(--sc-small-font-size);
  color:#b91c1c;
  text-align:center;
}
.sc-discount-msg[hidden]{display:none !important;}


.sc-footer-milestones:empty{display:none;}
.sc-footer-milestones[hidden]{display:none !important;}
.sc-footer-summary{
  display:grid;
  gap:8px;
  padding:2px 0 4px;
}
.sc-foot-badge{
  width:max-content;
  display:inline-flex;
  align-items:center;
  gap:5px;
  padding:5px 8px;
  border-radius:4px;
  background:#f0f0f0;
  color:#111111;
  font-size:var(--sc-small-font-size);
  line-height:1;
  font-weight:800;
}
.sc-foot-badge svg{
  width:14px;
  height:14px;
  fill:currentColor;
  display:block;
}
.sc-foot-row{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:8px;
}

.sc-foot-name{
  margin:0;
  font-size:var(--sc-base-font-size);
  font-weight:500;
  color:rgba(80,66,55,.78);
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.sc-foot-tag{
  display:inline-flex;
  align-items:center;
  gap:4px;
  padding:4px 8px;
  font-size:var(--sc-small-font-size);
  line-height:1;
  font-weight:800;
  border-radius:4px;
  background:#f0f0f0;
  color:#111111;
  white-space:nowrap;
}
.sc-foot-tag svg{
  width:13px;
  height:13px;
  fill:currentColor;
  display:block;
}

@media (max-width: 640px){
  .sc-drawer{
    width:100vw;
  }
  .sc-drawer.sc-mobile-bottom-sheet{
    border-radius:16px 16px 0 0;
  }
  .sc-items{
    margin:8px;
    padding:8px;
  }
  .sc-footer{
    padding:8px;
  }
  .sc-footer .sc-footer-milestones{
    margin:0 8px;
  }
  .sc-foot-row{
    grid-template-columns:minmax(0,1fr) auto;
  }
  .sc-foot-tag{
    justify-self:end;
  }
  .sc-foot-amt{
    justify-self:end;
  }
  .sc-discount{
    padding:0 8px;
  }
  .sc-item{
    grid-template-columns:40px minmax(0, 1fr);
    gap:12px;
  }
  .sc-img{
    width:40px;
    height:40px;
  }
  .sc-name{
    font-size:clamp(17px, calc(var(--sc-base-font-size) * 1.25), 22px) !important;
  }
  .sc-meta-line{
    font-size:var(--sc-base-font-size) !important;
  }
  .sc-qty{
    gap:6px;
  }
  .sc-qty button{
    width:30px;
    height:30px;
    font-size:18px;
  }
  .sc-qty input{
    width:22px;
    height:30px;
    font-size:var(--sc-base-font-size) !important;
  }
  .sc-price{
    font-size:clamp(18px, calc(var(--sc-base-font-size) * 1.3), 24px);
  }
}
.sc-foot-amt{
  font-size:var(--sc-base-font-size);
  font-weight:800;
  color:var(--sc-drawer-text-color);
  white-space:nowrap;
  margin-left:auto;
}
.sc-foot-total{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  font-size:var(--sc-base-font-size);
  color:var(--sc-drawer-text-color);
}

.sc-footer-row{display:flex;gap:10px;align-items:stretch;}

.sc-offers{
  position: absolute;
    z-index: 25;
    height: 83%;
    max-width: 449px !important;
    width: 100% !important;
    background: var(--sc-drawer-bg);
    background-size: cover;
    background-position: center;
    transition: transform .25s ease;
    pointer-events: auto !important;
    display: flex !important;
    flex-direction: column;
    font-size: var(--sc-base-font-size);
    color: var(--sc-drawer-text-color);
    flex: 1;
    min-height: 0;
    overflow: auto;
     --tw-shadow: 0 1px 3px 0 rgb(0 0 0 / 48%), 0 1px 2px -1px rgb(0 0 0 / 42%) !important;
    --tw-shadow-colored: 0 1px 3px 0 var(--tw-shadow-color), 0 1px 2px -1px var(--tw-shadow-color) !important;
    box-shadow: 0 0 #0000, 0 0 #0000, 0 1px 3px #0000001a, 0 1px 2px -1px #0000001a !important;
    box-shadow: var(--tw-ring-offset-shadow, 0 0 rgba(0, 0, 0, 0)), var(--tw-ring-shadow, 0 0 rgba(0, 0, 0, 0)), var(--tw-shadow) !important;
}
.sc-drawer.sc-offers-active .content-cart-smartcartify,
.sc-drawer.sc-offers-active .sc-footer{
  background:#f4f4f4 !important;
}
.sc-drawer.sc-offers-active .sc-offers{
  box-shadow:0 2px 8px rgba(15,23,42,.10);
}
.sc-offers[hidden]{display:none !important;}
.sc-offer-row {
    display: grid;
    grid-template-columns: 70px minmax(0, 1fr) auto;
    gap: 14px;
    align-items: center;
    padding: 10px 10px;
    --tw-shadow: 0 1px 3px 0 rgb(0 0 0 / 48%), 0 1px 2px -1px rgb(0 0 0 / 42%) !important;
    --tw-shadow-colored: 0 1px 3px 0 var(--tw-shadow-color), 0 1px 2px -1px var(--tw-shadow-color) !important;
    box-shadow: 0 0 #0000, 0 0 #0000, 0 1px 3px #0000001a, 0 1px 2px -1px #0000001a !important;
    box-shadow: var(--tw-ring-offset-shadow, 0 0 rgba(0, 0, 0, 0)), var(--tw-ring-shadow, 0 0 rgba(0, 0, 0, 0)), var(--tw-shadow) !important;
    margin: 5px;
}
.sc-offer-row:first-child{border-top:0;}
.sc-offer-icon{
  width:58px;
  height:58px;
  border-radius:8px;
  display:grid;
  place-items:center;
  border:0;
  background:#fff;
  color:var(--sc-icon-color);
}
.sc-offer-icon svg{
  width:48px;
  height:48px;
  display:block;
  stroke-width:1.8;
}
.sc-offer-thumbs{
  width:58px;
  min-height:58px;
  display:grid;
  grid-template-columns:repeat(2, 26px);
  grid-auto-rows:26px;
  gap:5px;
  align-content:center;
  justify-content:center;
}
.sc-offer-thumb{
  width:26px;
  height:26px;
  border-radius:7px;
  overflow:hidden;
  display:grid;
  place-items:center;
  background:#eef1f4;
  color:#0b1d57;
  font-size:11px;
  font-weight:900;
  box-shadow:inset 0 0 0 1px rgba(15,23,42,.06);
}
.sc-offer-thumb img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}
.sc-offer-title{
  margin:0;
  color:var(--sc-drawer-text-color);
  font-size:calc(var(--sc-base-font-size) * 1.12);
  line-height:1.25;
  font-weight:900;
}
.sc-offer-subtitle{
  margin:4px 0 0;
  color:var(--sc-drawer-text-color);
  font-size:calc(var(--sc-base-font-size) * 1.02);
  line-height:1.42;
  font-weight:650;
}
.sc-offer-codebox{
  min-width:124px;
  border:1px solid var(--sc-border);
  border-radius:var(--sc-btn-radius);
  overflow:hidden;
  background:#fff;
  display:grid;
  text-align:center;
}
.sc-offer-code-copy{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:5px;
  min-height:40px;
  padding:7px 8px;
  border:0;
  background:#ffffff;
  color:var(--sc-drawer-text-color);
  cursor:pointer;
  position:relative;
}
.sc-offer-code{
  font-weight:900;
  font-size:calc(var(--sc-base-font-size) * 1.04);
  min-width:0;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.sc-offer-copy-icon{
  width:16px;
  height:16px;
  flex:0 0 auto;
  color:#6b7280;
}
.sc-offer-copy-icon svg{
  width:16px;
  height:16px;
  display:block;
}
.sc-offer-copied-text{
  position:absolute;
  inset:0;
  display:grid;
  place-items:center;
  background:var(--sc-checkout-bg);
  color:var(--sc-checkout-text);
  font-weight:900;
  opacity:0;
  pointer-events:none;
  transition:opacity .15s ease;
}
.sc-offer-code-copy.is-copied .sc-offer-copied-text{
  opacity:1;
}
.sc-offer-code-apply{
  min-height:40px;
  border:0;
  background:var(--sc-checkout-bg);
  color:var(--sc-checkout-text);
  font-size:calc(var(--sc-base-font-size) * 1.05);
  font-weight:900;
  cursor:pointer;
  padding:8px 10px;
  display:none;
}
.sc-offer-code-apply:disabled{
  cursor:default;
  opacity:.72;
}
.sc-offer-action{
  border:2px solid var(--sc-checkout-bg);
  background:#fff;
  color:var(--sc-checkout-bg);
  border-radius:var(--sc-btn-radius);
  padding:10px 14px;
  font-weight:900;
  white-space:nowrap;
  cursor:pointer;
  font-size:calc(var(--sc-base-font-size) * 1.02);
}
.sc-offers-empty{
  padding:24px;
  text-align:center;
  color:var(--sc-muted);
  font-weight:800;
}
.sc-footer-tabs{
  display:grid;
  grid-template-columns:1fr 1fr;
  border:1px solid var(--sc-border);
  border-radius:var(--sc-radius);
  overflow:hidden;
  background:#fff;
  box-shadow:0 -4px 14px rgba(15,23,42,.06);
}
.sc-footer-tabs[hidden]{display:none !important;}
.sc-footer-tab{
  min-height:40px;
  border:0;
  border-bottom:3px solid transparent;
  background:#fff;
  color:var(--sc-drawer-text-color);
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:7px;
  font-size:var(--sc-base-font-size);
  font-weight7900;
  box-shadow: 10px 10px 10px 10px #000000;
  cursor:pointer;
}
.sc-footer-tab.is-active{
  color:var(--sc-checkout-bg);
  border-bottom-color:var(--sc-checkout-bg);
}
.sc-footer-tab-icon,
.sc-footer-tab-icon svg{
  width:16px;
  height:16px;
  display:block;
}

.sc-drawer.sc-static-design{
  max-width:445px;
  background:var(--sc-static-shell-bg, #f4f4f4) !important;
  color:var(--sc-static-text, #0b2364) !important;
  box-shadow:-12px 0 28px rgba(15,23,42,.18);
}
.sc-static-design .content-cart-smartcartify{
  background:var(--sc-static-shell-bg, #f4f4f4);
}
.sc-static-design .sc-header{
  min-height:94px;
  padding:28px 20px 22px;
  background:var(--sc-static-header-bg, linear-gradient(135deg,#ff3a2d 0%,#e329b7 46%,#f3dacd 100%)) !important;
  border-bottom:0;
  color:var(--sc-static-header-text, #ffffff);
}
.sc-static-design .sc-title-wrap{
  gap:0;
}
.sc-static-design .sc-title-icon,
.sc-static-design .sc-title-count{
  display:none !important;
}
.sc-static-design .sc-title{
  color:var(--sc-static-header-text, #ffffff) !important;
  font-size:var(--sc-static-title-size, 24px) !important;
  line-height:30px;
  font-weight:900;
}
.sc-static-design .sc-close{
  width:auto;
  height:34px;
  min-width:74px;
  padding:0 13px;
  border-radius:999px;
  background:var(--sc-static-card-bg, #ffffff) !important;
  color:var(--sc-static-text, #0f2a6f) !important;
  font-size:14px;
  font-weight:800;
  box-shadow:0 5px 14px rgba(15,23,42,.14);
}
.sc-static-design .sc-close::after{
  content:"Close";
  margin-left:4px;
}
.sc-static-design .sc-close svg{
  width:14px;
  height:14px;
}
.sc-static-design .sc-close svg path{
  fill:var(--sc-static-text, #0f2a6f) !important;
}
.sc-static-design .sc-announce{
  display:none !important;
}
.sc-static-design .sc-progress{
  margin:-1px 18px 0;
  padding:18px 14px 10px;
  background:var(--sc-static-card-bg, #ffffff) !important;
  border-radius:var(--sc-static-radius, 10px) var(--sc-static-radius, 10px) 0 0;
  border-bottom:1px solid var(--sc-static-border, #e5e7eb);
  color:var(--sc-static-progress-text, #56669d);
}
.sc-static-design .sc-label{
  margin:0 0 13px;
  color:var(--sc-static-progress-text, #56669d) !important;
  font-size:var(--sc-base-font-size, 16px) !important;
  line-height:22px;
  font-weight:700;
}
.sc-static-progress-track{
  position:relative;
  height:50px;
  margin:0 26px;
}
.sc-static-progress-line{
  position:absolute;
  left:0;
  right:0;
  top:8px;
  height:7px;
  border-radius:999px;
  background:var(--sc-static-progress-bg, #e9ebf2);
}
.sc-static-progress-fill{
  position:absolute;
  left:0;
  top:8px;
  width:28%;
  height:7px;
  border-radius:999px;
  background:var(--sc-static-progress, #a93dea);
}
.sc-static-step{
  position:absolute;
  top:0;
  transform:translateX(-50%);
  display:grid;
  justify-items:center;
  gap:5px;
  min-width:92px;
  color:var(--sc-static-progress-text, #53649d);
  font-size:13px;
  line-height:16px;
  font-weight:800;
}
.sc-static-step span{
  width:18px;
  height:18px;
  border-radius:50%;
  display:grid;
  place-items:center;
  background:var(--sc-static-icon-bg, #102864);
  color:var(--sc-static-button-text, #ffffff);
  font-size:10px;
  box-shadow:0 1px 4px rgba(15,23,42,.22);
}
.sc-static-step:nth-child(3){left:33%;}
.sc-static-step:nth-child(4){left:66%;}
.sc-static-step:nth-child(5){left:100%;transform:translateX(-60%);}
.sc-static-design .sc-items{
  margin:0 18px;
  border:0;
  border-radius:0 0 var(--sc-static-radius, 10px) var(--sc-static-radius, 10px);
  background:var(--sc-static-card-bg, #ffffff);
  min-height:414px;
  box-shadow:0 1px 3px rgba(15,23,42,.08);
  overflow:hidden;
}
.sc-static-design .sc-items-list{
  gap:0;
}
.sc-static-cart-row{
  position:relative;
  display:grid;
  grid-template-columns:86px minmax(0,1fr) auto;
  gap:18px;
  align-items:center;
  padding:30px 26px;
  border-bottom:1px solid #e7e7e7;
}
.sc-static-main-img,
.sc-static-upsell-img{
  overflow:hidden;
  background:var(--sc-static-image-bg, #f0f0f0);
  border-radius:calc(var(--sc-static-radius, 10px) - 3px);
}
.sc-static-main-img{
  width:86px;
  height:58px;
}
.sc-static-upsell-img{
  width:62px;
  height:42px;
}
.sc-static-main-img img,
.sc-static-upsell-img img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}
.sc-static-product-title{
  margin:0 0 12px;
  color:var(--sc-static-text, #102864);
  font-size:calc(var(--sc-base-font-size, 16px) + 2px);
  line-height:23px;
  font-weight:900;
}
.sc-static-qty{
  display:inline-flex;
  align-items:center;
  gap:10px;
}
.sc-static-qty button{
  width:34px;
  height:34px;
  border:1px solid var(--sc-static-border, #dde2ea);
  border-radius:calc(var(--sc-static-radius, 10px) - 2px);
  background:var(--sc-static-card-bg, #ffffff);
  color:var(--sc-static-muted, #7f8795);
  font-size:24px;
  line-height:1;
  cursor:default;
}
.sc-static-qty strong{
  min-width:16px;
  color:var(--sc-static-text, #0f2a6f);
  font-size:calc(var(--sc-base-font-size, 16px) + 2px);
  line-height:22px;
  text-align:center;
}
.sc-static-pricebox{
  display:flex;
  align-items:baseline;
  gap:8px;
  color:var(--sc-static-text, #102864);
  font-size:calc(var(--sc-base-font-size, 16px) + 1px);
  font-weight:900;
  white-space:nowrap;
}
.sc-static-compare{
  color:var(--sc-static-muted, #8c9099);
  text-decoration:line-through;
  font-size:15px;
  font-weight:600;
}
.sc-static-remove{
  position:absolute;
  top:30px;
  right:22px;
  color:var(--sc-static-muted, #a7adb6);
  font-size:28px;
  line-height:1;
}
.sc-static-upsell-block{
  padding:16px 18px 170px;
  background:var(--sc-static-upsell-bg, var(--sc-static-card-bg, #ffffff));
}
.sc-static-upsell-title{
  margin:0 0 20px;
  text-align:center;
  color:var(--sc-static-upsell-muted, var(--sc-static-muted, #6f7a8a));
  font-size:var(--sc-base-font-size, 16px);
  line-height:20px;
  font-weight:900;
}
.sc-static-upsell-row{
  display:grid;
  grid-template-columns:62px minmax(0,1fr) auto;
  align-items:center;
  gap:12px;
  border:1px solid var(--sc-static-upsell-border, transparent);
  border-radius:var(--sc-static-radius, 10px);
  padding:8px;
}
.sc-static-upsell-name{
  margin:0 0 4px;
  color:var(--sc-static-upsell-text, #102864);
  font-size:calc(var(--sc-base-font-size, 16px) - 2px);
  line-height:18px;
  font-weight:900;
}
.sc-static-upsell-price{
  color:var(--sc-static-upsell-muted, #667180);
  font-size:calc(var(--sc-base-font-size, 16px) - 3px);
  font-weight:900;
}
.sc-static-upsell-price s{
  margin-right:5px;
  color:var(--sc-static-muted, #8d929b);
  font-weight:600;
}
.sc-static-add{
  border:0;
  border-radius:calc(var(--sc-static-radius, 10px) - 6px);
  background:var(--sc-static-upsell-button-bg, #a93dea);
  color:var(--sc-static-upsell-button-text, #ffffff);
  padding:10px 17px;
  font-size:15px;
  font-weight:900;
  cursor:default;
}
.sc-static-design .sc-items-footer{
  margin:0;
  background:var(--sc-static-card-bg, #ffffff);
}
.sc-static-design .sc-discount{
  display:flex !important;
  gap:10px;
  padding:8px 12px 0;
  margin:0;
  background:var(--sc-static-card-bg, #ffffff);
}
.sc-static-design .sc-discount[hidden]{
  display:none !important;
}
.sc-static-design .sc-discount input{
  height:52px;
  border:1px solid var(--sc-static-border, #dde2ea);
  border-radius:calc(var(--sc-static-radius, 10px) - 4px);
  background:var(--sc-static-card-bg, #ffffff);
  color:var(--sc-static-muted, #6f7684);
  font-size:var(--sc-base-font-size, 16px);
}
.sc-static-design .sc-discount button{
  min-width:78px;
  height:52px;
  border:2px solid var(--sc-static-progress-text, #53649d);
  border-radius:calc(var(--sc-static-radius, 10px) - 3px);
  background:var(--sc-static-card-bg, #ffffff);
  color:var(--sc-static-text, #102864);
  font-size:var(--sc-base-font-size, 16px);
  font-weight:900;
}
.sc-static-design .sc-discount-msg{
  display:none !important;
}
.sc-static-design .sc-footer{
  padding:0 18px 14px;
  gap:12px;
  background:var(--sc-static-shell-bg, #f4f4f4) !important;
  box-shadow:none;
}
.sc-static-design .sc-footer-row{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:0;
  overflow:hidden;
  border-radius:0 0 var(--sc-static-radius, 10px) var(--sc-static-radius, 10px);
  background:var(--sc-static-card-bg, #ffffff);
  box-shadow:0 1px 3px rgba(15,23,42,.08);
}
.sc-static-design .sc-subtotal-box{
  border:0;
  border-radius:0;
  padding:16px 18px;
  background:var(--sc-static-card-bg, #ffffff);
}
.sc-static-design .sc-sub-label{
  color:var(--sc-static-muted, #8a92a0) !important;
  font-size:calc(var(--sc-base-font-size, 16px) - 2px) !important;
  font-weight:700;
}
.sc-static-design .sc-sub-value{
  color:var(--sc-static-text, #102864) !important;
  font-size:calc(var(--sc-base-font-size, 16px) + 6px) !important;
  line-height:26px;
  font-weight:900;
}
.sc-static-design .sc-checkout{
  min-height:74px;
  background:var(--sc-static-button-bg, #a93dea) !important;
  color:var(--sc-static-button-text, #ffffff) !important;
  font-size:calc(var(--sc-base-font-size, 16px) + 4px) !important;
  font-weight:900;
}
.sc-static-design .sc-footer-tabs{
  border:0;
  border-radius:var(--sc-static-radius, 10px);
  min-height:70px;
  background:var(--sc-static-card-bg, #ffffff);
  box-shadow:0 1px 3px rgba(15,23,42,.08);
}
.sc-static-design .sc-footer-tab{
  min-height:70px;
  color:var(--sc-static-text, #102864);
  border-bottom:3px solid transparent;
  font-size:18px;
  background:var(--sc-static-card-bg, #ffffff);
}
.sc-static-design .sc-footer-tab.is-active{
  color:var(--sc-static-button-bg, #a93dea);
  border-bottom-color:var(--sc-static-button-bg, #a93dea);
}
.sc-static-design .sc-offers{
  margin:0 18px;
  border:0;
  border-radius:var(--sc-static-radius, 10px);
  background:var(--sc-static-card-bg, #ffffff);
  box-shadow:0 1px 3px rgba(15,23,42,.08);
}

@media (max-width: 420px){
  .sc-offers{
    margin:8px;
  }
  .sc-offer-row{
    grid-template-columns:52px minmax(0, 1fr);
    gap:10px;
    padding:14px 10px;
  }
  .sc-offer-icon,
  .sc-offer-thumbs{
    width:44px;
    min-height:44px;
  }
  .sc-offer-icon svg{
    width:34px;
    height:34px;
  }
  .sc-offer-thumbs{
    grid-template-columns:repeat(2, 20px);
    grid-auto-rows:20px;
    gap:4px;
  }
  .sc-offer-thumb{
    width:20px;
    height:20px;
    border-radius:6px;
  }
  .sc-offer-codebox,
  .sc-offer-action{
    grid-column:2;
    justify-self:start;
  }
}

.sc-subtotal-box{
  flex:0 0 42%;
  border:1px solid var(--sc-border);
  border-radius:var(--sc-btn-radius);
  padding:10px 12px;
  display:flex;flex-direction:column;justify-content:center;
}
.sc-subtotal-box .sc-sub-label{
  font-size:var(--sc-small-font-size);
  color:var(--sc-drawer-text-color);
  line-height:1.2;
}
.sc-subtotal-box .sc-sub-value{
  font-size:var(--sc-heading-font-size);
  font-weight:900;
  color:var(--sc-drawer-text-color);
  line-height:1.2;
}

.sc-checkout{
  flex:1;border:none;
  background:var(--sc-checkout-bg);
  color:var(--sc-checkout-text);
  font-size:var(--sc-heading-font-size);
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:center;
  position:relative;
  min-height:40px;
  font-weight:700;
}
.sc-badge{
  position:absolute;right:10px;top:50%;transform:translateY(-50%);
  background:var(--sc-badge-bg);
  color:var(--sc-badge-text);
  border-radius:var(--sc-chip-radius);
  min-width:28px;height:28px;padding:0 10px;
  display:inline-flex;align-items:center;justify-content:center;
  font-size:var(--sc-heading-font-size);font-weight:800;
}

/* Reward popup */
.sc-freegift-overlay{
  position:fixed;
  inset:0;
  background:rgba(15,23,42,.65);
  display:flex;
  align-items:center;
  justify-content:center;
  opacity:0;
  visibility:hidden;
  transition:opacity .2s ease, visibility .2s ease;
  z-index:2147483050;
}
.sc-freegift-overlay.open{
  opacity:1;
  visibility:visible;
}
.sc-freegift-card{
  width:min(420px, 96vw);
  max-height:min(700px, 92vh);
  background:var(--sc-freegift-bg);
  border-radius:12px;
  padding:0;
  border:1px solid var(--sc-freegift-border);
  box-shadow:var(--sc-freegift-shadow);
  position:relative;
  font-size:var(--sc-base-font-size);
  color:var(--sc-freegift-text);
  text-align:center;
  overflow:hidden;
}
.sc-freegift-close{
  position:absolute;
  top:12px;
  right:12px;
  width:32px;height:32px;
  border-radius:50%;
  border:1px solid var(--sc-close-border);
  background:var(--sc-freegift-bg);
  cursor:pointer;
  font-size:18px;
  line-height:1;
  color:var(--sc-freegift-text);
}
.sc-freegift-header{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:8px;
  padding:0px 0px 5px;
  border-bottom:1px solid rgba(15,23,42,.1);
}
.sc-freegift-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--sc-drawer-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--sc-drawer-text-color);
}
.sc-freegift-icon svg{width:22px;height:22px;fill:currentColor;}
.sc-freegift-heading{display:grid;gap:8px;}
.sc-freegift-title-text{
    margin: 0;
    font-weight: 700;
    font-size: var(--sc-heading-font-size);
    line-height: 1.2;
    color: var(--sc-drawer-header-color);
}
.sc-freegift-subtext {
    margin: 0;
    font-size: var(--sc-drawer-text-color);
    color: var(--sc-freegift-subtext);
}
.sc-freegift-count{
  display:inline-flex;
  align-items:center;
  min-height:24px;
  border-radius:999px;
  background:#eee;
  color:#2f2017;
  font-weight:800;
  font-size:16px;
  padding:1px 8px;
  vertical-align:middle;
}
.sc-freegift-rule-title{
  margin:2px 0 0;
  font-size:var(--sc-base-font-size);
  color:var(--sc-freegift-text);
  opacity:.85;
}
.sc-freegift-content{
  display:grid;
  grid-template-columns:72px 1fr;
  gap:12px;
  align-items:center;
  padding:18px;
  text-align:left;
}
.sc-freegift-content[hidden], .sc-freegift-list[hidden]{display:none!important;}
.sc-freegift-image-wrap{
  width:72px;
  height:72px;
  border-radius:14px;
  overflow:hidden;
  background:rgba(15,23,42,.05);
  display:flex;
  align-items:center;
  justify-content:center;
}
.sc-freegift-image{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}
.sc-freegift-product-title{
  margin:0;
  font-weight:700;
  font-size:16px;
}
.sc-freegift-product-sub{
  margin:4px 0 0;
  font-size:var(--sc-small-font-size);
  color:var(--sc-freegift-subtext);
}
.sc-freegift-list{
  display:block;
  max-height:400px;
  overflow-y:auto;
  text-align:left;
}
.sc-freegift-options{
  display:block;
}
.sc-freegift-loading{
  padding:28px 18px;
  color:var(--sc-freegift-subtext);
  text-align:center;
}
.sc-freegift-option{
  width:100%;
  border:0;
  border-bottom:1px solid rgba(15,23,42,.1);
  background:#fff;
  color:#2f2017;
  cursor:pointer;
  display:grid;
  grid-template-columns:48px minmax(0,1fr) 38px;
  gap:12px;
  align-items:center;
  min-height:88px;
  padding:14px 20px;
  text-align:left;
}
.sc-freegift-option:hover{background:#fffaf3;}
.sc-freegift-thumb{
  width:44px;
  height:44px;
  border-radius:7px;
  overflow:hidden;
  background:#f3f3f3;
  display:flex;
  align-items:center;
  justify-content:center;
}
.sc-freegift-thumb img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}
.sc-freegift-thumb-empty{font-weight:800;color:#7a6a5d;}
.sc-freegift-option-main{
  display:grid;
  gap:4px;
  min-width:0;
}
.sc-freegift-option-title{
  font-size:var(--sc-small-font-size);
  color:var(--sc-drawer-text-color);
  line-height:1.2;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.sc-freegift-option-price{
  display:flex;
  align-items:center;
  gap:8px;
  min-height:22px;
}
.sc-freegift-price{
  color:#6f625b;
  text-decoration:line-through;
  font-size:15px;
}
.sc-freegift-free-pill{
  display:inline-flex;
  align-items:center;
  min-height:22px;
  border-radius:999px;
  background:var(--sc-badge-bg);
  color:var(--sc-badge-text);
  font-weight:600;
  font-size:var(--sc-small-font-size);
  color:var(--sc-drawer-text-color);
  padding:0 8px;
}
.sc-freegift-check{
    width: 20px;
    height: 20px;
    border: 2px solid #4a3428;
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #2f2017;
    justify-self: end;
    font-size:14px;
    font-weight:900;
    line-height:1;
}
.sc-freegift-check svg{width:18px;height:18px;fill:currentColor;}
.sc-freegift-option.selected .sc-freegift-check{
  border-color:#ffd18a;
  background:#ffd18a;
}
.sc-freegift-option.selected .sc-freegift-check::before{
  content:"✓";
}
.sc-freegift-message{
  margin:0;
  padding:10px 18px;
  border-top:1px solid rgba(15,23,42,.08);
  color:var(--sc-freegift-subtext);
  font-size:var(--sc-small-font-size);
  text-align:center;
}
.sc-freegift-message.is-error{
  color:#b42318;
  font-weight:700;
}
.sc-freegift-add {
    width: 100%;
    border: none;
    border-radius: 0;
    min-height: 31px;
    padding: 15px;
    background: var(--sc-checkout-bg);
    color: var(--sc-checkout-text);
    font-weight: 900;
    font-size: var(--sc-base-font-size);
    cursor: pointer;
    transition: transform .2s ease, opacity .2s ease;
}
.sc-freegift-add:disabled{
  background:#e7e7e7;
  color:#9a9a9a;
  opacity:1;
  cursor:not-allowed;
}
.sc-freegift-add.loading{opacity:.7;cursor:wait;}
.icon.icon-cart.cart-lift {
    height: 2.4rem !important;
    width: 2.4rem !important;
    fill: var(--sc-base-font-size);
    vertical-align: middle;
}
/* confetti */
.sc-paper{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:3;}
.sc-paper-piece{position:absolute;border-radius:3px;opacity:1;animation-name:scPaperFall;animation-timing-function:linear;background:linear-gradient(45deg, rgba(255,123,172,1), rgba(255,210,245,1));box-shadow:0 6px 18px rgba(0,0,0,.10);}
.sc-paper-piece:nth-child(4n){border-radius:50%;}
.sc-paper-piece:nth-child(4n+1){border-radius:2px;}
.sc-paper-piece:nth-child(3n){background:linear-gradient(45deg, rgba(255,210,120,.95), rgba(255,245,200,.85))}
.sc-paper-piece:nth-child(3n+1){background:linear-gradient(45deg, rgba(120,215,255,.95), rgba(190,245,255,.85))}
.sc-header{position:relative;z-index:4;}
@keyframes scPaperFall{0%{transform:translate3d(0,0,0) rotate(0deg);opacity:1}100%{transform:translate3d(var(--sc-x),520px,0) rotate(420deg);opacity:1}}

.sc-celebrate-backdrop{
  position:absolute;inset:0;z-index:2147483006;
  display:flex;align-items:center;justify-content:center;
  color: var(--sc-drawer-header-color);
  background-color: var(--sc-celebrate-backdrop);
  opacity:0;transform:scale(1.01);
  transition:opacity .18s ease, transform .18s ease;
  backdrop-filter:none;
}
.sc-celebrate-backdrop.open{opacity:1;transform:scale(1);}
.sc-celebrate-modal{
  width:min(360px, 86%);
  color: var(--sc-drawer-header-color);
  background-color: var(--sc-top-bg-color-effective);
  border:1px solid var(--sc-celebrate-border);
  border-radius:18px;box-shadow:0 18px 42px rgba(0,0,0,.22);
  padding:18px 16px;text-align:center;
}
.sc-celebrate-badge{
  width:54px;height:54px;margin:0 auto 10px;border-radius:16px;
  display:flex;align-items:center;justify-content:center;
  background:var(--sc-celebrate-badge-bg);
  font-size:var(--sc-celebrate-title-size);
}
.sc-celebrate-h{font-weight:900;color:var(--sc-progress-text);font-size:var(--sc-heading-font-size);line-height:1.2;}
.sc-celebrate-p{margin-top:6px;color:var(--sc-drawer-text-color);font-size:var(--sc-base-font-size);line-height:1.35;}
[data-smart-cartify-open]{
  position:relative;
}
.sc-mobile-open-fallback{
  position:fixed;
  right:14px;
  bottom:calc(18px + env(safe-area-inset-bottom, 0px));
  width:48px;
  height:48px;
  border:0;
  border-radius:999px;
  display:none;
  align-items:center;
  justify-content:center;
  background:#000000;
  color:#ffffff;
  box-shadow:0 10px 28px rgba(0,0,0,.24);
  z-index:2147483645 !important;
  cursor:pointer;
  touch-action:manipulation;
  -webkit-tap-highlight-color:transparent;
}
.sc-mobile-open-fallback svg{
  width:25px;
  height:24px;
  display:block;
}
body.sc-cartify-open .sc-mobile-open-fallback{
  display:none !important;
}
@media (max-width: 768px){
  body.sc-no-visible-cart-open:not(.sc-cartify-open) .sc-mobile-open-fallback{
    display:flex;
  }
}
body.sc-atc-bottom-visible .sc-mobile-open-fallback{
  bottom:calc(96px + env(safe-area-inset-bottom, 0px));
}
.sc-atc-bar{
  --sc-atc-bg:#ffffff;
  --sc-atc-text:#111827;
  --sc-atc-btn-bg:#111827;
  --sc-atc-btn-text:#ffffff;
  --sc-atc-image-border:#e5e7eb;
  position:fixed;
  left:0;
  right:0;
  display:block !important;
  background:var(--sc-atc-bg);
  color:var(--sc-atc-text);
  border:0 solid rgba(17,24,39,.12);
  box-shadow:0 -12px 36px rgba(15,23,42,.16);
  opacity:0;
  visibility:hidden;
  transform:translateY(110%);
  transition:opacity .22s ease, transform .22s ease, visibility .22s ease;
  pointer-events:none !important;
}
.sc-atc-bar[hidden]{
  display:none !important;
}
.sc-atc-bar.sc-atc-open{
  opacity:1;
  visibility:visible;
  transform:translateY(0);
  pointer-events:auto !important;
}
.sc-atc-bar.sc-atc-position-top{
  top:0;
  bottom:auto;
  border-bottom-width:1px;
  box-shadow:0 12px 36px rgba(15,23,42,.12);
  transform:translateY(-110%);
}
.sc-atc-bar.sc-atc-position-top.sc-atc-open{
  transform:translateY(0);
}
.sc-atc-bar.sc-atc-position-bottom{
  bottom:0;
  top:auto;
  border-top-width:1px;
}
.sc-atc-inner{
  width:min(1180px, 100%);
  margin:0 auto;
  min-height:74px;
  display:grid;
  grid-template-columns:auto minmax(0, 1fr) auto;
  align-items:center;
  gap:14px;
  padding:10px 18px calc(10px + env(safe-area-inset-bottom, 0px));
}
.sc-atc-media{
  width:54px;
  height:54px;
  border-radius:0;
  overflow:hidden;
  background:rgba(243,244,246,1);
  border:1px solid var(--sc-atc-image-border);
  display:flex;
  align-items:center;
  justify-content:center;
  flex:0 0 auto;
}
.sc-atc-media img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}
.sc-atc-placeholder{
  font-size:18px;
  font-weight:800;
  color:rgba(17,24,39,.55);
}
.sc-atc-info{
  min-width:0;
  display:grid;
  gap:4px;
}
.sc-atc-title{
  margin:0;
  color:var(--sc-atc-text);
  font-size:14px;
  font-weight:700;
  line-height:1.25;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.sc-atc-meta{
  display:flex;
  align-items:center;
  gap:8px;
  flex-wrap:wrap;
  min-height:20px;
}
.sc-atc-price,
.sc-atc-btn-price{
  font-weight:800;
  color:var(--sc-atc-text);
  font-size:13px;
}
.sc-atc-compare,
.sc-atc-btn-compare{
  color:rgba(107,114,128,1);
  font-size:12px;
  text-decoration:line-through;
}
.sc-atc-variant{
  display:flex;
  align-items:center;
  gap:6px;
  min-width:0;
}
.sc-atc-variant-label{
  font-size:12px;
  color:rgba(107,114,128,1);
}
.sc-atc-select{
  max-width:220px;
  min-width:138px;
  height:34px;
  border:1px solid rgba(209,213,219,1);
  border-radius:0;
  background:#ffffff;
  color:#111827;
  padding:0 28px 0 9px;
  font-size:13px;
}
.sc-atc-actions{
  display:flex;
  align-items:center;
  gap:10px;
  justify-self:end;
}
.sc-atc-qty{
  height:38px;
  display:flex;
  align-items:center;
  border:1px solid rgba(209,213,219,1);
  border-radius:0;
  overflow:hidden;
  background:#ffffff;
}
.sc-atc-qty button{
  width:34px;
  height:38px;
  border:0;
  background:#ffffff;
  color:#111827;
  font-size:18px;
  line-height:1;
  cursor:pointer;
}
.sc-atc-qty input{
  width:42px;
  height:38px;
  border:0;
  border-left:1px solid rgba(229,231,235,1);
  border-right:1px solid rgba(229,231,235,1);
  text-align:center;
  font-size:13px;
  color:#111827;
  background:#ffffff;
}
.sc-atc-submit{
  min-height:40px;
  width:clamp(190px, 22vw, 260px);
  border:0;
  border-radius:0;
  padding:0 18px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:7px;
  background:var(--sc-atc-btn-bg);
  color:var(--sc-atc-btn-text);
  font-size:14px;
  font-weight:800;
  cursor:pointer;
  white-space:nowrap;
}
.sc-atc-submit .sc-atc-btn-price,
.sc-atc-submit .sc-atc-btn-compare{
  color:inherit;
}
.sc-atc-submit .sc-atc-btn-compare{
  opacity:.72;
}
.sc-atc-submit:disabled,
.sc-atc-bar.sc-atc-loading .sc-atc-submit{
  opacity:.68;
  cursor:wait;
}
.sc-atc-msg{
  grid-column:1 / -1;
  display:none;
  margin:0;
  padding:8px 10px;
  border-radius:0;
  font-size:13px;
  line-height:1.35;
  font-weight:650;
}
.sc-atc-msg.show{
  display:block;
}
.sc-atc-msg.info{
  color:#1e3a8a;
  background:rgba(219,234,254,.9);
}
.sc-atc-msg.error{
  color:#991b1b;
  background:rgba(254,226,226,.92);
}
.sc-atc-anim-pulse .sc-atc-submit{
  animation:scAtcPulse 1.8s ease-in-out infinite;
}
.sc-atc-anim-shake .sc-atc-submit{
  animation:scAtcShake 2.6s ease-in-out infinite;
}
.sc-atc-anim-bounce .sc-atc-submit{
  animation:scAtcBounce 2.2s ease-in-out infinite;
}
@keyframes scAtcPulse{
  0%,100%{box-shadow:0 0 0 0 rgba(17,24,39,.28)}
  50%{box-shadow:0 0 0 7px rgba(17,24,39,0)}
}
@keyframes scAtcShake{
  0%,88%,100%{transform:translateX(0)}
  90%{transform:translateX(-2px)}
  92%{transform:translateX(2px)}
  94%{transform:translateX(-2px)}
  96%{transform:translateX(2px)}
}
@keyframes scAtcBounce{
  0%,82%,100%{transform:translateY(0)}
  88%{transform:translateY(-4px)}
  94%{transform:translateY(0)}
}
@media (max-width: 767px){
  .sc-atc-inner{
    min-height:72px;
    grid-template-columns:auto minmax(0, 1fr);
    gap:10px;
    padding:9px 10px calc(9px + env(safe-area-inset-bottom, 0px));
  }
  .sc-atc-media{
    width:46px;
    height:46px;
    border-radius:0;
  }
  .sc-atc-actions{
    grid-column:1 / -1;
    justify-self:stretch;
    width:100%;
  }
  .sc-atc-submit{
    flex:1;
    width:100%;
    min-width:0;
    padding:0 12px;
    font-size:13px;
  }
  .sc-atc-qty{
    flex:0 0 auto;
  }
  .sc-atc-title{
    font-size:13px;
  }
  .sc-atc-select{
    min-width:120px;
    max-width:160px;
  }
}
.sc-open-count{
  position:absolute;
  top: 5px;
  right: 0;
  min-width: 18px;
  height: 18px !important;
  border-radius:999px;
  padding:0 5px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  font-size:11px;
  font-weight:700;
  background:#000000;
  color:#ffffff;
  line-height:1;
}
    `;
    document.head.appendChild(s);
  };
  ensureStyles();

  // ✅ Announcement bar between header and progress
  drawer.innerHTML = `
    <div class="sc-header">
      <div class="sc-title-wrap">
        <span class="sc-title-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 6h15l-1.1 6.2a2 2 0 0 1-2 1.7H9.2A2 2 0 0 1 7.2 12L6 6Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
            <path d="M6 6H4M9 18a1 1 0 1 0 0 .01M18 18a1 1 0 1 0 0 .01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </span>
        <h3 class="sc-title">Your Cart <span class="sc-title-count" data-cart-title-count>(0)</span></h3>
      </div>
      <button class="sc-close" data-close type="button" aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M6.7 5.3 12 10.6l5.3-5.3a1 1 0 1 1 1.4 1.4L13.4 12l5.3 5.3a1 1 0 0 1-1.4 1.4L12 13.4l-5.3 5.3a1 1 0 0 1-1.4-1.4l5.3-5.3-5.3-5.3a1 1 0 0 1 1.4-1.4Z"/>
        </svg>
      </button>
    </div>
    <div class="content-cart-smartcartify">
    <div class="sc-announce" data-sc-announce hidden></div>

    <div class="sc-progress">
      <p class="sc-label">Loading…</p>

      <div class="sc-milestone">
        <div class="sc-track">
          <div class="sc-fill"></div>
          <div class="sc-dots"></div>
        </div>
      </div>

      <div class="sc-legends"></div>
      <div class="sc-progress-loading" aria-hidden="true"></div>
    </div>

    <div class="sc-items">
      <div class="sc-cart-msg" data-sc-cart-msg hidden>
        <p class="sc-cart-msg-text" data-sc-cart-msg-text></p>
        <button class="sc-cart-msg-close" type="button" data-sc-cart-msg-close aria-label="Close">&times;</button>
      </div>
      <div class="sc-items-list">
        <div class="sc-empty">Loading cart…</div>
      </div>
      <div class="sc-items-loading" aria-hidden="true">
        <div class="sc-items-spinner"></div>
      </div>
      <div class="sc-items-footer">
        <div class="sc-upsell" hidden></div>
        <div class="sc-discount" data-discount-panel hidden>
          <input
            type="text"
            data-discount-input
            placeholder="Enter discount code"
            autocomplete="off"
            spellcheck="false"
          />
          <button type="button" data-discount-apply>Apply</button>
          <div class="sc-discount-msg" data-discount-msg hidden></div>
        </div>
      </div>
    </div>

    <div class="sc-offers" data-offers-panel hidden></div>

    <div class="sc-footer">
      <div class="sc-footer-milestones" data-footer-milestones hidden></div>
      <div class="sc-footer-row">
        <button class="sc-checkout" data-checkout type="button">
          <span class="sc-checkout-label">Checkout</span>
        </button>
      </div>
      <div class="sc-footer-tabs" data-offer-tabs hidden>
        <button class="sc-footer-tab is-active" data-drawer-tab="cart" type="button">
          <span class="sc-footer-tab-icon" aria-hidden="true">
           <svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path fill-rule="evenodd" d="M2.5 3.75a.75.75 0 0 1 .75-.75h1.612a1.75 1.75 0 0 1 1.732 1.5h9.656a.75.75 0 0 1 .748.808l-.358 4.653a2.75 2.75 0 0 1-2.742 2.539h-6.351l.093.78a.25.25 0 0 0 .248.22h6.362a.75.75 0 0 1 0 1.5h-6.362a1.75 1.75 0 0 1-1.738-1.543l-1.04-8.737a.25.25 0 0 0-.248-.22h-1.612a.75.75 0 0 1-.75-.75Zm4.868 7.25h6.53a1.25 1.25 0 0 0 1.246-1.154l.296-3.846h-8.667l.595 5Z"></path><path d="M10 17a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path><path d="M15 17a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path></svg>
          </span>
          <span>Cart</span>
        </button>
        <button class="sc-footer-tab" data-drawer-tab="offers" type="button">
          <span class="sc-footer-tab-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none"><path d="M20 12v8H4v-8M3 8h18v4H3V8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 8v12M12 8H8.5A2.5 2.5 0 1 1 11 5.5V8ZM12 8h3.5A2.5 2.5 0 1 0 13 5.5V8Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </span>
          <span>Offers</span>
        </button>
      </div>
    </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(drawer);
  document.body.appendChild(addToCartBar);

  function resetDrawerToCartTab() {
    ACTIVE_DRAWER_TAB = "cart";
    drawer.classList.remove("sc-offers-active");
    const cartContent = drawer.querySelector(".sc-progress");
    const items = drawer.querySelector(".sc-items");
    const footerRow = drawer.querySelector(".sc-footer-row");
    const footerMilestones = drawer.querySelector("[data-footer-milestones]");
    const offers = drawer.querySelector("[data-offers-panel]");
    if (cartContent) cartContent.hidden = false;
    if (items) items.hidden = false;
    if (offers) offers.hidden = true;
    if (footerRow) footerRow.hidden = false;
    if (footerMilestones) footerMilestones.hidden = !footerMilestones.innerHTML.trim();
    drawer.querySelectorAll("[data-drawer-tab]").forEach((button) => {
      const selected = button.getAttribute("data-drawer-tab") === "cart";
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
  }

  function openDrawer() {
    if (drawer.classList.contains("open")) return;
    resetDrawerToCartTab();
    overlay.classList.add("open");
    drawer.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    document.body.classList.add("sc-cartify-open");
    addToCartBar.classList.remove("sc-atc-open");
    addToCartBar.hidden = true;
    document.body.classList.remove("sc-atc-bottom-visible", "sc-atc-top-visible");
    syncItemsLoading(drawer.classList.contains("sc-refreshing"));
    stopOpenButtonObserver();
  }

  function closeDrawer() {
    resetDrawerToCartTab();
    overlay.classList.remove("open");
    drawer.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
    document.body.classList.remove("sc-cartify-open");
    startOpenButtonObserver();
    queueOpenButtonBind();
    scheduleAddToCartBarRender(80);
  }

  const $ = (sel) => drawer.querySelector(sel);

  // ✅ Properties for Free Product / Reward products
  const FREE_GIFT_PROPERTY = "_sc_free_gift";
  const FREE_GIFT_VARIANT_PROPERTY = "_sc_free_gift_variant";
  const FREE_GIFT_RULE_PROPERTY = "_sc_free_gift_rule";
  const FREE_GIFT_RULE_KEY_PROPERTY = "_sc_free_gift_rule_key";
  const FREE_GIFT_DISCOUNT_PROPERTY = "_sc_free_product_discount_id";

  // ✅ Buy X Get Y / BXGY reward properties
  const BXGY_GIFT_PROPERTY = "_sc_bxgy_gift";
  const BXGY_GIFT_VARIANT_PROPERTY = "_sc_bxgy_gift_variant";
  const BXGY_GIFT_RULE_PROPERTY = "_sc_bxgy_gift_rule";
  const BXGY_GIFT_KIND_PROPERTY = "_sc_bxgy_kind"; // "bxgy" | "buyxgety"

  const drawerDiscountPanel = drawer.querySelector("[data-discount-panel]");
  const discountInput = drawer.querySelector("[data-discount-input]");
  const discountButton = drawer.querySelector("[data-discount-apply]");
  const discountMsg = drawer.querySelector("[data-discount-msg]");
  const offersPanel = drawer.querySelector("[data-offers-panel]");
  const offerTabs = drawer.querySelector("[data-offer-tabs]");

  overlay.addEventListener("click", closeDrawer);
  $("[data-close]")?.addEventListener("click", closeDrawer);
  drawer.addEventListener("click", async (e) => {
    const el = e.target;
    if (!(el instanceof Element)) return;
    if (el.closest("[data-close]")) closeDrawer();
    const staticQty = el.closest("[data-static-qty]");
    if (staticQty) {
      e.preventDefault();
      const row = staticQty.closest("[data-line]");
      const line = Number(row?.getAttribute("data-line"));
      const current = Number(CART?.items?.[line - 1]?.quantity || 0);
      if (line && current > 0) {
        const delta = staticQty.getAttribute("data-static-qty") === "inc" ? 1 : -1;
        applyLineQuantityChange(line, Math.max(0, current + delta));
      }
      return;
    }
    const staticRemove = el.closest("[data-static-remove]");
    if (staticRemove) {
      e.preventDefault();
      const line = Number(staticRemove.getAttribute("data-static-remove"));
      if (line) applyLineQuantityChange(line, 0);
      return;
    }
    const tabButton = el.closest("[data-drawer-tab]");
    if (tabButton) {
      e.preventDefault();
      setDrawerTab(tabButton.getAttribute("data-drawer-tab"));
      return;
    }
    const codeCopyButton = el.closest("[data-offer-code-copy]");
    if (codeCopyButton) {
      e.preventDefault();
      const code = trimToNull(codeCopyButton.getAttribute("data-offer-code-copy"));
      if (code) {
        const ok = await copyTextToClipboard(code);
        if (ok) showOfferCodeCopyFeedback(codeCopyButton);
      }
      return;
    }
    const codeApplyButton = el.closest("[data-offer-code-apply]");
    if (codeApplyButton) {
      e.preventDefault();
      const code = trimToNull(codeApplyButton.getAttribute("data-offer-code-apply"));
      if (code) {
        if (discountInput) discountInput.value = code;
        await applyDiscountCode(code);
      }
      return;
    }
    const offerAction = el.closest("[data-offer-action]");
    if (offerAction) {
      e.preventDefault();
      const index = Number(offerAction.getAttribute("data-offer-action"));
      const offer = Array.isArray(drawer.__sc_offerRows) ? drawer.__sc_offerRows[index] : null;
      if (!offer?.rule) return;
      const kind = offer.type === "free" ? "free" : "bxgy";
      openRewardPopupFor({
        kind,
        rule: offer.rule,
        ruleKey: offer.ruleKey || offer.key,
        slot: offer.slot,
        title: offer.title,
        goalMet: offer.goalMet !== false,
        force: true
      });
    }
  });
  document.addEventListener(
    "click",
    (e) => {
      const el = e.target;
      if (!(el instanceof Element)) return;
      if (el.closest(".sc-drawer [data-close]")) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        closeDrawer();
      }
    },
    true
  );
  document.addEventListener(
    "pointerdown",
    (e) => {
      const el = e.target;
      if (!(el instanceof Element)) return;
      if (el.closest(".sc-drawer [data-close]")) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        closeDrawer();
      }
    },
    true
  );

  /* =========================================================
   ✅ STYLE SETTINGS (unchanged)
  ========================================================= */
  const applyCartDrawerStyleSettings = (style) => {
    const r = document.documentElement.style;

    const parsePositiveNumber = (value, fallback) => {
      const n = Number(value);
      return Number.isFinite(n) && n > 0 ? n : fallback;
    };

    const baseFontSize = parsePositiveNumber(style?.base, 14);
    const headingScaleValue = parsePositiveNumber(style?.headingScale, 1.2);
    const headingFontSize = Math.max(
      8,
      Number((baseFontSize * headingScaleValue).toFixed(2))
    );
    const buttonFontSize = Math.max(9, Number((baseFontSize * 1.1).toFixed(2)));
    const smallFontSize = Math.max(7, Number((baseFontSize * 0.85).toFixed(2)));

    r.setProperty("--sc-base-font-size", `${baseFontSize}px`);
    r.setProperty("--sc-heading-scale", `${headingScaleValue}`);
    r.setProperty("--sc-heading-font-size", `${headingFontSize}px`);
    r.setProperty("--sc-button-font-size", `${buttonFontSize}px`);
    r.setProperty("--sc-small-font-size", `${smallFontSize}px`);

    const defaults = {
      baseBg: "#ffffff",
      topText: "#000000",
      headerText: "#000000",
      drawerText: "#111827",
      border: "#e5e7eb",
      muted: "#6b7280",
      progress: "#000000",
      checkoutBg: "#000000",
      checkoutText: "#ffffff",
      announcementBarBackgroundColor: "#000000",
      announcementBarTextColor: "#ffffff",
      buttonLabelColor: "#ffffff",
      iconColor: "#000000",
      footerBg: "#ffffff",
      applyBtnBg: "#000000",
      applyBtnText: "#ffffff",
      applyBtnBorder: "rgba(17,24,39,.25)",
      subtotalBg: "#ffffff",
      subtotalText: "#ffffff",
      subtotalLabel: "#000000",
      discountCodeApply: 0,
    };

    const mode = String(
      pick(style, ["cartDrawerBackgroundMode", "drawerBgMode", "bgMode"], "color")
    )
      .trim()
      .toLowerCase();

    const baseBg = pickBackground(
      style,
      ["cartDrawerBackground", "cartDrawerBg", "drawerTopBg", "topBg", "baseBg"],
      defaults.baseBg
    );
    const gradientStart = pickColor(
      style,
      ["cartDrawerGradientStart", "drawerGradientStart", "gradientStart", "cartDrawerGradientFrom"],
      getFirstColorFromBackground(baseBg) || defaults.baseBg
    );
    const gradientEnd = pickColor(
      style,
      ["cartDrawerGradientEnd", "drawerGradientEnd", "gradientEnd", "cartDrawerGradientTo"],
      getFirstColorFromBackground(baseBg) || "#f9f9f9"
    );

    let topTextColor = pickColor(
      style,
      ["textColor", "topText", "top_text", "topTextColor", "textTop"],
      defaults.topText
    );

    let headerColor = pickColor(
      style,
      ["cartDrawerHeaderColor", "headerText", "header_text", "headerColor", "titleColor"],
      defaults.headerText
    );

    const drawerTextColor = pickColor(
      style,
      ["cartDrawerTextColor", "drawerTextColor", "cartDrawerBodyTextColor", "bodyTextColor", "text"],
      defaults.drawerText
    );

    const borderColor = pickColor(
      style,
      ["border", "borderColor", "drawerBorder", "cartDrawerBorderColor"],
      defaults.border
    );

    const mutedColor = pickColor(
      style,
      ["muted", "mutedColor", "secondaryText", "subTextColor"],
      defaults.muted
    );

    const progressFill = pickColor(
      style,
      ["progress", "progressColor", "progressFill", "milestoneFill"],
      defaults.progress
    );
    const freeTagColor = pickColor(
      style,
      ["freeTagColor", "freeProductTextColor", "freeTextColor", "rewardTextColor"],
      progressFill
    );
    const freeTagFontSize = normalizeLen(
      pick(
        style,
        ["freeTagFontSize", "freeProductTextSize", "freeProductFontSize", "rewardTextSize"],
        null
      ),
      "var(--sc-small-font-size)"
    );

    const hasExplicitProgressBg = ["progressBg", "progressBackground"].some(
      (key) => trimToNull(style?.[key])
    );
    const progressBg = pickBackground(
      style,
      ["progressBg", "progressBackground", "bg", "progress"]
    );

    const drawerWidth = normalizeLen(
      pick(style, ["cartDrawerWidth", "drawerWidth", "width"], null),
      "min(470px,92vw)"
    );
    const milestoneWidth = pick(
      style,
      ["milestoneWidth", "cartMilestoneWidth", "progressWidth"],
      "min(420px, 92vw)"
    );

    const dotSize = normalizeLen(pick(style, ["dotSize", "milestoneDot", "dot"], null), "28px");
    const trackH = normalizeLen(pick(style, ["trackHeight", "milestoneTrackHeight"], null), "8px");

    const radius = pickNum(style, ["radius", "drawerRadius", "borderRadius"]);
    const btnRadius = pickNum(style, ["buttonRadius", "btnRadius"], 12);

    const overlayBg = pick(style, ["overlayBg", "overlay", "overlayBackground"], "rgba(0,0,0,.45)");

    const qtyBtnBg = pickColor(style, ["qtyBtnBg", "qtyButtonBg"], "#fff");
    const qtyBtnBorder = pickColor(style, ["qtyBtnBorder", "qtyButtonBorder"], borderColor);
    const qtyBtnText = pickColor(style, ["qtyBtnText", "qtyButtonText"], drawerTextColor);

    const qtyInputBg = pickColor(style, ["qtyInputBg", "qtyFieldBg"], "#fff");
    const qtyInputBorder = pickColor(style, ["qtyInputBorder", "qtyFieldBorder"], borderColor);
    const qtyInputText = pickColor(style, ["qtyInputText", "qtyFieldText"], drawerTextColor);

    const inputBg = pickColor(style, ["inputBg", "fieldBg", "discountInputBg"], "#fff");
    const inputBorder = pickColor(style, ["inputBorder", "fieldBorder", "discountInputBorder"], borderColor);
    const inputText = pickColor(style, ["inputText", "fieldText", "discountInputText"], "#111827");
    const inputPlaceholder = pickColor(style, ["inputPlaceholder", "placeholderColor"], "#9ca3af");

    const checkoutBg = pickColor(
      style,
      ["buttonColor", "checkoutBg", "checkoutBackground", "buttonBg"],
      defaults.checkoutBg
    );
    const checkoutText = pickColor(
      style,
      ["buttonLabelColor", "checkoutLabelColor", "checkoutText", "checkoutTextColor", "buttonText"],
      defaults.buttonLabelColor
    );

    const announceBg = pickBackground(
      style,
      [
        "announcementBarBackgroundColor",
        "announcementBarBackground",
        "announcementBarBg",
        "announcementBackground",
        "announceBg",
      ],
      defaults.announcementBarBackgroundColor
    );
    const announceText = pickColor(
      style,
      [
        "announcementBarTextColor",
        "announcementBarText",
        "announcementTextColor",
        "announcementText",
      ],
      defaults.announcementBarTextColor
    );
    const iconColor = pickColor(
      style,
      ["iconColor", "drawerIconColor", "cartIconColor", "headerIconColor"],
      defaults.iconColor
    );

    const badgeBg = pick(style, ["badgeBg", "countBadgeBg"], "rgba(17,24,39,.1)");
    const badgeText = pickColor(style, ["badgeText", "countBadgeText"], checkoutText);

    const closeBg = pick(style, ["closeBg", "closeButtonBg"], "transparent");
    const closeBorder = pickColor(style, ["closeBorder", "closeButtonBorder"], borderColor);
    const closeText = pickColor(
      style,
      ["closeText", "closeButtonText"],
      iconColor || headerColor || "#111827"
    );

    const hasExplicitFooterBg = ["footerBg", "cartDrawerFooterBg", "drawerFooterBg"].some(
      (key) => trimToNull(style?.[key])
    );
    const footerBg = pickBackground(
      style,
      ["footerBg", "cartDrawerFooterBg", "drawerFooterBg"],
      defaults.footerBg
    );

    const applyBtnBg = pickColor(style, ["applyBtnBg", "discountApplyBg", "applyButtonBg", "buttonColor"], defaults.applyBtnBg);
    const applyBtnText = pickColor(style, ["applyBtnText", "discountApplyText", "applyButtonText"], defaults.applyBtnText);
    const applyBtnBorder = pickColor(style, ["applyBtnBorder", "discountApplyBorder", "applyButtonBorder"], defaults.applyBtnBorder);

    const subtotalBg = pickColor(style, ["subtotalBg", "totalBoxBg", "subtotalBoxBg"], defaults.subtotalBg);
    const subtotalText = pickColor(style, ["subtotalText", "totalText", "subtotalValueColor"], defaults.subtotalText);
    const subtotalLabel = pickColor(style, ["subtotalLabel", "totalLabel", "subtotalLabelColor"], defaults.subtotalLabel);

    const celebrateBackdrop = pickBackground(
      style,
      ["celebrateBackdrop", "popupBackdrop", "congratsBackdrop", "rewardPopupBackdrop"],
      "rgba(17,24,39,.25)"
    );
    const celebrateBg = pickBackground(
      style,
      ["celebrateBg", "popupBg", "congratsBg", "rewardPopupBg"],
      "#ffffff"
    );
    const celebrateBorder = pickColor(
      style,
      ["celebrateBorder", "popupBorder", "congratsBorder", "rewardPopupBorder"],
      "rgba(0,0,0,.08)"
    );
    const celebrateBadgeBg = pickBackground(
      style,
      ["celebrateBadgeBg", "popupBadgeBg", "congratsBadgeBg", "rewardPopupBadgeBg"],
      "rgba(247, 249, 245, 0.91)"
    );
    const celebrateTitleColor = pickColor(
      style,
      ["celebrateTitleColor", "popupTitleColor", "congratsTitleColor", "rewardPopupTitleColor"],
      "#000000"
    );
    const celebrateTextColor = pickColor(
      style,
      ["celebrateTextColor", "popupTextColor", "congratsTextColor", "rewardPopupTextColor"],
      "#000000"
    );
    const celebrateTitleSize = normalizeLen(
      pick(style, ["celebrateTitleSize", "popupTitleSize", "congratsTitleSize"], null),
      "var(--sc-heading-font-size)"
    );
    const celebrateTextSize = normalizeLen(
      pick(style, ["celebrateTextSize", "popupTextSize", "congratsTextSize"], null),
      "var(--sc-small-font-size)"
    );

    if (!isValidCssColor(topTextColor)) topTextColor = defaults.topText;
    if (!isValidCssColor(headerColor)) headerColor = defaults.headerText;

    r.setProperty("--sc-overlay-bg", overlayBg);
    r.setProperty("--sc-drawer-width", drawerWidth);

    r.setProperty("--sc-border", borderColor);
    r.setProperty("--sc-muted", mutedColor);
    r.setProperty("--sc-drawer-bg", String(baseBg));

    r.setProperty("--sc-text", topTextColor);
    r.setProperty("--sc-drawer-header-color", headerColor);
    r.setProperty("--sc-drawer-text-color", drawerTextColor);

    r.setProperty("--sc-progress", progressFill);
    r.setProperty("--sc-free-tag-color", freeTagColor);
    r.setProperty("--sc-free-tag-font-size", freeTagFontSize);
    r.setProperty("--sc-progress-bg", progressBg);
    r.setProperty("--sc-progress-text", topTextColor);

    r.setProperty("--sc-radius", `${radius}px`);
    r.setProperty("--sc-btn-radius", `${btnRadius}px`);

    r.setProperty("--sc-milestone-width", String(milestoneWidth));
    r.setProperty("--sc-dot", dotSize);
    r.setProperty("--sc-track-h", trackH);

    r.setProperty("--sc-qty-btn-bg", qtyBtnBg);
    r.setProperty("--sc-qty-btn-border", qtyBtnBorder);
    r.setProperty("--sc-qty-btn-text", qtyBtnText);
    r.setProperty("--sc-qty-input-bg", qtyInputBg);
    r.setProperty("--sc-qty-input-border", qtyInputBorder);
    r.setProperty("--sc-qty-input-text", qtyInputText);

    r.setProperty("--sc-input-bg", inputBg);
    r.setProperty("--sc-input-border", inputBorder);
    r.setProperty("--sc-input-text", inputText);
    r.setProperty("--sc-input-placeholder", inputPlaceholder);

    r.setProperty("--sc-checkout-bg", checkoutBg);
    r.setProperty("--sc-checkout-text", checkoutText);
    r.setProperty("--sc-announce-bg", String(announceBg));
    r.setProperty("--sc-announce-text", announceText);
    r.setProperty("--sc-icon-color", iconColor);
    r.setProperty("--sc-badge-bg", String(badgeBg));
    r.setProperty("--sc-badge-text", badgeText);

    r.setProperty("--sc-close-bg", String(closeBg));
    r.setProperty("--sc-close-border", closeBorder);
    r.setProperty("--sc-close-text", closeText);
    r.setProperty("--sc-close-icon-color", closeText);

    r.setProperty("--sc-footer-bg", String(footerBg));
    r.setProperty("--sc-apply-bg", applyBtnBg);
    r.setProperty("--sc-apply-text", applyBtnText);
    r.setProperty("--sc-apply-border", applyBtnBorder);
    r.setProperty("--sc-subtotal-bg", subtotalBg);
    r.setProperty("--sc-subtotal-text", subtotalText);
    r.setProperty("--sc-subtotal-label", subtotalLabel);

    // reward popup colors
    r.setProperty("--sc-freegift-text", drawerTextColor);
    r.setProperty("--sc-freegift-subtext", mutedColor);
    r.setProperty("--sc-freegift-btn-bg", progressFill);
    r.setProperty("--sc-freegift-btn-text", topTextColor);
    r.setProperty("--sc-celebrate-backdrop", String(celebrateBackdrop));
    r.setProperty("--sc-celebrate-bg", String(celebrateBg));
    r.setProperty("--sc-celebrate-border", celebrateBorder);
    r.setProperty("--sc-celebrate-badge-bg", String(celebrateBadgeBg));
    r.setProperty("--sc-celebrate-title-color", celebrateTitleColor);
    r.setProperty("--sc-celebrate-text-color", celebrateTextColor);
    r.setProperty("--sc-celebrate-title-size", celebrateTitleSize);
    r.setProperty("--sc-celebrate-text-size", celebrateTextSize);

    const checkoutLabelText = trimToNull(style?.checkoutButtonText) || "Checkout";
    const checkoutLabelEl = drawer.querySelector(".sc-checkout-label");
    if (checkoutLabelEl) checkoutLabelEl.textContent = checkoutLabelText;
    refreshCartIconMarkup();
    const drawerPosition = String(style?.drawerPosition || "right").toLowerCase();
    const mobileLayout = String(style?.mobileLayout || "drawer").toLowerCase();
    drawer.classList.toggle("sc-position-left", drawerPosition === "left");
    drawer.classList.toggle("sc-position-right", drawerPosition !== "left");
    drawer.classList.toggle("sc-mobile-bottom-sheet", mobileLayout === "bottom_sheet");
    const footerEl = drawer.querySelector(".sc-footer");
    if (footerEl) {
      footerEl.classList.toggle("sc-footer-static", !(style?.stickyCheckout ?? true));
    }

    if (mode === "image") {
      const rawImage =
        pick(style, ["cartDrawerBackground", "cartDrawerImage", "drawerImage", "topBgImage"], null) || "";
      const imgUrl =
        /^url\(/i.test(String(rawImage)) ? String(rawImage) : buildCssUrl(rawImage);

      if (imgUrl) {
        r.setProperty("--sc-top-bg-image", `linear-gradient(rgba(0,0,0,.45), rgba(0,0,0,.45)), ${imgUrl}`);
      } else {
        r.setProperty("--sc-top-bg-image", "none");
      }
      r.setProperty("--sc-top-bg-color", "transparent");
      r.setProperty("--sc-top-bg-color-effective", "transparent");
      r.setProperty("--sc-top-bg-image-effective", "var(--sc-top-bg-image)");

      r.setProperty("--sc-drawer-bg", imgUrl || baseBg || "transparent");
      if (!hasExplicitProgressBg) r.setProperty("--sc-progress-bg", "transparent");
      if (!hasExplicitFooterBg) r.setProperty("--sc-footer-bg", "transparent");
    } else if (mode === "gradient") {
      const gradientBg = /gradient\(/i.test(String(baseBg))
        ? String(baseBg)
        : `linear-gradient(180deg, ${String(gradientStart)} 0%, ${String(gradientEnd)} 100%)`;

      r.setProperty("--sc-top-bg-color", "transparent");
      r.setProperty("--sc-top-bg-image", gradientBg);
      r.setProperty("--sc-top-bg-color-effective", "transparent");
      r.setProperty("--sc-top-bg-image-effective", "var(--sc-top-bg-image)");

      r.setProperty("--sc-drawer-bg", gradientBg);
      if (!hasExplicitProgressBg) r.setProperty("--sc-progress-bg", "transparent");
      if (!hasExplicitFooterBg) r.setProperty("--sc-footer-bg", "transparent");
    } else {
      const solidBg =
        pickColor(style, ["cartDrawerBackground", "cartDrawerBg", "drawerTopBg", "topBg", "baseBg"], null) ||
        getFirstColorFromBackground(baseBg) ||
        defaults.baseBg;

      r.setProperty("--sc-top-bg-color", String(solidBg));
      r.setProperty("--sc-top-bg-image", "none");
      r.setProperty("--sc-top-bg-color-effective", "var(--sc-top-bg-color)");
      r.setProperty("--sc-top-bg-image-effective", "none");

      r.setProperty("--sc-drawer-bg", String(solidBg));
      if (!hasExplicitProgressBg) r.setProperty("--sc-progress-bg", String(solidBg));
      if (!hasExplicitFooterBg) r.setProperty("--sc-footer-bg", String(solidBg));
    }

    DISCOUNT_PANEL_STYLE_ENABLED =
      to01(pick(style, ["discountCodeApply"], defaults.discountCodeApply)) === 1;
    OFFER_TABS_ENABLED = style?.offerButtonEnabled !== false && style?.offerButtonEnabled !== 0;
    if (!OFFER_TABS_ENABLED) ACTIVE_DRAWER_TAB = "cart";
    if (offerTabs) offerTabs.hidden = !OFFER_TABS_ENABLED;
  };

  const setDiscountMessage = (msg) => {
    if (!discountMsg) return;
    const text = trimToNull(msg);
    if (!text) {
      discountMsg.textContent = "";
      discountMsg.hidden = true;
      return;
    }
    discountMsg.textContent = text;
    discountMsg.hidden = false;
  };

  const getCartRewardLineCents = () => {
    const items = Array.isArray(CART?.items) ? CART.items : [];
    return items.reduce((sum, it) => {
      const props = it?.properties || {};
      const isFreeGift =
        String(props?.[FREE_GIFT_PROPERTY] || "").trim().toLowerCase() === "true";
      const isBxgyGift =
        String(props?.[BXGY_GIFT_PROPERTY] || "").trim().toLowerCase() === "true";
      if (!isFreeGift && !isBxgyGift) return sum;
      return sum + Math.max(0, Number(it?.final_line_price) || 0);
    }, 0);
  };

  const getCartSubtotalCents = () => {
    const raw = Number(CART?.items_subtotal_price);
    const items = Array.isArray(CART?.items) ? CART.items : [];
    const baseSubtotal = Number.isFinite(raw)
      ? Math.max(0, raw)
      : items.reduce(
        (sum, it) => sum + Math.max(0, Number(it?.final_line_price) || 0),
        0
      );
    return Math.max(0, baseSubtotal - getCartRewardLineCents());
  };

  // Uses original_line_price so Shopify automatic quantity discounts don't
  // reduce the subtotal below free-gift / shipping thresholds.
  const getCartOriginalSubtotalCents = () => {
    const items = Array.isArray(CART?.items) ? CART.items : [];
    if (items.length) {
      return items.reduce(
        (sum, it) => sum + Math.max(0, Number(it?.original_line_price) || 0),
        0
      );
    }
    const raw = Number(CART?.original_total_price);
    if (Number.isFinite(raw)) return Math.max(0, raw);
    return Number(CART?.items_subtotal_price || 0);
  };

  const findCodeDiscountRuleByCode = (code) => {
    const needle = String(code || "").trim().toLowerCase();
    if (!needle) return null;
    const list = Array.isArray(CODE_DISCOUNT_RULES) ? CODE_DISCOUNT_RULES : [];
    return (
      list.find((r) => {
        const c = String(r?.discountCode ?? r?.discount_code ?? r?.code ?? "")
          .trim()
          .toLowerCase();
        return c && c === needle;
      }) || null
    );
  };

  const getAppliedDiscountRules = () => {
    const list = Array.isArray(CODE_DISCOUNT_RULES) ? CODE_DISCOUNT_RULES : [];
    const applied = [];
    list.forEach((rule) => {
      if (!isRuleEnabled(rule)) return;
      const code = getDiscountRuleCode(rule);
      if (!code) return;
      if (isDiscountAppliedInCart(code)) applied.push({ rule, code });
    });
    return applied;
  };

  let DISCOUNT_REMOVE_IN_FLIGHT = false;
  let LAST_AUTO_REMOVED_CODE = null;
  let LAST_AUTO_REMOVED_AT = 0;

  const clearDiscountCode = async (code) => {
    const attempts = [
      "/discount/clear?redirect=/cart",
      "/discount/clear",
    ];
    for (const url of attempts) {
      try {
        const res = await fetch(url, { credentials: "same-origin", redirect: "follow" });
        if (res && res.ok) return true;
      } catch { }
    }
    try {
      const attrs = CART?.attributes || {};
      const target = String(code || "").toLowerCase();
      const attributes = {};
      Object.entries(attrs).forEach(([k, v]) => {
        if (!k) return;
        if (String(v || "").toLowerCase() === target) {
          attributes[k] = "";
        }
      });
      attributes.discount_code = "";
      attributes.discountCode = "";
      const r = await fetch("/cart/update.js", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ attributes }),
      });
      if (r && r.ok) return true;
    } catch { }
    return false;
  };

  let DISCOUNT_MANUAL_ENFORCE_IN_FLIGHT = false;
  let LAST_MANUAL_REMOVED_CODE = null;
  let LAST_MANUAL_REMOVED_AT = 0;

  const maybeRemoveUnapprovedDiscountCodes = async () => {
    if (DISCOUNT_MANUAL_ENFORCE_IN_FLIGHT) return;

    const appliedCodes = getAppliedDiscountCodes();
    if (!appliedCodes.length) {
      scStore.del(MANUAL_DISCOUNT_CODE_KEY);
      return;
    }

    const manualCode = trimToNull(scStore.get(MANUAL_DISCOUNT_CODE_KEY));
    const manualLower = manualCode ? manualCode.toLowerCase() : null;
    const hasManual =
      !!manualLower &&
      appliedCodes.some((c) => String(c).trim().toLowerCase() === manualLower);

    if (hasManual) return;

    const firstCode = appliedCodes[0];
    if (
      LAST_MANUAL_REMOVED_CODE &&
      String(LAST_MANUAL_REMOVED_CODE).toLowerCase() === String(firstCode).toLowerCase() &&
      Date.now() - LAST_MANUAL_REMOVED_AT < 5000
    ) {
      return;
    }

    DISCOUNT_MANUAL_ENFORCE_IN_FLIGHT = true;
    try {
      await clearDiscountCode(firstCode);
      scStore.del(MANUAL_DISCOUNT_CODE_KEY);
      await refreshFromNetwork();
      setDiscountMessage("");
      LAST_MANUAL_REMOVED_CODE = firstCode;
      LAST_MANUAL_REMOVED_AT = Date.now();
    } catch (err) {
      console.error("[SmartCartify] manual discount enforcement failed:", err);
    } finally {
      DISCOUNT_MANUAL_ENFORCE_IN_FLIGHT = false;
    }
  };

  const maybeRemoveInvalidDiscountCodes = async () => {
    if (DISCOUNT_REMOVE_IN_FLIGHT) return;

    const appliedRules = getAppliedDiscountRules();

    const manualCode = trimToNull(scStore.get(MANUAL_DISCOUNT_CODE_KEY));
    const manualRule = manualCode ? findCodeDiscountRuleByCode(manualCode) : null;

    const rulesToCheck = appliedRules.length
      ? appliedRules
      : manualRule
        ? [{ rule: manualRule, code: manualCode }]
        : [];

    if (!rulesToCheck.length) return;

    const subtotalCents = getCartSubtotalCents();
    const cartQty = getCartTotalQty();
    const currency = normalizeCurrencyCode();

    for (const { rule, code } of rulesToCheck) {
      const triggerType = String(rule?.triggerType ?? rule?.trigger_type ?? "amount")
        .trim()
        .toLowerCase();

      const minQuantity = Number(rule?.minQuantity ?? rule?.min_quantity);
      const minQuantityFail =
        triggerType === "quantity" &&
        Number.isFinite(minQuantity) &&
        minQuantity > 0 &&
        cartQty < minQuantity;

      const minPurchase = Number(
        rule?.minPurchase ??
        rule?.min_purchase ??
        rule?.minSubtotal ??
        rule?.min_subtotal ??
        rule?.minAmount ??
        rule?.min_amount
      );

      const minCents =
        triggerType !== "quantity" && Number.isFinite(minPurchase) && minPurchase > 0
          ? Math.round(minPurchase * priceDivisor(currency))
          : null;

      const meta = getDiscountRuleMeta(rule, subtotalCents);

      const minPurchaseFail = minCents != null && subtotalCents < minCents;

      const discountAmountFail =
        meta &&
        !meta.isPercent &&
        Number.isFinite(meta.cents) &&
        meta.cents > subtotalCents;

      if (!minQuantityFail && !minPurchaseFail && !discountAmountFail) continue;

      DISCOUNT_REMOVE_IN_FLIGHT = true;

      try {
        await clearDiscountCode(code);

        scStore.del(MANUAL_DISCOUNT_CODE_KEY);
        scStore.del("__SC_LAST_APPLIED_CODE__");

        const discountInput = drawer.querySelector("[data-discount-input]");
        if (discountInput) discountInput.value = "";

        await refreshFromNetwork();
        renderAllFromCache();

        setDiscountMessage("");
        LAST_AUTO_REMOVED_CODE = code;
        LAST_AUTO_REMOVED_AT = Date.now();
      } catch (err) {
        console.error("[SmartCartify] auto remove discount failed:", err);
      } finally {
        DISCOUNT_REMOVE_IN_FLIGHT = false;
      }

      return;
    }
  };

  const updateDiscountPanelVisibility = (opts = {}) => {
    if (!drawerDiscountPanel) return;
    const isEmpty =
      typeof opts.isEmpty === "boolean"
        ? opts.isEmpty
        : !Array.isArray(CART?.items) || CART.items.length === 0;
    const enabled = DISCOUNT_PANEL_STYLE_ENABLED && !isEmpty;
    drawerDiscountPanel.hidden = !enabled;
    if (!enabled && discountInput) discountInput.value = "";
    if (!enabled) setDiscountMessage("");
  };

  const getCheckoutDiscountCode = () => {
    const manualCode = trimToNull(scStore.get(MANUAL_DISCOUNT_CODE_KEY));
    if (manualCode && isDiscountAppliedInCart(manualCode)) return manualCode;

    const lastCode = trimToNull(scStore.get("__SC_LAST_APPLIED_CODE__"));
    if (lastCode && isDiscountAppliedInCart(lastCode)) return lastCode;

    const attrCode = trimToNull(CART?.attributes?.discount_code) || trimToNull(CART?.attributes?.discountCode);
    if (attrCode && isDiscountAppliedInCart(attrCode)) return attrCode;

    const appliedCodes = getAppliedDiscountCodes();
    return appliedCodes.length ? appliedCodes[0] : null;
  };

  const goToCheckoutWithDiscount = () => {
    const code = getCheckoutDiscountCode();

    if (code) {
      window.location.href =
        `/discount/${encodeURIComponent(code)}?redirect=${encodeURIComponent("/checkout")}`;
      return;
    }

    window.location.href = "/checkout";
  };

  const validateCodeDiscountRule = (rule, subtotalCents) => {
    if (!rule) return { ok: false, message: "Discount code is not valid." };

    const currency = normalizeCurrencyCode();
    const subtotal = Math.max(0, Number(subtotalCents) || 0);

    const minPurchase = Number(
      rule?.minPurchase ??
      rule?.min_purchase ??
      rule?.minSubtotal ??
      rule?.min_subtotal ??
      rule?.minAmount ??
      rule?.min_amount
    );

    if (Number.isFinite(minPurchase) && minPurchase > 0) {
      const minCents = Math.round(minPurchase * priceDivisor(currency));

      if (subtotal < minCents) {
        return {
          ok: false,
          message: `Add ${formatMoney(minCents - subtotal, currency)} more to use this discount code.`,
        };
      }
    }

    const meta = getDiscountRuleMeta(rule, subtotal);

    if (
      meta &&
      !meta.isPercent &&
      Number.isFinite(meta.cents) &&
      meta.cents > subtotal
    ) {
      return {
        ok: false,
        message: `Discount amount ${formatMoney(meta.cents, currency)} cannot be greater than cart subtotal ${formatMoney(subtotal, currency)}.`,
      };
    }

    return { ok: true, message: "" };
  };

  const applyDiscountCode = async (codeOverride = "") => {
    const overrideCode =
      typeof codeOverride === "string" || typeof codeOverride === "number"
        ? trimToNull(codeOverride)
        : null;

    if (!overrideCode && (!discountInput || !drawerDiscountPanel || drawerDiscountPanel.hidden)) return;

    const code = overrideCode || trimToNull(discountInput?.value);

    if (!code) {
      setDiscountMessage("Please enter a discount code.");
      return;
    }

    setDiscountMessage("");

    const rule = findCodeDiscountRuleByCode(code);

    if (rule) {
      const remaining = getDiscountRuleRemaining(rule);

      if (remaining > 0) {

        scStore.del(MANUAL_DISCOUNT_CODE_KEY);
        scStore.del("__SC_LAST_APPLIED_CODE__");

        if (discountMsg) {
          discountMsg.style.color = "#dc2626";
        }

        setDiscountMessage(
          `Add ${formatMoney(remaining * priceDivisor())} more to use code ${code}.`
        );

        if (discountButton) {
          discountButton.disabled = false;
        }

        setProgressLoading(false);

        return;
      }
    }
    const validation = validateCodeDiscountRule(rule, getCartSubtotalCents());

    if (!validation.ok) {
      scStore.del(MANUAL_DISCOUNT_CODE_KEY);
      scStore.del("__SC_LAST_APPLIED_CODE__");

      if (discountMsg) discountMsg.style.color = "#dc2626";
      setDiscountMessage(validation.message);
      return;
    }

    const target = `/discount/${encodeURIComponent(code)}?redirect=${encodeURIComponent("/cart.js")}`;

    if (discountButton) discountButton.disabled = true;
    setProgressLoading(true);

    try {
      await fetch(target, { credentials: "same-origin", redirect: "follow" });

      await fetch("/cart/update.js", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          attributes: {
            discount_code: code,
            discountCode: code,
          },
        }),
      });

      await refreshFromNetwork();
      renderAllFromCache();

      if (rule && isDiscountAppliedInCart(code)) {
        scStore.set(MANUAL_DISCOUNT_CODE_KEY, code);
        scStore.set("__SC_LAST_APPLIED_CODE__", code);

        if (discountInput) discountInput.value = "";

        if (discountMsg) discountMsg.style.color = "#16a34a";
        setDiscountMessage(`Discount applied: ${code}`);

        firePaperEffect(2800);
        showCenterCelebratePopup(
          "Discount Applied ✅",
          `Discount applied: ${code}`,
          3000
        );
      } else {
        scStore.del(MANUAL_DISCOUNT_CODE_KEY);
        scStore.del("__SC_LAST_APPLIED_CODE__");

        if (discountMsg) discountMsg.style.color = "#dc2626";
        setDiscountMessage(`Discount code ${code} could not be applied.`);
      }
    } catch (err) {
      console.error("[SmartCartify] discount apply failed:", err);
      setDiscountMessage("Could not apply discount code. Please try again.");
    } finally {
      setProgressLoading(false);
      if (discountButton) discountButton.disabled = false;
    }
  };

  const applyStyleSettings = (s) => {
    const r = document.documentElement.style;
    if (s?.font) r.setProperty("--sc-font", s.font);
    if (s?.milestoneWidth) r.setProperty("--sc-milestone-width", String(s.milestoneWidth));

    applyCartDrawerStyleSettings(s || {});
    updateDiscountPanelVisibility();
  };

  if (discountButton) discountButton.addEventListener("click", (e) => {
    e.preventDefault();
    applyDiscountCode();
  });
  if (discountInput) {
    discountInput.addEventListener("input", () => {
      if (discountMsg) discountMsg.style.color = "";
      setDiscountMessage("");
    });
    discountInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyDiscountCode();
      }
    });
  }

  const renderFallback = (msg) => {
    const items = $(".sc-items-list");
    if (items) items.innerHTML = `<div class="sc-empty">${safe(msg || "Loading…")}</div>`;
    const footerMilestones = drawer.querySelector("[data-footer-milestones]");
    if (footerMilestones) {
      footerMilestones.hidden = true;
      footerMilestones.innerHTML = "";
    }

    const upsell = drawer.querySelector(".sc-upsell");
    if (upsell) {
      upsell.hidden = true;
      upsell.innerHTML = "";
    }
    if (offersPanel) {
      offersPanel.hidden = true;
      offersPanel.innerHTML = "";
    }
    if (offerTabs) offerTabs.hidden = true;
    ACTIVE_DRAWER_TAB = "cart";
    clearUpsellTimer();

    const label = $(".sc-label");
    if (label) label.textContent = safe(msg || "Milestones unavailable");

    const fill = $(".sc-fill");
    if (fill) fill.style.width = "0%";

    const dots = $(".sc-dots");
    if (dots) dots.innerHTML = "";

    const legends = $(".sc-legends");
    if (legends) legends.innerHTML = "";

    setAnnouncementMessages([]);

    document.documentElement.style.removeProperty("--sc-stepcount");
    LAST_DONE = 0;
    LAST_BXGY_DONE = false;
    __SC_PRIMED_POPUPS__ = false;
    hideAddToCartBar();
  };

  /* =========================================================
   ✅ BUILD STEPS + capture tables for announcement
  ========================================================= */
  const buildSteps = () => {
    const assignment = {};
    const subtotalCents = getCartOriginalSubtotalCents();
    const subtotalRupees = subtotalCents / priceDivisor();

    CODE_DISCOUNT_RULES = [];
    BXGY_RULES = [];
    BUYXGETY_RULES = [];

    const shippingList = getProxyArray(PROXY, ["shippingRules", "shippingRule", "shippingrule"]);
    const discountList = getProxyArray(PROXY, ["discountRules", "discountRule", "discountrule"]);
    const freeList = getProxyArray(PROXY, ["freeGiftRules", "freeGiftRule", "freegiftrule"]);
    const cartGoalList = getProxyArray(PROXY, [
      "cartGoalRules",
      "cartGoalRule",
      "cartgoalrule",
    ]);

    const buyxgetyList = getProxyArray(PROXY, [
      "buyxgetyRules",
      "buyxgetyRule",
      "buyxgetyrule",
      "buyXGetYRules",
      "bxgyrule",
      "bxgyRules",
      "bxgyRule",
    ]);

    const normType = (r) => String(r?.type ?? r?.ruleType ?? r?.rule_type ?? "").trim().toLowerCase();

    (Array.isArray(discountList) ? discountList : []).forEach((r) => {
      if (!isRuleEnabled(r)) return;
      const t = normType(r);
      if (t === "code") CODE_DISCOUNT_RULES.push(r);
    });

    (Array.isArray(discountList) ? discountList : []).forEach((r) => {
      if (!isRuleEnabled(r)) return;
      const t = normType(r);
      const hasMsgs = trimToNull(r?.beforeOfferUnlockMessage) || trimToNull(r?.afterOfferUnlockMessage);
      const looksLikeBxgy = t === "bxgy" || t === "buyxgety" || hasMsgs;
      if (looksLikeBxgy) BXGY_RULES.push(r);
    });

    (Array.isArray(buyxgetyList) ? buyxgetyList : []).forEach((r) => {
      if (!isRuleEnabled(r)) return;
      BUYXGETY_RULES.push(r);
    });

    (Array.isArray(discountList) ? discountList : []).forEach((r) => {
      if (!isRuleEnabled(r)) return;
      const t = normType(r);

      const hasX = Number(r?.xQty ?? r?.x_qty ?? r?.x ?? r?.buyQty ?? r?.buy_qty ?? r?.buy ?? 0) > 0;
      const hasY = Number(r?.yQty ?? r?.y_qty ?? r?.y ?? r?.getQty ?? r?.get_qty ?? r?.get ?? 0) > 0;
      const hasScope = !!trimToNull(r?.scope || r?.scopeName);

      if (t === "buyxgety" || (hasX && hasY && hasScope)) {
        BUYXGETY_RULES.push(r);
      }
    });

    const getRuleKey = (type, rule) =>
      `${type}:${rule?.id ?? rule?.shopifyRateId ?? rule?.campaignName ?? JSON.stringify(rule)}`;

    const isProgressBarRuleType = (type, rule) => {
      if (type === "shipping") {
        const rewardType = String(rule?.rewardType ?? rule?.reward_type ?? "")
          .trim()
          .toLowerCase()
          .replace(/[_\s-]+/g, "");
        return !rewardType || rewardType === "free" || rewardType === "freeshipping";
      }

      if (type === "discount") {
        const t = normType(rule).replace(/[_\s-]+/g, "");
        const hasBxgyMsgs =
          trimToNull(rule?.beforeOfferUnlockMessage) ||
          trimToNull(rule?.afterOfferUnlockMessage);
        const hasX = Number(rule?.xQty ?? rule?.x_qty ?? rule?.x ?? rule?.buyQty ?? rule?.buy_qty ?? rule?.buy ?? 0) > 0;
        const hasY = Number(rule?.yQty ?? rule?.y_qty ?? rule?.y ?? rule?.getQty ?? rule?.get_qty ?? rule?.get ?? 0) > 0;
        const isCodeDiscount = t === "code" || t === "codediscount";
        const isBuyRule = t === "bxgy" || t === "buyxgety" || hasBxgyMsgs || (hasX && hasY);
        return !isCodeDiscount && !isBuyRule;
      }

      return type === "free" || type === "bxgy" || type === "buyxgety";
    };

    const buildProgressStep = (type, rule, slot) => {
      if (!rule) return;
      if (!isRuleEnabled(rule)) return;
      if (!slot) return;

      const belowRaw = trimToNull(getProgressBelow(rule));

      // Type-based reward label — never includes campaignName so milestone circles
      // always show the reward type, not the merchant's internal campaign name.
      const rewardLabel = (() => {
        if (type === "shipping") {
          const rt = String(rule?.rewardType ?? rule?.reward_type ?? "").trim().toLowerCase();
          if (rt === "reduce" && (rule?.amount ?? rule?.rateAmount)) {
            const amt = rule?.amount ?? rule?.rateAmount;
            return `${formatMoney(amountToCurrencyMinorUnits(amt), CART?.currency)} shipping`;
          }
          return "Free Shipping!";
        }
        if (type === "discount") {
          const tokens = getDiscountValueTokens(rule);
          if (tokens?.valueWithOff) return tokens.valueWithOff;
          return "Discount";
        }
        if (type === "free") return "Free Gift";
        if (type === "bxgy" || type === "buyxgety") {
          const x = Number(rule?.xQty ?? rule?.x_qty ?? rule?.x ?? rule?.buyQty ?? rule?.buy_qty ?? rule?.buy);
          const y = Number(rule?.yQty ?? rule?.y_qty ?? rule?.y ?? rule?.getQty ?? rule?.get_qty ?? rule?.get);
          if (Number.isFinite(x) && x > 0 && Number.isFinite(y) && y > 0) {
            return `Buy ${x} Get ${y} Free`;
          }
          return "Buy X Get Y";
        }
        return "Reward";
      })();

      const title = (() => {
        const campaign = trimToNull(rule?.campaignName);
        if (campaign) return campaign;
        if (belowRaw) return belowRaw;
        return rewardLabel;
      })();

      const progressMetric = getRuleProgressMetric(type, rule);
      const unlockCents =
        progressMetric.metric === "amount" ? goalToCents(progressMetric.goal) : null;
      const unlockQuantity =
        progressMetric.metric === "quantity" && Number.isFinite(Number(progressMetric.goal))
          ? Number(progressMetric.goal)
          : null;

      const iconKey =
        pickIconKeyFromRule(rule) ||
        (type === "shipping"
          ? "shipping"
          : type === "discount"
            ? "discount"
            : type === "bxgy" || type === "buyxgety"
              ? "bxgy"
              : "free");
      const icon = ICONS[String(iconKey)] || ICONS.sparkles;

      const beforeRaw = trimToNull(getProgressBefore(rule)) || "";
      const afterRaw = trimToNull(getProgressAfter(rule)) || "";

      // Resolve configured text (with all {{token}} replacements)
      const resolvedBefore = replaceProgressText({
        text: beforeRaw,
        type,
        rule,
        subtotalRupees,
        useRemainingForGoal: true,
        boldTokens: true,
      });
      const resolvedAfter = replaceProgressText({
        text: afterRaw,
        type,
        rule,
        subtotalRupees,
        useRemainingForGoal: false,
        boldTokens: true,
      });

      // Generate value-aware fallback messages when merchant has not configured them
      const goalAmt = progressMetric.goal != null
        ? progressMetric.metric === "quantity"
          ? formatQuantityGoal(progressMetric.goal)
          : formatMoney(amountToCurrencyMinorUnits(progressMetric.goal), CART?.currency)
        : "";
      const defaultBeforeTemplate = (() => {
        if (!goalAmt) return title;
        const rt = String(rule?.rewardType ?? rule?.reward_type ?? "").trim().toLowerCase();
        if (type === "shipping") {
          if (rt === "reduce" && (rule?.amount ?? rule?.rateAmount)) {
            const shipAmt = formatMoney(amountToCurrencyMinorUnits(rule.amount ?? rule.rateAmount), CART?.currency);
            return `Spend {{goal}} more to get ${shipAmt} shipping`;
          }
          return `Spend {{goal}} more for free shipping`;
        }
        if (type === "discount") {
          const tokens = getDiscountValueTokens(rule);
          const discLabel = tokens?.valueWithOff || "a discount";
          return tokens?.valueWithOff
            ? "Spend {{goal}} more to get {{discount_value_with_off}}"
            : `Spend {{goal}} more to get ${discLabel}`;
        }
        if (type === "free") return `Spend {{goal}} more for a free gift`;
        if (type === "bxgy" || type === "buyxgety") {
          const y = Number(rule?.yQty ?? rule?.y_qty ?? rule?.y ?? rule?.getQty ?? rule?.get_qty ?? rule?.get);
          return `Add {{goal}} to get ${Number.isFinite(y) && y > 0 ? "{{y}}" : ""} free item${y === 1 ? "" : "s"}`.replace(/\s{2,}/g, " ").trim();
        }
        return `Spend {{goal}} more to unlock your reward`;
      })();
      const defaultAfterTemplate = (() => {
        const rt = String(rule?.rewardType ?? rule?.reward_type ?? "").trim().toLowerCase();
        if (type === "shipping") {
          if (rt === "reduce" && (rule?.amount ?? rule?.rateAmount)) {
            const shipAmt = formatMoney(amountToCurrencyMinorUnits(rule.amount ?? rule.rateAmount), CART?.currency);
            return `${shipAmt} shipping unlocked! 🎉`;
          }
          return "Free shipping unlocked! 🎉";
        }
        if (type === "discount") {
          const tokens = getDiscountValueTokens(rule);
          const discLabel = tokens?.valueWithOff || "Discount";
          return tokens?.valueWithOff
            ? "{{discount_value_with_off}} unlocked! 🎉"
            : `${discLabel} unlocked! 🎉`;
        }
        if (type === "free") return "Free gift unlocked! 🎉";
        if (type === "bxgy" || type === "buyxgety") {
          const x = Number(rule?.xQty ?? rule?.x_qty ?? rule?.x ?? rule?.buyQty ?? rule?.buy_qty ?? rule?.buy);
          const y = Number(rule?.yQty ?? rule?.y_qty ?? rule?.y ?? rule?.getQty ?? rule?.get_qty ?? rule?.get);
          return Number.isFinite(x) && x > 0 && Number.isFinite(y) && y > 0
            ? "Buy {{x}} Get {{y}} Free unlocked! 🎉"
            : "Buy X Get Y unlocked! 🎉";
        }
        return "Reward unlocked! 🎉";
      })();

      const defaultBeforeText = replaceProgressText({
        text: defaultBeforeTemplate,
        type,
        rule,
        subtotalRupees,
        useRemainingForGoal: true,
        boldTokens: true,
      }) || defaultBeforeTemplate;
      const defaultAfterText = replaceProgressText({
        text: defaultAfterTemplate,
        type,
        rule,
        subtotalRupees,
        useRemainingForGoal: false,
        boldTokens: true,
      }) || defaultAfterTemplate;

      return {
        slot,
        type,
        rule,
        progressMetric: progressMetric.metric,
        unlockCents,
        unlockQuantity,
        icon,
        title,

        progressTextBelow: replaceProgressText({
          text: belowRaw || rewardLabel,
          type,
          rule,
          subtotalRupees,
          useRemainingForGoal: false,
        }) || rewardLabel,

        progressTextBefore: resolvedBefore || defaultBeforeText,
        progressTextAfter: resolvedAfter || defaultAfterText,
      };
    };

    const buildCartGoalRule = (campaign, goal, index) => {
      const trackBy = String(campaign?.trackBy || "").toLowerCase() === "quantity" ? "quantity" : "value";
      const type = normalizeCartGoalRewardType(goal);
      const threshold = Number(goal?.goal);
      const texts = parseObjectish(goal?.texts || {});
      const productIds = getCartGoalBonusProductIds(goal);
      const bonusProducts = getCartGoalBonusProducts(goal);
      const bonusProductId =
        trimToNull(goal?.bonusProductId) ||
        trimToNull(goal?.bonus) ||
        trimToNull(productIds[0]) ||
        "";
      const rule = {
        ...goal,
        id: `cartgoal:${campaign?.id ?? "campaign"}:${goal?.id ?? index + 1}`,
        campaignId: campaign?.id,
        campaignName: trimToNull(campaign?.campaignName) || "Cart Goal",
        enabled: true,
        isCartGoal: true,
        type: type === "free" ? "gift" : type,
        ruleType: type,
        rewardType: type,
        cartStepName: `step${index + 1}`,
        triggerType: trackBy === "quantity" ? "quantity" : "amount",
        progressTextBefore: trimToNull(texts.aboveBefore) || "",
        progressTextAfter: trimToNull(texts.aboveAfter) || "",
        progressTextBelow: trimToNull(texts.below) || "",
        offerTitleBefore: trimToNull(texts.offerTitleBefore) || "",
        offerTitleAfter: trimToNull(texts.offerTitleAfter) || "",
        offerSubtitleBefore: trimToNull(texts.offerSubtitleBefore) || "",
        offerSubtitleAfter: trimToNull(texts.offerSubtitleAfter) || "",
        shopifyDiscountId: goal?.shopifyDiscountId || null,
        bonusProductId,
        bonus: bonusProductId,
        bonusProductIds: productIds,
        bonusProducts,
      };

      if (trackBy === "quantity") {
        rule.minQuantity = Number.isFinite(threshold) ? threshold : null;
      } else if (type === "shipping") {
        rule.minSubtotal = Number.isFinite(threshold) ? threshold : null;
      } else {
        rule.minPurchase = Number.isFinite(threshold) ? threshold : null;
      }

      if (type === "discount") {
        rule.value = goal?.value;
        rule.discountValue = goal?.value;
        rule.discountType = goal?.discountType === "amount" ? "amount" : "percentage";
        rule.valueType = rule.discountType;
      }

      rule.iconChoice = type === "shipping" ? "shipping" : type === "discount" ? "tag" : "free";

      return { type, rule };
    };

    const selectedCartGoalCampaign = (Array.isArray(cartGoalList) ? cartGoalList : [])
      .filter((campaign) => isRuleEnabled(campaign))
      .sort((a, b) => Number(b?.priority || 0) - Number(a?.priority || 0))[0];

    const cartGoalCandidates = selectedCartGoalCampaign
      ? [selectedCartGoalCampaign]
        .flatMap((campaign) => {
          const goals = parseArrayish(campaign?.goals);
          return goals
            .filter((goal) => goal && Number(goal?.goal) > 0)
            .map((goal, index) => buildCartGoalRule(campaign, goal, index));
        })
      : [];

    const cartGoalSteps = cartGoalCandidates
      .map(({ type, rule }, index) => buildProgressStep(type, rule, `step${index + 1}`))
      .filter(Boolean)
      .sort((a, b) => {
        const metricOrder = a.progressMetric === b.progressMetric ? 0 : a.progressMetric === "amount" ? -1 : 1;
        if (metricOrder !== 0) return metricOrder;
        return getProgressStepThreshold(a) - getProgressStepThreshold(b);
      })
      .map((step, index) => ({ ...step, slot: `step${index + 1}` }));

    if (cartGoalSteps.length) {
      if (DEBUG_TABLES) {
        console.groupCollapsed("[SC] Cart Goal Progress Steps");
        console.table(
          cartGoalSteps.map((step) => ({
            slot: step.slot,
            type: step.type,
            campaignName: step.rule?.campaignName ?? "",
            goal:
              step.progressMetric === "quantity"
                ? step.unlockQuantity
                : step.unlockCents,
          }))
        );
        console.groupEnd();
      }
      return cartGoalSteps;
    }

    const progressCandidates = [
      ...(Array.isArray(shippingList) ? shippingList : []).map((rule) => ({ type: "shipping", rule })),
      ...(Array.isArray(discountList) ? discountList : []).map((rule) => ({ type: "discount", rule })),
      ...(Array.isArray(freeList) ? freeList : []).map((rule) => ({ type: "free", rule })),
      ...(Array.isArray(buyxgetyList) ? buyxgetyList : []).map((rule) => ({ type: "buyxgety", rule })),
    ].filter(({ type, rule }) => isRuleEnabled(rule) && isProgressBarRuleType(type, rule));

    const assignedRuleKeys = new Set();
    const assignCandidate = ({ type, rule }, slot) => {
      if (!STEP_SLOTS.includes(slot)) return false;
      if (assignment[slot]) return false;
      const ruleKey = getRuleKey(type, rule);
      if (assignedRuleKeys.has(ruleKey)) return false;
      const step = buildProgressStep(type, rule, slot);
      if (!step) return false;
      assignment[slot] = step;
      assignedRuleKeys.add(ruleKey);
      return true;
    };

    progressCandidates.forEach((candidate) => {
      const slot = normalizeStepSlotFromAny(candidate.rule);
      if (slot) assignCandidate(candidate, slot);
    });

    progressCandidates.forEach((candidate) => {
      const ruleKey = getRuleKey(candidate.type, candidate.rule);
      if (assignedRuleKeys.has(ruleKey)) return;
      const slot = STEP_SLOTS.find((s) => !assignment[s]);
      if (slot) assignCandidate(candidate, slot);
    });

    const steps = STEP_SLOTS.map((s) => assignment[s]).filter(Boolean);

    if (DEBUG_TABLES) {
      console.groupCollapsed("[SC] Progress Steps");
      console.table(
        steps.map((step) => ({
          slot: step.slot,
          type: step.type,
          ruleType: step.rule?.type ?? step.rule?.ruleType ?? "",
          campaignName: step.rule?.campaignName ?? "",
          cartStepName: step.rule?.cartStepName ?? "",
          goal: step.progressMetric === "quantity" ? step.unlockQuantity : step.unlockCents,
        }))
      );
      console.groupEnd();
    }

    return steps;
  };

  const offerIconSvg = (type) => {
    if (type === "shipping") {
      return `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 5.25c0-.414.336-.75.75-.75h6.991a2.75 2.75 0 0 1 2.644 1.995l.427 1.494a.25.25 0 0 0 .18.173l1.682.421A1.75 1.75 0 0 1 18 10.281V11.5c0 .711-.424 1.323-1.032 1.597.021.131.032.266.032.403a2.5 2.5 0 1 1-4.988-.25H8.988A2.5 2.5 0 1 1 4.208 12.5H3.75a.75.75 0 0 1 0-1.5h2.5c.03 0 .059.002.088.005A2.5 2.5 0 0 1 8.285 11.75h4.43A2.493 2.493 0 0 1 16.283 11.748.25.25 0 0 0 16.5 11.5v-1.219a.25.25 0 0 0-.189-.243l-1.683-.42a1.75 1.75 0 0 1-1.258-1.217l-.427-1.494A1.25 1.25 0 0 0 11.74 6H4.75A.75.75 0 0 1 4 5.25ZM6.5 14.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd"/><path d="M3.25 8a.75.75 0 0 0 0 1.5h5a.75.75 0 0 0 0-1.5h-5Z"/></svg>`;
    }
    if (type === "code") {
      return `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M15.5 4.5h-11a1 1 0 0 0-1 1v2.043a1.75 1.75 0 0 1 0 3.414V13.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-2.543a1.75 1.75 0 0 1 0-3.414V5.5a1 1 0 0 0-1-1ZM4.5 3A2.5 2.5 0 0 0 2 5.5v2.75a.75.75 0 0 0 .75.75.25.25 0 0 1 0 .5.75.75 0 0 0-.75.75v3.25A2.5 2.5 0 0 0 4.5 16h11a2.5 2.5 0 0 0 2.5-2.5v-3.25a.75.75 0 0 0-.75-.75.25.25 0 0 1 0-.5.75.75 0 0 0 .75-.75V5.5A2.5 2.5 0 0 0 15.5 3h-11Z" clip-rule="evenodd"/><path d="M13.28 7.03a.75.75 0 1 0-1.06-1.06l-5.5 5.5a.75.75 0 1 0 1.06 1.06l5.5-5.5ZM8 7.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM13 12.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/></svg>`;
    }
    if (type === "discount") {
      return `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M7.5 6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM12.5 11a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"/><path fill-rule="evenodd" d="M14.53 5.47a.75.75 0 0 1 0 1.06l-8 8a.75.75 0 0 1-1.06-1.06l8-8a.75.75 0 0 1 1.06 0ZM3 5.5A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5v9a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 3 14.5v-9ZM5.5 4.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-9Z" clip-rule="evenodd"/></svg>`;
    }
    if (type === "bxgy" || type === "buyxgety") {
      return `<svg viewBox="0 0 24 24" fill="none"><path d="M4 8h16M8 4v4M16 4v4M6 8v12h12V8" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 13h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
    }
    return `<svg viewBox="0 0 24 24" fill="none"><path d="M20 12v8H4v-8M3 8h18v4H3V8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 8v12M12 8H8.5A2.5 2.5 0 1 1 11 5.5V8ZM12 8h3.5A2.5 2.5 0 1 0 13 5.5V8Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  };

  const getOfferStepTitle = (step) => {
    const type = String(step?.type || "").toLowerCase();
    if (type === "shipping") return "Free Shipping";
    if (type === "free") {
      const title = trimToNull(step?.title);
      return !title || /^free gift$/i.test(title) ? "Free Gift Products" : title;
    }
    if (type === "discount") {
      const raw = trimToNull(step?.progressTextBelow) || trimToNull(step?.title);
      if (!raw) return "Order Discount";
      return String(raw).replace(/\s*off\s*$/i, " Discount!");
    }
    if (type === "bxgy" || type === "buyxgety") return step?.title || "Buy X Get Y Discount";
    return step?.title || "Offer";
  };

  const getOfferRuleTitle = (type, rule, fallback = "Offer") => {
    const normalized = String(type || "").toLowerCase();
    if (normalized === "code") {
      return trimToNull(rule?.codeCampaignName) || trimToNull(rule?.campaignName) || "Discount Code";
    }
    if (normalized === "shipping") return trimToNull(rule?.campaignName) || "Free Shipping";
    if (normalized === "free") {
      const name = trimToNull(rule?.campaignName);
      return !name || /^free gift$/i.test(name) ? "Free Gift Products" : name;
    }
    if (normalized === "bxgy" || normalized === "buyxgety") {
      const complete = isRewardOfferGoalMet(normalized, rule);
      return getDynamicOfferTitle(
        normalized,
        rule,
        complete,
        trimToNull(rule?.campaignName) || "Buy X Get Y Discount"
      );
    }
    if (normalized === "discount") {
      const tokens = getDiscountValueTokens(rule);
      const value = trimToNull(tokens?.value) || trimToNull(tokens?.valueWithOff);
      if (value) return `${String(value).replace(/\s*off\b/gi, "").trim()} Discount!`;
      return trimToNull(rule?.campaignName) || fallback || "Order Discount";
    }
    return trimToNull(rule?.campaignName) || fallback;
  };

  const getOfferUnlockField = (raw, fields = []) => {
    const text = trimToNull(raw);
    if (!text) return "";
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object") {
        for (const field of fields) {
          const value = trimToNull(parsed?.[field]);
          if (value) return value;
        }
      }
    } catch { /* plain text */ }
    return text;
  };

  const getOfferUnlockText = (raw) =>
    getOfferUnlockField(raw, ["text", "message", "subtitle", "title"]);

  const getOfferUnlockTitle = (raw) =>
    getOfferUnlockField(raw, ["title", "heading", "text", "message"]);

  const getDynamicOfferTitle = (type, rule, complete, fallback = "Offer") => {
    const normalized = String(type || "").toLowerCase();
    const textType = normalized === "code" ? "discount" : normalized;
    const rawTitle =
      complete
        ? pickMessageTextAny(rule, ["afterTitle", "after_title"], "") ||
        getOfferUnlockTitle(rule?.afterOfferUnlockMessage)
        : pickMessageTextAny(rule, ["beforeTitle", "before_title"], "") ||
        getOfferUnlockTitle(rule?.beforeOfferUnlockMessage);
    const subtotalRupees = getCartOriginalSubtotalCents() / priceDivisor();
    const replaced = rawTitle
      ? replaceProgressText({
        text: rawTitle,
        type: textType,
        rule,
        subtotalRupees,
        useRemainingForGoal: !complete,
      })
      : "";
    return trimToNull(replaced) || fallback;
  };

  const isCodeDiscountRuleApplied = (rule) => {
    const code = getDiscountRuleCode(rule);
    return Boolean(code && isDiscountAppliedInCart(code));
  };

  const getRuleThresholdState = (type, rule) => {
    const progressMetric = getRuleProgressMetric(type, rule);
    const goalValue = Number(progressMetric?.goal);
    const currentValue = Number(progressMetric?.current);
    const hasThreshold = Number.isFinite(goalValue) && goalValue > 0;
    return {
      hasThreshold,
      complete:
        hasThreshold &&
        Number.isFinite(currentValue) &&
        currentValue >= goalValue,
    };
  };

  const isRewardOfferGoalMet = (type, rule) => {
    const normalized = String(type || "").toLowerCase();
    if (normalized !== "free" && normalized !== "bxgy" && normalized !== "buyxgety") return true;

    if (normalized === "bxgy" || normalized === "buyxgety") {
      const status = getBuyXGetYStatuses().find((item) => {
        const itemKey = getRuleKey(item.rule, "buyxgety") || getRuleKey(item.rule, "bxgy");
        const ruleKey = getRuleKey(rule, "buyxgety") || getRuleKey(rule, "bxgy");
        return item.rule === rule || (itemKey && ruleKey && String(itemKey) === String(ruleKey));
      });
      if (status) return Boolean(status.complete);
    }

    const thresholdState = getRuleThresholdState(normalized, rule);
    return !thresholdState.hasThreshold || Boolean(thresholdState.complete);
  };

  const getRewardGoalPendingMessage = (kind) =>
    kind === "free"
      ? "Meet the Free Product goal to add this item."
      : "Meet the Buy X Get Y goal to add this item.";

  const getOfferRuleSubtitle = (type, rule, fallback = "Reward available in this order") => {
    const normalized = String(type || "").toLowerCase();
    const subtotalRupees = getCartOriginalSubtotalCents() / priceDivisor();
    const textType = normalized === "code" ? "discount" : normalized;
    const thresholdState = getRuleThresholdState(textType, rule);
    const complete = normalized === "code"
      ? isCodeDiscountRuleApplied(rule)
      : thresholdState.complete;
    const codeEligible =
      normalized === "code" &&
      (!thresholdState.hasThreshold || thresholdState.complete);
    const codeNotAppliedPrompt =
      "Apply code {{discount_code}} to get {{discount_value_with_off}}";
    const configured =
      normalized === "code" && !complete && codeEligible
        ? codeNotAppliedPrompt
        : trimToNull(complete ? getProgressAfter(rule) : getProgressBefore(rule)) ||
        getOfferUnlockText(complete ? rule?.afterOfferUnlockMessage : rule?.beforeOfferUnlockMessage) ||
        trimToNull(rule?.message) ||
        "";
    const replaced = replaceProgressText({
      text: configured || fallback,
      type: textType,
      rule,
      subtotalRupees,
      useRemainingForGoal: normalized === "code" ? !codeEligible : !complete,
    });
    const finalText = normalized === "free"
      ? String(replaced || "").replace(/\bfree gift\b/gi, "Free Gift Products")
      : replaced;
    return trimToNull(finalText) || fallback;
  };

  const getOfferProductThumbs = (type, rule) => {
    const products = [
      ...parseArrayish(rule?.bonusProducts),
      ...parseArrayish(rule?.rewardProducts),
      ...parseArrayish(rule?.products),
    ];
    const ids = [
      ...parseArrayish(rule?.bonusProductIds),
      ...parseArrayish(rule?.rewardProductIds),
      ...parseArrayish(rule?.giftSku),
      trimToNull(rule?.bonusProductId),
      trimToNull(rule?.bonus),
    ].filter(Boolean);
    const out = [];
    products.forEach((product) => {
      const title =
        trimToNull(product?.title) ||
        trimToNull(product?.name) ||
        trimToNull(product?.productTitle) ||
        "Gift";
      const image =
        trimToNull(product?.image) ||
        trimToNull(product?.featuredImage?.url) ||
        trimToNull(product?.featuredImage) ||
        trimToNull(product?.productImage) ||
        "";
      out.push({ title, image });
    });
    ids.forEach((id) => {
      if (out.length >= 4) return;
      out.push({ title: String(id).split("/").pop() || "Gift", image: "" });
    });
    if (!out.length && (type === "bxgy" || type === "buyxgety" || type === "free")) {
      out.push({ title: type === "free" ? "Gift" : "Offer", image: "" });
    }
    return out.slice(0, 4);
  };

  const renderOfferVisual = (offer) => {
    const thumbs = Array.isArray(offer.thumbs) ? offer.thumbs : [];
    if (thumbs.length) {
      return `
        <span class="sc-offer-thumbs" aria-hidden="true">
          ${thumbs.map((thumb) => {
        const label = safe((thumb.title || "G").slice(0, 1).toUpperCase());
        const image = trimToNull(thumb.image);
        return `<span class="sc-offer-thumb">${image
          ? `<img src="${safe(image)}" alt="">`
          : `<span>${label}</span>`}</span>`;
      }).join("")}
        </span>
      `;
    }
    return `<span class="sc-offer-icon" aria-hidden="true">${offerIconSvg(offer.type)}</span>`;
  };

  const buildOfferRows = (steps = []) => {
    const rows = [];
    const seen = new Set();
    const pushRow = (row) => {
      if (!row?.key) return;
      const key = String(row.identity || row.key).toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      rows.push(row);
    };

    (Array.isArray(CODE_DISCOUNT_RULES) ? CODE_DISCOUNT_RULES : []).forEach((rule, index) => {
      const code = getDiscountRuleCode(rule) || "";
      if (!code) return;
      const applied = isCodeDiscountRuleApplied(rule);
      pushRow({
        key: `code:${code}:${getRuleKey(rule, "code") || index}`,
        type: "code",
        title: getOfferRuleTitle("code", rule, "Discount Code"),
        subtitle: getOfferRuleSubtitle("code", rule, "Apply this discount code"),
        code,
        action: applied ? "Applied" : "Apply Code",
        applied,
        rule,
      });
    });

    const seenBxgy = new Set();
    [...(Array.isArray(BXGY_RULES) ? BXGY_RULES : []), ...(Array.isArray(BUYXGETY_RULES) ? BUYXGETY_RULES : [])]
      .forEach((rule, index) => {
        const key = String(rule?.id || rule?.buyxgetyId || rule?.campaignName || index);
        if (seenBxgy.has(key)) return;
        seenBxgy.add(key);
        const x = Number(rule?.xQty ?? rule?.x_qty ?? rule?.x ?? rule?.buyQty ?? rule?.buy_qty ?? rule?.buy);
        const y = Number(rule?.yQty ?? rule?.y_qty ?? rule?.y ?? rule?.getQty ?? rule?.get_qty ?? rule?.get);
        const fallback = Number.isFinite(x) && x > 0 && Number.isFinite(y) && y > 0
          ? `Buy ${x} and get ${y} free`
          : "Buy something and get something";
        const ruleKey = getRuleKey(rule, "bxgy");
        pushRow({
          key: `bxgy:${ruleKey || key}`,
          identity: `bxgy:${ruleKey || key}`,
          ruleKey,
          type: "bxgy",
          title: getOfferRuleTitle("bxgy", rule, "Buy X Get Y Discount"),
          subtitle: getOfferRuleSubtitle("bxgy", rule, fallback),
          action: "Show Gifts",
          goalMet: isRewardOfferGoalMet("bxgy", rule),
          rule,
          thumbs: getOfferProductThumbs("bxgy", rule),
        });
      });

    (Array.isArray(steps) ? steps : []).forEach((step, index) => {
      if (!step?.rule) return;
      const type = String(step.type || "").toLowerCase();
      const ruleKey = getRuleKey(step.rule, type || "rule");
      const identityType = type === "buyxgety" ? "bxgy" : type;
      const stepDone = isProgressStepDone(step, getCartOriginalSubtotalCents());
      const offerTitleTemplate = trimToNull(
        stepDone ? step.rule?.offerTitleAfter : step.rule?.offerTitleBefore
      );
      const offerSubtitleTemplate = trimToNull(
        stepDone ? step.rule?.offerSubtitleAfter : step.rule?.offerSubtitleBefore
      );
      const subtotalRupees = getCartOriginalSubtotalCents() / priceDivisor(CART?.currency);
      const dynamicOfferTitle = offerTitleTemplate
        ? replaceProgressText({
          text: offerTitleTemplate,
          type,
          rule: step.rule,
          subtotalRupees,
          useRemainingForGoal: !stepDone,
        })
        : "";
      const dynamicOfferSubtitle = offerSubtitleTemplate
        ? replaceProgressText({
          text: offerSubtitleTemplate,
          type,
          rule: step.rule,
          subtotalRupees,
          useRemainingForGoal: !stepDone,
        })
        : "";
      pushRow({
        key: `step:${type}:${ruleKey || index}`,
        identity: `${identityType}:${ruleKey || index}`,
        ruleKey,
        type,
        title: trimToNull(dynamicOfferTitle) || getOfferStepTitle(step),
        subtitle: trimToNull(dynamicOfferSubtitle) || (
          stepDone
            ? trimToNull(step.progressTextAfter) || getOfferRuleSubtitle(type, step.rule, step.title || "Reward available in this order")
            : trimToNull(step.progressTextBefore) || getOfferRuleSubtitle(type, step.rule, step.title || "Reward available in this order")
        ),
        action: type === "free" || type === "bxgy" || type === "buyxgety" ? "Show Gifts" : "",
        goalMet: type === "free" || type === "bxgy" || type === "buyxgety" ? isRewardOfferGoalMet(type, step.rule) : true,
        rule: step.rule,
        slot: step.slot,
        thumbs: getOfferProductThumbs(type, step.rule),
      });
    });

    const shippingList = getProxyArray(PROXY, ["shippingRules", "shippingRule", "shippingrule"]);
    (Array.isArray(shippingList) ? shippingList : []).forEach((rule, index) => {
      if (!isRuleEnabled(rule)) return;
      const ruleKey = getRuleKey(rule, "shipping");
      pushRow({
        key: `shipping:${ruleKey || index}`,
        identity: `shipping:${ruleKey || index}`,
        ruleKey,
        type: "shipping",
        title: getOfferRuleTitle("shipping", rule, "Free Shipping"),
        subtitle: getOfferRuleSubtitle("shipping", rule, "Add more to get free shipping on this order"),
        action: "",
        rule,
      });
    });

    const discountList = getProxyArray(PROXY, ["discountRules", "discountRule", "discountrule"]);
    (Array.isArray(discountList) ? discountList : []).forEach((rule, index) => {
      if (!isRuleEnabled(rule)) return;
      const ruleType = String(rule?.type ?? rule?.ruleType ?? "").trim().toLowerCase();
      const hasBxgy =
        trimToNull(rule?.beforeOfferUnlockMessage) ||
        trimToNull(rule?.afterOfferUnlockMessage) ||
        Number(rule?.xQty ?? rule?.x ?? 0) > 0 ||
        Number(rule?.yQty ?? rule?.y ?? 0) > 0;
      if (ruleType === "code" || hasBxgy) return;
      const ruleKey = getRuleKey(rule, "discount");
      pushRow({
        key: `discount:${ruleKey || index}`,
        identity: `discount:${ruleKey || index}`,
        ruleKey,
        type: "discount",
        title: getOfferRuleTitle("discount", rule, "Order Discount"),
        subtitle: getOfferRuleSubtitle("discount", rule, "Add more to get a discount on this order"),
        action: "",
        rule,
      });
    });

    const freeList = getProxyArray(PROXY, ["freeGiftRules", "freeGiftRule", "freegiftrule"]);
    (Array.isArray(freeList) ? freeList : []).forEach((rule, index) => {
      if (!isRuleEnabled(rule)) return;
      const ruleKey = getRuleKey(rule, "free");
      pushRow({
        key: `free:${ruleKey || index}`,
        identity: `free:${ruleKey || index}`,
        ruleKey,
        type: "free",
        title: getOfferRuleTitle("free", rule, "Free Gift"),
        subtitle: getOfferRuleSubtitle("free", rule, "Add more to get Free Gift with this order"),
        action: "Show Gifts",
        goalMet: isRewardOfferGoalMet("free", rule),
        rule,
        thumbs: getOfferProductThumbs("free", rule),
      });
    });

    return rows.sort((a, b) => {
      const priorityDiff = Number(b?.rule?.priority || 0) - Number(a?.rule?.priority || 0);
      if (priorityDiff) return priorityDiff;
      const bUpdated = new Date(b?.rule?.updatedAt || b?.rule?.updated_at || 0).getTime() || 0;
      const aUpdated = new Date(a?.rule?.updatedAt || a?.rule?.updated_at || 0).getTime() || 0;
      if (bUpdated !== aUpdated) return bUpdated - aUpdated;
      return Number(b?.rule?.id || 0) - Number(a?.rule?.id || 0);
    });
  };

  const renderOffersPanel = (steps = []) => {
    if (!offersPanel) return;
    const rows = buildOfferRows(steps);
    drawer.__sc_offerRows = rows;
    if (!rows.length) {
      offersPanel.innerHTML = `<div class="sc-offers-empty">No offers configured yet.</div>`;
      return;
    }

    offersPanel.innerHTML = rows.map((offer, index) => {
      const actionHtml = offer.type === "code"
        ? `<span class="sc-offer-codebox">
            <button class="sc-offer-code-copy" type="button" data-offer-code-copy="${safe(offer.code)}" aria-label="Copy discount code">
              <span class="sc-offer-code">${safe(offer.code)}</span>
              <span class="sc-offer-copy-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M8 8h10v12H8V8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                  <path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </span>
              <span class="sc-offer-copied-text">Copied</span>
            </button>
            <button class="sc-offer-code-apply" type="button" data-offer-code-apply="${safe(offer.code)}"${offer.applied ? " disabled" : ""}>${safe(offer.action || "Apply Code")}</button>
          </span>`
        : offer.action
          ? `<button class="sc-offer-action" type="button" data-offer-action="${index}">${safe(offer.action)}</button>`
          : "";
      return `
        <div class="sc-offer-row">
          ${renderOfferVisual(offer)}
          <span class="sc-offer-copy">
            <p class="sc-offer-title">${safe(offer.title)}</p>
            <p class="sc-offer-subtitle">${safe(offer.subtitle)}</p>
          </span>
          ${actionHtml}
        </div>
      `;
    }).join("");
  };

  const setDrawerTab = (tab) => {
    ACTIVE_DRAWER_TAB = tab === "offers" && OFFER_TABS_ENABLED ? "offers" : "cart";
    const isOffers = ACTIVE_DRAWER_TAB === "offers";
    drawer.classList.toggle("sc-offers-active", isOffers);
    const cartContent = drawer.querySelector(".sc-progress");
    const items = drawer.querySelector(".sc-items");
    const footerRow = drawer.querySelector(".sc-footer-row");
    const footerMilestones = drawer.querySelector("[data-footer-milestones]");
    if (cartContent) cartContent.hidden = isOffers;
    if (items) items.hidden = isOffers;
    if (offersPanel) offersPanel.hidden = !isOffers;
    if (footerRow) footerRow.hidden = isOffers;
    if (footerMilestones) footerMilestones.hidden = isOffers || !footerMilestones.innerHTML.trim();
    drawer.querySelectorAll("[data-drawer-tab]").forEach((button) => {
      const selected = button.getAttribute("data-drawer-tab") === ACTIVE_DRAWER_TAB;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    const title = drawer.querySelector(".sc-title");
    const count = drawer.querySelector("[data-cart-title-count]");
    if (title) {
      title.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) node.textContent = isOffers ? "Offers " : "Your Cart ";
      });
      if (count) count.hidden = isOffers;
    }
  };

  const applyStaticFrontendCartDesign = () => {
    drawer.classList.add("sc-static-design");
    const style = PROXY?.styleSettings || {};
    const upsell = PROXY?.upsellSettings || {};
    OFFER_TABS_ENABLED = style?.offerButtonEnabled !== false && style?.offerButtonEnabled !== 0;
    DISCOUNT_PANEL_STYLE_ENABLED = style?.discountCodeApply === true || style?.discountCodeApply === 1;
    const r = document.documentElement.style;

    const baseFontSize = Math.max(10, Number(style?.base) || 16);
    const headingScaleValue = Math.max(1, Number(style?.headingScale) || 1.25);
    const radius = Math.max(0, Number(style?.radius) || 10);
    const cardBg = pickColor(style, ["bg"], "#ffffff");
    const shellBg = pickColor(
      style,
      ["cartDrawerBackground", "cartDrawerBg", "drawerTopBg"],
      "#f4f4f4"
    );
    const text = pickColor(
      style,
      ["cartDrawerTextColor", "textColor"],
      "#102864"
    );
    const headerText = pickColor(
      style,
      ["cartDrawerHeaderColor", "headerColor"],
      "#ffffff"
    );
    const border = pickColor(style, ["borderColor", "border"], "#e5e7eb");
    const muted = pickColor(style, ["muted", "mutedColor"], "#6f7a8a");
    const progressColor = pickColor(style, ["progress"], "#a93dea");
    const buttonBg = pickColor(style, ["buttonColor"], "#a93dea");
    const buttonText = pickColor(style, ["buttonLabelColor"], "#ffffff");
    const iconColor = pickColor(style, ["iconColor"], text);
    const mode = String(style?.cartDrawerBackgroundMode || "gradient").toLowerCase();
    const gradientStart = pickColor(style, ["cartDrawerGradientStart"], "#ff3a2d");
    const gradientEnd = pickColor(style, ["cartDrawerGradientEnd"], "#f3dacd");
    const drawerImage = trimToNull(style?.cartDrawerImage);
    const headerBg = mode === "gradient"
      ? `linear-gradient(135deg, ${gradientStart} 0%, ${progressColor} 46%, ${gradientEnd} 100%)`
      : mode === "image" && drawerImage
        ? `linear-gradient(rgba(0,0,0,.18), rgba(0,0,0,.18)), ${buildCssUrl(drawerImage)}`
        : shellBg;

    const upsellBg = pickColor(upsell, ["backgroundColor"], cardBg);
    const upsellText = pickColor(upsell, ["textColor"], text);
    const upsellBorder = pickColor(upsell, ["borderColor"], border);
    const upsellButtonBg = pickColor(upsell, ["buttonColor"], buttonBg);
    const upsellButtonText = pickColor(upsell, ["buttonTextColor"], buttonText);
    const upsellMuted = pickColor(upsell, ["arrowColor"], muted);

    r.setProperty("--sc-font", style?.font || "Inter, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif");
    r.setProperty("--sc-base-font-size", `${baseFontSize}px`);
    r.setProperty("--sc-heading-scale", `${headingScaleValue}`);
    r.setProperty("--sc-heading-font-size", `${Math.max(14, Math.round(baseFontSize * headingScaleValue))}px`);
    r.setProperty("--sc-button-font-size", `${baseFontSize}px`);
    r.setProperty("--sc-small-font-size", `${Math.max(10, baseFontSize - 3)}px`);
    r.setProperty("--sc-static-shell-bg", shellBg);
    r.setProperty("--sc-static-header-bg", headerBg);
    r.setProperty("--sc-static-header-text", headerText);
    r.setProperty("--sc-static-card-bg", cardBg);
    r.setProperty("--sc-static-text", text);
    r.setProperty("--sc-static-muted", muted);
    r.setProperty("--sc-static-border", border);
    r.setProperty("--sc-static-progress", progressColor);
    r.setProperty("--sc-static-progress-bg", `${progressColor}22`);
    r.setProperty("--sc-static-progress-text", pickColor(style, ["textColor"], "#56669d"));
    r.setProperty("--sc-static-button-bg", buttonBg);
    r.setProperty("--sc-static-button-text", buttonText);
    r.setProperty("--sc-static-icon-bg", iconColor);
    r.setProperty("--sc-static-image-bg", `${border}66`);
    r.setProperty("--sc-static-radius", `${radius}px`);
    r.setProperty("--sc-static-title-size", `${Math.max(18, Math.round(baseFontSize * headingScaleValue + 4))}px`);
    r.setProperty("--sc-static-upsell-bg", upsellBg);
    r.setProperty("--sc-static-upsell-text", upsellText);
    r.setProperty("--sc-static-upsell-muted", upsellMuted);
    r.setProperty("--sc-static-upsell-border", upsellBorder);
    r.setProperty("--sc-static-upsell-button-bg", upsellButtonBg);
    r.setProperty("--sc-static-upsell-button-text", upsellButtonText);

    r.setProperty("--sc-drawer-bg", shellBg);
    r.setProperty("--sc-drawer-text-color", text);
    r.setProperty("--sc-drawer-header-color", headerText);
    r.setProperty("--sc-border", border);
    r.setProperty("--sc-muted", muted);
    r.setProperty("--sc-progress", progressColor);
    r.setProperty("--sc-progress-bg", cardBg);
    r.setProperty("--sc-progress-text", pickColor(style, ["textColor"], "#56669d"));
    r.setProperty("--sc-checkout-bg", buttonBg);
    r.setProperty("--sc-checkout-text", buttonText);
    r.setProperty("--sc-footer-bg", shellBg);
    r.setProperty("--sc-icon-color", iconColor);
    r.setProperty("--sc-radius", `${radius}px`);
    r.setProperty("--sc-btn-radius", `${Math.max(4, radius - 3)}px`);
    r.setProperty("--sc-input-bg", cardBg);
    r.setProperty("--sc-input-border", border);
    r.setProperty("--sc-input-text", muted);
    r.setProperty("--sc-input-placeholder", muted);
  };

  const renderStaticProgress = () => {
    const label = $(".sc-label");
    const milestone = $(".sc-milestone");
    const legends = $(".sc-legends");
    const progressWrap = $(".sc-progress");
    if (progressWrap) progressWrap.style.removeProperty("display");
    if (label) label.textContent = "Add INR 500 more to get Free Shipping on this order";
    if (milestone) {
      milestone.innerHTML = `
        <div class="sc-static-progress-track">
          <div class="sc-static-progress-line"></div>
          <div class="sc-static-progress-fill"></div>
          <div class="sc-static-step"><span>▣</span>Free Shipping!</div>
          <div class="sc-static-step"><span>▣</span>20% Discount</div>
          <div class="sc-static-step"><span>▣</span>Free Product!</div>
        </div>
      `;
    }
    if (legends) legends.innerHTML = "";
  };

  const getStaticCartProduct = () => {
    const first = Array.isArray(CART?.items) ? CART.items[0] : null;
    return {
      line: first ? 1 : null,
      title: trimToNull(first?.product_title) || "Antique Drawers",
      image: trimToNull(first?.image) || "/cdn/shop/files/antique-drawers.jpg",
      qty: Math.max(1, Number(first?.quantity) || 2),
      compare: "INR 600",
      price: "INR 500",
      url: trimToNull(first?.url) || "",
    };
  };

  const renderStaticCartBody = () => {
    const itemsWrap = $(".sc-items-list");
    if (!itemsWrap) return;
    const upsell = PROXY?.upsellSettings || {};
    const upsellTitle = trimToNull(upsell?.sectionTitle) || "You may also like...";
    const upsellButtonText = trimToNull(upsell?.buttonText) || "Add";
    const product = getStaticCartProduct();
    const imageHtml = product.image
      ? `<img src="${safe(product.image)}" alt="${safe(product.title)}" loading="lazy">`
      : "";
    const titleHtml = product.url
      ? `<a href="${safe(product.url)}">${safe(product.title)}</a>`
      : safe(product.title);
    itemsWrap.innerHTML = `
      <div class="sc-static-cart-row" ${product.line ? `data-line="${product.line}"` : ""}>
        <div class="sc-static-main-img">${imageHtml}</div>
        <div>
          <p class="sc-static-product-title">${titleHtml}</p>
          <div class="sc-static-qty">
            <button type="button" ${product.line ? `data-static-qty="dec"` : ""} aria-label="Decrease">-</button>
            <strong>${safe(product.qty)}</strong>
            <button type="button" ${product.line ? `data-static-qty="inc"` : ""} aria-label="Increase">+</button>
          </div>
        </div>
        <div class="sc-static-pricebox">
          <span class="sc-static-compare">${safe(product.compare)}</span>
          <span>${safe(product.price)}</span>
        </div>
        <button class="sc-static-remove" type="button" ${product.line ? `data-static-remove="${product.line}"` : ""} aria-label="Remove">×</button>
      </div>
      <div class="sc-static-upsell-block">
        <p class="sc-static-upsell-title">${safe(upsellTitle)}</p>
        <div class="sc-static-upsell-row">
          <div class="sc-static-upsell-img"></div>
          <div>
            <p class="sc-static-upsell-name">Bedside Table</p>
            <div class="sc-static-upsell-price"><s>INR 85</s> INR 69.99</div>
          </div>
          <button class="sc-static-add" type="button">${safe(upsellButtonText)}</button>
        </div>
      </div>
    `;
  };

  const renderStaticFooter = () => {
    const style = PROXY?.styleSettings || {};
    const subtotalEl = drawer.querySelector("[data-subtotal]");
    if (subtotalEl) subtotalEl.textContent = "INR 500";
    const checkoutLabelEl = drawer.querySelector(".sc-checkout-label");
    if (checkoutLabelEl) checkoutLabelEl.textContent = trimToNull(style?.checkoutButtonText) || "Checkout";
    const footerEl = drawer.querySelector(".sc-footer");
    if (footerEl) footerEl.hidden = false;
    const checkoutButton = drawer.querySelector("[data-checkout]");
    if (checkoutButton) checkoutButton.hidden = false;
    if (offerTabs) offerTabs.hidden = !OFFER_TABS_ENABLED;
    if (!OFFER_TABS_ENABLED && ACTIVE_DRAWER_TAB === "offers") ACTIVE_DRAWER_TAB = "cart";
    updateDiscountPanelVisibility({ isEmpty: false });
    if (discountInput) {
      discountInput.placeholder = "Apply Discount Code";
      discountInput.value = "";
    }
  };

  const renderStaticOffersPanel = () => {
    if (!offersPanel) return;
    offersPanel.innerHTML = `
      <div class="sc-offer-row">
        <span class="sc-offer-icon" aria-hidden="true">${offerIconSvg("code")}</span>
        <span class="sc-offer-copy">
          <p class="sc-offer-title">Discount Code</p>
          <p class="sc-offer-subtitle">Apply this discount code</p>
        </span>
        <span class="sc-offer-codebox">
          <button class="sc-offer-code-copy" type="button" data-offer-code-copy="smart123" aria-label="Copy discount code">
            <span class="sc-offer-code">smart123</span>
            <span class="sc-offer-copy-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M8 8h10v12H8V8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </span>
            <span class="sc-offer-copied-text">Copied</span>
          </button>
          <button class="sc-offer-code-apply" type="button" data-offer-code-apply="">Apply Code</button>
        </span>
      </div>
      <div class="sc-offer-row">
        <span class="sc-offer-icon" aria-hidden="true">${offerIconSvg("bxgy")}</span>
        <span class="sc-offer-copy">
          <p class="sc-offer-title">Buy X Get Y Discount</p>
          <p class="sc-offer-subtitle">Buy something and get something</p>
        </span>
        <button class="sc-offer-action" type="button">Show Gifts</button>
      </div>
      <div class="sc-offer-row">
        <span class="sc-offer-icon" aria-hidden="true">${offerIconSvg("shipping")}</span>
        <span class="sc-offer-copy">
          <p class="sc-offer-title">Free Shipping</p>
          <p class="sc-offer-subtitle">Add INR 500 more to get free shipping on this order</p>
        </span>
      </div>
      <div class="sc-offer-row">
        <span class="sc-offer-icon" aria-hidden="true">${offerIconSvg("discount")}</span>
        <span class="sc-offer-copy">
          <p class="sc-offer-title">20% Discount!</p>
          <p class="sc-offer-subtitle">Add INR 1,000 more to get a 20% discount on this order</p>
        </span>
      </div>
      <div class="sc-offer-row">
        <span class="sc-offer-icon" aria-hidden="true">${offerIconSvg("free")}</span>
        <span class="sc-offer-copy">
          <p class="sc-offer-title">Free Gift Products</p>
          <p class="sc-offer-subtitle">Add INR 1,050 more to get Free Gift Products with this order</p>
        </span>
        <button class="sc-offer-action" type="button">Show Gifts</button>
      </div>
    `;
  };

  const renderStaticFrontendCart = () => {
    applyStaticFrontendCartDesign();
    renderStaticProgress();
    renderStaticCartBody();
    renderStaticFooter();
    renderStaticOffersPanel();
    setAnnouncementMessages([]);
    refreshCartIconMarkup();
    const itemCount = Math.max(0, Number(CART?.item_count || 0));
    syncOpenButtonBadge(itemCount);
    drawer.classList.remove("sc-empty-state", "sc-loading-items", "sc-refreshing");
    setDrawerTab(ACTIVE_DRAWER_TAB);
    LAST_CART_SIG = getCartSignature(CART);
  };

  const getLineItemMetaLines = (item) => {
    const lines = [];

    const selectedOptions = Array.isArray(item?.selected_options)
      ? item.selected_options
      : [];
    selectedOptions.forEach((opt) => {
      const name = trimToNull(opt?.name);
      const value = trimToNull(opt?.value);
      if (!name || !value) return;
      if (value.toLowerCase() === "default title") return;
      lines.push(`${name}: ${value}`);
    });

    const optionsWithValues = Array.isArray(item?.options_with_values)
      ? item.options_with_values
      : [];
    optionsWithValues.forEach((opt) => {
      const name = trimToNull(opt?.name);
      const value = trimToNull(opt?.value);
      if (!name || !value) return;
      if (value.toLowerCase() === "default title") return;
      lines.push(`${name}: ${value}`);
    });

    if (!lines.length) {
      const variantOptions = Array.isArray(item?.variant_options)
        ? item.variant_options
        : [];
      const productOptions = Array.isArray(item?.product_options)
        ? item.product_options
        : [];
      variantOptions.forEach((val, idx) => {
        const value = trimToNull(val);
        if (!value || value.toLowerCase() === "default title") return;
        const name = trimToNull(productOptions[idx]) || `Option ${idx + 1}`;
        lines.push(`${name}: ${value}`);
      });
    }

    if (!lines.length) {
      const variantTitle = trimToNull(item?.variant_title);
      if (variantTitle && variantTitle.toLowerCase() !== "default title") {
        variantTitle
          .split("/")
          .map((x) => trimToNull(x))
          .filter(Boolean)
          .forEach((x, idx) => {
            lines.push(`Option ${idx + 1}: ${String(x)}`);
          });
      }
    }

    const sellingPlan =
      trimToNull(item?.selling_plan_allocation?.selling_plan?.name) ||
      trimToNull(item?.selling_plan_allocation?.name);
    if (sellingPlan) lines.push(sellingPlan);

    const props = item?.properties || {};
    Object.entries(props).forEach(([key, value]) => {
      const k = trimToNull(key);
      const v = trimToNull(value);
      if (!k || !v) return;
      if (k.startsWith("_")) return;
      lines.push(`${k}: ${v}`);
    });

    const out = [];
    const seen = new Set();
    lines.forEach((line) => {
      const t = trimToNull(line);
      if (!t) return;
      const key = t.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(t);
    });

    return out.slice(0, 3);
  };

  const getFooterMilestoneTag = (type, rule) => {
    if (type === "shipping") return "FREE SHIPPING";
    if (type === "free") return "FREE PRODUCT";
    if (type === "discount") {
      const value = trimToNull(rule?.value ?? rule?.discountValue ?? rule?.discount_value ?? "");
      if (!value) return "ORDER OFF";
      return /off\b/i.test(value) ? String(value).toUpperCase() : `${value}`;
    }
    if (type === "code") {
      const code = trimToNull(rule?.discountCode ?? rule?.discount_code ?? rule?.code ?? "");
      return code ? `CODE ${code}` : "CODE DISCOUNT";
    }
    if (type === "bxgy" || type === "buyxgety") {
      const x = Number(rule?.xQty ?? rule?.x_qty ?? rule?.x ?? rule?.buyQty ?? rule?.buy_qty ?? rule?.buy);
      const y = Number(rule?.yQty ?? rule?.y_qty ?? rule?.y ?? rule?.getQty ?? rule?.get_qty ?? rule?.get);
      if (Number.isFinite(x) && x > 0 && Number.isFinite(y) && y > 0) return `BUY ${x} GET ${y}`;
      return "BUY X GET Y";
    }
    return "UNLOCKED";
  };

  const getFooterDiscountBadgeLabel = (rule) => {
    const tokens = getDiscountValueTokens(rule);
    const raw = trimToNull(tokens?.value) || trimToNull(tokens?.valueWithOff) || "";
    if (!raw) return "";
    const value = String(raw).replace(/\s*off\b/gi, "").trim();
    if (!value) return "";
    return /^-/.test(value) ? value : `-${value}`;
  };

  const getDiscountTagLabel = (rule, kind) => {
    const rawVal = trimToNull(rule?.value ?? rule?.discountValue ?? rule?.discount_value ?? "");
    const typeHint = String(
      rule?.valueType ??
      rule?.discountType ??
      rule?.discount_type ??
      rule?.amountType ??
      rule?.rewardType ??
      rule?.reward_type ??
      ""
    )
      .trim()
      .toLowerCase();
    const num = Number(String(rawVal).replace(/[^0-9.]/g, ""));
    const isPercent =
      /%|percent|percentage|rate/.test(String(rawVal).toLowerCase()) ||
      /percent|percentage|rate/.test(typeHint) ||
      (!/fixed|flat|amount/.test(typeHint) && Number.isFinite(num) && num > 0 && num <= 100);
    const percentText =
      Number.isFinite(num) && num > 0 && isPercent ? `${num}% off` : "";
    const code = trimToNull(rule?.discountCode ?? rule?.discount_code ?? rule?.code ?? "");
    if (kind === "code") {
      if (code) return `${code}${percentText ? ` (${percentText})` : ""}`;
      return (
        trimToNull(rule?.codeCampaignName) ||
        (percentText ? `Code (${percentText})` : "Discount code")
      );
    }

    const campaign =
      trimToNull(rule?.campaignName) || trimToNull(rule?.cartStepName);
    if (campaign) return percentText ? `${campaign} (${percentText})` : campaign;

    if (rawVal) return /off\b/i.test(rawVal) ? `Auto ${rawVal}` : `Auto ${rawVal} off`;

    return percentText ? `Auto ${percentText}` : "Automatic discount";
  };

  const getDiscountRuleMeta = (rule, subtotalCents) => {
    const raw = trimToNull(rule?.value ?? rule?.discountValue ?? rule?.discount_value ?? "");
    if (!raw) return null;

    const cleaned = String(raw).replace(/[^0-9.]/g, "");
    const num = Number(cleaned);
    if (!Number.isFinite(num) || num <= 0) return null;

    const typeHint = String(
      rule?.discountType ?? rule?.valueType ?? rule?.amountType ?? rule?.discount_type ?? ""
    )
      .trim()
      .toLowerCase();
    const hasPercentToken =
      /%|percent|percentage/.test(String(raw).toLowerCase()) ||
      /percent|percentage|rate/.test(typeHint);
    const hasFixedToken = /fixed|flat|amount/.test(typeHint);
    const isPercent = hasPercentToken || (!hasFixedToken && num <= 100);

    const base = Math.max(0, Number(subtotalCents) || 0);
    const cents = isPercent ? Math.round((base * num) / 100) : Math.round(num * 100);
    const capped = Math.max(0, Math.min(cents, base));
    return { isPercent, cents: Math.max(0, cents), capped };
  };

  const parseDiscountRuleCents = (rule, subtotalCents) => {
    const meta = getDiscountRuleMeta(rule, subtotalCents);
    return meta ? meta.capped : null;
  };

  const resolveCodeDiscountCents = (rule, subtotalCents) => {
    const code = trimToNull(rule?.discountCode ?? rule?.discount_code ?? rule?.code ?? "");
    const fromCart = getCartDiscountCodeAmountCents(code);
    if (Number.isFinite(fromCart) && fromCart > 0) {
      return Math.min(fromCart, Math.max(0, Number(subtotalCents) || 0));
    }

    const fromRule = parseDiscountRuleCents(rule, subtotalCents);
    if (Number.isFinite(fromRule) && fromRule > 0) return fromRule;

    return null;
  };

  const formatDiscountAmount = (cents, currency) => {
    const formatted = formatMoney(cents, currency);
    return `-${String(formatted || "").replace(/^\s+/, "")}`;
  };

  const renderFooterMilestones = ({ steps, subtotalCents, currency }) => {
    const host = drawer.querySelector("[data-footer-milestones]");
    if (!host) return;

    const rows = [];

    // ✅ Shipping complete hoy tyare show
    const completedShippingStep = (Array.isArray(steps) ? steps : []).find((step) => {
      if (String(step?.type || "").toLowerCase() !== "shipping") return false;
      return isProgressStepDone(step, subtotalCents);
    });

    if (completedShippingStep) {
      rows.push({
        key: `shipping:${completedShippingStep?.rule?.id ?? completedShippingStep?.slot}`,
        label: "Shipping",
        amount: "Free",
      });
    }

    // ✅ Order Discount: goal complete thay tyare show
    const completedOrderDiscountSteps = (Array.isArray(steps) ? steps : []).filter((step) => {
      if (String(step?.type || "").toLowerCase() !== "discount") return false;
      if (!isProgressStepDone(step, subtotalCents)) return false;

      const ruleType = String(step?.rule?.type ?? step?.rule?.ruleType ?? "")
        .trim()
        .toLowerCase();

      // ✅ only real code type rule skip
      return ruleType !== "code";
    });

    completedOrderDiscountSteps.forEach((step) => {
      const discountCents = parseDiscountRuleCents(step?.rule, subtotalCents);

      if (Number.isFinite(discountCents) && discountCents > 0) {
        rows.push({
          key: `order:${step?.rule?.id ?? step?.title ?? step?.slot}`,
          label: "Order Discount",
          amount: formatDiscountAmount(discountCents, currency),
        });
      }
    });

    // ✅ Code Discount: code actually applied hoy tyare j show
    const appliedCode = findAppliedDiscountCodeRule();

    if (appliedCode?.rule && isDiscountAppliedInCart(appliedCode.code)) {
      const codeDiscountCents = resolveCodeDiscountCents(appliedCode.rule, subtotalCents);

      if (Number.isFinite(codeDiscountCents) && codeDiscountCents > 0) {
        rows.push({
          key: `code:${appliedCode.code}`,
          label: "Code Discount",
          amount: formatDiscountAmount(codeDiscountCents, currency),
        });
      }
    }

    const uniqueRows = [];
    const seen = new Set();

    rows.forEach((row) => {
      const key = trimToNull(row?.key);
      if (!key || seen.has(key)) return;
      seen.add(key);
      uniqueRows.push(row);
    });

    if (!uniqueRows.length) {
      host.hidden = true;
      host.innerHTML = "";
      return;
    }

    const rowsHtml = uniqueRows
      .map(
        (row) => `
        <div class="sc-foot-row">
          <p class="sc-foot-name">${safe(row.label || "")}</p>
          <span class="sc-foot-amt">${safe(row.amount || "")}</span>
        </div>
      `
      )
      .join("");

    host.hidden = false;
    host.innerHTML = `<div class="sc-footer-summary">${rowsHtml}</div>`;
  };

  function syncOpenButtonBadge(countRaw) {
    const count = Math.max(0, Number(countRaw) || 0);
    document.querySelectorAll("[data-smart-cartify-open]").forEach((btn) => {
      if (!(btn instanceof HTMLElement)) return;
      let badge = btn.querySelector(".sc-open-count");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "sc-open-count";
        btn.appendChild(badge);
      }
      badge.textContent = String(count);
      badge.hidden = count <= 0;
      btn.setAttribute("aria-label", count > 0 ? `Cart (${count})` : "Cart");
    });
  }

  /* =========================================================
   ✅ RENDER CART (unchanged, BuyXGetY item will now appear due to auto-add)
  ========================================================= */
  function renderCart() {
    const itemsWrap = $(".sc-items-list");
    if (!itemsWrap) return;

    const items = Array.isArray(CART?.items) ? CART.items : [];
    const stepsForFooter = buildSteps();
    renderOffersPanel(stepsForFooter);
    const currency = normalizeCurrencyCode();
    const checkoutLabelBase =
      trimToNull(PROXY?.styleSettings?.checkoutButtonText) || "Checkout";

    const subtotalEl = $("[data-subtotal]");
    const computedSubtotalCents = items.reduce((sum, it) => {
      const lineAmount = Number(it?.final_line_price) || 0;
      return sum + Math.max(0, lineAmount);
    }, 0);
    const baseSubtotalCents = Number.isFinite(Number(CART?.items_subtotal_price))
      ? Math.max(0, Number(CART.items_subtotal_price))
      : computedSubtotalCents;
    const rewardLineCents = items.reduce((sum, it) => {
      const props = it?.properties || {};
      const isFreeGift =
        String(props?.[FREE_GIFT_PROPERTY] || "").trim().toLowerCase() === "true";
      const isBxgyGift =
        String(props?.[BXGY_GIFT_PROPERTY] || "").trim().toLowerCase() === "true";
      if (!isFreeGift && !isBxgyGift) return sum;
      const lineAmount = Number(it?.final_line_price) || 0;
      return sum + Math.max(0, lineAmount);
    }, 0);
    const subtotalCents = Math.max(0, baseSubtotalCents - rewardLineCents);
    if (subtotalEl) subtotalEl.textContent = formatMoney(subtotalCents, currency);
    const appliedCodes = getAppliedDiscountCodes();
    const manualCode = trimToNull(scStore.get(MANUAL_DISCOUNT_CODE_KEY));
    const manualLower = manualCode ? manualCode.toLowerCase() : null;
    const hasManualAppliedCode =
      !!manualLower &&
      appliedCodes.some((c) => String(c).trim().toLowerCase() === manualLower);

    const completedAutoDiscountSteps = stepsForFooter.filter((step) => {
      if (String(step?.type || "").toLowerCase() !== "discount") return false;
      if (!isProgressStepDone(step, subtotalCents)) return false;
      const ruleType = String(step?.rule?.type ?? step?.rule?.ruleType ?? "").trim().toLowerCase();
      return ruleType !== "code";
    });

    const autoDiscountCents = completedAutoDiscountSteps.reduce((sum, step) => {
      const discountCents = parseDiscountRuleCents(step?.rule, subtotalCents);
      return Number.isFinite(discountCents) && discountCents > 0 ? sum + discountCents : sum;
    }, 0);

    const cartTotalDiscountRaw = Math.max(0, Number(CART?.total_discount || 0));
    let totalDiscountCents = autoDiscountCents + cartTotalDiscountRaw;

    const appliedCodeRuleForTotal = findAppliedDiscountCodeRule();
    if (appliedCodeRuleForTotal?.rule && cartTotalDiscountRaw <= 0) {
      const codeDiscountCents = resolveCodeDiscountCents(appliedCodeRuleForTotal.rule, subtotalCents);
      if (Number.isFinite(codeDiscountCents) && codeDiscountCents > 0) {
        totalDiscountCents += codeDiscountCents;
      }
    }

    const checkoutPayableCents = Math.max(0, subtotalCents - totalDiscountCents);
    const checkoutLabelEl = drawer.querySelector(".sc-checkout-label");
    if (checkoutLabelEl) {
      checkoutLabelEl.textContent = `${checkoutLabelBase} - ${formatMoney(
        checkoutPayableCents,
        currency
      )}`;
    }

    const itemCount = Math.max(0, Number(CART?.item_count || 0));
    const countEl = $("[data-count]");
    if (countEl) countEl.textContent = String(itemCount);
    const titleCountEl = drawer.querySelector("[data-cart-title-count]");
    if (titleCountEl) titleCountEl.textContent = `(${itemCount})`;
    syncOpenButtonBadge(itemCount);
    renderFooterMilestones({
      steps: stepsForFooter,
      subtotalCents,
      currency,
    });

    const checkoutButton = drawer.querySelector("[data-checkout]");
    const itemsFooter = drawer.querySelector(".sc-items-footer");
    const footerEl = drawer.querySelector(".sc-footer");
    const isEmpty = !items.length;
    updateDiscountPanelVisibility({ isEmpty });
    if (checkoutButton) checkoutButton.hidden = isEmpty;
    if (itemsFooter) itemsFooter.hidden = isEmpty;
    if (footerEl) footerEl.hidden = isEmpty && !OFFER_TABS_ENABLED;
    if (offerTabs) offerTabs.hidden = !OFFER_TABS_ENABLED;
    drawer.classList.toggle("sc-empty-state", isEmpty);
    setDrawerTab(ACTIVE_DRAWER_TAB);

    if (isEmpty) {
      itemsWrap.innerHTML = `<div class="sc-empty">
        <svg viewBox="0 0 255 255" fill="rgb(230,230,235)" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M13.6359 0C6.10501 0 0 6.10663 0 13.6395C0 21.1724 6.10501 27.2791 13.6359 27.2791H20.7503C28.3315 27.2791 34.7667 32.1872 37.0532 39H37.0444V148.047C37.0444 161.802 48.1927 172.953 61.9448 172.953H208.092C220.391 172.953 231.168 164.72 234.404 152.851L253.6 88.4363C260.387 63.5385 241.649 39 215.849 39H64.8815C62.1832 17.02 43.4539 0 20.7503 0H13.6359ZM116.139 227.5C116.139 242.688 103.588 255 88.1056 255C72.6231 255 60.072 242.688 60.072 227.5C60.072 212.312 72.6231 200 88.1056 200C103.588 200 116.139 212.312 116.139 227.5ZM186.724 255C201.93 255 214.257 242.688 214.257 227.5C214.257 212.312 201.93 200 186.724 200C171.518 200 159.191 212.312 159.191 227.5C159.191 242.688 171.518 255 186.724 255Z"></path>
        </svg>
        <div class="sc-empty-text">No items in the cart</div>
      </div>`;
      syncItemsLoading(drawer.classList.contains("sc-refreshing"));
      return;
    }

    const completedBuyXGetYStatuses = getBuyXGetYStatuses().filter((status) =>
      status?.complete && status?.rule
    );
    const isBuyXGetYQualifyingLine = (item) =>
      completedBuyXGetYStatuses.some((status) =>
        getEligibleBuyXGetYItems(status.rule, items).includes(item)
      );

    itemsWrap.innerHTML = items
      .map((it, idx) => {
        const line = idx + 1;
        const img = it.image ? `<img src="${it.image}" alt="${safe(it.product_title)}" loading="lazy">` : "";

        const qty = Number(it.quantity) || 0;
        const finalLine = Number(it?.final_line_price) || 0;

        const props = it.properties || {};
        const isFreeGift = String(props?.[FREE_GIFT_PROPERTY] || "").trim().toLowerCase() === "true";
        const isBxgyGift = String(props?.[BXGY_GIFT_PROPERTY] || "").trim().toLowerCase() === "true";
        const isReward = isFreeGift || isBxgyGift;

        const unitPrice = Number(it.price) || 0;
        const compareUnit = Number(it.compare_at_price) || 0;
        const compareLine = Math.max(0, compareUnit * qty);
        const rewardCompareCents = isReward
          ? [
            Number(it?.original_line_price),
            compareLine,
            unitPrice * qty,
          ].find((value) => Number.isFinite(value) && value > 0) || 0
          : 0;
        const hasCompare = isReward
          ? rewardCompareCents > 0
          : compareUnit > 0 && compareUnit > unitPrice;

        const showPrice = !isReward;
        const displayPrice = Math.max(
          0,
          isReward ? 0 : Number(it.final_line_price) ||
            Number(it.line_price) ||
            (unitPrice * qty) ||
            finalLine
        );
        const priceText = formatMoney(displayPrice, currency);
        const priceClass = `sc-price${displayPrice === 0 ? " sc-price-free" : ""}`;
        const freeTagText = isReward
          ? isFreeGift
            ? "Free"
            : "buyxgety"
          : "Free";
        const rewardBadge = isReward
          ? `<span class="sc-free-tag sc-free-tag-under sc-reward-line-badge">${safe(freeTagText)}</span>`
          : "";
        const bxgyLineBadge = !isReward && isBuyXGetYQualifyingLine(it)
          ? `<span class="sc-free-tag sc-free-tag-under sc-bxgy-line-badge"></span>`
          : "";

        const productUrl = trimToNull(it.url) || null;
        const nameHtml = productUrl ? `<a href="${safe(productUrl)}">${safe(it.product_title)}</a>` : `${safe(it.product_title)}`;
        const metaLines = getLineItemMetaLines(it);
        const metaHtml = metaLines.length
          ? `<div class="sc-meta">${metaLines
            .map((line) => `<p class="sc-meta-line">${safe(line)}</p>`)
            .join("")}</div>`
          : "";

        return `
          <div class="sc-item${isReward ? " sc-item-reward" : ""}" data-line="${line}">
            <div class="sc-img">${img}</div>

            <div class="sc-mid">
              <p class="sc-name" title="${safe(it.product_title)}">${nameHtml}</p>
              ${metaHtml}
              <div class="sc-mid-bottom">
                ${isReward
            ? rewardBadge
            : `<div class="sc-qty-stack">
                <div class="sc-qty">
                  <button type="button" data-qty="dec" aria-label="Decrease">-</button>
                  <input type="number" min="0" inputmode="numeric" value="${qty}" data-qty="input" />
                  <button type="button" data-qty="inc" aria-label="Increase">+</button>
                </div>
                ${bxgyLineBadge}
              </div>`}
                <div class="sc-pricebox">
                  ${hasCompare
            ? `<span class="sc-compare">${formatMoney(isReward ? rewardCompareCents : compareLine, currency)}</span>`
            : ``
          }
                  ${showPrice ? `<span class="${priceClass}">${priceText}</span>` : ``}
                </div>
              </div>
            </div>

            <button type="button" class="sc-remove-x" data-remove="1" aria-label="Remove">
              <span class="sc-remove-char" aria-hidden="true">&times;</span>
            </button>
          </div>
        `;
      })
      .join("");

    syncItemsLoading(drawer.classList.contains("sc-refreshing"));
    renderUpsellSection();
  }

  /* =========================================================
   ✅ REWARD POPUP + AUTO ADD SUPPORT
  ========================================================= */
  let rewardPopupCache = null;
  let rewardPopupTimer = null;

  const getFreeGiftDiscountId = (rule) =>
    trimToNull(
      rule?.freeProductDiscountID ??
      rule?.freeProductDiscountId ??
      rule?.free_product_discount_id ??
      rule?.minAmountFreeGiftDiscountId ??
      rule?.shopifyDiscountId ??
      null
    );

  const addRewardToCart = async ({ kind, rule, ruleKey, slot, variant, qty, markAutoAdded }) => {
    const variantToAdd = await resolveRewardVariantForAdd(rule, variant);
    const legacyId = getVariantLegacyId(variantToAdd);
    // Guard: legacyId must be a pure numeric string — GIDs or empty strings will 422 immediately
    if (!legacyId || !/^\d+$/.test(String(legacyId))) return false;

    const guardKey = kind === "free" ? slot || ruleKey : ruleKey;
    if (guardKey && cartHasRewardForKey(kind, guardKey)) return false;

    try {
      setProgressLoading(true);

      const body = new URLSearchParams();
      body.set("id", legacyId);
      body.set("quantity", String(Math.max(1, Number(qty || 1))));

      if (kind === "free") {
        body.set(`properties[${FREE_GIFT_PROPERTY}]`, "true");
        if (slot) body.set(`properties[${FREE_GIFT_RULE_PROPERTY}]`, String(slot));
        if (variantToAdd?.id) body.set(`properties[${FREE_GIFT_VARIANT_PROPERTY}]`, String(variantToAdd.id));
        const freeRuleKey = getRuleKey(rule, "free");
        if (freeRuleKey) body.set(`properties[${FREE_GIFT_RULE_KEY_PROPERTY}]`, freeRuleKey);
        const freeDiscountId = getFreeGiftDiscountId(rule);
        if (freeDiscountId) body.set(`properties[${FREE_GIFT_DISCOUNT_PROPERTY}]`, freeDiscountId);
      } else {
        body.set(`properties[${BXGY_GIFT_PROPERTY}]`, "true");
        body.set(`properties[${BXGY_GIFT_KIND_PROPERTY}]`, String(kind || "bxgy"));
        if (ruleKey) body.set(`properties[${BXGY_GIFT_RULE_PROPERTY}]`, String(ruleKey));
        if (variantToAdd?.id) body.set(`properties[${BXGY_GIFT_VARIANT_PROPERTY}]`, String(variantToAdd.id));
      }

      const res = await fetch("/cart/add.js", {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        body,
      });

      if (!res.ok) {
        // Read Shopify's error body so we know the real reason (out of stock, invalid, etc.)
        let shopifyMsg = "";
        try {
          const errBody = await res.json();
          shopifyMsg = errBody?.description || errBody?.message || JSON.stringify(errBody);
        } catch { /* non-JSON body — ignore */ }
        const err = new Error(shopifyMsg || "Reward add failed");
        err.httpStatus = res.status;
        throw err;
      }

      if (markAutoAdded && guardKey) scStore.set(keyAutoAdded(kind, guardKey), "1");

      invalidateCartCache();
      await refreshFromNetwork();
      return true;
    } catch (err) {
      err._httpStatus = err._httpStatus || err.httpStatus || 0;
      const st = Number(err._httpStatus);
      // 422 / 404 are expected (out of stock, deleted variant) — warn, not error
      if (st === 422 || st === 404) {
        console.warn(`[SmartCartify] reward not added (HTTP ${st}):`, err.message);
      } else {
        console.error("[SmartCartify] reward add failed:", err.message || err);
      }
      throw err;
    } finally {
      setProgressLoading(false);
    }
  };

  const closeRewardPopup = () => {
    if (!rewardPopupCache) return;
    if (rewardPopupTimer) {
      clearTimeout(rewardPopupTimer);
      rewardPopupTimer = null;
    }
    rewardPopupCache.overlay.classList.remove("open");
    rewardPopupCache.current = null;
    drawer.__sc_reward_popup_for = null;
  };

  const getVariantLegacyId = (variant) => {
    if (!variant) return null;
    const legacy = trimToNull(variant.legacyResourceId);
    if (legacy) return legacy;
    const gid = trimToNull(variant.id);
    if (!gid) return null;
    const match = gid.match(/\/(\d+)$/);
    return match ? match[1] : null;
  };

  const normalizeProductNumericId = (rawId) => {
    const raw = trimToNull(rawId);
    if (!raw) return null;
    if (/^\d+$/.test(raw)) return raw;
    if (/^gid:\/\/shopify\/Product\/\d+$/i.test(raw)) return gidToId(raw);
    return null;
  };

  const normalizeVariantGid = (rawId) => {
    const raw = trimToNull(rawId);
    if (!raw) return null;
    if (/^gid:\/\/shopify\/ProductVariant\/\d+$/i.test(raw)) return raw;
    if (/^\d+$/.test(raw)) return `gid://shopify/ProductVariant/${raw}`;
    return null;
  };

  const rewardVariantByProductCache = new Map();
  const resolveVariantFromProductId = async (rawProductId) => {
    const numericId = normalizeProductNumericId(rawProductId);
    const isHandleLookup = !numericId;
    const cacheKey = isHandleLookup ? `handle:${String(rawProductId)}` : String(numericId);

    if (rewardVariantByProductCache.has(cacheKey)) {
      return rewardVariantByProductCache.get(cacheKey);
    }

    try {
      let product = null;
      if (!isHandleLookup) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          const res = await fetch(
            `/products.json?ids=${encodeURIComponent(numericId)}&limit=1`,
            {
              headers: { Accept: "application/json" },
              credentials: "same-origin",
              signal: controller.signal
            }
          );
          clearTimeout(timeoutId);
          if (!res.ok) {
            console.warn(`[SmartCartify] product fetch failed: ${res.status} for ID ${numericId}`);
            return null;
          }
          const payload = await res.json();
          product = Array.isArray(payload?.products) ? payload.products[0] : null;
          if (!product) {
            console.warn(`[SmartCartify] product not found for ID ${numericId}`);
          }
        } catch (fetchErr) {
          if (fetchErr.name === "AbortError") {
            console.warn(`[SmartCartify] product fetch timeout for ID ${numericId}`);
          } else {
            console.warn(`[SmartCartify] product fetch error for ID ${numericId}:`, fetchErr.message);
          }
          return null;
        }
      } else {
        // Try resolving by handle (fallback for non-numeric IDs stored as handles)
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          const res2 = await fetch(`/products/${encodeURIComponent(rawProductId)}.js`, {
            headers: { Accept: "application/json" },
            credentials: "same-origin",
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (res2.ok) {
            const payload2 = await res2.json();
            // /products/{handle}.js returns product object directly
            product = payload2 || null;
          } else {
            console.warn(`[SmartCartify] product handle fetch failed: ${res2.status} for handle ${rawProductId}`);
          }
        } catch (e) {
          if (e.name === "AbortError") {
            console.warn(`[SmartCartify] product handle fetch timeout for ${rawProductId}`);
          } else {
            console.warn(`[SmartCartify] product handle fetch error for ${rawProductId}:`, e.message);
          }
        }
      }
      const variants = Array.isArray(product?.variants) ? product.variants : [];
      const firstVariant = variants[0] || null;
      const legacyId = trimToNull(firstVariant?.id);
      if (!legacyId) {
        // Product exists but has no variants — cache null so we don't hammer the API.
        rewardVariantByProductCache.set(cacheKey, null);
        return null;
      }

      const imageUrl =
        trimToNull(firstVariant?.featured_image?.src) ||
        trimToNull(firstVariant?.image?.src) ||
        (Array.isArray(product?.images) && trimToNull(product.images[0]?.src)) ||
        trimToNull(product?.image?.src) ||
        "";

      const resolved = {
        id: `gid://shopify/ProductVariant/${legacyId}`,
        legacyResourceId: String(legacyId),
        productId: numericId || null,
        image: imageUrl,
        title: trimToNull(firstVariant?.title) || "",
        price: firstVariant?.price,
        compareAtPrice: firstVariant?.compare_at_price,
        product: {
          title: trimToNull(product?.title) || "",
          image: imageUrl,
        },
      };

      rewardVariantByProductCache.set(cacheKey, resolved);
      return resolved;
    } catch (err) {
      console.error("[SmartCartify] product->variant resolve failed:", err);
      // Network error — do not cache so the next call can retry.
      return null;
    }
  };


  const firstGiftSkuProductId = (value) => {
    if (Array.isArray(value)) return normalizeResourceId(value[0]);
    if (value && typeof value === "object") {
      if (Array.isArray(value.products)) return normalizeResourceId(value.products[0]);
      if (Array.isArray(value.productIds)) return normalizeResourceId(value.productIds[0]);
      return normalizeResourceId(value);
    }
    const raw = trimToNull(value);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return normalizeResourceId(parsed[0]);
      if (Array.isArray(parsed?.products)) return normalizeResourceId(parsed.products[0]);
      if (Array.isArray(parsed?.productIds)) return normalizeResourceId(parsed.productIds[0]);
      return normalizeResourceId(parsed);
    } catch (_) { }
    return normalizeResourceId(raw);
  };

  const resolveRewardVariantForAdd = async (rule, variant) => {
    if (getVariantLegacyId(variant)) return variant;
    const giftType = String(rule?.giftType || "").toLowerCase();
    const giftSkuRaw = firstGiftSkuProductId(rule?.giftSku);
    const productIdCandidate =
      trimToNull(variant?.productId) ||
      trimToNull(rule?.bonusProductId) ||
      trimToNull(rule?.bonus) ||
      (giftType === "specific" && giftSkuRaw
        ? normalizeProductNumericId(giftSkuRaw) || gidToId(giftSkuRaw) || giftSkuRaw
        : null) ||
      null;
    if (!productIdCandidate) return variant;
    const resolved = await resolveVariantFromProductId(productIdCandidate);
    return resolved || variant;
  };

  const getRewardVariantFromRule = (kind, rule) => {
    const fromBonusId = () => {
      const raw = trimToNull(rule?.bonusProductId ?? rule?.bonus ?? null);
      if (!raw) return null;
      const variantGid = normalizeVariantGid(raw);
      if (variantGid) {
        return {
          id: variantGid,
          legacyResourceId: gidToId(variantGid),
          productId: normalizeProductNumericId(raw),
        };
      }
      const productId = normalizeProductNumericId(raw);
      return productId ? { productId } : null;
    };

    if (kind === "free") {
      return (
        rule?.bonusProductVariant ||
        rule?.freeProductVariant ||
        rule?.giftProductVariant ||
        rule?.rewardVariant ||
        fromBonusId() ||
        null
      );
    }

    // Standard variant fields (FreeGiftRule / legacy BXGY formats)
    const fromStandard =
      rule?.bonusProductVariant ||
      rule?.yProductVariant ||
      rule?.getProductVariant ||
      rule?.giftProductVariant ||
      rule?.freeProductVariant ||
      rule?.rewardVariant ||
      rule?.variant ||
      rule?.productVariant ||
      rule?.freeVariant ||
      fromBonusId() ||
      null;
    if (fromStandard) return fromStandard;

    // BxgyRule: giftType "specific" — giftSku stores the reward product ID
    const giftType = String(rule?.giftType || "same").toLowerCase();
    const giftSkuRaw = firstGiftSkuProductId(rule?.giftSku);
    if (giftType === "specific" && giftSkuRaw) {
      const productId = normalizeProductNumericId(giftSkuRaw) || gidToId(giftSkuRaw) || giftSkuRaw;
      return { productId: String(productId) };
    }

    // BxgyRule: giftType "same" — gift is the same product that was purchased
    const items = Array.isArray(CART?.items) ? CART.items : [];
    const scope = normalizeBxgyScope(rule?.scope || "store");
    let qualifyingItem = null;

    if (scope === "product") {
      // Parse appliesTo to find which products qualify
      const appliesToRaw = rule?.appliesTo;
      const appliesToObj = appliesToRaw && typeof appliesToRaw === "object"
        ? appliesToRaw
        : (() => { try { return JSON.parse(appliesToRaw || "{}"); } catch { return {}; } })();
      const applyProducts = Array.isArray(appliesToObj?.products) ? appliesToObj.products : [];
      let fallbackIds = [];
      try { const p = JSON.parse(rule?.appliesProductIds || "[]"); fallbackIds = Array.isArray(p) ? p : []; } catch { }
      const allProductRefs = [...applyProducts, ...fallbackIds];
      const allowed = new Set(
        allProductRefs.map((p) => gidToId(p) || (p ? String(p) : null)).filter(Boolean)
      );
      qualifyingItem = items.find((it) => {
        const props = it?.properties || {};
        const isReward =
          String(props?.[BXGY_GIFT_PROPERTY] || "").toLowerCase() === "true" ||
          String(props?.[FREE_GIFT_PROPERTY] || "").toLowerCase() === "true";
        return !isReward && (allowed.size === 0 || allowed.has(String(it?.product_id || "")));
      });
    } else {
      // Store / collection scope: any non-reward item qualifies
      qualifyingItem = items.find((it) => {
        const props = it?.properties || {};
        return (
          String(props?.[BXGY_GIFT_PROPERTY] || "").toLowerCase() !== "true" &&
          String(props?.[FREE_GIFT_PROPERTY] || "").toLowerCase() !== "true"
        );
      });
    }

    if (qualifyingItem?.variant_id) {
      return {
        id: `gid://shopify/ProductVariant/${qualifyingItem.variant_id}`,
        legacyResourceId: String(qualifyingItem.variant_id),
        productId: String(qualifyingItem.product_id || ""),
      };
    }

    return null;
  };

  const getRewardQtyFromRule = (kind, rule) => {
    const raw =
      rule?.qty ??
      rule?.quantity ??
      rule?.freeQty ??
      rule?.free_qty ??
      rule?.yQty ??
      rule?.y_qty ??
      rule?.getQty ??
      rule?.get_qty ??
      1;
    const n = Number(raw);
    return Math.max(1, Number.isFinite(n) ? n : 1);
  };

  const ensureRewardPopup = () => {
    if (rewardPopupCache) return rewardPopupCache;

    const overlayEl = document.createElement("div");
    overlayEl.className = "sc-freegift-overlay";
    overlayEl.innerHTML = `
      <div class="sc-freegift-card">
        <div class="sc-freegift-header">
          <div class="sc-freegift-icon">${ICONS.gift || "🎁"}</div>
          <div class="sc-freegift-heading">
            <p class="sc-freegift-title-text">Reward unlocked</p>
            <p class="sc-freegift-subtext"></p>
          </div>
        </div>
        <div class="sc-freegift-content" hidden>
          <div class="sc-freegift-image-wrap">
            <img class="sc-freegift-image" alt="Reward product" />
          </div>
          <div>
            <p class="sc-freegift-product-title"></p>
            <p class="sc-freegift-product-sub"></p>
          </div>
        </div>
        <div class="sc-freegift-list">
          <div class="sc-freegift-options"></div>
          <p class="sc-freegift-message">Select a free gift to add it to your cart.</p>
          <button class="sc-freegift-add" type="button">Add</button>
        </div>
      </div>
    `;

    drawer.appendChild(overlayEl);

    const closeBtn = overlayEl.querySelector(".sc-freegift-close");
    const addBtn = overlayEl.querySelector(".sc-freegift-add");

    overlayEl.addEventListener("click", (event) => {
      if (event.target === overlayEl) closeRewardPopup();
    });
    if (closeBtn) closeBtn.addEventListener("click", closeRewardPopup);

    rewardPopupCache = {
      overlay: overlayEl,
      addButton: addBtn,
      imageEl: overlayEl.querySelector(".sc-freegift-image"),
      titleEl: overlayEl.querySelector(".sc-freegift-product-title"),
      subtitleEl: overlayEl.querySelector(".sc-freegift-product-sub"),
      ruleTitleEl: overlayEl.querySelector(".sc-freegift-rule-title"),
      headerTitleEl: overlayEl.querySelector(".sc-freegift-title-text"),
      headerSubEl: overlayEl.querySelector(".sc-freegift-subtext"),
      iconEl: overlayEl.querySelector(".sc-freegift-icon"),
      contentEl: overlayEl.querySelector(".sc-freegift-content"),
      listEl: overlayEl.querySelector(".sc-freegift-list"),
      optionsEl: overlayEl.querySelector(".sc-freegift-options"),
      messageEl: overlayEl.querySelector(".sc-freegift-message"),
      current: null,
    };

    const updateFreeGiftSelection = (value) => {
      if (
        !rewardPopupCache?.current ||
        (
          rewardPopupCache.current.kind !== "free" &&
          rewardPopupCache.current.kind !== "bxgy" &&
          rewardPopupCache.current.kind !== "buyxgety"
        )
      )
        return;
      const selectedId = trimToNull(value);
      rewardPopupCache.current.selectedOptionId = selectedId;
      const options = Array.isArray(rewardPopupCache.current.options)
        ? rewardPopupCache.current.options
        : [];
      const selectedCount = selectedId ? 1 : 0;
      const goalMet = rewardPopupCache.current.goalMet !== false;
      if (rewardPopupCache.headerSubEl) {
        rewardPopupCache.headerSubEl.innerHTML = `Choose any 1 free gifts <span class="sc-freegift-count">${selectedCount}/1</span>`;
      }
      if (rewardPopupCache.addButton) rewardPopupCache.addButton.disabled = selectedCount < 1 || !goalMet;
      if (rewardPopupCache.messageEl) {
        const addLabel = rewardPopupCache.current.kind === "free" ? "Add Free Gifts" : "Add Item";
        rewardPopupCache.messageEl.classList.remove("is-error");
        rewardPopupCache.messageEl.textContent = !goalMet
          ? getRewardGoalPendingMessage(rewardPopupCache.current.kind)
          : selectedCount
            ? `Item selected. Click ${addLabel} to add it to your cart.`
            : "Select a free gift to add it to your cart.";
      }
      if (rewardPopupCache.listEl) {
        rewardPopupCache.listEl.querySelectorAll(".sc-freegift-option").forEach((row) => {
          const checked = String(row.getAttribute("data-option-id") || "") === String(selectedId || "");
          row.classList.toggle("selected", checked);
          const box = row.querySelector(".sc-freegift-check");
          if (box) {
            box.setAttribute("aria-checked", checked ? "true" : "false");
            box.innerHTML = "";
          }
        });
      }
      rewardPopupCache.current.selectedOption =
        options.find((option) => String(option.optionId) === String(selectedId)) || null;
    };

    overlayEl.addEventListener("click", (event) => {
      const optionRow = event.target instanceof Element
        ? event.target.closest(".sc-freegift-option")
        : null;
      if (!optionRow) return;
      if (optionRow.classList.contains("sc-freegift-reference")) return;
      event.preventDefault();
      updateFreeGiftSelection(optionRow.getAttribute("data-option-id"));
    });

    if (addBtn) {
      addBtn.addEventListener("click", async () => {
        if (!rewardPopupCache?.current) return;
        const cur = rewardPopupCache.current;
        if (cur.goalMet === false) {
          if (rewardPopupCache.messageEl) {
            rewardPopupCache.messageEl.classList.add("is-error");
            rewardPopupCache.messageEl.textContent = getRewardGoalPendingMessage(cur.kind);
          }
          return;
        }
        addBtn.disabled = true;
        addBtn.classList.add("loading");

        try {
          const isMultiOption =
            cur.kind === "free" ||
            (
              (cur.kind === "bxgy" || cur.kind === "buyxgety") &&
              Array.isArray(cur.options) &&
              cur.options.length > 0
            );
          const selectedOption = isMultiOption ? cur.selectedOption : null;

          if (isMultiOption && !selectedOption) {
            if (rewardPopupCache.messageEl) {
              rewardPopupCache.messageEl.classList.add("is-error");
              rewardPopupCache.messageEl.textContent = "Please select one free gift before adding.";
            }
            return;
          }
          const ok = await addRewardToCart({
            kind: cur.kind,
            rule: selectedOption?.rule || cur.rule,
            ruleKey: cur.ruleKey,
            slot: cur.slot,
            variant: selectedOption?.variant || cur.variant,
            qty: selectedOption?.qty || cur.qty,
            markAutoAdded: false,
          });
          if (ok) {
            const addedGuardKey = cur.kind === "free" ? cur.slot || cur.ruleKey : cur.ruleKey;
            if (addedGuardKey) {
              if (cur.kind === "free") scStore.del(keyPendingFreeGift(addedGuardKey));
              markPopupShown(cur.kind, addedGuardKey);
            }
            const addedProductTitle =
              trimToNull(selectedOption?.title) ||
              trimToNull(selectedOption?.variant?.product?.title) ||
              trimToNull(selectedOption?.variant?.title) ||
              "Free gift";
            closeRewardPopup();
            firePaperEffect(2800);
            showCenterCelebratePopup(
              "Product added",
              `${addedProductTitle} was added to your cart successfully.`,
              4000
            );
            renderAllFromCache();
          } else {
            // Silent failure (variant not resolved, already in cart, etc.) — no throw, just notify
            showCenterCelebratePopup("Reward", "Could not add the product. Please try again.", 4000);
          }
        } catch (err) {
          // addRewardToCart already logged this — show user-facing message only
          showCenterCelebratePopup("Reward", "Could not add the product. Please try again.", 4000);
        } finally {
          const active = rewardPopupCache?.current;
          const requiresSelection =
            active?.kind === "free" ||
            (
              (active?.kind === "bxgy" || active?.kind === "buyxgety") &&
              Array.isArray(active?.options) &&
              active.options.length > 0
            );
          addBtn.disabled =
            active?.goalMet === false ||
            (requiresSelection && !active?.selectedOption);
          addBtn.classList.remove("loading");
        }
      });
    }

    return rewardPopupCache;
  };

  const cartHasRewardForKey = (kind, keyOrSlot) => {
    const items = Array.isArray(CART?.items) ? CART.items : [];
    for (const it of items) {
      const p = it?.properties || {};
      if (kind === "free") {
        const isFree = String(p?.[FREE_GIFT_PROPERTY] || "").trim().toLowerCase() === "true";
        if (!isFree) continue;
        const slot = String(p?.[FREE_GIFT_RULE_PROPERTY] || "").trim();
        const ruleKey = String(p?.[FREE_GIFT_RULE_KEY_PROPERTY] || "").trim();
        const discountId = String(p?.[FREE_GIFT_DISCOUNT_PROPERTY] || "").trim();
        if (
          keyOrSlot &&
          (String(keyOrSlot) === slot ||
            String(keyOrSlot) === ruleKey ||
            String(keyOrSlot) === discountId)
        ) return true;
      } else {
        const isBxgy = String(p?.[BXGY_GIFT_PROPERTY] || "").trim().toLowerCase() === "true";
        if (!isBxgy) continue;
        const ruleKey = String(p?.[BXGY_GIFT_RULE_PROPERTY] || "").trim();
        if (ruleKey && keyOrSlot && String(keyOrSlot) === ruleKey) return true;
      }
    }
    return false;
  };

  // ✅ FIX-2: Don't repeat popup after refresh (sessionStorage shown flag)
  const canShowPopupFor = (kind, guardKey) => {
    if (!guardKey) return true;
    return !trimToNull(scStore.get(keyShown(kind, guardKey)));
  };
  const markPopupShown = (kind, guardKey) => {
    if (!guardKey) return;
    scStore.set(keyShown(kind, guardKey), "1");
  };
  const clearPopupShown = (kind, guardKey) => {
    if (!guardKey) return;
    scStore.del(keyShown(kind, guardKey));
  };

  const getFreeGiftProductIds = (rule) => {
    const products = Array.isArray(rule?.bonusProducts)
      ? rule.bonusProducts
      : parseArrayish(rule?.bonusProducts);
    const bonusIds = refsFromValue(rule?.bonusProductIds).map(normalizeResourceId).filter(Boolean);
    const rewardIds = refsFromValue(rule?.rewardProductIds).map(normalizeResourceId).filter(Boolean);
    const giftSkuIds = refsFromValue(rule?.giftSku).map(normalizeResourceId).filter(Boolean);
    const ids = bonusIds.length > 0 ? bonusIds : rewardIds.length > 0 ? rewardIds : giftSkuIds;

    const stringFallbackIds =
      !ids.length && typeof rule?.bonusProductIds === "string" && trimToNull(rule.bonusProductIds)
        ? [rule.bonusProductIds]
        : [];
    const fallback = trimToNull(rule?.bonusProductId) || trimToNull(rule?.bonus);
    const productIds = products
      .map((product) => trimToNull(product?.id || product?.productId))
      .filter(Boolean);
    const allIds = [...ids, ...stringFallbackIds, ...productIds, fallback]
      .map((id) => normalizeResourceId(id) || trimToNull(id))
      .filter(Boolean);
    return [...new Set(allIds)];
  };

  const getFreeGiftProductMeta = (rule, productId, index) => {
    const products = Array.isArray(rule?.bonusProducts)
      ? rule.bonusProducts
      : parseArrayish(rule?.bonusProducts);
    const byId = products.find((product) => {
      const id = trimToNull(product?.id || product?.productId);
      return id && productId && String(id) === String(productId);
    });
    return byId || products[index] || null;
  };

  const getFreeGiftVariantFromRule = (rule, productId, index) => {
    const productMeta = getFreeGiftProductMeta(rule, productId, index);
    const hasProductMetaVariant = !!(
      trimToNull(productMeta?.variantId) ||
      trimToNull(productMeta?.variant_id)
    );
    const rawVariantId =
      trimToNull(productMeta?.variantId) ||
      trimToNull(productMeta?.variant_id) ||
      trimToNull(rule?.bonusProductVariantId) ||
      trimToNull(rule?.bonus_product_variant_id) ||
      trimToNull(rule?.freeProductVariantId) ||
      trimToNull(rule?.giftProductVariantId) ||
      null;
    if (!rawVariantId) return null;

    const firstProductId =
      trimToNull(rule?.bonusProductId) ||
      trimToNull(rule?.bonus) ||
      getFreeGiftProductIds(rule)[0] ||
      null;
    if (!hasProductMetaVariant && index > 0 && firstProductId && productId && String(productId) !== String(firstProductId)) {
      return null;
    }

    const variantGid = normalizeVariantGid(rawVariantId);
    if (!variantGid) return null;

    return {
      id: variantGid,
      legacyResourceId: gidToId(variantGid),
      productId: normalizeProductNumericId(productId || firstProductId),
      product: {
        title: trimToNull(productMeta?.title) || trimToNull(rule?.bonusProductTitle) || trimToNull(rule?.productTitle) || "",
        image: trimToNull(productMeta?.image) || trimToNull(rule?.bonusProductImage) || trimToNull(rule?.productImage) || "",
      },
      title: trimToNull(productMeta?.variantTitle) || trimToNull(rule?.bonusProductVariantTitle) || "",
      image: trimToNull(productMeta?.image) || trimToNull(rule?.bonusProductImage) || trimToNull(rule?.productImage) || "",
    };
  };

  const centsFromDecimalPrice = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n * priceDivisor()) : 0;
  };

  const buildFreeGiftOption = ({ rule, productId, variant, index }) => {
    if (!variant || !getVariantLegacyId(variant)) return null;
    const optionRule = {
      ...rule,
      bonusProductId: productId,
      bonus: productId,
      bonusProductIds: [productId],
    };
    const productName =
      trimToNull(variant?.product?.title) ||
      trimToNull(variant?.productTitle) ||
      trimToNull(variant?.title) ||
      trimToNull(rule?.bonusProductTitle) ||
      trimToNull(rule?.productTitle) ||
      "Free gift";
    const variantName = trimToNull(variant?.title);
    const title =
      variantName && variantName.toLowerCase() !== "default title" && variantName !== productName
        ? `${productName} - ${variantName}`
        : productName;

    return {
      optionId: `${getVariantLegacyId(variant)}:${index}`,
      rule: optionRule,
      variant,
      qty: getRewardQtyFromRule("free", optionRule),
      title,
      image: trimToNull(variant?.image) || trimToNull(variant?.product?.image) || "",
      priceCents: centsFromDecimalPrice(variant?.price),
    };
  };

  const getImmediateFreeGiftOptions = (rule) => {
    const productIds = getFreeGiftProductIds(rule);
    const rawOptions = productIds.length ? productIds : [trimToNull(rule?.bonusProductId) || trimToNull(rule?.bonus)].filter(Boolean);
    const options = rawOptions
      .map((productId, index) => buildFreeGiftOption({
        rule,
        productId,
        variant: getFreeGiftVariantFromRule(rule, productId, index),
        index,
      }))
      .filter(Boolean);
    console.info("[SmartCartify] free gift popup immediate products:", options);
    return options;
  };

  const resolveFreeGiftOptions = async (rule) => {
    const productIds = getFreeGiftProductIds(rule);
    const rawOptions = productIds.length ? productIds : [trimToNull(rule?.bonusProductId) || trimToNull(rule?.bonus)].filter(Boolean);
    console.debug("[SmartCartify] resolveFreeGiftOptions: productIds=", productIds, "rawOptions=", rawOptions);
    console.info("[SmartCartify] free gift popup product source:", {
      ruleId: rule?.id || null,
      ruleTitle: rule?.title || rule?.campaignName || null,
      bonusProductIds: productIds,
      bonusProducts: Array.isArray(rule?.bonusProducts) ? rule.bonusProducts : parseArrayish(rule?.bonusProducts),
    });
    const options = [];

    for (let index = 0; index < rawOptions.length; index += 1) {
      const productId = rawOptions[index];
      console.debug(`[SmartCartify] resolving option ${index}: productId=`, productId);
      console.info("[SmartCartify] free gift popup product candidate:", {
        index,
        productId,
        product: getFreeGiftProductMeta(rule, productId, index),
      });
      const optionRule = {
        ...rule,
        bonusProductId: productId,
        bonus: productId,
        bonusProductIds: [productId],
      };
      const directVariant = getFreeGiftVariantFromRule(rule, productId, index);
      const variant = directVariant || await resolveRewardVariantForAdd(optionRule, { productId });
      console.debug(`[SmartCartify] resolved option ${index}: variant=`, variant, "legacyId=", variant ? getVariantLegacyId(variant) : null);
      const option = buildFreeGiftOption({ rule, productId, variant, index });
      if (!option) {
        console.warn(`[SmartCartify] skipping option ${index}: variant resolution failed`);
        continue;
      }
      options.push(option);
    }

    console.debug("[SmartCartify] resolveFreeGiftOptions complete: resolved", options.length, "options");
    console.info("[SmartCartify] free gift popup render options:", options);
    return options;
  };



  const autoAddFirstFreeGiftOption = async ({ rule, ruleKey, slot }) => {
    const guardKey = slot || ruleKey;
    if (!guardKey || cartHasRewardForKey("free", guardKey)) return false;
    const options = await resolveFreeGiftOptions(rule);
    const firstOption = options[0];
    if (!firstOption) return false;

    const ok = await addRewardToCart({
      kind: "free",
      rule: firstOption.rule,
      ruleKey,
      slot,
      variant: firstOption.variant,
      qty: firstOption.qty,
      markAutoAdded: true,
    });

    if (ok) {
      scStore.del(keyPendingFreeGift(guardKey));
      markPopupShown("free", guardKey);
    }

    return ok;
  };

  const renderFreeGiftPopupOptions = (state, options, currency) => {
    if (!state?.listEl) return;

    const optionsEl = state.optionsEl || state.listEl;
    state.listEl.hidden = false;
    state.listEl.style.removeProperty("display");
    state.current.options = Array.isArray(options) ? options : [];
    state.current.selectedOption = null;
    state.current.selectedOptionId = null;
    if (state.messageEl) {
      state.messageEl.hidden = false;
      state.messageEl.classList.remove("is-error");
      state.messageEl.textContent = state.current.goalMet === false
        ? getRewardGoalPendingMessage(state.current.kind)
        : "Select a free gift to add it to your cart.";
    }

    if (!state.current.options.length) {
      optionsEl.innerHTML = `<div class="sc-freegift-loading">No available free gifts found.</div>`;
      if (state.addButton) state.addButton.disabled = true;
      if (state.messageEl) state.messageEl.textContent = "No free gift item is available right now.";
      return;
    }

    optionsEl.innerHTML = state.current.options.map((option) => {
      const priceHtml = option.priceCents > 0
        ? `<span class="sc-freegift-price">${formatMoney(option.priceCents, currency)}</span>`
        : "";
      const imageHtml = option.image
        ? `<img src="${safe(option.image)}" alt="${safe(option.title)}" loading="lazy">`
        : `<span class="sc-freegift-thumb-empty">${safe((option.title || "G").slice(0, 1))}</span>`;
      return `
        <button class="sc-freegift-option" type="button" data-option-id="${safe(option.optionId)}">
          <span class="sc-freegift-thumb">${imageHtml}</span>
          <span class="sc-freegift-option-main">
            <span class="sc-freegift-option-title">${safe(option.title)}</span>
            <span class="sc-freegift-option-price">${priceHtml}<span class="sc-freegift-free-pill">Free</span></span>
          </span>
          <span class="sc-freegift-check" role="checkbox" aria-checked="false" aria-hidden="true"></span>
        </button>
      `;
    }).join("");

    if (state.addButton) state.addButton.disabled = true;
    console.info("[SmartCartify] free gift popup DOM rendered:", {
      count: state.current.options.length,
      html: optionsEl.innerHTML,
    });
  };

  const getBxgyReferenceItems = (rule) => {
    const appliesTo = parseObjectish(rule?.appliesTo || rule?.applyTo || {});
    const productRefs = [
      ...refsFromValue(appliesTo?.products),
      ...refsFromValue(appliesTo?.productIds),
      ...refsFromValue(rule?.appliesProductIds),
      ...refsFromValue(rule?.buyProductIds),
      ...refsFromValue(rule?.rewardProductIds),
      ...refsFromValue(rule?.giftSku),
    ];
    const collectionRefs = [
      ...refsFromValue(appliesTo?.collections),
      ...refsFromValue(appliesTo?.collectionIds),
      ...refsFromValue(rule?.appliesCollectionIds),
      ...refsFromValue(rule?.buyCollectionIds),
    ];
    const normalizeRef = (item, type, index) => {
      const rawId = trimToNull(item?.id || item?.productId || item?.collectionId || item);
      if (!rawId) return null;
      const numeric = gidToId(rawId) || rawId;
      const title =
        trimToNull(item?.title) ||
        trimToNull(item?.name) ||
        `${type === "collection" ? "Collection" : "Product"} ${String(numeric).split("/").pop()}`;
      return {
        optionId: `${type}:${rawId}:${index}`,
        type,
        title,
      };
    };
    const items = [
      ...productRefs.map((item, index) => normalizeRef(item, "product", index)),
      ...collectionRefs.map((item, index) => normalizeRef(item, "collection", index)),
    ].filter(Boolean);
    const seen = new Set();
    return items.filter((item) => {
      const key = String(item.optionId).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const renderBxgyReferenceItems = (state, items) => {
    if (!state?.listEl) return;
    const optionsEl = state.optionsEl || state.listEl;
    state.listEl.hidden = false;
    state.listEl.style.removeProperty("display");
    state.current.options = [];
    optionsEl.innerHTML = items.length
      ? items.map((item) => `
        <div class="sc-freegift-option sc-freegift-reference">
          <span class="sc-freegift-thumb sc-freegift-thumb-empty">${safe(item.type === "collection" ? "C" : "P")}</span>
          <span class="sc-freegift-option-main">
            <span class="sc-freegift-option-title">${safe(item.title)}</span>
            <span class="sc-freegift-option-price"><span class="sc-freegift-free-pill">${safe(item.type === "collection" ? "Collection" : "Product")}</span></span>
          </span>
        </div>
      `).join("")
      : `<div class="sc-freegift-loading">No products or collections found for this offer.</div>`;
    if (state.messageEl) {
      state.messageEl.hidden = false;
      state.messageEl.classList.remove("is-error");
      state.messageEl.textContent = "These products or collections are included in this Buy X Get Y offer.";
    }
    if (state.addButton) {
      state.addButton.style.display = "none";
      state.addButton.disabled = true;
    }
  };

  const openRewardPopupFor = ({ kind, rule, ruleKey, slot, title, goalMet = true, force = false }) => {
    console.debug("[SmartCartify] openRewardPopupFor called:", { kind, ruleKey, slot, rule: rule ? { bonusProductIds: rule.bonusProductIds, bonusProductId: rule.bonusProductId, bonus: rule.bonus } : null });
    console.info("[SmartCartify] reward popup rule products:", {
      kind,
      ruleKey,
      slot,
      bonusProductId: rule?.bonusProductId || rule?.bonus || null,
      bonusProductIds: getFreeGiftProductIds(rule),
      bonusProducts: Array.isArray(rule?.bonusProducts) ? rule.bonusProducts : parseArrayish(rule?.bonusProducts),
    });
    const variant = getRewardVariantFromRule(kind, rule);

    // For cart goal free products with multiple options, variant will be null
    // Allow the popup to open so options can be resolved asynchronously
    const hasBonusProductIds = getFreeGiftProductIds(rule).length > 0;
    const isMultiOptionReward = (kind === "free" || kind === "bxgy" || kind === "buyxgety") && hasBonusProductIds;
    const bxgyReferenceItems = kind !== "free" ? getBxgyReferenceItems(rule) : [];
    const hasBxgyReferences = bxgyReferenceItems.length > 0;

    if (!variant && !isMultiOptionReward && !hasBxgyReferences) return false;

    const canResolveByProductId =
      !!normalizeProductNumericId(
        trimToNull(variant?.productId) ||
        trimToNull(rule?.bonusProductId) ||
        trimToNull(rule?.bonus)
      );
    if (variant && !getVariantLegacyId(variant) && !canResolveByProductId && !isMultiOptionReward && !hasBxgyReferences) return false;
    if (!variant && !isMultiOptionReward && !canResolveByProductId && !hasBxgyReferences) return false;

    const guardKey = kind === "free" ? slot || ruleKey : ruleKey;
    const addItemGoalMet = goalMet !== false;

    // already shown in this session storage (page refresh safe)
    if (guardKey && !force && !canShowPopupFor(kind, guardKey)) return false;

    if (guardKey && !force && drawer.__sc_reward_popup_for === `${kind}:${guardKey}`) return false;

    if (guardKey && !force && cartHasRewardForKey(kind, guardKey)) return false;

    if (!drawer.classList.contains("open")) openDrawer();

    const state = ensureRewardPopup();
    const qty = getRewardQtyFromRule(kind, rule);
    const currency = normalizeCurrencyCode();

    const fallbackPopupTitle =
      kind === "free" ? "Free gifts Unlocked" : "Buy X Get Y Discount product unlocked";
    const popupRuleTitle =
      trimToNull(title) ||
      getDynamicOfferTitle(kind, rule, addItemGoalMet, trimToNull(rule?.campaignName) || fallbackPopupTitle);

    if (state.iconEl) state.iconEl.innerHTML = kind === "free" ? (ICONS.gift || "🎁") : "🔥";
    if (state.headerTitleEl) state.headerTitleEl.textContent = popupRuleTitle;
    if (state.headerSubEl) {
      state.headerSubEl.innerHTML =
        kind === "free"
          ? `Choose any 1 free gifts <span class="sc-freegift-count">0/1</span>`
          : addItemGoalMet
            ? "Click Add to add it in your cart"
            : getRewardGoalPendingMessage(kind);
    }

    const imageUrl = variant?.image || variant?.product?.image || "";
    if (state.imageEl) {
      if (imageUrl) {
        state.imageEl.src = imageUrl;
        state.imageEl.style.display = "";
      } else {
        state.imageEl.removeAttribute("src");
        state.imageEl.style.display = "none";
      }
    }

    const productHeading =
      trimToNull(variant?.product?.title) ||
      trimToNull(variant?.product?.name) ||
      trimToNull(variant?.productTitle) ||
      trimToNull(rule?.productTitle) ||
      trimToNull(rule?.productName);

    const variantHeading =
      trimToNull(variant?.title) ||
      trimToNull(variant?.name) ||
      trimToNull(variant?.displayName) ||
      trimToNull(variant?.variantTitle);

    const fallbackRuleName =
      trimToNull(rule?.rewardTitle) ||
      trimToNull(rule?.rewardName) ||
      trimToNull(rule?.title) ||
      trimToNull(rule?.name) ||
      "";

    const finalNameParts = [];
    if (productHeading) finalNameParts.push(productHeading);
    if (variantHeading && variantHeading !== productHeading) finalNameParts.push(variantHeading);
    if (!finalNameParts.length && fallbackRuleName) finalNameParts.push(fallbackRuleName);

    const productName = finalNameParts.length > 0 ? finalNameParts.join(" – ") : "Reward product";
    if (state.titleEl) state.titleEl.textContent = productName;

    if (state.subtitleEl) state.subtitleEl.textContent = `${formatMoney(0, currency)} (Free)`;

    const ruleName =
      popupRuleTitle ||
      trimToNull(rule?.cartStepName) ||
      trimToNull(rule?.campaignName) ||
      "Reward";
    if (state.ruleTitleEl) state.ruleTitleEl.textContent = ruleName;

    if (state.addButton) state.addButton.textContent = kind === "free" ? "✓ Add Free Gifts" : `Add Item${qty > 1 ? ` (${qty})` : ""}`;

    state.current = { kind, ruleKey, slot, rule, variant, qty, goalMet: addItemGoalMet, options: [], selectedOption: null, selectedOptionId: null };
    state.overlay.classList.add("open");

    drawer.__sc_reward_popup_for = `${kind}:${guardKey || ""}`;

    // BXGY is marked on open. Free gifts are marked only after the shopper adds one.
    if (guardKey && kind !== "free" && !force) markPopupShown(kind, guardKey);

    if (!variant && !isMultiOptionReward && hasBxgyReferences) {
      if (state.contentEl) state.contentEl.hidden = true;
      if (state.headerSubEl) state.headerSubEl.textContent = "Products or collections included in this offer";
      renderBxgyReferenceItems(state, bxgyReferenceItems);
    } else if (isMultiOptionReward) {
      if (guardKey) scStore.set(keyPendingFreeGift(guardKey), "1");
      if (state.contentEl) state.contentEl.hidden = true;
      if (state.listEl) {
        state.listEl.hidden = false;
        if (state.optionsEl) {
          state.optionsEl.innerHTML = `<div class="sc-freegift-loading">Loading free gifts...</div>`;
        } else {
          state.listEl.innerHTML = `<div class="sc-freegift-loading">Loading free gifts...</div>`;
        }
      }
      if (state.messageEl) {
        state.messageEl.hidden = false;
        state.messageEl.classList.remove("is-error");
        state.messageEl.textContent = addItemGoalMet
          ? "Select a free gift to add it to your cart."
          : getRewardGoalPendingMessage(kind);
      }
      if (state.addButton) {
        state.addButton.style.removeProperty("display");
        state.addButton.disabled = true;
      }

      const immediateOptions = getImmediateFreeGiftOptions(rule);
      if (immediateOptions.length) {
        renderFreeGiftPopupOptions(state, immediateOptions, currency);
      }

      const currentPopupKey = `${kind}:${guardKey || ""}`;

      void resolveFreeGiftOptions(rule)
        .then((options) => {
          const activeState = rewardPopupCache || state;
          if (!activeState.current) return;
          if (drawer.__sc_reward_popup_for !== currentPopupKey) return;
          renderFreeGiftPopupOptions(activeState, options, currency);
        })
        .catch((err) => {
          console.error("[SmartCartify] free gift options failed:", err);
          if (state.optionsEl) {
            state.optionsEl.innerHTML = `<div class="sc-freegift-loading">Could not load free gifts.</div>`;
          } else if (state.listEl) {
            state.listEl.innerHTML = `<div class="sc-freegift-loading">Could not load free gifts.</div>`;
          }
          if (state.addButton) state.addButton.disabled = true;
        });
    } else if (state.addButton) {
      if (state.contentEl) state.contentEl.hidden = false;
      if (state.listEl) {
        state.listEl.hidden = false;
        state.listEl.style.removeProperty("display");
      }
      if (state.optionsEl) state.optionsEl.innerHTML = "";
      if (state.messageEl) {
        state.messageEl.hidden = addItemGoalMet;
        state.messageEl.classList.remove("is-error");
        state.messageEl.textContent = addItemGoalMet ? "" : getRewardGoalPendingMessage(kind);
      }
      state.addButton.style.removeProperty("display");
      state.addButton.disabled = !addItemGoalMet;
    }

    return true;
  };

  // AUTO ADD reward when needed (buyxgety/free)
  const autoAddRewardIfNeeded = async ({ kind, rule, ruleKey, slot }) => {
    if (__SC_AUTO_ADDING__) return false;

    const guardKey = kind === "free" ? slot || ruleKey : ruleKey;
    if (!guardKey) return false;

    // Already in cart
    if (cartHasRewardForKey(kind, guardKey)) return true;

    // Permanently failed (out-of-stock / invalid variant) — skip until step resets
    if (trimToNull(scStore.get(keyPermFailed(kind, guardKey)))) return true;

    // Previously auto-added — if the product is still in cart we're done.
    // If it's gone (e.g. removed by enforceRewardValidity), clear the stale flag and retry.
    if (trimToNull(scStore.get(keyAutoAdded(kind, guardKey)))) {
      if (cartHasRewardForKey(kind, guardKey)) return true;
      scStore.del(keyAutoAdded(kind, guardKey));
    }

    // In cooldown from a previous failed attempt — skip to avoid 429 spam
    const cdKey = `${kind}:${guardKey}`;
    if (__SC_AUTO_ADD_COOLDOWNS__.has(cdKey)) return false;

    const variant = getRewardVariantFromRule(kind, rule);
    if (!variant) {
      console.warn(`[SmartCartify] reward variant not found for ${kind} rule (guardKey=${guardKey}). Check bonusProductId is set on the rule.`);
      return false;
    }

    __SC_AUTO_ADDING__ = true;
    try {
      const ok = await addRewardToCart({
        kind,
        rule,
        ruleKey: ruleKey || guardKey,
        slot,
        variant,
        qty: getRewardQtyFromRule(kind, rule),
        markAutoAdded: true,
      });
      return ok;
    } catch (e) {
      const status = Number(e?._httpStatus || e?.httpStatus || 0);
      if (status === 422 || status === 404) {
        // Variant unavailable / deleted — mark permanently so we don't spam retries
        scStore.set(keyPermFailed(kind, guardKey), "1");
      } else {
        // Rate-limited or transient error — cooldown for 30s then allow one retry
        __SC_AUTO_ADD_COOLDOWNS__.add(cdKey);
        setTimeout(() => __SC_AUTO_ADD_COOLDOWNS__.delete(cdKey), 30_000);
      }
      return false;
    } finally {
      __SC_AUTO_ADDING__ = false;
    }
  };

  /* =========================================================
   ✅ AUTO REMOVE REWARD ITEMS WHEN NOT ELIGIBLE (UNCHANGED)
  ========================================================= */
  let __SC_ENFORCING_REWARDS__ = false;

  const computeBxgyCompleteForRule = (rule) => {
    const subtotalRupees = (Number(CART?.items_subtotal_price || 0) / priceDivisor()) || 0;
    const cartQty = getCartTotalQty();

    const triggerType = String(rule?.triggerType ?? rule?.trigger_type ?? "amount").toLowerCase();
    const minQuantity = Number(rule?.minQuantity ?? rule?.min_quantity);
    const minPurchase = Number(rule?.minPurchase ?? rule?.min_purchase);
    const xQty = Number(rule?.xQty ?? rule?.x_qty ?? rule?.x ?? rule?.buyQty ?? rule?.buy_qty ?? rule?.buy);

    const hasMin = Number.isFinite(minPurchase) && minPurchase > 0;
    const hasX = Number.isFinite(xQty) && xQty > 0;

    if (triggerType === "quantity" && Number.isFinite(minQuantity) && minQuantity > 0) {
      return cartQty >= minQuantity;
    }
    if (hasMin) return subtotalRupees >= minPurchase;
    if (hasX) return cartQty >= xQty;
    return false;
  };

  const computeBuyXGetYCompleteForRule = (rule) => {
    const items = Array.isArray(CART?.items) ? CART.items : [];
    const scope = normalizeBxgyScope(rule?.scope || rule?.scopeName || "store");
    const eligibleItems = getEligibleBuyXGetYItems(rule, items);

    const eligibleQty = eligibleItems.reduce((sum, it) => sum + (Number(it?.quantity) || 0), 0);
    const eligibleSubtotalRupees =
      (eligibleItems.reduce((sum, it) => sum + (Number(it?.final_line_price) || 0), 0) / priceDivisor()) || 0;

    const triggerType = String(rule?.triggerType ?? rule?.trigger_type ?? "amount").toLowerCase();
    const minQuantity = Number(rule?.minQuantity ?? rule?.min_quantity);
    const minPurchase = Number(rule?.minPurchase ?? rule?.min_purchase);
    const xQty = Number(rule?.xQty ?? rule?.x_qty ?? rule?.x ?? rule?.buyQty ?? rule?.buy_qty ?? rule?.buy);

    const hasMin = Number.isFinite(minPurchase) && minPurchase > 0;
    const hasX = Number.isFinite(xQty) && xQty > 0;

    if ((scope === "product" || scope === "collection") && eligibleQty <= 0) return false;

    if (triggerType === "quantity" && Number.isFinite(minQuantity) && minQuantity > 0) {
      return eligibleQty >= minQuantity;
    }
    if (hasMin) return eligibleSubtotalRupees >= minPurchase;
    if (hasX) return eligibleQty >= xQty;
    return false;
  };

  const enforceRewardValidity = async () => {
    if (__SC_ENFORCING_REWARDS__) return;
    __SC_ENFORCING_REWARDS__ = true;

    try {
      const items = Array.isArray(CART?.items) ? CART.items : [];
      if (!items.length) return;

      // Non-reward item count (excludes free gifts and BXGY gifts from quantity threshold checks)
      const nonRewardQty = items.reduce((sum, it) => {
        const p = it?.properties || {};
        const isReward =
          String(p?.[FREE_GIFT_PROPERTY] || "").trim().toLowerCase() === "true" ||
          String(p?.[BXGY_GIFT_PROPERTY] || "").trim().toLowerCase() === "true";
        return sum + (isReward ? 0 : (Number(it.quantity) || 0));
      }, 0);

      // If proxy data failed to load, skip enforcement to avoid wrongfully removing rewards
      if (PROXY?._proxyError) return;

      const discountList = getProxyArray(PROXY, ["discountRules", "discountRule", "discountrule"]);
      const freeList = getProxyArray(PROXY, ["freeGiftRules", "freeGiftRule", "freegiftrule"]);
      const cartGoalList = getProxyArray(PROXY, [
        "cartGoalRules",
        "cartGoalRule",
        "cartgoalrule",
      ]);
      const buyxgetyList = getProxyArray(PROXY, [
        "buyxgetyRules",
        "buyxgetyRule",
        "buyxgetyrule",
        "buyXGetYRules",
        "bxgyrule",
        "bxgyRules",
        "bxgyRule",
      ]);

      const normType = (r) => String(r?.type ?? r?.ruleType ?? r?.rule_type ?? "").trim().toLowerCase();

      const freeBySlot = new Map();
      const freeByRuleKey = new Map();
      const freeByDiscountId = new Map();
      const selectedCartGoalFreeCampaign = getSelectedCartGoalCampaign();
      const cartGoalFreeRules = buildCartGoalFreeProductRules(selectedCartGoalFreeCampaign);

      [...(Array.isArray(freeList) ? freeList : []), ...cartGoalFreeRules].forEach((r) => {
        if (!isRuleEnabled(r)) return;
        const slot = normalizeStepSlotFromAny(r);
        if (slot) freeBySlot.set(String(slot), r);
        const ruleKey = getRuleKey(r, "free");
        if (ruleKey) freeByRuleKey.set(String(ruleKey), r);
        const discountId = getFreeGiftDiscountId(r);
        if (discountId) freeByDiscountId.set(String(discountId), r);
      });

      const bxgyMap = new Map();
      (Array.isArray(discountList) ? discountList : []).forEach((r) => {
        if (!isRuleEnabled(r)) return;
        const t = normType(r);
        const hasMsgs = trimToNull(r?.beforeOfferUnlockMessage) || trimToNull(r?.afterOfferUnlockMessage);
        const looksLikeBxgy = t === "bxgy" || hasMsgs;
        if (!looksLikeBxgy) return;
        const key = getRuleKey(r, "bxgy");
        bxgyMap.set(String(key), { kind: "bxgy", rule: r });
      });

      (Array.isArray(buyxgetyList) ? buyxgetyList : []).forEach((r) => {
        if (!isRuleEnabled(r)) return;
        const key = getRuleKey(r, "buyxgety");
        bxgyMap.set(String(key), { kind: "buyxgety", rule: r });
      });

      (Array.isArray(discountList) ? discountList : []).forEach((r) => {
        if (!isRuleEnabled(r)) return;
        const t = normType(r);
        if (t !== "buyxgety") return;
        const key = getRuleKey(r, "buyxgety");
        bxgyMap.set(String(key), { kind: "buyxgety", rule: r });
      });

      const linesToRemove = [];

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const line = i + 1;
        const p = it?.properties || {};

        const isFree = String(p?.[FREE_GIFT_PROPERTY] || "").trim().toLowerCase() === "true";
        const isBxgy = String(p?.[BXGY_GIFT_PROPERTY] || "").trim().toLowerCase() === "true";

        if (isFree) {
          const slot = String(p?.[FREE_GIFT_RULE_PROPERTY] || "").trim();
          const ruleKey = String(p?.[FREE_GIFT_RULE_KEY_PROPERTY] || "").trim();
          const discountId = String(p?.[FREE_GIFT_DISCOUNT_PROPERTY] || "").trim();
          let rule = slot ? freeBySlot.get(slot) : null;
          if (!rule && ruleKey) rule = freeByRuleKey.get(ruleKey);
          if (!rule && discountId) rule = freeByDiscountId.get(discountId);

          if (!rule) {
            linesToRemove.push(line);
            continue;
          }

          const isQtyTrigger = isQuantityTriggerRule(rule);
          if (isQtyTrigger) {
            const goalQty = getGoalQuantity(rule);
            if (!(Number.isFinite(Number(goalQty)) && Number(goalQty) > 0)) {
              linesToRemove.push(line);
            } else {
              if (nonRewardQty < Number(goalQty)) linesToRemove.push(line);
            }
          } else {
            const goal = getGoalRupees("free", rule);
            const subtotalRupees = (getCartOriginalSubtotalCents() / priceDivisor()) || 0;
            if (!(Number.isFinite(Number(goal)) && Number(goal) > 0)) {
              linesToRemove.push(line);
            } else {
              const eligible = subtotalRupees >= Number(goal);
              if (!eligible) linesToRemove.push(line);
            }
          }
          continue;
        }

        if (isBxgy) {
          const ruleKey = String(p?.[BXGY_GIFT_RULE_PROPERTY] || "").trim();
          const meta = ruleKey ? bxgyMap.get(ruleKey) : null;

          if (!meta?.rule) {
            linesToRemove.push(line);
            continue;
          }

          const eligible =
            meta.kind === "buyxgety"
              ? computeBuyXGetYCompleteForRule(meta.rule)
              : computeBxgyCompleteForRule(meta.rule);
          if (!eligible) linesToRemove.push(line);
        }
      }

      if (!linesToRemove.length) return;

      const keyUpdates = {};
      linesToRemove.forEach((line) => {
        const key = trimToNull(items[line - 1]?.key);
        if (key) keyUpdates[key] = 0;
      });

      let removedInBulk = false;
      const keyCount = Object.keys(keyUpdates).length;
      if (keyCount === linesToRemove.length && keyCount > 0) {
        try {
          CART = await cartUpdate(keyUpdates);
          removedInBulk = true;
        } catch (e) {
          console.warn("[SC] bulk reward cleanup failed; falling back to line-by-line remove.", e);
        }
      }

      if (!removedInBulk) {
        linesToRemove.sort((a, b) => b - a);
        for (const line of linesToRemove) {
          try {
            CART = await cartChange(line, 0);
          } catch (e) {
            console.error("[SC] auto-remove failed line", line, e);
          }
        }
      }

      try {
        CART = await fetchCart({ force: true });
      } catch { }
    } finally {
      __SC_ENFORCING_REWARDS__ = false;
    }
  };

  /* =========================================================
   ✅ PROGRESS CALC + RENDER
  ========================================================= */
  const computeFillPercent = (subtotalCents, thresholdsCents, stepCount) => {
    if (!stepCount) return 0;
    const stepPercent = 100 / stepCount;
    const numeric = thresholdsCents.map((x) => (Number.isFinite(x) ? Number(x) : Infinity));

    let completedSteps = 0;
    for (let i = 0; i < stepCount; i++) {
      const threshold = numeric[i];
      if (!Number.isFinite(threshold)) break;
      if (subtotalCents >= threshold) completedSteps++;
      else break;
    }

    let fillPercent = completedSteps * stepPercent;
    if (completedSteps < stepCount) {
      const nextThreshold = numeric[completedSteps];
      if (Number.isFinite(nextThreshold)) {
        const prevThreshold = completedSteps > 0 ? numeric[completedSteps - 1] : 0;
        const span = nextThreshold - prevThreshold;
        if (span > 0) {
          const partial = clamp01((subtotalCents - prevThreshold) / span);
          fillPercent += partial * stepPercent;
        }
      }
    }

    return Math.min(100, Math.max(0, fillPercent));
  };

  const getProgressStepThreshold = (step) =>
    step?.progressMetric === "quantity"
      ? Number(step?.unlockQuantity)
      : Number(step?.unlockCents);

  // Returns cart qty excluding free-gift and BXGY reward items
  const getNonRewardItemQty = () => {
    const cartItems = Array.isArray(CART?.items) ? CART.items : [];
    if (!cartItems.length) return Math.max(0, Number(CART?.item_count || 0));
    return cartItems.reduce((sum, it) => {
      const p = it?.properties || {};
      const isReward =
        String(p?.[FREE_GIFT_PROPERTY] || "").trim().toLowerCase() === "true" ||
        String(p?.[BXGY_GIFT_PROPERTY] || "").trim().toLowerCase() === "true";
      return sum + (isReward ? 0 : (Number(it.quantity) || 0));
    }, 0);
  };

  const isDrawerCartEmpty = () => {
    const cartItems = Array.isArray(CART?.items) ? CART.items : [];
    return cartItems.length === 0 && Math.max(0, Number(CART?.item_count || 0)) <= 0;
  };

  const getProgressStepCurrent = (step, subtotalCents) =>
    step?.progressMetric === "quantity"
      ? Math.max(0, getNonRewardItemQty())
      : Math.max(0, Number(subtotalCents) || 0);

  const isProgressStepConfigured = (step) =>
    Number.isFinite(getProgressStepThreshold(step)) &&
    getProgressStepThreshold(step) > 0;

  const isProgressStepDone = (step, subtotalCents) =>
    isProgressStepConfigured(step) &&
    getProgressStepCurrent(step, subtotalCents) >= getProgressStepThreshold(step);

  const computeMixedFillPercent = (steps, subtotalCents) => {
    const stepCount = Array.isArray(steps) ? steps.length : 0;
    if (!stepCount) return 0;
    const stepPercent = 100 / stepCount;
    let fillPercent = 0;

    for (let i = 0; i < stepCount; i += 1) {
      const step = steps[i];
      const threshold = getProgressStepThreshold(step);
      if (!Number.isFinite(threshold) || threshold <= 0) break;

      const current = getProgressStepCurrent(step, subtotalCents);
      if (current >= threshold) {
        fillPercent += stepPercent;
        continue;
      }

      const prevSameMetric = steps
        .slice(0, i)
        .reverse()
        .find(
          (candidate) =>
            candidate?.progressMetric === step?.progressMetric &&
            isProgressStepConfigured(candidate)
        );
      const previousThreshold = prevSameMetric
        ? getProgressStepThreshold(prevSameMetric)
        : 0;
      const span = threshold - previousThreshold;
      if (span > 0) {
        fillPercent += clamp01((current - previousThreshold) / span) * stepPercent;
      }
      break;
    }

    return Math.min(100, Math.max(0, fillPercent));
  };

  const renderProgress = () => {
    const label = $(".sc-label");
    const fill = $(".sc-fill");
    const dotsWrap = $(".sc-dots");
    const legends = $(".sc-legends");
    const progressWrap = $(".sc-progress");
    if (!label || !fill || !dotsWrap || !legends || !progressWrap) return;

    const setProgressVisible = (show) => {
      if (show) {
        progressWrap.style.removeProperty("display");
      } else {
        progressWrap.classList.remove("sc-cart-goal-progress");
        progressWrap.style.setProperty("display", "none", "important");
      }
    };

    const stepsAll = buildSteps();
    const subtotal = getCartOriginalSubtotalCents();
    const isEmptyCart = isDrawerCartEmpty();

    refreshAnnouncementFromRules();

    if (isEmptyCart) {
      setAnnouncementMessages([]);
      setProgressVisible(false);
      label.innerHTML = "";
      fill.style.width = "0%";
      dotsWrap.innerHTML = "";
      legends.innerHTML = "";
      document.documentElement.style.removeProperty("--sc-stepcount");
      return;
    }

    const bxgyNow = getBxgyStatus();
    const bxgyCompleteNow = !!(bxgyNow && bxgyNow.complete);

    const buyStatuses = getBuyXGetYStatuses();
    const anyBuyCompletedNow = buyStatuses.some((x) => x.complete);

    buyStatuses.forEach((st) => {
      if (!st?.ruleKey) return;
      if (!st.complete) {
        clearPopupShown("buyxgety", st.ruleKey);
        scStore.del(keyAutoAdded("buyxgety", st.ruleKey));
        scStore.del(keyPermFailed("buyxgety", st.ruleKey));
      }
    });

    if (bxgyNow?.ruleKey && !bxgyCompleteNow) {
      clearPopupShown("bxgy", bxgyNow.ruleKey);
      scStore.del(keyAutoAdded("bxgy", bxgyNow.ruleKey));
      scStore.del(keyPermFailed("bxgy", bxgyNow.ruleKey));
    }

    if (!stepsAll.length) {
      setProgressVisible(false);
      label.innerHTML = renderGoalMessageHtml("Milestones not configured yet.");
      fill.style.width = "0%";
      dotsWrap.innerHTML = "";
      legends.innerHTML = "";
      document.documentElement.style.removeProperty("--sc-stepcount");

      const priming = !__SC_PRIMED_POPUPS__;
      if (priming) {
        LAST_DONE = 0;
        LAST_BXGY_DONE = bxgyCompleteNow;
        drawer.__sc_buy_completed_before = anyBuyCompletedNow;
        __SC_PRIMED_POPUPS__ = true;
      }
      return;
    }

    const configuredSteps = stepsAll.filter(isProgressStepConfigured);

    if (!configuredSteps.length) {
      setProgressVisible(false);
      label.innerHTML = renderGoalMessageHtml("Milestones not configured yet.");
      fill.style.width = "0%";
      dotsWrap.innerHTML = "";
      legends.innerHTML = "";

      const priming = !__SC_PRIMED_POPUPS__;
      if (priming) {
        LAST_DONE = 0;
        LAST_BXGY_DONE = bxgyCompleteNow;
        drawer.__sc_buy_completed_before = anyBuyCompletedNow;
        __SC_PRIMED_POPUPS__ = true;
      }
      return;
    }

    setProgressVisible(true);

    const stepCount = stepsAll.length;
    const isCartGoalProgress = stepsAll.some((step) => step?.rule?.isCartGoal);
    progressWrap.classList.toggle("sc-cart-goal-progress", isCartGoalProgress);
    document.documentElement.style.setProperty("--sc-stepcount", String(stepCount));

    const doneSteps = stepsAll.filter((ss) => isProgressStepDone(ss, subtotal));
    const doneCount = doneSteps.length;
    const nextPending = stepsAll.find(
      (ss) => isProgressStepConfigured(ss) && !isProgressStepDone(ss, subtotal)
    );

    let labelText = "";
    if (nextPending) {
      labelText =
        trimToNull(nextPending.progressTextBefore) ||
        trimToNull(nextPending.title) ||
        "";
    } else if (doneCount > 0) {
      const lastDone = doneSteps[doneCount - 1];
      labelText =
        trimToNull(lastDone.progressTextAfter) ||
        "🎉 Congrats! All rewards are unlocked!";
    }

    if (!labelText) {
      labelText =
        doneCount >= configuredSteps.length && !nextPending
          ? "🎉 Congrats! All rewards are unlocked!"
          : trimToNull(nextPending?.title) || "Add items to unlock rewards";
    }

    label.innerHTML = renderGoalMessageHtml(labelText);

    const fillPct = computeMixedFillPercent(stepsAll, subtotal);
    fill.style.width = `${fillPct}%`;

    const isDrawerOpen = drawer.classList.contains("open");

    const priming = !__SC_PRIMED_POPUPS__;
    if (priming) {
      LAST_DONE = doneCount;
      LAST_BXGY_DONE = bxgyCompleteNow;
      drawer.__sc_buy_completed_before = anyBuyCompletedNow;
      __SC_PRIMED_POPUPS__ = true;
    }

    let rewardPopupShown = false;

    if (isDrawerOpen && !priming) {
      const firstCompleted = buyStatuses.find((x) => x.complete);
      const wasBuyCompletedBefore = !!drawer.__sc_buy_completed_before;

      if (firstCompleted && !wasBuyCompletedBefore) {
        drawer.__sc_buy_completed_before = true;
        const popupShown = openRewardPopupFor({
          kind: "buyxgety",
          rule: firstCompleted.rule,
          ruleKey: firstCompleted.ruleKey,
          title: getDynamicOfferTitle(
            "buyxgety",
            firstCompleted.rule,
            true,
            trimToNull(firstCompleted.afterMsg) ||
            trimToNull(firstCompleted.currentMsg) ||
            "Buy X Get Y unlocked"
          ),
        });

        if (popupShown) {
          firePaperEffect(2800);
          rewardPopupShown = true;
        }
      } else if (bxgyCompleteNow && !LAST_BXGY_DONE) {
        if (bxgyNow) {
          openRewardPopupFor({
            kind: "bxgy",
            rule: bxgyNow.rule,
            ruleKey: bxgyNow.ruleKey,
            title: getDynamicOfferTitle(
              "bxgy",
              bxgyNow.rule,
              true,
              trimToNull(bxgyNow.afterMsg) ||
              trimToNull(bxgyNow.currentMsg) ||
              "Offer unlocked"
            ),
          });
        }

        firePaperEffect(2800);
        rewardPopupShown = true;
      }

      if (!anyBuyCompletedNow) drawer.__sc_buy_completed_before = false;
    }

    const stepCompletedNow = !priming && doneCount > LAST_DONE;
    if (stepCompletedNow && !rewardPopupShown) {
      firePaperEffect(2800);
      if (!isDrawerOpen) openDrawer();
    }

    LAST_DONE = doneCount;
    LAST_BXGY_DONE = bxgyCompleteNow;

    dotsWrap.innerHTML = stepsAll
      .map((ss, i) => {
        const isLast = i === stepCount - 1;
        const leftPct = isLast ? 100 : ((i + 1) / stepCount) * 100;
        const isDone = isProgressStepDone(ss, subtotal);
        const isActive = !isDone && nextPending?.slot === ss.slot;
        const cls = isDone ? "done" : isActive ? "active" : "";
        const belowText = trimToNull(ss.progressTextBelow) || trimToNull(ss.title);

        return `
          <div class="sc-dot-wrap ${cls} ${isLast ? "last" : ""}" style="left:${leftPct}%">
            <div class="sc-dot-bubble">${renderMilestoneIcon(ss.icon)}</div>
            <div class="sc-dot-text">${safe(belowText)}</div>
          </div>
        `;
      })
      .join("");

    if (window.lucide?.createIcons) {
      window.lucide.createIcons();
    }

    legends.innerHTML = "";

    stepsAll.forEach((st) => {
      const stepSlot = trimToNull(st?.slot);
      const stepGuardKey = stepSlot ? `step:${stepSlot}` : null;
      const isDone = isProgressStepDone(st, subtotal);

      if (!isDone && stepGuardKey) clearPopupShown("step", stepGuardKey);

      if (st.type === "free") {
        const slot = st.slot;
        if (!isDone && slot) {
          clearPopupShown("free", slot);
          scStore.del(keyAutoAdded("free", slot));
          scStore.del(keyPermFailed("free", slot));
        }
      }
    });
  };

  /* =========================================================
   ADD-TO-CART BAR
  ========================================================= */
  const ATC_DEFAULT_SETTINGS = {
    status: "active",
    mobileShowCondition: "notinview",
    mobileScrollDepth: 380,
    mobileStickyPosition: "bottom",
    mobileCtaAnimation: "pulse",
    mobileBgColor: "#ffffff",
    mobileTextColor: "#111827",
    mobileCtaBgColor: "#111827",
    mobileCtaTextColor: "#ffffff",
    mobileImageOutlineColor: "#e5e7eb",
    mobileShowProductImage: true,
    mobileShowProductTitle: true,
    mobileShowPrice: true,
    mobileShowCompareAtPrice: true,
    mobileShowQuantity: true,
    mobileShowVariantSelector: true,
    mobileShowVariantLabel: true,
    mobileShowPriceOnCta: true,
    mobileShowCompareAtPriceOnCta: true,
    desktopShowCondition: "notinview",
    desktopScrollDepth: 380,
    desktopStickyPosition: "bottom",
    desktopCtaAnimation: "pulse",
    desktopBgColor: "#ffffff",
    desktopTextColor: "#111827",
    desktopCtaBgColor: "#111827",
    desktopCtaTextColor: "#ffffff",
    desktopImageOutlineColor: "#e5e7eb",
    desktopShowProductImage: true,
    desktopShowProductTitle: true,
    desktopShowPrice: true,
    desktopShowCompareAtPrice: true,
    desktopShowQuantity: true,
    desktopShowVariantSelector: true,
    desktopShowVariantLabel: true,
    desktopShowPriceOnCta: true,
    desktopShowCompareAtPriceOnCta: true,
    ctaBehavior: "addToCart",
    afterAddToCart: "openCartWidget",
    desktopZIndex: 5000,
    mobileZIndex: 5000,
  };

  const isMobileViewport = () =>
    window.matchMedia?.("(max-width: 767px)")?.matches || window.innerWidth <= 767;

  const getAtcSettings = () => {
    const rawSettings = PROXY?.addToCartBarSettings || {};
    const settings = { ...ATC_DEFAULT_SETTINGS, ...rawSettings };
    if (String(settings.status || "active").toLowerCase() !== "active") return null;
    return settings;
  };

  const getAtcDeviceSettings = (settings) => {
    const mobile = isMobileViewport();
    const prefix = mobile ? "mobile" : "desktop";
    const bool = (key, fallback = true) =>
      settings?.[`${prefix}${key}`] == null
        ? fallback
        : to01(settings?.[`${prefix}${key}`]) === 1;
    const color = (key, fallback) => {
      const raw = settings?.[`${prefix}${key}`];
      return isValidCssColor(raw) ? raw : fallback;
    };

    return {
      mobile,
      showCondition: String(settings?.[`${prefix}ShowCondition`] || "scrollDown"),
      scrollDepth: Math.max(0, Number(settings?.[`${prefix}ScrollDepth`]) || 380),
      stickyPosition:
        String(settings?.[`${prefix}StickyPosition`] || "bottom").toLowerCase() === "top"
          ? "top"
          : "bottom",
      ctaAnimation: String(settings?.[`${prefix}CtaAnimation`] || "none").toLowerCase(),
      bgColor: color("BgColor", "#ffffff"),
      textColor: color("TextColor", "#111827"),
      ctaBgColor: color("CtaBgColor", "#111827"),
      ctaTextColor: color("CtaTextColor", "#ffffff"),
      imageOutlineColor: color("ImageOutlineColor", "#e5e7eb"),
      showProductImage: bool("ShowProductImage"),
      showProductTitle: bool("ShowProductTitle"),
      showPrice: bool("ShowPrice"),
      showCompareAtPrice: bool("ShowCompareAtPrice"),
      showQuantity: bool("ShowQuantity"),
      showVariantSelector: bool("ShowVariantSelector"),
      showVariantLabel: bool("ShowVariantLabel"),
      showPriceOnCta: bool("ShowPriceOnCta"),
      showCompareAtPriceOnCta: bool("ShowCompareAtPriceOnCta"),
      zIndex: Math.max(1, Number(settings?.[`${prefix}ZIndex`]) || 5000),
    };
  };

  const normalizeAtcImageUrl = (value) => {
    const raw = trimToNull(normalizeImage(value));
    if (!raw) return "";
    if (raw.startsWith("//")) return `${window.location.protocol}${raw}`;
    return raw;
  };

  const isHomePage = () => {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    const bodyClass = String(document.body?.className || "");
    return path === "/" || /\btemplate-index\b|\bindex-template\b/i.test(bodyClass);
  };

  const isCartAddAction = (action) => {
    const raw = trimToNull(action);
    if (!raw) return false;
    try {
      const url = new URL(raw, window.location.origin);
      const path = url.pathname.replace(/\/+$/, "").toLowerCase();
      return path.endsWith("/cart/add") || path.endsWith("/cart/add.js");
    } catch {
      const path = raw.split("?")[0].replace(/\/+$/, "").toLowerCase();
      return path.endsWith("/cart/add") || path.endsWith("/cart/add.js");
    }
  };

  const isAtcFormElement = (form) => {
    if (!(form instanceof HTMLFormElement)) return false;
    if (isCartAddAction(form.getAttribute("action") || form.action)) return true;
    // Dawn 2.0+ wraps forms in a <product-form> custom element
    if (form.closest("product-form, [data-product-form]")) return true;
    return Boolean(
      form.querySelector('[name="id"]') &&
      form.querySelector(
        'button[name="add"], input[name="add"], [data-add-to-cart], [data-ajax-cart-request-button], button[type="submit"]'
      )
    );
  };

  const getAtcProductForm = () => {
    const forms = Array.from(document.querySelectorAll("form")).filter(isAtcFormElement);
    return (
      forms.find((form) => {
        if (addToCartBar.contains(form)) return false;
        if (!form.querySelector('[name="id"]')) return false;
        const rect = form.getBoundingClientRect();
        const style = window.getComputedStyle(form);
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      }) ||
      forms.find((form) => form instanceof HTMLFormElement && !addToCartBar.contains(form) && form.querySelector('[name="id"]')) ||
      null
    );
  };

  const getAtcFormVariantId = () => {
    const form = getAtcProductForm();
    const field = form?.querySelector('[name="id"]');
    return trimToNull(field?.value);
  };

  const getAtcProductAddButton = () => {
    const form = getAtcProductForm();
    return (
      form?.querySelector('button[name="add"], input[name="add"], button[type="submit"], input[type="submit"]') ||
      document.querySelector('[data-add-to-cart], [data-ajax-cart-request-button]') ||
      null
    );
  };

  const isElementInViewport = (el) => {
    if (!(el instanceof Element)) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
  };

  const getAtcVariantId = (variant) =>
    normalizeVariantId(
      variant?.id ||
      variant?.variantId ||
      variant?.admin_graphql_api_id ||
      variant?.adminGraphqlApiId ||
      variant?.legacyResourceId
    );

  const getAtcVariantLabel = (variant, fallback = "Default") => {
    const raw =
      trimToNull(variant?.public_title) ||
      trimToNull(variant?.title) ||
      trimToNull(variant?.name) ||
      "";
    const label = raw.includes(" - ") ? raw.split(" - ").slice(1).join(" - ") : raw;
    if (label && label.toLowerCase() !== "default title") return label;
    const opts = Array.isArray(variant?.variantOptions) ? variant.variantOptions : [];
    const optText = opts
      .map((opt) => trimToNull(opt?.value))
      .filter(Boolean)
      .join(" / ");
    return optText || fallback;
  };

  const getAtcVariantPriceCents = (variant) => {
    if (variant?.priceCents != null) return normalizeCents(variant.priceCents);
    return priceToCents(variant?.price ?? variant?.variantPrice ?? variant?.price_amount);
  };

  const getAtcVariantCompareCents = (variant) => {
    const raw =
      variant?.compare_at_price ??
      variant?.compareAtPrice ??
      variant?.compareAtPriceAmount ??
      variant?.compare_at_price_amount;
    return priceToCents(raw);
  };

  const mapAtcVariant = (variant, product = null) => {
    const opts = Array.isArray(variant?.variantOptions) ? variant.variantOptions : [];
    const out = { ...variant, variantOptions: opts };
    opts.forEach((opt, idx) => {
      const key = `option${idx + 1}`;
      if (out[key] == null && opt?.value != null) out[key] = opt.value;
    });
    out.available = isVariantAvailable(out, product);
    return out;
  };

  const buildAtcProductFromProxy = () => {
    const product = PROXY?.addToCartBarProduct;
    if (!product) return null;
    const variants = normalizeProxyVariants(product.variants || []).map((variant) =>
      mapAtcVariant(variant, product)
    );
    const firstVariant = variants[0] || null;
    return {
      key: `proxy:${product.id || product.title || "home"}`,
      source: "proxy",
      title: trimToNull(product.title) || trimToNull(PROXY?.addToCartBarSettings?.homepageProductTitle) || "Product",
      image: normalizeAtcImageUrl(product.image || product.featured_image || product.images?.[0]),
      variants,
      defaultVariantId: getAtcVariantId(firstVariant),
      hasVariants: variants.length > 1 && !Boolean(product.has_only_default_variant),
    };
  };

  // Cache for product data fetched by handle (async fallback for themes without ShopifyAnalytics)
  const ATC_PAGE_PRODUCT_CACHE = { handle: null, product: null };

  const preloadAtcProductFromHandle = async () => {
    const m = window.location.pathname.match(/\/products\/([^/?#]+)/i);
    if (!m) return;
    const handle = m[1];
    if (ATC_PAGE_PRODUCT_CACHE.handle === handle) return;
    try {
      const res = await fetch(`/products/${encodeURIComponent(handle)}.js`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });
      if (!res.ok) return;
      const product = await res.json();
      if (product?.id && Array.isArray(product?.variants) && product.variants.length) {
        ATC_PAGE_PRODUCT_CACHE.handle = handle;
        ATC_PAGE_PRODUCT_CACHE.product = product;
        scheduleAddToCartBarRender(50);
      }
    } catch { }
  };

  const getShopifyAnalyticsProduct = () => {
    // Primary: standard ShopifyAnalytics / legacy meta object
    const fromAnalytics = window.ShopifyAnalytics?.meta?.product || window.meta?.product || null;
    if (fromAnalytics?.id && Array.isArray(fromAnalytics?.variants)) return fromAnalytics;
    if (fromAnalytics?.id) return fromAnalytics; // keep even without variants array

    // Fallback: embedded product JSON scripts (Dawn 2.0, Craft, etc.)
    const jsonSelectors = [
      '#product-json[type="application/json"]',
      '[data-product-json][type="application/json"]',
      'script[type="application/json"][id*="product"]',
    ];
    for (const sel of jsonSelectors) {
      try {
        const el = document.querySelector(sel);
        if (!el) continue;
        const parsed = JSON.parse(el.textContent || "{}");
        if (parsed?.id && Array.isArray(parsed?.variants)) return parsed;
      } catch { }
    }

    // Last resort: pre-loaded handle cache (populated by preloadAtcProductFromHandle)
    if (ATC_PAGE_PRODUCT_CACHE.product) return ATC_PAGE_PRODUCT_CACHE.product;

    return null;
  };

  const buildAtcProductFromPage = () => {
    const pathLooksProduct = /\/products\//i.test(window.location.pathname);
    const bodyLooksProduct = /\btemplate-product\b|\bproduct-template\b/i.test(
      String(document.body?.className || "")
    );
    const metaProduct = getShopifyAnalyticsProduct();
    const formVariantId = getAtcFormVariantId();

    if (!pathLooksProduct && !bodyLooksProduct && !metaProduct?.id) return null;
    if (!formVariantId && !Array.isArray(metaProduct?.variants)) return null;

    const metaVariants = Array.isArray(metaProduct?.variants) ? metaProduct.variants : [];
    const variants = metaVariants.map((variant) =>
      mapAtcVariant(
        {
          id: variant.id,
          title: variant.title || variant.public_title || variant.name,
          public_title: variant.public_title,
          price: variant.price,
          compare_at_price: variant.compare_at_price,
          option1: variant.option1,
          option2: variant.option2,
          option3: variant.option3,
          available: variant.available,
        },
        metaProduct
      )
    );

    if (formVariantId && !variants.some((variant) => getAtcVariantId(variant) === normalizeVariantId(formVariantId))) {
      variants.unshift(mapAtcVariant({ id: formVariantId, title: "Default Title" }, metaProduct));
    }

    const title =
      trimToNull(metaProduct?.title) ||
      trimToNull(document.querySelector('meta[property="og:title"]')?.getAttribute("content")) ||
      trimToNull(document.querySelector("h1")?.textContent) ||
      "Product";
    const image =
      normalizeAtcImageUrl(metaProduct?.featured_image) ||
      normalizeAtcImageUrl(document.querySelector('meta[property="og:image"]')?.getAttribute("content"));

    return {
      key: `page:${metaProduct?.id || title}`,
      source: "page",
      title,
      image,
      variants,
      defaultVariantId: normalizeVariantId(formVariantId) || getAtcVariantId(variants[0]),
      hasVariants: variants.length > 1,
    };
  };

  const getAtcProduct = () => {
    const pageProduct = buildAtcProductFromPage();
    if (pageProduct) return pageProduct;
    if (isHomePage()) return buildAtcProductFromProxy();
    return null;
  };

  const getAtcSelectedVariant = (product) => {
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    if (!variants.length) return null;

    const formVariantId = product?.source === "page" ? getAtcFormVariantId() : null;
    const desired =
      normalizeVariantId(formVariantId) ||
      normalizeVariantId(ADD_TO_CART_BAR_STATE.selectedVariantId) ||
      normalizeVariantId(product.defaultVariantId);
    const selected =
      variants.find((variant) => getAtcVariantId(variant) === desired) ||
      variants.find((variant) => isVariantAvailable(variant, product)) ||
      variants[0];

    ADD_TO_CART_BAR_STATE.selectedVariantId = getAtcVariantId(selected);
    return selected;
  };

  const shouldShowAtcBar = (deviceSettings, product) => {
    if (!product) return false;
    if (drawer.classList.contains("open")) return false;
    const condition = String(deviceSettings.showCondition || "scrollDown").toLowerCase();
    if (condition === "never") return false;
    if (condition === "always") return true;
    if (condition === "notinview") {
      if (product?.source !== "page") return true;
      const button = getAtcProductAddButton();
      return button ? !isElementInViewport(button) : true;
    }
    return window.scrollY >= Number(deviceSettings.scrollDepth || 0);
  };

  const hideAddToCartBar = () => {
    addToCartBar.classList.remove("sc-atc-open");
    addToCartBar.hidden = true;
    document.body.classList.remove("sc-atc-bottom-visible", "sc-atc-top-visible");
  };

  const setAddToCartBarMessage = (message, tone = "info", ttl = 3200) => {
    const msg = addToCartBar.querySelector("[data-sc-atc-msg]");
    if (!msg) return;
    msg.textContent = message || "";
    msg.className = `sc-atc-msg${message ? " show" : ""} ${tone === "error" ? "error" : "info"}`;
    if (ADD_TO_CART_BAR_STATE.messageTimer) clearTimeout(ADD_TO_CART_BAR_STATE.messageTimer);
    if (message && ttl > 0) {
      ADD_TO_CART_BAR_STATE.messageTimer = setTimeout(() => {
        msg.textContent = "";
        msg.className = "sc-atc-msg";
      }, ttl);
    }
  };

  const applyAtcCustomizations = (settings, product, variant) => {
    let style = document.getElementById("smartcartify-add-to-cart-bar-custom-css");
    if (!style) {
      style = document.createElement("style");
      style.id = "smartcartify-add-to-cart-bar-custom-css";
      document.head.appendChild(style);
    }
    style.textContent = trimToNull(settings?.customCss) || "";

    ADD_TO_CART_BAR_STATE.customJsKey = "";
  };

  const buildAtcBarHtml = ({ product, variant, settings, deviceSettings }) => {
    const currency = normalizeCurrencyCode();
    const qty = Math.max(1, Number(ADD_TO_CART_BAR_STATE.qty) || 1);
    const priceCents = getAtcVariantPriceCents(variant);
    const compareCents = getAtcVariantCompareCents(variant);
    const hasCompare =
      Number.isFinite(compareCents) &&
      Number.isFinite(priceCents) &&
      compareCents > priceCents;
    const totalPrice = Number.isFinite(priceCents) ? priceCents * qty : null;
    const totalCompare = hasCompare ? compareCents * qty : null;
    const ctaBase =
      String(settings?.ctaBehavior || "addToCart") === "buyNow" ? "Buy now" : "Add to cart";
    const ctaPrice =
      deviceSettings.showPriceOnCta && Number.isFinite(totalPrice)
        ? `<span class="sc-atc-btn-price">${safe(formatMoney(totalPrice, currency))}</span>`
        : "";
    const ctaCompare =
      deviceSettings.showCompareAtPriceOnCta && Number.isFinite(totalCompare)
        ? `<span class="sc-atc-btn-compare">${safe(formatMoney(totalCompare, currency))}</span>`
        : "";
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const selectedId = getAtcVariantId(variant);
    const showVariantSelector =
      deviceSettings.showVariantSelector && product.hasVariants && variants.length > 1;

    const imageHtml = deviceSettings.showProductImage
      ? `<div class="sc-atc-media">${product.image
        ? `<img src="${safe(product.image)}" alt="${safe(product.title)}" loading="lazy">`
        : `<span class="sc-atc-placeholder">${safe(String(product.title || "P").charAt(0).toUpperCase())}</span>`
      }</div>`
      : "";

    const variantHtml = showVariantSelector
      ? `<label class="sc-atc-variant">
          ${deviceSettings.showVariantLabel ? `<span class="sc-atc-variant-label">Variant</span>` : ""}
          <select class="sc-atc-select" data-sc-atc-variant>
            ${variants
        .map((item) => {
          const id = getAtcVariantId(item);
          const disabled = isVariantAvailable(item, product) ? "" : " disabled";
          const selected = id === selectedId ? " selected" : "";
          return `<option value="${safe(id || "")}"${selected}${disabled}>${safe(getAtcVariantLabel(item))}</option>`;
        })
        .join("")}
          </select>
        </label>`
      : "";

    return `
      <div class="sc-atc-inner">
        ${imageHtml}
        <div class="sc-atc-info">
          ${deviceSettings.showProductTitle ? `<p class="sc-atc-title">${safe(product.title)}</p>` : ""}
          <div class="sc-atc-meta">
            ${deviceSettings.showCompareAtPrice && hasCompare
        ? `<span class="sc-atc-compare">${safe(formatMoney(compareCents, currency))}</span>`
        : ""
      }
            ${deviceSettings.showPrice && Number.isFinite(priceCents)
        ? `<span class="sc-atc-price">${safe(formatMoney(priceCents, currency))}</span>`
        : ""
      }
            ${variantHtml}
          </div>
        </div>
        <div class="sc-atc-actions">
          ${deviceSettings.showQuantity
        ? `<div class="sc-atc-qty" aria-label="Quantity">
                  <button type="button" data-sc-atc-qty="dec" aria-label="Decrease quantity">-</button>
                  <input type="number" min="1" inputmode="numeric" value="${qty}" data-sc-atc-qty-input aria-label="Quantity">
                  <button type="button" data-sc-atc-qty="inc" aria-label="Increase quantity">+</button>
                </div>`
        : ""
      }
          <button type="button" class="sc-atc-submit" data-sc-atc-submit>
            <span>${safe(ctaBase)}</span>
            ${ctaCompare}
            ${ctaPrice}
          </button>
        </div>
        <p class="sc-atc-msg" data-sc-atc-msg></p>
      </div>
    `;
  };

  const renderAddToCartBar = () => {
    const settings = getAtcSettings();
    if (!settings) {
      hideAddToCartBar();
      return;
    }

    const deviceSettings = getAtcDeviceSettings(settings);
    const product = getAtcProduct();
    const variant = getAtcSelectedVariant(product);
    if (!product || !variant || !getAtcVariantId(variant)) {
      hideAddToCartBar();
      return;
    }

    const shouldShow = shouldShowAtcBar(deviceSettings, product);
    const position = deviceSettings.stickyPosition;
    const animation = ["pulse", "shake", "bounce"].includes(deviceSettings.ctaAnimation)
      ? deviceSettings.ctaAnimation
      : "none";

    addToCartBar.style.setProperty("--sc-atc-bg", deviceSettings.bgColor);
    addToCartBar.style.setProperty("--sc-atc-text", deviceSettings.textColor);
    addToCartBar.style.setProperty("--sc-atc-btn-bg", deviceSettings.ctaBgColor);
    addToCartBar.style.setProperty("--sc-atc-btn-text", deviceSettings.ctaTextColor);
    addToCartBar.style.setProperty("--sc-atc-image-border", deviceSettings.imageOutlineColor);
    addToCartBar.style.zIndex = String(deviceSettings.zIndex);
    addToCartBar.dataset.ctaAnimation = animation;
    addToCartBar.classList.toggle("sc-atc-position-top", position === "top");
    addToCartBar.classList.toggle("sc-atc-position-bottom", position !== "top");
    ["pulse", "shake", "bounce"].forEach((name) => {
      addToCartBar.classList.toggle(`sc-atc-anim-${name}`, animation === name);
    });

    const renderKey = JSON.stringify({
      product: product.key,
      variant: getAtcVariantId(variant),
      qty: ADD_TO_CART_BAR_STATE.qty,
      device: deviceSettings.mobile ? "mobile" : "desktop",
      position,
      animation,
      settingsUpdatedAt: settings.updatedAt || "",
      flags: [
        deviceSettings.showProductImage,
        deviceSettings.showProductTitle,
        deviceSettings.showPrice,
        deviceSettings.showCompareAtPrice,
        deviceSettings.showQuantity,
        deviceSettings.showVariantSelector,
        deviceSettings.showVariantLabel,
        deviceSettings.showPriceOnCta,
        deviceSettings.showCompareAtPriceOnCta,
      ].join("|"),
    });
    if (addToCartBar.dataset.renderKey !== renderKey) {
      addToCartBar.innerHTML = buildAtcBarHtml({ product, variant, settings, deviceSettings });
      addToCartBar.dataset.renderKey = renderKey;
    }

    ADD_TO_CART_BAR_STATE.productKey = product.key;
    ADD_TO_CART_BAR_STATE.product = product;
    ADD_TO_CART_BAR_STATE.variant = variant;
    ADD_TO_CART_BAR_STATE.settings = settings;
    ADD_TO_CART_BAR_STATE.deviceSettings = deviceSettings;

    applyAtcCustomizations(settings, product, variant);

    addToCartBar.hidden = !shouldShow;
    requestAnimationFrame(() => {
      addToCartBar.classList.toggle("sc-atc-open", shouldShow);
      document.body.classList.toggle("sc-atc-bottom-visible", shouldShow && position !== "top");
      document.body.classList.toggle("sc-atc-top-visible", shouldShow && position === "top");
    });
  };

  const scheduleAddToCartBarRender = (delay = 40) => {
    if (addToCartBarRenderTimer) clearTimeout(addToCartBarRenderTimer);
    addToCartBarRenderTimer = setTimeout(() => {
      addToCartBarRenderTimer = null;
      renderAddToCartBar();
    }, Math.max(0, Number(delay) || 0));
  };

  const addProductToCartFromBar = async () => {
    const product = ADD_TO_CART_BAR_STATE.product;
    const variant = ADD_TO_CART_BAR_STATE.variant;
    const settings = ADD_TO_CART_BAR_STATE.settings || getAtcSettings();
    const legacyId = getAtcVariantId(variant);
    if (!legacyId) {
      setAddToCartBarMessage("Select an available product option.", "error");
      return;
    }

    const qty = Math.max(1, Number(ADD_TO_CART_BAR_STATE.qty) || 1);
    addToCartBar.classList.add("sc-atc-loading");
    const submitBtn = addToCartBar.querySelector("[data-sc-atc-submit]");
    if (submitBtn) submitBtn.disabled = true;
    setAddToCartBarMessage("");

    try {
      invalidateCartCache();
      const body = new URLSearchParams();
      body.set("id", legacyId);
      body.set("quantity", String(qty));

      const res = await fetch("/cart/add.js", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body,
        credentials: "same-origin",
      });

      if (!res.ok) {
        let payload = null;
        let text = "";
        try {
          payload = await res.json();
        } catch {
          try {
            text = await res.text();
          } catch { }
        }
        const message =
          trimToNull(payload?.description) ||
          trimToNull(payload?.message) ||
          trimToNull(payload?.error) ||
          trimToNull(text) ||
          "Add to cart failed";
        throw new Error(message);
      }

      CART = await fetchCart({ force: true });
      PROXY = await fetchProxy(CART);
      renderAllFromCache();

      if (String(settings?.ctaBehavior || "addToCart") === "buyNow") {
        const codeToApply = getCheckoutDiscountCode();
        window.location.href = codeToApply ? `/checkout?discount=${encodeURIComponent(codeToApply)}` : "/checkout";
        return;
      }

      const after = String(settings?.afterAddToCart || "openCartWidget");
      if (after === "goToCheckout") {
        const codeToApply = getCheckoutDiscountCode();
        window.location.href = codeToApply ? `/checkout?discount=${encodeURIComponent(codeToApply)}` : "/checkout";
        return;
      }
      if (after === "openCartWidget") {
        openDrawer();
        renderAllFromCache();
        return;
      }
      if (after === "showNotification") {
        setAddToCartBarMessage(`${product?.title || "Item"} added to cart.`, "info");
      }
    } catch (err) {
      const message = trimToNull(err?.message) || "Add to cart failed";
      setAddToCartBarMessage(message, isQuantityLimitMessage(message) ? "info" : "error", 4200);
      console.error("[SmartCartify] add-to-cart bar add failed:", err);
    } finally {
      addToCartBar.classList.remove("sc-atc-loading");
      if (submitBtn) submitBtn.disabled = false;
      scheduleAddToCartBarRender(120);
    }
  };

  addToCartBar.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-sc-atc-submit]")) {
      e.preventDefault();
      void addProductToCartFromBar();
      return;
    }
    const qtyAction = target.closest("[data-sc-atc-qty]");
    if (qtyAction) {
      const action = qtyAction.getAttribute("data-sc-atc-qty");
      const current = Math.max(1, Number(ADD_TO_CART_BAR_STATE.qty) || 1);
      ADD_TO_CART_BAR_STATE.qty = action === "dec" ? Math.max(1, current - 1) : current + 1;
      renderAddToCartBar();
    }
  });

  addToCartBar.addEventListener("change", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (target.matches("[data-sc-atc-variant]")) {
      ADD_TO_CART_BAR_STATE.selectedVariantId = target.value;
      renderAddToCartBar();
      return;
    }
    if (target.matches("[data-sc-atc-qty-input]")) {
      ADD_TO_CART_BAR_STATE.qty = Math.max(1, Number(target.value) || 1);
      renderAddToCartBar();
    }
  });

  addToCartBar.addEventListener("input", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (target.matches("[data-sc-atc-qty-input]")) {
      ADD_TO_CART_BAR_STATE.qty = Math.max(1, Number(target.value) || 1);
    }
  });

  window.addEventListener("scroll", () => scheduleAddToCartBarRender(20), { passive: true });
  window.addEventListener("resize", () => scheduleAddToCartBarRender(80));
  ["variant:change", "variantChange", "product:variant-change", "cart:updated", "cart:change"].forEach((eventName) => {
    document.addEventListener(eventName, () => scheduleAddToCartBarRender(60), true);
  });
  document.addEventListener("change", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (isAtcFormElement(target.closest("form"))) scheduleAddToCartBarRender(60);
  }, true);

  const renderAllFromCache = () => {
    if (!PROXY || !CART) return;
    if (STATIC_FRONTEND_CART_DESIGN) {
      renderStaticFrontendCart();
      return;
    }
    setDiscountMessage("");
    applyStyleSettings(PROXY?.styleSettings);
    renderCart();
    renderUpsellSection();
    renderProgress();
    refreshAnnouncementFromRules();
    renderAddToCartBar();
    LAST_CART_SIG = getCartSignature(CART);
    // Defer analytics + cleanup so they don't block the visible paint
    const deferred = () => {
      recordVisibleRuleImpressions();
      maybeShowAppliedDiscountCodePopup();
      void maybeRemoveInvalidDiscountCodes();
      void maybeRemoveUnapprovedDiscountCodes();
    };
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(deferred, { timeout: 2000 });
    } else {
      setTimeout(deferred, 100);
    }
  };

  /* =========================================================
   ✅ PRELOAD + REFRESH
  ========================================================= */
  const preload = async () => {
    try {
      void preloadAtcProductFromHandle(); // fire-and-forget; result used by getShopifyAnalyticsProduct fallback
      setProgressLoading(true);
      // Fire cart + proxy simultaneously — proxy server ignores subtotal/quantity,
      // so passing an empty cart is fine and saves one full sequential round-trip.
      const [cartRes, proxyRes] = await Promise.allSettled([
        fetchCart(),
        fetchProxy(),
      ]);
      CART = cartRes.status === "fulfilled" ? cartRes.value : (CART || null);
      PROXY =
        proxyRes.status === "fulfilled"
          ? proxyRes.value
          : { ok: true, _proxyError: proxyRes.reason };

      if (proxyRes.status !== "fulfilled") {
        console.warn(
          "[SmartCartify] Proxy preload failed; continuing without proxy data.",
          proxyRes.reason
        );
      }

      logProxyTables(PROXY);

      await enforceRewardValidity();

      let pendingDiscountCode = null;
      try {
        pendingDiscountCode = trimToNull(sessionStorage.getItem("__SC_LAST_APPLIED_CODE__"));
      } catch { }

      if (pendingDiscountCode && isDiscountAppliedInCart(pendingDiscountCode)) {
        discountPopupShownForCode = String(pendingDiscountCode).toLowerCase();
      }

      applyStyleSettings(PROXY?.styleSettings);
      renderAllFromCache();

      if (pendingDiscountCode) {
        try {
          sessionStorage.removeItem("__SC_LAST_APPLIED_CODE__");
        } catch { }
      }

      if (pendingDiscountCode && isDiscountAppliedInCart(pendingDiscountCode)) {
        openDrawer();

        const r = (CODE_DISCOUNT_RULES || []).find(
          (x) =>
            String(x?.discountCode || x?.discount_code || x?.code || "").toLowerCase() ===
            String(pendingDiscountCode).toLowerCase()
        );

        const txt = r
          ? replaceProgressText({
            text: getProgressAfter(r) || "",
            type: "discount",
            rule: r,
            subtotalRupees: (Number(CART?.items_subtotal_price || 0) / priceDivisor()) || 0,
            useRemainingForGoal: false,
          })
          : `Discount applied: ${pendingDiscountCode}`;

        firePaperEffect(2800);
        showCenterCelebratePopup("Discount Applied ✅", txt, 5000);
      }
    } catch (e) {
      console.error("[SmartCartify] Preload failed:", e);
      renderFallback(`Unable to load data: ${safe(e?.message || "Unknown error")}`);
    } finally {
      setProgressLoading(false);
    }
  };

  let refreshTimer = null;
  const refreshFromNetwork = async () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    return new Promise((resolve) => {
      refreshTimer = setTimeout(async () => {
        try {
          setProgressLoading(true);
          CART = await fetchCart({ force: true });
          PROXY = await fetchProxy(CART);

          await enforceRewardValidity();
          await maybeRemoveInvalidDiscountCodes();
          renderAllFromCache();
        } catch (e) {
          console.error(e);
        } finally {
          setProgressLoading(false);
          resolve();
        }
      }, 60);
    });
  };

  const openAndRefreshDrawer = async () => {
    try {
      const shouldAutoOpen = PROXY?.styleSettings?.drawerAutoOpen !== false;
      if (shouldAutoOpen) openDrawer();
      await refreshFromNetwork();
      renderAllFromCache();
    } catch (e) {
      console.error("[SmartCartify] auto open failed:", e);
    }
  };

  /* =========================================================
   ✅ ADD-TO-CART INTERCEPT
  ========================================================= */
  function isAddToCartForm(el) {
    if (!el) return false;
    if (isAtcFormElement(el)) return true;
    const f = el.closest?.("form");
    return isAtcFormElement(f);
  }

  function isAddToCartBtn(el) {
    if (!el) return false;
    if (el.matches?.('button[name="add"], input[name="add"]')) return true;
    if (el.matches?.("[data-add-to-cart], [data-ajax-cart-request-button]")) return true;
    if (el.matches?.("button[type='submit'], input[type='submit']") && isAddToCartForm(el)) return true;
    return false;
  }

  document.addEventListener(
    "click",
    async (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;

      const btn = t.closest(
        'button[name="add"], input[name="add"], button[type="submit"], input[type="submit"], [data-add-to-cart], [data-ajax-cart-request-button]'
      );
      if (!btn) return;
      if (!isAddToCartBtn(btn)) return;

      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();

      const form = btn.closest('form[action^="/cart/add"]');
      if (!form) {
        await openAndRefreshDrawer();
        return;
      }

      try {
        setProgressLoading(true);

        const fd = new FormData(form);
        if (!fd.has("quantity")) fd.set("quantity", "1");

        const rr = await fetch("/cart/add.js", {
          method: "POST",
          headers: { Accept: "application/json" },
          body: fd,
          credentials: "same-origin",
        });
        if (!rr.ok) {
          let payload = null;
          let text = "";
          try {
            payload = await rr.json();
          } catch {
            try {
              text = await rr.text();
            } catch { }
          }
          const addErrMessage =
            trimToNull(payload?.description) ||
            trimToNull(payload?.message) ||
            trimToNull(payload?.error) ||
            trimToNull(text) ||
            "Add to cart failed";
          openDrawer();
          if (shouldSuppressCartActionMessage(addErrMessage)) {
            showCartActionMessage("");
          } else {
            showCartActionMessage(addErrMessage, "error");
          }
          throw new Error(addErrMessage);
        }

        await openAndRefreshDrawer();
      } catch (err) {
        console.error("[SmartCartify] click intercept add failed:", err);
        const errMsg = trimToNull(err?.message) || "";
        if (isQuantityLimitMessage(errMsg)) return;
        try {
          form.submit();
        } catch { }
      } finally {
        setProgressLoading(false);
      }
    },
    true
  );

  /* =========================================================
   ✅ CART REFRESH WATCH (no global fetch/xhr monkey-patching)
  ========================================================= */
  let passiveRefreshTimer = null;
  const schedulePassiveRefresh = (delay = 120) => {
    if (!drawer.classList.contains("open")) return;
    if (passiveRefreshTimer) clearTimeout(passiveRefreshTimer);
    passiveRefreshTimer = setTimeout(async () => {
      passiveRefreshTimer = null;
      try {
        CART = await fetchCart({ force: true });
        await enforceRewardValidity();
        if (drawer.classList.contains("open")) {
          const nextSig = getCartSignature(CART);
          if (nextSig !== LAST_CART_SIG) renderAllFromCache();
        }
      } catch (err) {
        console.error("[SmartCartify] passive cart refresh failed:", err);
      }
    }, Math.max(40, Number(delay) || 120));
  };

  /* =========================================================
   ✅ DRAWER ITEM ACTIONS
  ========================================================= */
  drawer.addEventListener("click", async (e) => {
    const el = e.target;
    if (!(el instanceof Element)) return;
    if (el.closest("[data-sc-cart-msg-close]")) {
      showCartActionMessage("");
      return;
    }
    const item = el.closest(".sc-item");
    if (!item) return;
    const line = Number(item.getAttribute("data-line"));
    if (!line) return;

    // Prevent qty/remove actions on reward items (free gifts, BXGY gifts)
    const cartItem = Array.isArray(CART?.items) ? CART.items[line - 1] : null;
    const itemProps = cartItem?.properties || {};
    const isRewardItem =
      String(itemProps?.[FREE_GIFT_PROPERTY] || "").trim().toLowerCase() === "true" ||
      String(itemProps?.[BXGY_GIFT_PROPERTY] || "").trim().toLowerCase() === "true";
    if (isRewardItem) {
      if (el.matches('[data-remove="1"]') || el.closest?.('[data-remove="1"]')) {
        await applyLineQuantityChange(line, 0);
      }
      return;
    }

    const input = item.querySelector('input[data-qty="input"]');
    const current = Number(input?.value || 0);
    try {
      if (el.matches('[data-qty="inc"]')) {
        await applyLineQuantityChange(line, current + 1);
        return;
      }
      if (el.matches('[data-qty="dec"]')) {
        await applyLineQuantityChange(line, Math.max(0, current - 1));
        return;
      }
      if (el.matches('[data-remove="1"]') || el.closest?.('[data-remove="1"]')) {
        await applyLineQuantityChange(line, 0);
      }
    } catch (err) {
      console.error(err);
    }
  });

  drawer.addEventListener("change", async (e) => {
    const el = e.target;
    if (!(el instanceof Element)) return;
    if (!el.matches('input[data-qty="input"]')) return;
    const item = el.closest(".sc-item");
    const line = Number(item?.getAttribute("data-line"));
    if (!line) return;
    const qty = Math.max(0, Number(el.value || 0));
    try {
      await applyLineQuantityChange(line, qty);
    } catch (err) {
      console.error(err);
    }
  });

  $("[data-checkout]")?.addEventListener("click", async () => {
    recordCompletedRuleConversions();

    await maybeRemoveInvalidDiscountCodes();

    const codeToApply = getCheckoutDiscountCode();

    if (codeToApply) {
      window.location.href =
        `/discount/${encodeURIComponent(codeToApply)}?redirect=${encodeURIComponent("/checkout")}`;
      return;
    }

    window.location.href = "/checkout";
  });

  /* =========================================================
   ✅ OPEN BUTTONS
  ========================================================= */
  const ensureOpenButton = () => {
    if (!document.querySelector("[data-smart-cartify-fallback-open]")) {
      const fallbackBtn = document.createElement("button");
      fallbackBtn.type = "button";
      fallbackBtn.className = "sc-mobile-open-fallback";
      fallbackBtn.setAttribute("data-smart-cartify-fallback-open", "");
      fallbackBtn.setAttribute("aria-label", "Open cart");
      setCartIconMarkup(fallbackBtn);
      document.body.appendChild(fallbackBtn);
    }
    const horizonCart = document.querySelector("cart-drawer-component");
    if (horizonCart) {
      const horizonBtn = horizonCart.querySelector(
        'button.header-actions__action, button[aria-label*="cart" i]'
      );
      const cartIcon = horizonCart.querySelector("cart-icon");
      const svgWrap = cartIcon?.querySelector(".svg-wrapper");
      const targetBtn = horizonBtn || cartIcon?.closest("button");
      if (targetBtn) {
        targetBtn.setAttribute("data-smart-cartify-open", "");
        targetBtn.classList.add("my-cart-icon");
        if (svgWrap) setCartIconMarkup(svgWrap);
        else setCartIconMarkup(targetBtn);
        return;
      }
    }
    if (document.querySelector("[data-smart-cartify-open]")) return;
    let header = document.querySelector("header");
    if (!header) {
      header = document.createElement("header");
      document.body.insertAdjacentElement("afterbegin", header);
    }
    const iconWrap =
      header.querySelector(
        ".header__icons, .site-header__icons, .header-icons, .site-header__icon-wrapper, .header__icon-wrapper, .header__icons-wrapper"
      ) ||
      header;
    const cartCandidate =
      iconWrap.querySelector(
        'a[href="/cart"], a[href="/cart/"], a[href*="/cart"], [data-cart], [data-cart-icon], [data-header-cart], .header__icon--cart, .site-header__cart, .cart-link, .cart-icon'
      );
    const btn = cartCandidate || document.createElement("a");
    btn.setAttribute("data-smart-cartify-open", "");
    btn.classList.add("my-cart-icon");
    if (btn.tagName.toLowerCase() === "a") btn.setAttribute("href", "#");
    setCartIconMarkup(btn);
    if (!cartCandidate) iconWrap.appendChild(btn);
  };

  const syncMobileOpenFallback = () => {
    const hasVisibleOpenButton = Array.from(
      document.querySelectorAll("[data-smart-cartify-open]")
    ).some((btn) => {
      if (!(btn instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(btn);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number(style.opacity || 1) === 0
      ) {
        return false;
      }
      const rect = btn.getBoundingClientRect();
      return rect.width > 4 && rect.height > 4 && rect.bottom > 0 && rect.right > 0;
    });
    document.body.classList.toggle("sc-no-visible-cart-open", !hasVisibleOpenButton);
  };

  const bindOpenButtons = () => {
    document
      .querySelectorAll("[data-smart-cartify-open], [data-smart-cartify-fallback-open]")
      .forEach((btn) => {
        if (btn.__scBound) return;
        btn.__scBound = true;
        const openFromEvent = async (e, markPointer = false) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          if (markPointer) btn.__scPointerOpened = Date.now();
          openDrawer();
          await refreshFromNetwork();
          renderAllFromCache();
        };
        btn.addEventListener(
          "pointerdown",
          (e) => {
            openFromEvent(e, true);
          },
          true
        );
        btn.addEventListener(
          "click",
          async (e) => {
            if (btn.__scPointerOpened && Date.now() - btn.__scPointerOpened < 500) {
              btn.__scPointerOpened = 0;
              return;
            }
            await openFromEvent(e, false);
          },
          true
        );
      });
  };

  function queueOpenButtonBind() {
    if (bindQueued) return;
    bindQueued = true;
    requestAnimationFrame(() => {
      bindQueued = false;
      ensureOpenButton();
      bindOpenButtons();
      syncMobileOpenFallback();
      syncOpenButtonBadge(Number(CART?.item_count || 0));
    });
  }

  function startOpenButtonObserver() {
    if (openButtonsObserver || drawer.classList.contains("open")) return;
    openButtonsObserver = new MutationObserver(queueOpenButtonBind);
    openButtonsObserver.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  function stopOpenButtonObserver() {
    if (!openButtonsObserver) return;
    openButtonsObserver.disconnect();
    openButtonsObserver = null;
  }

  queueOpenButtonBind();
  startOpenButtonObserver();

  const passiveCartEvents = [
    "cart:refresh",
    "cart:updated",
    "cart:change",
    "ajaxProduct:added",
    "product:added",
  ];

  passiveCartEvents.forEach((eventName) => {
    document.addEventListener(
      eventName,
      () => {
        schedulePassiveRefresh(100);
      },
      true
    );
  });

  window.addEventListener("resize", () => {
    queueOpenButtonBind();
  });

  window.addEventListener("pagehide", () => {
    stopOpenButtonObserver();
    if (passiveRefreshTimer) {
      clearTimeout(passiveRefreshTimer);
      passiveRefreshTimer = null;
    }
    const themeObs = window.__SC_DISABLE_DRAWER_OBSERVER_REF__;
    if (themeObs && typeof themeObs.disconnect === "function") {
      try {
        themeObs.disconnect();
      } catch { }
      window.__SC_DISABLE_DRAWER_OBSERVER_REF__ = null;
    }
  });

  preload();
})();
