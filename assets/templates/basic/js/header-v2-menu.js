(function () {
  "use strict";

  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function qsa(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  function closeSearchDropdowns(except) {
    qsa(".header-v2__search-cat-dropdown").forEach(function (dropdown) {
      if (dropdown !== except) dropdown.classList.remove("open");
    });
  }

  function closeMobileMenu() {
    var menu = qs("#mobileMenu");
    var overlay = qs("#mobileOverlay");
    if (menu) menu.classList.remove("open");
    if (overlay) overlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  function openMobileMenu() {
    var menu = qs("#mobileMenu");
    var overlay = qs("#mobileOverlay");
    if (menu) menu.classList.add("open");
    if (overlay) overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function positionCategoryFlyout(toggle, flyout) {
    if (!toggle || !flyout) return;
    var rect = toggle.getBoundingClientRect();
    var gap = 8;
    var maxHeight = Math.max(window.innerHeight - rect.bottom - gap - 16, 220);

    if (window.innerWidth <= 575) {
      flyout.style.top = rect.bottom + gap + "px";
    } else {
      flyout.style.top = "";
    }
    flyout.style.maxHeight = maxHeight + "px";
  }

  document.addEventListener("DOMContentLoaded", function () {
    qsa(".search-form-v2").forEach(function (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var keywordInput = qs("input[name=search]", form);
        var categoryInput = qs(".search-cat-value", form);
        var keyword = keywordInput ? keywordInput.value : "";
        var category = categoryInput ? categoryInput.value : "";
        var url = "products.html?search=" + encodeURIComponent(keyword);
        if (category) url += "&category=" + encodeURIComponent(category);
        window.location.href = url;
      });
    });

    qsa(".header-v2__search-cat-btn").forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        var dropdown = button.closest(".header-v2__search-cat-dropdown");
        closeSearchDropdowns(dropdown);
        if (dropdown) dropdown.classList.toggle("open");
      });
    });

    qsa(".header-v2__search-cat-item").forEach(function (item) {
      item.addEventListener("click", function () {
        var dropdown = item.closest(".header-v2__search-cat-dropdown");
        var form = item.closest("form");
        var value = item.getAttribute("data-value") || "";
        var label = value ? item.textContent.trim() : "Tat ca";
        if (!dropdown || !form) return;

        qsa(".header-v2__search-cat-item", dropdown).forEach(function (option) {
          option.classList.remove("active");
        });
        item.classList.add("active");

        var labelNode = qs(".search-cat-label", dropdown);
        var valueNode = qs(".search-cat-value", form);
        if (labelNode) labelNode.textContent = label;
        if (valueNode) valueNode.value = value;
        dropdown.classList.remove("open");
      });
    });

    var menuToggle = qs("#mobileMenuToggle");
    var menuClose = qs("#mobileMenuClose");
    var overlay = qs("#mobileOverlay");
    if (menuToggle) menuToggle.addEventListener("click", openMobileMenu);
    if (menuClose) menuClose.addEventListener("click", closeMobileMenu);
    if (overlay) overlay.addEventListener("click", closeMobileMenu);

    qsa(".header-v2__mobile-accordion-toggle").forEach(function (toggle) {
      toggle.addEventListener("click", function () {
        var accordion = toggle.closest(".header-v2__mobile-accordion");
        var wasOpen = accordion && accordion.classList.contains("open");
        qsa(".header-v2__mobile-accordion").forEach(function (item) {
          item.classList.remove("open");
        });
        if (accordion && !wasOpen) accordion.classList.add("open");
      });
    });

    var categoryToggle = qs("#mobileCategoryToggle");
    var categoryFlyout = qs("#mobileCategoryFlyout");
    if (categoryToggle && categoryFlyout) {
      categoryToggle.addEventListener("click", function (event) {
        event.stopPropagation();
        if (!categoryFlyout.classList.contains("show")) {
          positionCategoryFlyout(categoryToggle, categoryFlyout);
        }
        categoryFlyout.classList.toggle("show");
      });
    }

    qsa(".header-v2__mobile-cat-item.has-children > .header-v2__mobile-cat-link").forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        var item = link.closest(".header-v2__mobile-cat-item");
        var wasOpen = item && item.classList.contains("open");
        qsa(".header-v2__mobile-cat-item.has-children").forEach(function (sibling) {
          if (sibling.parentElement === item.parentElement) sibling.classList.remove("open");
        });
        if (item) item.classList.toggle("open", !wasOpen);
      });
    });

    qsa(".mega-parent").forEach(function (parent) {
      parent.addEventListener("mouseenter", function () {
        var idx = parent.getAttribute("data-idx");
        qsa(".mega-parent").forEach(function (item) {
          item.classList.remove("active");
        });
        parent.classList.add("active");
        qsa(".mega-panel").forEach(function (panel) {
          panel.classList.remove("active");
        });
        var panel = idx !== null ? qs('.mega-panel[data-idx="' + idx + '"]') : null;
        var right = qs(".mega-right");
        if (panel) {
          panel.classList.add("active");
          if (right) right.style.display = "";
        } else if (right) {
          right.style.display = "none";
        }
      });
    });

    qsa(".header-v2__mobile-locale-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        var target = tab.getAttribute("data-locale-tab");
        var container = tab.closest(".header-v2__mobile-locale");
        if (!container) return;
        qsa(".header-v2__mobile-locale-tab", container).forEach(function (item) {
          item.classList.remove("active");
        });
        tab.classList.add("active");
        qsa(".header-v2__mobile-locale-panel", container).forEach(function (panel) {
          panel.classList.toggle("active", panel.getAttribute("data-locale-panel") === target);
        });
      });
    });

    document.addEventListener("click", function (event) {
      if (!event.target.closest(".header-v2__search-cat-dropdown")) closeSearchDropdowns();
      if (!event.target.closest(".header-v2__mobile-category-trigger") && categoryFlyout) {
        categoryFlyout.classList.remove("show");
      }

      var languageItem = event.target.closest(".header-v2__lang-item, .header-v2__mobile-lang-item");
      if (languageItem && languageItem.dataset.url) {
        window.location.href = languageItem.dataset.url;
      }

      var authLink = event.target.closest(".auth-modal-trigger");
      if (authLink && typeof window.openAuthModal === "function") {
        event.preventDefault();
        closeMobileMenu();
        window.openAuthModal(authLink.getAttribute("data-tab") || "login");
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMobileMenu();
        closeSearchDropdowns();
        if (categoryFlyout) categoryFlyout.classList.remove("show");
      }
    });
  });
})();
