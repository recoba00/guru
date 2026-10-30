/*!
 * bridge.js — 게임 진입 브릿지
 * 상태: 로딩 / 게임 정보 실패 / 미션 실패 / 게임 실행 실패(토스트)
 */
(function (window, document) {
  'use strict';

  var core = window.PB.core;
  var ui = window.PB.ui;
  var api = window.PB.api;
  var Toast = core.Toast;

  var MESSAGES = {
    launchFailed: '일시적인 오류로 게임을 이용할 수 없어요',
    launchDemo: '(데모) 실제 연동 시 게임 화면으로 이동해요'
  };
  var HOLD_TOAST = core.getParam('hold') === '1';
  var HOME_URL = 'home.html';
  var DEFAULT_TITLE = '한입컷 (게임이름출력)';

  var root = core.qs('#app');
  var state = {
    detail: { status: 'loading', data: null },
    missions: { status: 'loading', data: [] },
    launching: false
  };

  function toast(message) {
    Toast.show(message, { duration: HOLD_TOAST ? Infinity : 2500 });
  }

  /* ---------- render ---------- */
  function render() {
    var d = state.detail;
    var title = d.data ? d.data.headerTitle : DEFAULT_TITLE;

    // 로딩: 헤더 + 스피너
    if (d.status === 'loading') {
      root.innerHTML = ui.Header({ title: title }) +
        '<main class="bridge__loading" aria-busy="true">' + ui.Spinner() + '</main>';
      return;
    }

    // 게임 정보 조회 실패: 헤더 + 상태 안내 (CTA 없음)
    if (d.status === 'error') {
      root.innerHTML = ui.Header({ title: title }) +
        '<main class="bridge__state">' +
          ui.StatusNotice({ message: '게임 정보를 불러오지 못했어요', actionLabel: '새로고침', action: 'retry-detail' }) +
        '</main>';
      return;
    }

    var m = state.missions;
    var missionsHtml = '';
    if (m.status === 'error') {
      missionsHtml = ui.MissionSection({ status: 'error' });
    } else if (m.status === 'success') {
      missionsHtml = m.data.map(function (group) { return ui.MissionSection({ missions: group }); }).join('');
    }

    root.classList.add('has-bottom-cta');
    root.innerHTML = '' +
      ui.Header({ title: title }) +
      '<main class="bridge">' +
        ui.GameHero(d.data) +
        missionsHtml +
      '</main>' +
      ui.BottomCta({ label: '게임하기', action: 'launch' });

    if (state.launching) {
      var btn = core.qs('[data-action="launch"]', root);
      btn.disabled = true;
      btn.classList.add('is-pending');
    }
  }

  /* ---------- data ---------- */
  function loadDetail() {
    state.detail = { status: 'loading', data: null };
    render();
    return api.getGameDetail(core.getParam('gameId')).then(function (data) {
      state.detail = { status: 'success', data: data };
      return loadMissions();
    }, function () {
      state.detail = { status: 'error', data: null };
      render();
    });
  }

  function loadMissions() {
    state.missions = { status: 'loading', data: [] };
    return api.getMissions().then(function (data) {
      state.missions = { status: 'success', data: data };
      render();
    }, function () {
      state.missions = { status: 'error', data: [] };
      render();
    });
  }

  function launch() {
    if (state.launching) return;
    state.launching = true;
    render();
    api.launchGame().then(function () {
      state.launching = false;
      render();
      toast(MESSAGES.launchDemo);
    }, function () {
      state.launching = false;
      render();
      toast(MESSAGES.launchFailed);
    });
  }

  /* ---------- events ---------- */
  root.addEventListener('click', function (event) {
    var target = event.target.closest('[data-action]');
    if (!target || !root.contains(target)) return;
    switch (target.getAttribute('data-action')) {
      case 'back':
        if (window.history.length > 1) window.history.back();
        else core.navigate(HOME_URL);
        break;
      case 'retry-detail':
        loadDetail();
        break;
      case 'retry-missions':
        loadMissions();
        break;
      case 'launch':
        launch();
        break;
    }
  });

  /* ---------- init ---------- */
  loadDetail().then(function () {
    if (api.state === 'toast-launch' && state.detail.status === 'success') launch();
  });
})(window, document);
