/*!
 * home.js — 플레이비 메인
 * 상태: 배너 / 출석(출석 전·완료) / 게임 목록(로딩·성공·실패·없음) / 토스트
 */
(function (window, document) {
  'use strict';

  var core = window.PB.core;
  var ui = window.PB.ui;
  var api = window.PB.api;
  var Toast = core.Toast;

  var MESSAGES = {
    adFailed: '광고를 불러오는데 실패했어요',
    linkFailed: '잠시 후 다시 시도해 주세요.'
  };
  var HOLD_TOAST = core.getParam('hold') === '1'; // 상태 미리보기에서 토스트 유지

  var root = core.qs('#app');
  var state = {
    banners: [],
    attendance: null,
    attendPending: false,
    sections: { status: 'loading', list: [] }
  };

  function toast(message) {
    Toast.show(message, { duration: HOLD_TOAST ? Infinity : 2500 });
  }

  /* ---------- render ---------- */
  function renderSections() {
    var s = state.sections;
    if (s.status === 'success' && s.list.length === 0) {
      return ui.GameSection({ title: '플레이하고 {리워드} 받아요', status: 'empty' });
    }
    if (s.status !== 'success') {
      // 로딩·실패 시에는 첫 섹션 자리에서만 상태 표시 (Figma 상태별 케이스 기준)
      return ui.GameSection({ title: '플레이하고 {리워드} 받아요', status: s.status });
    }
    return s.list.map(function (section) {
      return ui.GameSection({ title: section.title, status: 'success', games: section.games });
    }).join('');
  }

  function render() {
    // 헤더는 .home 바깥(페이지 최상위)에 둬야 sticky 가 페이지 전체에서 동작
    root.innerHTML = '' +
      ui.Header({ showLogo: true }) +
      '<div class="home">' +
        '<div class="home__top">' +
          (state.banners.length ? ui.BannerCarousel({ slides: state.banners }) : '') +
        '</div>' +
        (state.attendance
          ? '<div class="home__daily">' + ui.DailyCheckCard(state.attendance) + '</div>'
          : '') +
        '<div class="home__sections" data-region="sections">' + renderSections() + '</div>' +
        ui.Footer() +
      '</div>';
    afterRender();
  }

  /* 섹션 영역만 다시 그리기 (배너 스크롤 위치 유지) */
  function renderSectionsOnly() {
    var region = core.qs('[data-region="sections"]', root);
    if (region) region.innerHTML = renderSections();
  }

  function renderDailyOnly() {
    var wrap = core.qs('.home__daily', root);
    if (!wrap) return;
    var scroll = core.qs('[data-daily-scroll]', wrap);
    var left = scroll ? scroll.scrollLeft : 0;
    wrap.innerHTML = ui.DailyCheckCard(state.attendance);
    var cta = core.qs('[data-action="attend"]', wrap);
    if (cta && state.attendPending) {
      cta.disabled = true;
      cta.classList.add('is-pending');
    }
    var next = core.qs('[data-daily-scroll]', wrap);
    if (next) next.scrollLeft = left;
  }

  function afterRender() {
    // 배너 스와이프: 2번째 배너가 가운데 오도록 시작 (Figma 시안 기준)
    var track = core.qs('[data-banner-track]', root);
    if (track) {
      window.PB.Carousel.mount(track, {
        initialIndex: track.children.length > 1 ? 1 : 0,
        autoplay: 3000           // 3초마다 다음 배너
      });
    }
    // 출석: 오늘 날짜가 보이도록 가로 스크롤 보정
    var scroll = core.qs('[data-daily-scroll]', root);
    var today = scroll && core.qs('.attend-day.is-today', scroll);
    if (today && today.offsetLeft + today.offsetWidth > scroll.clientWidth) {
      scroll.scrollLeft = today.offsetLeft - 64 * 2;
    }
  }

  /* ---------- data ---------- */
  function loadGames() {
    state.sections = { status: 'loading', list: [] };
    renderSectionsOnly();
    return api.getGameSections().then(function (list) {
      state.sections = { status: 'success', list: list };
      renderSectionsOnly();
    }, function () {
      state.sections = { status: 'error', list: [] };
      renderSectionsOnly();
    });
  }

  function attend() {
    if (state.attendPending || !state.attendance || state.attendance.attended) return;
    state.attendPending = true;
    renderDailyOnly();
    // 1) 전면광고 로드 → 2) 전면광고 노출(닫을 때까지) → 3) 출석·보상 처리 → 4) 출석체크 완료 화면
    api.loadInterstitialAd()
      .then(function (ad) {
        return window.PB.Ads.showInterstitial(ad);
      })
      .then(function () {
        return api.checkIn();
      })
      .then(function (result) {
        // 확인/닫기 시 출석 완료 상태로 홈 복귀
        core.navigate('attendance-complete.html?day=' + encodeURIComponent(result.day));
      }, function () {
        state.attendPending = false;
        renderDailyOnly();
        toast(MESSAGES.adFailed);
      });
  }

  function openLink(href) {
    api.openLink(href).then(function (url) {
      core.navigate(url);
    }, function () {
      toast(MESSAGES.linkFailed);
    });
  }

  /* ---------- events ---------- */
  root.addEventListener('click', function (event) {
    var target = event.target.closest('[data-action]');
    if (!target || !root.contains(target)) return;
    switch (target.getAttribute('data-action')) {
      case 'back':
        // 플랫폼(앱)으로 복귀 — 실제 연동 시 네이티브 브릿지 호출로 교체
        if (window.history.length > 1) window.history.back();
        break;
      case 'attend':
        attend();
        break;
      case 'retry-games':
        loadGames();
        break;
      case 'play':
        core.navigate('bridge.html?gameId=' + encodeURIComponent(target.getAttribute('data-game-id')));
        break;
      case 'open-link':
        openLink(target.getAttribute('data-href'));
        break;
    }
  });

  /* ---------- init ---------- */
  Promise.all([api.getBanners(), api.getAttendance()]).then(function (res) {
    state.banners = res[0];
    state.attendance = res[1];
    render();
    loadGames().then(function () {
      // 토스트 상태 미리보기: 실제 흐름(버튼 탭)을 그대로 재현
      if (api.state === 'toast-ad' || api.state === 'ad') attend();   // ad: 전면광고 미리보기
      if (api.state === 'toast-link') openLink('terms.html');
    });
  });
})(window, document);
