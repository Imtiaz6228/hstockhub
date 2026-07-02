/*!
 * 运行时多语言 (i18n-runtime) — 给 Vue 渲染的页面用。
 * 只在 en/vn 下运行;扫描页面中文文本/占位符,查/取译文就地替换。
 * - 已缓存的秒回;未命中的丢后台翻译,本页会自动轮询几次把翻好的取回来(无需手动刷新)。
 * - 中文(zh)用户不加载本脚本,零开销。跳过 <script>/<style>/<code>/<textarea>/[data-no-i18n]。
 */
(function () {
  var LANG = (window.__I18N_LANG__ || '').toLowerCase();
  if (!LANG || LANG === 'zh' || LANG === 'zh-cn' || LANG === 'zh-hans') return;

  var ENDPOINT = '/api/i18n/batch';
  var CJK = /[一-鿿]/;                 // ★ 用 unicode 转义,不依赖文件字符集
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, CODE: 1, PRE: 1, TEXTAREA: 1, NOSCRIPT: 1, KBD: 1, SAMP: 1 };
  var CKEY = 'i18nrt_' + LANG;

  var dict = {};
  try { dict = JSON.parse(sessionStorage.getItem(CKEY) || '{}') || {}; } catch (e) { dict = {}; }
  var inflight = {};         // 正在请求中的串
  var saveTimer, scanTimer, applying = false;

  function skip(el) {
    while (el && el.nodeType === 1 && el !== document.body) {
      if (SKIP_TAGS[el.tagName]) return true;
      if (el.hasAttribute && el.hasAttribute('data-no-i18n')) return true;
      el = el.parentNode;
    }
    return false;
  }

  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { sessionStorage.setItem(CKEY, JSON.stringify(dict)); } catch (e) {}
    }, 800);
  }

  // 遍历:apply=true 时就地替换已知译文;返回未知中文串
  function walk(apply) {
    var miss = {};
    applying = true;
    try {
      var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      var n;
      while ((n = w.nextNode())) {
        var raw = n.nodeValue;
        if (!raw || !CJK.test(raw)) continue;
        if (skip(n.parentNode)) continue;
        var key = raw.trim();
        if (!key) continue;
        if (dict[key]) {
          if (apply && raw.indexOf(key) >= 0) n.nodeValue = raw.replace(key, dict[key]);
        } else if (!inflight[key]) {
          miss[key] = 1;
        }
      }
      var els = document.body.querySelectorAll('[placeholder],[title],[aria-label]');
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        if (skip(el)) continue;
        ['placeholder', 'title', 'aria-label'].forEach(function (a) {
          var v = el.getAttribute(a);
          if (!v || !CJK.test(v)) return;
          var k = v.trim();
          if (dict[k]) { if (apply) el.setAttribute(a, dict[k]); }
          else if (!inflight[k]) miss[k] = 1;
        });
      }
    } finally { applying = false; }
    return Object.keys(miss);
  }

  function fetchBatch(list, attempt) {
    attempt = attempt || 0;
    for (var i = 0; i < list.length; i += 120) {
      (function (chunk) {
        chunk.forEach(function (k) { inflight[k] = 1; });
        fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: JSON.stringify({ lang: LANG, items: chunk })
        })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (d) {
            chunk.forEach(function (k) { delete inflight[k]; });
            if (!d) return;
            var got = false;
            var tr = d.translations || {};
            for (var k in tr) { if (tr[k]) { dict[k] = tr[k]; got = true; } }
            if (got) { persist(); walk(true); }
            // 还有没翻好的(后台正在翻)→ 过几秒再来取,无需手动刷新
            var still = chunk.filter(function (k) { return !dict[k]; });
            if (still.length && (d.pending > 0) && attempt < 4) {
              setTimeout(function () { fetchBatch(still, attempt + 1); }, 2500 + attempt * 2500);
            }
          })
          .catch(function () { chunk.forEach(function (k) { delete inflight[k]; }); });
      })(list.slice(i, i + 120));
    }
  }

  function run() {
    var miss = walk(true);
    if (miss.length) fetchBatch(miss, 0);
  }

  function schedule() {
    if (applying) return;
    clearTimeout(scanTimer);
    scanTimer = setTimeout(run, 150);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();

  try {
    var mo = new MutationObserver(function () { if (!applying) schedule(); });
    mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  } catch (e) {}
})();
