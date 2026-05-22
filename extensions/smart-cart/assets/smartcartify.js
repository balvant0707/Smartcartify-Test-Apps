(() => {
  /* =========================================================
   GLOBAL GUARD (avoid duplicate load / redeclare errors)
  ========================================================= */
  if (window.__SMARTCARTIFY_CARTDRAWER_V27__) return;
  window.__SMARTCARTIFY_CARTDRAWER_V27__ = true;

  /* =========================================================
   ✅ BLOCK THEME CART-DRAWER CUSTOM ELEMENT REGISTRATION
   Prevents theme's cart-drawer.js from throwing:
   "Cannot read properties of null (reading 'setAttribute')"
   Must run before any theme script registers cart-drawer.
  ========================================================= */
  if (!window.__SC_CE_PATCHED__ && typeof customElements !== "undefined") {
    window.__SC_CE_PATCHED__ = true;
    const _origDefine = customElements.define.bind(customElements);
    customElements.define = function (name, constructor, options) {
      const blocked = [
        "cart-drawer",
        "cart-drawer-items",
        "cart-notification",
        "cart-notification-drawer",
      ];
      if (blocked.includes(name)) {
        // Neutralize all prototype methods so direct `new CartDrawer()` calls don't crash
        if (constructor?.prototype) {
          Object.getOwnPropertyNames(constructor.prototype).forEach((key) => {
            try {
              if (key !== "constructor" && typeof constructor.prototype[key] === "function") {
                constructor.prototype[key] = function () {};
              }
            } catch (_) {}
          });
        }
        return;
      }
      return _origDefine(name, constructor, options);
    };
  }

  const root = document.getElementById("smart-embed-root");
  if (!root) return;

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
  const MANUAL_DISCOUNT_CODE_KEY = "__SC_MANUAL_DISCOUNT_CODE__";

  let __SC_PRIMED_POPUPS__ = false;
  // Disable the free product reward popup when a free milestone completes.
  const DISABLE_FREE_REWARD_POPUP = true;

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

  const getCartIconMarkup = () => {
    const iconUrl = trimToNull(PROXY?.styleSettings?.cartIconUrl);
    return iconUrl
      ? `<img class="sc-cart-icon-img" src="${safe(iconUrl)}" alt="" loading="lazy">`
      : DEFAULT_CART_ICON_SVG;
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

  const isQuantityTriggerRule = (rule) =>
    String(rule?.triggerType ?? rule?.trigger_type ?? "amount").trim().toLowerCase() ===
    "quantity";

  const getProgressBefore = (rule) => {
    const quantityKeys = [
      "quantityProgressTextBefore",
      "quantity_progress_text_before",
      "progressTextBeforeQuantity",
      "progress_text_before_quantity",
    ];
    const amountKeys = [
      "progressTextBefore",
      "progress_text_before",
      "progressBefore",
      "progress_before",
      "beforeProgressText",
      "before_progress_text",
      "beforeText",
      "before_text",
    ];
    return pickTextAny(rule, isQuantityTriggerRule(rule) ? [...quantityKeys, ...amountKeys] : amountKeys);
  };

  const getProgressAfter = (rule) => {
    const quantityKeys = [
      "quantityProgressTextAfter",
      "quantity_progress_text_after",
      "progressTextAfterQuantity",
      "progress_text_after_quantity",
    ];
    const amountKeys = [
      "progressTextAfter",
      "progress_text_after",
      "progressAfter",
      "progress_after",
      "afterProgressText",
      "after_progress_text",
      "afterText",
      "after_text",
    ];
    return pickTextAny(rule, isQuantityTriggerRule(rule) ? [...quantityKeys, ...amountKeys] : amountKeys);
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
    "BIF","CLP","GNF","ISK","JPY","KMF","KRW","MGA","PYG","RWF","UGX","VND","VUV",
    "XAF","XOF","XPF","HUF","TWD",
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
        rule?.minAmount ??
        rule?.min_amount;
    if (type === "free")
      raw =
        rule?.minPurchase ??
        rule?.min_purchase ??
        rule?.minAmount ??
        rule?.min_amount;
    if (type === "bxgy")
      raw =
        rule?.minPurchase ??
        rule?.min_purchase ??
        rule?.minAmount ??
        rule?.min_amount;

    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  const getGoalQuantity = (rule) => {
    const n = Number(rule?.minQuantity ?? rule?.min_quantity ?? rule?.quantityRequired);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const formatQuantityGoal = (value) => {
    const qty = Math.max(0, Math.ceil(Number(value) || 0));
    return `${qty} ${qty === 1 ? "item" : "items"}`;
  };

  const getRuleProgressMetric = (type, rule) => {
    if ((type === "discount" || type === "free") && isQuantityTriggerRule(rule)) {
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

  const replaceTokens = (text, map) => {
    let out = safe(text);
    if (!out) return "";
    Object.keys(map || {}).forEach((k) => {
      const val = map[k] == null ? "" : String(map[k]);
      const re = new RegExp(`{{\\s*${k}\\s*}}`, "gi");
      out = out.replace(re, val);
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

    const xQty = safe(rule?.xQty ?? rule?.x_qty ?? rule?.x ?? "");
    const yQty = safe(rule?.yQty ?? rule?.y_qty ?? rule?.y ?? "");

    const replaced = replaceTokens(text, {
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
    });
    const normalized =
      type === "discount" ? normalizeDiscountProgressText(replaced) : replaced;
    return stripCurrencySymbolIfCodePresent(normalized, CART?.currency);
  };

  const getProxyArray = (proxy, keys) => {
    for (const k of keys) {
      const v = proxy?.[k];
      if (Array.isArray(v)) return v;
    }
    return [];
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
      backgroundColor: pickBackground(raw, ["backgroundColor", "background"], "#f8fafc"),
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
        )}&limit=8&intent=related`,
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
    wrap.style.setProperty("--sc-upsell-bg", settings.backgroundColor || "#f8fafc");
    wrap.style.setProperty("--sc-upsell-text", settings.textColor || "#111827");
    wrap.style.setProperty("--sc-upsell-button-bg", settings.buttonColor || "#111111");
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
                    <button class="sc-upsell-btn" type="button" data-upsell-add="${addVariantId}" data-upsell-key="${safeKey}" ${available ? "" : "disabled hidden"} style="${available ? "" : "display:none"}">
                      <span class="sc-upsell-btn-icon">+</span>
                      <span class="sc-upsell-btn-text">${safe(settings.buttonText)}</span>
                    </button>
                    <button class="sc-upsell-btn sc-upsell-btn-oos" type="button" disabled ${
                      available ? "hidden" : ""
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
            } catch {}
            throw new Error(`Upsell add failed (${res.status}) ${errText}`.trim());
          }
          await refreshFromNetwork();
          schedulePostCartSync();
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
      }).catch(() => {});
    } catch {}
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
  const getBuyXGetYStatuses = () => {
    const items = Array.isArray(CART?.items) ? CART.items : [];
    const statuses = [];

    for (const r of BUYXGETY_RULES) {
      if (!isRuleEnabled(r)) continue;

      const scope = String(r?.scope || r?.scopeName || "store")
        .trim()
        .toLowerCase();
      const appliesTo = r?.appliesTo || r?.applyTo || {};
      const applyProducts = Array.isArray(appliesTo?.products)
        ? appliesTo.products
        : [];
      const applyCollections = Array.isArray(appliesTo?.collections)
        ? appliesTo.collections
        : [];

      let eligibleItems = items;

      if (scope === "product") {
        const allowed = new Set(
          applyProducts.map(gidToId).filter(Boolean).map(String)
        );
        eligibleItems = items.filter((it) =>
          allowed.has(String(it?.product_id || ""))
        );
      } else if (scope === "collection") {
        const allowedCols = new Set(
          applyCollections.map(gidToId).filter(Boolean).map(String)
        );
        eligibleItems = items.filter((it) => {
          const props = it?.properties || {};
          const col =
            props?._sc_collection_id ||
            props?._collection_id ||
            props?.collection_id;
          const id = gidToId(col) || (col ? String(col) : null);
          return id && allowedCols.has(String(id));
        });
      } else {
        eligibleItems = items;
      }

      const eligibleQty = eligibleItems.reduce(
        (sum, it) => sum + (Number(it?.quantity) || 0),
        0
      );
      const eligibleSubtotalRupees =
        (eligibleItems.reduce(
          (sum, it) => sum + (Number(it?.final_line_price) || 0),
          0
        ) /
          100) ||
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

      const beforeRaw =
        r?.beforeOfferUnlockMessage ??
        r?.beforeMessage ??
        r?.before_message ??
        "";
      const afterRaw =
        r?.afterOfferUnlockMessage ?? r?.afterMessage ?? r?.after_message ?? "";

      const remainingX = Math.max(
        0,
        (Number.isFinite(xQty) ? xQty : 0) - (eligibleQty || 0)
      );

      const beforeMsg = replaceTokens(beforeRaw, {
        x: remainingX,
        y: Number.isFinite(yQty) ? yQty : "",
      });

      const afterMsg = replaceTokens(afterRaw, {
        x: Number.isFinite(xQty) ? xQty : "",
        y: Number.isFinite(yQty) ? yQty : "",
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

      const beforeRaw =
        r?.beforeOfferUnlockMessage ??
        r?.beforeMessage ??
        r?.before_message ??
        "";
      const afterRaw =
        r?.afterOfferUnlockMessage ?? r?.afterMessage ?? r?.after_message ?? "";

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
      setTimeout(() => { try { backdrop.remove(); } catch (_) {} }, 220);
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
      showCartActionMessage(msg, isQuantityLimitMessage(msg) ? "warn" : "error");
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
      } catch {}
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

  const setAnnouncementMessages = (arr) => {
    ANNOUNCE_MESSAGES = (arr || [])
      .map((x) => stripCurrencySymbolIfCodePresent(trimToNull(x), CART?.currency))
      .map((x) => trimToNull(x))
      .filter(Boolean);

    const bar = drawer.querySelector("[data-sc-announce]");
    if (!bar) return;

    if (!ANNOUNCE_MESSAGES.length) {
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

  const isDiscountAppliedInCart = (code) => {
    const c = trimToNull(code);
    if (!c) return false;

    const attrs = CART?.attributes || {};
    const inAttr =
      Object.values(attrs).some(
        (v) => String(v || "").toLowerCase() === c.toLowerCase()
      ) ||
      String(attrs?.discount_code || "").toLowerCase() === c.toLowerCase() ||
      String(attrs?.discountCode || "").toLowerCase() === c.toLowerCase();

    const cartCodes = Array.isArray(CART?.discount_codes) ? CART.discount_codes : [];
    const inCartCodes = cartCodes.some(
      (d) => String(d?.code || d || "").toLowerCase() === c.toLowerCase()
    );

    return inAttr || inCartCodes;
  };

  const getAppliedDiscountCodes = () => {
    const out = [];
    const attrs = CART?.attributes || {};
    const attrCode = trimToNull(attrs?.discount_code || attrs?.discountCode || "");
    if (attrCode) out.push(attrCode);
    const cartCodes = Array.isArray(CART?.discount_codes) ? CART.discount_codes : [];
    cartCodes.forEach((d) => {
      const code = trimToNull(d?.code || d);
      if (code) out.push(code);
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

    const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const wrapEmLabel = (v) => {
      const t = trimToNull(v);
      if (!t) return "";
      return `${ANNOUNCE_EM_LABEL_START}${t}${ANNOUNCE_EM_END}`;
    };

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

    const emphasizeLabels = (text) => {
      let out = String(text ?? "");
      const labels = [
        "Discount Code",
        "Discount Value",
        "Buy X Get Y Discount",
        "Buy X Get Y",
      ];
      labels.forEach((label) => {
        const re = new RegExp(escapeRegExp(label), "gi");
        out = out.replace(re, wrapEmLabel(label));
      });
      return out;
    };

    const emphasizeValues = (text, values = [], wrap) => {
      let out = String(text ?? "");
      values.forEach((v) => {
        const t = trimToNull(v);
        if (!t) return;
        const re = new RegExp(escapeRegExp(t), "gi");
        out = out.replace(re, (match) => {
          const wrapped = wrap ? wrap(match) : match;
          return ` ${wrapped} `;
        });
      });
      out = out.replace(/\s{2,}/g, " ").trim();
      return out;
    };

    const padToken = (text, token) => {
      const t = trimToNull(token);
      if (!t) return text;
      const re = new RegExp(escapeRegExp(t), "gi");
      let out = String(text ?? "");
      out = out.replace(re, (match) => ` ${match} `);
      return out.replace(/\s{2,}/g, " ").trim();
    };

    const normalizeOffText = (text) => {
      let out = String(text ?? "");
      out = out.replace(/\boff\s*off\b/gi, (m) => m.slice(0, 3));
      out = out.replace(/\boffoff\b/gi, (m) => m.slice(0, 3));
      return out;
    };

    const replaceTokensRaw = (text, map) => {
      let out = String(text ?? "");
      if (!out) return "";
      Object.keys(map || {}).forEach((k) => {
        const val = map[k] == null ? "" : String(map[k]);
        const re = new RegExp(`{{\\s*${k}\\s*}}`, "gi");
        out = out.replace(re, val);
      });
      return out;
    };

    const replaceProgressTextRaw = ({
      text,
      type,
      rule,
      subtotalRupees,
      useRemainingForGoal,
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

      const xQty = String(rule?.xQty ?? rule?.x_qty ?? rule?.x ?? "");
      const yQty = String(rule?.yQty ?? rule?.y_qty ?? rule?.y ?? "");

      const replaced = replaceTokensRaw(text, {
        goal: goalToken,
        discount: discountTokens.value,
        discount_value: discountTokens.value,
        discount_value_with_off: discountTokens.valueWithOff,
        discount_code: discountCode,
        x: xQty,
        y: yQty,
      });
      return type === "discount" ? normalizeDiscountProgressText(replaced) : replaced;
    };

    // (A) Code discount rules (before/after announcement text comes from the
    // preview-above fields, not the progress-below label).
    const appliedCodes = getAppliedDiscountCodes();

    const codeRules = Array.isArray(CODE_DISCOUNT_RULES) ? CODE_DISCOUNT_RULES : [];
    codeRules.forEach((r) => {
      if (!isRuleEnabled(r)) return;
      const ruleCodeRaw = String(
        r?.discountCode ?? r?.discount_code ?? r?.code ?? ""
      ).trim();
      if (!ruleCodeRaw) return;
      const ruleCode = ruleCodeRaw.toLowerCase();
      const ruleApplied = appliedCodes.some(
        (c) => String(c).trim().toLowerCase() === ruleCode
      );

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
        "Use code {{discount_code}} to get {{discount_value_with_off}}";
      const fallbackAfter =
        "Discount Code {{discount_code}} applied • Discount {{discount_value_with_off}}";

      const useAfter = hasMin ? complete : ruleApplied;
      const msgBaseRaw = replaceProgressTextRaw({
        text: useAfter ? rawAfter || fallbackAfter : rawBefore || fallbackBefore,
        type: "discount",
        rule: r,
        subtotalRupees,
        useRemainingForGoal: false,
      });
      let msgBase = normalizeOffText(msgBaseRaw);

      const discountValRaw = String(
        r?.value ?? r?.discountValue ?? r?.discount_value ?? ""
      ).trim();
      const discountValWithOff =
        discountValRaw && /off\b/i.test(discountValRaw)
          ? discountValRaw
          : discountValRaw
          ? `${discountValRaw} OFF`
          : "";
      const discountValueForEm = discountValWithOff || discountValRaw;
      const discountCode = ruleCodeRaw;

      const hasCodeInMsg =
        !!discountCode &&
        new RegExp(escapeRegExp(discountCode), "i").test(msgBase);
      if (discountCode && !hasCodeInMsg) {
        msgBase = `${msgBase} Discount Code ${discountCode}`;
      }
      msgBase = msgBase.replace(/\s{2,}/g, " ").trim();

      let msg = emphasizeValues(
        msgBase,
        [discountCode],
        (v) => wrapEmCode(v)
      );
      msg = emphasizeValues(msg, [discountValueForEm], (v) => wrapEmValue(v));
      msg = padToken(msg, discountCode);
      msg = padToken(msg, discountValueForEm);
      msg = emphasizeLabels(msg);
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

      const beforeRaw =
        r?.beforeOfferUnlockMessage ??
        r?.beforeMessage ??
        r?.before_message ??
        "";
      const afterRaw =
        r?.afterOfferUnlockMessage ?? r?.afterMessage ?? r?.after_message ?? "";
      const fallbackBefore = "Buy X Get Y Discount: Buy {{x}} get {{y}}";
      const fallbackAfter = "Buy X Get Y Discount: Buy {{x}} get {{y}}";

      const beforeMsg = replaceTokensRaw(beforeRaw || fallbackBefore, {
        x: hasX ? remainingX : Number.isFinite(xQty) ? xQty : "",
        y: Number.isFinite(yQty) ? yQty : "",
        goal: "",
      });
      const afterMsg = replaceTokensRaw(afterRaw || fallbackAfter, {
        x: Number.isFinite(xQty) ? xQty : "",
        y: Number.isFinite(yQty) ? yQty : "",
        goal: "",
      });

      const msgBase = replaceProgressTextRaw({
        text: bx.complete ? (afterMsg || fallbackAfter) : (beforeMsg || fallbackBefore),
        type: "bxgy",
        rule: r,
        subtotalRupees,
        useRemainingForGoal: false,
      });

      const values = [xQty, yQty];
      let msg = emphasizeValues(msgBase, values, (v) => wrapEmValue(v));
      values.forEach((v) => {
        msg = padToken(msg, v);
      });
      msg = emphasizeLabels(msg);
      if (trimToNull(msg)) msgs.push(msg);
    }

    // (C) BuyXGetY (bxgyrule)
    const buyStatuses = getBuyXGetYStatuses();
    // (C) BuyXGetY (bxgyrule) — show before-message while pending, after-message once complete
    buyStatuses.forEach((st) => {
      const r = st?.rule;
      if (!r) return;
      const xQty = Number(st?.xQty ?? r?.xQty ?? r?.x_qty ?? r?.x);
      const yQty = Number(st?.yQty ?? r?.yQty ?? r?.y_qty ?? r?.y);
      const eligibleQty = Number(st?.eligibleQty ?? 0);
      const remainingX = Math.max(0, (Number.isFinite(xQty) ? xQty : 0) - eligibleQty);

      const beforeRaw =
        r?.beforeOfferUnlockMessage ??
        r?.beforeMessage ??
        r?.before_message ??
        "";
      const afterRaw =
        r?.afterOfferUnlockMessage ?? r?.afterMessage ?? r?.after_message ?? "";
      const fallbackBefore = "Buy X Get Y: Add {{x}} more to unlock the offer";
      const fallbackAfter = "Buy X Get Y Discount: Buy {{x}} get {{y}}";

      const beforeMsg = replaceTokensRaw(beforeRaw || fallbackBefore, {
        x: Number.isFinite(xQty) ? remainingX : "",
        y: Number.isFinite(yQty) ? yQty : "",
        goal: "",
      });
      const afterMsg = replaceTokensRaw(afterRaw || fallbackAfter, {
        x: Number.isFinite(xQty) ? xQty : "",
        y: Number.isFinite(yQty) ? yQty : "",
        goal: "",
      });

      const msgBase = replaceProgressTextRaw({
        text: st.complete ? (afterMsg || fallbackAfter) : (beforeMsg || fallbackBefore),
        type: "bxgy",
        rule: r,
        subtotalRupees,
        useRemainingForGoal: false,
      });

      const values = [xQty, yQty];
      let msg = emphasizeValues(msgBase, values, (v) => wrapEmValue(v));
      values.forEach((v) => {
        msg = padToken(msg, v);
      });
      msg = emphasizeLabels(msg);
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
        const fallback = code
          ? `Discount Code ${code}${valWithOff ? ` • ${valWithOff}` : ""}`
          : "Discount Code available";
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
          const fallback = x && y ? `Buy X Get Y Discount: Buy ${x} get ${y}` : "Buy X Get Y Discount";
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

  const findAppliedDiscountCodeRule = () => {
    const manualCode = trimToNull(scStore.get(MANUAL_DISCOUNT_CODE_KEY));
    if (!manualCode) return null;
    const manualLower = manualCode.toLowerCase();
    const list = Array.isArray(CODE_DISCOUNT_RULES) ? CODE_DISCOUNT_RULES : [];
    for (const rule of list) {
      if (!isRuleEnabled(rule)) continue;
      const code = getDiscountRuleCode(rule);
      if (!code) continue;
      if (String(code).trim().toLowerCase() !== manualLower) continue;
      if (isDiscountAppliedInCart(code)) return { rule, code };
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
  max-width:445px;
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
  font-size:var(--sc-heading-font-size);
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
.sc-progress{
  background: var(--sc-progress-bg);
  color: var(--sc-progress-text);
  padding:5px 0 14px;
  position:relative;
}
.sc-label{
  font-size:var(--sc-base-font-size) !important;
  font-weight:600;margin:0 0 12px;
  text-align:center;
  min-height:22px;
  padding:0 12px;
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

.sc-milestone{width:var(--sc-milestone-width);margin:0 auto}
.sc-track{position:relative;height:calc(var(--sc-dot) + 28px);}
.sc-track::before{
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: calc(var(--sc-dot) / 2);
    height: var(--sc-track-h);
    transform: translateY(-50%);
    background: var(--sc-progress);
    border-radius: 999px;
    opacity: .5;
}
.sc-fill{
  position:absolute;left:0;
  top:calc(var(--sc-dot) / 2);
  height:var(--sc-track-h);
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
  top:calc(var(--sc-dot) / 2);
  transform:translateX(-50%);
  display:flex;
  flex-direction:column;
  align-items:center;
  min-width:44px;
}
.sc-dot-wrap.last{transform:translateX(-70%);}
.sc-dot-html svg{
    height:16px !important;
    width:18px !important;
}
.sc-dot-bubble{
  width:30px;
  height:30px;
  border-radius:999px;
  background:#ffffff;
  color:#111827;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:var(--sc-base-font-size);
  border: 1px solid var(--sc-progress);
  transform:translateY(-50%);
}
.sc-dot-bubble .sc-dot-svg{
  display:flex;
  align-items:center;
  justify-content:center;
  line-height:0;
}
.sc-dot-bubble .sc-dot-svg svg{
  width:18px;
  height:18px;
  display:block;
  fill: var(--sc-progress);
}
 .sc-upsell-arrow svg g {
    fill: var(--sc-icon-color) !important;
}
.sc-dot-bubble .sc-dot-html svg{
  width:18px;
  height:18px;
  display:block;
  fill: var(--sc-progress);
}
.sc-dot-bubble .sc-dot-html{
  display:flex;
  align-items:center;
  justify-content:center;
  line-height:0;
}
.sc-dot-bubble .sc-dot-html i{
  font-size:16px;
  line-height:1;
  display:block;
}
.sc-dot-bubble .sc-dot-emoji{
  line-height:1;
}
.sc-dot-wrap.done .sc-dot-bubble{background:var(--sc-progress);color:#111827}
.sc-dot-wrap.done .sc-dot-bubble svg{
  fill:#ffffff;
}
.sc-dot-wrap.active .sc-dot-bubble{background:#fff;color:#111827}

.sc-dot-text{
  font-size:var(--sc-small-font-size);
  color:var(--sc-progress-text);
  text-align:center;
  line-height:1.2;
  max-width:80px;
  overflow:hidden;
  display:-webkit-box;
  -webkit-line-clamp:2;
  -webkit-box-orient:vertical;
  word-break:break-word;
  white-space:normal;
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
  border:1px solid var(--sc-border);
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
.sc-drawer.sc-empty-state .sc-announce,
.sc-drawer.sc-empty-state .sc-progress,
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
  grid-template-columns:88px minmax(0, 1fr);
  align-items:flex-start;
  gap:10px;
  padding:5px;
  border:1px solid var(--sc-item-border);
  border-radius:14px;
}
.sc-item:last-child{
  border-bottom:1px solid var(--sc-item-border);
}
.sc-img{
  width:88px;
  height:88px;
  overflow:hidden;
  background:var(--sc-image-bg);
  border-radius:10px;
  flex:0 0 auto;
}
.sc-img img{width:100%;height:100%;object-fit:cover;object-position:top;display:block;}
.sc-mid{
  min-width:0;
  display:flex;
  flex-direction:column;
  gap:8px;
  padding-right:34px;
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
.sc-qty{
  display:inline-flex;
  align-items:center;
  gap:8px;
  overflow:visible;
  background:transparent;
}
.sc-qty button{
  width:34px;
  height:34px;
  border:1px solid var(--sc-qty-btn-border);
  border-radius:8px;
  background:var(--sc-qty-btn-bg);
  cursor:pointer;
  font-size:20px;
  font-weight:500;
  line-height:1;
  color:var(--sc-qty-btn-text);
}
.sc-qty button:hover{filter:brightness(0.96);}
.sc-qty button:active{transform:scale(0.98);}
.sc-qty input{
  width:26px;
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
  font-size:clamp(20px, calc(var(--sc-base-font-size) * 1.85), 36px);
  font-weight:700;
  line-height:1.1;
  color:var(--sc-drawer-text-color);
}
.sc-price.sc-price-free{
  color:var(--sc-drawer-text-color);}
.sc-free-tag{
  display:inline-block;
  margin-left:6px;
  font-size:var(--sc-free-tag-font-size);
  color:#000000;
}
.sc-free-tag-under{
  margin-left:0;
  margin-top:4px;
}

.sc-upsell{
  padding: 0px 12px;
  order:2;
}
.sc-upsell-card{
  padding: 6px 4px;
}
.sc-upsell-title{
  font-size: 16px;
  font-weight: 700;
  text-align: center;
  margin: 4px 0 8px;
  letter-spacing: 0.2px;
  color: var(--sc-upsell-text, var(--sc-drawer-text-color));
}
.sc-upsell-inner{
  background: var(--sc-upsell-bg, #ffffff);
  padding: 10px;
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
  width: 64px;
  height: 64px;
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
  background: var(--sc-upsell-button-bg, #111111);
  border: 1px solid var(--sc-border, #e2e8f0);
  color: var(--sc-upsell-text, #ffffff);
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
}
.sc-remove-x:hover{opacity:.85}

/* Footer */
.sc-footer{
  padding:8px 12px 5px;
  display:flex;
  flex-direction:column;
  gap:10px;
  backdrop-filter:blur(6px);
  color:var(--sc-drawer-text-color);
  background: var(--sc-footer-bg);
  position:sticky;
  bottom:0;
  z-index:8;
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
.sc-refreshing .sc-discount,
.sc-loading-items .sc-discount{display:none !important;}
.sc-discount input{
  flex:1;height:44px;
  border: 1px solid #000000;
  background:transparent;
  padding:0 14px;font-size:var(--sc-base-font-size);
  color:#000000;
  box-shadow: unset !important;
    outline: unset !important;
    outline-offset: unset !important
}
.sc-discount input::placeholder{color:#000000;}

.sc-discount button{
  min-width:110px;
  height:44px;
  border:1px solid var(--sc-apply-border);
  background: var(--sc-checkout-bg);
  color: var(--sc-checkout-text);
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
.sc-foot-row{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:8px;
}

.sc-foot-name{
  margin:0;
  font-size:var(--sc-base-font-size);
  font-weight:700;
  color:var(--sc-drawer-text-color);
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.sc-foot-tag{
  font-size:var(--sc-small-font-size);
  border-radius:999px;
  color:var(--sc-drawer-text-color);;
  white-space:nowrap;
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
    grid-template-columns:72px minmax(0, 1fr);
    gap:12px;
  }
  .sc-img{
    width:72px;
    height:72px;
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
  position:relative;min-height:56px;
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
  width:min(360px, 92%);
  background:var(--sc-freegift-bg);
  border-radius:18px;
  padding:24px;
  border:1px solid var(--sc-freegift-border);
  box-shadow:var(--sc-freegift-shadow);
  position:relative;
  font-size:var(--sc-base-font-size);
  color:var(--sc-freegift-text);
  text-align:left;
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
  align-items:flex-start;
  gap:12px;
  margin-bottom:18px;
}
.sc-freegift-icon{
  width:40px;
  height:40px;
  border-radius:12px;
  background:rgba(87,192,17,.14);
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:20px;
}
.sc-freegift-title-text{
  margin:0;
  font-weight:700;
  font-size:var(--sc-heading-font-size);
}
.sc-freegift-subtext{
  margin:4px 0 0;
  font-size:var(--sc-small-font-size);
  color:var(--sc-freegift-subtext);
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
  margin-bottom:20px;
}
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
.sc-freegift-add{
  width:100%;
  border:none;
  border-radius:12px;
  padding:12px;
  background:var(--sc-freegift-btn-bg);
  color:var(--sc-freegift-btn-text);
  font-weight:700;
  font-size:var(--sc-base-font-size);
  cursor:pointer;
  transition:transform .2s ease, opacity .2s ease;
}
.sc-freegift-add:disabled{
  opacity:.6;
  cursor:not-allowed;
}
.icon.icon-cart.cart-lift {
    height: 2.4rem !important;
    width: 2.4rem !important;
    fill: none;
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

    <div class="sc-footer">
      <div class="sc-footer-milestones" data-footer-milestones hidden></div>
      <div class="sc-footer-row">
        <button class="sc-checkout" data-checkout type="button">
          <span class="sc-checkout-label">Checkout</span>
        </button>
      </div>
    </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(drawer);
  document.body.appendChild(addToCartBar);

  function openDrawer() {
    if (drawer.classList.contains("open")) return;
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

  overlay.addEventListener("click", closeDrawer);
  $("[data-close]")?.addEventListener("click", closeDrawer);
  drawer.addEventListener("click", (e) => {
    const el = e.target;
    if (!(el instanceof Element)) return;
    if (el.closest("[data-close]")) closeDrawer();
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
      baseBg:"#ffffff",
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
      ["cartDrawerBackground", "cartDrawerBg", "drawerTopBg", "topBg", "baseBg", "bg"],
      defaults.baseBg
    );

    let topTextColor = pickColor(
      style,
      ["cartDrawerTextColor", "topText", "top_text", "topTextColor", "textTop"],
      defaults.topText
    );

    let headerColor = pickColor(
      style,
      ["cartDrawerHeaderColor", "headerText", "header_text", "headerColor", "titleColor"],
      defaults.headerText
    );

    const drawerTextColor = pickColor(
      style,
      ["drawerTextColor", "cartDrawerBodyTextColor", "bodyTextColor", "text", "textColor"],
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

    const progressBg = pickBackground(style, ["progressBg", "progressBackground", "bg"], baseBg);

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

    const footerBg = pickBackground(
      style,
      ["footerBg", "cartDrawerFooterBg", "drawerFooterBg"],
      defaults.footerBg
    );

    const applyBtnBg = pickColor(style, ["applyBtnBg", "discountApplyBg", "applyButtonBg"], defaults.applyBtnBg);
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

      r.setProperty("--sc-drawer-bg", baseBg || (imgUrl ? imgUrl : "transparent"));
    } else if (mode === "gradient") {
      const gradientBg = /gradient\(/i.test(String(baseBg))
        ? String(baseBg)
        : `linear-gradient(180deg, ${String(baseBg)} 0%, ${String(baseBg)} 100%)`;

      r.setProperty("--sc-top-bg-color", "transparent");
      r.setProperty("--sc-top-bg-image", gradientBg);
      r.setProperty("--sc-top-bg-color-effective", "transparent");
      r.setProperty("--sc-top-bg-image-effective", "var(--sc-top-bg-image)");

      r.setProperty("--sc-drawer-bg", gradientBg);
    } else {
      const solidBg =
        pickColor(style, ["cartDrawerBackground", "cartDrawerBg", "drawerTopBg", "topBg", "baseBg", "bg"], null) ||
        getFirstColorFromBackground(baseBg) ||
        "#111827";

      r.setProperty("--sc-top-bg-color", String(solidBg));
      r.setProperty("--sc-top-bg-image", "none");
      r.setProperty("--sc-top-bg-color-effective", "var(--sc-top-bg-color)");
      r.setProperty("--sc-top-bg-image-effective", "none");

      r.setProperty("--sc-drawer-bg", String(solidBg));
    }

    DISCOUNT_PANEL_STYLE_ENABLED =
      to01(pick(style, ["discountCodeApply"], defaults.discountCodeApply)) === 1;
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

  const getCartSubtotalCents = () => {
    const raw = Number(CART?.items_subtotal_price);
    if (Number.isFinite(raw)) return Math.max(0, raw);
    const items = Array.isArray(CART?.items) ? CART.items : [];
    return items.reduce(
      (sum, it) => sum + Math.max(0, Number(it?.final_line_price) || 0),
      0
    );
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
      } catch {}
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
    } catch {}
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
    if (!appliedRules.length) return;
    const subtotalCents = getCartSubtotalCents();
    const cartQty = getCartTotalQty();

    for (const { rule, code } of appliedRules) {
      const triggerType = String(rule?.triggerType ?? rule?.trigger_type ?? "amount").toLowerCase();
      const minQuantity = Number(rule?.minQuantity ?? rule?.min_quantity);
      const minQuantityFail =
        triggerType === "quantity" &&
        Number.isFinite(minQuantity) &&
        minQuantity > 0 &&
        cartQty < minQuantity;
      const minPurchase = Number(rule?.minPurchase ?? rule?.min_purchase);
      const minCents =
        triggerType !== "quantity" && Number.isFinite(minPurchase) && minPurchase > 0
          ? Math.round(minPurchase * 100)
          : null;
      const meta = getDiscountRuleMeta(rule, subtotalCents);
      const discountCents = meta ? meta.capped : null;
      const minPurchaseFail = minCents != null && subtotalCents < minCents;
      const discountAmountFail =
        meta && !meta.isPercent && Number.isFinite(meta.cents) && meta.cents > subtotalCents;
      if (!minQuantityFail && !minPurchaseFail && !discountAmountFail) continue;

      if (
        LAST_AUTO_REMOVED_CODE &&
        String(LAST_AUTO_REMOVED_CODE).toLowerCase() === String(code).toLowerCase() &&
        Date.now() - LAST_AUTO_REMOVED_AT < 5000
      ) {
        return;
      }

      const requiredCents = minPurchaseFail
        ? minCents
        : discountAmountFail
        ? meta?.cents ?? null
        : null;
      // Auto-removal should not show a transient warning on open.

      DISCOUNT_REMOVE_IN_FLIGHT = true;
      try {
        await clearDiscountCode(code);
        await refreshFromNetwork();
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

  const applyDiscountCode = async () => {
    if (!discountInput || !drawerDiscountPanel || drawerDiscountPanel.hidden) return;
    const code = trimToNull(discountInput.value);
    if (!code) return;

    setDiscountMessage("");

    const rule = findCodeDiscountRuleByCode(code);
    const triggerType = String(rule?.triggerType ?? rule?.trigger_type ?? "amount").toLowerCase();
    if (triggerType === "quantity") {
      const minQuantity = Number(rule?.minQuantity ?? rule?.min_quantity);
      if (Number.isFinite(minQuantity) && minQuantity > 0) {
        const cartQty = getCartTotalQty();
        if (cartQty < minQuantity) {
          setDiscountMessage(`No. Minimum quantity is ${minQuantity}. Add ${Math.max(0, minQuantity - cartQty)} more item(s).`);
          return;
        }
      }
    }
    const minPurchase = Number(rule?.minPurchase ?? rule?.min_purchase);
    if (triggerType !== "quantity" && Number.isFinite(minPurchase) && minPurchase > 0) {
      const subtotalCents = getCartSubtotalCents();
      const subtotalRupees = subtotalCents / priceDivisor();
      if (subtotalRupees < minPurchase) {
        const minCents = Math.round(minPurchase * priceDivisor());
        const remainingCents = Math.max(0, Math.round((minPurchase - subtotalRupees) * priceDivisor()));
        const minText = formatMoney(minCents, normalizeCurrencyCode());
        const remainingText = formatMoney(remainingCents, normalizeCurrencyCode());
        setDiscountMessage(`No. Minimum purchase is ${minText}. Add ${remainingText} more.`);
        return;
      }
    }

    const target = `/discount/${encodeURIComponent(code)}?redirect=${encodeURIComponent("/cart")}`;
    if (discountButton) discountButton.disabled = true;
    setProgressLoading(true);
    try {
      await fetch(target, { credentials: "same-origin", redirect: "follow" });
      scStore.set(MANUAL_DISCOUNT_CODE_KEY, code);
      scStore.set("__SC_LAST_APPLIED_CODE__", code);
      await refreshFromNetwork();
      renderAllFromCache();
    } catch (err) {
      console.error("[SmartCartify] discount apply failed:", err);
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

  if (discountButton) discountButton.addEventListener("click", applyDiscountCode);
  if (discountInput) {
    discountInput.addEventListener("input", () => {
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

    const assignedRuleKeys = new Set();
    const getRuleKey = (type, rule) =>
      `${type}:${rule?.id ?? rule?.shopifyRateId ?? rule?.campaignName ?? JSON.stringify(rule)}`;

    const pushRule = (type, rule) => {
      if (!rule) return;
      if (!isRuleEnabled(rule)) return;
      const ruleKey = getRuleKey(type, rule);
      if (assignedRuleKeys.has(ruleKey)) return;

      // Only show rules that have an explicit cartStepName / step slot configured.
      // Rules without a step assignment should not appear in the progress bar.
      // Code discount and BXGY rules are included when they have a cartStepName set.
      const slot = normalizeStepSlotFromAny(rule) || null;
      if (!slot) return;

      const belowRaw = trimToNull(getProgressBelow(rule));

      const title = (() => {
        const campaign = trimToNull(rule?.campaignName);
        if (campaign) return campaign;
        if (belowRaw) return belowRaw;
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
        return "Reward";
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
        (type === "shipping" ? "shipping" : type === "discount" ? "discount" : "free");
      const icon = ICONS[String(iconKey)] || ICONS.sparkles;

      const beforeRaw = trimToNull(getProgressBefore(rule)) || "";
      const afterRaw = trimToNull(getProgressAfter(rule)) || "";

      assignment[slot] = {
        slot,
        type,
        rule,
        progressMetric: progressMetric.metric,
        unlockCents,
        unlockQuantity,
        icon,
        title,

        progressTextBelow: replaceProgressText({
          text: belowRaw || title,
          type,
          rule,
          subtotalRupees,
          useRemainingForGoal: false,
        }),

        progressTextBefore: replaceProgressText({
          text: beforeRaw,
          type,
          rule,
          subtotalRupees,
          useRemainingForGoal: true,
        }),

        progressTextAfter: replaceProgressText({
          text: afterRaw,
          type,
          rule,
          subtotalRupees,
          useRemainingForGoal: false,
        }),
      };
      assignedRuleKeys.add(ruleKey);
    };

    (Array.isArray(shippingList) ? shippingList : []).forEach((r) => pushRule("shipping", r));
    (Array.isArray(discountList) ? discountList : []).forEach((r) => pushRule("discount", r));
    (Array.isArray(freeList) ? freeList : []).forEach((r) => pushRule("free", r));

    const steps = STEP_SLOTS.map((s) => assignment[s]).filter(Boolean);

    return steps;
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
    const fromRule = parseDiscountRuleCents(rule, subtotalCents);
    if (Number.isFinite(fromRule) && fromRule > 0) return fromRule;

    const code = trimToNull(rule?.discountCode ?? rule?.discount_code ?? rule?.code ?? "");
    const list = Array.isArray(CART?.discount_codes) ? CART.discount_codes : [];
    const hit = list.find(
      (d) =>
        String(d?.code || d || "")
          .trim()
          .toLowerCase() === String(code || "").toLowerCase()
    );
    const n = Number(hit?.amount);
    if (Number.isFinite(n) && n > 0) {
      return Math.min(Math.round(n * 100), Math.max(0, Number(subtotalCents) || 0));
    }
    return null;
  };

  const renderFooterMilestones = ({ steps, subtotalCents, currency }) => {
    const host = drawer.querySelector("[data-footer-milestones]");
    if (!host) return;

    const rows = [];

    // Completed automatic (non-code) discount steps → badge rows
    const completedAutoDiscountSteps = (Array.isArray(steps) ? steps : []).filter((step) => {
      if (String(step?.type || "").toLowerCase() !== "discount") return false;
      if (!isProgressStepDone(step, subtotalCents)) return false;
      const ruleType = String(step?.rule?.type ?? step?.rule?.ruleType ?? "").trim().toLowerCase();
      return ruleType !== "code";
    });

    const autoDiscountCents = completedAutoDiscountSteps.reduce((sum, step) => {
      const discountCents = parseDiscountRuleCents(step?.rule, subtotalCents);
      return Number.isFinite(discountCents) && discountCents > 0 ? sum + discountCents : sum;
    }, 0);

    completedAutoDiscountSteps.forEach((step) => {
      const discountCents = parseDiscountRuleCents(step?.rule, subtotalCents);
      rows.push({
        key: `auto:${step?.rule?.id ?? step?.title ?? step?.slot}`,
        label: "Discounts",
        tag: trimToNull(step?.title) || "Discount Applied",
        amount: Number.isFinite(discountCents) && discountCents > 0
          ? `- ${formatMoney(discountCents, currency)}`
          : "Applied",
      });
    });

    const manualCode = trimToNull(scStore.get(MANUAL_DISCOUNT_CODE_KEY));
    const manualLower = manualCode ? manualCode.toLowerCase() : null;
    const hasManualAppliedCode =
      !!manualLower &&
      getAppliedDiscountCodes().some(
        (c) => String(c).trim().toLowerCase() === manualLower
      );

    const appliedCode = findAppliedDiscountCodeRule();
    if (appliedCode?.rule) {
      const minPurchase = Number(
        appliedCode.rule?.minPurchase ?? appliedCode.rule?.min_purchase
      );
      const minCents =
        Number.isFinite(minPurchase) && minPurchase > 0
          ? Math.round(minPurchase * 100)
          : null;
      const meta = getDiscountRuleMeta(appliedCode.rule, subtotalCents);
      const minPurchaseFail = minCents != null && subtotalCents < minCents;
      const discountAmountFail =
        meta && !meta.isPercent && Number.isFinite(meta.cents) && meta.cents > subtotalCents;
      if (!minPurchaseFail && !discountAmountFail) {
        const codeDiscountCents = resolveCodeDiscountCents(appliedCode.rule, subtotalCents);
        rows.push({
          key: `code:${getRuleKey(appliedCode.rule, "code")}`,
          label: "Discounts",
          tag: getDiscountTagLabel(appliedCode.rule, "code"),
          amount:
            Number.isFinite(codeDiscountCents) && codeDiscountCents > 0
              ? `- ${formatMoney(codeDiscountCents, currency)}`
              : "Applied",
        });
      }
    }

    const uniqueRows = [];
    const seen = new Set();
    rows.forEach((row) => {
      const key = trimToNull(row?.key);
      const tag = trimToNull(row?.tag);
      if (!key || !tag || seen.has(key)) return;
      seen.add(key);
      uniqueRows.push({ ...row, tag });
    });

    // Use CART.total_discount (actual Shopify-applied amount) when available,
    // fall back to estimated autoDiscountCents from completed steps
    const cartTotalDiscount = Math.max(0, Number(CART?.total_discount || 0));
    const totalDiscountCents = cartTotalDiscount > 0 ? cartTotalDiscount : autoDiscountCents;

    if (!uniqueRows.length && totalDiscountCents <= 0) {
      host.hidden = true;
      host.innerHTML = "";
      return;
    }

    const rowsHtml = uniqueRows
      .map(
        (row) => `
          <div class="sc-foot-row">
            <p class="sc-foot-name">${safe(row.label || "")}</p>
            <span class="sc-foot-tag">${safe(row.tag || "UNLOCKED")}</span>
            <span class="sc-foot-amt">${safe(row.amount || "Unlocked")}</span>
          </div>
        `
      )
      .join("");

    const totalHtml =
      totalDiscountCents > 0
        ? `
          <div class="sc-foot-total">
            <strong>Total discount</strong>
            <strong>- ${safe(formatMoney(totalDiscountCents, currency))}</strong>
          </div>
        `
        : "";

    host.hidden = false;
    host.innerHTML = `${rowsHtml}${totalHtml}`;
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

    const totalDiscountCentsRaw = Math.max(0, Number(CART?.total_discount || 0));
    const totalDiscountCents =
      appliedCodes.length === 0
        ? totalDiscountCentsRaw
        : hasManualAppliedCode
        ? totalDiscountCentsRaw
        : 0;
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
    const announceEl = drawer.querySelector("[data-sc-announce]");
    const progressEl = drawer.querySelector(".sc-progress");
    const itemsFooter = drawer.querySelector(".sc-items-footer");
    const footerEl = drawer.querySelector(".sc-footer");
    const isEmpty = !items.length;
    updateDiscountPanelVisibility({ isEmpty });
    if (checkoutButton) checkoutButton.hidden = isEmpty;
    if (announceEl) announceEl.hidden = isEmpty;
    if (progressEl) progressEl.hidden = isEmpty;
    if (itemsFooter) itemsFooter.hidden = isEmpty;
    if (footerEl) footerEl.hidden = isEmpty;
    drawer.classList.toggle("sc-empty-state", isEmpty);

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
        const hasCompare = compareUnit > 0 && compareUnit > unitPrice && !isReward;

        const showPrice = !isReward;
        const displayPrice = Math.max(
          0,
          Number(it.final_line_price) ||
            Number(it.line_price) ||
            (unitPrice * qty) ||
            finalLine
        );
        const priceText = formatMoney(displayPrice, currency);
        const priceClass = `sc-price${displayPrice === 0 ? " sc-price-free" : ""}`;
        const showFreeTag = isReward;
        const freeTagText = isReward
          ? isFreeGift
            ? "Free product"
            : "Offer product"
          : "Free";
        const freeTag = showFreeTag
          ? `<span class="sc-free-tag sc-free-tag-under">${safe(freeTagText)}</span>`
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
          <div class="sc-item" data-line="${line}">
            <div class="sc-img">${img}</div>

            <div class="sc-mid">
              <p class="sc-name" title="${safe(it.product_title)}">${nameHtml}</p>
              ${metaHtml}
              ${freeTag}
              <div class="sc-mid-bottom">
                ${isReward
                  ? ""
                  : `<div class="sc-qty">
                  <button type="button" data-qty="dec" aria-label="Decrease">-</button>
                  <input type="number" min="0" inputmode="numeric" value="${qty}" data-qty="input" />
                  <button type="button" data-qty="inc" aria-label="Increase">+</button>
                </div>`}
                <div class="sc-pricebox">
                  ${
                    hasCompare && showPrice
                      ? `<span class="sc-compare">${formatMoney(compareLine, currency)}</span>`
                      : ``
                  }
                  ${showPrice ? `<span class="${priceClass}">${priceText}</span>` : ``}
                </div>
              </div>
            </div>

            ${isReward ? "" : `<button type="button" class="sc-remove-x" data-remove="1" aria-label="Remove">
              <span class="sc-remove-char" aria-hidden="true">&times;</span>
            </button>`}
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
      schedulePostCartSync();
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
    const productId = normalizeProductNumericId(rawProductId);
    if (!productId) return null;

    if (rewardVariantByProductCache.has(productId)) {
      return rewardVariantByProductCache.get(productId);
    }

    try {
      const res = await fetch(
        `/products.json?ids=${encodeURIComponent(productId)}&limit=1`,
        { headers: { Accept: "application/json" }, credentials: "same-origin" }
      );
      if (!res.ok) {
        // Transient server error — do not cache so the next call can retry.
        return null;
      }

      const payload = await res.json();
      const product = Array.isArray(payload?.products) ? payload.products[0] : null;
      const variants = Array.isArray(product?.variants) ? product.variants : [];
      const firstVariant = variants[0] || null;
      const legacyId = trimToNull(firstVariant?.id);
      if (!legacyId) {
        // Product exists but has no variants — cache null so we don't hammer the API.
        rewardVariantByProductCache.set(productId, null);
        return null;
      }

      const imageUrl =
        trimToNull(firstVariant?.featured_image?.src) ||
        trimToNull(product?.image?.src) ||
        "";

      const resolved = {
        id: `gid://shopify/ProductVariant/${legacyId}`,
        legacyResourceId: String(legacyId),
        productId,
        image: imageUrl,
        title: trimToNull(firstVariant?.title) || "",
        product: {
          title: trimToNull(product?.title) || "",
          image: imageUrl,
        },
      };

      rewardVariantByProductCache.set(productId, resolved);
      return resolved;
    } catch (err) {
      console.error("[SmartCartify] product->variant resolve failed:", err);
      // Network error — do not cache so the next call can retry.
      return null;
    }
  };

  const resolveRewardVariantForAdd = async (rule, variant) => {
    if (getVariantLegacyId(variant)) return variant;
    const giftType = String(rule?.giftType || "").toLowerCase();
    const giftSkuRaw = trimToNull(rule?.giftSku);
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
    const giftSkuRaw = trimToNull(rule?.giftSku);
    if (giftType === "specific" && giftSkuRaw) {
      const productId = normalizeProductNumericId(giftSkuRaw) || gidToId(giftSkuRaw) || giftSkuRaw;
      return { productId: String(productId) };
    }

    // BxgyRule: giftType "same" — gift is the same product that was purchased
    const items = Array.isArray(CART?.items) ? CART.items : [];
    const scope = String(rule?.scope || "store").toLowerCase();
    let qualifyingItem = null;

    if (scope === "product") {
      // Parse appliesTo to find which products qualify
      const appliesToRaw = rule?.appliesTo;
      const appliesToObj = appliesToRaw && typeof appliesToRaw === "object"
        ? appliesToRaw
        : (() => { try { return JSON.parse(appliesToRaw || "{}"); } catch { return {}; } })();
      const applyProducts = Array.isArray(appliesToObj?.products) ? appliesToObj.products : [];
      let fallbackIds = [];
      try { const p = JSON.parse(rule?.appliesProductIds || "[]"); fallbackIds = Array.isArray(p) ? p : []; } catch {}
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
          <div class="sc-freegift-icon">🎁</div>
          <div>
            <p class="sc-freegift-title-text">Reward unlocked</p>
          </div>
        </div>
        <div class="sc-freegift-content">
          <div class="sc-freegift-image-wrap">
            <img class="sc-freegift-image" alt="Reward product" />
          </div>
          <div>
            <p class="sc-freegift-product-title"></p>
            <p class="sc-freegift-product-sub"></p>
          </div>
        </div>
        <button class="sc-freegift-add" type="button">Add</button>
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
      current: null,
    };

    if (addBtn) {
      addBtn.addEventListener("click", async () => {
        if (!rewardPopupCache?.current) return;
        const cur = rewardPopupCache.current;
        addBtn.disabled = true;

        try {
          const ok = await addRewardToCart({
            kind: cur.kind,
            rule: cur.rule,
            ruleKey: cur.ruleKey,
            slot: cur.slot,
            variant: cur.variant,
            qty: cur.qty,
            markAutoAdded: false,
          });
          if (ok) {
            closeRewardPopup();
          } else {
            // Silent failure (variant not resolved, already in cart, etc.) — no throw, just notify
            showCenterCelebratePopup("Reward", "Could not add the product. Please try again.", 4000);
          }
        } catch (err) {
          // addRewardToCart already logged this — show user-facing message only
          showCenterCelebratePopup("Reward", "Could not add the product. Please try again.", 4000);
        } finally {
          addBtn.disabled = false;
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

  const openRewardPopupFor = ({ kind, rule, ruleKey, slot, title }) => {
    const variant = getRewardVariantFromRule(kind, rule);
    if (!variant) return false;

    const canResolveByProductId =
      !!normalizeProductNumericId(
        trimToNull(variant?.productId) ||
        trimToNull(rule?.bonusProductId) ||
        trimToNull(rule?.bonus)
      );
    if (!getVariantLegacyId(variant) && !canResolveByProductId) return false;

    const guardKey = kind === "free" ? slot || ruleKey : ruleKey;

    // already shown in this session storage (page refresh safe)
    if (guardKey && !canShowPopupFor(kind, guardKey)) return false;

    if (guardKey && drawer.__sc_reward_popup_for === `${kind}:${guardKey}`) return false;

    if (guardKey && cartHasRewardForKey(kind, guardKey)) return false;

    if (!drawer.classList.contains("open")) openDrawer();

    const state = ensureRewardPopup();
    const qty = getRewardQtyFromRule(kind, rule);
    const currency = normalizeCurrencyCode();

    if (state.iconEl) state.iconEl.textContent = kind === "free" ? "🎁" : "🔥";
    if (state.headerTitleEl) state.headerTitleEl.textContent = kind === "free" ? "Free product unlocked" : "Offer product unlocked";
    if (state.headerSubEl) {
      state.headerSubEl.textContent =
        kind === "free" ? "Adding to cart..." : "Click Add to add it in your cart";
    }

    const imageUrl = variant.image || variant.product?.image || "";
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
      trimToNull(title) ||
      trimToNull(rule?.cartStepName) ||
      trimToNull(rule?.campaignName) ||
      "Reward";
    if (state.ruleTitleEl) state.ruleTitleEl.textContent = ruleName;

    if (state.addButton) state.addButton.textContent = `Add Item${qty > 1 ? ` (${qty})` : ""}`;

    state.current = { kind, ruleKey, slot, rule, variant, qty };
    state.overlay.classList.add("open");

    drawer.__sc_reward_popup_for = `${kind}:${guardKey || ""}`;

    // mark as shown so refresh/open doesn't repeat
    if (guardKey) markPopupShown(kind, guardKey);

    if (kind === "free" && state.addButton) {
      state.addButton.style.display = "none";
      void autoAddRewardIfNeeded({ kind: "free", rule, ruleKey, slot }).then((added) => {
        if (!state.current || state.current.kind !== "free") return;
        if (state.headerSubEl) {
          state.headerSubEl.textContent = added ? "Added to cart" : "Could not add automatically";
        }
      });
      if (rewardPopupTimer) clearTimeout(rewardPopupTimer);
      rewardPopupTimer = setTimeout(closeRewardPopup, 2000);
    } else if (state.addButton) {
      state.addButton.style.removeProperty("display");
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

    const scope = String(rule?.scope || rule?.scopeName || "store").trim().toLowerCase();

    const appliesTo = rule?.appliesTo || rule?.applyTo || {};
    const applyProducts = Array.isArray(appliesTo?.products) ? appliesTo.products : [];
    const applyCollections = Array.isArray(appliesTo?.collections) ? appliesTo.collections : [];

    let eligibleItems = items;

    if (scope === "product") {
      const allowed = new Set(applyProducts.map(gidToId).filter(Boolean).map(String));
      eligibleItems = items.filter((it) => allowed.has(String(it?.product_id || "")));
    } else if (scope === "collection") {
      const allowedCols = new Set(applyCollections.map(gidToId).filter(Boolean).map(String));
      eligibleItems = items.filter((it) => {
        const props = it?.properties || {};
        const col = props?._sc_collection_id || props?._collection_id || props?.collection_id;
        const id = gidToId(col) || (col ? String(col) : null);
        return id && allowedCols.has(String(id));
      });
    }

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
      (Array.isArray(freeList) ? freeList : []).forEach((r) => {
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
        progressWrap.style.setProperty("display", "none", "important");
      }
    };

    const stepsAll = buildSteps();
    const subtotal = getCartOriginalSubtotalCents();

    // ✅ ALWAYS refresh announcement regardless of steps
    refreshAnnouncementFromRules();

    const bxgyNow = getBxgyStatus();
    const bxgyCompleteNow = !!(bxgyNow && bxgyNow.complete);

    const buyStatuses = getBuyXGetYStatuses();
    const anyBuyCompletedNow = buyStatuses.some((x) => x.complete);

    // ✅ Clear shown/auto-added flags when eligibility is false (so next time it can show/add again)
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

    // ✅ If no steps configured, don't blank announcement anymore
    if (!stepsAll.length) {
      setProgressVisible(false);
      label.textContent = "Milestones not configured yet.";
      fill.style.width = "0%";
      dotsWrap.innerHTML = "";
      legends.innerHTML = "";
      document.documentElement.style.removeProperty("--sc-stepcount");

      // prime popup state so refresh/open doesn't fire
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
      label.textContent = "Milestones not configured yet.";
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
    document.documentElement.style.setProperty("--sc-stepcount", String(stepCount));

    const doneSteps = stepsAll.filter((ss) => isProgressStepDone(ss, subtotal));
    const doneCount = doneSteps.length;
    const nextPending = stepsAll.find(
      (ss) => isProgressStepConfigured(ss) && !isProgressStepDone(ss, subtotal)
    );

    let labelText = "";
    if (nextPending) {
      // Step pending: show its before message. Never bleed after-messages from completed steps.
      labelText = trimToNull(nextPending.progressTextBefore) || trimToNull(nextPending.title) || "";
    } else if (doneCount > 0) {
      // All steps done: show the last completed step's after message.
      const lastDone = doneSteps[doneCount - 1];
      labelText = trimToNull(lastDone.progressTextAfter) || "🎉 Congrats! All rewards are unlocked!";
    }
    if (!labelText) {
      labelText = doneCount >= configuredSteps.length && !nextPending
        ? "🎉 Congrats! All rewards are unlocked!"
        : trimToNull(nextPending?.title) || "Add items to unlock rewards";
    }
    label.textContent = labelText;

    const fillPct = computeMixedFillPercent(stepsAll, subtotal);
    fill.style.width = `${fillPct}%`;

    const isDrawerOpen = drawer.classList.contains("open");

    // ✅ FIX-2: Prime state on first render (so refresh won't show popups)
    const priming = !__SC_PRIMED_POPUPS__;
    if (priming) {
      LAST_DONE = doneCount;
      LAST_BXGY_DONE = bxgyCompleteNow;
      drawer.__sc_buy_completed_before = anyBuyCompletedNow;
      __SC_PRIMED_POPUPS__ = true;
    }

    // ? POPUPS only if NOT priming
    let rewardPopupShown = false;
    if (isDrawerOpen && !priming) {
      const firstCompleted = buyStatuses.find((x) => x.complete);
      const wasBuyCompletedBefore = !!drawer.__sc_buy_completed_before;

      if (firstCompleted && !wasBuyCompletedBefore) {
        drawer.__sc_buy_completed_before = true;
        // Auto-add the Y reward product for all scopes and any xQty.
        void autoAddRewardIfNeeded({
          kind: "buyxgety",
          rule: firstCompleted.rule,
          ruleKey: firstCompleted.ruleKey,
        });
        if (firstCompleted?.ruleKey) markPopupShown("buyxgety", firstCompleted.ruleKey);
      } else if (bxgyCompleteNow && !LAST_BXGY_DONE) {
        const popupShown = bxgyNow
          ? openRewardPopupFor({
            kind: "bxgy",
            rule: bxgyNow.rule,
            ruleKey: bxgyNow.ruleKey,
            title: trimToNull(bxgyNow.afterMsg) || trimToNull(bxgyNow.currentMsg) || "Offer unlocked",
          })
          : false;

        rewardPopupShown = true;
      }

      if (!anyBuyCompletedNow) drawer.__sc_buy_completed_before = false;
    }

    if (isDrawerOpen) {
      const freeStepToAutoAdd = doneSteps.find((ss) => {
        if (ss?.type !== "free") return false;
        const slot = trimToNull(ss?.slot);
        const ruleKey = getRuleKey(ss?.rule, "free");
        return !cartHasRewardForKey("free", slot || ruleKey);
      });

      if (freeStepToAutoAdd?.rule) {
        void autoAddRewardIfNeeded({
          kind: "free",
          rule: freeStepToAutoAdd.rule,
          ruleKey: getRuleKey(freeStepToAutoAdd.rule, "free"),
          slot: trimToNull(freeStepToAutoAdd.slot),
        });
      }

      // Persistent auto-add for all currently complete buyxgety rules.
      // Handles cases where the drawer was closed when the threshold was reached,
      // and ensures all completed rules (not just the first) get their reward added.
      buyStatuses.forEach((st) => {
        if (!st.complete || !st.rule) return;
        if (cartHasRewardForKey("buyxgety", st.ruleKey)) return;
        void autoAddRewardIfNeeded({ kind: "buyxgety", rule: st.rule, ruleKey: st.ruleKey });
      });
    }

    const stepCompletedNow = !priming && doneCount > LAST_DONE;
    if (stepCompletedNow && !rewardPopupShown) {
      const newlyUnlocked = doneSteps[doneCount - 1];
      const celebrationText =
        trimToNull(newlyUnlocked?.progressTextAfter) || newlyUnlocked?.title || "Reward Unlocked";

      let popupShown = false;
      const stepSlot = trimToNull(newlyUnlocked?.slot);
      const stepGuardKey =
        (stepSlot ? `step:${stepSlot}` : null) ||
        trimToNull(newlyUnlocked?.ruleKey) ||
        trimToNull(newlyUnlocked?.cartStepName) ||
        null;
      const canShowStepPopup = !stepGuardKey || canShowPopupFor("step", stepGuardKey);

      if (!isDrawerOpen) openDrawer();

      if (newlyUnlocked?.type === "free") {
        // avoid repeat after refresh by shown flag
        const slot = newlyUnlocked.slot;
        if (DISABLE_FREE_REWARD_POPUP) {
          const ruleKey = getRuleKey(newlyUnlocked?.rule, "free");
          const guardKey = slot || ruleKey;
          if (guardKey) markPopupShown("free", guardKey);
          if (newlyUnlocked?.rule) {
            void autoAddRewardIfNeeded({
              kind: "free",
              rule: newlyUnlocked.rule,
              ruleKey,
              slot: trimToNull(slot),
            });
          }
          popupShown = true;
        } else if (!slot || canShowPopupFor("free", slot)) {
          popupShown = openRewardPopupFor({
            kind: "free",
            rule: newlyUnlocked.rule,
            slot: newlyUnlocked.slot,
            title: trimToNull(newlyUnlocked?.title) || "Free product unlocked",
          });
          if (popupShown) drawer.__sc_free_popup_for = newlyUnlocked.slot;
        }
      }
    }


    LAST_DONE = doneCount;
    LAST_BXGY_DONE = bxgyCompleteNow;

    const stillHasFreeDone = doneSteps.some((ss) => ss.slot === drawer.__sc_free_popup_for);
    if (!stillHasFreeDone) drawer.__sc_free_popup_for = null;

    if (!bxgyCompleteNow && !anyBuyCompletedNow) {
      drawer.__sc_reward_popup_for = null;
    }

    dotsWrap.innerHTML = stepsAll
      .map((ss, i) => {
        const leftPct = ((i + 1) / stepCount) * 100;
        const isLast = i === stepCount - 1;

        const isDone = isProgressStepDone(ss, subtotal);
        const isActive = !isDone && nextPending?.slot === ss.slot;
        const cls = isDone ? "done" : isActive ? "active" : "";
        const icon = ss.icon;

        const belowText = trimToNull(ss.progressTextBelow) || trimToNull(ss.title);

        return `
          <div class="sc-dot-wrap ${cls} ${isLast ? "last" : ""}"
               style="left:${leftPct}%">
            <div class="sc-dot-bubble">${renderMilestoneIcon(icon)}</div>
            <div class="sc-dot-text">${safe(belowText)}</div>
          </div>
        `;
      })
      .join("");

    if (window.lucide?.createIcons) {
      window.lucide.createIcons();
    }

    legends.innerHTML = "";

    // clear shown flag for free slots when not done
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
    } catch {}
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
      } catch {}
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

    const code = trimToNull(settings?.customJs);
    if (!code) {
      ADD_TO_CART_BAR_STATE.customJsKey = "";
      return;
    }
    const key = `${code}:${product?.key || ""}:${getAtcVariantId(variant) || ""}`;
    if (ADD_TO_CART_BAR_STATE.customJsKey === key) return;
    ADD_TO_CART_BAR_STATE.customJsKey = key;
    try {
      new Function("bar", "product", "variant", "settings", "cart", "proxy", code)(
        addToCartBar,
        product,
        variant,
        settings,
        CART,
        PROXY
      );
    } catch (err) {
      console.error("[SmartCartify] add-to-cart bar custom JS failed:", err);
    }
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
      ? `<div class="sc-atc-media">${
          product.image
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
            ${
              deviceSettings.showCompareAtPrice && hasCompare
                ? `<span class="sc-atc-compare">${safe(formatMoney(compareCents, currency))}</span>`
                : ""
            }
            ${
              deviceSettings.showPrice && Number.isFinite(priceCents)
                ? `<span class="sc-atc-price">${safe(formatMoney(priceCents, currency))}</span>`
                : ""
            }
            ${variantHtml}
          </div>
        </div>
        <div class="sc-atc-actions">
          ${
            deviceSettings.showQuantity
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
        window.location.href = "/checkout";
        return;
      }

      const after = String(settings?.afterAddToCart || "openCartWidget");
      if (after === "goToCheckout") {
        window.location.href = "/checkout";
        return;
      }
      if (after === "openCartWidget") {
        openDrawer();
        renderAllFromCache();
        schedulePostCartSync();
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

      if (pendingDiscountCode) {
        discountPopupShownForCode = String(pendingDiscountCode).toLowerCase();
      }

      applyStyleSettings(PROXY?.styleSettings);
      renderAllFromCache();

      if (pendingDiscountCode) {
        try {
          sessionStorage.removeItem("__SC_LAST_APPLIED_CODE__");
        } catch { }

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
      schedulePostCartSync();
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
          showCartActionMessage(
            addErrMessage,
            isQuantityLimitMessage(addErrMessage) ? "warn" : "error"
          );
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

  const schedulePostCartSync = () => {
    if (!drawer.classList.contains("open")) return;
    schedulePassiveRefresh(120);
    setTimeout(() => {
      schedulePassiveRefresh(850);
    }, 850);
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
    if (isRewardItem) return;

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

  $("[data-checkout]")?.addEventListener("click", () => {
    recordCompletedRuleConversions();
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

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") schedulePassiveRefresh(160);
  });

  window.addEventListener("focus", () => {
    schedulePassiveRefresh(160);
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
