
(function(){
  function qs(s,root){return (root||document).querySelector(s)}
  function qsa(s,root){return Array.prototype.slice.call((root||document).querySelectorAll(s))}
  function toast(msg){var n=document.createElement('div');n.textContent=msg;n.style.cssText='position:fixed;right:18px;bottom:18px;background:#0f172a;color:#fff;padding:12px 14px;border-radius:12px;box-shadow:0 12px 28px rgba(15,23,42,.25);z-index:9999;font-weight:700';document.body.appendChild(n);setTimeout(function(){n.remove()},2600)}
  qsa('[data-demo-submit]').forEach(function(form){form.addEventListener('submit',function(e){e.preventDefault();toast(form.getAttribute('data-success')||'Demo saved. Connect this form to your backend API to persist changes.');});});
  qsa('[data-tab-target]').forEach(function(btn){btn.addEventListener('click',function(){var group=btn.closest('[data-tabs]'); if(!group) return; qsa('[data-tab-target]',group).forEach(function(b){b.classList.toggle('active',b===btn)}); qsa('[data-tab-panel]',group).forEach(function(p){p.classList.toggle('hy-hidden',p.getAttribute('data-tab-panel')!==btn.getAttribute('data-tab-target'))});});});
  var role=qs('[name="role"]'); var sellerBox=qs('[data-seller-fields]'); if(role&&sellerBox){function sync(){sellerBox.classList.toggle('hy-hidden',role.value!=='seller')} role.addEventListener('change',sync); sync();}
})();
