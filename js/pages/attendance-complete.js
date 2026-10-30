/*!
 * attendance-complete.js — 출석체크 완료
 * 진입: 홈에서 '출석하고 NP 받기' → 광고 시청 성공 → 이 화면 (?day=N)
 * 확인 / 닫기 → 출석 완료 상태로 홈 복귀
 */
(function (window, document) {
  'use strict';

  var core = window.PB.core;
  var ui = window.PB.ui;
  var api = window.PB.api;
  var e = core.escapeHtml;
  var ICON = 'assets/icons/';
  var HOME_URL = 'home.html?attended=1';

  var root = core.qs('#app');

  function Stamp(s) {
    var mark = s.checked
      ? '<img class="stamp__ring" src="' + ICON + 'stamp-ring.svg" alt="">' +
        '<img class="stamp__fill" src="' + ICON + 'stamp-fill.svg" alt="">' +
        '<img class="stamp__check" src="' + ICON + 'stamp-check.svg" alt="">'
      : '<img class="stamp__empty" src="' + ICON + 'stamp-empty.svg" alt="">';
    return '' +
      '<li class="stamp' + (s.checked ? ' is-checked' : '') + '">' +
        '<span class="stamp__mark" aria-hidden="true">' + mark + '</span>' +
        '<span class="stamp__label">' + e(s.label) + '</span>' +
        '<span class="sr-only">' + s.day + '일차 ' + (s.checked ? '출석 완료' : '미출석') + '</span>' +
      '</li>';
  }

  function render(data) {
    root.innerHTML = '' +
      '<div class="att-done">' +
        ui.Header({ showBack: false, showClose: true }) +
        '<main class="att-done__body">' +
          '<canvas class="att-done__shader" aria-hidden="true"></canvas>' +
          '<div class="att-done__text">' +
            '<h1 class="att-done__title">' + e(data.title) + '</h1>' +
            '<p class="att-done__message">' + e(data.message) + '</p>' +
          '</div>' +
          '<section class="att-done__stamps" aria-label="연속 출석 현황">' +
            '<ol class="stamp-list">' + data.stamps.map(Stamp).join('') + '</ol>' +
          '</section>' +
        '</main>' +
        '<div class="att-done__action">' +
          '<div class="att-done__buttons">' +
            '<button type="button" class="btn-confirm" data-action="confirm">확인</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    // 배경 Mesh gradient 셰이더 (WebGPU 미지원 시 자동으로 배경색만 표시)
    var canvas = core.qs('.att-done__shader', root);
    if (canvas && window.PB.ShaderFill && window.PB.shaders) {
      window.PB.ShaderFill.mount(canvas, window.PB.shaders.meshGradient);
    }
  }

  root.addEventListener('click', function (event) {
    var target = event.target.closest('[data-action]');
    if (!target) return;
    var action = target.getAttribute('data-action');
    if (action === 'confirm' || action === 'close') core.navigate(HOME_URL, { replace: true });
  });

  api.getAttendanceResult(core.getParam('day')).then(render);
})(window, document);
