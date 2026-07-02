(function () {
  "use strict";

  var state = {
    data: null,
    productsById: new Map(),
    suggestPanel: null,
    installPrompt: null
  };

  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function qsa(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function safeUrl(value) {
    var url = String(value || "").trim();
    if (!url) return "/assets/images/default.png";
    if (/^(https?:|data:image\/|\/)/i.test(url)) return url;
    return "/" + url.replace(/^\/+/, "");
  }

  function compactNumber(value) {
    var number = Number(value || 0);
    if (!Number.isFinite(number)) return "0";
    if (number >= 1000000) return (number / 1000000).toFixed(number >= 10000000 ? 0 : 1) + "M";
    if (number >= 1000) return (number / 1000).toFixed(number >= 10000 ? 0 : 1) + "K";
    return String(Math.round(number));
  }

  function uniqueText(values, limit) {
    var seen = new Set();
    var result = [];
    (values || []).forEach(function (value) {
      var text = String(value || "").trim();
      var key = text.toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      result.push(text);
    });
    return result.slice(0, limit || 6);
  }

  function formatMoney(value, currency) {
    var amount = Number(value || 0);
    var code = currency || "CNY";
    if (code === "USDT") return amount.toFixed(amount >= 100 ? 0 : 2) + " USDT";
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: code,
        maximumFractionDigits: amount >= 100 ? 0 : 2
      }).format(amount);
    } catch (error) {
      return amount.toFixed(amount >= 100 ? 0 : 2) + " " + code;
    }
  }

  function stars(rating) {
    var value = Math.round(Number(rating || 0));
    var text = "";
    for (var index = 0; index < 5; index += 1) text += index < value ? "★" : "☆";
    return text;
  }

  function storeRecentSearch(term) {
    var value = String(term || "").trim();
    if (!value) return;
    var key = "hstockhub_recent_searches";
    var list = [];
    try {
      list = JSON.parse(localStorage.getItem(key) || "[]");
    } catch (error) {
      list = [];
    }
    list = [value].concat(list.filter(function (item) { return item.toLowerCase() !== value.toLowerCase(); })).slice(0, 8);
    localStorage.setItem(key, JSON.stringify(list));
  }

  function getRecentSearches() {
    try {
      return JSON.parse(localStorage.getItem("hstockhub_recent_searches") || "[]").slice(0, 8);
    } catch (error) {
      return [];
    }
  }

  function rememberViewedProduct(id) {
    if (!id) return;
    var key = "hstockhub_recent_product_ids";
    var list = [];
    try {
      list = JSON.parse(localStorage.getItem(key) || "[]");
    } catch (error) {
      list = [];
    }
    list = [id].concat(list.filter(function (item) { return item !== id; })).slice(0, 16);
    localStorage.setItem(key, JSON.stringify(list));
  }

  function toggleStorageList(key, id) {
    var list = [];
    try {
      list = JSON.parse(localStorage.getItem(key) || "[]");
    } catch (error) {
      list = [];
    }
    if (list.indexOf(id) >= 0) list = list.filter(function (item) { return item !== id; });
    else list.unshift(id);
    localStorage.setItem(key, JSON.stringify(list.slice(0, 40)));
    return list.indexOf(id) >= 0;
  }

  function emptyState(message) {
    return '<div class="market-empty"><span>' + escapeHtml(message || "No live records are available yet.") + "</span></div>";
  }

  function shell() {
    return [
      '<section class="market-hero" aria-labelledby="marketHeroTitle">',
      '  <div class="market-shell market-hero-grid">',
      '    <div class="market-hero-panel">',
      '      <p class="market-eyebrow"><i class="las la-store"></i> Live marketplace</p>',
      '      <h1 id="marketHeroTitle">hstockhub.com Marketplace</h1>',
      '      <p class="market-hero-copy">Discover active digital products, verified sellers, category leaders, best sellers, deals, and fresh arrivals from the current catalog.</p>',
      '      <form class="market-search" id="marketHeroSearch" role="search">',
      '        <label class="market-search-field" for="marketHeroInput"><i class="las la-search"></i><input id="marketHeroInput" name="search" type="search" autocomplete="off" placeholder="Search products, categories, sellers"></label>',
      '        <button type="submit"><i class="las la-arrow-right"></i><span>Search</span></button>',
      '      </form>',
      '      <div class="market-keywords" id="marketHeroKeywords"></div>',
      '      <div class="market-stat-grid" id="marketStats">',
      '        <div class="market-stat market-skeleton"></div><div class="market-stat market-skeleton"></div><div class="market-stat market-skeleton"></div><div class="market-stat market-skeleton"></div>',
      '      </div>',
      '    </div>',
      '    <div class="market-hero-visual">',
      '      <div class="market-live-card">',
      '        <div class="market-live-top"><div><p class="market-section-kicker"><i class="las la-bolt"></i> Today</p><strong>Flash sale window</strong></div><span class="market-live-badge"><i class="las la-clock"></i><span id="marketCountdown">00:00:00</span></span></div>',
      '        <div class="market-ticker" id="marketTicker"><div class="market-skeleton" style="height:58px"></div><div class="market-skeleton" style="height:58px"></div><div class="market-skeleton" style="height:58px"></div></div>',
      '      </div>',
      '      <div class="market-hero-products" id="marketHeroProducts"><div class="market-mini-product market-skeleton"></div><div class="market-mini-product market-skeleton"></div><div class="market-mini-product market-skeleton"></div><div class="market-mini-product market-skeleton"></div></div>',
      '    </div>',
      '  </div>',
      '</section>',
      '<section class="market-category-strip" aria-label="Featured categories"><div class="market-shell market-category-scroll" id="marketCategoryStrip"></div></section>',
      '<section class="market-section market-how" aria-labelledby="marketHowTitle">',
      '  <div class="market-shell">',
      '    <div class="market-section-head"><div><p class="market-section-kicker"><i class="las la-route"></i> How it Works?</p><h2 id="marketHowTitle">Simple buying flow for digital products</h2><p>Use the same marketplace logic as the live catalog: register, pay, receive, and confirm delivery before sellers are released.</p></div></div>',
      '    <div class="market-how-grid">',
      '      <article class="market-how-card"><span><i class="las la-user-plus"></i></span><strong>Registration</strong><p>Register free to unlock buyer tools, saved products, orders, and marketplace support.</p></article>',
      '      <article class="market-how-card"><span><i class="las la-credit-card"></i></span><strong>Payment</strong><p>Checkout through the available payment workflow and keep every order traceable.</p></article>',
      '      <article class="market-how-card"><span><i class="las la-shipping-fast"></i></span><strong>Delivery</strong><p>Instant digital stock and manual delivery products show clear fulfillment status.</p></article>',
      '      <article class="market-how-card"><span><i class="las la-check-square"></i></span><strong>Confirmation</strong><p>Validate delivery, review the product, and keep seller payout tied to trust signals.</p></article>',
      '    </div>',
      '  </div>',
      '</section>',
      '<section class="market-section marketplace-featured" aria-labelledby="marketplaceFeaturedTitle">',
      '  <div class="market-shell">',
      '    <div class="market-section-head"><div><p class="market-section-kicker"><i class="las la-gem"></i> Featured Products</p><h2 id="marketplaceFeaturedTitle">Products and packages from our catalog</h2><p>Switch between new items, most viewed, best sellers, fast delivery, and discounted packages generated from existing products.</p></div><a class="market-link" href="products.html"><i class="las la-store"></i> Explore marketplace</a></div>',
      '    <div class="marketplace-feature-tabs" id="marketFeaturedTabs"></div>',
      '    <div class="marketplace-filter-chips" id="marketFeaturedChips"></div>',
      '    <div class="marketplace-product-grid" id="marketFeaturedTabGrid"><div class="market-skeleton" style="height:280px"></div><div class="market-skeleton" style="height:280px"></div><div class="market-skeleton" style="height:280px"></div></div>',
      '  </div>',
      '</section>',
      '<section class="market-section market-game-arena" aria-labelledby="marketTrendingGamesTitle">',
      '  <div class="market-shell">',
      '    <div class="market-section-head"><div><p class="market-section-kicker"><i class="las la-chart-line"></i> Trending Niches</p><h2 id="marketTrendingGamesTitle">Trending categories and newly added packages</h2><p>Marketplace-style discovery using HaoYi / hstockhub digital content: top-ups, AI accounts, gaming wallets, email accounts, social accounts, and vouchers.</p></div><a class="market-link" href="categories.html"><i class="las la-th-large"></i> All categories</a></div>',
      '    <div class="market-trending-grid" id="marketTrendingGames"></div>',
      '    <div class="market-newly-panel"><div><p class="market-section-kicker"><i class="las la-sparkles"></i> New update!</p><h2>Newly added packages</h2></div><div class="market-newly-rail" id="marketNewPackages"></div></div>',
      '  </div>',
      '</section>',
      '<section class="plati-inspired" aria-labelledby="platiPopularTitle">',
      '  <div class="market-shell">',
      '    <div class="plati-mobile-header"><button type="button" aria-label="Open categories"><i class="las la-th-large"></i></button><strong>HSTOCKHUB</strong><button type="button" aria-label="Search"><i class="las la-search"></i></button></div>',
      '    <div class="plati-card plati-popular-card"><div class="plati-section-title"><h2 id="platiPopularTitle">Popular</h2><a href="categories.html">All</a></div><div class="plati-popular-rail" id="platiPopularRail"></div></div>',
      '    <div class="plati-card plati-topup-card"><div class="plati-section-title"><h2>Top-up Center</h2><span>Instant wallet refill demo</span></div><div class="plati-tabs" id="platiTopupTabs"></div><div class="plati-region-tabs"><button class="active" type="button">CIS countries</button><button type="button">Turkey</button><button type="button">Global</button></div><form class="plati-topup-form" id="platiTopupForm"><label><input name="amount" placeholder="Top-up amount" inputmode="decimal"></label><div class="plati-amounts"><button type="button" data-amount="10">10 $</button><button type="button" data-amount="25">25 $</button><button type="button" data-amount="50">50 $</button><button type="button" data-amount="100">100 $</button></div><label><input name="login" placeholder="Account login / player ID"></label><small>Demo only: selecting a product opens its live marketplace listing.</small><button class="market-button" type="submit"><i class="las la-bolt"></i> Continue top-up</button></form></div>',
      '    <div class="plati-card"><div class="plati-section-title"><h2>Best Sellers</h2><a href="products.html?sort=best-sellers">View all</a></div><div class="plati-best-grid" id="platiBestGrid"></div></div>',
      '  </div>',
      '</section>',
      '<section class="market-section tight" aria-labelledby="featuredCategoriesTitle"><div class="market-shell"><div class="market-section-head"><div><p class="market-section-kicker"><i class="las la-th-large"></i> Featured Categories</p><h2 id="featuredCategoriesTitle">Browse existing categories</h2><p>Every category card is generated from the active category collection and current product counts.</p></div><a class="market-link" href="categories.html"><i class="las la-folder-open"></i> All Categories</a></div><div class="market-grid market-category-grid" id="marketFeaturedCategories"></div></div></section>',
      '<section class="market-section tight" aria-labelledby="popularCategoriesTitle"><div class="market-shell"><div class="market-section-head"><div><p class="market-section-kicker"><i class="las la-fire"></i> Popular Categories</p><h2 id="popularCategoriesTitle">Category demand map</h2></div></div><div class="market-grid market-category-grid" id="marketPopularCategories"></div></div></section>',
      '<div id="marketProductSections"></div>',
      '<section class="market-section" aria-labelledby="categoryHighlightsTitle"><div class="market-shell"><div class="market-section-head"><div><p class="market-section-kicker"><i class="las la-layer-group"></i> Category Highlights</p><h2 id="categoryHighlightsTitle">Top, popular, latest, best-selling, and rated products by category</h2></div></div><div class="market-grid market-category-grid" id="marketCategoryHighlights"></div></div></section>',
      '<section class="market-section market-seller-arena" aria-labelledby="featuredSellerTitle"><div class="market-shell"><div class="market-section-head"><div><p class="market-section-kicker"><i class="las la-store-alt"></i> Featured Sellers</p><h2 id="featuredSellerTitle">Explore proven and reliable sellers</h2><p>Seller cards show rating, verification level, and top catalog items like a full marketplace storefront.</p></div><div class="market-carousel-buttons"><button type="button" data-scroll-target="marketSellerShowcase" data-scroll-dir="-1" aria-label="Previous sellers"><i class="las la-arrow-left"></i></button><button type="button" data-scroll-target="marketSellerShowcase" data-scroll-dir="1" aria-label="Next sellers"><i class="las la-arrow-right"></i></button></div></div><div class="market-seller-showcase" id="marketSellerShowcase"></div></div></section>',
      '<section class="market-section" aria-labelledby="sellerTitle"><div class="market-shell market-columns"><div><div class="market-section-head"><div><p class="market-section-kicker"><i class="las la-user-check"></i> Verified Sellers</p><h2 id="sellerTitle">Premium seller signals</h2></div></div><div class="market-seller-grid" id="marketSellers"></div></div><aside class="market-panel"><p class="market-section-kicker"><i class="las la-shield-alt"></i> Why Choose Us</p><h2>Trust, stock, and delivery clarity</h2><p>hstockhub.com prioritizes active listings, seller verification, stock status, delivery type, rating data, and completed-sale signals so buyers can scan quickly.</p><div class="market-quick-links"><a class="market-chip" href="products.html"><i class="las la-shopping-bag"></i> Products</a><a class="market-chip" href="faq.html"><i class="las la-question-circle"></i> FAQs</a><a class="market-chip" href="contact.html"><i class="las la-headset"></i> Support</a></div></aside></div></section>',
      '<section class="market-section" aria-labelledby="reviewsTitle"><div class="market-shell"><div class="market-section-head"><div><p class="market-section-kicker"><i class="las la-comments"></i> Customer Reviews</p><h2 id="reviewsTitle">Published marketplace feedback</h2></div></div><div class="market-review-grid" id="marketReviews"></div></div></section>',
      '<section class="market-section" aria-labelledby="brandsTitle"><div class="market-shell"><div class="market-section-head"><div><p class="market-section-kicker"><i class="las la-certificate"></i> Featured Brands</p><h2 id="brandsTitle">Brand records from live products</h2></div></div><div class="market-brand-grid" id="marketBrands"></div></div></section>',
      '<section class="market-section" aria-labelledby="knowledgeTitle"><div class="market-shell"><div class="market-section-head"><div><p class="market-section-kicker"><i class="las la-newspaper"></i> Knowledge Center</p><h2 id="knowledgeTitle">Marketplace resources</h2></div></div><div class="market-knowledge-grid" id="marketKnowledge"></div></div></section>',
      '<section class="market-section tight" aria-labelledby="faqTitle"><div class="market-shell"><div class="market-section-head"><div><p class="market-section-kicker"><i class="las la-question"></i> FAQs</p><h2 id="faqTitle">Fast answers</h2></div></div><div class="market-faq-grid" id="marketFaqs"></div></div></section>',
      '<section class="market-section" aria-labelledby="conversionTitle"><div class="market-shell market-conversion-grid"><form class="market-newsletter" id="marketNewsletter"><div><p class="market-section-kicker"><i class="las la-envelope"></i> Newsletter</p><h2 id="conversionTitle">Follow catalog movement</h2><label for="marketEmail">Email address</label><input id="marketEmail" type="email" placeholder="you@example.com"></div><button class="market-button" type="submit"><i class="las la-paper-plane"></i> Subscribe</button></form><div class="market-app-card"><p class="market-section-kicker"><i class="las la-mobile"></i> App Download</p><h2>Install the web app</h2><p>Use hstockhub.com from a mobile home screen with the existing web app manifest and service worker.</p><div class="market-app-actions"><button class="market-button" id="marketInstallApp" type="button"><i class="las la-download"></i> Install</button><a class="market-button secondary" href="products.html"><i class="las la-shopping-basket"></i> Open Marketplace</a></div></div></div></section>',
      '<div class="market-modal" id="marketQuickView" role="dialog" aria-modal="true" aria-labelledby="marketQuickTitle"><div class="market-modal-dialog"><div class="market-modal-head"><h3 id="marketQuickTitle">Product</h3><button class="market-icon-button" data-action="close-modal" type="button" aria-label="Close quick view"><i class="las la-times"></i></button></div><div class="market-modal-body" id="marketQuickBody"></div></div></div>'
    ].join("");
  }

  function renderFooter() {
    var oldFooter = qs("footer.site-footer");
    if (!oldFooter) return;
    oldFooter.outerHTML = [
      '<footer class="market-footer site-footer">',
      '  <div class="market-shell market-footer-grid">',
      '    <div><a class="header-v2__logo" href="index.html"><img src="assets/images/logo_icon/logo.png" alt="hstockhub.com"></a><p>Premium marketplace discovery powered by active products, categories, sellers, ratings, stock, and sales data.</p></div>',
      '    <div><h2>Marketplace</h2><a href="products.html">Products</a><a href="categories.html">Categories</a><a href="#marketProductSections">Trending</a></div>',
      '    <div><h2>Account</h2><a href="auth/buyer/login">Buyer Login</a><a href="auth/seller/login">Seller Login</a><a href="user/register.html">Register</a></div>',
      '    <div><h2>Resources</h2><a href="blog.html">Blog Articles</a><a href="faq.html">Knowledge Center</a><a href="contact.html">Support</a></div>',
      '    <div><h2>Legal</h2><a href="policy/privacy-policy.html">Privacy</a><a href="policy/terms-of-service.html">Terms</a><a href="policy/refund-policy.html">Refunds</a></div>',
      '  </div>',
      '  <div class="market-shell market-footer-bottom"><span>&copy; 2026 hstockhub.com. All rights reserved.</span><span>Live catalog sections refresh from the database.</span></div>',
      '</footer>'
    ].join("");
  }

  function productCard(product) {
    var badges = (product.badges || []).slice(0, 4).map(function (badge) {
      var klass = /hot/i.test(badge) ? " hot" : /new/i.test(badge) ? " new" : /premium/i.test(badge) ? " premium" : "";
      return '<span class="market-badge' + klass + '">' + escapeHtml(badge) + "</span>";
    }).join("");
    var category = product.category || {};
    var seller = product.seller || {};
    var rating = Number(product.ratingAverage || 0).toFixed(1);
    return [
      '<article class="market-product-card" data-product-id="' + escapeHtml(product.id) + '">',
      '  <div class="market-product-media">',
      '    <img loading="lazy" src="' + escapeHtml(safeUrl(product.image)) + '" alt="' + escapeHtml(product.name) + '" onerror="this.src=\'/assets/images/default.png\'">',
      '    <div class="market-badge-stack">' + badges + '</div>',
      '    <div class="market-card-actions">',
      '      <button class="market-icon-button" type="button" data-action="wishlist" data-product-id="' + escapeHtml(product.id) + '" aria-label="Add to wishlist"><i class="lar la-heart"></i></button>',
      '      <button class="market-icon-button" type="button" data-action="quick" data-product-id="' + escapeHtml(product.id) + '" aria-label="Quick view"><i class="las la-eye"></i></button>',
      '      <button class="market-icon-button" type="button" data-action="compare" data-product-id="' + escapeHtml(product.id) + '" aria-label="Compare"><i class="las la-balance-scale"></i></button>',
      '    </div>',
      '  </div>',
      '  <div class="market-product-body">',
      '    <div class="market-product-meta"><a href="' + escapeHtml(category.url || "products.html") + '">' + escapeHtml(category.name || "Category") + '</a><span>' + escapeHtml(product.stockStatus || "Stock") + '</span></div>',
      '    <a class="market-product-title" href="' + escapeHtml(product.url || "products.html") + '">' + escapeHtml(product.name) + '</a>',
      '    <div class="market-price-row"><span class="market-price">' + escapeHtml(formatMoney(product.price, product.currency)) + '</span>' + (product.originalPrice ? '<span class="market-original-price">' + escapeHtml(formatMoney(product.originalPrice, product.currency)) + '</span>' : "") + (product.discountPercent ? '<span class="market-discount">-' + escapeHtml(product.discountPercent) + '%</span>' : "") + '</div>',
      '    <div class="market-metric-grid">',
      '      <div class="market-metric"><strong>' + escapeHtml(rating) + ' ' + stars(product.ratingAverage).slice(0, 1) + '</strong><span>' + escapeHtml(compactNumber(product.reviewCount)) + ' reviews</span></div>',
      '      <div class="market-metric"><strong>' + escapeHtml(compactNumber(product.salesCount)) + '</strong><span>sales</span></div>',
      '      <div class="market-metric"><strong>' + escapeHtml(compactNumber(product.views)) + '</strong><span>views</span></div>',
      '    </div>',
      '    <div class="market-seller-row"><span>' + escapeHtml(seller.name || "Seller") + '</span>' + (seller.verified ? '<b class="market-verified"><i class="las la-check-circle"></i> Verified</b>' : "") + '</div>',
      '    <div class="market-stock-row"><span><i class="las la-box"></i> ' + escapeHtml(compactNumber(product.stockCount)) + ' available</span><span><i class="las la-shipping-fast"></i> ' + escapeHtml(product.deliveryTime || "Delivery") + '</span></div>',
      '    <div class="market-card-footer"><button class="market-small-button" type="button" data-action="quick" data-product-id="' + escapeHtml(product.id) + '"><i class="las la-eye"></i> Quick View</button><a class="market-small-button primary" href="' + escapeHtml(product.url || "products.html") + '"><i class="las la-shopping-cart"></i> View</a></div>',
      '  </div>',
      '</article>'
    ].join("");
  }

  function renderProductSection(section) {
    return [
      '<section class="market-section" aria-labelledby="' + escapeHtml(section.key) + '-title">',
      '  <div class="market-shell">',
      '    <div class="market-section-head"><div><p class="market-section-kicker"><i class="las ' + escapeHtml(section.icon || "la-box") + '"></i> ' + escapeHtml(section.title) + '</p><h2 id="' + escapeHtml(section.key) + '-title">' + escapeHtml(section.title) + '</h2><p>' + escapeHtml(section.subtitle || "") + '</p></div><a class="market-link" href="products.html"><i class="las la-arrow-right"></i> View All</a></div>',
      (section.items && section.items.length ? '<div class="market-product-rail">' + section.items.map(productCard).join("") + '</div>' : emptyState("No active products match this section yet.")),
      '  </div>',
      '</section>'
    ].join("");
  }

  function uniqueProductsFromSections(data, keys, limit) {
    var seen = new Set();
    var result = [];
    function add(product) {
      if (!product || seen.has(product.id)) return;
      seen.add(product.id);
      result.push(product);
    }
    (keys || []).forEach(function (key) {
      var section = (data.sections || []).find(function (item) { return item.key === key; });
      (section && section.items || []).forEach(add);
    });
    (data.heroProducts || []).forEach(add);
    if (data.search && data.search.products) data.search.products.forEach(add);
    return result.slice(0, limit || 8);
  }

  function platiPopularCard(item) {
    return [
      '<a class="plati-popular-item" href="' + escapeHtml(item.url || "products.html") + '">',
      '  <span class="plati-popular-image"><img loading="lazy" src="' + escapeHtml(safeUrl(item.image)) + '" alt="' + escapeHtml(item.name) + '" onerror="this.src=\'/assets/images/default.png\'"></span>',
      '  <strong>' + escapeHtml(item.name) + '</strong>',
      '</a>'
    ].join("");
  }

  function platiBestCard(product) {
    return [
      '<article class="plati-best-card" data-product-id="' + escapeHtml(product.id) + '">',
      '  <a class="plati-best-media" href="' + escapeHtml(product.url || "products.html") + '"><img loading="lazy" src="' + escapeHtml(safeUrl(product.image)) + '" alt="' + escapeHtml(product.name) + '" onerror="this.src=\'/assets/images/default.png\'"><button type="button" data-action="wishlist" data-product-id="' + escapeHtml(product.id) + '" aria-label="Save product"><i class="lar la-heart"></i></button></a>',
      '  <div class="plati-best-body"><strong class="plati-price">' + escapeHtml(formatMoney(product.price, product.currency)) + '</strong><a href="' + escapeHtml(product.url || "products.html") + '">' + escapeHtml(product.name) + '</a><span>Sold ' + escapeHtml(compactNumber(product.salesCount)) + '</span><button type="button" data-action="quick" data-product-id="' + escapeHtml(product.id) + '">Buy</button></div>',
      '</article>'
    ].join("");
  }

  function sectionByKey(data, key) {
    return (data.sections || []).find(function (section) { return section.key === key; }) || { items: [] };
  }

  function allMarketplaceProducts(data, limit) {
    var keys = (data.sections || []).map(function (section) { return section.key; });
    return uniqueProductsFromSections(data, keys, limit || 80);
  }

  function marketplaceProductTile(product, modifier) {
    var category = product.category || {};
    var seller = product.seller || {};
    var badges = uniqueText((product.badges || []).concat(product.fastDelivery ? ["Instant"] : []).concat(product.discountPercent ? ["Deal"] : []), 3);
    return [
      '<article class="marketplace-tile ' + escapeHtml(modifier || "") + '" data-product-id="' + escapeHtml(product.id) + '">',
      '  <a class="marketplace-tile-media" href="' + escapeHtml(product.url || "products.html") + '">',
      '    <img loading="lazy" src="' + escapeHtml(safeUrl(product.image)) + '" alt="' + escapeHtml(product.name) + '" onerror="this.src=\'/assets/images/default.png\'">',
      '    <span class="marketplace-tile-type"><i class="las la-key"></i> ' + escapeHtml(category.name || "Digital") + '</span>',
      '    <button type="button" data-action="wishlist" data-product-id="' + escapeHtml(product.id) + '" aria-label="Save product"><i class="lar la-heart"></i></button>',
      '  </a>',
      '  <div class="marketplace-tile-body">',
      '    <div class="marketplace-tile-badges">' + badges.map(function (badge) { return '<span>' + escapeHtml(badge) + '</span>'; }).join("") + '</div>',
      '    <a class="marketplace-tile-title" href="' + escapeHtml(product.url || "products.html") + '">' + escapeHtml(product.name) + '</a>',
      '    <div class="marketplace-tile-meta"><span>' + escapeHtml(seller.name || "Marketplace seller") + '</span>' + (seller.verified ? '<b><i class="las la-check-circle"></i> Verified</b>' : '') + '</div>',
      '    <div class="marketplace-tile-foot"><strong>' + escapeHtml(formatMoney(product.price, product.currency)) + '</strong><button type="button" data-action="quick" data-product-id="' + escapeHtml(product.id) + '">Details</button></div>',
      '  </div>',
      '</article>'
    ].join("");
  }

  function trendingCategoryCard(category, index) {
    var highlights = uniqueText([].concat(
      (category.featuredProducts || []).map(function (item) { return item.name; }),
      (category.popularProducts || []).map(function (item) { return item.name; }),
      (category.bestSellingProducts || []).map(function (item) { return item.name; })
    ), 3);
    return [
      '<a class="market-trending-card ' + (index < 2 ? 'featured' : '') + '" href="' + escapeHtml(category.url || "products.html") + '">',
      '  <img loading="lazy" src="' + escapeHtml(safeUrl(category.image)) + '" alt="' + escapeHtml(category.name) + '" onerror="this.src=\'/assets/images/default.png\'">',
      '  <span class="market-trending-overlay"></span>',
      '  <span class="market-trending-count">' + escapeHtml(compactNumber(category.productCount)) + ' listings</span>',
      '  <strong>' + escapeHtml(category.name) + '</strong>',
      '  <small>' + escapeHtml(highlights.join(' • ') || 'Explore products and packages') + '</small>',
      '</a>'
    ].join("");
  }

  function newlyPackageItem(product) {
    return [
      '<a class="market-new-package" href="' + escapeHtml(product.url || "products.html") + '">',
      '  <img loading="lazy" src="' + escapeHtml(safeUrl(product.image)) + '" alt="' + escapeHtml(product.name) + '" onerror="this.src=\'/assets/images/default.png\'">',
      '  <strong>' + escapeHtml(product.brand || (product.category && product.category.name) || product.name) + '</strong>',
      '  <span>' + escapeHtml(formatMoney(product.price, product.currency)) + '</span>',
      '</a>'
    ].join("");
  }

  function sellerShowcaseCard(seller, products) {
    var sellerProducts = products.filter(function (product) { return product.seller && product.seller.id === seller.id; }).slice(0, 4);
    if (!sellerProducts.length) sellerProducts = products.slice(0, 3);
    var initial = (seller.name || "S").charAt(0).toUpperCase();
    var avatar = seller.avatar ? '<img loading="lazy" src="' + escapeHtml(safeUrl(seller.avatar)) + '" alt="' + escapeHtml(seller.name) + '">' : escapeHtml(initial);
    var tier = Number(seller.ratingAverage || 0) >= 4.9 ? 'Vibranium' : Number(seller.ratingAverage || 0) >= 4.7 ? 'Platinum' : 'Gold';
    return [
      '<article class="market-seller-feature-card">',
      '  <div class="market-seller-feature-head">',
      '    <span class="market-avatar seller-big">' + avatar + '</span>',
      '    <div><strong>' + escapeHtml(seller.name || "Seller") + '</strong><span><i class="las la-medal"></i> ' + escapeHtml(tier) + ' &nbsp; ' + escapeHtml(Number(seller.ratingAverage || 0).toFixed(1)) + ' ★</span></div>',
      '  </div>',
      '  <div class="market-seller-divider"></div>',
      '  <p>Top products sold</p>',
      '  <div class="market-seller-products">' + sellerProducts.map(function (product) {
        return '<a href="' + escapeHtml(product.url || "products.html") + '"><img loading="lazy" src="' + escapeHtml(safeUrl(product.image)) + '" alt="' + escapeHtml(product.name) + '" onerror="this.src=\'/assets/images/default.png\'"><span>' + escapeHtml(product.name) + '</span></a>';
      }).join("") + '</div>',
      '  <a class="market-seller-more" href="' + escapeHtml(seller.url || "products.html") + '">More details <i class="las la-arrow-right"></i></a>',
      '</article>'
    ].join("");
  }

  function renderMarketplaceShowcase(data) {
    var tabSpecs = [
      { key: 'new', label: 'New Items', icon: 'la-sparkles', products: uniqueProductsFromSections(data, ['new-arrivals', 'recently-added', 'recently-updated'], 8) },
      { key: 'views', label: 'Most Views', icon: 'la-eye', products: uniqueProductsFromSections(data, ['most-viewed-products', 'trending-products'], 8) },
      { key: 'seller', label: 'Best Sellers', icon: 'la-crown', products: uniqueProductsFromSections(data, ['best-sellers', 'top-selling-today', 'popular-this-month'], 8) },
      { key: 'fast', label: 'Fast Delivery', icon: 'la-shipping-fast', products: uniqueProductsFromSections(data, ['fast-delivery-products', 'verified-sellers-products'], 8) },
      { key: 'deals', label: 'Hot Deals', icon: 'la-tags', products: uniqueProductsFromSections(data, ['hot-deals', 'flash-sale', 'budget-picks'], 8) }
    ];
    var fallback = allMarketplaceProducts(data, 8);
    tabSpecs.forEach(function (tab) { if (!tab.products.length) tab.products = fallback; });

    qs('#marketFeaturedTabs').innerHTML = tabSpecs.map(function (tab, index) {
      return '<button type="button" class="' + (index === 0 ? 'active' : '') + '" data-market-tab="' + escapeHtml(tab.key) + '"><i class="las ' + escapeHtml(tab.icon) + '"></i> ' + escapeHtml(tab.label) + '</button>';
    }).join('');
    qs('#marketFeaturedChips').innerHTML = ((data.categories && data.categories.popular) || []).slice(0, 7).map(function (category, index) {
      return '<a class="' + (index === 0 ? 'active' : '') + '" href="' + escapeHtml(category.url || 'products.html') + '"><img loading="lazy" src="' + escapeHtml(safeUrl(category.image)) + '" alt="">' + escapeHtml(category.name) + '</a>';
    }).join('') + '<a href="categories.html"><i class="las la-ellipsis-h"></i> More</a>';

    function renderGrid(key) {
      var active = tabSpecs.find(function (tab) { return tab.key === key; }) || tabSpecs[0];
      qs('#marketFeaturedTabGrid').innerHTML = active.products.length ? active.products.slice(0, 8).map(function (product, index) {
        return marketplaceProductTile(product, index === 0 ? 'wide' : '');
      }).join('') : emptyState('No products are available for this marketplace tab yet.');
    }
    renderGrid(tabSpecs[0].key);
    qsa('[data-market-tab]').forEach(function (button) {
      button.addEventListener('click', function () {
        qsa('[data-market-tab]').forEach(function (item) { item.classList.toggle('active', item === button); });
        renderGrid(button.getAttribute('data-market-tab'));
        setupActions();
      });
    });

    var trendingCategories = ((data.categories && (data.categories.popular || data.categories.all)) || []).slice(0, 6);
    qs('#marketTrendingGames').innerHTML = trendingCategories.length ? trendingCategories.map(trendingCategoryCard).join('') : emptyState('Trending categories will appear after catalog setup.');
    var newPackages = uniqueProductsFromSections(data, ['recently-added', 'new-arrivals', 'recommended-products', 'fast-delivery-products'], 10);
    qs('#marketNewPackages').innerHTML = newPackages.length ? newPackages.map(newlyPackageItem).join('') : emptyState('New packages will appear after products are added.');
  }

  function renderSellerShowcase(data) {
    var verified = data.sellers && data.sellers.verified ? data.sellers.verified : [];
    var premium = data.sellers && data.sellers.premium ? data.sellers.premium : [];
    var sellers = (verified.length ? verified : premium).slice(0, 10);
    var products = allMarketplaceProducts(data, 80);
    qs('#marketSellerShowcase').innerHTML = sellers.length ? sellers.map(function (seller) { return sellerShowcaseCard(seller, products); }).join('') : emptyState('Featured sellers will appear after seller approval.');
  }

  function renderPlatiInspired(data) {
    var categories = data.categories || {};
    var categoryCards = (categories.popular || categories.all || []).slice(0, 10).map(function (category) {
      return { name: category.name, image: category.image, url: category.url };
    });
    var productsForPopular = uniqueProductsFromSections(data, ["popular-this-month", "trending-products", "best-sellers"], 10);
    var popularItems = categoryCards.length ? categoryCards : productsForPopular;
    var topupProducts = uniqueProductsFromSections(data, ["fast-delivery-products", "hot-deals", "popular-this-week"], 8).filter(function (product) {
      var text = [product.name, product.brand, product.category && product.category.name, (product.tags || []).join(" ")].join(" ").toLowerCase();
      return /top|wallet|steam|playstation|itunes|gift|code|replenish|psn/.test(text);
    });
    if (!topupProducts.length) topupProducts = uniqueProductsFromSections(data, ["best-sellers", "trending-products"], 4);
    var best = uniqueProductsFromSections(data, ["best-sellers", "top-selling-today", "popular-this-month"], 8);

    qs("#platiPopularRail").innerHTML = popularItems.length ? popularItems.map(platiPopularCard).join("") : emptyState("Popular categories will appear after products are seeded.");
    qs("#platiTopupTabs").innerHTML = topupProducts.length ? topupProducts.slice(0, 4).map(function (product, index) {
      return '<button type="button" class="' + (index === 0 ? "active" : "") + '" data-topup-product="' + escapeHtml(product.id) + '">' + escapeHtml(product.brand || (product.category && product.category.name) || product.name.split(" ")[0]) + '</button>';
    }).join("") : '<span class="market-chip">No top-up products yet</span>';
    qs("#platiBestGrid").innerHTML = best.length ? best.map(platiBestCard).join("") : emptyState("Best sellers will appear after completed sales.");
  }

  function categoryCard(category) {
    function names(items) {
      return (items || []).map(function (item) { return item.name; }).filter(Boolean).slice(0, 2).join(", ") || "No active products";
    }
    return [
      '<article class="market-category-card">',
      '  <div class="market-category-card-head">',
      '    <img loading="lazy" src="' + escapeHtml(safeUrl(category.image)) + '" alt="' + escapeHtml(category.name) + '" onerror="this.src=\'/assets/images/default.png\'">',
      '    <div><h3>' + escapeHtml(category.name) + '</h3><a class="market-chip" href="' + escapeHtml(category.url || "products.html") + '"><i class="las la-arrow-right"></i> View all</a></div>',
      '    <span class="market-count">' + escapeHtml(compactNumber(category.productCount)) + '</span>',
      '  </div>',
      '  <div class="market-category-lists">',
      '    <div class="market-category-line"><b>Featured</b><span>' + escapeHtml(names(category.featuredProducts)) + '</span></div>',
      '    <div class="market-category-line"><b>Popular</b><span>' + escapeHtml(names(category.popularProducts)) + '</span></div>',
      '    <div class="market-category-line"><b>Latest</b><span>' + escapeHtml(names(category.latestProducts)) + '</span></div>',
      '    <div class="market-category-line"><b>Best sellers</b><span>' + escapeHtml(names(category.bestSellingProducts)) + '</span></div>',
      '    <div class="market-category-line"><b>Top rated</b><span>' + escapeHtml(names(category.topRatedProducts)) + '</span></div>',
      '  </div>',
      '</article>'
    ].join("");
  }

  function sellerCard(seller) {
    var initial = (seller.name || "S").charAt(0).toUpperCase();
    var avatar = seller.avatar ? '<img loading="lazy" src="' + escapeHtml(safeUrl(seller.avatar)) + '" alt="' + escapeHtml(seller.name) + '">' : escapeHtml(initial);
    return [
      '<a class="market-seller-card" href="' + escapeHtml(seller.url || "products.html") + '">',
      '  <span class="market-avatar">' + avatar + '</span>',
      '  <span><strong>' + escapeHtml(seller.name) + '</strong><span>' + (seller.verified ? "Verified seller" : "Active seller") + ' &middot; ' + escapeHtml(Number(seller.ratingAverage || 0).toFixed(1)) + ' rating</span></span>',
      '</a>'
    ].join("");
  }

  function reviewCard(review) {
    return [
      '<article class="market-review-card">',
      '  <div class="market-stars">' + escapeHtml(stars(review.rating)) + '</div>',
      '  <p>' + escapeHtml(review.comment || "Rated product") + '</p>',
      '  <strong>' + escapeHtml(review.buyerName || "Buyer") + '</strong>',
      '  <span>' + escapeHtml(review.productName || "Marketplace product") + '</span>',
      '</article>'
    ].join("");
  }

  function brandCard(brand) {
    return '<a class="market-brand-card" href="' + escapeHtml(brand.url || "products.html") + '"><strong>' + escapeHtml(brand.name) + '</strong><span>' + escapeHtml(compactNumber(brand.productCount)) + ' products</span></a>';
  }

  function renderStats(stats) {
    var rows = [
      ["Products", stats.products, "la-box-open"],
      ["Categories", stats.categories, "la-th-large"],
      ["Verified Sellers", stats.verifiedSellers, "la-user-check"],
      ["Completed Sales", stats.completedSales, "la-chart-bar"]
    ];
    qs("#marketStats").innerHTML = rows.map(function (row) {
      return '<div class="market-stat"><strong data-count="' + escapeHtml(row[1]) + '">0</strong><span><i class="las ' + row[2] + '"></i> ' + escapeHtml(row[0]) + '</span></div>';
    }).join("");
    animateCounters();
  }

  function renderHero(data) {
    var keywords = ((data.search && data.search.trendingKeywords) || (data.search && data.search.popularSearches) || []).slice(0, 8);
    qs("#marketHeroKeywords").innerHTML = keywords.length
      ? keywords.map(function (keyword) { return '<a class="market-chip" href="products.html?search=' + encodeURIComponent(keyword) + '"><i class="las la-hashtag"></i>' + escapeHtml(keyword) + '</a>'; }).join("")
      : '<span class="market-chip"><i class="las la-database"></i> Waiting for catalog signals</span>';

    var heroProducts = data.heroProducts || [];
    qs("#marketTicker").innerHTML = heroProducts.length
      ? heroProducts.slice(0, 3).map(function (product) {
        return '<a class="market-ticker-item" href="' + escapeHtml(product.url || "products.html") + '"><img loading="lazy" src="' + escapeHtml(safeUrl(product.image)) + '" alt="' + escapeHtml(product.name) + '"><span><strong>' + escapeHtml(product.name) + '</strong><br>' + escapeHtml(product.category && product.category.name || "Product") + '</span><b class="market-ticker-price">' + escapeHtml(formatMoney(product.price, product.currency)) + '</b></a>';
      }).join("")
      : emptyState("Active products will appear here.");

    qs("#marketHeroProducts").innerHTML = heroProducts.length
      ? heroProducts.slice(0, 4).map(function (product) {
        return '<a class="market-mini-product" href="' + escapeHtml(product.url || "products.html") + '"><img loading="lazy" src="' + escapeHtml(safeUrl(product.image)) + '" alt="' + escapeHtml(product.name) + '"><div><strong>' + escapeHtml(product.name) + '</strong><span>' + escapeHtml(formatMoney(product.price, product.currency)) + '</span></div></a>';
      }).join("")
      : emptyState("No active products are available yet.");
  }

  function renderCategories(data) {
    var categories = data.categories || {};
    qs("#marketCategoryStrip").innerHTML = (categories.all || []).length
      ? categories.all.map(function (category) {
        return '<a class="market-category-pill" href="' + escapeHtml(category.url || "products.html") + '"><img loading="lazy" src="' + escapeHtml(safeUrl(category.image)) + '" alt="' + escapeHtml(category.name) + '"><span><strong>' + escapeHtml(category.name) + '</strong><span>' + escapeHtml(compactNumber(category.productCount)) + ' products</span></span></a>';
      }).join("")
      : emptyState("No active categories are available yet.");

    qs("#marketFeaturedCategories").innerHTML = (categories.featured || []).length ? categories.featured.map(categoryCard).join("") : emptyState("No active categories are available yet.");
    qs("#marketPopularCategories").innerHTML = (categories.popular || []).length ? categories.popular.map(categoryCard).join("") : emptyState("No active categories are available yet.");
    qs("#marketCategoryHighlights").innerHTML = (categories.all || []).length ? categories.all.map(categoryCard).join("") : emptyState("No category highlights are available yet.");
  }

  function renderSections(data) {
    var container = qs("#marketProductSections");
    container.innerHTML = (data.sections || []).length
      ? data.sections.map(renderProductSection).join("")
      : '<section class="market-section"><div class="market-shell">' + emptyState("No active products are available yet.") + "</div></section>";
  }

  function renderSellersReviewsBrands(data) {
    var verified = data.sellers && data.sellers.verified ? data.sellers.verified : [];
    var premium = data.sellers && data.sellers.premium ? data.sellers.premium : [];
    var sellers = verified.length ? verified : premium;
    qs("#marketSellers").innerHTML = sellers.length ? sellers.map(sellerCard).join("") : emptyState("Verified sellers will appear after approval.");
    qs("#marketReviews").innerHTML = (data.reviews || []).length ? data.reviews.map(reviewCard).join("") : emptyState("Published customer reviews will appear here.");
    qs("#marketBrands").innerHTML = (data.brands || []).length ? data.brands.map(brandCard).join("") : emptyState("Brand records will appear when products include brand data.");
  }

  function renderKnowledge() {
    var cards = [
      ["Blog Articles", "Read existing marketplace posts and product updates.", "blog.html", "la-newspaper"],
      ["Knowledge Center", "Find answers, policies, and buyer guidance.", "faq.html", "la-book-open"],
      ["Marketplace News", "Follow catalog changes and platform notices.", "blog.html", "la-bullhorn"],
      ["Support", "Contact the hstockhub.com team for marketplace help.", "contact.html", "la-headset"]
    ];
    qs("#marketKnowledge").innerHTML = cards.map(function (card) {
      return '<a class="market-knowledge-card" href="' + card[2] + '"><i class="las ' + card[3] + '"></i><strong>' + escapeHtml(card[0]) + '</strong><span>' + escapeHtml(card[1]) + '</span></a>';
    }).join("");

    var faqs = [
      ["Are homepage products manually created?", "No. Product sections are rendered from active database products returned by the homepage API."],
      ["How are categories displayed?", "Every active category is shown with product counts and live product highlights."],
      ["What happens when data changes?", "The API rebuilds the page payload from products, categories, sellers, ratings, stock, wishlists, and orders."]
    ];
    qs("#marketFaqs").innerHTML = faqs.map(function (faq) {
      return '<article class="market-faq-card"><strong>' + escapeHtml(faq[0]) + '</strong><p>' + escapeHtml(faq[1]) + '</p></article>';
    }).join("");
  }

  function indexProducts(data) {
    state.productsById = new Map();
    (data.sections || []).forEach(function (section) {
      (section.items || []).forEach(function (product) { state.productsById.set(product.id, product); });
    });
    (data.heroProducts || []).forEach(function (product) { state.productsById.set(product.id, product); });
    if (data.search && data.search.products) {
      data.search.products.forEach(function (product) { if (!state.productsById.has(product.id)) state.productsById.set(product.id, product); });
    }
  }

  function renderAll(data) {
    state.data = data;
    indexProducts(data);
    renderStats(data.stats || {});
    renderHero(data);
    renderCategories(data);
    renderMarketplaceShowcase(data);
    renderPlatiInspired(data);
    renderSections(data);
    renderSellerShowcase(data);
    renderSellersReviewsBrands(data);
    renderKnowledge();
    updateCategoryMenus(data);
    setupActions();
    setupSearchSuggestions();
  }

  function fallbackData(productsResponse, categoriesResponse) {
    var categories = (categoriesResponse.categories || []).map(function (category) {
      return {
        id: category._id,
        name: category.name,
        slug: category.slug,
        image: category.image || "/assets/images/default.png",
        url: "products.html?category=" + encodeURIComponent(category._id),
        productCount: 0,
        featuredProducts: [],
        popularProducts: [],
        latestProducts: [],
        bestSellingProducts: [],
        topRatedProducts: []
      };
    });
    var products = (productsResponse.products || []).map(function (product) {
      return {
        id: product._id,
        name: product.name,
        url: "products.html?search=" + encodeURIComponent(product.name || ""),
        image: product.images && product.images[0] || (product.category && product.category.image) || "/assets/images/default.png",
        category: product.category ? { id: product.category._id, name: product.category.name, url: "products.html?category=" + encodeURIComponent(product.category._id) } : null,
        seller: { name: "Seller", verified: false },
        price: product.price,
        currency: product.currency || "CNY",
        ratingAverage: product.ratingAverage || 0,
        reviewCount: product.ratingCount || 0,
        salesCount: product.salesCount || 0,
        views: product.viewCount || 0,
        stockCount: product.stockCount || 0,
        stockStatus: product.stockCount > 0 ? "In stock" : "Out of stock",
        deliveryTime: product.deliveryType === "manual" ? "Manual delivery" : "Instant digital delivery",
        badges: product.salesCount ? ["Best Seller"] : []
      };
    });
    categories.forEach(function (category) {
      var own = products.filter(function (product) { return product.category && product.category.id === category.id; });
      category.productCount = own.length;
      category.featuredProducts = own.slice(0, 3);
      category.popularProducts = own.slice(0, 3);
      category.latestProducts = own.slice(0, 3);
      category.bestSellingProducts = own.slice(0, 3);
      category.topRatedProducts = own.slice(0, 3);
    });
    return {
      stats: { products: products.length, categories: categories.length, verifiedSellers: 0, completedSales: products.reduce(function (sum, product) { return sum + Number(product.salesCount || 0); }, 0) },
      heroProducts: products.slice(0, 4),
      categories: { all: categories, featured: categories.slice(0, 12), popular: categories.slice(0, 18) },
      sections: [{ key: "active-products", title: "Active Products", subtitle: "Fallback product data from the public products API.", icon: "la-box", items: products }],
      sellers: { verified: [], premium: [] },
      brands: [],
      reviews: [],
      search: { popularSearches: categories.map(function (category) { return category.name; }).slice(0, 10), trendingKeywords: [], categories: categories, sellers: [], products: products }
    };
  }

  function loadHomepage() {
    return fetch("/api/homepage", { credentials: "same-origin" })
      .then(function (response) {
        if (!response.ok) throw new Error("homepage api");
        return response.json();
      })
      .catch(function () {
        return Promise.all([
          fetch("/api/products?limit=100", { credentials: "same-origin" }).then(function (response) { return response.ok ? response.json() : { products: [] }; }),
          fetch("/api/categories", { credentials: "same-origin" }).then(function (response) { return response.ok ? response.json() : { categories: [] }; })
        ]).then(function (responses) { return fallbackData(responses[0], responses[1]); });
      });
  }

  function animateCounters() {
    qsa("[data-count]").forEach(function (node) {
      var target = Number(node.getAttribute("data-count") || 0);
      var start = performance.now();
      function tick(now) {
        var progress = Math.min(1, (now - start) / 900);
        node.textContent = compactNumber(target * progress);
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  function startCountdown() {
    var node = qs("#marketCountdown");
    if (!node) return;
    function update() {
      var now = new Date();
      var end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      var seconds = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
      var hours = Math.floor(seconds / 3600);
      var minutes = Math.floor((seconds % 3600) / 60);
      var secs = seconds % 60;
      node.textContent = [hours, minutes, secs].map(function (value) { return String(value).padStart(2, "0"); }).join(":");
    }
    update();
    window.setInterval(update, 1000);
  }

  function setupActions() {
    qsa("[data-action]").forEach(function (button) {
      if (button.dataset.bound) return;
      button.dataset.bound = "true";
      button.addEventListener("click", function (event) {
        var action = button.getAttribute("data-action");
        var id = button.getAttribute("data-product-id");
        if (action === "wishlist") {
          event.preventDefault();
          var active = toggleStorageList("hstockhub_wishlist_product_ids", id);
          button.classList.toggle("active", active);
        }
        if (action === "compare") {
          event.preventDefault();
          var compared = toggleStorageList("hstockhub_compare_product_ids", id);
          button.classList.toggle("active", compared);
        }
        if (action === "quick") {
          event.preventDefault();
          openQuickView(id);
        }
        if (action === "close-modal") {
          closeQuickView();
        }
      });
    });

    qsa("[data-topup-product]").forEach(function (button) {
      if (button.dataset.topupBound) return;
      button.dataset.topupBound = "true";
      button.addEventListener("click", function () {
        qsa("[data-topup-product]").forEach(function (item) { item.classList.toggle("active", item === button); });
      });
    });

    qsa(".plati-amounts [data-amount]").forEach(function (button) {
      if (button.dataset.amountBound) return;
      button.dataset.amountBound = "true";
      button.addEventListener("click", function () {
        var form = button.closest("form");
        var input = form && qs("input[name=amount]", form);
        if (input) input.value = button.getAttribute("data-amount") || "";
        qsa(".plati-amounts [data-amount]", form).forEach(function (item) { item.classList.toggle("active", item === button); });
      });
    });

    qsa("[data-scroll-target]").forEach(function (button) {
      if (button.dataset.scrollBound) return;
      button.dataset.scrollBound = "true";
      button.addEventListener("click", function () {
        var target = qs("#" + button.getAttribute("data-scroll-target"));
        if (!target) return;
        var direction = Number(button.getAttribute("data-scroll-dir") || 1);
        target.scrollBy({ left: direction * Math.max(280, target.clientWidth * 0.8), behavior: "smooth" });
      });
    });
  }

  function openQuickView(id) {
    var product = state.productsById.get(id);
    if (!product) return;
    rememberViewedProduct(id);
    qs("#marketQuickTitle").textContent = product.name;
    qs("#marketQuickBody").innerHTML = [
      '<img loading="lazy" src="' + escapeHtml(safeUrl(product.image)) + '" alt="' + escapeHtml(product.name) + '">',
      '<div>',
      '<p class="market-section-kicker"><i class="las la-box"></i> ' + escapeHtml(product.category && product.category.name || "Product") + '</p>',
      '<h2>' + escapeHtml(product.name) + '</h2>',
      '<div class="market-price-row"><span class="market-price">' + escapeHtml(formatMoney(product.price, product.currency)) + '</span>' + (product.originalPrice ? '<span class="market-original-price">' + escapeHtml(formatMoney(product.originalPrice, product.currency)) + '</span>' : "") + (product.discountPercent ? '<span class="market-discount">-' + escapeHtml(product.discountPercent) + '%</span>' : "") + '</div>',
      '<p>' + escapeHtml(product.description || "No product description is available.") + '</p>',
      '<div class="market-metric-grid"><div class="market-metric"><strong>' + escapeHtml(Number(product.ratingAverage || 0).toFixed(1)) + '</strong><span>rating</span></div><div class="market-metric"><strong>' + escapeHtml(compactNumber(product.salesCount)) + '</strong><span>sales</span></div><div class="market-metric"><strong>' + escapeHtml(compactNumber(product.stockCount)) + '</strong><span>stock</span></div></div>',
      '<p class="market-seller-row"><span>' + escapeHtml(product.seller && product.seller.name || "Seller") + '</span>' + (product.seller && product.seller.verified ? '<b class="market-verified"><i class="las la-check-circle"></i> Verified</b>' : "") + '</p>',
      '<div class="market-app-actions"><a class="market-button" href="' + escapeHtml(product.url || "products.html") + '"><i class="las la-shopping-cart"></i> View Product</a><button class="market-button secondary" type="button" data-action="compare" data-product-id="' + escapeHtml(product.id) + '"><i class="las la-balance-scale"></i> Compare</button></div>',
      '</div>'
    ].join("");
    qs("#marketQuickView").classList.add("open");
    setupActions();
  }

  function closeQuickView() {
    var modal = qs("#marketQuickView");
    if (modal) modal.classList.remove("open");
  }

  function updateCategoryMenus(data) {
    var categories = data.search && data.search.categories ? data.search.categories : [];
    if (!categories.length) return;
    qsa(".header-v2__search-cat-menu").forEach(function (menu) {
      menu.innerHTML = '<div class="header-v2__search-cat-item active" data-value="">All categories</div>' + categories.map(function (category) {
        return '<div class="header-v2__search-cat-item" data-value="' + escapeHtml(category.id) + '">' + escapeHtml(category.name) + '</div>';
      }).join("");
      qsa(".header-v2__search-cat-item", menu).forEach(function (item) {
        item.addEventListener("click", function () {
          var form = item.closest("form");
          var dropdown = item.closest(".header-v2__search-cat-dropdown");
          var valueNode = form && qs(".search-cat-value", form);
          var labelNode = dropdown && qs(".search-cat-label", dropdown);
          qsa(".header-v2__search-cat-item", menu).forEach(function (option) { option.classList.remove("active"); });
          item.classList.add("active");
          if (valueNode) valueNode.value = item.getAttribute("data-value") || "";
          if (labelNode) labelNode.textContent = item.textContent.trim() || "All";
          if (dropdown) dropdown.classList.remove("open");
        });
      });
    });
  }

  function setupSearchSuggestions() {
    if (!state.suggestPanel) {
      state.suggestPanel = document.createElement("div");
      state.suggestPanel.className = "market-suggest";
      document.body.appendChild(state.suggestPanel);
    }

    var inputs = qsa(".search-form-v2 input[name=search]").concat(qsa("#marketHeroInput"));
    inputs.forEach(function (input) {
      if (input.dataset.marketSuggestBound) return;
      input.dataset.marketSuggestBound = "true";
      input.addEventListener("input", function () { showSuggestions(input); });
      input.addEventListener("focus", function () { showSuggestions(input); });
      input.addEventListener("keydown", function (event) {
        if (event.key === "Escape") state.suggestPanel.classList.remove("open");
      });
    });

    qsa(".search-form-v2, #marketHeroSearch").forEach(function (form) {
      if (form.dataset.marketSubmitBound) return;
      form.dataset.marketSubmitBound = "true";
      form.addEventListener("submit", function () {
        var input = qs("input[name=search]", form);
        storeRecentSearch(input && input.value);
      }, true);
    });

    document.addEventListener("click", function (event) {
      if (!event.target.closest(".market-suggest") && !event.target.matches("input[name=search], #marketHeroInput")) {
        state.suggestPanel.classList.remove("open");
      }
    });
  }

  function showSuggestions(input) {
    if (!state.data || !state.suggestPanel) return;
    var value = String(input.value || "").trim().toLowerCase();
    var search = state.data.search || {};
    var products = (search.products || []).filter(function (product) {
      return !value || String(product.name || "").toLowerCase().indexOf(value) >= 0;
    }).slice(0, 6);
    var categories = (search.categories || []).filter(function (category) {
      return !value || String(category.name || "").toLowerCase().indexOf(value) >= 0;
    }).slice(0, 5);
    var sellers = (search.sellers || []).filter(function (seller) {
      return !value || String(seller.name || "").toLowerCase().indexOf(value) >= 0;
    }).slice(0, 4);
    var keywords = (value ? search.popularSearches || [] : getRecentSearches().concat(search.popularSearches || [])).filter(function (keyword, index, list) {
      return keyword && list.indexOf(keyword) === index && (!value || keyword.toLowerCase().indexOf(value) >= 0);
    }).slice(0, 8);

    state.suggestPanel.innerHTML = [
      suggestSection("Products", products.map(function (product) {
        return { label: product.name, image: product.image, meta: formatMoney(product.price, product.currency), url: product.url || "products.html?search=" + encodeURIComponent(product.name || "") };
      })),
      suggestSection("Categories", categories.map(function (category) {
        return { label: category.name, image: "/assets/images/default.png", meta: "Category", url: category.url || "products.html?category=" + encodeURIComponent(category.id) };
      })),
      suggestSection("Sellers", sellers.map(function (seller) {
        return { label: seller.name, image: "/assets/images/default.png", meta: "Seller", url: seller.url || "products.html?seller=" + encodeURIComponent(seller.id) };
      })),
      suggestSection(value ? "Trending Keywords" : "Recent Searches", keywords.map(function (keyword) {
        return { label: keyword, image: "/assets/images/default.png", meta: "Search", url: "products.html?search=" + encodeURIComponent(keyword) };
      }))
    ].join("");

    var rect = input.getBoundingClientRect();
    state.suggestPanel.style.left = Math.max(16, rect.left) + "px";
    state.suggestPanel.style.top = (rect.bottom + window.scrollY + 8) + "px";
    state.suggestPanel.classList.add("open");
  }

  function suggestSection(title, items) {
    if (!items.length) return "";
    return '<div class="market-suggest-section"><div class="market-suggest-title">' + escapeHtml(title) + '</div>' + items.map(function (item) {
      return '<a class="market-suggest-item" href="' + escapeHtml(item.url) + '"><img loading="lazy" src="' + escapeHtml(safeUrl(item.image)) + '" alt=""><strong>' + escapeHtml(item.label) + '</strong><span>' + escapeHtml(item.meta || "") + '</span></a>';
    }).join("") + "</div>";
  }

  function setupForms() {
    var hero = qs("#marketHeroSearch");
    if (hero) {
      hero.addEventListener("submit", function (event) {
        event.preventDefault();
        var input = qs("#marketHeroInput", hero);
        var term = input ? input.value.trim() : "";
        storeRecentSearch(term);
        window.location.href = "products.html?search=" + encodeURIComponent(term);
      });
    }

    var newsletter = qs("#marketNewsletter");
    if (newsletter) {
      newsletter.addEventListener("submit", function (event) {
        event.preventDefault();
        var button = qs("button", newsletter);
        if (button) button.innerHTML = '<i class="las la-check"></i> Subscribed';
      });
    }

    var install = qs("#marketInstallApp");
    if (install) {
      install.addEventListener("click", function () {
        if (state.installPrompt) {
          state.installPrompt.prompt();
          state.installPrompt = null;
        } else {
          window.location.href = "products.html";
        }
      });
    }

    var topup = qs("#platiTopupForm");
    if (topup) {
      topup.addEventListener("submit", function (event) {
        event.preventDefault();
        var active = qs("[data-topup-product].active");
        var product = active && state.productsById.get(active.getAttribute("data-topup-product"));
        window.location.href = product && product.url ? product.url : "products.html?search=top-up";
      });
    }
  }

  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    state.installPrompt = event;
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeQuickView();
  });

  document.addEventListener("DOMContentLoaded", function () {
    var main = qs("#main");
    if (!main) return;
    main.className = "market-home marketplace-home-ready";
    main.innerHTML = shell();
    renderFooter();
    setupForms();
    startCountdown();
    loadHomepage()
      .then(renderAll)
      .catch(function () {
        renderAll(fallbackData({ products: [] }, { categories: [] }));
      });
  });
})();
