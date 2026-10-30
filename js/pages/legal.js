/*!
 * legal.js — 이용약관 / 개인정보 처리방침
 */
(function (window) {
  'use strict';

  var core = window.PB.core;
  var HOME_URL = 'home.html';

  core.qs('#app').addEventListener('click', function (event) {
    var target = event.target.closest('[data-action]');
    if (!target) return;
    var action = target.getAttribute('data-action');
    if (action === 'back') {
      if (window.history.length > 1) window.history.back();
      else core.navigate(HOME_URL);
    }
    if (action === 'home') core.navigate(HOME_URL);
  });

  core.restoreScroll();   // 새로고침 = 맨 위, 뒤로 가기 = 이전 위치
})(window);
