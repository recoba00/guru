/*!
 * mock-api.js — 목업 데이터 + 가짜 API
 * 실제 연동 시 이 파일만 실제 API 호출로 바꾸면 됩니다. (반환 형태 유지)
 *
 * 상태별 케이스는 URL 의 ?state= 값으로 재현합니다.
 *   home.html   : default | no-desc | attended | loading | error | empty | toast-ad | toast-link
 *   bridge.html : default | loading | error | mission-error | toast-launch
 *   attendance-complete.html : ?day=1~7 (기본 5, Figma 시안)
 */
(function (window) {
  'use strict';

  var core = window.PB.core;
  var IMG = 'assets/images/';
  var STATE = core.getParam('state', 'default');
  var ATTENDED = STATE === 'attended' || core.getParam('attended') === '1';   // 출석 완료 화면에서 돌아온 경우
  var LATENCY = 600; // 목업 응답 지연(ms)

  /* ---------- 목업 데이터 (Figma 문구 그대로) ---------- */
  var BANNERS = [
    { id: 'kingdom', title: '킹덤 어드벤쳐', description: '같은 숫자를 합쳐 큰 숫자를 만들어요', image: IMG + 'mock-banner-hanipcut.webp', chip: { type: 'soon', label: '곧 출시' } },
    { id: 'hanipcut', title: '게임이름출력영역', description: '한줄 소개문구 출력', image: IMG + 'mock-banner-hanipcut.webp', chip: { type: 'soon', label: '곧 출시' } },
    { id: 'kingdom-2', title: '킹덤 어드벤쳐', description: '같은 숫자를 합쳐 큰 숫자를 만들어요', image: IMG + 'mock-banner-hanipcut.webp', chip: { type: 'soon', label: '곧 출시' } }
  ];

  function makeGame(i, withDesc) {
    return {
      id: 'game-' + i,
      title: '게임타이틀 최대 한 줄까지',
      description: withDesc ? '게임소개글 공백포함 12자' : '',
      thumbnail: IMG + 'mock-thumb-hanipcut.png',
      missions: ['미션내용이 출력되는 영역이예요.', '미션내용이 출력되는 영역이예요.']
    };
  }

  function makeDays(attended) {
    // 3일차가 오늘. 출석 완료 상태면 오늘도 '완료' 처리
    var days = [];
    for (var i = 1; i <= 7; i++) {
      var state = i < 3 ? 'done' : (i === 3 ? (attended ? 'done' : 'today') : 'default');
      days.push({ day: i, label: 'N일차', reward: 'NP', state: state });
    }
    return days;
  }

  var GAME_DETAIL = {
    id: 'hanipcut',
    title: '한입컷',
    headerTitle: '한입컷 (게임이름출력)',
    summary: '정해진 시간안에 그림을 정확하게 잘라보세요!',
    genre: '캐주얼',
    banner: IMG + 'mock-banner-hanipcut.webp',
    thumbnail: IMG + 'mock-thumb-hanipcut.png'
  };

  var MISSIONS = [
    [
      { text: '인게임 미션이 출력되는 영역이예요. 최대 2줄까지 허용해줄께요.', reward: '1P' },
      { text: '미션내용이 출력되는 영역이예요.', reward: '1P' },
      { text: '미션내용이 출력되는 영역이예요.', reward: '1P' },
      { text: '미션내용이 출력되는 영역이예요.', reward: '1P' },
      { text: '미션내용이 출력되는 영역이예요.', reward: '1P' }
    ],
    [
      { text: '인게임 미션이 출력되는 영역이예요. 최대 2줄까지 허용해줄께요.', reward: '하트 무제한' },
      { text: '미션내용이 출력되는 영역이예요.', reward: '아이템 1개' },
      { text: '미션내용이 출력되는 영역이예요.', reward: '광고패스' },
      { text: '미션내용이 출력되는 영역이예요.', reward: '리셋권' },
      { text: '미션내용이 출력되는 영역이예요.', reward: '자르기 1번 추가' }
    ]
  ];

  /* ---------- 실패 1회 후 재시도 시 성공하도록 (데모용) ---------- */
  var failOnce = {};
  function shouldFail(key, scenario) {
    if (STATE !== scenario) return false;
    if (failOnce[key]) return false;
    failOnce[key] = true;
    return true;
  }

  function reject(message) {
    var err = new Error(message);
    err.code = 'MOCK_ERROR';
    return Promise.reject(err);
  }

  /* ---------- API ---------- */
  var api = {
    state: STATE,

    getBanners: function () {
      return Promise.resolve(BANNERS.slice());
    },

    getAttendance: function () {
      return Promise.resolve({
        title: '연속 출석하고 {리워드}받기',
        todayReward: 'NP',
        attended: ATTENDED,
        days: makeDays(ATTENDED)
      });
    },

    /* 리워드 광고 시청 → 출석 처리 */
    /* 전면광고 불러오기 (실제: 광고 SDK load) — toast-ad 상태에서는 실패 */
    loadInterstitialAd: function () {
      return core.wait(600).then(function () {
        if (STATE === 'toast-ad') return reject('AD_LOAD_FAILED');
        return { adId: 'mock-interstitial' };
      });
    },

    /* 광고 시청 완료 후 출석 처리 (보상 지급) */
    checkIn: function () {
      return core.wait(200).then(function () {
        return { attended: true, day: 3, days: makeDays(true) };
      });
    },

    /* 출석체크 완료 화면 데이터 (Figma: 출석체크 완료 16211:36429) */
    getAttendanceResult: function (day) {
      var d = Math.min(Math.max(parseInt(day, 10) || 5, 1), 7);
      var stamps = [];
      for (var i = 1; i <= 7; i++) {
        stamps.push(i <= d
          ? { day: i, checked: true, label: '금' }       // Figma 시안 문구 (요일/일차 라벨 자리)
          : { day: i, checked: false, label: 'N일차' });
      }
      return Promise.resolve({
        title: d + '일차 방문 성공!',
        message: 'N{리워드} 받았어요',
        stamps: stamps
      });
    },

    getGameSections: function () {
      if (STATE === 'loading') return new Promise(function () {}); // 계속 로딩
      return core.wait(LATENCY).then(function () {
        if (shouldFail('games', 'error')) return reject('GAMES_FETCH_FAILED');
        if (STATE === 'empty') return [];
        var withDesc = STATE !== 'no-desc';
        return [
          { id: 'reward', title: '플레이하고 {리워드} 받아요', games: [1, 2, 3, 4, 5].map(function (i) { return makeGame(i, withDesc); }) },
          { id: 'hourly', title: '1시간 마다 참여 가능해요', games: [6, 7].map(function (i) { return makeGame(i, withDesc); }) }
        ];
      });
    },

    /* 푸터 링크 열기 (앱 웹뷰에서 외부 브라우저 열기 등을 가정) */
    openLink: function (href) {
      return core.wait(150).then(function () {
        if (STATE === 'toast-link') return reject('LINK_OPEN_FAILED');
        return href;
      });
    },

    getGameDetail: function () {
      if (STATE === 'loading') return new Promise(function () {});
      return core.wait(LATENCY).then(function () {
        if (shouldFail('detail', 'error')) return reject('DETAIL_FETCH_FAILED');
        return Object.assign({}, GAME_DETAIL);
      });
    },

    getMissions: function () {
      return core.wait(LATENCY).then(function () {
        if (shouldFail('missions', 'mission-error')) return reject('MISSIONS_FETCH_FAILED');
        return MISSIONS.map(function (group) { return group.slice(); });
      });
    },

    launchGame: function () {
      return core.wait(500).then(function () {
        if (STATE === 'toast-launch') return reject('GAME_LAUNCH_FAILED');
        return { url: '#play' };
      });
    }
  };

  window.PB.api = api;
})(window);
