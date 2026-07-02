const sanitizeHtml = require('sanitize-html');
const env = require('../config/env');

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function safeHtml(value) {
  return sanitizeHtml(String(value || ''), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['form', 'input', 'button', 'label', 'select', 'option', 'textarea', 'small']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      '*': ['class', 'id', 'name', 'type', 'value', 'href', 'method', 'action', 'placeholder', 'min', 'max', 'checked', 'selected'],
      form: ['method', 'action'],
      input: ['name', 'type', 'value', 'placeholder', 'min', 'max', 'checked'],
      button: ['type', 'class']
    }
  });
}

function layout({ title, req, body, role = null }) {
  const user = req.user;
  const csrf = req.csrfToken ? `<input type="hidden" name="_csrf" value="${escapeHtml(req.csrfToken())}">` : '';
  const dashboard = user ? `/${user.role}/dashboard` : '/auth/buyer/login';
  const adminLink = user && user.role === 'admin' ? `<a href="${env.adminPath}/dashboard">Admin</a>` : '';
  const nav = user
    ? `<a href="/">Public site</a><a href="${dashboard}">Dashboard</a>${adminLink}<form method="post" action="/auth/logout" class="inline">${csrf}<button>Logout</button></form>`
    : `<a href="/">Home</a><a href="/products.html">Products</a><a href="/categories.html">Categories</a><a href="/about.html">About</a><a href="/contact.html">Contact</a><a href="/auth/buyer/login">Login</a><a href="/auth/buyer/register">Register</a>`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="csrf-token" content="${req.csrfToken ? escapeHtml(req.csrfToken()) : ''}"><title>${escapeHtml(title)}</title><style>
    body{margin:0;background:#f8fafc;color:#0f172a;font-family:Inter,Arial,sans-serif}.nav{background:#fff;border-bottom:1px solid #e2e8f0}.wrap{max-width:1180px;margin:0 auto;padding:22px 16px}.nav .wrap{display:flex;justify-content:space-between;align-items:center;gap:12px}.nav a,.inline button{margin-left:10px;color:#006fff;text-decoration:none;font-weight:700;background:transparent;border:0;cursor:pointer}.inline{display:inline}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}.card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:18px;margin:14px 0;box-shadow:0 10px 24px rgba(15,23,42,.05)}label{display:block;margin:10px 0 5px;font-weight:700}input,select,textarea{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:10px;font:inherit}button,.btn{border:0;border-radius:10px;background:#006fff;color:#fff;padding:10px 14px;font-weight:800;text-decoration:none;display:inline-block;margin-top:10px}.danger{background:#dc2626}.muted{color:#64748b}.bad{color:#b91c1c}.ok{color:#047857}table{width:100%;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:top}code{white-space:pre-wrap;word-break:break-word;background:#f1f5f9;border-radius:8px;padding:6px;display:block}@media(max-width:700px){.nav .wrap{display:block}.nav a,.inline button{margin:8px 8px 0 0;display:inline-block}}
  </style></head><body><div class="nav"><div class="wrap"><strong>hstockhub.com Secure Platform</strong><div>${nav}</div></div></div><main class="wrap">${safeHtml(body)}</main></body></html>`;
}

module.exports = { escapeHtml, layout };