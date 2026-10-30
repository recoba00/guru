/*!
 * ads.js — 전면광고(Interstitial) 목업
 *
 * 실제 서비스에서는 광고 SDK(앱 네이티브 / 웹 광고 스크립트)가 전면광고를 띄웁니다.
 * 이 파일은 그 자리를 대신하는 목업으로, 같은 형태(Promise)로만 맞춰 두었습니다.
 *
 *   PB.Ads.showInterstitial(ad) → Promise
 *     - resolve : 광고를 끝까지 보고 닫음 → 보상 지급 진행
 *     - reject  : 광고 표시 실패
 *
 * 닫기 버튼은 SKIP_AFTER 초 뒤에 나타납니다. (보상 지급 전 광고 시청 보장)
 */
(function (window, document) {
  'use strict';

  var SKIP_AFTER = 5;   // 닫기 버튼 노출까지(초)

  function showInterstitial() {
    return new Promise(function (resolve) {
      var lastFocus = document.activeElement;
      var remain = SKIP_AFTER;
      var timer = null;

      var el = document.createElement('div');
      el.className = 'ad-interstitial';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('aria-label', '광고');
      el.innerHTML = '' +
        '<div class="ad-interstitial__top">' +
          '<span class="ad-interstitial__badge">광고</span>' +
          '<button type="button" class="ad-interstitial__close" disabled aria-label="광고 닫기">' +
            '<span class="ad-interstitial__count" aria-live="polite">' + remain + '초 후 닫기</span>' +
          '</button>' +
        '</div>' +
        '<div class="ad-interstitial__creative">' +
          '<div class="ad-interstitial__art" aria-hidden="true"></div>' +
          '<p class="ad-interstitial__title">광고 영역</p>' +
          '<p class="ad-interstitial__desc">실제 서비스에서는 광고 SDK의<br>전면광고가 표시돼요</p>' +
        '</div>' +
        '<div class="ad-interstitial__bottom">' +
          '<span class="ad-interstitial__progress"><i style="animation-duration:' + SKIP_AFTER + 's"></i></span>' +
        '</div>';

      document.body.appendChild(el);
      document.documentElement.classList.add('is-ad-open');   // 배경 스크롤 잠금

      var closeBtn = el.querySelector('.ad-interstitial__close');
      var countEl = el.querySelector('.ad-interstitial__count');

      requestAnimationFrame(function () {
        requestAnimationFrame(function () { el.classList.add('is-open'); });
      });

      timer = setInterval(function () {
        remain -= 1;
        if (remain > 0) {
          countEl.textContent = remain + '초 후 닫기';
          return;
        }
        clearInterval(timer);
        closeBtn.disabled = false;
        closeBtn.classList.add('is-ready');
        countEl.textContent = '';
        closeBtn.innerHTML = '<img src="assets/icons/close-white.svg" alt="" width="24" height="24">';
        closeBtn.focus();
      }, 1000);

      closeBtn.addEventListener('click', function () {
        if (closeBtn.disabled) return;
        el.classList.remove('is-open');
        el.classList.add('is-closing');
        setTimeout(function () {
          if (el.parentNode) el.parentNode.removeChild(el);
          document.documentElement.classList.remove('is-ad-open');
          if (lastFocus && lastFocus.focus) lastFocus.focus();
          resolve({ completed: true });
        }, 220);
      });
    });
  }

  window.PB = window.PB || {};
  window.PB.Ads = { showInterstitial: showInterstitial, SKIP_AFTER: SKIP_AFTER };
})(window, document);
