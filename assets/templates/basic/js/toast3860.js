/*!
 * 全局轻量 Toast —— 替代散落各处的原生 alert()。
 * 无依赖、品牌色(#006fff)、右上角堆叠、自动消失。
 * 用法:window.$toast('已保存')  /  window.$toast('提现失败','error')
 * 未指定 type 时按文案智能推断(成功/错误/普通)。
 */
(function () {
  if (window.$toast) return;

  var box = null;
  function ensureBox() {
    if (box && document.body.contains(box)) return box;
    box = document.createElement('div');
    box.id = 'global-toast-box';
    box.style.cssText =
      'position:fixed;top:16px;right:16px;z-index:99999;display:flex;flex-direction:column;' +
      'gap:8px;pointer-events:none;max-width:min(92vw,360px)';
    document.body.appendChild(box);
    return box;
  }

  var THEME = {
    success: { bd: '#16a34a', bg: '#ecfdf5', tx: '#15803d', ic: '✓' },
    error:   { bd: '#dc2626', bg: '#fef2f2', tx: '#b91c1c', ic: '✕' },
    warning: { bd: '#d97706', bg: '#fffbeb', tx: '#b45309', ic: '!' },
    info:    { bd: '#006fff', bg: '#eff6ff', tx: '#0058d9', ic: 'i' }
  };

  function infer(msg) {
    var s = String(msg || '');
    if (/成功|已提交|已复制|已保存|已完成|完成|提交成功/.test(s)) return 'success';
    if (/失败|错误|无效|超过|不足|请输入|请选择|不可|已被|超出|不能|未/.test(s)) return 'error';
    return 'info';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  window.$toast = function (msg, type, duration) {
    type = THEME[type] ? type : infer(msg);
    duration = duration || 3200;
    var t = THEME[type];

    var el = document.createElement('div');
    el.style.cssText =
      'pointer-events:auto;display:flex;align-items:flex-start;gap:8px;background:' + t.bg +
      ';border:1px solid ' + t.bd + ';border-left:3px solid ' + t.bd +
      ';border-radius:8px;padding:10px 14px;font-size:.86rem;color:#1e293b;' +
      'box-shadow:0 4px 16px rgba(0,0,0,.10);opacity:0;transform:translateX(20px);' +
      'transition:opacity .2s ease,transform .2s ease';
    el.innerHTML =
      '<span style="flex-shrink:0;width:18px;height:18px;border-radius:50%;background:' + t.bd +
      ';color:#fff;font-size:.7rem;font-weight:700;display:inline-flex;align-items:center;' +
      'justify-content:center;margin-top:1px">' + t.ic + '</span>' +
      '<span style="line-height:1.5;word-break:break-word">' + esc(msg) + '</span>';

    ensureBox().appendChild(el);
    requestAnimationFrame(function () {
      el.style.opacity = '1';
      el.style.transform = 'translateX(0)';
    });
    setTimeout(function () {
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 220);
    }, duration);
  };
})();
