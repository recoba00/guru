/*!
 * core.js — 공통 유틸 (React 이식 시 hooks/utils 로 대체)
 */
(function (window) {
  'use strict';

  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) { return ESC[ch]; });
  }

  function qs(selector, scope) { return (scope || document).querySelector(selector); }
  function qsa(selector, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(selector)); }

  function getParam(name, fallback) {
    var value = new URLSearchParams(window.location.search).get(name);
    return value == null || value === '' ? fallback : value;
  }

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  /* 화면 이동: 현재 URL 의 state/dev 같은 쿼리는 유지하지 않고 깔끔하게 이동 */
  function navigate(url, options) {
    if (options && options.replace) window.location.replace(url);
    else window.location.href = url;
  }

  /* ---------- Toast ---------- */
  var Toast = (function () {
    var LEAVE_MS = 260;     // CSS .toast.is-leaving 시간과 맞춤
    var region = null;
    var current = null;
    var hideTimer = null;
    var showTimer = null;

    function ensureRegion() {
      if (region) return region;
      region = document.createElement('div');
      region.className = 'toast-region';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      document.body.appendChild(region);
      return region;
    }

    function hide(toast) {
      if (!toast || toast.classList.contains('is-leaving')) return;
      toast.classList.remove('is-visible');
      toast.classList.add('is-leaving');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, LEAVE_MS + 40);
      if (current === toast) current = null;
    }

    function enter(message, duration) {
      var el = ensureRegion();
      var toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = message;
      el.appendChild(toast);
      current = toast;
      // 첫 프레임을 그린 뒤 클래스를 붙여야 등장 애니메이션이 재생됨
      toast.getBoundingClientRect();
      requestAnimationFrame(function () { toast.classList.add('is-visible'); });
      if (duration !== Infinity) {
        hideTimer = setTimeout(function () { hide(toast); }, duration);
      }
    }

    function show(message, options) {
      var duration = (options && options.duration) || 2500;
      clearTimeout(hideTimer);
      clearTimeout(showTimer);
      if (current) {
        // 이미 떠 있으면 자연스럽게 사라진 뒤 새 토스트 표시
        hide(current);
        showTimer = setTimeout(function () { enter(message, duration); }, LEAVE_MS - 60);
      } else {
        enter(message, duration);
      }
    }

    return { show: show, hide: function () { clearTimeout(hideTimer); hide(current); } };
  })();

  /* ---------- 스크롤 위치 감지: 맨 위가 아니면 html.is-scrolled ---------- */
  (function watchScrollTop() {
    var root = document.documentElement;
    var ticking = false;
    function update() {
      ticking = false;
      var scrolled = (window.scrollY || root.scrollTop) > 0;
      root.classList.toggle('is-scrolled', scrolled);
    }
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener('pageshow', update);
    update();
  })();

  window.PB = window.PB || {};
  window.PB.core = {
    escapeHtml: escapeHtml,
    qs: qs,
    qsa: qsa,
    getParam: getParam,
    wait: wait,
    navigate: navigate,
    Toast: Toast
  };
})(window);
