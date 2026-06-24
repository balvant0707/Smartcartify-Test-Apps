﻿(() => {
  /* =========================================================
   GLOBAL GUARD (avoid duplicate load / redeclare errors)
  ========================================================= */
  if (window.__SMARTCARTIFY_CARTDRAWER_V27__) return;
  window.__SMARTCARTIFY_CARTDRAWER_V27__ = true;

  const root = document.getElementById("smart-embed-root");
  if (!root) return;// (C) BuyXGetY (bxgyrule)

  // ✅ Requested DB table logs only
  const DEBUG_TABLES = true;

  // ✅ App proxy path (prefer embed data, fallback to /apps/smart)
  let proxyPath = root.dataset.proxyPath || "/apps/smart";
  proxyPath = String(proxyPath || "").trim();
  if (proxyPath && !/^https?:\/\//i.test(proxyPath) && !proxyPath.startsWith("/")) {
    proxyPath = `/${proxyPath}`;
  }
  if (proxyPath.endsWith("/")) proxyPath = proxyPath.slice(0, -1);
  const directProxyPath = "https://smartcartify-test-apps.vercel.app/proxy/smart";
  const shopDomain = String(window.Shopify?.shop || root.dataset.shop || "").trim();
  const customerLoggedIn = String(root.dataset.customerLoggedIn || "false") === "true";
  const customerTags = String(root.dataset.customerTags || "");
  const storefrontLocale =
    String(root.dataset.locale || window.Shopify?.locale || navigator.language || "")
      .trim();

  const buildProxyUrl = (cart = CART, path = proxyPath) => {
    const base = new URL(path, window.location.origin);
    const subtotalRupees = (Number(cart?.items_subtotal_price || 0) / priceDivisor()) || 0;
    const quantity = Number(cart?.item_count || 0) || getCartTotalQty();
    base.searchParams.set("subtotal", String(subtotalRupees));
    base.searchParams.set("quantity", String(quantity));
    if (shopDomain && /^https?:\/\//i.test(String(path || ""))) {
      base.searchParams.set("shop", shopDomain);
      base.searchParams.set("_sc_direct", "1");
    }
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
    return /^https?:\/\//i.test(String(path || "")) ? base.href : `${base.pathname}${base.search}`;
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
    discount: `<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M12.78 8.28a.75.75 0 0 0-1.06-1.06l-4.5 4.5a.75.75 0 1 0 1.06 1.06l4.5-4.5Z"></path><path d="M9 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path><path d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"></path><path fill-rule="evenodd" d="M12.094 3.514c-.822-1.79-3.366-1.79-4.188 0a.804.804 0 0 1-1.011.42c-1.848-.686-3.647 1.113-2.962 2.96a.804.804 0 0 1-.419 1.012c-1.79.822-1.79 3.366 0 4.188a.805.805 0 0 1 .42 1.011c-.686 1.848 1.113 3.647 2.96 2.962a.805.805 0 0 1 1.012.419c.822 1.79 3.366 1.79 4.188 0a.805.805 0 0 1 1.011-.42c1.848.686 3.647-1.113 2.962-2.96a.805.805 0 0 1 .419-1.012c1.79-.822 1.79-3.366 0-4.188a.805.805 0 0 1-.42-1.011c.686-1.848-1.113-3.647-2.96-2.962a.805.805 0 0 1-1.012-.419Zm-2.825.626a.804.804 0 0 1 1.462 0 2.304 2.304 0 0 0 2.896 1.2.804.804 0 0 1 1.034 1.034 2.304 2.304 0 0 0 1.199 2.895.804.804 0 0 1 0 1.462 2.304 2.304 0 0 0-1.2 2.896.805.805 0 0 1-1.034 1.034 2.304 2.304 0 0 0-2.895 1.199.804.804 0 0 1-1.462 0 2.304 2.304 0 0 0-2.896-1.2.804.804 0 0 1-1.033-1.034 2.305 2.305 0 0 0-1.2-2.895.804.804 0 0 1 0-1.462 2.304 2.304 0 0 0 1.2-2.896.804.804 0 0 1 1.033-1.033 2.304 2.304 0 0 0 2.896-1.2Z"></path></svg>`,
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
  let CART_GOAL_BONUS_INDEX = 0;
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
  const FORCE_CART_OFFER_TABS = true;
  let ACTIVE_DRAWER_TAB = "cart";
  const STATIC_FRONTEND_CART_DESIGN = false;
  const STATIC_CART_DRAWER_DESIGN = false;
  const MANUAL_DISCOUNT_CODE_KEY = "__SC_MANUAL_DISCOUNT_CODE__";

  let __SC_PRIMED_POPUPS__ = false;
  // Free product rewards use the selectable gift popup when a milestone completes.
  const DISABLE_FREE_REWARD_POPUP = true;
  const DISABLE_REWARD_SUCCESS_POPUPS = false;

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

  const listFromUnknown = (value) => {
    if (value == null || value === "") return [];
    if (Array.isArray(value)) return value.flatMap((item) => listFromUnknown(item));
    if (typeof value === "object") {
      const direct =
        value.value ??
        value.name ??
        value.tag ??
        value.title ??
        value.id ??
        value.label ??
        null;
      if (direct != null) return listFromUnknown(direct);
      return Object.values(value).flatMap((item) => listFromUnknown(item));
    }

    const raw = String(value).trim();
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (parsed !== raw) return listFromUnknown(parsed);
    } catch { }

    return raw
      .split(/[,\n|;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const normalizeCustomerTag = (tag) =>
    String(tag ?? "")
      .trim()
      .toLowerCase();

  const storefrontCustomerTags = new Set(
    listFromUnknown(customerTags).map(normalizeCustomerTag).filter(Boolean)
  );

  const getRuleCustomerTags = (rule) =>
    listFromUnknown(
      rule?.customerTags ??
      rule?.customer_tags ??
      rule?.targetCustomerTags ??
      rule?.target_customer_tags ??
      rule?.includeCustomerTags ??
      rule?.include_customer_tags ??
      rule?.tags ??
      rule?.customerTag ??
      ""
    ).map(normalizeCustomerTag).filter(Boolean);

  const getRuleExcludedCustomerTags = (rule) =>
    listFromUnknown(
      rule?.excludeCustomerTags ??
      rule?.exclude_customer_tags ??
      rule?.excludedCustomerTags ??
      rule?.excluded_customer_tags ??
      ""
    ).map(normalizeCustomerTag).filter(Boolean);

  const ruleMatchesCustomerTarget = (rule) => {
    if (!rule) return false;

    const excludedTags = getRuleExcludedCustomerTags(rule);
    if (excludedTags.length && excludedTags.some((tag) => storefrontCustomerTags.has(tag))) {
      return false;
    }

    const ruleTags = getRuleCustomerTags(rule);
    const hasMatchingTag = !ruleTags.length || ruleTags.some((tag) => storefrontCustomerTags.has(tag));
    const rawTarget =
      rule?.customerTarget ??
      rule?.customer_target ??
      rule?.targetCustomers ??
      rule?.target_customers ??
      rule?.targetAudience ??
      rule?.customerEligibility ??
      rule?.customer_eligibility ??
      rule?.customerType ??
      "";
    const target = String(rawTarget || "")
      .trim()
      .toLowerCase()
      .replace(/[_\s-]+/g, "");

    if (!target || ["all", "allcustomers", "everyone", "any", "anyone"].includes(target)) {
      return hasMatchingTag;
    }

    if (["guest", "guests", "loggedout", "notloggedin", "anonymous"].includes(target)) {
      return !customerLoggedIn;
    }

    if (["loggedin", "login", "customers", "customer", "registered"].includes(target)) {
      return customerLoggedIn && hasMatchingTag;
    }

    if (
      target.includes("tag") ||
      target.includes("segment") ||
      target.includes("specific") ||
      target.includes("selected")
    ) {
      return customerLoggedIn && ruleTags.length > 0 && hasMatchingTag;
    }

    return hasMatchingTag;
  };

  const getRulePriority = (rule) => {
    const value =
      rule?.priority ??
      rule?.rulePriority ??
      rule?.rule_priority ??
      rule?.sortOrder ??
      rule?.sort_order ??
      0;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const compareRulesByCustomerPriority = (a, b) => {
    const priorityDiff = getRulePriority(b) - getRulePriority(a);
    if (priorityDiff) return priorityDiff;
    const bUpdated = new Date(b?.updatedAt || b?.updated_at || 0).getTime() || 0;
    const aUpdated = new Date(a?.updatedAt || a?.updated_at || 0).getTime() || 0;
    if (bUpdated !== aUpdated) return bUpdated - aUpdated;
    return Number(b?.id || b?.ruleId || 0) - Number(a?.id || a?.ruleId || 0);
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

  const stripCampaignAmountDecimals = (text) =>
    String(text ?? "").replace(/\b(\d{1,3}(?:,\d{3})*|\d+)\.\d+\b/g, "$1");

  const formatCampaignMoney = (cents, currency = null) => {
    const shopCurrency = currency || window.Shopify?.currency?.active || "USD";
    const amount = (Number(cents) || 0) / priceDivisor(shopCurrency);
    const wholeAmount = amount < 0 ? Math.ceil(amount) : Math.floor(amount);
    const locale = window.Shopify?.locale || navigator.language || "en-US";
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: shopCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(wholeAmount);
    } catch {
      return `${shopCurrency} ${wholeAmount}`;
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
    if (!hasAny) return ruleMatchesCustomerTarget(rule);

    if (typeof rule.status === "string") {
      const st = rule.status.trim().toLowerCase();
      if (["active", "enabled", "on", "published", "true", "1"].includes(st)) {
        return ruleMatchesCustomerTarget(rule);
      }
      if (["inactive", "disabled", "off", "draft", "false", "0"].includes(st)) {
        return false;
      }
    }

    for (const c of candidates) {
      if (c === undefined || c === null) continue;
      if (to01(c) === 1) return ruleMatchesCustomerTarget(rule);
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
      current: (getRuleProgressSubtotalCents(type, rule) / priceDivisor(CART?.currency)) || 0,
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
      const money = formatCampaignMoney(
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
          : formatCampaignMoney(amountToCurrencyMinorUnits(goalValue), CART?.currency);
    const remainingText =
      remainingValue == null
        ? ""
        : isQuantity
          ? formatQuantityGoal(remainingValue)
          : formatCampaignMoney(amountToCurrencyMinorUnits(remainingValue), CART?.currency);

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
    return stripCampaignAmountDecimals(stripCurrencySymbolIfCodePresent(normalized, CART?.currency));
  };

  const renderGoalMessageHtml = (message) => {
    const raw = stripCampaignAmountDecimals(message);
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

  const isDefaultCartGoalShippingGoal = (goal) => {
    if (normalizeCartGoalRewardType(goal) !== "shipping") return false;

    const hasShopifyDiscount =
      trimToNull(goal?.shopifyDiscountId) ||
      trimToNull(goal?.shopify_discount_id) ||
      trimToNull(goal?.discountId) ||
      trimToNull(goal?.discount_id);
    if (hasShopifyDiscount) return false;

    const title = String(
      goal?.title ??
      goal?.cartGoalTitle ??
      goal?.goalTitle ??
      goal?.previewLabel ??
      ""
    )
      .trim()
      .toLowerCase();

    return !title || title === "free shipping" || title === "free shipping!";
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

  const normalizeSelectionId = (value) => {
    const raw = trimToNull(value);
    if (!raw) return null;
    return gidToId(raw) || raw;
  };

  const getUpsellSettings = () => {
    const raw = PROXY?.upsellSettings || {};
    return {
      enabled: to01(raw.enabled) === 1,
      showAsSlider: to01(raw.showAsSlider) === 1,
      autoplay: to01(raw.autoplay) === 1,
      recommendationMode: String(raw.recommendationMode || "auto").toLowerCase(),
      selectionType: String(raw.selectionType || raw.selection_type || "").toLowerCase(),
      sectionTitle: pickTextAny(raw, ["sectionTitle", "title"], "You'll love these"),
      buttonText: pickTextAny(raw, ["buttonText"], "add"),
      buttonColor: pickColor(raw, ["buttonColor", "button"], "#4343d0"),
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

  const getUpsellCompareAtCents = (item, variant = null, priceCents = null) => {
    const candidates = [
      variant?.compare_at_price,
      variant?.compareAtPrice,
      variant?.compare_at,
      variant?.compareAt,
      variant?.compare_price,
      variant?.comparePrice,
      variant?.compareAtPriceV2?.amount,
      item?.compareAtPriceCents,
      item?.compareAtPrice,
      item?.compare_at_price,
      item?.compareAt,
      item?.compare_price,
      item?.comparePrice,
    ];

    let compareCents = null;
    for (const raw of candidates) {
      if (raw == null || raw === "") continue;
      compareCents = typeof raw === "number" && item?.priceIsCents
        ? normalizeCents(raw)
        : priceToCentsFromItem(raw, item);
      if (compareCents != null) break;
    }

    const saleCents = priceCents != null
      ? normalizeCents(priceCents)
      : normalizeCents(item?.priceCents);

    return compareCents != null && saleCents != null && compareCents > saleCents
      ? compareCents
      : null;
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
      const compareRaw =
        p?.variantCompareAtPrice ??
        p?.variant_compare_at_price ??
        p?.compareAtPrice ??
        p?.compare_at_price ??
        p?.compareAt ??
        p?.compare_price ??
        firstVariant?.compare_at_price ??
        firstVariant?.compareAtPrice ??
        firstVariant?.compare_at ??
        firstVariant?.compareAt ??
        firstVariant?.compare_price ??
        firstVariant?.compareAtPriceV2?.amount ??
        null;
      const compareAtPriceCents = priceToCents(compareRaw);
      return {
        title: safe(p?.title || "Product"),
        price:
          priceCents != null ? formatMoney(priceCents, currency) : formatMoney(2500, currency),
        priceCents: priceCents != null ? priceCents : null,
        compareAtPriceCents:
          compareAtPriceCents != null && priceCents != null && compareAtPriceCents > priceCents
            ? compareAtPriceCents
            : null,
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
    const desiredIds = desired.map(normalizeSelectionId).filter(Boolean);
    if (!desiredIds.length) return list;
    const map = new Map();
    list.forEach((p) => {
      [
        p?.id,
        p?.productId,
        p?.product_id,
        p?.admin_graphql_api_id,
        p?.legacyResourceId,
      ].forEach((id) => {
        const normalized = normalizeSelectionId(id);
        if (normalized) map.set(String(normalized), p);
      });
    });
    const ordered = desiredIds
      .map((id) => map.get(String(id)))
      .filter(Boolean);
    return ordered;
  };

  const getOrderedSelectedCollections = (settings) => {
    const list = Array.isArray(PROXY?.upsellSelectedCollections)
      ? PROXY.upsellSelectedCollections
      : [];
    if (!list.length) return [];
    const desired = Array.isArray(settings?.selectedCollectionIds)
      ? settings.selectedCollectionIds
      : [];
    const desiredIds = desired.map(normalizeSelectionId).filter(Boolean);
    if (!desiredIds.length) return list;
    const map = new Map();
    list.forEach((c) => {
      [
        c?.id,
        c?.collectionId,
        c?.collection_id,
        c?.admin_graphql_api_id,
        c?.legacyResourceId,
      ].forEach((id) => {
        const normalized = normalizeSelectionId(id);
        if (normalized) map.set(String(normalized), c);
      });
    });
    const ordered = desiredIds
      .map((id) => map.get(String(id)))
      .filter(Boolean);
    return ordered;
  };

  const buildUpsellItems = (settings) => {
    const currency = normalizeCurrencyCode();

    if (settings.recommendationMode === "auto") {
      if (Array.isArray(UPSELL_DYNAMIC) && UPSELL_DYNAMIC.length) {
        return UPSELL_DYNAMIC;
      }
      const fallbackProducts = Array.isArray(PROXY?.upsellProducts)
        ? PROXY.upsellProducts
        : [];
      return buildUpsellItemsFromProxyProducts(fallbackProducts, currency);
    }

    const wantsProducts =
      settings.recommendationMode === "product" ||
      (
        settings.recommendationMode === "manual" &&
        (
          settings.selectionType === "products" ||
          settings.selectionType === "product" ||
          settings.selectedProductIds.length > 0
        )
      );
    const wantsCollections =
      settings.recommendationMode === "collection" ||
      (
        settings.recommendationMode === "manual" &&
        !wantsProducts &&
        (
          settings.selectionType === "collections" ||
          settings.selectionType === "collection" ||
          settings.selectedCollectionIds.length > 0
        )
      );

    if (wantsProducts) {
      const selectedProducts = getOrderedSelectedProducts(settings);
      if (selectedProducts.length) {
        return buildUpsellItemsFromProxyProducts(selectedProducts, currency);
      }
      return [];
    }

    if (wantsCollections) {
      const selectedCollections = getOrderedSelectedCollections(settings);
      if (selectedCollections.length) {
        return buildUpsellItemsFromProxyCollections(
          selectedCollections,
          currency
        );
      }
      return [];
    }

    return [];
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
        const compareRaw =
          firstVariant?.compare_at_price ??
          firstVariant?.compareAtPrice ??
          firstVariant?.compare_at ??
          firstVariant?.compareAt ??
          firstVariant?.compare_price ??
          p?.compare_at_price ??
          p?.compareAtPrice ??
          null;
        const priceIsCents = inferPriceIsCents(priceRaw);
        const priceCents = priceIsCents ? normalizeCents(priceRaw) : priceToCents(priceRaw);
        const compareAtPriceCents = priceIsCents ? normalizeCents(compareRaw) : priceToCents(compareRaw);
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
          compareAtPriceCents:
            compareAtPriceCents != null && priceCents != null && compareAtPriceCents > priceCents
              ? compareAtPriceCents
              : null,
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
        UPSELL_DYNAMIC = unique;
        requestAnimationFrame(() => renderUpsellSection());
      }
    } finally {
      UPSELL_LOADING = false;
    }
  };

  const getCartGoalBonusMessage = (rule, goalMet = false) => {
    const subtotalRupees = getRuleProgressSubtotalCents("free", rule) / priceDivisor(CART?.currency);
    const rawBefore =
      trimToNull(getProgressBefore(rule)) ||
      trimToNull(rule?.beforeMessage) ||
      trimToNull(rule?.before_message) ||
      trimToNull(rule?.beforeOfferUnlockMessage) ||
      "Add {{goal}} more to unlock this free product";
    const raw =
      goalMet
        ? trimToNull(getProgressAfter(rule)) ||
        trimToNull(rule?.afterMessage) ||
        trimToNull(rule?.after_message) ||
        trimToNull(rule?.afterOfferUnlockMessage) ||
        "Free product unlocked"
        : rawBefore;
    return replaceProgressText({
      text: raw,
      type: "free",
      rule,
      subtotalRupees,
      useRemainingForGoal: !goalMet,
    });
  };

  const isCartGoalShowcaseFreeGiftsEnabled = (campaign) => {
    const raw =
      campaign?.showcaseFreeGifts ??
      campaign?.showcase_free_gifts ??
      campaign?.showFreeGifts ??
      campaign?.show_free_gifts ??
      campaign?.showcaseGiftSlider ??
      campaign?.showcase_gift_slider ??
      "show";
    const value = String(raw ?? "show").trim().toLowerCase();
    if (["hide", "hidden", "false", "0", "no", "off", "disabled"].includes(value)) return false;
    if (["show", "visible", "true", "1", "yes", "on", "enabled"].includes(value)) return true;
    return true;
  };

  const getCartGoalBonusSlides = () => {
    const campaign = getSelectedCartGoalCampaign();
    if (!campaign) return [];
    if (!isCartGoalShowcaseFreeGiftsEnabled(campaign)) return [];

    const rules = buildCartGoalFreeProductRules(campaign)
      .filter((rule) => isRuleEnabled(rule) && isCartGoalShowcaseFreeGiftsEnabled(rule))
      .sort(compareRulesByCustomerPriority);

    const slides = [];
    rules.forEach((rule, ruleIndex) => {
      const goalTitle =
        trimToNull(rule?.cartGoalTitle) ||
        trimToNull(rule?.goalTitle) ||
        trimToNull(rule?.title) ||
        trimToNull(rule?.name) ||
        trimToNull(rule?.label) ||
        trimToNull(rule?.stepTitle) ||
        trimToNull(rule?.stepName) ||
        `Cart Goal ${ruleIndex + 1}`;
      const products = [
        ...parseArrayish(rule?.bonusProducts),
        ...parseArrayish(rule?.bonus_products),
      ];
      const fallbackProducts = products.length
        ? []
        : getFreeGiftProductIds(rule, "free").map((id) => ({
          id,
          title: `Product ${String(gidToId(id) || id).split("/").pop()}`,
          image: "",
        }));
      const displayProducts = products.length ? products : fallbackProducts;
      const goalMet = isRewardOfferGoalMet("free", rule);
      if (goalMet) return;
      const message = getCartGoalBonusMessage(rule, goalMet);
      const ruleKey = getRuleKey(rule, "cartgoal");
      const slot = rule?.cartStepName || `step${ruleIndex + 1}`;

      displayProducts.forEach((product, productIndex) => {
        const title =
          trimToNull(product?.title) ||
          trimToNull(product?.name) ||
          trimToNull(product?.productTitle) ||
          trimToNull(product?.product_title) ||
          trimToNull(rule?.bonusProductTitle) ||
          "Free gift";
        const image =
          trimToNull(product?.image) ||
          trimToNull(product?.featuredImage?.url) ||
          trimToNull(product?.featuredImage) ||
          trimToNull(product?.productImage) ||
          trimToNull(rule?.bonusProductImage) ||
          "";
        slides.push({
          rule,
          ruleKey,
          slot,
          goalMet,
          title,
          image,
          message,
          goalTitle,
          campaignTitle: goalTitle,
          index: slides.length,
          identity: `${ruleKey || slot}:${productIndex}`,
        });
      });
    });

    return slides;
  };

  const updateCartGoalBonusSliderPosition = (wrap) => {
    if (!wrap) return false;
    const slides = Array.isArray(drawer.__sc_cartGoalBonusSlides) ? drawer.__sc_cartGoalBonusSlides : [];
    if (!slides.length) return false;

    if (CART_GOAL_BONUS_INDEX >= slides.length) CART_GOAL_BONUS_INDEX = 0;
    if (CART_GOAL_BONUS_INDEX < 0) CART_GOAL_BONUS_INDEX = slides.length - 1;

    const activeIndex = CART_GOAL_BONUS_INDEX;
    const track = wrap.querySelector(".sc-cartgoal-bonus-track");
    if (!track) return false;

    const headerText =
      trimToNull(slides[activeIndex]?.goalTitle) ||
      trimToNull(slides[activeIndex]?.campaignTitle) ||
      "Free Product Rewards";
    const titleEl = wrap.querySelector(".sc-cartgoal-bonus-title");
    if (titleEl) titleEl.textContent = headerText;

    wrap.querySelectorAll(".sc-cartgoal-bonus-dot").forEach((dot, index) => {
      dot.classList.toggle("is-active", index === activeIndex);
    });

    const offset = -activeIndex * 100;
    requestAnimationFrame(() => {
      track.style.transform = `translate3d(${offset}%, 0, 0)`;
    });
    return true;
  };

  const renderCartGoalBonusSlider = () => {
    const wrap = drawer.querySelector(".sc-cartgoal-bonus");
    if (!wrap) return;

    const slides = getCartGoalBonusSlides();
    drawer.__sc_cartGoalBonusSlides = slides;

    if (!slides.length) {
      CART_GOAL_BONUS_INDEX = 0;
      wrap.hidden = true;
      wrap.innerHTML = "";
      return;
    }

    if (CART_GOAL_BONUS_INDEX >= slides.length) CART_GOAL_BONUS_INDEX = 0;
    if (CART_GOAL_BONUS_INDEX < 0) CART_GOAL_BONUS_INDEX = slides.length - 1;

    const hasMultiple = slides.length > 1;
    const activeIndex = CART_GOAL_BONUS_INDEX;
    const headerText =
      trimToNull(slides[activeIndex]?.goalTitle) ||
      trimToNull(slides[activeIndex]?.campaignTitle) ||
      "Free Product Rewards";

    wrap.hidden = false;
    wrap.innerHTML = `
      <div class="sc-cartgoal-bonus-card ${hasMultiple ? "has-arrows" : "is-single"}">
        <div class="sc-cartgoal-bonus-head">
          <p class="sc-cartgoal-bonus-title">${safe(headerText)}</p>
        </div>
        ${hasMultiple ? `
          <button class="sc-cartgoal-bonus-nav-btn left" type="button" data-cartgoal-bonus-nav="prev" aria-label="Previous free product">
            <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M12.8 4.2a.75.75 0 0 1 0 1.06L8.06 10l4.74 4.74a.75.75 0 1 1-1.06 1.06l-5.27-5.27a.75.75 0 0 1 0-1.06l5.27-5.27a.75.75 0 0 1 1.06 0Z"/></svg>
          </button>
          <button class="sc-cartgoal-bonus-nav-btn right" type="button" data-cartgoal-bonus-nav="next" aria-label="Next free product">
            <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M7.2 15.8a.75.75 0 0 1 0-1.06L11.94 10 7.2 5.26A.75.75 0 0 1 8.26 4.2l5.27 5.27a.75.75 0 0 1 0 1.06L8.26 15.8a.75.75 0 0 1-1.06 0Z"/></svg>
          </button>
        ` : ""}
        <div class="sc-cartgoal-bonus-viewport">
          <div class="sc-cartgoal-bonus-track" style="transform:translate3d(-${activeIndex * 100}%, 0, 0);">
            ${slides.map((slide, index) => {
      const label = safe((slide.title || "G").slice(0, 1).toUpperCase());
      const imageHtml = slide.image
        ? `<img src="${safe(slide.image)}" alt="${safe(slide.title)}" loading="lazy">`
        : `<span>${label}</span>`;
      return `
                <div class="sc-cartgoal-bonus-slide">
                  <div class="sc-cartgoal-bonus-item" role="button" tabindex="0" data-cartgoal-bonus-open="${index}" aria-label="Open ${safe(slide.title)} free gift">
                    <div class="sc-cartgoal-bonus-img">${imageHtml}</div>
                    <div class="sc-cartgoal-bonus-info">
                      <p class="sc-cartgoal-bonus-product">${safe(slide.title)}</p>
                      <p class="sc-cartgoal-bonus-msg">${safe(slide.message)}</p>
                    </div>
                  </div>
                </div>
              `;
    }).join("")}
          </div>
        </div>
        ${hasMultiple ? `
          <div class="sc-cartgoal-bonus-dots" aria-hidden="true">
            ${slides.map((_, index) => `<span class="sc-cartgoal-bonus-dot${index === activeIndex ? " is-active" : ""}"></span>`).join("")}
          </div>
        ` : ""}
      </div>
    `;
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
    wrap.style.setProperty("--sc-upsell-button-bg", settings.buttonColor || "#4343d0");
    wrap.style.setProperty("--sc-upsell-button-text", settings.buttonTextColor || "#ffffff");
    wrap.style.setProperty("--sc-border", settings.borderColor || "#e2e8f0");
    wrap.style.setProperty("--sc-upsell-arrow", settings.arrowColor || "#111827");

    const total = items.length;
    if (UPSELL_INDEX >= total) UPSELL_INDEX = 0;
    const visibleItems = items;
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
      const currentPriceCents =
        picked?.price != null ? priceToCentsFromItem(picked.price, item) : normalizeCents(item?.priceCents);
      const salePriceText =
        currentPriceCents != null ? formatMoney(currentPriceCents, normalizeCurrencyCode()) : String(item?.price || "");
      const compareAtCents = getUpsellCompareAtCents(item, picked, currentPriceCents);
      const comparePriceHtml = compareAtCents
        ? `<span class="sc-upsell-compare">${safe(formatMoney(compareAtCents, normalizeCurrencyCode()))}</span>`
        : "";
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
                  <div class="sc-upsell-price"><span class="sc-upsell-sale">${safe(salePriceText)}</span>${comparePriceHtml}</div>
                </div>
                ${sizeLabel ? `<div class="sc-upsell-sub">${safe(sizeLabel)}</div>` : ""}
                <div class="${controlsClass}">
                  ${selectMarkup}
                  <div class="sc-upsell-action">
                    <button class="sc-upsell-btn" type="button" data-upsell-add="${addVariantId}" data-upsell-key="${safeKey}" ${available ? "" : "disabled hidden"} style="${available ? `background-color:${safe(settings.buttonColor || "#4343d0")};color:${safe(settings.buttonTextColor || "#ffffff")};` : "display:none"}">
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
      settings.showAsSlider && total > 1
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
          if (nextCents != null) {
            const compareCents = getUpsellCompareAtCents(item, picked, nextCents);
            priceEl.innerHTML =
              `<span class="sc-upsell-sale">${safe(formatMoney(nextCents, normalizeCurrencyCode()))}</span>` +
              (compareCents ? `<span class="sc-upsell-compare">${safe(formatMoney(compareCents, normalizeCurrencyCode()))}</span>` : "");
          }
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
    const discountRules = getProxyArray(proxy, ["discountRules", "discountRule", "discountrule"]);
    const codeDiscountRows = (Array.isArray(discountRules) ? discountRules : []).filter((rule) => {
      const type = String(rule?.type || rule?.discountType || rule?.ruleType || "").toLowerCase();
      return (
        type === "code" ||
        type === "codediscount" ||
        !!trimToNull(rule?.discountCode || rule?.discount_code || rule?.code)
      );
    });
    const tables = {
      CartGoalRule: getProxyArray(proxy, [
        "cartGoalRules",
        "cartGoalRule",
        "cartgoalrule",
      ]),
      cartgoals: getProxyArray(proxy, ["cartGoals", "cartGoal", "cartgoal", "cartgoals"]),
      codediscount: codeDiscountRows,
      buyxgety: getProxyArray(proxy, [
        "buyxgetyRules",
        "buyxgetyRule",
        "buyxgetyrule",
        "buyXGetYRules",
        "bxgyrule",
        "bxgyRules",
        "bxgyRule",
        "buyxgeyRules",
        "buyxgeyRule",
        "buyxgeyrule",
      ]),
      stylesettings: proxy?.styleSettings ? [proxy.styleSettings] : [],
      upsellproduct: getProxyArray(proxy, [
        "upsellSelectedProducts",
        "upsellProducts",
        "upsellProduct",
        "upsellproduct",
      ]),
    };

    console.groupCollapsed("[SC] Database Tables");
    Object.entries(tables).forEach(([label, rows]) => {
      console.groupCollapsed(label);
      console.table(Array.isArray(rows) ? rows : []);
      console.groupEnd();
    });

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
      .sort(compareRulesByCustomerPriority)[0] || null;
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
        const goalDisplayTitle =
          trimToNull(goal?.cartGoalTitle) ||
          trimToNull(goal?.goalTitle) ||
          trimToNull(goal?.title) ||
          trimToNull(goal?.name) ||
          trimToNull(goal?.label) ||
          trimToNull(goal?.stepTitle) ||
          trimToNull(goal?.stepName) ||
          `Cart Goal ${index + 1}`;
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
          customerTarget: campaign?.customerTarget ?? campaign?.customer_target ?? goal?.customerTarget ?? goal?.customer_target,
          customerTags: campaign?.customerTags ?? campaign?.customer_tags ?? goal?.customerTags ?? goal?.customer_tags,
          priority: getRulePriority(campaign),
          enabled: true,
          type: "gift",
          ruleType: "free",
          rewardType: "free",
          cartGoalTitle: goalDisplayTitle,
          goalTitle: goalDisplayTitle,
          cartStepName: `step${index + 1}`,
          triggerType: trackBy === "quantity" ? "quantity" : "amount",
          shopifyDiscountId: goal?.shopifyDiscountId || null,
          discountProgressMode:
            campaign?.discountProgressMode ??
            campaign?.discount_progress_mode ??
            "after",
          rewardSelectionMandatory:
            campaign?.rewardSelectionMandatory ??
            campaign?.reward_selection_mandatory ??
            "yes",
          qty:
            goal?.qty ??
            goal?.quantity ??
            goal?.freeQty ??
            goal?.free_qty ??
            "1",
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
    const urls = shopDomain
      ? [buildProxyUrl(cart, directProxyPath), buildProxyUrl(cart)]
      : [buildProxyUrl(cart)];
    let lastError = null;

    for (const url of urls) {
      try {
        const isDirect = /^https?:\/\//i.test(String(url || ""));
        const r = await fetch(url, {
          headers: { Accept: "application/json" },
          credentials: isDirect ? "omit" : "same-origin",
        });

        const ct = r.headers.get("content-type") || "";
        if (!r.ok) {
          let text = "";
          try {
            text = await r.text();
          } catch { }
          lastError = new Error(
            `[SmartCartify] Proxy fetch failed (${r.status}). ct=${ct} body=${text.slice(
              0,
              220
            )}...`
          );
          continue;
        }

        if (!ct.includes("application/json")) {
          let text = "";
          try {
            text = await r.text();
          } catch { }
          lastError = new Error(
            `[SmartCartify] Proxy not JSON. status=${r.status} ct=${ct} body=${text.slice(
              0,
              220
            )}...`
          );
          continue;
        }

        const j = await r.json();
        if (!j?.ok) {
          lastError = new Error(j?.error || "Invalid proxy response (ok:false)");
          continue;
        }
        return j;
      } catch (err) {
        lastError = err;
      }
    }

    return {
      ok: true,
      _proxyError: lastError || new Error("[SmartCartify] Proxy fetch failed"),
    };
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
  overlay.className = "sc-overlay smartcartify-cart-overlay";
  overlay.setAttribute("aria-hidden", "true");

  const drawer = document.createElement("div");
  drawer.className = "sc-drawer smartcartify-cart-drawer";
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

  const firePaperEffect = (durationMs = 2600) => {
    const host = drawer;
    if (!host || host.__sc_paper_running) return;

    host.__sc_paper_running = true;
    host.querySelector(".sc-paper")?.remove();

    const wrap = document.createElement("div");
    wrap.className = "sc-paper is-active";
    host.appendChild(wrap);

    const origin = getConfettiOrigin();
    const pieces = 96;
    for (let i = 0; i < pieces; i++) {
      const p = document.createElement("i");
      p.className = "sc-paper-piece";
      const spread = (Math.random() * 52) - 26;
      const startX = Math.max(4, Math.min(96, origin.xPercent + spread));
      p.style.left = `${startX}%`;
      p.style.top = `${origin.yPx}px`;
      p.style.setProperty("--sc-x", `${(Math.random() * 280 - 140).toFixed(1)}px`);
      p.style.setProperty("--sc-y", `${(360 + Math.random() * 240).toFixed(1)}px`);
      p.style.animationDelay = `${Math.random() * 0.35}s`;
      p.style.animationDuration = `${1.9 + Math.random() * 0.8}s`;
      p.style.width = `${4 + Math.random() * 5}px`;
      p.style.height = `${5 + Math.random() * 7}px`;
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      wrap.appendChild(p);
    }

    setTimeout(() => {
      try { wrap.remove(); } catch { }
      host.__sc_paper_running = false;
    }, Math.max(1200, Number(durationMs) || 2600) + 450);
  };

  const showCenterCelebratePopup = (title, subtitle, ms = 5000, tone = "success") => {
    if (!drawer) return false;
    const isErrorTone =
      String(tone || "").toLowerCase() === "error" ||
      /could not|failed|error|try again/i.test(`${title || ""} ${subtitle || ""}`);
    const backdrop = document.createElement("div");
    backdrop.className = `sc-celebrate-backdrop ${isErrorTone ? "is-error" : "is-success"}`;
    const iconPath = isErrorTone
      ? `<path class="sc-celebrate-x-line sc-celebrate-x-line-1" d="M25 25L47 47"/><path class="sc-celebrate-x-line sc-celebrate-x-line-2" d="M47 25L25 47"/>`
      : `<path class="sc-celebrate-check-line" d="M20.5 36.5L31 47L52 25"/>`;
    backdrop.innerHTML = `
      <div class="sc-celebrate-modal" role="status" aria-live="polite">
        <span class="sc-celebrate-check" aria-hidden="true">
          <svg class="sc-celebrate-check-svg" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle class="sc-celebrate-check-circle" cx="36" cy="36" r="30"/>
            ${iconPath}
          </svg>
        </span>
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

  const celebrateDiscountApplied = (code) => {
    // Apply code success: show only the paper celebration.
    // No reward/success popup should open after discount apply.
    void code;
    firePaperEffect(2400);
  };

  const suppressAutoRewardPopups = (ms = 3000) => {
    try {
      drawer.__sc_suppress_reward_popup_until = Date.now() + Math.max(0, Number(ms) || 0);
    } catch { }
  };

  /* =========================================================
   LOADING LINE under sc-progress ✅
  ========================================================= */
  const PROGRESS_LOADING_MIN_MS = 420;
  const PROGRESS_LOADING_MAX_MS = 12000;
  let progressLoadingStartedAt = 0;
  let progressLoadingHideTimer = null;
  let progressLoadingMaxTimer = null;

  const restartLineLoaderAnimation = (lineLoader) => {
    if (!lineLoader) return;
    const runner = lineLoader.querySelector(".sc-line-loader-runner");
    if (!(runner instanceof HTMLElement)) return;

    // Same behavior as Corner indeterminate bar: reset class + reflow,
    // then start the moving runner again every time cart changes.
    runner.classList.remove("is-running");
    runner.style.animation = "none";
    void runner.offsetWidth;
    runner.style.animation = "";
    requestAnimationFrame(() => {
      runner.classList.add("is-running");
    });
  };

  const setLineLoaderVisible = (isVisible) => {
    const lineLoader = drawer.querySelector("[data-sc-line-loader]");
    if (!lineLoader) return;
    const show = !!isVisible;

    lineLoader.hidden = !show;
    lineLoader.classList.toggle("is-active", show);
    lineLoader.style.display = show ? "block" : "none";
    lineLoader.setAttribute("aria-hidden", show ? "false" : "true");

    if (show) {
      restartLineLoaderAnimation(lineLoader);
    } else {
      const runner = lineLoader.querySelector(".sc-line-loader-runner");
      if (runner instanceof HTMLElement) {
        runner.classList.remove("is-running");
        runner.style.animation = "none";
      }
    }
  };

  const applyProgressLoadingState = (isLoading) => {
    const active = !!isLoading;
    drawer.classList.toggle("sc-refreshing", active);
    drawer.classList.remove("sc-loading-items");
    setLineLoaderVisible(active || drawer.classList.contains("sc-applying-discount"));
  };

  const setProgressLoading = (isLoading, opts = {}) => {
    const active = !!isLoading;
    const minVisibleMs = Number(opts.minVisibleMs ?? PROGRESS_LOADING_MIN_MS);
    const maxVisibleMs = Number(opts.maxVisibleMs ?? PROGRESS_LOADING_MAX_MS);

    if (progressLoadingHideTimer) {
      clearTimeout(progressLoadingHideTimer);
      progressLoadingHideTimer = null;
    }

    if (active) {
      if (!drawer.classList.contains("sc-refreshing")) {
        progressLoadingStartedAt = Date.now();
      }
      applyProgressLoadingState(true);

      if (progressLoadingMaxTimer) clearTimeout(progressLoadingMaxTimer);
      progressLoadingMaxTimer = setTimeout(() => {
        progressLoadingMaxTimer = null;
        progressLoadingStartedAt = 0;
        applyProgressLoadingState(false);
      }, Number.isFinite(maxVisibleMs) && maxVisibleMs > 0 ? maxVisibleMs : PROGRESS_LOADING_MAX_MS);
      return;
    }

    if (progressLoadingMaxTimer) {
      clearTimeout(progressLoadingMaxTimer);
      progressLoadingMaxTimer = null;
    }

    const elapsed = progressLoadingStartedAt ? Date.now() - progressLoadingStartedAt : minVisibleMs;
    const delay = Math.max(0, (Number.isFinite(minVisibleMs) ? minVisibleMs : PROGRESS_LOADING_MIN_MS) - elapsed);

    progressLoadingHideTimer = setTimeout(() => {
      progressLoadingHideTimer = null;
      progressLoadingStartedAt = 0;
      applyProgressLoadingState(false);
    }, delay);
  };

  const syncItemsLoading = () => {
    drawer.classList.remove("sc-loading-items");
  };

  const triggerFreeGiftCheckAnimations = (scope = drawer) => {
    if (!scope?.querySelectorAll) return;
    scope.querySelectorAll(".sc-freegift-option.selected .sc-freegift-check").forEach((check) => {
      if (!(check instanceof HTMLElement)) return;
      check.classList.remove("sc-check-animate");
      void check.offsetWidth;
      requestAnimationFrame(() => check.classList.add("sc-check-animate"));
    });
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

  };

  const getDiscountApplicationCode = (entry) =>
    trimToNull(
      entry?.code ??
      entry?.title ??
      entry?.discount_code ??
      entry?.discountCode ??
      entry?.discount_application?.code ??
      entry?.discount_application?.title ??
      entry?.discountApplication?.code ??
      entry?.discountApplication?.title ??
      entry
    );

  const decimalDiscountAmountToCents = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return Math.max(0, Math.round(amount * priceDivisor(CART?.currency)));
  };

  const cartDiscountAmountToCents = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return Math.max(0, Math.round(amount));
  };

  const isDiscountCodeApplicationEntry = (entry) => {
    if (!entry || typeof entry !== "object") return true;
    const hasCodeField = Boolean(
      trimToNull(
        entry?.code ??
        entry?.discount_code ??
        entry?.discountCode ??
        entry?.discount_application?.code ??
        entry?.discountApplication?.code
      )
    );
    const type = String(
      entry?.type ??
      entry?.discount_application?.type ??
      entry?.discountApplication?.type ??
      ""
    ).trim().toLowerCase();
    if (type) return type.includes("code");
    return hasCodeField;
  };

  const getCartDiscountEntries = () => {
    const entries = [];
    const addEntry = (entry, amountCents = null) => {
      if (!entry) return;
      entries.push({ entry, amountCents });
    };

    (Array.isArray(CART?.discount_codes) ? CART.discount_codes : []).forEach((entry) => {
      addEntry(entry, decimalDiscountAmountToCents(entry?.amount));
    });

    [
      ...(Array.isArray(CART?.cart_level_discount_applications) ? CART.cart_level_discount_applications : []),
      ...(Array.isArray(CART?.discount_applications) ? CART.discount_applications : []),
    ].forEach((entry) => {
      addEntry(
        entry,
        cartDiscountAmountToCents(
          entry?.total_allocated_amount ??
          entry?.totalAllocatedAmount ??
          entry?.amount
        )
      );
    });

    (Array.isArray(CART?.items) ? CART.items : []).forEach((item) => {
      [
        ...(Array.isArray(item?.discount_allocations) ? item.discount_allocations : []),
        ...(Array.isArray(item?.line_level_discount_allocations) ? item.line_level_discount_allocations : []),
      ].forEach((entry) => {
        addEntry(entry, cartDiscountAmountToCents(entry?.amount));
      });
    });

    return entries;
  };

  const getCartDiscountCodeEntry = (code) => {
    const c = trimToNull(code);
    if (!c || !CART) return null;

    const needle = c.toLowerCase();

    return getCartDiscountEntries().find(({ entry }) => {
      const dc = getDiscountApplicationCode(entry).toLowerCase();
      const applicable = entry?.applicable;

      return (
        dc === needle &&
        applicable !== false
      );
    }) || null;
  };

  const isDiscountAppliedInCart = (code) => {
    const c = trimToNull(code);
    if (!c || !CART) return false;
    if (getCartDiscountCodeEntry(c)) return true;

    const needle = c.toLowerCase();
    const hasCartCode = getCartDiscountEntries().some(({ entry }) => {
      const dc = getDiscountApplicationCode(entry).toLowerCase();
      return dc && dc === needle && entry?.applicable !== false;
    });
    if (hasCartCode) return true;

    return false;
  };

  const getCartDiscountCodeAmountCents = (code) => {
    const match = getCartDiscountCodeEntry(code);
    if (!match) return null;
    if (Number.isFinite(match.amountCents) && match.amountCents > 0) {
      return match.amountCents;
    }
    return null;
  };

  const getAppliedDiscountCodes = () => {
    const out = [];
    getCartDiscountEntries().forEach(({ entry }) => {
      if (!isDiscountCodeApplicationEntry(entry)) return;
      const code = getDiscountApplicationCode(entry);
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
            : formatCampaignMoney(amountToCurrencyMinorUnits(goalValue), CART?.currency);
      const remainingText =
        remainingValue == null
          ? ""
          : isQuantity
            ? formatQuantityGoal(remainingValue)
            : formatCampaignMoney(amountToCurrencyMinorUnits(remainingValue), CART?.currency);

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
      const normalized = type === "discount" ? normalizeDiscountProgressText(replaced) : replaced;
      return stripCampaignAmountDecimals(normalized);
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

    // NOTE: BXGY, BuyXGetY, automatic discount, and free gift rules are
    // intentionally omitted. Those rule types appear as offer/progress UI, not
    // in the announcement bar.

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

      if (isDiscountAppliedInCart(code) || isManualDiscountCodeRemembered(code)) {
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

    if (discountMsg) discountMsg.style.color = "#16a34a";
    setDiscountMessage(txt || `Discount applied: ${applied.code}`);
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
  --sc-base-font-size: 12px;
  --sc-font: inherit;
  --sc-heading-scale: 1.2;
  --sc-heading-font-size: calc(var(--sc-base-font-size) * var(--sc-heading-scale));
  --sc-button-font-size: var(--sc-base-font-size);
  --sc-small-font-size: var(--sc-base-font-size);
  --sc-overlay-bg: rgba(0,0,0,.45);

  --sc-bg: transparent;
  --sc-text: #000000;

  --sc-border: rgba(229,231,235,1);
  --sc-muted: rgba(107,114,128,1);

  --sc-drawer-width: min(540px,94vw);
  --sc-drawer-bg-image: none;
  --sc-drawer-bg: #f4f4f7;
  --sc-drawer-text-color: #102864;
  --sc-drawer-header-color: #ffffff;

  --sc-top-bg-color: transparent;
  --sc-top-bg-image: linear-gradient(135deg, #ff3b30 0%, #e126b9 48%, #f8dfd0 100%);
  --sc-top-bg-color-effective: transparent;
  --sc-top-bg-image-effective: var(--sc-top-bg-image);

  --sc-progress-bg: var(--sc-top-bg-color-effective);
  --sc-progress-text: var(--sc-text);

  --sc-progress: #4343d0;
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

  --sc-apply-bg: #4343d0;
  --sc-apply-text: #ffffff;
  --sc-apply-border: rgba(17,24,39,.25);

  --sc-subtotal-bg: rgba(255,255,255,1);
  --sc-subtotal-text: #111827;
  --sc-subtotal-label: rgba(107,114,128,1);

  --sc-checkout-bg: #4343d0;
  --sc-checkout-text: #ffffff;
  --sc-announce-bg: linear-gradient(90deg, #102864 0%, #5b2cf4 50%, #e126b9 100%);
  --sc-announce-text: #ffffff;
  --sc-badge-bg: rgba(17,24,39,.1);
  --sc-badge-text: #111827;
  --sc-icon-color: #102864;
  --sc-header-icon-color: var(--sc-drawer-header-color);
  --sc-offer-icon-color: #111827;
  --sc-tab-icon-color: #102864;
  --sc-tab-active-color: var(--sc-checkout-bg);

  --sc-freegift-bg:var(--sc-drawer-bg);
  --sc-freegift-border: rgba(15,23,42,.08);
  --sc-freegift-shadow: 0 20px 40px rgba(15,23,42,.25);
  --sc-freegift-text: #0f172a;
  --sc-freegift-subtext: var(--sc-drawer-text-color);
  --sc-freegift-btn-bg: var(--sc-progress);
  --sc-freegift-btn-text: #ffffff;
  --sc-freegift-font-size: var(--sc-base-font-size);
  --sc-freegift-title-color: var(--sc-freegift-text);
  --sc-freegift-option-title-color: var(--sc-freegift-text);
  --sc-freegift-accent: var(--sc-progress);
  --sc-freegift-pill-bg: rgba(238,231,255,1);
  --sc-freegift-pill-text: var(--sc-freegift-text);
  --sc-celebrate-backdrop: rgba(17,24,39,.25);
  --sc-celebrate-bg: #ffffff;
  --sc-celebrate-border: rgba(0,0,0,.08);
  --sc-celebrate-badge-bg: rgba(87,192,17,.14);
  --sc-celebrate-title-color: #111827;
  --sc-celebrate-title-size: var(--sc-heading-font-size);
  --sc-celebrate-text-size: var(--sc-small-font-size);

  --sc-close-bg: #ffffff;
  --sc-close-border: transparent;
  --sc-close-text: #102864;
  --sc-close-icon-color: #102864;
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
    fill: currentColor !important;
    color: currentColor;
}
.sc-drawer{
  position:fixed;top:0;right:0;height:100%;
  max-width:435px;
  width:100% !important;
  background: var(--sc-drawer-bg);
  background-size:cover, cover;
  background-position:center center, center center;
  background-repeat:no-repeat, no-repeat;
  overflow:hidden;
  transform:translateX(110%);
  transition:transform .25s ease;
  z-index:2147483647 !important;
  pointer-events:none !important;
  display:flex !important;
  flex-direction:column;
  font-size:var(--sc-base-font-size);
  color:var(--sc-drawer-text-color);
  filter:none !important;
  -webkit-filter:none !important;
  text-rendering:optimizeLegibility;
  -webkit-font-smoothing:antialiased;
  backface-visibility:hidden;
}
.sc-drawer::before{
  content:"";
  position:absolute;
  inset:0 0 auto 0;
  height:190px;
  background-color:var(--sc-top-bg-color-effective);
  background-image:var(--sc-top-bg-image-effective);
  background-size:cover;
  background-position:center;
  background-repeat:no-repeat;
  pointer-events:none;
  z-index:0;
}
.sc-drawer > *{
  position:relative;
  z-index:1;
}
.smartcartify-cart-drawer{
  background:var(--sc-drawer-bg) !important;
}
.smartcartify-cart-overlay{
  background:var(--sc-overlay-bg);
}
.sc-drawer button,
.sc-drawer input,
.sc-drawer select,
.sc-drawer textarea{
  font-family:var(--sc-font);
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
.sc-drawer.sc-mobile-bottom-sheet.open{transform:none}
.sc-drawer.open{transform:none;pointer-events:auto !important}
.sc-drawer.sc-position-left.open{transform:none}
.sc-drawer.sc-mobile-bottom-sheet.open{transform:none}
.sc-drawer *{box-sizing:border-box;pointer-events:auto !important;text-shadow:none !important;}
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
  position:relative;
  z-index:1;
}

.sc-header{
padding: 5px 10px 0px 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0px;
    color: var(--sc-drawer-header-color);
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
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
  color:var(--sc-header-icon-color);
  background:rgba(255,255,255,.12);
  flex:0 0 auto;
}
.sc-title-icon svg{
  width:18px;
  height:18px;
  display:block;
  color:var(--sc-header-icon-color);
}
.sc-title-icon svg path{fill:currentColor !important;stroke:currentColor;}
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

.sc-drawer.sc-offers-active .sc-title-icon{
  display:none;
}

.sc-drawer.sc-offers-active .sc-close{
    width: 30px !important;
    min-width: 30px;
    min-height: 30px !important;
    height: 30px !important;
    border: 0 !important;
    border-radius: 999px !important;
    font-size: var(--sc-heading-font-size);
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
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
  color:var(--sc-close-icon-color);
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

.sc-close{
  width:auto;
  min-width:74px;
  height:34px;
  padding:0 13px;
  border-radius:999px;
  box-shadow:0 5px 14px rgba(15,23,42,.14);
}

/* Announcement */
.sc-announce,
.smartcartify-announcement-bar{
  background: var(--sc-announce-bg);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  width:100%;
  padding:0 12px;
  border-radius:0.75em;
  color:var(--sc-announce-text, #ffffff);
  box-shadow:0 6px 16px rgba(16,40,100,.10);
  overflow:hidden;
}
.sc-announce[hidden]{display:none !important;}
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
  font-weight:800;
  line-height:1.25;
  letter-spacing:.01em;
  color: var(--sc-announce-text, #ffffff);
  -webkit-font-smoothing:antialiased;
  text-rendering:optimizeLegibility;
}
.marquee-text{
  box-sizing:border-box;
  align-items:center;
  overflow:hidden;
  color:var(--sc-announce-text, #ffffff);
}
.marquee-text .top-info-bar{
  font-size:var(--sc-small-font-size);
  width:200%;
  display:flex;
  gap:0px;
  animation: marquee 25s linear infinite running;
}
.marquee-text .top-info-bar:hover{animation-play-state: paused;}
.marquee-text .top-info-bar .info-text{
  padding: 14px 10px;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: .25em;
    transition: all .2s ease;
    color: var(--sc-announce-text, #ffffff);
    font-size: var(--sc-base-font-size);
    line-height: 1.25;
    letter-spacing: .01em;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
}
.marquee-text .top-info-bar .info-text .sc-announce-em{
  font-size:inherit;
  font-weight:800;
  margin:0 .15em;
}
.marquee-text .top-info-bar .info-text .sc-announce-code{
  cursor:pointer;
  text-decoration:underline;
}
.marquee-text .top-info-bar .info-text .sc-announce-copied{
  opacity:1;
}
.marquee-text .top-info-bar .info-text a{color:var(--sc-announce-text, #ffffff);text-decoration:none;}
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
    top:0px;
}

.sc-line-loader{
  width:100%;
  height:3px;
  display:none;
  flex:0 0 auto;
  position:absolute;
  left:0;
  right:0;
  bottom:0;
  z-index:20;
  padding:0;
  margin:0;
  overflow:hidden;
  background:transparent;
  box-shadow:none;
  isolation:isolate;
  pointer-events:none;
}
.sc-line-loader[hidden]{
  display:none !important;
}
.sc-refreshing .sc-line-loader:not([hidden]),
.sc-drawer.sc-applying-discount .sc-line-loader:not([hidden]){
  display:block !important;
}
.sc-line-loader-bg{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  background:transparent;
  overflow:hidden;
  border-radius:0;
}
.sc-line-loader-bg::before{
  content:"";
  position:absolute;
  left:0;
  right:0;
  top:50%;
  height:1px;
  transform:translateY(-50%);
  background:transparent;
}
.sc-line-loader-runner{
  position:absolute;
  top:0;
  left:-48%;
  width:48%;
  height:100%;
  border-radius:999px;
  background:linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--sc-line-loader-accent, var(--sc-progress, #4343d0)) 18%, transparent) 14%, var(--sc-line-loader-accent, var(--sc-progress, #4343d0)) 50%, color-mix(in srgb, var(--sc-line-loader-accent, var(--sc-progress, #4343d0)) 18%, transparent) 86%, transparent 100%);
  animation:scLineLoader 1.05s cubic-bezier(.42,0,.18,1) infinite !important;
  will-change:left;
}
@keyframes scLineLoader{
  0%{left:-48%;}
  100%{left:112%;}
}
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
.sc-dot-wrap.last{transform:translateX(-60%);}
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
  top:12px;
  height:max(var(--sc-track-h), 8px);
}
.sc-progress.sc-cart-goal-progress .sc-fill{
  top:12px;
  height:max(var(--sc-track-h), 8px);
}
.sc-progress.sc-cart-goal-progress .sc-dot-bubble{
  width:26px;
  height:26px;
  border:2px solid var(--sc-border);
  background:var(--sc-progress-bg);
  color:var(--sc-icon-color);
  box-shadow:0 1px 4px rgba(15,23,42,.18);
}
.sc-progress.sc-cart-goal-progress .sc-dot-bubble svg{
  width:15px;
  height:15px;
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
  fill:var(--sc-announce-text) !important;
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
  position: relative;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    color: #000000;
    margin: 10px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    background: linear-gradient(0deg, rgba(255, 255, 255, 1) 10%, rgba(255, 255, 255, 0.95) 100%);
    --tw-shadow: 0 1px 3px 0 rgb(0 0 0 / 50%), 0 1px 2px -1px rgb(0 0 0 / 55%) !important;
    --tw-shadow-colored: 0 1px 3px 0 var(--tw-shadow-color), 0 1px 2px -1px var(--tw-shadow-color) !important;
    box-shadow: 0 0 #0000, 0 0 #0000, 0 1px 3px #0000001a, 0 1px 2px -1px #0000001a !important;
    box-shadow: var(--tw-ring-offset-shadow, 0 0 rgba(0, 0, 0, 0)), var(--tw-ring-shadow, 0 0 rgba(0, 0, 0, 0)), var(--tw-shadow) !important;
    margin-left: 1em !important;
    margin-right: 1em !important;
    border-radius: .75em !important;
}
.sc-items-list{
  display:flex;
  flex-direction:column;
  gap:0px;
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
  opacity:1;
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
  display:flex;
  flex-direction:column;
  margin-top:auto;
  flex:0 0 auto;
}
.sc-items-footer:empty{display:none !important;}
.sc-items-loading{
  display:none !important;
}
.sc-discount-loading-overlay{
  display:none !important;
}
.sc-discount-loading-overlay[hidden]{
  display:none !important;
}
.sc-drawer.sc-empty-state .sc-items-footer{
  display:none !important;
}
.sc-drawer.sc-empty-state .sc-footer-row,
.sc-drawer.sc-empty-state .sc-subtotal-box,
.sc-drawer.sc-empty-state .sc-checkout{
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
  grid-template-columns:72px minmax(0, 1fr);
  align-items:center;
  gap:12px;
  min-height:72px;
  padding:10px 12px;
  border-bottom: 1px solid var(--sc-badge-bg) !important;
  border-radius:0;
  background:transparent;
}
.sc-item:last-child{
  border-bottom:0;
}

.sc-mid,.sc-item.sc-item-reward .sc-mid{
  min-width:0;
  display:flex;
  flex-direction:column;
  gap:4px;
}
.sc-name{
  margin:0;
  font-size:calc(var(--sc-base-font-size) * 1.02) !important;
  font-weight:700;
  line-height:1.22 !important;
  color:var(--sc-drawer-text-color);
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
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
  font-size:var(--sc-small-font-size) !important;
  line-height:1.25 !important;
  opacity:1;
}
.sc-mid-bottom{
  display:flex;
  align-items:flex-end;
  justify-content:space-between;
  gap:12px;
  margin-top:2px;
}
.sc-item-reward .sc-mid-bottom{
  align-items:flex-start;
}
.sc-item.sc-item-reward{
    position: relative;
    display: grid;
    grid-template-columns: 56px minmax(0, 1fr);
    align-items: center;
    gap: 12px;
    min-height: 72px;
    padding: 10px 12px;
    border-bottom: 1px solid var(--sc-badge-bg) !important;
    border-radius: 0;
    background: transparent;
}
.sc-item.sc-item-reward .sc-img{
  position:relative;
  width:60px;
  height:50px;
  overflow:hidden;
  border-radius:0.75em !important;
}
.sc-item.sc-item-reward .sc-img img{
  border-radius:0.75em;
}
.sc-item.sc-item-reward .sc-img::before{
  content:none;
}
.sc-item.sc-item-reward .sc-img::after{
  content:none;
}

.sc-item.sc-item-reward .sc-name,
.sc-item.sc-item-reward .sc-name a{
color: var(--sc-drawer-text-color);
    font-size: var(--sc-base-font-size);
    font-weight: 700;
    line-height: 1.2 !important;
}
.sc-item.sc-item-reward .sc-mid-bottom{
  display:grid;
  grid-template-columns:minmax(0, 1fr) auto;
  align-items:center;
  gap:12px;
  width:100%;
  margin-top:0;
}
.sc-item.sc-item-reward .sc-qty,
.sc-item.sc-item-reward .sc-qty-stack{
  display:none !important;
}
.sc-item.sc-item-reward .sc-pricebox{
  flex-direction:row;
  align-items:center;
  gap:10px;
  margin-left:0;
  padding-top:0;
}
.sc-item.sc-item-reward .sc-compare{
  color:#747b8c;
  font-size:calc(var(--sc-small-font-size) * 1.05) !important;
  font-weight:700;
}
.sc-item.sc-item-reward .sc-reward-free-pill{
  display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 25px;
    padding: 5px 16px;
    border-radius: 999px;
    background: var(--sc-checkout-bg);
    color: var(--sc-checkout-text);
    font-size: var(--sc-base-font-size)!important;
    font-weight: 600;
    line-height: 1;
}
.sc-item.sc-item-reward .sc-reward-line-badge{
  display:inline-flex;
  align-items:center;
  gap:6px;
  min-width:0;
  max-width:100%;
  width:max-content;
  margin-left:0;
  padding:5px 10px;
  border-radius:5px;
  background:#e8eafb;
  color:#17226d;
  font-size:calc(var(--sc-small-font-size) * 1.02) !important;
  font-weight:900;
  line-height:1.15;
  box-shadow:none;
}
.sc-item.sc-item-reward .sc-reward-line-badge::before{
  content:"";
  width:13px;
  height:13px;
  flex:0 0 auto;
  background:currentColor;
  -webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath fill='black' d='M2.5 10.7 9.3 17.5a1.7 1.7 0 0 0 2.4 0l5.8-5.8a1.7 1.7 0 0 0 .5-1.2V4.2A2.2 2.2 0 0 0 15.8 2H9.5a1.7 1.7 0 0 0-1.2.5L2.5 8.3a1.7 1.7 0 0 0 0 2.4ZM14 7.5A1.5 1.5 0 1 1 14 4.5a1.5 1.5 0 0 1 0 3Z'/%3E%3C/svg%3E") center/contain no-repeat;
  mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath fill='black' d='M2.5 10.7 9.3 17.5a1.7 1.7 0 0 0 2.4 0l5.8-5.8a1.7 1.7 0 0 0 .5-1.2V4.2A2.2 2.2 0 0 0 15.8 2H9.5a1.7 1.7 0 0 0-1.2.5L2.5 8.3a1.7 1.7 0 0 0 0 2.4ZM14 7.5A1.5 1.5 0 1 1 14 4.5a1.5 1.5 0 0 1 0 3Z'/%3E%3C/svg%3E") center/contain no-repeat;
}
.sc-item.sc-item-reward .sc-remove-x {
    font-size: 24px !important;
    font-weight: 500;
    color: var(--sc-drawer-text-color);
}
.sc-item.sc-item-reward .sc-remove-x:hover{
  color: var(--sc-drawer-text-color);
}
.sc-qty{
  display:inline-flex;
  align-items:center;
  gap:8px;
  overflow:visible;
  background:transparent;
}
.sc-qty button{
  width:34px;
  height:22px;
  border: 1px solid var(--sc-apply-border);
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
  width:15px;
  height:22px;
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
  font-size:calc(var(--sc-base-font-size) * 1.02) !important;
  color:var(--sc-drawer-text-color);
  font-weight:800;
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
.sc-reward-line-badge.sc-freegift-line-badge{
  background:#e8eafb;
  color:#17226d;
}
.sc-reward-line-badge.sc-bxgy-reward-line-badge{
  background:rgba(122, 0, 86, .10);
  color:var(--sc-progress);
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
  color: var(--sc-drawer-text-color);
  font-weight:600;
  white-space:nowrap;
}
.sc-bxgy-line-badge:empty::before{
  content:"Buy X Get Y";
}
[data-smart-cartify-open],
.sc-mobile-open-fallback{
  position:relative;
}
[data-smart-cartify-open].sc-open-loading,
.sc-mobile-open-fallback.sc-open-loading{
  pointer-events:none;
}
[data-smart-cartify-open].sc-open-loading::after,
.sc-mobile-open-fallback.sc-open-loading::after{
  content:"";
  position:absolute;
  right:-4px;
  top:-4px;
  width:14px;
  height:14px;
  border-radius:50%;
  border:2px solid rgba(17,24,39,.18);
  border-top-color:var(--sc-progress);
  background:var(--sc-drawer-bg);
  animation:scSpin .8s linear infinite;
  z-index:3;
}

.sc-cartgoal-bonus{
  display:block;
  margin:0;
  border-bottom: 1px solid var(--sc-badge-bg);
}
.sc-cartgoal-bonus[hidden]{
  display:none !important;
}
.sc-cartgoal-bonus-card{
  padding:8px 12px 6px;
  color:var(--sc-drawer-text-color);
  overflow:hidden;
  box-shadow:none;
  position:relative;
}
.sc-cartgoal-bonus-head{
  display:flex;
  align-items:center;
  justify-content:center;
}
.sc-cartgoal-bonus-title{
  margin:0;
  color:var(--sc-drawer-text-color);
  font-size:calc(var(--sc-base-font-size) * 1.01);
  line-height:1.2;
  font-weight:700;
  text-align:center;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  letter-spacing: 0.5px;
}
.sc-cartgoal-bonus-nav-btn{
  position:absolute;
  top:60%;
  transform:translateY(-50%);
  width:28px;
  height:36px;
  border:0;
  border-radius:0;
  background:transparent;
  color:var(--sc-icon-color);
  display:grid;
  place-items:center;
  cursor:pointer;
  z-index:2;
  padding:0;
}
.sc-cartgoal-bonus-nav-btn.left{
  left:2px;
}
.sc-cartgoal-bonus-nav-btn.right{
  right:2px;
}
.sc-cartgoal-bonus-nav-btn svg{
  width: 24px;
  height: 24px;
  display: block;
  fill: currentColor;
}
.sc-cartgoal-bonus-arrow{
  width:24px;
  height:24px;
  border-radius:999px;
  border:1px solid color-mix(in srgb, var(--sc-border) 75%, transparent);
  background:var(--sc-input-bg, #fff);
  color:#0b185c;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  font-size:16px;
  font-weight:900;
  line-height:1;
  flex:0 0 auto;
  box-shadow:0 2px 8px rgba(15,23,42,.08);
  padding:0;
}
.sc-cartgoal-bonus-viewport{
  overflow:hidden;
  width:100%;
}
.sc-cartgoal-bonus-card.has-arrows .sc-cartgoal-bonus-viewport{
  width:calc(100% - 52px);
  margin:0 auto;
}
.sc-cartgoal-bonus-track{
  display:flex;
  width:100%;
  transition:transform 450ms ease;
  will-change:transform;
  gap:0;
}
.sc-cartgoal-bonus-slide{
  min-width:100%;
  flex:0 0 100%;
  backface-visibility:hidden;
}
.sc-cartgoal-bonus-item{
  display:grid;
  grid-template-columns:64px minmax(0,1fr);
  gap:12px;
  align-items:center;
  width:100%;
  min-height:72px;
  cursor:pointer;
  border:0;
  background:transparent;
  text-align:left;
  padding:2px 0;
}
.sc-cartgoal-bonus-img{
  width:60px;
  height:50px;
  background:var(--sc-image-bg);
  overflow:hidden;
  display:flex;
  align-items:center;
  justify-content:center;
  color:var(--sc-muted);
  font-size:20px;
  font-weight:800;
}
.sc-cartgoal-bonus-img img{
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    border-radius: 8px !important;
    background: #e9e9e9;
    object-position: top;
}
.sc-cartgoal-bonus-info{
  min-width:0;
}
.sc-cartgoal-bonus-product{
  margin:0;
  font-size:var(--sc-base-font-size);
  font-weight:700;
  color:var(--sc-drawer-text-color);
  line-height:1.22;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  letter-spacing: 0.5px;
}
.sc-cartgoal-bonus-msg{
  margin:4px 0 0;
  font-size:var(--sc-small-font-size);
  line-height:1.3;
  color: var(--sc-drawer-text-color);
  display:-webkit-box;
  -webkit-line-clamp:2;
  -webkit-box-orient:vertical;
  overflow:hidden;
}
.sc-cartgoal-bonus-arrow.is-locked{
  opacity:1;
}
.sc-cartgoal-bonus-dots{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:5px;
  margin-top:6px;
}
.sc-cartgoal-bonus-dot{
  width:6px;
  height:3px;
  border-radius:999px;
  border:0;
  padding:0;
  background:#dfe3ea;
}
.sc-cartgoal-bonus-dot.is-active{
  width:18px;
  background:#cbd2dc;
}

.sc-upsell{
    order: 2;
    background: var(--sc-upsell-bg);
    flex: 0 0 auto;
    padding: 0px;
}
.sc-upsell-card{padding:0;}
.sc-upsell-title {
    font-size: calc(var(--sc-base-font-size) * 1.08);
    font-weight: 600;
    text-align: center;
    letter-spacing: 0;
    color: var(--sc-drawer-text-color);
    margin-bottom: 2px;
    line-height: 1.2;
}
.sc-upsell-inner {
    padding: 0 20px;
    position: relative;
    overflow: visible;
    width: 100%;
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
  margin-top: 6px;
}
.sc-upsell-item{
    padding: 10px 12px;
    min-height: 72px;
    display: flex;
    align-items: center;
}
.sc-upsell-slide{
  flex: 0 0 100%;
  min-width: 100%;
}
.sc-upsell-row{
  display: grid;
  grid-template-columns:64px minmax(0,1fr);
  gap:12px;
  align-items: center;
  width:100%;
}
.sc-upsell-info{
  display: grid;
  min-width: 0;
  gap:3px;
}
.sc-upsell-top{
  display:flex;
  gap:0;
  align-items:start;
  justify-content:space-between;
}
.sc-upsell-img{
  width:56px;
  height:56px;
  background:#ffffff;
  overflow:hidden;
  border-radius:0.75em;
  display:grid;
  place-items:center;
}
.sc-upsell-img img{
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.sc-upsell-name{
  font-weight:700;
  font-size:calc(var(--sc-base-font-size) * 1.02);
  color: var(--sc-drawer-text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height:1.22;
}
.sc-upsell-sub{
  font-size: 12px;
  color: var(--sc-drawer-text-color);
  opacity: 1;
  display: block;
  text-transform: capitalize;
  display: none;
}
.sc-upsell-price{
  display:flex;
  align-items:center;
  gap:6px;
  font-weight:600;
  font-size: var(--sc-base-font-size);
  color: var(--sc-drawer-text-color);
  white-space: nowrap;
}
.sc-upsell-compare{
  opacity:1;
  text-decoration:line-through;
  font-weight:500;
  font-size:calc(var(--sc-small-font-size) * .94);
}
.sc-upsell-controls{
  display: grid;
  grid-template-columns:minmax(100px,100px) minmax(90px,90px);
  align-items: center;
  gap: 10px;
}
.sc-upsell-controls.no-variant{
  grid-template-columns:minmax(100px,100px);
  justify-content: start;
}
.sc-upsell-select-wrap{
  position: relative;
}
.sc-upsell-select{
  width: 100%;
  border:1px solid #d7dee8;
  padding:0 28px 0 10px;
  font-size:calc(var(--sc-base-font-size) * .92);
  color: var(--sc-drawer-text-color);
  background: #ffffff;
  min-height:28px;
  min-width:0;
  appearance: none;
}
.sc-upsell-select:focus{
  outline: none;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
  border-color: #2563eb;
}
.sc-upsell-select-arrow{
  position: absolute;
  right:12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--sc-upsell-arrow, #111827);
  pointer-events: none;
  font-size:10px;
}
.sc-upsell-btn{
  background: var(--sc-upsell-button-bg, #111111) !important;
  background-color: var(--sc-upsell-button-bg, #111111) !important;
  border:1px solid var(--sc-upsell-button-bg, #111111);
  color: var(--sc-upsell-button-text, #ffffff) !important;
  padding:0 8px;
  font-size:calc(var(--sc-base-font-size) * .92);
  min-height:28px;
  width:100%;
  display: inline-flex;
  align-items: center;
  justify-content:center;
  gap: 6px;
  white-space: nowrap;
  cursor:pointer;
}
.sc-upsell-btn-icon{
  display:none;
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
  width:32px;
  height:44px;
  border-radius:0;
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
.sc-upsell-arrow.left{left:-12px;}
.sc-upsell-arrow.right{right:-12px;}
@media(max-width:420px){
  .sc-upsell-inner{padding:0 26px;}
  .sc-upsell-item{padding:10px 8px;min-height:72px;}
  .sc-upsell-row{grid-template-columns:56px minmax(0,1fr);gap:10px;align-items:center;}
  .sc-upsell-img{width:52px;height:52px;}
  .sc-upsell-controls{grid-template-columns:1fr;gap:6px;}
  .sc-upsell-controls.no-variant{grid-template-columns:1fr;}
  .sc-upsell-title{font-size:16px;margin-bottom:2px;}
}

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
.sc-remove-x:hover{opacity:1}

/* Footer */
.sc-footer {
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
    backdrop-filter: none;
    -webkit-backdrop-filter:none;
    color: var(--sc-drawer-text-color);
    background: var(--sc-footer-bg);
    position: sticky;
    z-index: 8;
    flex:0 0 auto;
    min-height:auto;
   background: linear-gradient(0deg, rgba(255, 255, 255, 1) 10%, rgba(255, 255, 255, 0.95) 100%);
    --tw-shadow: 0 1px 3px 0 rgb(0 0 0 / 50%), 0 1px 2px -1px rgb(0 0 0 / 55%) !important;
    --tw-shadow-colored: 0 1px 3px 0 var(--tw-shadow-color), 0 1px 2px -1px var(--tw-shadow-color) !important;
    box-shadow: 0 0 #0000, 0 0 #0000, 0 1px 3px #0000001a, 0 1px 2px -1px #0000001a !important;
    box-shadow: var(--tw-ring-offset-shadow, 0 0 rgba(213, 123, 123, 0)), var(--tw-ring-shadow, 0 0 rgba(0, 0, 0, 0)), var(--tw-shadow) !important;
   margin-left: 1em !important;
    margin-right: 1em !important;
    border-radius: .75em !important;
    overflow:hidden;
}
.sc-footer.sc-footer-static{
  position:relative;
  bottom:auto;
}
.sc-footer .sc-footer-milestones{
  margin:0 12px;
}
.sc-discount{display:none !important;gap:12px;align-items:center;flex-wrap:wrap;padding: 6px 12px 9px;background:var(--sc-footer-bg);border-bottom:1px solid var(--sc-border);}
.sc-discount:not([hidden]){display:flex !important;}
.sc-discount input {
    flex: 1;
    height: 40px;
    border: 1px solid #cbc8c8;
    background: var(--sc-input-bg);
    padding: 0 14px;
    font-size: var(--sc-base-font-size);
    color: var(--sc-input-text);
    box-shadow: unset !important;
    outline: unset !important;
    outline-offset: unset !important;
    min-width: 0;
    border-radius: .75em !important
}
.sc-discount input::placeholder{color:var(--sc-input-placeholder);}

.sc-discount button{
    min-width: 80px;
    height: 40px;
    border: 1px solid var(--sc-drawer-text-color);
    background: transparent;
    color: var(--sc-drawer-text-color);
    cursor: pointer;
    font-size: var(--sc-base-font-size);
    padding: 0 15px;
    font-weight: 700;
    border-radius: .75em !important;
}
.sc-discount button:disabled{opacity:.75;cursor:wait;}
.sc-discount-msg{
  width:100%;
  margin-top:4px;
  font-size:var(--sc-small-font-size);
  color:#b91c1c;
  text-align:center;
  display:none;
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
      margin: 0;
    font-size: var(--sc-base-font-size);
    font-weight: 700;
    color: var(--sc-drawer-text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
    padding:0;
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
    padding:6px 10px 9px;
  }
  .sc-item{
    grid-template-columns:56px minmax(0, 1fr);
    gap:10px;
    min-height:72px;
    padding:10px 8px;
  }
  .sc-img{
    width:52px;
    height:52px;
  }
  .sc-name{
    font-size:calc(var(--sc-base-font-size) * 1.02) !important;
  }
  .sc-meta-line{
    font-size:var(--sc-base-font-size) !important;
  }
  .sc-qty{
    gap:6px;
  }
  .sc-qty button{
    width:32px;
    height:28px;
    font-size:18px;
  }
  .sc-qty input{
    width:22px;
    height:28px;
    font-size:var(--sc-base-font-size) !important;
  }
  .sc-price{
    font-size:calc(var(--sc-base-font-size) * 1.02);
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

.sc-footer-row{
  display:grid;
  grid-template-columns:minmax(0, 1fr) minmax(0, 1fr);
  gap:0;
  align-items:stretch;
  min-height:56px;
}

.sc-offers{
position: relative;
    z-index: 25;
    max-width: none !important;
    width: 100% !important;
    background: var(--sc-drawer-bg);
    background-size: cover;
    background-position: center;
    pointer-events: auto !important;
    display: flex !important;
    flex-direction: column;
    gap: 0;
    font-size: var(--sc-base-font-size);
    color: var(--sc-drawer-text-color);
    flex: 1 1 auto;
    min-height: 93.3%;
    overflow: auto;
    padding: 8px 10px;
    box-shadow: none !important;
    height: 100%;
    bottom: 10%;
    border-bottom: 1px solid #e9e7e7;
}
.sc-drawer.sc-offers-active .content-cart-smartcartify,
.sc-drawer.sc-offers-active .sc-footer{
  background:var(--sc-drawer-bg) !important;
}
.sc-drawer.sc-offers-active .sc-offers{
  box-shadow:none;
}
.sc-offers[hidden]{display:none !important;}
.sc-offer-row {
  display:grid;
  grid-template-columns:64px minmax(0, 1fr) auto;
  gap:12px;
  align-items:center;
  min-height:76px;
  padding:12px 4px;
  border-bottom:1px solid var(--sc-border);
  box-shadow:none !important;
  margin:0;
}
.sc-offer-row:first-child{border-top:0;}
.sc-offer-row:last-child{border-bottom:0;}
.sc-offer-icon{
  width:56px;
  height:56px;
  border-radius:6px;
  display:grid;
  place-items:center;
  border:1px solid var(--sc-border);
     background: transparent;
  color:var(--sc-offer-icon-color);
}
.sc-offer-icon svg{
  width:50px;
  height:50px;
  display:block;
  stroke-width:1.8;
}
.sc-offer-thumbs{
  width:56px;
  min-height:56px;
  display:grid;
  grid-template-columns:repeat(2, 25px);
  grid-auto-rows:25px;
  gap:4px;
  align-content:center;
  justify-content:center;
}
.sc-offer-thumb{
  width:25px;
  height:25px;
  border-radius:5px;
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
.sc-offer-copy{
  min-width:0;
  display:grid;
  gap:2px;
}

.sc-offer-subtitle{
  margin:4px 0 0;
  color: var(--sc-drawer-text-color);
  font-size:var(--sc-base-font-size);
  line-height:1.3;
  font-weight:500;
  display:-webkit-box;
  -webkit-line-clamp:2;
  -webkit-box-orient:vertical;
  overflow:hidden;
}
.sc-offer-codebox{
  min-width:112px;
  border:1px solid var(--sc-border);
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
  min-height:34px;
  padding:6px 8px;
  border:0;
  background:#ffffff;
  color:var(--sc-drawer-text-color);
  cursor:pointer;
  position:relative;
}
.sc-offer-code{
    font-weight: 700;
    font-size: var(--sc-base-font-size);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
  font-weight:500;
  opacity:0;
  pointer-events:none;
  transition:opacity .15s ease;
}
.sc-offer-code-copy.is-copied .sc-offer-copied-text{
  opacity:1;
}
.sc-offer-code-apply{
  min-height:34px;
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
  border:1px solid var(--sc-checkout-bg);
  background:var(--sc-checkout-bg);
  color:var(--sc-checkout-text);
  padding:8px 12px;
  font-weight:600;
  white-space:nowrap;
  cursor:pointer;
  font-size:var(--sc-base-font-size);
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
  border:0;
  border-top:1px solid var(--sc-border);
  border-radius:0;
  overflow:hidden;
  background:#fff;
  box-shadow:none;
  min-height:42px;
  background: linear-gradient(0deg, rgba(255, 255, 255, 1) 10%, rgba(255, 255, 255, 0.95) 100%);
    --tw-shadow: 0 1px 3px 0 rgb(0 0 0 / 50%), 0 1px 2px -1px rgb(0 0 0 / 55%) !important;
    --tw-shadow-colored: 0 1px 3px 0 var(--tw-shadow-color), 0 1px 2px -1px var(--tw-shadow-color) !important;
    box-shadow: 0 0 #0000, 0 0 #0000, 0 1px 3px #0000001a, 0 1px 2px -1px #0000001a !important;
    box-shadow: var(--tw-ring-offset-shadow, 0 0 rgba(213, 123, 123, 0)), var(--tw-ring-shadow, 0 0 rgba(0, 0, 0, 0)), var(--tw-shadow) !important;
    margin-left: 1em !important;
    margin-right: 1em !important;
     margin-bottom: .5em !important;
    margin-top: .5em !important;
    border-radius: .75em !important;
}
.sc-footer-tabs[hidden]{display:none !important;}
.sc-footer-tab{
  min-height:50px;
  border:0;
  border-bottom:3px solid transparent;
  background:#fff;
  color:var(--sc-tab-icon-color);
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:7px;
  font-size:var(--sc-base-font-size);
  font-weight:700;
  box-shadow:none;
  cursor:pointer;
}
.sc-footer-tab.is-active{
  color:var(--sc-tab-active-color);
  border-bottom-color:var(--sc-tab-active-color);
  fill:var(--sc-tab-active-color);
}
.sc-footer-tab svg,
.sc-footer-tab svg path{
  fill:currentColor !important;
  color:currentColor !important;
}
.sc-footer-tab svg [stroke]{
  stroke:currentColor !important;
}
.sc-footer-tab-icon,
.sc-footer-tab-icon svg{
  width:26px;
  height:26px;
  display:block;
}

/* SmartCartify app icon color normalization */
.smartcartify-cart-drawer .sc-dot-bubble,
.smartcartify-cart-drawer .sc-dot-svg,
.smartcartify-cart-drawer .sc-dot-html,
.smartcartify-cart-drawer .sc-upsell-arrow,
.smartcartify-cart-drawer .sc-offer-thumb{
  color:var(--sc-icon-color);
}
.smartcartify-cart-drawer .sc-dot-bubble svg,
.smartcartify-cart-drawer .sc-dot-bubble svg path,
.smartcartify-cart-drawer .sc-upsell-arrow svg,
.smartcartify-cart-drawer .sc-upsell-arrow svg path,
.smartcartify-cart-drawer .sc-upsell-arrow svg g{
  fill:currentColor !important;
  color:currentColor !important;
}
.smartcartify-cart-drawer .sc-offer-icon svg,
.smartcartify-cart-drawer .sc-offer-icon svg *{
  color:currentColor !important;
}
.smartcartify-cart-drawer .sc-offer-icon svg [stroke]{
  stroke:currentColor !important;
}
.smartcartify-cart-drawer .sc-offer-icon svg [fill]:not([fill="none"]){
  fill:currentColor !important;
}
.smartcartify-cart-drawer .sc-close,
.smartcartify-cart-drawer .sc-close svg,
.smartcartify-cart-drawer .sc-close svg path{
  color:var(--sc-close-icon-color) !important;
  fill:currentColor !important;
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
  display:block;
  margin:0 18px 0;
  border-radius:10px 10px 0 0;
  overflow:hidden;
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
  color:var(--sc-static-progress-text) !important;
  font-size:var(--sc-base-font-size) !important;
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
  background:var(--sc-static-progress, #4343d0);
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
  font-size:calc(var(--sc-base-font-size, 12px) + 2px);
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
  font-size:calc(var(--sc-base-font-size, 12px) + 2px);
  line-height:22px;
  text-align:center;
}
.sc-static-pricebox{
  display:flex;
  align-items:baseline;
  gap:8px;
  color:var(--sc-static-text, #102864);
  font-size:calc(var(--sc-base-font-size, 12px) + 1px);
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
  font-size:var(--sc-base-font-size, 12px);
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
  font-size:calc(var(--sc-base-font-size, 12px) - 2px);
  line-height:18px;
  font-weight:900;
}
.sc-static-upsell-price{
  color:var(--sc-static-upsell-muted, #667180);
  font-size:calc(var(--sc-base-font-size, 12px) - 3px);
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
  background:var(--sc-static-upsell-button-bg, #4343d0);
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
  font-size:var(--sc-base-font-size, 12px);
}
.sc-static-design .sc-discount button{
  min-width:78px;
  height:52px;
  border:2px solid var(--sc-static-progress-text, #53649d);
  border-radius:calc(var(--sc-static-radius, 10px) - 3px);
  background:var(--sc-static-card-bg, #ffffff);
  color:var(--sc-static-text, #102864);
  font-size:var(--sc-base-font-size, 12px);
  font-weight:900;
}
.sc-static-design .sc-discount-msg{
  display:none !important;
}
.sc-static-design .sc-footer{
  padding:0 10px 8px;
  gap:8px;
  background:var(--sc-static-shell-bg, #f4f4f4) !important;
  box-shadow:none;
}
.sc-static-design .sc-footer-row{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:0;
  min-height:56px;
  overflow:hidden;
  border-radius:0 0 var(--sc-static-radius, 10px) var(--sc-static-radius, 10px);
  background:var(--sc-static-card-bg, #ffffff);
  box-shadow:0 1px 3px rgba(15,23,42,.08);
}
.sc-static-design .sc-subtotal-box{
  border:0;
  border-radius:0;
  padding:8px 12px;
  background:var(--sc-static-card-bg, #ffffff);
}
.sc-static-design .sc-sub-label{
  color:var(--sc-static-muted, #8a92a0) !important;
  font-size:calc(var(--sc-base-font-size, 12px) - 2px) !important;
  font-weight:700;
}
.sc-static-design .sc-sub-value{
  color:var(--sc-static-text, #102864) !important;
  font-size:calc(var(--sc-base-font-size, 12px) + 2px) !important;
  line-height:1.15;
  font-weight:900;
}
.sc-static-design .sc-checkout{
  min-height:56px;
  background:var(--sc-static-button-bg, #4343d0) !important;
  color:var(--sc-static-button-text, #ffffff) !important;
  font-size:calc(var(--sc-base-font-size, 12px) + 4px) !important;
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
  color:var(--sc-static-button-bg, #4343d0);
  border-bottom-color:var(--sc-static-button-bg, #4343d0);
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
    margin:0;
    padding:8px;
  }
  .sc-offer-row{
    grid-template-columns:56px minmax(0, 1fr);
    gap:10px;
    padding:12px 0;
  }
  .sc-offer-icon,
  .sc-offer-thumbs{
    width:52px;
    min-height:52px;
  }
  .sc-offer-icon svg{
    width:26px;
    height:26px;
  }
  .sc-offer-thumbs{
    grid-template-columns:repeat(2, 24px);
    grid-auto-rows:24px;
    gap:4px;
  }
  .sc-offer-thumb{
    width:24px;
    height:24px;
    border-radius:5px;
  }
  .sc-offer-codebox,
  .sc-offer-action{
    grid-column:2;
    justify-self:start;
    margin-top:2px;
  }
}

/* ✅ Removed duplicate old offer-tab CSS blocks. Final consolidated offer-tab CSS is below. */
.sc-subtotal-box{
  min-width:0;
  border:none;
  border-radius:0;
  background:var(--sc-subtotal-bg);
  padding:8px 14px;
  display:flex;
  flex-direction:column;
  justify-content:center;
  min-height:56px;
}
.sc-subtotal-box .sc-sub-label{
  font-size: var(--sc-base-font-size);
  color: var(--sc-subtotal-label);
  line-height: 1.15;
  font-weight: 600;
}
.sc-subtotal-box .sc-sub-value{
  font-size:calc(var(--sc-base-font-size) * 1.2);
  font-weight:900;
  color:var(--sc-subtotal-text);
  line-height:1.15;
}

.sc-checkout{
  width:100%;border:none;
  border-radius:0;
  background:var(--sc-checkout-bg);
  color:var(--sc-checkout-text);
  font-size:calc(var(--sc-base-font-size) * 1.12);
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:center;
  position:relative;
  min-height:56px;
  font-weight:800;
  overflow:hidden;
  isolation:isolate;
  transition:transform .18s ease, filter .18s ease;
}
.sc-checkout::before{
  content:"";
  position:absolute;
  inset:-40% auto -40% -45%;
  width:42%;
  transform:skewX(-18deg);
  background:linear-gradient(90deg, transparent, rgba(255,255,255,.34), transparent);
  animation:scCheckoutShine 2.8s ease-in-out infinite;
  z-index:0;
}
.sc-checkout:hover{filter:brightness(1.04);transform:scaleX(1.3);transform-origin:right center;}
.sc-checkout:active{transform:scale(.985);}
.sc-checkout-label{position:relative;z-index:1;}
@keyframes scCheckoutShine{
  0%{left:-45%;opacity:0;}
  18%{opacity:1;}
  45%{left:115%;opacity:0;}
  100%{left:115%;opacity:0;}
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
  position:absolute;
  inset:0;
  background:rgba(17,24,39,.62);
  display:flex;
  align-items:center;
  justify-content:center;
  opacity:0;
  visibility:hidden;
  transition:opacity .2s ease, visibility .2s ease;
  z-index:120 !important;
}
.sc-freegift-overlay.open{
  opacity:1;
  visibility:visible;
}
.sc-freegift-card{
  width:min(380px, calc(100% - 28px));
  max-height:min(680px, calc(100% - 28px));
  background:var(--sc-freegift-bg);
  padding:0;
  border:1px solid var(--sc-freegift-border);
  box-shadow:var(--sc-freegift-shadow);
  position:relative;
  font-size:var(--sc-freegift-font-size);
  color:var(--sc-freegift-text);
  text-align:center;
  overflow:hidden;
  border-radius: 0.75em !important;
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
display: flex;
    flex-direction: column;
    align-items: center;
    padding: 5px 10px;
    border-bottom: 1px solid rgba(15, 23, 42, .1);
}
.sc-freegift-icon {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: var(--sc-freegift-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
}
.sc-freegift-icon svg{width:22px;height:22px;fill:currentColor;}
.sc-freegift-heading{display:grid;gap:8px;}
.sc-freegift-title-text{
    margin: 0;
    font-weight: 700;
    font-size: calc(var(--sc-heading-font-size));
    line-height: 1.2;
    color: var(--sc-freegift-title-color);
    letter-spacing: 0.5px;
}
.sc-freegift-subtext {
    margin: 0;
    font-size: calc(var(--sc-freegift-font-size) * 1.06);
    letter-spacing: 0.5px;
}
.sc-freegift-count{
  display:inline-flex;
  align-items:center;
  min-height:24px;
  border-radius:999px;
  background:var(--sc-freegift-pill-bg);
  color:var(--sc-freegift-pill-text);
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
  max-height:520px;
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
    width: 100%;
    border: 0;
    border-bottom: 1px solid rgba(15, 23, 42, .1);
    background: #fff;
    color: var(--sc-freegift-option-title-color);
    cursor: pointer;
    display: grid;
    grid-template-columns: 60px minmax(0, 1fr) 38px;
    gap: 12px;
    align-items: center;
    padding: 10px 15px;
    text-align: left;
}
.sc-freegift-option:hover{background:#fbfaff;}
.sc-freegift-thumb{
      width: 65px;
    height: 54px;
    overflow: hidden;
    background: #f3f3f3;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 5px;
}
.sc-freegift-thumb img{
      width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    border-radius: 0.75em !important;
}
.sc-freegift-thumb-empty{font-weight:800;color:#7a6a5d;}
.sc-freegift-option-main{
  display:grid;
  gap:4px;
  min-width:0;
}
.sc-freegift-option-title{
    font-size: var(--sc-base-font-size);
    font-weight: 700;
    color: var(--sc-freegift-option-title-color);
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    letter-spacing: 0.5px;
}
.sc-freegift-option-price{
  display:flex;
  align-items:center;
  gap:8px;
  min-height:22px;
}
.sc-freegift-price{
     color: var(--sc-drawer-text-color);
    text-decoration: line-through;
    font-size: var(--sc-base-font-size);
}
.sc-freegift-free-pill{
    display: inline-flex;
    align-items: center;
    min-height: 22px;
    border-radius: 999px;
    background: var(--sc-freegift-pill-bg);
    font-weight: 800;
    font-size: var(--sc-base-font-size);
    color: var(--sc-freegift-pill-text);
    padding: 0 8px;
}
.sc-freegift-check{
    width: 22px;
    height: 22px;
    border: 2px solid var(--sc-freegift-option-title-color);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    justify-self: end;
    font-weight: 900;
    line-height: 1;
    border-radius: 7px;
    box-shadow: inset 0 0 0 1.5px rgba(255,255,255,.35);
    background: #ffffff;
    transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}
.sc-freegift-check::before{
  content:"";
  width:10px;
  height:6px;
  border-left:2.5px solid #ffffff;
  border-bottom:2.5px solid #ffffff;
  transform:rotate(-45deg) scale(.35);
  opacity:0;
  transition:transform .22s cubic-bezier(.2,.9,.2,1.25), opacity .16s ease;
}
.sc-freegift-check svg{width:18px;height:18px;fill:currentColor;}
.sc-freegift-option.selected .sc-freegift-check{
  border-color:var(--sc-freegift-accent);
  background:var(--sc-freegift-accent);
  transform:scale(1.05);
  box-shadow:0 6px 14px rgba(159,66,235,.25);
}
.sc-freegift-option.selected .sc-freegift-check::before{
  transform:rotate(-45deg) scale(1);
  opacity:1;
}
.sc-freegift-option-wrap{
  display:grid;
  gap:0;
}
.sc-freegift-option-wrap.selected{
  overflow:hidden;
  border-radius:18px;
}
.sc-freegift-option-wrap.selected .sc-freegift-option{
  border-bottom-left-radius:0;
  border-bottom-right-radius:0;
}
.sc-freegift-message{
  margin:0;
  padding:10px 18px;
  border-top:1px solid rgba(15,23,42,.08);
  color:var(--sc-freegift-subtext);
  font-size:var(--sc-small-font-size);
  text-align:center;
  display:none;
}
.sc-freegift-variant-panel{
  display:grid;
  gap:12px;
  background:#eee8f6;
  padding:22px;
  border:1px solid rgba(15,23,42,.08);
  border-top:0;
  border-bottom-left-radius:18px;
  border-bottom-right-radius:18px;
}
.sc-freegift-variant-field{
  display:grid;
  gap:8px;
}
.sc-freegift-variant-field label{
  font-size:13px;
  line-height:1.1;
  font-weight:900;
   color: var(--sc-drawer-text-color);
}
.sc-freegift-variant-select-wrap{
  position:relative;
}
.sc-freegift-variant-select{
  width: 100%;
    min-height: 40px;
    border: 0;
    border-radius: 3px;
    background: #ffffff;
    color: var(--sc-drawer-text-color);
    font-size: var(--sc-badge-bg);
    padding: 0 40px 0 14px;
    appearance: none;
}
.sc-freegift-variant-select-wrap::after{
  content:"⌄";
  position:absolute;
  right:13px;
  top:50%;
  transform:translateY(-58%);
  color:var(--sc-freegift-option-title-color);
  font-size:24px;
  pointer-events:none;
}
.sc-freegift-message.is-error{
  color:#b42318;
  font-weight:700;
}
.sc-freegift-add {
    width: 100%;
    border: none;
    border-radius: 0;
    min-height: 54px;
    padding: 10px;
    background: var(--sc-freegift-btn-bg);
    color: var(--sc-freegift-btn-text);
    font-weight: 900;
    font-size: calc(var(--sc-freegift-font-size) * 1.3);
    cursor: pointer;
    transition: transform .2s ease, opacity .2s ease;
    position:sticky;
    bottom:0;
    z-index:2;
    box-shadow:0 -6px 14px rgba(109,43,217,.08);
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
    fill: currentColor;
    vertical-align: middle;
}
/* confetti */
.sc-paper{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:3;}
.sc-paper-piece{position:absolute;border-radius:3px;opacity:0;animation-name:scPaperFall;animation-timing-function:cubic-bezier(.16,.74,.24,1);animation-fill-mode:both;background:linear-gradient(45deg, var(--sc-paper-primary, var(--sc-progress)), color-mix(in srgb, var(--sc-paper-primary, var(--sc-progress)) 35%, #ffffff));box-shadow:0 6px 18px rgba(0,0,0,.10);will-change:transform,opacity;}
.sc-paper-piece:nth-child(4n){border-radius:50%;}
.sc-paper-piece:nth-child(4n+1){border-radius:2px;}
.sc-paper-piece:nth-child(3n){background:linear-gradient(45deg, var(--sc-paper-secondary, #ffcf70), color-mix(in srgb, var(--sc-paper-secondary, #ffcf70) 30%, #ffffff))}
.sc-paper-piece:nth-child(3n+1){background:linear-gradient(45deg, var(--sc-paper-tertiary, #78d7ff), color-mix(in srgb, var(--sc-paper-tertiary, #78d7ff) 30%, #ffffff))}
.sc-header{position:relative;z-index:4;}
.sc-freegift-overlay.sc-freegift-shake .sc-freegift-card{animation:scGiftShake .24s ease both;}
@keyframes scGiftShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}70%{transform:translateX(6px)}}
@keyframes scPaperFall{0%{transform:translate3d(0,-18px,0) rotate(0deg) scale(.82);opacity:0}12%{opacity:1}78%{opacity:.92}100%{transform:translate3d(var(--sc-x),var(--sc-y),0) rotate(560deg) scale(1);opacity:0}}

.sc-celebrate-backdrop{
  position:absolute;inset:0;z-index:2147483006;
  display:flex;align-items:center;justify-content:center;
  color:var(--sc-drawer-header-color);
  background-color:var(--sc-celebrate-backdrop);
  opacity:0;transform:scale(1.01);
  transition:opacity .18s ease, transform .18s ease;
  backdrop-filter:none;
}
.sc-celebrate-backdrop.open{opacity:1;transform:scale(1);}
.sc-celebrate-modal{
  width:min(360px, 86%);
  color:var(--sc-celebrate-title-color, #111827);
  background:var(--sc-celebrate-bg, #ffffff);
  border:1px solid var(--sc-celebrate-border);
  border-radius:18px;
  box-shadow:0 18px 42px rgba(0,0,0,.22);
  padding:20px 16px 18px;
  text-align:center;
  transform:translateY(8px) scale(.96);
  transition:transform .22s cubic-bezier(.2,.9,.2,1.1);
}
.sc-celebrate-backdrop.open .sc-celebrate-modal{
  transform:translateY(0) scale(1);
}
.sc-celebrate-check{
  width:62px;
  height:62px;
  margin:0 auto 11px;
  border-radius:999px;
  display:flex;
  align-items:center;
  justify-content:center;
  background:rgba(34,197,94,.12);
  color:#16a34a;
}
.sc-celebrate-backdrop.is-error .sc-celebrate-check{
  background:rgba(239,68,68,.12);
  color:#dc2626;
}
.sc-celebrate-check-svg{
  width:62px;
  height:62px;
  display:block;
  overflow:visible;
}
.sc-celebrate-check-circle,
.sc-celebrate-check-line,
.sc-celebrate-x-line{
  stroke:currentColor !important;
  stroke-width:5;
  stroke-linecap:round;
  stroke-linejoin:round;
  fill:none !important;
}
.sc-celebrate-check-circle{
  stroke-dasharray:190;
  stroke-dashoffset:190;
}
.sc-celebrate-check-line{
  stroke-dasharray:54;
  stroke-dashoffset:54;
}
.sc-celebrate-x-line{
  stroke-dasharray:34;
  stroke-dashoffset:34;
}
.sc-celebrate-backdrop.open .sc-celebrate-check-circle{
  animation:scCheckCircle .52s ease forwards;
}
.sc-celebrate-backdrop.open .sc-celebrate-check-line{
  animation:scCheckLine .38s ease .38s forwards;
}
.sc-celebrate-backdrop.open .sc-celebrate-x-line-1{animation:scCheckLine .32s ease .38s forwards;}
.sc-celebrate-backdrop.open .sc-celebrate-x-line-2{animation:scCheckLine .32s ease .52s forwards;}
.sc-celebrate-h{font-weight:900;color:var(--sc-celebrate-title-color, #111827);font-size:var(--sc-heading-font-size);line-height:1.2;}
.sc-celebrate-p{margin-top:6px;color:var(--sc-freegift-subtext, #475569);font-size:var(--sc-base-font-size);line-height:1.35;}
@keyframes scCheckCircle{to{stroke-dashoffset:0;}}
@keyframes scCheckLine{to{stroke-dashoffset:0;}}
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

/* =========================================================
   ✅ FINAL Cart + Offers Tab Redesign (matches supplied screenshots)
   - Announcement bar is kept inside cart body and only hidden when [hidden].
   - Dynamic cart, upsell, discount, free gift and offer data remains unchanged.
   - Old duplicate offer-tab CSS blocks were removed; this is the single final source.
========================================================= */
.sc-drawer,
.smartcartify-cart-drawer{
  --sc-ref-gradient:linear-gradient(135deg,#ff3b30 0%,#e12fc0 45%,#ffe1d6 100%);
  background:#f6f7fb !important;
  color:var(--sc-drawer-text-color,#102864) !important;
  overflow:hidden !important;
  box-shadow:-14px 0 34px rgba(15,23,42,.22) !important;
}
.sc-drawer::before{
  height:178px !important;
  background:var(--sc-ref-gradient) !important;
  background-image:var(--sc-ref-gradient) !important;
  opacity:1 !important;
}
.sc-drawer .sc-header {
    flex: 0 0 auto !important;
    padding: 18px 20px 17px !important;
}
.sc-drawer .sc-title-wrap{
  gap:0 !important;
}
.sc-drawer .sc-title-icon{
  display:none !important;
}
.sc-drawer .sc-title{
  margin:0 !important;
  color: var(--sc-drawer-header-color);
  font-size: var(--sc-heading-font-size);
  line-height:1 !important;
  font-weight:700 !important;
  letter-spacing:-.04em !important;
  text-shadow:0 2px 12px rgba(15,23,42,.15) !important;
}
.sc-drawer .sc-title-count{
  color: var(--sc-drawer-header-color);
  font-size: var(--sc-base-font-size);
  font-weight: 700 !important;
  opacity: 1;
}
.sc-drawer .sc-close{
    width: 30px !important;
    min-width: 30px;
    min-height: 30px !important;
    height: 30px !important;
    border: 0 !important;
    border-radius: 999px !important;
    font-size: var(--sc-heading-font-size);
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
}
.sc-drawer .sc-close svg{
  display:block !important;
  width:16px !important;
  height:16px !important;
  color:currentColor !important;
}

.sc-drawer .content-cart-smartcartify,
.sc-drawer .smartcartify-cart-body{
  display:flex !important;
  flex-direction:column !important;
  flex:1 1 auto !important;
  min-height:0 !important;
  height:auto !important;
  padding:0 !important;
  margin:0 !important;
  overflow:hidden !important;
  background:transparent !important;
  visibility:visible !important;
}

/* Cart tab card */
.sc-drawer:not(.sc-offers-active) .sc-items{
  display:flex !important;
  visibility:visible !important;
  flex:1 1 auto !important;
  min-height:0 !important;
  margin:0 14px 8px !important;
  padding:0 !important;
  gap:0 !important;
  border-radius:0.75em !important;
  box-shadow:0 8px 22px rgba(15,23,42,.13) !important;
  overflow:auto !important;
  scrollbar-width:none !important;
  background:#FFFFFF;
}
.sc-drawer:not(.sc-offers-active) .sc-items::-webkit-scrollbar{
  display:none !important;
}
.sc-drawer:not(.sc-offers-active) .sc-announce,
.sc-drawer:not(.sc-offers-active) .smartcartify-announcement-bar{
  display:block;
  flex:0 0 auto !important;
  background:var(--sc-announce-bg) !important;
  color:var(--sc-announce-text, #ffffff) !important;
  border-radius:0.75em 0.75em 0 0 !important;
  box-shadow:none !important;
  overflow:hidden !important;
}
.sc-drawer:not(.sc-offers-active) .sc-announce[hidden],
.sc-drawer:not(.sc-offers-active) .smartcartify-announcement-bar[hidden]{
  display:none !important;
}
.sc-drawer:not(.sc-offers-active) .sc-progress{
    flex: 0 0 auto !important;
    padding: 5px 20px 5px !important;
    background: rgba(255, 255, 255, .96) !important;
    color: var(--sc-progress-text);
    border-bottom: 1px solid #edf0f4 !important;
    box-shadow: none !important;
}
.sc-drawer:not(.sc-offers-active) .sc-label{
    margin: 0 !important;
    min-height: auto !important;
    padding: 0 !important;
    font-size: var(--sc-base-font-size) !important;
    font-weight: 500 !important;
    letter-spacing: 0.5px;
    color: var(--sc-progress-text) !important;
    text-align: center;
}
.sc-drawer:not(.sc-offers-active) .sc-progress.sc-cart-goal-progress .sc-milestone{
  border-bottom:0 !important;
}
.sc-drawer:not(.sc-offers-active) .sc-progress.sc-cart-goal-progress .sc-track{
  height:48px !important;
}
.sc-drawer:not(.sc-offers-active) .sc-progress.sc-cart-goal-progress .sc-track::before,
.sc-drawer:not(.sc-offers-active) .sc-progress.sc-cart-goal-progress .sc-fill{
  top:13px !important;
  height:8px !important;
}
.sc-drawer:not(.sc-offers-active) .sc-dot-wrap{
  top:0 !important;
}
.sc-drawer:not(.sc-offers-active) .sc-dot-text{
  margin-top:3px !important;
  color:var(--sc-progress-text,#273b84) !important;
  font-size:calc(var(--sc-small-font-size,13px) * .96) !important;
}
.sc-drawer:not(.sc-offers-active) .sc-items-list{
  gap:0 !important;
}
.sc-drawer:not(.sc-offers-active) .sc-item{
  grid-template-columns:76px minmax(0,1fr) !important;
  min-height:84px !important;
  padding:12px 14px !important;
}

.sc-drawer:not(.sc-offers-active) .sc-upsell-img img,
.sc-drawer:not(.sc-offers-active) .sc-img img {
  width:100% !important;
  height:100% !important;
  border-radius:0.75em !important;
  object-fit:cover !important;
}

.sc-drawer:not(.sc-offers-active) .sc-img,
.sc-drawer:not(.sc-offers-active) .sc-upsell-img{
  width:60px !important;
  height:50px !important;
  border-radius:0.75em !important;
  object-fit:cover !important;
}
.sc-drawer:not(.sc-offers-active) .sc-name,
.sc-drawer:not(.sc-offers-active) .sc-name a{
  color:var(--sc-drawer-text-color) !important;
  font-weight:700 !important;
  font-size:var(--sc-base-font-size) !important;
  letter-spacing: 0.5px;
}
.sc-drawer:not(.sc-offers-active) .sc-price{
  color:var(--sc-drawer-text-color,#102864) !important;
  font-size:var(--sc-base-font-size,12px) !important;
  font-weight:900 !important;
}
.sc-drawer:not(.sc-offers-active) .sc-qty button{
  width:36px !important;
  min-width:36px !important;
  height:27px !important;
  border:1px solid #dfe5ee !important;
  border-radius:9px !important;
  color: var(--sc-close-icon-color);
  box-shadow:0 1px 2px rgba(15,23,42,.06) !important;
}
.sc-drawer:not(.sc-offers-active) .sc-qty button:hover {
    background: var(--sc-apply-bg);
    color: var(--sc-apply-text);
}
.sc-drawer:not(.sc-offers-active) .sc-qty input{
  color:var(--sc-drawer-text-color,#102864) !important;
  font-weight:900 !important;
}
.sc-drawer:not(.sc-offers-active) .sc-cartgoal-bonus{
  border-bottom:1px solid #edf0f4 !important;
  background:#ffffff !important;
}

.sc-drawer:not(.sc-offers-active) .sc-upsell,
.sc-drawer:not(.sc-offers-active) .sc-cartgoal-bonus{
  flex:0 0 auto !important;
}
.sc-drawer:not(.sc-offers-active) .sc-upsell-card,
.sc-drawer:not(.sc-offers-active) .sc-upsell-inner,
.sc-drawer:not(.sc-offers-active) .sc-upsell-item{
  border-radius:0 !important;
  background: var(--sc-upsell-bg);
  border: 0 !important;
  box-shadow: none !important;
  padding: 5px 15px;
}
.sc-drawer:not(.sc-offers-active) .sc-upsell-btn {
    min-height: 30px !important;
    border-radius: 4px !important;
    background: var(--sc-checkout-bg) !important;
    color: var(--sc-checkout-text) !important;
    font-size: var(--sc-base-font-size);
    font-weight: 600 !important;
    text-transform: capitalize;
}

/* Cart discount + checkout card */
.sc-drawer:not(.sc-offers-active) .sc-footer{
  display:flex !important;
  visibility:visible !important;
  flex:0 0 auto !important;
  margin:0 14px 0 !important;
  padding:0 !important;
  border:1px solid rgba(226,232,240,.95) !important;
  border-radius:0.75em !important;
  background:#ffffff !important;
  color:var(--sc-drawer-text-color,#102864) !important;
  box-shadow:0 6px 18px rgba(15,23,42,.11) !important;
  overflow:hidden !important;
}
.sc-drawer:not(.sc-offers-active) .sc-discount{
  gap:10px !important;
  padding:10px 12px 8px !important;
  background:#ffffff !important;
  border-bottom:1px solid #edf0f4 !important;
}
.sc-drawer:not(.sc-offers-active) .sc-discount input{
  height:42px !important;
  border:1px solid #dde3ed !important;
  border-radius:7px !important;
  background:#ffffff !important;
  color:var(--sc-input-text,#102864) !important;
  font-size:calc(var(--sc-base-font-size,12px) * .95) !important;
}
.sc-drawer:not(.sc-offers-active) .sc-discount button{
  min-width:78px !important;
  height:42px !important;
  border:1px solid var(--sc-drawer-text-color,#102864) !important;
  border-radius:7px !important;
  background:#ffffff !important;
  color:var(--sc-drawer-text-color,#102864) !important;
  font-weight:900 !important;
}
.sc-drawer:not(.sc-offers-active) .sc-footer-row{
  min-height:54px !important;
  grid-template-columns:minmax(0,1fr) minmax(0,1fr) !important;
}
.sc-drawer:not(.sc-offers-active) .sc-subtotal-box{
  padding:10px 22px !important;
  background:#ffffff !important;
  color:var(--sc-drawer-text-color,#102864) !important;
}
.sc-drawer:not(.sc-offers-active) .sc-sub-label{
  color:#6f7a8a !important;
  font-size:calc(var(--sc-base-font-size,12px) * .92) !important;
  font-weight:500 !important;
}

.sc-drawer:not(.sc-offers-active) .sc-checkout{
  border-radius:0 !important;
  background:var(--sc-checkout-bg,#a83df0) !important;
  color:var(--sc-checkout-text,#ffffff) !important;
  font-size:calc(var(--sc-base-font-size,12px) * 1.08) !important;
  font-weight:900 !important;
}

/* Bottom tabs - visible in both Cart and Offers */
.sc-drawer .sc-footer-tabs{
  display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    flex: 0 0 auto !important;
    min-height: 50px !important;
    margin: 10px 14px 5px !important;
    border: 1px solid rgba(226, 232, 240, .95) !important;
    border-radius: .75em !important;
    background: #ffffff !important;
    box-shadow: 0 8px 22px rgba(15, 23, 42, .13) !important;
    overflow: hidden !important;
}
.sc-drawer .sc-footer-tabs[hidden]{
  display:none !important;
}
.sc-drawer .sc-footer-tab{
  min-height:50px !important;
  border:0 !important;
  border-bottom:3px solid transparent !important;
  background:#ffffff !important;
  color:var(--sc-tab-icon-color,#102864) !important;
  font-size:calc(var(--sc-base-font-size,12px) * 1.08) !important;
  font-weight:700 !important;
  gap:8px !important;
}
.sc-drawer .sc-footer-tab.is-active{
  color:var(--sc-tab-active-color,var(--sc-checkout-bg,#a83df0)) !important;
  border-bottom-color:var(--sc-tab-active-color,var(--sc-checkout-bg,#a83df0)) !important;
}
.sc-drawer .sc-footer-tab-icon,
.sc-drawer .sc-footer-tab-icon svg{
  width:18px !important;
  height:18px !important;
}

/* Offers tab full page */
.sc-drawer.sc-offers-active,
.smartcartify-cart-drawer.sc-offers-active{
  background:#f6f7fb !important;
}
.sc-drawer.sc-offers-active::before{
  height:178px !important;
  background:var(--sc-ref-gradient) !important;
  background-image:var(--sc-ref-gradient) !important;
}
.sc-drawer.sc-offers-active .content-cart-smartcartify,
.sc-drawer.sc-offers-active .smartcartify-cart-body{
  display:flex !important;
  visibility:visible !important;
  height:auto !important;
  min-height:0 !important;
  flex:1 1 auto !important;
  flex-direction:column !important;
  overflow:hidden !important;
  padding:0 !important;
  margin:0 !important;
  background:transparent !important;
}
.sc-drawer.sc-offers-active .sc-items,
.sc-drawer.sc-offers-active .sc-progress,
.sc-drawer.sc-offers-active .sc-cart-msg,
.sc-drawer.sc-offers-active .sc-items-list,
.sc-drawer.sc-offers-active .sc-items-footer,
.sc-drawer.sc-offers-active .sc-footer,
.sc-drawer.sc-offers-active .sc-discount,
.sc-drawer.sc-offers-active .sc-discount-loading-overlay{
  display:none !important;
  visibility:hidden !important;
  height:0 !important;
  min-height:0 !important;
  overflow:hidden !important;
  padding:0 !important;
  margin:0 !important;
  border:0 !important;
}
.sc-drawer.sc-offers-active .sc-offers{
  display:flex !important;
  visibility:visible !important;
  opacity:1 !important;
  position:relative !important;
  inset:auto !important;
  bottom:auto !important;
  z-index:30 !important;
  width:calc(100% - 28px) !important;
  max-width:none !important;
  height:auto !important;
  min-height:0 !important;
  flex:1 1 auto !important;
  margin:0 14px 0px 14px !important;
  padding:0 !important;
  border:1px solid rgba(226,232,240,.95) !important;
  border-radius:14px !important;
  background:#ffffff !important;
  color:var(--sc-drawer-text-color,#102864) !important;
  box-shadow:0 8px 22px rgba(15,23,42,.13) !important;
  overflow:auto !important;
  scrollbar-width:none !important;
}
.sc-drawer.sc-offers-active .sc-offers::-webkit-scrollbar{
  display:none !important;
}
.sc-drawer.sc-offers-active .sc-offer-row{
  display:grid !important;
  grid-template-columns:72px minmax(0,1fr) auto !important;
  align-items:center !important;
  gap:10px !important;
  min-height:92px !important;
  padding:14px 12px !important;
  border-bottom:1px solid #edf0f4 !important;
  background:#ffffff !important;
}
.sc-drawer.sc-offers-active .sc-offer-row:last-child{
  border-bottom:0 !important;
}
.sc-drawer.sc-offers-active .sc-offer-icon,
.sc-drawer.sc-offers-active .sc-offer-thumbs{
  width:60px !important;
  height:58px !important;
  min-height:58px !important;
  border-radius:9px !important;
  display:grid !important;
  place-items:center !important;
  background:#f5f6f8 !important;
  color:var(--sc-offer-icon-color,#111111) !important;
  overflow:hidden !important;
}
.sc-drawer.sc-offers-active .sc-offer-icon svg{
  width:34px !important;
  height:34px !important;
  color:currentColor !important;
}
.sc-drawer.sc-offers-active .sc-offer-thumbs{
  grid-template-columns:repeat(2,28px) !important;
  grid-auto-rows:27px !important;
  gap:3px !important;
  background:transparent !important;
}
.sc-drawer.sc-offers-active .sc-offer-thumb{
  width:28px !important;
  height:27px !important;
  border-radius:6px !important;
  background:#f5f6f8 !important;
  overflow:hidden !important;
  display:grid !important;
  place-items:center !important;
  color:#102864 !important;
  font-weight:900 !important;
  font-size:11px !important;
}
.sc-drawer.sc-offers-active .sc-offer-thumb img{
  width:100% !important;
  height:100% !important;
  object-fit:cover !important;
  display:block !important;
}
.sc-drawer.sc-offers-active .sc-offer-copy{
  min-width:0 !important;
  display:flex !important;
  flex-direction:column !important;
  gap:5px !important;
}
.sc-drawer.sc-offers-active .sc-offer-title{
  margin:0 !important;
  color:var(--sc-drawer-text-color,#102864) !important;
  font-size:calc(var(--sc-base-font-size,12px) * 1.02) !important;
  line-height:1.16 !important;
  font-weight:900 !important;
}

.sc-drawer.sc-offers-active .sc-offer-subtitle{
  margin:0 !important;
  color:var(--sc-drawer-text-color) !important;
  font-size:calc(var(--sc-base-font-size) * .9) !important;
  line-height:1.34 !important;
  font-weight:500 !important;
  display:-webkit-box !important;
  -webkit-line-clamp:2 !important;
  -webkit-box-orient:vertical !important;
  overflow:hidden !important;
  letter-spacing: 0.5px;
}
.sc-drawer.sc-offers-active .sc-offer-code-copy{
  display:flex !important;
  align-items:center !important;
  justify-content:center !important;
  gap:5px !important;
  min-height:34px !important;
  padding:6px 8px !important;
  border:0 !important;
  background:#ffffff !important;
  color:var(--sc-drawer-text-color,#102864) !important;
}
.sc-drawer.sc-offers-active .sc-offer-copy-icon,
.sc-drawer.sc-offers-active .sc-offer-copy-icon svg{
  width:14px !important;
  height:14px !important;
  color:currentColor !important;
}
.sc-drawer.sc-offers-active .sc-offer-copied-text{
  background:var(--sc-checkout-bg,#a83df0) !important;
  color:var(--sc-checkout-text,#ffffff) !important;
}
.sc-drawer.sc-offers-active .sc-offer-code-apply{
  display:flex !important;
  align-items:center !important;
  justify-content:center !important;
  min-height:36px !important;
  border:0 !important;
  border-radius:0 !important;
  background:var(--sc-checkout-bg,#a83df0) !important;
  color:var(--sc-checkout-text,#ffffff) !important;
  font-size:calc(var(--sc-base-font-size,12px) * .92) !important;
  font-weight:800 !important;
  cursor:pointer !important;
}
.sc-drawer.sc-offers-active .sc-offer-code-apply:disabled{
  opacity:.72 !important;
  cursor:default !important;
}

.sc-drawer.sc-offers-active .sc-offer-codebox{
  width:128px !important;
  min-width:128px !important;
  border:1px solid #e4e8f0 !important;
  border-radius:7px !important;
  background:var(--sc-line-loader-bg, #ffffff) !important;
  overflow:hidden !important;
  box-shadow:0 6px 16px rgba(15,23,42,.08) !important;
}

.sc-drawer.sc-offers-active .sc-offer-code{
  font-size:calc(var(--sc-base-font-size,12px) * .98) !important;
  font-weight:900 !important;
  overflow:hidden !important;
  text-overflow:ellipsis !important;
  white-space:nowrap !important;
}

.sc-drawer.sc-offers-active .sc-offer-action{
  justify-self:end !important;
  min-width:104px !important;
  border:2px solid var(--sc-checkout-bg,#a83df0) !important;
  border-radius:10px !important;
  background:#ffffff !important;
  color:var(--sc-checkout-bg,#a83df0) !important;
  padding:9px 12px !important;
  font-size:calc(var(--sc-base-font-size,12px) * .96) !important;
  font-weight:900 !important;
  box-shadow:0 4px 10px rgba(15,23,42,.04) !important;
}
.sc-drawer.sc-offers-active .sc-offers-empty{
  padding:32px 18px !important;
  color:#6f7a8a !important;
  font-weight:900 !important;
}

@media (max-width:420px){
.sc-drawer .sc-header {
    flex: 0 0 auto !important;
    padding: 18px 20px 17px !important;
}
  .sc-drawer .sc-title{
    font-size: var(--sc-heading-font-size);
  }
  .sc-drawer:not(.sc-offers-active) .sc-items{
    margin:0 14px 8px !important;
  }
  .sc-drawer:not(.sc-offers-active) .sc-item{
    grid-template-columns:74px minmax(0,1fr) !important;
    min-height:84px !important;
    padding:12px 14px !important;
  }
  .sc-drawer:not(.sc-offers-active) .sc-img,
  .sc-drawer:not(.sc-offers-active) .sc-img img{
    width:56px !important;
    height:56px !important;
    border-radius:0.75em !important;
  }
  .sc-drawer.sc-offers-active .sc-offer-row{
    grid-template-columns:68px minmax(0,1fr) auto !important;
    min-height:90px !important;
    padding:13px 10px !important;
  }
  .sc-drawer.sc-offers-active .sc-offer-codebox{
    width:124px !important;
    min-width:124px !important;
  }
  .sc-drawer.sc-offers-active .sc-offer-action{
    min-width:auto !important;
    padding:8px 10px !important;
    font-size:calc(var(--sc-base-font-size,12px) * .88) !important;
  }
  .sc-drawer .sc-footer-tabs{
    min-height:70px !important;
    margin:12px 14px 14px !important;
  }
}
/* SmartCartify Corner-style dynamic loader + checkbox effect */
.smartcartify-cart-drawer .sc-line-loader{
  display:none;
  width:100%;
  height:4px;
  flex:0 0 4px;
  position:relative;
  z-index:30;
  margin:0;
  padding:0;
  background:var(--sc-line-loader-bg, #ffffff) !important;
  overflow:hidden !important;
  border-radius:0;
  box-shadow:0 1px 0 rgba(15,23,42,.06);
  isolation:isolate;
}
.smartcartify-cart-drawer .sc-line-loader.is-active:not([hidden]),
.smartcartify-cart-drawer.sc-refreshing .sc-line-loader:not([hidden]),
.smartcartify-cart-drawer.sc-applying-discount .sc-line-loader:not([hidden]){
  display:block !important;
}
.smartcartify-cart-drawer .sc-line-loader-bg{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  background:var(--sc-line-loader-bg, #ffffff) !important;
  overflow:hidden !important;
  border-radius:0;
}
.smartcartify-cart-drawer .sc-line-loader-bg::before{
  content:"";
  position:absolute;
  left:0;
  right:0;
  top:50%;
  height:0px;
  transform:translateY(-50%);
  background:var(--sc-line-loader-track, rgba(15,23,42,.08));
}
.smartcartify-cart-drawer .sc-line-loader-runner{
  position:absolute;
  inset:0 auto 0 0;
  width:100%;
  height:100%;
  border-radius:999px;
  background:linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--sc-line-loader-accent, var(--sc-progress, #4343d0)) 14%, transparent) 20%, var(--sc-line-loader-accent, var(--sc-progress, #4343d0)) 50%, color-mix(in srgb, var(--sc-line-loader-accent, var(--sc-progress, #4343d0)) 14%, transparent) 80%, transparent 100%) !important;
  transform:translate3d(-105%,0,0);
  animation:none !important;
  will-change:transform;
}
.smartcartify-cart-drawer .sc-line-loader.is-active .sc-line-loader-runner.is-running{
  animation:scCornerIndeterminateLine 1.08s cubic-bezier(.42,0,.18,1) infinite !important;
}
@keyframes scCornerIndeterminateLine{
  0%{transform:translate3d(-105%,0,0);}
  100%{transform:translate3d(105%,0,0);}
}
.smartcartify-cart-drawer .sc-items-loading,
.smartcartify-cart-drawer .sc-discount-loading-overlay{
  display:none !important;
  visibility:hidden !important;
  opacity:0 !important;
  pointer-events:none !important;
}
.smartcartify-cart-drawer .sc-freegift-check{
  width:20px !important;
  height:20px !important;
  border-radius:4px !important;
  position:relative !important;
  display:inline-flex !important;
  align-items:center !important;
  justify-content:center !important;
  justify-self:end !important;
  overflow:visible !important;
  background:var(--sc-checkbox-empty-bg, #ffffff) !important;
  border:2px solid var(--sc-checkbox-empty-border, color-mix(in srgb, var(--sc-drawer-text-color) 45%, #ffffff)) !important;
  color:#ffffff !important;
  box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.35);
  transform:scale(1);
  transition:background .18s ease, border-color .18s ease, box-shadow .18s ease, transform .18s ease;
}
.smartcartify-cart-drawer .sc-freegift-check::before{
  content:none !important;
}
.smartcartify-cart-drawer .sc-freegift-check svg{
  width:18px !important;
  height:18px !important;
  display:block !important;
  overflow:visible !important;
  position:relative !important;
  z-index:2 !important;
}
.smartcartify-cart-drawer .sc-freegift-check svg path{
  fill:none !important;
  stroke:var(--sc-checkbox-check, #ffffff) !important;
  stroke-width:3.3 !important;
  stroke-linecap:round !important;
  stroke-linejoin:round !important;
  stroke-dasharray:28;
  stroke-dashoffset:28;
  opacity:0;
}
.smartcartify-cart-drawer .sc-freegift-check .sc-check-sparks{
  position:absolute !important;
  right:-13px !important;
  top:50% !important;
  width:15px !important;
  height:24px !important;
  transform:translateY(-50%) !important;
  pointer-events:none !important;
  overflow:visible !important;
  z-index:3 !important;
}
.smartcartify-cart-drawer .sc-freegift-check .sc-check-sparks i{
  position:absolute !important;
  left:1px !important;
  width:11px !important;
  height:3px !important;
  border-radius:999px !important;
  background:var(--sc-checkbox-spark, var(--sc-freegift-accent, #4343d0)) !important;
  opacity:0;
  transform-origin:left center !important;
}
.smartcartify-cart-drawer .sc-freegift-check .sc-check-sparks i:nth-child(1){top:1px;transform:rotate(-38deg) scaleX(.35);}
.smartcartify-cart-drawer .sc-freegift-check .sc-check-sparks i:nth-child(2){top:10px;transform:rotate(0deg) scaleX(.35);}
.smartcartify-cart-drawer .sc-freegift-check .sc-check-sparks i:nth-child(3){top:19px;transform:rotate(38deg) scaleX(.35);}
.smartcartify-cart-drawer .sc-freegift-option.selected .sc-freegift-check,
.smartcartify-cart-drawer .sc-freegift-check.sc-check-animate{
  background:var(--sc-checkbox-accent, var(--sc-freegift-accent, #4343d0)) !important;
  border-color:var(--sc-checkbox-accent, var(--sc-freegift-accent, #4343d0)) !important;
  box-shadow:0 7px 16px rgba(159,66,235,.30);
  animation:scGiftCheckPop .34s cubic-bezier(.2,.9,.2,1.25) both;
}
.smartcartify-cart-drawer .sc-freegift-option.selected .sc-freegift-check svg path,
.smartcartify-cart-drawer .sc-freegift-check.sc-check-animate svg path{
  animation:scGiftCheckDraw .42s ease .08s forwards;
}
.smartcartify-cart-drawer .sc-freegift-option.selected .sc-freegift-check .sc-check-sparks i,
.smartcartify-cart-drawer .sc-freegift-check.sc-check-animate .sc-check-sparks i{
  animation:scGiftCheckSpark .58s ease both;
}
.smartcartify-cart-drawer .sc-freegift-option.selected .sc-freegift-check .sc-check-sparks i:nth-child(1),
.smartcartify-cart-drawer .sc-freegift-check.sc-check-animate .sc-check-sparks i:nth-child(1){animation-delay:.10s;}
.smartcartify-cart-drawer .sc-freegift-option.selected .sc-freegift-check .sc-check-sparks i:nth-child(2),
.smartcartify-cart-drawer .sc-freegift-check.sc-check-animate .sc-check-sparks i:nth-child(2){animation-delay:.15s;}
.smartcartify-cart-drawer .sc-freegift-option.selected .sc-freegift-check .sc-check-sparks i:nth-child(3),
.smartcartify-cart-drawer .sc-freegift-check.sc-check-animate .sc-check-sparks i:nth-child(3){animation-delay:.20s;}
@keyframes scGiftCheckPop{
  0%{transform:scale(.62) rotate(-8deg);}
  58%{transform:scale(1.18) rotate(2deg);}
  100%{transform:scale(1) rotate(0deg);}
}
@keyframes scGiftCheckDraw{
  0%{stroke-dashoffset:28;opacity:0;}
  1%{opacity:1;}
  100%{stroke-dashoffset:0;opacity:1;}
}
@keyframes scGiftCheckSpark{
  0%{opacity:0;transform:translateX(-2px) rotate(var(--sc-spark-rotate, 0deg)) scaleX(.15);}
  28%{opacity:1;}
  70%{opacity:1;transform:translateX(2px) rotate(var(--sc-spark-rotate, 0deg)) scaleX(1);}
  100%{opacity:0;transform:translateX(7px) rotate(var(--sc-spark-rotate, 0deg)) scaleX(.2);}
}
.smartcartify-cart-drawer .sc-freegift-check .sc-check-sparks i:nth-child(1){--sc-spark-rotate:-38deg;}
.smartcartify-cart-drawer .sc-freegift-check .sc-check-sparks i:nth-child(2){--sc-spark-rotate:0deg;}
.smartcartify-cart-drawer .sc-freegift-check .sc-check-sparks i:nth-child(3){--sc-spark-rotate:38deg;}
.smartcartify-cart-drawer .sc-progress-check-svg svg{
  width:15px !important;
  height:15px !important;
  display:block !important;
  overflow:visible !important;
}
.smartcartify-cart-drawer .sc-progress-check-svg svg path{
  fill:none !important;
  stroke:currentColor !important;
  stroke-width:3.2 !important;
  stroke-linecap:round !important;
  stroke-linejoin:round !important;
  stroke-dasharray:26;
  stroke-dashoffset:0;
}
.smartcartify-cart-drawer .sc-dot-wrap.just-done .sc-dot-bubble{
  animation:scMilestoneCheckPop .34s cubic-bezier(.2,.9,.2,1.25) both;
}
.smartcartify-cart-drawer .sc-dot-wrap.just-done .sc-progress-check-svg svg path{
  stroke-dashoffset:26;
  animation:scGiftCheckDraw .38s ease .08s forwards;
}
@keyframes scMilestoneCheckPop{
  0%{transform:scale(.72);}
  65%{transform:scale(1.2);}
  100%{transform:scale(1);}
}
.smartcartify-cart-drawer .sc-celebrate-modal{
  background:#ffffff !important;
  color:#111827 !important;
}
.smartcartify-cart-drawer .sc-celebrate-check-svg *,
.smartcartify-cart-drawer .sc-celebrate-check-circle,
.smartcartify-cart-drawer .sc-celebrate-check-line,
.smartcartify-cart-drawer .sc-celebrate-x-line{
  fill:none !important;
}

/* Cart goal completed milestone: keep the same icon and turn it white */
.smartcartify-cart-drawer .sc-progress.sc-cart-goal-progress .sc-dot-wrap.done .sc-dot-bubble,
.smartcartify-cart-drawer .sc-dot-wrap.done .sc-dot-bubble{
  background:var(--sc-progress) !important;
  border-color:var(--sc-progress) !important;
  color:#ffffff !important;
}
.smartcartify-cart-drawer .sc-progress.sc-cart-goal-progress .sc-dot-wrap.done .sc-dot-bubble .sc-dot-svg,
.smartcartify-cart-drawer .sc-progress.sc-cart-goal-progress .sc-dot-wrap.done .sc-dot-bubble .sc-dot-html,
.smartcartify-cart-drawer .sc-progress.sc-cart-goal-progress .sc-dot-wrap.done .sc-dot-bubble svg,
.smartcartify-cart-drawer .sc-progress.sc-cart-goal-progress .sc-dot-wrap.done .sc-dot-bubble svg *,
.smartcartify-cart-drawer .sc-dot-wrap.done .sc-dot-bubble .sc-dot-svg,
.smartcartify-cart-drawer .sc-dot-wrap.done .sc-dot-bubble .sc-dot-html,
.smartcartify-cart-drawer .sc-dot-wrap.done .sc-dot-bubble svg,
.smartcartify-cart-drawer .sc-dot-wrap.done .sc-dot-bubble svg *{
  color:#ffffff !important;
}
.smartcartify-cart-drawer .sc-progress.sc-cart-goal-progress .sc-dot-wrap.done .sc-dot-bubble svg [fill]:not([fill="none"]),
.smartcartify-cart-drawer .sc-dot-wrap.done .sc-dot-bubble svg [fill]:not([fill="none"]){
  fill:currentColor !important;
}
.smartcartify-cart-drawer .sc-progress.sc-cart-goal-progress .sc-dot-wrap.done .sc-dot-bubble svg [stroke],
.smartcartify-cart-drawer .sc-dot-wrap.done .sc-dot-bubble svg [stroke]{
  stroke:currentColor !important;
}
.smartcartify-cart-drawer .sc-dot-wrap.just-done .sc-dot-bubble{
  animation:scMilestoneCheckPop .34s cubic-bezier(.2,.9,.2,1.25) both;
}


    `;
    document.head.appendChild(s);
  };
  ensureStyles();

  // ✅ Announcement bar inside the cart items container
  drawer.innerHTML = `
    <div class="sc-header smartcartify-cart-header">
      <div class="sc-title-wrap">
        <span class="sc-title-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 6h15l-1.1 6.2a2 2 0 0 1-2 1.7H9.2A2 2 0 0 1 7.2 12L6 6Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
            <path d="M6 6H4M9 18a1 1 0 1 0 0 .01M18 18a1 1 0 1 0 0 .01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </span>
        <h3 class="sc-title">Cart <span class="sc-title-count" data-cart-title-count>(0)</span></h3>
      </div>
      <button class="sc-close" data-close type="button" aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M6.7 5.3 12 10.6l5.3-5.3a1 1 0 1 1 1.4 1.4L13.4 12l5.3 5.3a1 1 0 0 1-1.4 1.4L12 13.4l-5.3 5.3a1 1 0 0 1-1.4-1.4l5.3-5.3-5.3-5.3a1 1 0 0 1 1.4-1.4Z"/>
        </svg>
      </button>
    </div>
    <div class="content-cart-smartcartify smartcartify-cart-body">
    <div class="sc-items">
      <div class="sc-announce smartcartify-announcement-bar" data-sc-announce hidden></div>
      <div class="sc-progress corner-covey-cart-undefined-loading-bar-wrapper">
        <p class="sc-label">Loading…</p>

        <div class="sc-milestone">
          <div class="sc-track">
            <div class="sc-fill"></div>
            <div class="sc-dots"></div>
          </div>
        </div>

        <div class="sc-legends"></div>

        <div id="corner-cowi-cart-indeterminate-loading-bar-wrapper" class="sc-line-loader corner-covey-cart-undefined-loading-bar-wrapper" data-sc-line-loader hidden aria-hidden="true">
          <div id="corner-cowi-cart-indeterminate-loading-bar-bg" class="sc-line-loader-bg">
            <div id="corner-cowi-cart-indeterminate-loading-bar-runner" class="sc-line-loader-runner">&nbsp;</div>
          </div>
        </div>
      </div>
      <div class="sc-cart-msg" data-sc-cart-msg hidden>
        <p class="sc-cart-msg-text" data-sc-cart-msg-text></p>
        <button class="sc-cart-msg-close" type="button" data-sc-cart-msg-close aria-label="Close">&times;</button>
      </div>
      <div class="sc-items-list">
        <div class="sc-empty">Loading cart…</div>
      </div>
      <div class="sc-items-footer">
        <div class="sc-cartgoal-bonus" hidden></div>
        <div class="sc-upsell" hidden></div>
      </div>
    </div>

    <div class="sc-offers" data-offers-panel hidden></div>
    <div class="sc-footer">
      <div class="sc-footer-milestones" data-footer-milestones hidden></div>
      <div class="sc-discount" data-discount-panel hidden>
        <input
          type="text"
          data-discount-input
          placeholder="Apply Discount Code"
          autocomplete="off"
          spellcheck="false"
        />
        <button type="button" data-discount-apply>Apply</button>
        <div class="sc-discount-msg" data-discount-msg hidden></div>
      </div>
      <div class="sc-footer-row">
        <div class="sc-subtotal-box">
          <span class="sc-sub-label">Total</span>
          <strong class="sc-sub-value" data-subtotal>--</strong>
        </div>
        <button class="sc-checkout" data-checkout type="button">
          <span class="sc-checkout-label">Checkout</span>
        </button>
      </div>
    </div>
    <div class="sc-footer-tabs" data-offer-tabs hidden>
      <button class="sc-footer-tab is-active" data-drawer-tab="cart" type="button">
        <span class="sc-footer-tab-icon" aria-hidden="true">
         <svg viewBox="0 0 255 255" fill="rgb(9,27,107)" xmlns="http://www.w3.org/2000/svg" style="fill: rgb(9, 27, 107);"><path fill-rule="evenodd" clip-rule="evenodd" d="M0 13.6395C0 6.10663 6.10501 0 13.6359 0H20.7503C43.4539 0 62.1832 17.02 64.8815 39H215.849C241.649 39 260.387 63.5385 253.6 88.4363L234.404 152.851C231.168 164.72 220.391 172.953 208.092 172.953H61.9448C48.1927 172.953 37.0444 161.802 37.0444 148.047V39H37.0532C34.7667 32.1872 28.3315 27.2791 20.7503 27.2791H13.6359C6.10501 27.2791 0 21.1724 0 13.6395ZM88.1056 255C103.588 255 116.139 242.688 116.139 227.5C116.139 212.312 103.588 200 88.1056 200C72.6231 200 60.072 212.312 60.072 227.5C60.072 242.688 72.6231 255 88.1056 255ZM214.257 227.5C214.257 242.688 201.93 255 186.724 255C171.518 255 159.191 242.688 159.191 227.5C159.191 212.312 171.518 200 186.724 200C201.93 200 214.257 212.312 214.257 227.5ZM87.9883 120.115C118.946 143.929 162.054 143.929 193.012 120.115L178.988 101.885C156.298 119.339 124.702 119.339 102.012 101.885L87.9883 120.115Z"></path></svg>
        </span>
        <span>Cart</span>
      </button>
      <button class="sc-footer-tab" data-drawer-tab="offers" type="button">
        <span class="sc-footer-tab-icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="rgb(9,27,107)" d="M20 13v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-7h16zM14.5 2a3.5 3.5 0 0 1 3.163 5.001L21 7a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1l3.337.001a3.5 3.5 0 0 1 5.664-3.95A3.48 3.48 0 0 1 14.5 2zm-5 2a1.5 1.5 0 0 0-.144 2.993L9.5 7H11V5.5a1.5 1.5 0 0 0-1.356-1.493L9.5 4zm5 0l-.144.007a1.5 1.5 0 0 0-1.35 1.349L13 5.5V7h1.5l.144-.007a1.5 1.5 0 0 0 0-2.986L14.5 4z"></path></svg>
        </span>
        <span>Offers</span>
      </button>
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
    const cartBody = drawer.querySelector(".content-cart-smartcartify");
    const footer = drawer.querySelector(".sc-footer");
    const footerRow = drawer.querySelector(".sc-footer-row");
    const footerMilestones = drawer.querySelector("[data-footer-milestones]");
    const offers = drawer.querySelector("[data-offers-panel]");
    if (cartBody) cartBody.hidden = false;
    if (footer) footer.hidden = false;
    if (cartContent) cartContent.hidden = false;
    if (items) items.hidden = false;
    if (offers) offers.hidden = true;
    const isEmptyCartNow = !(Array.isArray(CART?.items) && CART.items.length);
    if (footerRow) footerRow.hidden = isEmptyCartNow;
    if (footerMilestones) footerMilestones.hidden = isEmptyCartNow || !footerMilestones.innerHTML.trim();
    const title = drawer.querySelector(".sc-title");
    const count = drawer.querySelector("[data-cart-title-count]");
    if (title) {
      title.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) node.textContent = "Cart ";
      });
      if (count) count.hidden = false;
    }
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
  const discountLoadingOverlay = drawer.querySelector("[data-discount-loading]");
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
    const cartGoalBonusNav = el.closest("[data-cartgoal-bonus-nav]");
    if (cartGoalBonusNav) {
      e.preventDefault();
      const slides = Array.isArray(drawer.__sc_cartGoalBonusSlides) ? drawer.__sc_cartGoalBonusSlides : [];
      if (slides.length > 1) {
        CART_GOAL_BONUS_INDEX += cartGoalBonusNav.getAttribute("data-cartgoal-bonus-nav") === "prev" ? -1 : 1;
        if (CART_GOAL_BONUS_INDEX < 0) CART_GOAL_BONUS_INDEX = slides.length - 1;
        if (CART_GOAL_BONUS_INDEX >= slides.length) CART_GOAL_BONUS_INDEX = 0;
        updateCartGoalBonusSliderPosition(drawer.querySelector(".sc-cartgoal-bonus"));
      }
      return;
    }
    const cartGoalBonusOpen = el.closest("[data-cartgoal-bonus-open]");
    if (cartGoalBonusOpen) {
      e.preventDefault();
      const index = Number(cartGoalBonusOpen.getAttribute("data-cartgoal-bonus-open"));
      const slides = Array.isArray(drawer.__sc_cartGoalBonusSlides) ? drawer.__sc_cartGoalBonusSlides : [];
      const slide = Number.isFinite(index) ? slides[index] : null;
      if (!slide?.rule) return;
      openRewardPopupFor({
        kind: "free",
        rule: slide.rule,
        ruleKey: slide.ruleKey || slide.identity,
        slot: slide.slot,
        title: slide.message || slide.title,
        goalMet: slide.goalMet !== false,
        force: true
      });
      return;
    }
    const offerAction = el.closest("[data-offer-action]");
    if (offerAction) {
      e.preventDefault();
      const index = Number(offerAction.getAttribute("data-offer-action"));
      const offer = Array.isArray(drawer.__sc_offerRows) ? drawer.__sc_offerRows[index] : null;
      if (!offer?.rule) return;
      const kind =
        offer.type === "free"
          ? "free"
          : offer.type === "buyxgety"
            ? "buyxgety"
            : "bxgy";
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

    const baseFontSize = parsePositiveNumber(style?.base, 13);
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
    const drawerFontFamily = trimToNull(
      style?.fontFamily ??
      style?.font_family ??
      style?.themeFontFamily ??
      style?.theme_font_family ??
      style?.font ??
      ""
    );
    if (drawerFontFamily) r.setProperty("--sc-font", drawerFontFamily);

    const defaults = {
      baseBg: "linear-gradient(135deg, #ff3b30 0%, #e126b9 48%, #f8dfd0 100%)",
      drawerImage: "",
      topText: "#102864",
      headerText: "#ffffff",
      drawerText: "#102864",
      border: "#e5e7eb",
      muted: "#6b7280",
      progress: "#4343d0",
      checkoutBg: "#4343d0",
      checkoutText: "#ffffff",
      announcementBarBackgroundColor: "#4343d0",
      announcementBarTextColor: "#ffffff",
      buttonLabelColor: "#ffffff",
      iconColor: "#102864",
      offerIconColor: "#111827",
      tabIconColor: "#102864",
      tabActiveColor: "#4343d0",
      footerBg: "transparent",
      applyBtnBg: "#4343d0",
      applyBtnText: "#ffffff",
      applyBtnBorder: "rgba(17,24,39,.25)",
      subtotalBg: "#ffffff",
      subtotalText: "#102864",
      subtotalLabel: "#6b7280",
      discountCodeApply: 1,
      lineLoaderBg: "#ffffff",
      lineLoaderTrack: "rgba(15,23,42,.08)",
      checkboxEmptyBg: "#ffffff",
      checkboxCheckColor: "#ffffff",
    };

    let mode = String(
      pick(style, ["cartDrawerBackgroundMode", "drawerBgMode", "bgMode"], "gradient")
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
      getFirstColorFromBackground(baseBg) || "#4343d0"
    );
    const gradientEnd = pickColor(
      style,
      ["cartDrawerGradientEnd", "drawerGradientEnd", "gradientEnd", "cartDrawerGradientTo"],
      getFirstColorFromBackground(baseBg) || "#B93B0F"
    );

    const drawerBackgroundImageRaw =
      pick(
        style,
        [
          "cartDrawerImage",
          "drawerImage",
          "cartDrawerBackgroundImage",
          "backgroundImage",
          "cartBackgroundImage"
        ],
        defaults.drawerImage
      ) || "";
    const drawerBackgroundImage =
      /^url\(/i.test(String(drawerBackgroundImageRaw))
        ? String(drawerBackgroundImageRaw)
        : buildCssUrl(drawerBackgroundImageRaw);

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
      "min(425px,92vw)"
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
      ["iconColor", "drawerIconColor", "cartIconColor", "bodyIconColor"],
      defaults.iconColor
    );
    const headerIconColor = pickColor(
      style,
      ["headerIconColor", "cartDrawerHeaderIconColor", "titleIconColor"],
      headerColor || defaults.headerText
    );
    const offerIconColor = pickColor(
      style,
      ["offerIconColor", "offersIconColor", "rewardIconColor"],
      defaults.offerIconColor
    );
    const tabIconColor = pickColor(
      style,
      ["tabIconColor", "footerTabIconColor", "bottomTabIconColor"],
      defaults.tabIconColor
    );
    const tabActiveColor = pickColor(
      style,
      ["tabActiveColor", "footerTabActiveColor", "bottomTabActiveColor"],
      checkoutBg || defaults.tabActiveColor
    );

    const badgeBg = pick(style, ["badgeBg", "countBadgeBg"], "rgba(17,24,39,.1)");
    const badgeText = pickColor(style, ["badgeText", "countBadgeText"], checkoutText);

    const closeBg = pick(style, ["closeBg", "closeButtonBg"], "#ffffff");
    const closeBorder = pickColor(style, ["closeBorder", "closeButtonBorder"], "transparent");
    const closeText = pickColor(
      style,
      ["closeText", "closeButtonText"],
      "#102864"
    );

    const hasExplicitFooterBg = ["footerBg", "cartDrawerFooterBg", "drawerFooterBg"].some(
      (key) => trimToNull(style?.[key])
    );
    const footerBg = pickBackground(
      style,
      ["footerBg", "cartDrawerFooterBg", "drawerFooterBg"],
      defaults.footerBg
    );

    const drawerShellBg = pickBackground(
      style,
      ["cartDrawerBodyBg", "drawerBodyBg", "drawerShellBg", "cartDrawerShellBg", "cartDrawerPanelBg"],
      "#f4f4f7"
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
    const rewardPopupFontSize = normalizeLen(
      pick(
        style,
        ["rewardPopupFontSize", "freeGiftPopupFontSize", "freeGiftFontSize", "popupFontSize"],
        null
      ),
      "var(--sc-base-font-size)"
    );
    const rewardPopupTextColor = pickColor(
      style,
      ["rewardPopupTextColor", "freeGiftPopupTextColor", "freeGiftTextColor", "popupTextColor"],
      drawerTextColor
    );
    const rewardPopupSubTextColor = pickColor(
      style,
      ["rewardPopupSubTextColor", "freeGiftPopupSubTextColor", "freeGiftSubTextColor", "popupSubTextColor"],
      mutedColor
    );
    const rewardPopupTitleColor = pickColor(
      style,
      ["rewardPopupTitleColor", "freeGiftPopupTitleColor", "freeGiftTitleColor", "popupTitleColor"],
      rewardPopupTextColor
    );
    const rewardPopupAccentColor = pickColor(
      style,
      ["rewardPopupAccentColor", "freeGiftPopupAccentColor", "freeGiftAccentColor", "popupAccentColor", "buttonColor"],
      progressFill
    );
    const rewardPopupButtonText = pickColor(
      style,
      ["rewardPopupButtonTextColor", "freeGiftPopupButtonTextColor", "freeGiftButtonTextColor", "buttonLabelColor"],
      checkoutText
    );
    const rewardPopupPillBg = pickBackground(
      style,
      ["rewardPopupPillBg", "freeGiftPopupPillBg", "freeGiftPillBg"],
      "rgba(238,231,255,1)"
    );
    const rewardPopupPillText = pickColor(
      style,
      ["rewardPopupPillTextColor", "freeGiftPopupPillTextColor", "freeGiftPillTextColor"],
      rewardPopupTitleColor
    );

    // Match the Corner-style loader, checkbox spark and paper celebration with styleSettings colors.
    // Fallbacks keep the current layout safe when old stores do not have these fields.
    const lineLoaderBg = pickBackground(
      style,
      ["lineLoaderBg", "loadingLineBg", "loaderBg", "loadingBarBg", "cartLoaderBg"],
      defaults.lineLoaderBg
    );
    const lineLoaderTrack = pickBackground(
      style,
      ["lineLoaderTrack", "loadingLineTrack", "loaderTrack", "loadingBarTrack"],
      defaults.lineLoaderTrack
    );
    const lineLoaderAccent = pickColor(
      style,
      ["lineLoaderColor", "loadingLineColor", "loaderColor", "loadingBarColor", "progress", "buttonColor"],
      progressFill
    );
    const checkboxAccent = pickColor(
      style,
      ["freeGiftCheckColor", "checkboxColor", "checkboxSelectedBg", "checkboxBg", "rewardCheckboxColor", "buttonColor"],
      rewardPopupAccentColor
    );
    const checkboxEmptyBg = pickBackground(
      style,
      ["freeGiftCheckEmptyBg", "checkboxEmptyBg", "checkboxUncheckedBg"],
      defaults.checkboxEmptyBg
    );
    const checkboxEmptyBorder = pickColor(
      style,
      ["freeGiftCheckBorder", "checkboxBorder", "checkboxUncheckedBorder"],
      mutedColor
    );
    const checkboxCheckColor = pickColor(
      style,
      ["freeGiftCheckTickColor", "checkboxTickColor", "checkboxCheckColor"],
      defaults.checkboxCheckColor
    );
    const checkboxSparkColor = pickColor(
      style,
      ["freeGiftCheckSparkColor", "checkboxSparkColor", "sparkColor"],
      checkboxAccent
    );
    const paperPrimary = pickColor(
      style,
      ["paperCelebrationColor", "confettiColor", "celebrationColor", "buttonColor", "progress"],
      progressFill
    );
    const paperSecondary = pickColor(
      style,
      ["paperCelebrationSecondColor", "confettiSecondColor", "celebrationSecondColor", "cartDrawerGradientStart"],
      checkoutBg
    );
    const paperTertiary = pickColor(
      style,
      ["paperCelebrationThirdColor", "confettiThirdColor", "celebrationThirdColor", "cartDrawerGradientEnd"],
      gradientEnd
    );

    if (!isValidCssColor(topTextColor)) topTextColor = defaults.topText;
    if (!isValidCssColor(headerColor)) headerColor = defaults.headerText;

    r.setProperty("--sc-overlay-bg", overlayBg);
    r.setProperty("--sc-drawer-width", drawerWidth);

    r.setProperty("--sc-border", borderColor);
    r.setProperty("--sc-muted", mutedColor);
    r.setProperty("--sc-drawer-bg-image", drawerBackgroundImage || "none");
    r.setProperty("--sc-drawer-bg", drawerBackgroundImage ? `${String(baseBg)}, ${drawerBackgroundImage}` : String(baseBg));

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
    r.setProperty("--sc-header-icon-color", headerIconColor);
    r.setProperty("--sc-offer-icon-color", offerIconColor);
    r.setProperty("--sc-tab-icon-color", tabIconColor);
    r.setProperty("--sc-tab-active-color", tabActiveColor);
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
    r.setProperty("--sc-freegift-font-size", rewardPopupFontSize);
    r.setProperty("--sc-freegift-text", rewardPopupTextColor);
    r.setProperty("--sc-freegift-subtext", rewardPopupSubTextColor);
    r.setProperty("--sc-freegift-title-color", rewardPopupTitleColor);
    r.setProperty("--sc-freegift-option-title-color", rewardPopupTitleColor);
    r.setProperty("--sc-freegift-accent", rewardPopupAccentColor);
    r.setProperty("--sc-freegift-btn-bg", rewardPopupAccentColor);
    r.setProperty("--sc-freegift-btn-text", rewardPopupButtonText);
    r.setProperty("--sc-freegift-pill-bg", String(rewardPopupPillBg));
    r.setProperty("--sc-freegift-pill-text", rewardPopupPillText);
    r.setProperty("--sc-line-loader-bg", String(lineLoaderBg));
    r.setProperty("--sc-line-loader-track", String(lineLoaderTrack));
    r.setProperty("--sc-line-loader-accent", lineLoaderAccent);
    r.setProperty("--sc-checkbox-accent", checkboxAccent);
    r.setProperty("--sc-checkbox-empty-bg", String(checkboxEmptyBg));
    r.setProperty("--sc-checkbox-empty-border", checkboxEmptyBorder);
    r.setProperty("--sc-checkbox-check", checkboxCheckColor);
    r.setProperty("--sc-checkbox-spark", checkboxSparkColor);
    r.setProperty("--sc-paper-primary", paperPrimary);
    r.setProperty("--sc-paper-secondary", paperSecondary);
    r.setProperty("--sc-paper-tertiary", paperTertiary);
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
        pick(
          style,
          ["cartDrawerImage", "drawerImage", "topBgImage", "cartDrawerBackgroundImage", "backgroundImage", "cartBackgroundImage"],
          defaults.drawerImage
        ) || "";
      const imgUrl =
        /^url\(/i.test(String(rawImage)) ? String(rawImage) : buildCssUrl(rawImage);
      const imageOverlay = `linear-gradient(135deg, rgba(255,59,48,.86) 0%, rgba(225,38,185,.82) 48%, rgba(248,223,208,.74) 100%)`;

      if (imgUrl) {
        r.setProperty("--sc-top-bg-image", `${imageOverlay}, ${imgUrl}`);
      } else {
        r.setProperty("--sc-top-bg-image", String(baseBg));
      }
      r.setProperty("--sc-top-bg-color", "transparent");
      r.setProperty("--sc-top-bg-color-effective", "transparent");
      r.setProperty("--sc-top-bg-image-effective", "var(--sc-top-bg-image)");

      r.setProperty("--sc-drawer-bg-image", imgUrl || "none");
      r.setProperty("--sc-drawer-bg", String(drawerShellBg));
      if (!hasExplicitProgressBg) r.setProperty("--sc-progress-bg", "#ffffff");
      if (!hasExplicitFooterBg) r.setProperty("--sc-footer-bg", "transparent");
    } else if (mode === "gradient") {
      const gradientBg = /gradient\(/i.test(String(baseBg))
        ? String(baseBg)
        : `linear-gradient(180deg, ${String(gradientStart)} 0%, ${String(gradientEnd)} 100%)`;

      const heroBg = drawerBackgroundImage ? `${gradientBg}, ${drawerBackgroundImage}` : gradientBg;
      r.setProperty("--sc-top-bg-color", "transparent");
      r.setProperty("--sc-top-bg-image", heroBg);
      r.setProperty("--sc-top-bg-color-effective", "transparent");
      r.setProperty("--sc-top-bg-image-effective", "var(--sc-top-bg-image)");

      r.setProperty("--sc-drawer-bg-image", drawerBackgroundImage || "none");
      r.setProperty("--sc-drawer-bg", String(drawerShellBg));
      if (!hasExplicitProgressBg) r.setProperty("--sc-progress-bg", "#ffffff");
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

      r.setProperty("--sc-drawer-bg-image", drawerBackgroundImage || "none");
      r.setProperty("--sc-drawer-bg", String(drawerShellBg || solidBg));
      if (!hasExplicitProgressBg) r.setProperty("--sc-progress-bg", "#ffffff");
      if (!hasExplicitFooterBg) r.setProperty("--sc-footer-bg", String(solidBg));
    }

    DISCOUNT_PANEL_STYLE_ENABLED =
      to01(pick(style, ["discountCodeApply"], defaults.discountCodeApply)) === 1;
    OFFER_TABS_ENABLED = FORCE_CART_OFFER_TABS || (style?.offerButtonEnabled !== false && style?.offerButtonEnabled !== 0);
    if (!OFFER_TABS_ENABLED) ACTIVE_DRAWER_TAB = "cart";
    if (offerTabs) offerTabs.hidden = !OFFER_TABS_ENABLED;
  };

  let DISCOUNT_MESSAGE_TIMER = null;

  const setDiscountMessage = (msg, ttl = 3000) => {
    if (!discountMsg) return;
    if (DISCOUNT_MESSAGE_TIMER) {
      clearTimeout(DISCOUNT_MESSAGE_TIMER);
      DISCOUNT_MESSAGE_TIMER = null;
    }

    const text = trimToNull(msg);
    if (!text) {
      discountMsg.textContent = "";
      discountMsg.hidden = true;
      return;
    }

    discountMsg.textContent = text;
    discountMsg.hidden = false;

    if (Number(ttl) > 0) {
      DISCOUNT_MESSAGE_TIMER = setTimeout(() => {
        discountMsg.textContent = "";
        discountMsg.hidden = true;
        DISCOUNT_MESSAGE_TIMER = null;
      }, Number(ttl));
    }
  };

  const DISCOUNT_APPLY_LOADING_MIN_MS = 650;
  const DISCOUNT_APPLY_LOADING_MAX_MS = 12000;
  let discountApplyLoadingStartedAt = 0;
  let discountApplyLoadingHideTimer = null;
  let discountApplyLoadingMaxTimer = null;

  const applyDiscountApplyLoadingState = (isLoading) => {
    const active = !!isLoading;
    drawer.classList.toggle("sc-applying-discount", active);
    setLineLoaderVisible(active || drawer.classList.contains("sc-refreshing"));
    if (discountLoadingOverlay) {
      discountLoadingOverlay.hidden = true;
      discountLoadingOverlay.style.display = "none";
      discountLoadingOverlay.setAttribute("aria-hidden", "true");
    }
    if (discountButton) discountButton.disabled = active;
    if (discountInput) discountInput.disabled = active;
  };

  const setDiscountApplyLoading = (isLoading, opts = {}) => {
    const active = !!isLoading;
    const minVisibleMs = Number(opts.minVisibleMs ?? DISCOUNT_APPLY_LOADING_MIN_MS);
    const maxVisibleMs = Number(opts.maxVisibleMs ?? DISCOUNT_APPLY_LOADING_MAX_MS);

    if (discountApplyLoadingHideTimer) {
      clearTimeout(discountApplyLoadingHideTimer);
      discountApplyLoadingHideTimer = null;
    }

    if (active) {
      if (!drawer.classList.contains("sc-applying-discount")) {
        discountApplyLoadingStartedAt = Date.now();
      }
      applyDiscountApplyLoadingState(true);

      if (discountApplyLoadingMaxTimer) clearTimeout(discountApplyLoadingMaxTimer);
      discountApplyLoadingMaxTimer = setTimeout(() => {
        discountApplyLoadingMaxTimer = null;
        discountApplyLoadingStartedAt = 0;
        applyDiscountApplyLoadingState(false);
      }, Number.isFinite(maxVisibleMs) && maxVisibleMs > 0 ? maxVisibleMs : DISCOUNT_APPLY_LOADING_MAX_MS);
      return;
    }

    if (discountApplyLoadingMaxTimer) {
      clearTimeout(discountApplyLoadingMaxTimer);
      discountApplyLoadingMaxTimer = null;
    }

    const elapsed = discountApplyLoadingStartedAt ? Date.now() - discountApplyLoadingStartedAt : minVisibleMs;
    const delay = Math.max(0, (Number.isFinite(minVisibleMs) ? minVisibleMs : DISCOUNT_APPLY_LOADING_MIN_MS) - elapsed);

    discountApplyLoadingHideTimer = setTimeout(() => {
      discountApplyLoadingHideTimer = null;
      discountApplyLoadingStartedAt = 0;
      applyDiscountApplyLoadingState(false);
    }, delay);
  };

  const waitForDiscountApplied = async (code, attempts = 8) => {
    for (let i = 0; i < attempts; i += 1) {
      CART = await fetchCart({ force: true });
      if (isDiscountAppliedInCart(code)) return true;
      await new Promise((resolve) => setTimeout(resolve, 250 + i * 100));
    }
    return false;
  };

  const rememberManualDiscountCode = (code) => {
    const normalized = trimToNull(code);
    if (!normalized) return;
    scStore.set(MANUAL_DISCOUNT_CODE_KEY, normalized);
    scStore.set("__SC_LAST_APPLIED_CODE__", normalized);
    if (discountInput) discountInput.value = normalized;
  };

  const isManualDiscountCodeRemembered = (code) => {
    const normalized = trimToNull(code);
    if (!normalized) return false;
    const lower = normalized.toLowerCase();
    const manual = trimToNull(scStore.get(MANUAL_DISCOUNT_CODE_KEY));
    const last = trimToNull(scStore.get("__SC_LAST_APPLIED_CODE__"));
    const attr =
      trimToNull(CART?.attributes?.discount_code) ||
      trimToNull(CART?.attributes?.discountCode);
    return [manual, last, attr].some(
      (value) => value && String(value).trim().toLowerCase() === lower
    );
  };

  const getCartRewardLineCents = () => {
    const items = Array.isArray(CART?.items) ? CART.items : [];
    return items.reduce((sum, it) => {
      if (!isRewardCartLine(it)) return sum;
      return sum + Math.max(0, Number(it?.final_line_price) || 0);
    }, 0);
  };

  const getCartPaidLineSubtotalCents = () => {
    const items = Array.isArray(CART?.items) ? CART.items : [];
    return items.reduce((sum, it) => {
      if (isRewardCartLine(it)) return sum;
      return sum + Math.max(0, Number(it?.final_line_price) || 0);
    }, 0);
  };

  const getCartPaidOriginalSubtotalCents = () => {
    const items = Array.isArray(CART?.items) ? CART.items : [];
    return items.reduce((sum, it) => {
      if (isRewardCartLine(it)) return sum;
      const originalLine = Number(it?.original_line_price);
      const finalLine = Number(it?.final_line_price);
      const lineAmount = Number.isFinite(originalLine) ? originalLine : finalLine;
      return sum + Math.max(0, Number(lineAmount) || 0);
    }, 0);
  };

  const getCartSubtotalCents = () => {
    const raw = Number(CART?.items_subtotal_price);
    const dynamicPaidSubtotal = getCartPaidLineSubtotalCents();
    if (dynamicPaidSubtotal > 0) return Math.max(0, dynamicPaidSubtotal);

    const baseSubtotal = Number.isFinite(raw) ? Math.max(0, raw) : 0;
    return Math.max(0, baseSubtotal - getCartRewardLineCents());
  };

  // Uses original_line_price so Shopify automatic quantity discounts don't
  // reduce the subtotal below free-gift / shipping thresholds.
  const getCartOriginalSubtotalCents = () => {
    const items = Array.isArray(CART?.items) ? CART.items : [];
    if (items.length) {
      return getCartPaidOriginalSubtotalCents();
    }
    const raw = Number(CART?.original_total_price);
    if (Number.isFinite(raw)) return Math.max(0, raw);
    return Number(CART?.items_subtotal_price || 0);
  };

  const isCartGoalRule = (rule) =>
    Boolean(rule?.isCartGoal || String(rule?.id || "").startsWith("cartgoal:"));

  const getCartGoalDiscountProgressMode = (rule = null) => {
    const campaign = getSelectedCartGoalCampaign();
    const raw =
      rule?.discountProgressMode ??
      rule?.discount_progress_mode ??
      campaign?.discountProgressMode ??
      campaign?.discount_progress_mode ??
      "after";
    return String(raw || "after").trim().toLowerCase() === "before" ? "before" : "after";
  };

  const getCartRewardOriginalLineCents = () => {
    const items = Array.isArray(CART?.items) ? CART.items : [];
    return items.reduce((sum, it) => {
      if (!isRewardCartLine(it)) return sum;
      return sum + Math.max(0, Number(it?.original_line_price) || 0);
    }, 0);
  };

  const getCartGoalOriginalSubtotalCents = () =>
    Math.max(0, getCartOriginalSubtotalCents() - getCartRewardOriginalLineCents());

  const getCartDiscountedSubtotalCents = () => {
    const totalPrice = Number(CART?.total_price);
    if (Number.isFinite(totalPrice)) {
      return Math.max(0, totalPrice - getCartRewardLineCents());
    }

    const subtotal = getCartOriginalSubtotalCents();
    const totalDiscount = Math.max(0, Number(CART?.total_discount || 0));
    return Math.max(0, subtotal - totalDiscount - getCartRewardLineCents());
  };

  const getCartGoalProgressSubtotalCents = (rule = null) =>
    getCartGoalDiscountProgressMode(rule) === "before"
      ? getCartGoalOriginalSubtotalCents()
      : getCartDiscountedSubtotalCents();

  const getRuleProgressSubtotalCents = (type, rule = null) =>
    isCartGoalRule(rule)
      ? getCartGoalProgressSubtotalCents(rule)
      : getCartOriginalSubtotalCents();

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
      if (isDiscountAppliedInCart(code)) {
        applied.push({ rule, code });
      }
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

      const meta = getDiscountRuleMeta(rule, subtotalCents, currency);

      const minPurchaseFail = minCents != null && subtotalCents < minCents;

      const discountAmountFail =
        meta &&
        !meta.isPercent &&
        Number.isFinite(meta.cents) &&
        meta.cents > subtotalCents;

      if (!minQuantityFail && !minPurchaseFail && !discountAmountFail) continue;

      const validationMessage = minQuantityFail
        ? `Discount code ${code} was removed. Add ${Math.ceil(minQuantity - cartQty)} more item(s) to use this discount code.`
        : minPurchaseFail
          ? `Discount code ${code} was removed. Add ${formatCampaignMoney(minCents - subtotalCents, currency)} more to use this discount code.`
          : `Discount code ${code} was removed because the discount amount is greater than the cart subtotal.`;

      DISCOUNT_REMOVE_IN_FLIGHT = true;

      try {
        await clearDiscountCode(code);

        scStore.del(MANUAL_DISCOUNT_CODE_KEY);
        scStore.del("__SC_LAST_APPLIED_CODE__");

        const discountInput = drawer.querySelector("[data-discount-input]");
        if (discountInput) discountInput.value = "";

        await refreshFromNetwork();
        renderAllFromCache();

        if (discountMsg) discountMsg.style.color = "#dc2626";
        setDiscountMessage(validationMessage);
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
    const appliedCodes = getAppliedDiscountCodes();
    if (appliedCodes.length) return appliedCodes[0];

    const manualCode = trimToNull(scStore.get(MANUAL_DISCOUNT_CODE_KEY));
    if (!manualCode) return null;

    const rule = findCodeDiscountRuleByCode(manualCode);
    if (!rule) return null;

    const validation = validateCodeDiscountRule(rule, getCartSubtotalCents());
    return validation.ok ? manualCode : null;
  };

  const getStorefrontRootPath = () => {
    const rootPath = String(window.Shopify?.routes?.root || "/").trim() || "/";
    return rootPath.startsWith("/") ? rootPath : `/${rootPath}`;
  };

  const storefrontPath = (path) => {
    const rootPath = getStorefrontRootPath();
    const cleanRoot = rootPath.endsWith("/") ? rootPath : `${rootPath}/`;
    const cleanPath = String(path || "").replace(/^\/+/, "");
    return `${cleanRoot}${cleanPath}`;
  };

  const buildDiscountUrl = (code, redirectPath = "/cart") => {
    const redirect =
      redirectPath === "/checkout"
        ? storefrontPath("checkout")
        : redirectPath === "/cart"
          ? storefrontPath("cart")
          : redirectPath;
    return `${storefrontPath(`discount/${encodeURIComponent(code)}`)}?redirect=${encodeURIComponent(redirect)}`;
  };

  const applyCodeThroughShopify = async (code) => {
    const target = buildDiscountUrl(code, "/cart");
    const res = await fetch(target, {
      credentials: "same-origin",
      redirect: "follow",
    });

    if (!res || (!res.ok && res.type !== "opaqueredirect")) {
      throw new Error(`Discount endpoint failed (${res?.status || "unknown"})`);
    }

    return true;
  };

  const isCartGoalRewardSelectionMandatory = (campaign) => {
    const raw =
      campaign?.rewardSelectionMandatory ??
      campaign?.reward_selection_mandatory ??
      "yes";
    return String(raw || "yes").trim().toLowerCase() !== "no";
  };

  const cartHasSelectedRewardForRule = (rule) => {
    const items = Array.isArray(CART?.items) ? CART.items : [];
    const expectedSlot = trimToNull(rule?.cartStepName);
    const expectedRuleKey = trimToNull(getRuleKey(rule, "cartgoal"));
    const expectedDiscountId = trimToNull(getFreeGiftDiscountId(rule));

    return items.some((item) => {
      const props = item?.properties || {};
      if (String(props?.[FREE_GIFT_PROPERTY] || "").trim().toLowerCase() !== "true") {
        return false;
      }

      const itemSlot = trimToNull(props?.[FREE_GIFT_RULE_PROPERTY]);
      const itemRuleKey = trimToNull(props?.[FREE_GIFT_RULE_KEY_PROPERTY]);
      const itemDiscountId = trimToNull(props?.[FREE_GIFT_DISCOUNT_PROPERTY]);

      return (
        (expectedRuleKey && itemRuleKey === expectedRuleKey) ||
        (expectedSlot && itemSlot === expectedSlot) ||
        (expectedDiscountId && itemDiscountId === expectedDiscountId)
      );
    });
  };

  const getMissingMandatoryCartGoalReward = () => {
    const campaign = getSelectedCartGoalCampaign();
    if (!campaign || !isCartGoalRewardSelectionMandatory(campaign)) return null;

    const unlockedRules = buildCartGoalFreeProductRules(campaign).filter(
      (rule) => isRuleEnabled(rule) && isRewardOfferGoalMet("free", rule)
    );

    return unlockedRules.find((rule) => !cartHasSelectedRewardForRule(rule)) || null;
  };

  const validateRewardSelectionBeforeCheckout = () => {
    const missingRule = getMissingMandatoryCartGoalReward();
    if (!missingRule) return true;

    openDrawer();
    showCenterCelebratePopup("Please select your reward before checkout.", "", 3500);
    return false;
  };

  const goToCheckoutWithDiscount = () => {
    if (!validateRewardSelectionBeforeCheckout()) return;

    const code = getCheckoutDiscountCode();

    if (code) {
      window.location.href = buildDiscountUrl(code, "/checkout");
      return;
    }

    window.location.href = "/checkout";
  };

  const validateCodeDiscountRule = (rule, subtotalCents) => {
    // If the code is not available in the app proxy rule list, still allow
    // Shopify to validate it. Blocking here made valid Shopify discount codes
    // show "could not be applied" before Shopify got a chance to apply them.
    if (!rule) return { ok: true, message: "" };

    const currency = normalizeCurrencyCode();
    const subtotal = Math.max(0, Number(subtotalCents) || 0);
    const triggerType = String(rule?.triggerType ?? rule?.trigger_type ?? "amount")
      .trim()
      .toLowerCase();

    const minQuantity = Number(rule?.minQuantity ?? rule?.min_quantity);
    if (
      triggerType === "quantity" &&
      Number.isFinite(minQuantity) &&
      minQuantity > 0 &&
      getCartTotalQty() < minQuantity
    ) {
      return {
        ok: false,
        message: `Add ${Math.ceil(minQuantity - getCartTotalQty())} more item(s) to use this discount code.`,
      };
    }

    const minPurchase = Number(
      rule?.minPurchase ??
      rule?.min_purchase ??
      rule?.minSubtotal ??
      rule?.min_subtotal ??
      rule?.minAmount ??
      rule?.min_amount
    );

    if (triggerType !== "quantity" && Number.isFinite(minPurchase) && minPurchase > 0) {
      const minCents = Math.round(minPurchase * priceDivisor(currency));

      if (subtotal < minCents) {
        return {
          ok: false,
          message: `Add ${formatCampaignMoney(minCents - subtotal, currency)} more to use this discount code.`,
        };
      }
    }

    const meta = getDiscountRuleMeta(rule, subtotal, currency);

    if (
      meta &&
      !meta.isPercent &&
      Number.isFinite(meta.cents) &&
      meta.cents > subtotal
    ) {
      return {
        ok: false,
        message: `Discount amount ${formatCampaignMoney(meta.cents, currency)} cannot be greater than cart subtotal ${formatCampaignMoney(subtotal, currency)}.`,
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
    setDiscountApplyLoading(true);

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
          `Add ${formatCampaignMoney(remaining * priceDivisor())} more to use code ${code}.`
        );

        setDiscountApplyLoading(false);

        return;
      }
    }
    const validation = validateCodeDiscountRule(rule, getCartSubtotalCents());

    if (!validation.ok) {
      scStore.del(MANUAL_DISCOUNT_CODE_KEY);
      scStore.del("__SC_LAST_APPLIED_CODE__");

      if (discountMsg) discountMsg.style.color = "#dc2626";
      setDiscountMessage(validation.message);
      setDiscountApplyLoading(false);
      return;
    }

    try {
      const applied = await applyCodeThroughShopify(code);

      if (!applied) {
        scStore.del(MANUAL_DISCOUNT_CODE_KEY);
        scStore.del("__SC_LAST_APPLIED_CODE__");
        if (discountInput) discountInput.value = "";
        await clearDiscountCode(code);
        CART = await fetchCart({ force: true });
        throw new Error(`Discount code was not accepted by Shopify: ${code}`);
      }

      rememberManualDiscountCode(code);
      suppressAutoRewardPopups(3200);
      await refreshFromNetwork();
      renderAllFromCache();

      if (discountMsg) discountMsg.style.color = "#16a34a";
      setDiscountMessage(`Discount applied: ${code}`);
      celebrateDiscountApplied(code);
    } catch (err) {
      console.error("[SmartCartify] discount apply failed:", err);
      if (discountMsg) discountMsg.style.color = "#dc2626";
      setDiscountMessage("Could not apply discount code. Please try again.");
    } finally {
      setDiscountApplyLoading(false);
    }
  };

  const applyStyleSettings = (s) => {
    const r = document.documentElement.style;
    const fontFamily = trimToNull(
      s?.fontFamily ??
      s?.font_family ??
      s?.themeFontFamily ??
      s?.theme_font_family ??
      s?.font ??
      ""
    );
    if (fontFamily) r.setProperty("--sc-font", fontFamily);
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
    const cartGoalBonus = drawer.querySelector(".sc-cartgoal-bonus");
    if (cartGoalBonus) {
      cartGoalBonus.hidden = true;
      cartGoalBonus.innerHTML = "";
    }
    drawer.__sc_cartGoalBonusSlides = [];
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

    CODE_DISCOUNT_RULES.sort(compareRulesByCustomerPriority);
    BXGY_RULES.sort(compareRulesByCustomerPriority);
    BUYXGETY_RULES.sort(compareRulesByCustomerPriority);

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

      return type === "free";
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
            return `${formatCampaignMoney(amountToCurrencyMinorUnits(amt), CART?.currency)} shipping`;
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
      const subtotalRupees =
        getRuleProgressSubtotalCents(type, rule) / priceDivisor(CART?.currency);

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
          : formatCampaignMoney(amountToCurrencyMinorUnits(progressMetric.goal), CART?.currency)
        : "";
      const defaultBeforeTemplate = (() => {
        if (!goalAmt) return title;
        const rt = String(rule?.rewardType ?? rule?.reward_type ?? "").trim().toLowerCase();
        if (type === "shipping") {
          if (rt === "reduce" && (rule?.amount ?? rule?.rateAmount)) {
            const shipAmt = formatCampaignMoney(amountToCurrencyMinorUnits(rule.amount ?? rule.rateAmount), CART?.currency);
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
            const shipAmt = formatCampaignMoney(amountToCurrencyMinorUnits(rule.amount ?? rule.rateAmount), CART?.currency);
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
      const goalDisplayTitle =
        trimToNull(goal?.cartGoalTitle) ||
        trimToNull(goal?.goalTitle) ||
        trimToNull(goal?.title) ||
        trimToNull(goal?.name) ||
        trimToNull(goal?.label) ||
        trimToNull(goal?.stepTitle) ||
        trimToNull(goal?.stepName) ||
        `Cart Goal ${index + 1}`;
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
        customerTarget: campaign?.customerTarget ?? campaign?.customer_target ?? goal?.customerTarget ?? goal?.customer_target,
        customerTags: campaign?.customerTags ?? campaign?.customer_tags ?? goal?.customerTags ?? goal?.customer_tags,
        priority: getRulePriority(campaign),
        enabled: true,
        isCartGoal: true,
        type: type === "free" ? "gift" : type,
        ruleType: type,
        rewardType: type,
        cartGoalTitle: goalDisplayTitle,
        goalTitle: goalDisplayTitle,
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
        discountProgressMode:
          campaign?.discountProgressMode ??
          campaign?.discount_progress_mode ??
          "after",
        rewardSelectionMandatory:
          campaign?.rewardSelectionMandatory ??
          campaign?.reward_selection_mandatory ??
          "yes",
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

      // Cart goal progress icons should stay type-based: shipping / order discount / free gift.
      rule.iconChoice = type === "shipping" ? "shipping" : type === "discount" ? "discount" : "free";

      return { type, rule };
    };

    const selectedCartGoalCampaign = (Array.isArray(cartGoalList) ? cartGoalList : [])
      .filter((campaign) => isRuleEnabled(campaign))
      .sort(compareRulesByCustomerPriority)[0];

    const cartGoalCandidates = selectedCartGoalCampaign
      ? [selectedCartGoalCampaign]
        .flatMap((campaign) => {
          const goals = parseArrayish(campaign?.goals);
          return goals
            .filter((goal) => goal && Number(goal?.goal) > 0)
            .filter((goal) => !isDefaultCartGoalShippingGoal(goal))
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

    if (selectedCartGoalCampaign) return cartGoalSteps;

    const progressCandidates = [
      ...(Array.isArray(shippingList) ? shippingList : []).map((rule) => ({ type: "shipping", rule })),
      ...(Array.isArray(discountList) ? discountList : []).map((rule) => ({ type: "discount", rule })),
      ...(Array.isArray(freeList) ? freeList : []).map((rule) => ({ type: "free", rule })),
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
    return steps;
  };

  const offerIconSvg = (type) => {
    const normalized = String(type || "")
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, "");

    // ✅ Proper Offer Tab Icons: shipping / order discount / code discount
    if (["shipping", "freeshipping", "offershipping"].includes(normalized)) {
      return `<svg class="sc-offer-shipping-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 80" fill="none" aria-hidden="true" focusable="false">
        <g stroke="currentColor" stroke-width="5" style="fill:none !important;stroke:currentColor !important;">
          <g stroke-linecap="round" stroke-linejoin="round" style="fill:none !important;stroke:currentColor !important;">
            <path d="M43 66h45M10.5 55.5V63a3 3 0 0 0 3 3h7m99-37H104a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h23M10 40.5V6a3 3 0 0 1 3-3h71a3 3 0 0 1 3 3v46a3 3 0 0 1-3 3H48.5" style="fill:none !important;stroke:currentColor !important;"/>
            <path d="M3 47.5h16.5M3 54.5h7.5m77-36h25.057a3 3 0 0 1 2.738 1.773l11.943 26.642a3 3 0 0 1 .262 1.227V63.5a3 3 0 0 1-3 3h-13" style="fill:none !important;stroke:currentColor !important;"/>
          </g>
          <circle cx="32" cy="66" r="11.5" stroke-linejoin="round" style="fill:none !important;stroke:currentColor !important;"/>
          <circle cx="100" cy="66" r="11.5" stroke-linejoin="round" style="fill:none !important;stroke:currentColor !important;"/>
        </g>
        <path d="M63.4 31.263v12.895c0 1.017-.806 1.842-1.8 1.842H36.4c-.994 0-1.8-.825-1.8-1.842V31.263h28.8zM53.5 11c3.479 0 6.3 2.887 6.3 6.447 0 .99-.218 1.927-.607 2.765l6.007-.002c.994 0 1.8.825 1.8 1.842v5.526c0 1.017-.806 1.842-1.8 1.842H32.8c-.994 0-1.8-.825-1.8-1.842v-5.526c0-1.017.806-1.842 1.8-1.842l6.007.002c-.389-.838-.607-1.775-.607-2.765 0-3.561 2.821-6.447 6.3-6.447 1.764 0 3.359.742 4.502 1.938C50.141 11.742 51.736 11 53.5 11zm-9 3.684c-1.491 0-2.7 1.237-2.7 2.763 0 1.436 1.071 2.617 2.44 2.751l.26.013h2.7v-2.763c0-1.436-1.071-2.617-2.44-2.75l-.26-.013zm9 0l-.26.013c-1.284.126-2.305 1.171-2.428 2.484l-.012.266v2.763h2.7l.26-.013c1.369-.134 2.44-1.314 2.44-2.751s-1.071-2.617-2.44-2.75l-.26-.013z" fill="currentColor" style="fill:currentColor !important;stroke:none !important;"/>
      </svg>`;
    }
    if (["code", "codediscount", "discountcode", "coupon", "couponcode"].includes(normalized)) {
      return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
        <path d="M4.75 6.5h14.5c.69 0 1.25.56 1.25 1.25v2.1a2.15 2.15 0 0 0 0 4.3v2.1c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.1a2.15 2.15 0 0 0 0-4.3v-2.1c0-.69.56-1.25 1.25-1.25Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M9 15l6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="9" cy="9" r="1.1" fill="currentColor"/>
        <circle cx="15" cy="15" r="1.1" fill="currentColor"/>
      </svg>`;
    }

    if (["discount", "orderdiscount", "offerdiscount", "automaticdiscount", "orderoffer"].includes(normalized)) {
      return `<svg class="sc-offer-order-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" focusable="false">
        <path d="M28 7h-2V6c0-2.757-2.243-5-5-5a4.95 4.95 0 0 0-2 .424A4.95 4.95 0 0 0 17 1c-2.757 0-5 2.243-5 5v1h-2c-1.654 0-3 1.346-3 3v3H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h5v1c0 1.654 1.346 3 3 3h14 4c1.654 0 3-1.346 3-3V10c0-1.654-1.346-3-3-3zm-4-1v1h-2V6c0-1.129-.39-2.16-1.024-2.998.008 0 .016-.002.024-.002 1.654 0 3 1.346 3 3zm-5-2.22c.609.55 1 1.337 1 2.22v1h-2V6c0-.883.391-1.67 1-2.22zM14 6c0-1.654 1.346-3 3-3 .008 0 .016.002.024.002C16.39 3.84 16 4.871 16 6v1h-2V6zM3 15h10.382l2.5 5-2.5 5H3V15zm14.895 4.553L15.618 15h1.764l2.5 5-2.5 5h-1.764l2.276-4.553a1 1 0 0 0 .001-.894zM9 28v-1h5 4a1 1 0 0 0 .895-.553l3-6a1 1 0 0 0 0-.895l-3-6A1 1 0 0 0 18 13h-4-5v-3a1 1 0 0 1 1-1h2v1a1 1 0 1 0 2 0V9h6v1a1 1 0 1 0 2 0V9h2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1zm20 0a1 1 0 0 1-1 1h-1.184c.112-.314.184-.648.184-1V10c0-.352-.072-.686-.184-1H28a1 1 0 0 1 1 1v18z"/>
        <circle cx="6.5" cy="17.5" r="1.5"/>
        <circle cx="10.5" cy="22.5" r="1.5"/>
        <path d="M11.641 16.232a1 1 0 0 0-1.409.128l-5 6a1 1 0 0 0 .128 1.408c.187.156.413.232.639.232.287 0 .571-.123.77-.36l5-6a1 1 0 0 0-.128-1.408z"/>
      </svg>`;
    }
    if (["bxgy", "buyxgety", "buyxgetydiscount", "buyget"].includes(normalized)) {
      return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 9h14v10.25c0 .414-.336.75-.75.75H5.75a.75.75 0 0 1-.75-.75V9Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M4 6.75C4 5.784 4.784 5 5.75 5h12.5c.966 0 1.75.784 1.75 1.75V9H4V6.75Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M12 5v15M8.5 13h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>`;
    }

    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.75 8.75h14.5v10.5c0 .414-.336.75-.75.75h-13a.75.75 0 0 1-.75-.75V8.75Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M3.75 6.25h16.5v2.5H3.75v-2.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M12 6.25V20M12 6.25H9.25A2.25 2.25 0 1 1 11.5 4v2.25ZM12 6.25h2.75A2.25 2.25 0 1 0 12.5 4v2.25Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
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
    const subtotalRupees = getRuleProgressSubtotalCents(textType, rule) / priceDivisor(CART?.currency);
    const replaced = rawTitle
      ? replaceProgressText({
        text: rawTitle,
        type: textType,
        rule,
        subtotalRupees,
        useRemainingForGoal: !complete,
      })
      : "";
    return stripCampaignAmountDecimals(trimToNull(replaced) || fallback);
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
    const textType = normalized === "code" ? "discount" : normalized;
    const subtotalRupees = getRuleProgressSubtotalCents(textType, rule) / priceDivisor(CART?.currency);
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
    return stripCampaignAmountDecimals(trimToNull(finalText) || fallback);
  };

  const getOfferProductThumbs = (type, rule) => {
    const normalizedType = String(type || "").toLowerCase();
    const isRewardType = normalizedType === "free" || normalizedType === "bxgy" || normalizedType === "buyxgety";
    const out = [];

    if (isRewardType) {
      const productIds = getFreeGiftProductIds(rule, normalizedType === "free" ? "free" : "buyxgety");
      productIds.slice(0, 4).forEach((id, index) => {
        const meta = getFreeGiftProductMeta(rule, id, index, normalizedType === "free" ? "free" : "buyxgety");
        const title =
          trimToNull(meta?.title) ||
          trimToNull(meta?.name) ||
          trimToNull(meta?.productTitle) ||
          String(id).split("/").pop() ||
          (normalizedType === "free" ? "Gift" : "Offer");
        const image =
          trimToNull(meta?.image) ||
          trimToNull(meta?.featuredImage?.url) ||
          trimToNull(meta?.featuredImage) ||
          trimToNull(meta?.productImage) ||
          "";
        out.push({ title, image });
      });
      if (!out.length) out.push({ title: normalizedType === "free" ? "Gift" : "Offer", image: "" });
      return out.slice(0, 4);
    }

    const products = [...parseArrayish(rule?.products)];
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
          : "";
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
      const stepDone = isProgressStepDone(step);
      const offerTitleTemplate = trimToNull(
        stepDone ? step.rule?.offerTitleAfter : step.rule?.offerTitleBefore
      );
      const offerSubtitleTemplate = trimToNull(
        stepDone ? step.rule?.offerSubtitleAfter : step.rule?.offerSubtitleBefore
      );
      const subtotalRupees = getRuleProgressSubtotalCents(type, step.rule) / priceDivisor(CART?.currency);
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
      const priorityDiff = getRulePriority(b?.rule) - getRulePriority(a?.rule);
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
    const cartBody = drawer.querySelector(".content-cart-smartcartify");
    const footer = drawer.querySelector(".sc-footer");
    const footerRow = drawer.querySelector(".sc-footer-row");
    const footerMilestones = drawer.querySelector("[data-footer-milestones]");
    // Keep the main drawer body visible. The Offers panel lives inside this wrapper,
    // so hiding .content-cart-smartcartify also hides the full Offers page.
    if (cartBody) cartBody.hidden = false;
    const isEmptyCartNow = drawer.classList.contains("sc-empty-state") || !(Array.isArray(CART?.items) && CART.items.length);
    if (footer) footer.hidden = isOffers;
    if (cartContent) cartContent.hidden = isOffers;
    if (items) items.hidden = isOffers;
    if (offersPanel) offersPanel.hidden = !isOffers;
    if (footerRow) footerRow.hidden = isOffers || isEmptyCartNow;
    if (footerMilestones) footerMilestones.hidden = isOffers || isEmptyCartNow || !footerMilestones.innerHTML.trim();
    drawer.querySelectorAll("[data-drawer-tab]").forEach((button) => {
      const selected = button.getAttribute("data-drawer-tab") === ACTIVE_DRAWER_TAB;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    const title = drawer.querySelector(".sc-title");
    const count = drawer.querySelector("[data-cart-title-count]");
    if (title) {
      title.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) node.textContent = isOffers ? "Offers " : "Cart ";
      });
      if (count) count.hidden = isOffers;
    }
  };

  const applyStaticFrontendCartDesign = () => {
    drawer.classList.add("sc-static-design");
    const style = PROXY?.styleSettings || {};
    const upsell = PROXY?.upsellSettings || {};
    OFFER_TABS_ENABLED = FORCE_CART_OFFER_TABS || (style?.offerButtonEnabled !== false && style?.offerButtonEnabled !== 0);
    DISCOUNT_PANEL_STYLE_ENABLED = style?.discountCodeApply === true || style?.discountCodeApply === 1;
    const r = document.documentElement.style;

    const baseFontSize = Math.max(10, Number(style?.base) || 12);
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
    const progressColor = pickColor(style, ["progress"], "#4343d0");
    const buttonBg = pickColor(style, ["buttonColor"], "#4343d0");
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

    r.setProperty(
      "--sc-font",
      trimToNull(
        style?.fontFamily ??
        style?.font_family ??
        style?.themeFontFamily ??
        style?.theme_font_family ??
        style?.font ??
        ""
      ) || "Inter, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    );
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
        <span class="sc-offer-icon" aria-hidden="true">${offerIconSvg("offershipping")}</span>
        <span class="sc-offer-copy">
          <p class="sc-offer-title">Free Shipping</p>
          <p class="sc-offer-subtitle">Add INR 500 more to get free shipping on this order</p>
        </span>
      </div>
      <div class="sc-offer-row">
        <span class="sc-offer-icon" aria-hidden="true">${offerIconSvg("offerdiscount")}</span>
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

  const getDiscountRuleMeta = (rule, subtotalCents, currency = null) => {
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
    const cents = isPercent
      ? Math.round((base * num) / 100)
      : Math.round(num * priceDivisor(currency));
    const capped = Math.max(0, Math.min(cents, base));
    return { isPercent, cents: Math.max(0, cents), capped };
  };

  const parseDiscountRuleCents = (rule, subtotalCents, currency = null) => {
    const meta = getDiscountRuleMeta(rule, subtotalCents, currency);
    return meta ? meta.capped : null;
  };

  const resolveCodeDiscountCents = (rule, subtotalCents, currency = null) => {
    const code = trimToNull(rule?.discountCode ?? rule?.discount_code ?? rule?.code ?? "");
    const fromCart = getCartDiscountCodeAmountCents(code);
    if (Number.isFinite(fromCart) && fromCart > 0) {
      return Math.min(fromCart, Math.max(0, Number(subtotalCents) || 0));
    }

    const fromRule = parseDiscountRuleCents(rule, subtotalCents, currency);
    if (Number.isFinite(fromRule) && fromRule > 0) return fromRule;

    return null;
  };

  const formatDiscountAmount = (cents, currency) => {
    const formatted = formatMoney(cents, currency);
    return `-${String(formatted || "").replace(/^\s+/, "")}`;
  };

  const formatDiscountAmountWithCode = (cents, currency) => {
    const formatted = formatMoneyWithCode(cents, currency);
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
      const discountCents = parseDiscountRuleCents(step?.rule, subtotalCents, currency);

      if (Number.isFinite(discountCents) && discountCents > 0) {
        rows.push({
          key: `order:${step?.rule?.id ?? step?.title ?? step?.slot}`,
          label: "Order Discount",
          amount: formatDiscountAmountWithCode(discountCents, currency),
        });
      }
    });

    // Code Discount: show Shopify-applied codes and locally remembered app codes.
    const appliedCode = findAppliedDiscountCodeRule();

    if (
      appliedCode?.rule &&
      (isDiscountAppliedInCart(appliedCode.code) || isManualDiscountCodeRemembered(appliedCode.code))
    ) {
      const actualCodeDiscountCents = getCartDiscountCodeAmountCents(appliedCode.code);
      const codeDiscountCents =
        Number.isFinite(actualCodeDiscountCents) && actualCodeDiscountCents > 0
          ? actualCodeDiscountCents
          : resolveCodeDiscountCents(appliedCode.rule, subtotalCents, currency);

      if (Number.isFinite(codeDiscountCents) && codeDiscountCents > 0) {
        rows.push({
          key: `code:${appliedCode.code}`,
          label: `Discount Code (${String(appliedCode.code).toUpperCase()})`,
          amount: formatDiscountAmountWithCode(codeDiscountCents, currency),
        });
      }
    }

    // Also show Shopify-applied discount codes that are valid in cart.js even
    // when the app proxy does not return a matching local discount rule.
    getAppliedDiscountCodes().forEach((code) => {
      if (
        appliedCode?.code &&
        String(appliedCode.code).trim().toLowerCase() === String(code).trim().toLowerCase()
      ) {
        return;
      }

      const amount = getCartDiscountCodeAmountCents(code);
      if (Number.isFinite(amount) && amount > 0) {
        rows.push({
          key: `code:${code}`,
          label: `Discount Code (${String(code).toUpperCase()})`,
          amount: formatDiscountAmountWithCode(Math.min(amount, subtotalCents), currency),
        });
      }
    });

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
    const dynamicPaidSubtotalCents = getCartPaidLineSubtotalCents();
    const cartSubtotalRaw = Number(CART?.items_subtotal_price);
    const subtotalCents = dynamicPaidSubtotalCents > 0
      ? Math.max(0, dynamicPaidSubtotalCents)
      : Number.isFinite(cartSubtotalRaw)
        ? Math.max(0, cartSubtotalRaw - getCartRewardLineCents())
        : 0;
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
      const discountCents = parseDiscountRuleCents(step?.rule, subtotalCents, currency);
      return Number.isFinite(discountCents) && discountCents > 0 ? sum + discountCents : sum;
    }, 0);

    let codeDiscountCentsForTotal = 0;

    const appliedCodeRuleForTotal = findAppliedDiscountCodeRule();
    if (appliedCodeRuleForTotal?.rule) {
      const actualCodeDiscountCents = getCartDiscountCodeAmountCents(appliedCodeRuleForTotal.code);
      const codeDiscountCents =
        Number.isFinite(actualCodeDiscountCents) && actualCodeDiscountCents > 0
          ? actualCodeDiscountCents
          : resolveCodeDiscountCents(appliedCodeRuleForTotal.rule, subtotalCents, currency);
      if (Number.isFinite(codeDiscountCents) && codeDiscountCents > 0) {
        codeDiscountCentsForTotal += codeDiscountCents;
      }
    }

    // If Shopify accepted a discount code that is not present in the app rule
    // list, still include the applied code amount in the drawer total.
    appliedCodes.forEach((code) => {
      if (
        appliedCodeRuleForTotal?.code &&
        String(appliedCodeRuleForTotal.code).trim().toLowerCase() ===
        String(code).trim().toLowerCase()
      ) {
        return;
      }

      const amount = getCartDiscountCodeAmountCents(code);
      if (Number.isFinite(amount) && amount > 0) {
        codeDiscountCentsForTotal += Math.min(amount, subtotalCents);
      }
    });

    // Do not add CART.total_discount on top of app-calculated discounts.
    // Shopify total_discount may include hidden/free-gift adjustments, which
    // caused the drawer Total to become too low (for example ₹1500 - ₹300
    // showing ₹700). The drawer total should match the visible paid cart
    // subtotal minus the visible eligible order/code discounts.
    const totalDiscountCents = Math.min(
      subtotalCents,
      Math.max(0, autoDiscountCents + codeDiscountCentsForTotal)
    );
    const checkoutPayableCents = Math.max(0, subtotalCents - totalDiscountCents);
    if (subtotalEl) subtotalEl.textContent = formatMoney(checkoutPayableCents, currency);
    const checkoutLabelEl = drawer.querySelector(".sc-checkout-label");
    if (checkoutLabelEl) checkoutLabelEl.textContent = checkoutLabelBase;

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
    const subtotalBox = drawer.querySelector(".sc-subtotal-box");
    const footerRow = drawer.querySelector(".sc-footer-row");
    const itemsFooter = drawer.querySelector(".sc-items-footer");
    const footerEl = drawer.querySelector(".sc-footer");
    const isEmpty = !items.length;
    updateDiscountPanelVisibility({ isEmpty });
    if (checkoutButton) checkoutButton.hidden = isEmpty;
    if (subtotalBox) subtotalBox.hidden = isEmpty;
    if (footerRow) footerRow.hidden = isEmpty;
    if (itemsFooter) itemsFooter.hidden = isEmpty;
    if (footerEl) footerEl.hidden = false;
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
      renderCartGoalBonusSlider();
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
            : "BuyXGetY"
          : "Free";
        const rewardBadge = isReward
          ? `<span class="sc-free-tag sc-free-tag-under sc-reward-line-badge ${isBxgyGift ? "sc-bxgy-reward-line-badge" : "sc-freegift-line-badge"}">${safe(freeTagText)}</span>`
          : "";
        const rewardFreePill = isReward
          ? `<span class="sc-reward-free-pill">Free</span>`
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
                  ${rewardFreePill}
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
    renderCartGoalBonusSlider();
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

  const isRewardVariantUnavailable = (variant) => {
    if (!variant) return true;
    const direct =
      variant.available ??
      variant.available_for_sale ??
      variant.availableForSale ??
      variant.isAvailable;
    if (direct === false) return true;

    const inventory =
      variant.inventory_quantity ??
      variant.inventoryQuantity ??
      variant.qtyAvailable ??
      variant.quantityAvailable;
    if (inventory != null && Number.isFinite(Number(inventory)) && Number(inventory) <= 0) {
      const policy = String(
        variant.inventory_policy ??
        variant.inventoryPolicy ??
        variant.inventoryManagementPolicy ??
        "deny"
      ).trim().toLowerCase();
      if (!policy || policy === "deny" || policy === "shopify") return true;
    }

    return false;
  };

  const getRewardAddUnavailableMessage = () =>
    "This reward product/variant is currently unavailable or sold out. Please select another reward product.";

  const addRewardToCart = async ({ kind, rule, ruleKey, slot, variant, qty, markAutoAdded, skipExistingCheck = false }) => {
    const guardKey = kind === "free" ? slot || ruleKey : ruleKey;

    // If the reward is already in cart, treat it as success.
    // Previously this returned false and opened the red "Could not add" popup.
    if (!skipExistingCheck && guardKey && cartHasRewardForKey(kind, guardKey)) {
      return true;
    }

    const variantToAdd = await resolveRewardVariantForAdd(rule, variant, kind);
    const legacyId = getVariantLegacyId(variantToAdd);

    // Guard: /cart/add.js needs a numeric VARIANT ID, not a Product ID/GID.
    if (!legacyId || !/^\d+$/.test(String(legacyId))) {
      const err = new Error(
        "Reward product variant not found. Please check the reward product/variant settings."
      );
      err.code = "SC_REWARD_VARIANT_MISSING";
      err.httpStatus = 422;
      throw err;
    }

    // Prevent the Shopify 422 request when we already know the chosen reward variant is unavailable.
    if (isRewardVariantUnavailable(variantToAdd)) {
      const err = new Error(getRewardAddUnavailableMessage());
      err.code = "SC_REWARD_VARIANT_UNAVAILABLE";
      err.httpStatus = 422;
      throw err;
    }

    try {
      setProgressLoading(true);

      const properties = {};

      if (kind === "free") {
        properties[FREE_GIFT_PROPERTY] = "true";
        if (slot) properties[FREE_GIFT_RULE_PROPERTY] = String(slot);
        if (variantToAdd?.id) properties[FREE_GIFT_VARIANT_PROPERTY] = String(variantToAdd.id);
        const freeRuleKey = getRuleKey(rule, "free");
        if (freeRuleKey) properties[FREE_GIFT_RULE_KEY_PROPERTY] = freeRuleKey;
        const freeDiscountId = getFreeGiftDiscountId(rule);
        if (freeDiscountId) properties[FREE_GIFT_DISCOUNT_PROPERTY] = freeDiscountId;
      } else {
        properties[BXGY_GIFT_PROPERTY] = "true";
        properties[BXGY_GIFT_KIND_PROPERTY] = String(kind || "bxgy");
        if (ruleKey) properties[BXGY_GIFT_RULE_PROPERTY] = String(ruleKey);
        if (variantToAdd?.id) properties[BXGY_GIFT_VARIANT_PROPERTY] = String(variantToAdd.id);
      }

      // Shopify can return { items: missing } when a JSON add request does not
      // include the `items` array. Always use the canonical AJAX Cart payload
      // for reward products so Free Gift and Buy X Get Y adds are accepted.
      const payload = {
        items: [
          {
            id: Number(legacyId),
            quantity: Math.max(1, Number(qty || 1)),
            properties,
          },
        ],
      };

      const res = await fetch("/cart/add.js", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Read Shopify's error body so we know the real reason (out of stock, invalid, etc.).
        let shopifyMsg = "";
        try {
          const errBody = await res.json();
          shopifyMsg = errBody?.description || errBody?.message || JSON.stringify(errBody);
        } catch { /* non-JSON body — ignore */ }
        const err = new Error(shopifyMsg || getRewardAddUnavailableMessage());
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
      // 422 / 404 are expected (out of stock, deleted variant) — warn, not error.
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

  const getRewardPopupSelectedCount = () => {
    const active = rewardPopupCache?.current;
    if (!active) return 0;
    if (Array.isArray(active.selectedOptionIds)) return active.selectedOptionIds.length;
    if (Array.isArray(active.selectedOptions)) return active.selectedOptions.length;
    return active.selectedOption ? 1 : 0;
  };

  const rewardPopupRequiresSelection = () => {
    const active = rewardPopupCache?.current;
    if (!active || active.goalMet === false) return false;
    const kind = String(active.kind || "").toLowerCase();
    if (!["free", "bxgy", "buyxgety"].includes(kind)) return false;
    return !!active.requiresSelection || (Array.isArray(active.options) && active.options.length > 0);
  };

  const canCloseRewardPopup = () => {
    if (!rewardPopupRequiresSelection()) return true;
    const active = rewardPopupCache?.current;
    const limit = getRewardSelectionLimit(active?.kind, active?.rule, active?.options);
    return getRewardPopupSelectedCount() >= limit;
  };

  const closeRewardPopup = (opts = {}) => {
    if (!rewardPopupCache) return true;
    const force = !!opts.force;
    const reason = String(opts.reason || "");

    if (!force && reason === "outside" && !canCloseRewardPopup()) {
      if (rewardPopupCache.messageEl) {
        rewardPopupCache.messageEl.hidden = false;
        rewardPopupCache.messageEl.classList.add("is-error");
        const active = rewardPopupCache.current;
        const limit = getRewardSelectionLimit(active?.kind, active?.rule, active?.options);
        rewardPopupCache.messageEl.textContent =
          limit === 1
            ? "Please select one reward product before closing this popup."
            : `Please select ${limit} reward products before closing this popup.`;
      }
      rewardPopupCache.overlay.classList.add("sc-freegift-shake");
      setTimeout(() => rewardPopupCache?.overlay?.classList.remove("sc-freegift-shake"), 260);
      return false;
    }

    if (rewardPopupTimer) {
      clearTimeout(rewardPopupTimer);
      rewardPopupTimer = null;
    }
    rewardPopupCache.overlay.classList.remove("open");
    rewardPopupCache.current = null;
    drawer.__sc_reward_popup_for = null;
    return true;
  };

  const getVariantLegacyId = (variant) => {
    if (!variant) return null;
    const legacy = trimToNull(variant.legacyResourceId);
    if (legacy) return legacy;
    const gid = trimToNull(variant.id) || trimToNull(variant.admin_graphql_api_id);
    if (!gid) return null;
    if (/^\d+$/.test(gid)) return gid;
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

  const productIdMatchesRequest = (product, requestedNumericId) => {
    if (!requestedNumericId) return true;
    const productId = trimToNull(product?.id);
    const legacyId = trimToNull(product?.legacyResourceId || product?.legacy_resource_id);
    const adminId = gidToId(product?.admin_graphql_api_id);
    return [productId, legacyId, adminId]
      .map((id) => String(id || "").trim())
      .some((id) => id && id === String(requestedNumericId));
  };

  const pickRequestedProductFromPayload = (payload, requestedNumericId) => {
    const products = Array.isArray(payload?.products) ? payload.products : [];
    if (!requestedNumericId) return products[0] || null;
    return products.find((product) => productIdMatchesRequest(product, requestedNumericId)) || null;
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
          product = pickRequestedProductFromPayload(payload, numericId);
          if (!product) {
            console.warn(`[SmartCartify] requested reward product not found or mismatched for ID ${numericId}`);
            rewardVariantByProductCache.set(cacheKey, null);
            return null;
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
      if (!isHandleLookup && !productIdMatchesRequest(product, numericId)) {
        console.warn(`[SmartCartify] ignored mismatched reward product for ID ${numericId}`);
        rewardVariantByProductCache.set(cacheKey, null);
        return null;
      }

      const variants = Array.isArray(product?.variants) ? product.variants : [];
      const firstAvailableVariant = variants.find((item) => isVariantAvailable(item, product));
      const firstVariant = firstAvailableVariant || variants[0] || null;
      const legacyId = trimToNull(firstVariant?.id);
      if (!legacyId || !firstAvailableVariant) {
        // Product exists but has no available variants — cache null so we don't hammer /cart/add.js with 422s.
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
        available: isVariantAvailable(firstVariant, product),
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

  const rewardProductByIdCache = new Map();

  const getRewardProductCacheKey = (rawProductId) => {
    const numericId = normalizeProductNumericId(rawProductId);
    return numericId ? `id:${numericId}` : `handle:${String(rawProductId || "").trim()}`;
  };

  const normalizeRewardProductVariant = (product, variant, productId) => {
    if (!variant) return null;
    const rawVariantId = trimToNull(
      variant?.id ||
      variant?.variantId ||
      variant?.admin_graphql_api_id ||
      variant?.adminGraphqlApiId ||
      variant?.legacyResourceId ||
      variant?.legacy_resource_id
    );
    const legacyId = gidToId(rawVariantId) || rawVariantId;
    if (!legacyId) return null;
    const productImage =
      trimToNull(product?.image?.src) ||
      trimToNull(product?.image?.url) ||
      (typeof product?.image === "string" ? trimToNull(product.image) : null) ||
      trimToNull(product?.featuredImage?.url) ||
      (Array.isArray(product?.images) && trimToNull(product.images[0]?.src)) ||
      "";
    const imageUrl =
      trimToNull(variant?.featured_image?.src) ||
      trimToNull(variant?.image?.src) ||
      trimToNull(variant?.image?.url) ||
      (typeof variant?.image === "string" ? trimToNull(variant.image) : null) ||
      productImage;
    const rawOptions = Array.isArray(variant?.variantOptions) ? variant.variantOptions : [];
    return {
      ...variant,
      id: `gid://shopify/ProductVariant/${legacyId}`,
      legacyResourceId: String(legacyId),
      productId: String(productId || product?.id || ""),
      title: trimToNull(variant?.title) || "",
      price: variant?.price ?? variant?.variantPrice ?? null,
      compareAtPrice: variant?.compare_at_price ?? variant?.compareAtPrice ?? null,
      image: imageUrl,
      available: isVariantAvailable(variant, product),
      inventory_quantity: variant?.inventory_quantity ?? variant?.inventoryQuantity,
      inventory_policy: variant?.inventory_policy ?? variant?.inventoryPolicy,
      option1: variant?.option1 ?? rawOptions?.[0]?.value,
      option2: variant?.option2 ?? rawOptions?.[1]?.value,
      option3: variant?.option3 ?? rawOptions?.[2]?.value,
      product: {
        title: trimToNull(product?.title) || "",
        image: productImage || imageUrl,
      },
    };
  };

  const normalizeStoredRewardProduct = (product, requestedProductId = null) => {
    if (!product || typeof product !== "object") return null;
    const productId =
      normalizeProductNumericId(product?.id) ||
      normalizeProductNumericId(product?.productId) ||
      normalizeProductNumericId(product?.product_id) ||
      normalizeProductNumericId(requestedProductId) ||
      gidToId(product?.id) ||
      gidToId(product?.productId) ||
      gidToId(product?.product_id) ||
      trimToNull(product?.id || product?.productId || product?.product_id || requestedProductId);
    if (!productId) return null;
    const variants = (Array.isArray(product?.variants) ? product.variants : [])
      .map((variant) => normalizeRewardProductVariant(product, variant, productId))
      .filter(Boolean);
    const fallbackVariant = !variants.length && (product?.variantId || product?.variant_id)
      ? normalizeRewardProductVariant(product, {
        id: product.variantId || product.variant_id,
        title: product.variantTitle || product.variant_title,
        price: product.variantPrice ?? product.price,
        variantOptions: product.variantOptions,
        image: product.image,
      }, productId)
      : null;
    const normalizedVariants = fallbackVariant ? [fallbackVariant] : variants;
    const image =
      trimToNull(product?.image?.src) ||
      trimToNull(product?.image?.url) ||
      (typeof product?.image === "string" ? trimToNull(product.image) : null) ||
      trimToNull(product?.featuredImage?.url) ||
      (typeof product?.featuredImage === "string" ? trimToNull(product.featuredImage) : null) ||
      trimToNull(normalizedVariants[0]?.image) ||
      "";
    return {
      ...product,
      id: String(productId),
      title: trimToNull(product?.title) || trimToNull(product?.name) || "Free gift",
      image,
      options: getRewardProductOptionDefs(product, normalizedVariants),
      variants: normalizedVariants,
    };
  };

  const getRewardProductOptionDefs = (product, variants) => {
    const productOptions = Array.isArray(product?.options) ? product.options : [];
    return [0, 1, 2]
      .map((idx) => {
        const key = `option${idx + 1}`;
        const opt = productOptions[idx];
        const name = trimToNull(opt?.name || opt);
        const valuesFromProduct = Array.isArray(opt?.values) ? opt.values : [];
        const valuesFromVariants = (Array.isArray(variants) ? variants : [])
          .map((variant) => trimToNull(variant?.[key]))
          .filter(Boolean);
        const values = Array.from(new Set([...valuesFromProduct, ...valuesFromVariants].map(trimToNull).filter(Boolean)));
        const isDefaultOnly = values.length === 1 && /^default title$/i.test(values[0]);
        if (!name || !values.length || isDefaultOnly) return null;
        return { index: idx, key, name, values };
      })
      .filter(Boolean);
  };

  const resolveRewardProductForOptions = async (rawProductId) => {
    const cacheKey = getRewardProductCacheKey(rawProductId);
    if (rewardProductByIdCache.has(cacheKey)) return rewardProductByIdCache.get(cacheKey);

    const numericId = normalizeProductNumericId(rawProductId);
    const isHandleLookup = !numericId;
    let product = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const url = isHandleLookup
        ? `/products/${encodeURIComponent(rawProductId)}.js`
        : `/products.json?ids=${encodeURIComponent(numericId)}&limit=1`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      const payload = await res.json();
      product = isHandleLookup
        ? payload
        : pickRequestedProductFromPayload(payload, numericId);
    } catch (err) {
      console.warn("[SmartCartify] reward product variants fetch failed:", err?.message || err);
      return null;
    }

    if (!product) return null;
    if (!isHandleLookup && !productIdMatchesRequest(product, numericId)) {
      console.warn(`[SmartCartify] ignored mismatched reward product option data for ID ${numericId}`);
      rewardProductByIdCache.set(cacheKey, null);
      return null;
    }

    const productId = String(numericId || product?.id || rawProductId || "");
    const variants = (Array.isArray(product?.variants) ? product.variants : [])
      .map((variant) => normalizeRewardProductVariant(product, variant, productId))
      .filter(Boolean);
    const image =
      trimToNull(product?.image?.src) ||
      (Array.isArray(product?.images) && trimToNull(product.images[0]?.src)) ||
      trimToNull(variants[0]?.image) ||
      "";
    const normalized = {
      id: productId,
      title: trimToNull(product?.title) || "Free gift",
      image,
      options: getRewardProductOptionDefs(product, variants),
      variants,
    };
    rewardProductByIdCache.set(cacheKey, normalized);
    return normalized;
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

  const resolveRewardVariantForAdd = async (rule, variant, kind = "free") => {
    if (getVariantLegacyId(variant)) return variant;
    const normalizedKind = String(kind || "free").toLowerCase();
    const isBxgyReward = normalizedKind === "bxgy" || normalizedKind === "buyxgety";
    const giftType = String(rule?.giftType || "").toLowerCase();
    const giftSkuRaw = firstGiftSkuProductId(rule?.giftSku);

    const productIdCandidate = isBxgyReward
      ? (
        trimToNull(variant?.productId) ||
        trimToNull(rule?.rewardProductId) ||
        trimToNull(rule?.reward_product_id) ||
        trimToNull(rule?.getProductId) ||
        trimToNull(rule?.get_product_id) ||
        trimToNull(rule?.yProductId) ||
        trimToNull(rule?.y_product_id) ||
        (giftSkuRaw ? normalizeProductNumericId(giftSkuRaw) || gidToId(giftSkuRaw) || giftSkuRaw : null) ||
        null
      )
      : (
        trimToNull(variant?.productId) ||
        trimToNull(rule?.bonusProductId) ||
        trimToNull(rule?.bonus) ||
        trimToNull(rule?.freeProductId) ||
        trimToNull(rule?.free_product_id) ||
        trimToNull(rule?.giftProductId) ||
        trimToNull(rule?.gift_product_id) ||
        (giftType === "specific" && giftSkuRaw
          ? normalizeProductNumericId(giftSkuRaw) || gidToId(giftSkuRaw) || giftSkuRaw
          : null) ||
        null
      );

    if (!productIdCandidate) return variant;
    const resolved = await resolveVariantFromProductId(productIdCandidate);
    return resolved || variant;
  };

  const getRewardVariantFromRule = (kind, rule) => {
    const fromBonusId = () => {
      const raw = trimToNull(rule?.bonusProductId ?? rule?.bonus ?? null);
      if (!raw) return null;

      // Explicit variant fields are variant IDs.
      const explicitVariantRaw = trimToNull(
        rule?.bonusProductVariantId ??
        rule?.bonus_product_variant_id ??
        rule?.freeProductVariantId ??
        rule?.giftProductVariantId ??
        null
      );
      const explicitVariantGid = normalizeVariantGid(explicitVariantRaw);
      if (explicitVariantGid) {
        return {
          id: explicitVariantGid,
          legacyResourceId: gidToId(explicitVariantGid),
          productId: normalizeProductNumericId(raw) || gidToId(raw) || null,
        };
      }

      // bonusProductId/bonus normally stores a PRODUCT id/handle, not a variant id.
      // Keep it as productId so resolveRewardVariantForAdd can fetch the first available variant.
      if (/^gid:\/\/shopify\/ProductVariant\/\d+$/i.test(raw)) {
        return {
          id: raw,
          legacyResourceId: gidToId(raw),
          productId: null,
        };
      }
      const productId = normalizeProductNumericId(raw) || gidToId(raw) || raw;
      return productId ? { productId: String(productId) } : null;
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

    // Standard BXGY reward fields. Do not use bonusProductId/bonus here;
    // those belong to Free Gift/Cart Goal rules and caused free gifts to show
    // inside Buy X Get Y.
    const fromStandard =
      rule?.yProductVariant ||
      rule?.getProductVariant ||
      rule?.rewardProductVariant ||
      rule?.rewardVariant ||
      rule?.variant ||
      rule?.productVariant ||
      null;
    if (fromStandard) return fromStandard;

    const rewardProductId =
      trimToNull(rule?.rewardProductId) ||
      trimToNull(rule?.reward_product_id) ||
      trimToNull(rule?.getProductId) ||
      trimToNull(rule?.get_product_id) ||
      trimToNull(rule?.yProductId) ||
      trimToNull(rule?.y_product_id) ||
      null;
    if (rewardProductId) {
      const productId = normalizeProductNumericId(rewardProductId) || gidToId(rewardProductId) || rewardProductId;
      return { productId: String(productId) };
    }

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

  const getRewardQtyFromRule = (_kind, rule) => {
    const raw =
      rule?.qty ??
      rule?.quantity ??
      rule?.freeQty ??
      rule?.free_qty ??
      rule?.rewardQty ??
      rule?.reward_qty ??
      rule?.yQty ??
      rule?.y_qty ??
      rule?.getQty ??
      rule?.get_qty ??
      1;
    const n = Number(raw);
    return Math.max(1, Number.isFinite(n) ? n : 1);
  };

  const getRewardSelectionLimit = () => 1;

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

    (drawer || document.body || document.documentElement).appendChild(overlayEl);

    const closeBtn = overlayEl.querySelector(".sc-freegift-close");
    const addBtn = overlayEl.querySelector(".sc-freegift-add");

    overlayEl.addEventListener("click", (event) => {
      if (event.target === overlayEl) closeRewardPopup({ reason: "outside" });
    });
    if (closeBtn) closeBtn.addEventListener("click", () => closeRewardPopup({ force: true, reason: "close-button" }));

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
      const options = Array.isArray(rewardPopupCache.current.options)
        ? rewardPopupCache.current.options
        : [];
      const selectionLimit = getRewardSelectionLimit(
        rewardPopupCache.current.kind,
        rewardPopupCache.current.rule,
        options
      );
      const currentIds = Array.isArray(rewardPopupCache.current.selectedOptionIds)
        ? [...rewardPopupCache.current.selectedOptionIds]
        : rewardPopupCache.current.selectedOptionId
          ? [rewardPopupCache.current.selectedOptionId]
          : [];
      let nextIds = currentIds;
      if (selectedId) {
        if (nextIds.includes(selectedId)) {
          nextIds = nextIds.filter((id) => String(id) !== String(selectedId));
        } else {
          nextIds = selectionLimit <= 1
            ? [selectedId]
            : [...nextIds, selectedId].slice(0, selectionLimit);
        }
      }
      rewardPopupCache.current.selectedOptionIds = nextIds;
      rewardPopupCache.current.selectedOptionId = nextIds[0] || null;
      const selectedCount = nextIds.length;
      const goalMet = rewardPopupCache.current.goalMet !== false;
      if (rewardPopupCache.headerSubEl) {
        rewardPopupCache.headerSubEl.innerHTML = `Choose one free gift <span class="sc-freegift-count">${selectedCount}/${selectionLimit}</span>`;
      }
      if (rewardPopupCache.addButton) rewardPopupCache.addButton.disabled = selectedCount < selectionLimit || !goalMet;
      if (rewardPopupCache.messageEl) {
        const addLabel = rewardPopupCache.current.kind === "free" ? "Add Free Gift" : "Add Item";
        rewardPopupCache.messageEl.classList.remove("is-error");
        rewardPopupCache.messageEl.textContent = !goalMet
          ? getRewardGoalPendingMessage(rewardPopupCache.current.kind)
          : selectedCount >= selectionLimit
            ? `Item selected. Click ${addLabel} to add it to your cart.`
            : `Select ${selectionLimit - selectedCount} more free gift${selectionLimit - selectedCount === 1 ? "" : "s"} to add to your cart.`;
      }
      if (rewardPopupCache.listEl) {
        rewardPopupCache.listEl.querySelectorAll(".sc-freegift-option").forEach((row) => {
          const optionId = String(row.getAttribute("data-option-id") || "");
          const checked = nextIds.some((id) => String(id) === optionId);
          row.classList.toggle("selected", checked);
          const box = row.querySelector(".sc-freegift-check");
          if (box) {
            box.setAttribute("aria-checked", checked ? "true" : "false");
            box.innerHTML = "";
          }
        });
      }
      rewardPopupCache.current.selectedOption =
        options.find((option) => String(option.optionId) === String(nextIds[0])) || null;
      rewardPopupCache.current.selectedOptions = nextIds
        .map((id) => options.find((option) => String(option.optionId) === String(id)))
        .filter(Boolean);
      renderFreeGiftPopupOptions(rewardPopupCache, options, normalizeCurrencyCode());
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

    overlayEl.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const select = target.closest("[data-gift-variant-select]");
      if (!select || !rewardPopupCache?.current?.selectedOption) return;
      const key = select.getAttribute("data-gift-variant-select");
      if (!key) return;
      const current = rewardPopupCache.current;
      const options = Array.isArray(current.options) ? current.options : [];
      const selectedId =
        trimToNull(select.closest(".sc-freegift-option-wrap")?.querySelector("[data-option-id]")?.getAttribute("data-option-id")) ||
        current.selectedOptionId;
      const updatedOptions = options.map((option) =>
        String(option.optionId) === String(selectedId)
          ? setRewardOptionSelection(option, key, select.value)
          : option
      );
      current.options = updatedOptions;
      current.selectedOption =
        updatedOptions.find((option) => String(option.optionId) === String(current.selectedOptionId)) || null;
      current.selectedOptions = (Array.isArray(current.selectedOptionIds) ? current.selectedOptionIds : [])
        .map((id) => updatedOptions.find((option) => String(option.optionId) === String(id)))
        .filter(Boolean);
      renderFreeGiftPopupOptions(rewardPopupCache, updatedOptions, normalizeCurrencyCode());
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
          const selectedOptions = isMultiOption
            ? (
              Array.isArray(cur.selectedOptions) && cur.selectedOptions.length
                ? cur.selectedOptions
                : cur.selectedOption
                  ? [cur.selectedOption]
                  : []
            )
            : [];
          const selectedOption = selectedOptions[0] || null;
          const selectionLimit = isMultiOption
            ? getRewardSelectionLimit(cur.kind, cur.rule, cur.options)
            : 1;

          if (isMultiOption && selectedOptions.length < selectionLimit) {
            if (rewardPopupCache.messageEl) {
              rewardPopupCache.messageEl.classList.add("is-error");
              rewardPopupCache.messageEl.textContent =
                selectionLimit === 1
                  ? "Please select one free gift before adding."
                  : `Please select ${selectionLimit} free gifts before adding.`;
            }
            return;
          }
          const addTargets = isMultiOption ? selectedOptions : [{ rule: cur.rule, variant: cur.variant, qty: cur.qty }];
          let addedCount = 0;
          for (const target of addTargets) {
            const ok = await addRewardToCart({
              kind: cur.kind,
              rule: target?.rule || cur.rule,
              ruleKey: cur.ruleKey,
              slot: cur.slot,
              variant: target?.variant || cur.variant,
              qty: selectionLimit > 1 ? 1 : (target?.qty || cur.qty),
              markAutoAdded: false,
              skipExistingCheck: isMultiOption && addTargets.length > 1,
            });
            if (ok) addedCount += 1;
          }
          const ok = addedCount > 0;
          if (ok) {
            const addedGuardKey = cur.kind === "free" ? cur.slot || cur.ruleKey : cur.ruleKey;
            if (addedGuardKey) {
              if (cur.kind === "free") scStore.del(keyPendingFreeGift(addedGuardKey));
              markPopupShown(cur.kind, addedGuardKey);
            }
            suppressAutoRewardPopups(3200);
            closeRewardPopup({ force: true, reason: "added" });
            renderAllFromCache();
            // Reward added after a completed goal: show only the paper celebration, not the reward success popup.
            if (cur.goalMet !== false) setTimeout(() => firePaperEffect(2400), 80);
          } else {
            // Keep the popup open and show an inline error instead of the large red reward modal.
            if (rewardPopupCache.messageEl) {
              rewardPopupCache.messageEl.classList.add("is-error");
              rewardPopupCache.messageEl.textContent = "Could not add the product. Please check the reward product/variant.";
            } else {
              showCenterCelebratePopup("Reward", "Could not add the product. Please check the reward product/variant.", 4000, "error");
            }
          }
        } catch (err) {
          // Show the actual Shopify/app reason inline when available.
          const msg = trimToNull(err?.message) || "Could not add the product. Please check the reward product/variant.";
          if (rewardPopupCache.messageEl) {
            rewardPopupCache.messageEl.classList.add("is-error");
            rewardPopupCache.messageEl.textContent = msg;
          } else {
            showCenterCelebratePopup("Reward", msg, 4000, "error");
          }
        } finally {
          const active = rewardPopupCache?.current;
          const requiresSelection =
            active?.kind === "free" ||
            (
              (active?.kind === "bxgy" || active?.kind === "buyxgety") &&
              Array.isArray(active?.options) &&
              active.options.length > 0
            );
          const activeLimit = requiresSelection
            ? getRewardSelectionLimit(active?.kind, active?.rule, active?.options)
            : 1;
          const activeSelectedCount = Array.isArray(active?.selectedOptionIds)
            ? active.selectedOptionIds.length
            : active?.selectedOption
              ? 1
              : 0;
          addBtn.disabled =
            active?.goalMet === false ||
            (requiresSelection && activeSelectedCount < activeLimit);
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

  const getFreeGiftProductIds = (rule, kind = "free") => {
    const normalizedKind = String(kind || "free").toLowerCase();
    const isBxgyReward = normalizedKind === "bxgy" || normalizedKind === "buyxgety";

    // Keep reward sources separated. Buy X Get Y must never fall back to
    // Free Gift/Cart Goal bonus fields, otherwise every free gift can appear
    // inside the BXGY popup.
    const products = isBxgyReward
      ? [
        ...parseArrayish(rule?.rewardProducts),
        ...parseArrayish(rule?.reward_products),
        ...parseArrayish(rule?.getProducts),
        ...parseArrayish(rule?.get_products),
        ...parseArrayish(rule?.yProducts),
        ...parseArrayish(rule?.y_products),
      ]
      : [
        ...parseArrayish(rule?.bonusProducts),
        ...parseArrayish(rule?.bonus_products),
        ...parseArrayish(rule?.freeProducts),
        ...parseArrayish(rule?.free_products),
        ...parseArrayish(rule?.giftProducts),
        ...parseArrayish(rule?.gift_products),
      ];

    const ids = isBxgyReward
      ? [
        ...refsFromValue(rule?.rewardProductIds),
        ...refsFromValue(rule?.reward_product_ids),
        ...refsFromValue(rule?.getProductIds),
        ...refsFromValue(rule?.get_product_ids),
        ...refsFromValue(rule?.yProductIds),
        ...refsFromValue(rule?.y_product_ids),
        ...refsFromValue(rule?.giftSku),
        trimToNull(rule?.rewardProductId),
        trimToNull(rule?.reward_product_id),
        trimToNull(rule?.getProductId),
        trimToNull(rule?.get_product_id),
        trimToNull(rule?.yProductId),
        trimToNull(rule?.y_product_id),
      ]
      : [
        ...refsFromValue(rule?.bonusProductIds),
        ...refsFromValue(rule?.bonus_product_ids),
        ...refsFromValue(rule?.freeProductIds),
        ...refsFromValue(rule?.free_product_ids),
        ...refsFromValue(rule?.giftProductIds),
        ...refsFromValue(rule?.gift_product_ids),
        trimToNull(rule?.bonusProductId),
        trimToNull(rule?.bonus_product_id),
        trimToNull(rule?.bonus),
        trimToNull(rule?.freeProductId),
        trimToNull(rule?.free_product_id),
        trimToNull(rule?.giftProductId),
        trimToNull(rule?.gift_product_id),
      ];

    const productIds = products
      .map((product) => trimToNull(product?.id || product?.productId || product?.product_id))
      .filter(Boolean);

    const allIds = [...ids, ...productIds]
      .map((id) => normalizeResourceId(id) || trimToNull(id))
      .filter(Boolean);

    const seen = new Set();
    return allIds.filter((id) => {
      const key = String(normalizeProductNumericId(id) || gidToId(id) || id).trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const getFreeGiftProductMeta = (rule, productId, index, kind = "free") => {
    const normalizedKind = String(kind || "free").toLowerCase();
    const isBxgyReward = normalizedKind === "bxgy" || normalizedKind === "buyxgety";
    const products = isBxgyReward
      ? [
        ...parseArrayish(rule?.rewardProducts),
        ...parseArrayish(rule?.reward_products),
        ...parseArrayish(rule?.getProducts),
        ...parseArrayish(rule?.get_products),
        ...parseArrayish(rule?.yProducts),
        ...parseArrayish(rule?.y_products),
      ]
      : [
        ...parseArrayish(rule?.bonusProducts),
        ...parseArrayish(rule?.bonus_products),
        ...parseArrayish(rule?.freeProducts),
        ...parseArrayish(rule?.free_products),
        ...parseArrayish(rule?.giftProducts),
        ...parseArrayish(rule?.gift_products),
      ];

    const byId = products.find((product) => {
      const id = trimToNull(product?.id || product?.productId || product?.product_id);
      const normalizedId = normalizeProductNumericId(id) || gidToId(id) || id;
      const normalizedProductId = normalizeProductNumericId(productId) || gidToId(productId) || productId;
      return id && productId && String(normalizedId) === String(normalizedProductId);
    });
    return byId || products[index] || null;
  };

  const getFreeGiftVariantFromRule = (rule, productId, index, kind = "free") => {
    const productMeta = getFreeGiftProductMeta(rule, productId, index, kind);
    const normalizedKind = String(kind || "free").toLowerCase();
    const isBxgyReward = normalizedKind === "bxgy" || normalizedKind === "buyxgety";
    const hasProductMetaVariant = !!(
      trimToNull(productMeta?.variantId) ||
      trimToNull(productMeta?.variant_id)
    );
    const rawVariantId =
      trimToNull(productMeta?.variantId) ||
      trimToNull(productMeta?.variant_id) ||
      (isBxgyReward
        ? (
          trimToNull(rule?.rewardProductVariantId) ||
          trimToNull(rule?.reward_product_variant_id) ||
          trimToNull(rule?.getProductVariantId) ||
          trimToNull(rule?.get_product_variant_id) ||
          trimToNull(rule?.yProductVariantId) ||
          trimToNull(rule?.y_product_variant_id) ||
          trimToNull(rule?.giftSkuVariantId) ||
          trimToNull(rule?.gift_sku_variant_id)
        )
        : (
          trimToNull(rule?.bonusProductVariantId) ||
          trimToNull(rule?.bonus_product_variant_id) ||
          trimToNull(rule?.freeProductVariantId) ||
          trimToNull(rule?.free_product_variant_id) ||
          trimToNull(rule?.giftProductVariantId) ||
          trimToNull(rule?.gift_product_variant_id)
        )) ||
      null;
    if (!rawVariantId) return null;

    const firstProductId =
      getFreeGiftProductIds(rule, kind)[0] ||
      (isBxgyReward
        ? (
          trimToNull(rule?.rewardProductId) ||
          trimToNull(rule?.reward_product_id) ||
          trimToNull(rule?.getProductId) ||
          trimToNull(rule?.get_product_id) ||
          trimToNull(rule?.yProductId) ||
          trimToNull(rule?.y_product_id)
        )
        : null) ||
      trimToNull(rule?.bonusProductId) ||
      trimToNull(rule?.bonus) ||
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
        title: trimToNull(productMeta?.title) || (isBxgyReward ? trimToNull(rule?.rewardProductTitle) || trimToNull(rule?.getProductTitle) || trimToNull(rule?.yProductTitle) : trimToNull(rule?.bonusProductTitle) || trimToNull(rule?.freeProductTitle) || trimToNull(rule?.giftProductTitle)) || trimToNull(rule?.productTitle) || "",
        image: trimToNull(productMeta?.image) || (isBxgyReward ? trimToNull(rule?.rewardProductImage) || trimToNull(rule?.getProductImage) || trimToNull(rule?.yProductImage) : trimToNull(rule?.bonusProductImage) || trimToNull(rule?.freeProductImage) || trimToNull(rule?.giftProductImage)) || trimToNull(rule?.productImage) || "",
      },
      title: trimToNull(productMeta?.variantTitle) || (isBxgyReward ? trimToNull(rule?.rewardProductVariantTitle) || trimToNull(rule?.getProductVariantTitle) || trimToNull(rule?.yProductVariantTitle) : trimToNull(rule?.bonusProductVariantTitle) || trimToNull(rule?.freeProductVariantTitle) || trimToNull(rule?.giftProductVariantTitle)) || "",
      image: trimToNull(productMeta?.image) || (isBxgyReward ? trimToNull(rule?.rewardProductImage) || trimToNull(rule?.getProductImage) || trimToNull(rule?.yProductImage) : trimToNull(rule?.bonusProductImage) || trimToNull(rule?.freeProductImage) || trimToNull(rule?.giftProductImage)) || trimToNull(rule?.productImage) || "",
    };
  };

  const centsFromDecimalPrice = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n * priceDivisor()) : 0;
  };

  const getSelectedRewardVariant = (option) => {
    const variants = Array.isArray(option?.variants) ? option.variants : [];
    if (!variants.length) return option?.variant || null;
    const selections = option?.selectedOptions || {};
    const optionDefs = Array.isArray(option?.variantOptions) ? option.variantOptions : [];
    const matched = variants.find((variant) =>
      optionDefs.every((def) => {
        const wanted = trimToNull(selections?.[def.key]);
        return !wanted || String(variant?.[def.key] || "") === String(wanted);
      })
    );
    if (matched && isVariantAvailable(matched)) return matched;
    const available = variants.find((variant) => isVariantAvailable(variant));
    return available || option?.variant || null;
  };

  const setRewardOptionSelection = (option, key, value) => {
    if (!option) return option;
    const next = {
      ...option,
      selectedOptions: {
        ...(option.selectedOptions || {}),
        [key]: value,
      },
    };
    const selectedVariant = getSelectedRewardVariant(next);
    return {
      ...next,
      variant: selectedVariant,
      image: trimToNull(selectedVariant?.image) || trimToNull(next.image),
      priceCents: centsFromDecimalPrice(selectedVariant?.price),
    };
  };

  const buildFreeGiftOption = ({ rule, productId, variant, product, index, kind = "free" }) => {
    const variants = Array.isArray(product?.variants) && product.variants.length
      ? product.variants
      : variant
        ? [variant]
        : [];
    const exactVariant = variants.find((item) => getVariantLegacyId(item) === getVariantLegacyId(variant));
    const selectedVariant =
      (exactVariant && isVariantAvailable(exactVariant) ? exactVariant : null) ||
      variants.find((item) => isVariantAvailable(item)) ||
      null;
    if (!selectedVariant || !getVariantLegacyId(selectedVariant) || isRewardVariantUnavailable(selectedVariant)) return null;
    const normalizedKind = String(kind || "free").toLowerCase();
    const isBxgyReward = normalizedKind === "bxgy" || normalizedKind === "buyxgety";
    const optionRule = isBxgyReward
      ? {
        ...rule,
        rewardProductId: productId,
        rewardProductIds: [productId],
        getProductId: productId,
        getProductIds: [productId],
      }
      : {
        ...rule,
        bonusProductId: productId,
        bonus: productId,
        bonusProductIds: [productId],
      };
    const productName =
      trimToNull(product?.title) ||
      trimToNull(selectedVariant?.product?.title) ||
      trimToNull(selectedVariant?.productTitle) ||
      (isBxgyReward
        ? trimToNull(rule?.rewardProductTitle) || trimToNull(rule?.getProductTitle) || trimToNull(rule?.yProductTitle)
        : trimToNull(rule?.bonusProductTitle) || trimToNull(rule?.freeProductTitle) || trimToNull(rule?.giftProductTitle)) ||
      trimToNull(rule?.productTitle) ||
      "Free gift";
    const variantOptions = (Array.isArray(product?.options) ? product.options : [])
      .map((def, optionIndex) => {
        const key = trimToNull(def?.key) || `option${optionIndex + 1}`;
        const values = Array.isArray(def?.values) ? def.values.map(trimToNull).filter(Boolean) : [];
        const name = trimToNull(def?.name) || `Option ${optionIndex + 1}`;
        if (!key || !values.length) return null;
        return { ...def, key, name, values };
      })
      .filter(Boolean);
    const selectedOptions = {};
    variantOptions.forEach((def) => {
      selectedOptions[def.key] = trimToNull(selectedVariant?.[def.key]) || trimToNull(def.values?.[0]) || "";
    });

    return {
      optionId: `${productId || getVariantLegacyId(selectedVariant)}:${index}`,
      rule: optionRule,
      variant: selectedVariant,
      variants,
      variantOptions,
      selectedOptions,
      qty: getRewardQtyFromRule(kind, optionRule),
      title: productName,
      image: trimToNull(product?.image) || trimToNull(selectedVariant?.image) || trimToNull(selectedVariant?.product?.image) || (isBxgyReward ? trimToNull(rule?.rewardProductImage) || trimToNull(rule?.getProductImage) || trimToNull(rule?.yProductImage) : trimToNull(rule?.bonusProductImage) || trimToNull(rule?.freeProductImage) || trimToNull(rule?.giftProductImage)) || "",
      priceCents: centsFromDecimalPrice(selectedVariant?.price),
    };
  };

  const getImmediateFreeGiftOptions = (rule, kind = "free") => {
    const productIds = getFreeGiftProductIds(rule, kind);
    const rawOptions = productIds;
    const options = rawOptions
      .map((productId, index) => buildFreeGiftOption({
        rule,
        productId,
        variant: getFreeGiftVariantFromRule(rule, productId, index, kind),
        product: normalizeStoredRewardProduct(getFreeGiftProductMeta(rule, productId, index, kind), productId),
        index,
        kind,
      }))
      .filter(Boolean);
    return options;
  };

  const resolveFreeGiftOptions = async (rule, kind = "free") => {
    const productIds = getFreeGiftProductIds(rule, kind);
    const rawOptions = productIds;
    const options = [];

    for (let index = 0; index < rawOptions.length; index += 1) {
      const productId = rawOptions[index];
      const normalizedKind = String(kind || "free").toLowerCase();
      const isBxgyReward = normalizedKind === "bxgy" || normalizedKind === "buyxgety";
      const optionRule = isBxgyReward
        ? {
          ...rule,
          rewardProductId: productId,
          rewardProductIds: [productId],
          getProductId: productId,
          getProductIds: [productId],
        }
        : {
          ...rule,
          bonusProductId: productId,
          bonus: productId,
          bonusProductIds: [productId],
        };
      const directVariant = getFreeGiftVariantFromRule(rule, productId, index, kind);
      const product =
        normalizeStoredRewardProduct(getFreeGiftProductMeta(rule, productId, index, kind), productId) ||
        await resolveRewardProductForOptions(productId);
      const variant = directVariant || product?.variants?.[0] || await resolveRewardVariantForAdd(optionRule, { productId }, kind);
      const option = buildFreeGiftOption({ rule, productId, variant, product, index, kind });
      if (!option) {
        console.warn(`[SmartCartify] skipping option ${index}: variant resolution failed`);
        continue;
      }
      options.push(option);
    }

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
    const selectionLimit = getRewardSelectionLimit(state.current.kind, state.current.rule, state.current.options);
    const preservedSelectedIds = Array.isArray(state.current.selectedOptionIds)
      ? state.current.selectedOptionIds.map(trimToNull).filter(Boolean)
      : trimToNull(state.current.selectedOptionId)
        ? [trimToNull(state.current.selectedOptionId)]
        : [];
    const validSelectedIds = preservedSelectedIds
      .filter((id) => state.current.options.some((option) => String(option.optionId) === String(id)))
      .slice(0, selectionLimit);
    const defaultSelectedIds = validSelectedIds.length ? validSelectedIds : [];
    state.current.selectedOptionIds = defaultSelectedIds;
    state.current.selectedOptions = defaultSelectedIds
      .map((id) => state.current.options.find((option) => String(option.optionId) === String(id)))
      .filter(Boolean);
    const defaultSelected = state.current.selectedOptions[0] || null;
    state.current.selectedOption = defaultSelected;
    state.current.selectedOptionId = defaultSelected?.optionId || null;
    const selectedCount = state.current.selectedOptionIds.length;
    if (state.headerSubEl) {
      state.headerSubEl.innerHTML = `Choose one free gift <span class="sc-freegift-count">${selectedCount}/${selectionLimit}</span>`;
    }
    if (state.messageEl) {
      state.messageEl.hidden = false;
      state.messageEl.classList.remove("is-error");
      state.messageEl.textContent = state.current.goalMet === false
        ? getRewardGoalPendingMessage(state.current.kind)
        : selectedCount >= selectionLimit
          ? "Click Add to add your free gift to the cart."
          : `Select ${selectionLimit - selectedCount} more free gift${selectionLimit - selectedCount === 1 ? "" : "s"} to add to your cart.`;
    }

    if (!state.current.options.length) {
      optionsEl.innerHTML = `<div class="sc-freegift-loading">No available free gifts found.</div>`;
      if (state.addButton) state.addButton.disabled = true;
      if (state.messageEl) state.messageEl.textContent = "No free gift item is available right now.";
      return;
    }

    const renderVariantPanel = (option) => {
      if (!option || !Array.isArray(option.variantOptions) || !option.variantOptions.length) return "";
      return `
        <div class="sc-freegift-variant-panel" data-freegift-variant-panel>
          ${option.variantOptions.map((def) => {
        const selected = trimToNull(option.selectedOptions?.[def.key]) || trimToNull(def.values?.[0]) || "";
        return `
              <div class="sc-freegift-variant-field">
                <label>${safe(def.name)}</label>
                <span class="sc-freegift-variant-select-wrap">
                  <select class="sc-freegift-variant-select" data-gift-variant-select="${safe(def.key)}">
                    ${def.values.map((value) => {
          const valueText = trimToNull(value);
          return `<option value="${safe(valueText)}" ${String(valueText) === String(selected) ? "selected" : ""}>${safe(valueText)}</option>`;
        }).join("")}
                  </select>
                </span>
              </div>
            `;
      }).join("")}
        </div>
      `;
    };

    const selectedIds = Array.isArray(state.current.selectedOptionIds) ? state.current.selectedOptionIds : [];
    const rowsHtml = state.current.options.map((option) => {
      const selected = selectedIds.some((id) => String(id) === String(option.optionId));
      const activeVariant = selected ? getSelectedRewardVariant(option) : option.variant;
      const priceCents = selected ? centsFromDecimalPrice(activeVariant?.price) : option.priceCents;
      const priceHtml = priceCents > 0
        ? `<span class="sc-freegift-price">${formatMoney(priceCents, currency)}</span>`
        : "";
      const image = selected ? trimToNull(activeVariant?.image) || option.image : option.image;
      const imageHtml = image
        ? `<img src="${safe(image)}" alt="${safe(option.title)}" loading="lazy">`
        : `<span class="sc-freegift-thumb-empty">${safe((option.title || "G").slice(0, 1))}</span>`;
      return `
        <div class="sc-freegift-option-wrap ${selected ? "selected" : ""}">
          <button class="sc-freegift-option ${selected ? "selected" : ""}" type="button" data-option-id="${safe(option.optionId)}">
            <span class="sc-freegift-thumb">${imageHtml}</span>
            <span class="sc-freegift-option-main">
              <span class="sc-freegift-option-title">${safe(option.title)}</span>
              <span class="sc-freegift-option-price">${priceHtml}<span class="sc-freegift-free-pill">Free</span></span>
            </span>
            <span class="sc-freegift-check" role="checkbox" aria-checked="${selected ? "true" : "false"}" aria-hidden="true">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M5 12.5l4.2 4.2L19 7"/>
              </svg>
              <span class="sc-check-sparks" aria-hidden="true"><i></i><i></i><i></i></span>
            </span>
          </button>
          ${selected ? renderVariantPanel(option) : ""}
        </div>
      `;
    }).join("");

    optionsEl.innerHTML = rowsHtml;
    requestAnimationFrame(() => triggerFreeGiftCheckAnimations(optionsEl));

    if (state.addButton) state.addButton.disabled = state.current.goalMet === false || selectedCount < selectionLimit;
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
    if (!force && Number(drawer.__sc_suppress_reward_popup_until || 0) > Date.now()) {
      return false;
    }
    if (
      !force &&
      DISABLE_REWARD_SUCCESS_POPUPS &&
      ["free", "bxgy", "buyxgety"].includes(String(kind || "").toLowerCase())
    ) {
      return false;
    }
    const variant = getRewardVariantFromRule(kind, rule);

    // For cart goal free products with multiple options, variant will be null
    // Allow the popup to open so options can be resolved asynchronously
    const hasBonusProductIds = getFreeGiftProductIds(rule, kind).length > 0;
    const isMultiOptionReward = (kind === "free" || kind === "bxgy" || kind === "buyxgety") && hasBonusProductIds;
    const hasBxgyReferences = false;

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
          ? `Choose one free gift <span class="sc-freegift-count">0/1</span>`
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

    if (state.subtitleEl) state.subtitleEl.textContent = `${formatCampaignMoney(0, currency)} (Free)`;

    const ruleName =
      popupRuleTitle ||
      trimToNull(rule?.cartStepName) ||
      trimToNull(rule?.campaignName) ||
      "Reward";
    if (state.ruleTitleEl) state.ruleTitleEl.textContent = ruleName;

    if (state.addButton) state.addButton.textContent = kind === "free" ? "✓ Add Free Gift" : `Add Item`;

    state.current = { kind, ruleKey, slot, rule, variant, qty, goalMet: addItemGoalMet, requiresSelection: isMultiOptionReward, options: [], selectedOption: null, selectedOptionId: null, selectedOptionIds: [], selectedOptions: [] };
    state.overlay.classList.add("open");

    drawer.__sc_reward_popup_for = `${kind}:${guardKey || ""}`;

    if (!variant && !isMultiOptionReward && hasBxgyReferences) {
      if (state.contentEl) state.contentEl.hidden = true;
      if (state.headerSubEl) state.headerSubEl.textContent = "Products or collections included in this offer";
      renderBxgyReferenceItems(state, []);
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

      const immediateOptions = getImmediateFreeGiftOptions(rule, kind);
      if (immediateOptions.length) {
        renderFreeGiftPopupOptions(state, immediateOptions, currency);
      }

      const currentPopupKey = `${kind}:${guardKey || ""}`;

      void resolveFreeGiftOptions(rule, kind)
        .then((options) => {
          const activeState = rewardPopupCache || state;
          if (!activeState.current) return;
          if (drawer.__sc_reward_popup_for !== currentPopupKey) return;
          if (!Array.isArray(options) || !options.length) {
            const existingOptions = Array.isArray(activeState.current.options)
              ? activeState.current.options
              : [];
            if (existingOptions.length) return;
          }
          renderFreeGiftPopupOptions(activeState, options, currency);
        })
        .catch((err) => {
          console.error("[SmartCartify] free gift options failed:", err);
          const existingOptions = Array.isArray(state.current?.options) ? state.current.options : [];
          if (existingOptions.length) return;
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
            const subtotalRupees =
              (getRuleProgressSubtotalCents("free", rule) / priceDivisor(CART?.currency)) || 0;
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
      : Math.max(
        0,
        isCartGoalRule(step?.rule)
          ? getCartGoalProgressSubtotalCents(step.rule)
          : Number.isFinite(Number(subtotalCents))
            ? Number(subtotalCents)
            : getRuleProgressSubtotalCents(step?.type, step?.rule)
      );

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
      // Keep the announcement bar, progress bar, and milestone offers visible
      // even when there are no cart items. The subtotal remains 0, so the
      // existing progress logic below shows all configured unlock steps from
      // the beginning instead of hiding the whole rewards area.
    }

    const bxgyNow = getBxgyStatus();
    const bxgyCompleteNow = !!(bxgyNow && bxgyNow.complete);

    const buyStatuses = getBuyXGetYStatuses();
    const anyBuyCompletedNow = buyStatuses.some((x) => x.complete);
    const isDrawerOpen = drawer.classList.contains("open");

    const showCompletedBxgyRewardPopup = ({ celebrate = false } = {}) => {
      const firstCompleted = buyStatuses.find((x) => x.complete);
      if (firstCompleted) {
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

        if (popupShown && celebrate) firePaperEffect(2400);
        return popupShown;
      }

      if (bxgyCompleteNow && bxgyNow) {
        const popupShown = openRewardPopupFor({
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

        if (popupShown && celebrate) firePaperEffect(2400);
        return popupShown;
      }

      return false;
    };

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
      const selectedCartGoalCampaign = getSelectedCartGoalCampaign();
      if (selectedCartGoalCampaign) {
        setProgressVisible(true);
        progressWrap.classList.add("sc-cart-goal-progress");
      } else {
        setProgressVisible(false);
      }
      label.innerHTML = selectedCartGoalCampaign ? "" : renderGoalMessageHtml("Milestones not configured yet.");
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
        showCompletedBxgyRewardPopup({ celebrate: false });
      }
      return;
    }

    const configuredSteps = stepsAll.filter(isProgressStepConfigured);

    if (!configuredSteps.length) {
      const selectedCartGoalCampaign = getSelectedCartGoalCampaign();
      if (selectedCartGoalCampaign) {
        setProgressVisible(true);
        progressWrap.classList.add("sc-cart-goal-progress");
      } else {
        setProgressVisible(false);
      }
      label.innerHTML = selectedCartGoalCampaign ? "" : renderGoalMessageHtml("Milestones not configured yet.");
      fill.style.width = "0%";
      dotsWrap.innerHTML = "";
      legends.innerHTML = "";

      const priming = !__SC_PRIMED_POPUPS__;
      if (priming) {
        LAST_DONE = 0;
        LAST_BXGY_DONE = bxgyCompleteNow;
        drawer.__sc_buy_completed_before = anyBuyCompletedNow;
        __SC_PRIMED_POPUPS__ = true;
        showCompletedBxgyRewardPopup({ celebrate: false });
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
    const previousDoneCount = LAST_DONE;
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

    let rewardPopupShown = false;
    const priming = !__SC_PRIMED_POPUPS__;
    if (priming) {
      LAST_DONE = doneCount;
      LAST_BXGY_DONE = bxgyCompleteNow;
      drawer.__sc_buy_completed_before = anyBuyCompletedNow;
      __SC_PRIMED_POPUPS__ = true;

      rewardPopupShown = showCompletedBxgyRewardPopup({ celebrate: false });
    }

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
          firePaperEffect(2400);
          rewardPopupShown = true;
        }
      } else if (bxgyCompleteNow && !LAST_BXGY_DONE) {
        if (bxgyNow) {
          const popupShown = openRewardPopupFor({
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

          if (popupShown) {
            firePaperEffect(2400);
            rewardPopupShown = true;
          }
        }
      }

      if (!anyBuyCompletedNow) drawer.__sc_buy_completed_before = false;
    }

    const newlyCompletedSteps = !priming && doneCount > LAST_DONE
      ? doneSteps.slice(Math.max(0, LAST_DONE))
      : [];
    const newlyCompletedGiftStep = newlyCompletedSteps.find(
      (step) => String(step?.type || "").toLowerCase() === "free" && step?.rule?.isCartGoal
    );
    if (isDrawerOpen && newlyCompletedGiftStep && !rewardPopupShown) {
      const popupShown = openRewardPopupFor({
        kind: "free",
        rule: newlyCompletedGiftStep.rule,
        ruleKey: getRuleKey(newlyCompletedGiftStep.rule, "cartgoal"),
        slot: newlyCompletedGiftStep.slot,
        title:
          trimToNull(newlyCompletedGiftStep.progressTextAfter) ||
          trimToNull(newlyCompletedGiftStep.title) ||
          "Gift unlocked",
      });

      if (popupShown) {
        firePaperEffect(2400);
        rewardPopupShown = true;
      }
    }

    const stepCompletedNow = !priming && doneCount > LAST_DONE;
    if (stepCompletedNow && !rewardPopupShown) {
      firePaperEffect(2400);
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
        const justDone = !priming && isDone && i >= previousDoneCount && i < doneCount;
        const cls = `${isDone ? "done" : isActive ? "active" : ""}${justDone ? " just-done" : ""}`.trim();
        const belowText = trimToNull(ss.progressTextBelow) || trimToNull(ss.title);
        // Keep the original reward icon after completion (shipping / order discount / free gift).
        // Completion only changes the bubble + icon color to white; it never swaps to a checkmark.
        const iconHtml = renderMilestoneIcon(ss.icon);

        return `
          <div class="sc-dot-wrap ${cls} ${isLast ? "last" : ""}" style="left:${leftPct}%">
            <div class="sc-dot-bubble">${iconHtml}</div>
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
        goToCheckoutWithDiscount();
        return;
      }

      const after = String(settings?.afterAddToCart || "openCartWidget");
      if (after === "goToCheckout") {
        goToCheckoutWithDiscount();
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

        if (discountMsg) discountMsg.style.color = "#16a34a";
        setDiscountMessage(txt);
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
    setProgressLoading(true);
    return new Promise((resolve) => {
      refreshTimer = setTimeout(async () => {
        try {
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

    goToCheckoutWithDiscount();
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
          btn.classList.add("sc-open-loading");
          btn.setAttribute("aria-busy", "true");
          try {
            setProgressLoading(true);
            openDrawer();
            await refreshFromNetwork();
            renderAllFromCache();
          } finally {
            btn.classList.remove("sc-open-loading");
            btn.removeAttribute("aria-busy");
          }
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
