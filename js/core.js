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

  /* ---------- 가로 스크롤 양끝 마스크 ----------
   * 스크롤 영역(scrollEl)의 위치에 따라 wrapEl 에 클래스 토글
   *   has-more-left  : 왼쪽에 가려진 내용이 있음 (처음이 아님)
   *   has-more-right : 오른쪽에 가려진 내용이 있음 (끝이 아님)
   */
  function bindEdgeFade(scrollEl, wrapEl) {
    if (!scrollEl || !wrapEl) return function () {};
    var EPS = 2;
    var raf = null;
    function update() {
      raf = null;
      var max = scrollEl.scrollWidth - scrollEl.clientWidth;
      wrapEl.classList.toggle('has-more-left', scrollEl.scrollLeft > EPS);
      wrapEl.classList.toggle('has-more-right', scrollEl.scrollLeft < max - EPS);
    }
    function schedule() { if (!raf) raf = requestAnimationFrame(update); }
    scrollEl.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    update();
    return update;
  }

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

  /* ---------- 스크롤 위치 복원 ----------
   * 브라우저 기본 복원은 새로고침(당겨서 새로고침 포함) 때도 이전 위치로 되돌려서
   * 배너가 헤더 밑에 걸친 채로 열리거나, 비동기로 그려지는 화면에선 엉뚱한 위치에 멈춤.
   *  - 새로고침·일반 진입: 항상 맨 위에서 시작
   *  - 뒤로/앞으로 가기: 화면을 다 그린 뒤 restoreScroll() 로 이전 위치 복원
   */
  var SCROLL_KEY = 'pb:scroll:' + window.location.pathname + window.location.search;
  var navEntry = window.performance && performance.getEntriesByType
    ? performance.getEntriesByType('navigation')[0] : null;
  var isBackForward = !!navEntry && navEntry.type === 'back_forward';

  if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  window.addEventListener('pagehide', function () {
    try { window.sessionStorage.setItem(SCROLL_KEY, String(Math.round(window.scrollY))); } catch (e) { /* 저장 불가 환경 무시 */ }
  });

  function restoreScroll() {
    if (!isBackForward) return;          // 새로고침·일반 진입은 이미 맨 위 (로딩 중 사용자가 스크롤했으면 그대로 둠)
    var y = 0;
    try { y = parseInt(window.sessionStorage.getItem(SCROLL_KEY), 10) || 0; } catch (e) { y = 0; }
    window.scrollTo(0, y);
  }

  window.PB = window.PB || {};
  window.PB.core = {
    escapeHtml: escapeHtml,
    qs: qs,
    qsa: qsa,
    getParam: getParam,
    wait: wait,
    navigate: navigate,
    bindEdgeFade: bindEdgeFade,
    restoreScroll: restoreScroll,
    Toast: Toast
  };
})(window);
