/*!
 * components.js — 화면 조각 렌더 함수 (props → HTML)
 * Figma 컴포넌트와 1:1 로 나눠 두었습니다. React 이식 시 함수 하나가 컴포넌트 하나가 되도록 구성.
 *
 *   Header            → <Header />            (Figma: Header)
 *   BannerCarousel    → <BannerCarousel />    (Figma: 상단 배너 카드)
 *   DailyCheckCard    → <DailyCheckCard />    (Figma: Daliy Check Card)
 *     AttendDay       → <AttendDay />         (Figma: 출석체크 일차 — 기본/활성화/완료)
 *     AttendCta       → <AttendCta />         (Figma: 출석 CTA — 출석 전/출석 완료)
 *   GameSection       → <GameSection />
 *     GameCard        → <GameCard />          (Figma: Game Card)
 *     GameCardSkeleton→ <GameCardSkeleton />  (Figma: Game Card Skeleton)
 *   StatusNotice      → <StatusNotice />      (Figma: 상태 안내)
 *   Spinner           → <Spinner />           (Figma: Loading Spinner)
 *   GameHero          → <GameHero />          (Figma: List Item/Card)
 *   MissionSection    → <MissionSection />    (Figma: Mission Section)
 *   BottomCta         → <BottomCta />         (Figma: Frame 1739337230)
 *   Footer            → <Footer />
 */
(function (window) {
  'use strict';

  var e = window.PB.core.escapeHtml;
  var ICON = 'assets/icons/';
  var IMG = 'assets/images/';

  /* ---------- Header ---------- */
  function Header(props) {
    var p = props || {};
    return '' +
      '<header class="header' + (p.showClose ? ' header--has-close' : '') + (p.contentWidth ? ' header--content' : '') + '">' +
        '<div class="header__inner">' +
          (p.showBack === false ? '' :
            '<button type="button" class="header__btn" data-action="back" aria-label="뒤로 가기">' +
              '<img src="' + ICON + 'arrow-left.svg" alt="" width="24" height="24">' +
            '</button>') +
          (p.showLogo
            ? '<h1 class="header__logo"><img src="' + IMG + 'logo-playb-lite.webp" alt="PlayB Lite" width="75" height="32"></h1>'
            : '') +
          (p.title ? '<h1 class="header__title">' + e(p.title) + '</h1>' : '') +
          (p.showClose
            ? '<button type="button" class="header__btn header__btn--close" data-action="close" aria-label="닫기">' +
                '<img src="' + ICON + 'close.svg" alt="" width="24" height="24">' +
              '</button>'
            : '') +
        '</div>' +
      '</header>';
  }

  /* ---------- Banner Carousel ---------- */
  var CHIP_CLASS = { soon: 'chip--soon', coming: 'chip--coming' };

  function BannerCarousel(props) {
    var slides = props.slides || [];
    var total = slides.length;
    return '' +
      '<section class="banner" aria-roledescription="carousel" aria-label="추천 게임">' +
        '<div class="banner__track" data-banner-track>' +
          slides.map(function (s, i) {
            return '' +
              '<article class="banner__slide" aria-roledescription="slide" aria-label="' + (i + 1) + ' / ' + total + '">' +
                '<img class="banner__bg" src="' + e(s.image) + '" alt="" loading="' + (i < 2 ? 'eager' : 'lazy') + '">' +
                '<div class="banner__dim"></div>' +
                (s.chip ? '<span class="chip ' + (CHIP_CLASS[s.chip.type] || '') + '">' + e(s.chip.label) + '</span>' : '') +
                '<div class="banner__body">' +
                  '<h2 class="banner__title">' + e(s.title) + '</h2>' +
                  '<p class="banner__desc">' + e(s.description) + '</p>' +
                '</div>' +
                '<div class="banner__dots" aria-hidden="true">' +
                  slides.map(function (_, d) {
                    return '<span class="banner__dot' + (d === i ? ' is-active' : '') + '"></span>';
                  }).join('') +
                '</div>' +
              '</article>';
          }).join('') +
        '</div>' +
      '</section>';
  }

  /* ---------- Daily Check ---------- */
  var DAY_STATE_CLASS = { default: 'is-default', today: 'is-today', done: 'is-done' };

  function AttendDay(day) {
    var label = day.state === 'done' ? '완료' : day.reward;
    return '' +
      '<li class="attend-day ' + (DAY_STATE_CLASS[day.state] || '') + '"' + (day.state === 'today' ? ' aria-current="date"' : '') + '>' +
        '<span class="attend-day__dot" aria-hidden="true"></span>' +
        '<div class="attend-day__body">' +
          '<span class="attend-day__label">' + e(day.label) + '</span>' +
          '<span class="attend-day__reward">' + e(label) + '</span>' +
        '</div>' +
      '</li>';
  }

  function AttendCta(props) {
    if (props.attended) {
      return '<button type="button" class="attend-cta" disabled>내일 또 출석해요!</button>';
    }
    return '' +
      '<button type="button" class="attend-cta" data-action="attend">' +
        '<span>출석하고 ' + e(props.todayReward) + ' 받기</span>' +
        '<span class="ad-badge">AD</span>' +
      '</button>';
  }

  function DailyCheckCard(props) {
    return '' +
      '<section class="card daily-check" aria-labelledby="daily-check-title">' +
        '<h2 class="daily-check__title" id="daily-check-title">' + e(props.title) + '</h2>' +
        '<div class="daily-check__days">' +
          '<div class="daily-check__scroll" data-daily-scroll>' +
            '<ol class="daily-check__list">' + props.days.map(AttendDay).join('') + '</ol>' +
          '</div>' +
        '</div>' +
        AttendCta(props) +
      '</section>';
  }

  /* ---------- Game Card ---------- */
  function GameCard(game) {
    return '' +
      '<li class="card game-card">' +
        '<div class="game-card__info">' +
          '<img class="game-card__thumb" src="' + e(game.thumbnail) + '" alt="" width="48" height="48" loading="lazy">' +
          '<div class="game-card__text">' +
            '<h3 class="game-card__title">' + e(game.title) + '</h3>' +
            (game.description ? '<p class="game-card__desc">' + e(game.description) + '</p>' : '') +
          '</div>' +
          '<button type="button" class="game-card__play" data-action="play" data-game-id="' + e(game.id) + '"' +
            ' aria-label="' + e(game.title) + ' 게임하기">게임하기</button>' +
        '</div>' +
        (game.missions && game.missions.length
          ? '<div class="game-card__missions"><ul>' +
              game.missions.map(function (m) { return '<li>' + e(m) + '</li>'; }).join('') +
            '</ul></div>'
          : '') +
      '</li>';
  }

  function GameCardSkeleton() {
    return '' +
      '<li class="card game-card skeleton" aria-hidden="true">' +
        '<div class="game-card__info">' +
          '<span class="skeleton__block skeleton__thumb"></span>' +
          '<span class="skeleton__text">' +
            '<span class="skeleton__block skeleton__title"></span>' +
            '<span class="skeleton__block skeleton__desc"></span>' +
          '</span>' +
          '<span class="skeleton__block skeleton__btn"></span>' +
        '</div>' +
        '<span class="skeleton__block skeleton__mission"></span>' +
      '</li>';
  }

  /* ---------- 상태 안내 ---------- */
  function StatusNotice(props) {
    return '' +
      '<div class="status-notice">' +
        '<p class="status-notice__message">' + e(props.message) + '</p>' +
        (props.actionLabel
          ? '<button type="button" class="status-notice__retry" data-action="' + e(props.action || 'retry') + '">' + e(props.actionLabel) + '</button>'
          : '') +
      '</div>';
  }

  /* ---------- Game Section ---------- */
  function GameSection(props) {
    var body;
    if (props.status === 'loading') {
      body = '<ul class="section__list" aria-busy="true">' +
        GameCardSkeleton() + GameCardSkeleton() + GameCardSkeleton() +
        '</ul><span class="sr-only">게임 목록을 불러오는 중이에요</span>';
    } else if (props.status === 'error') {
      body = StatusNotice({ message: '게임을 불러오지 못했어요', actionLabel: '다시 시도', action: 'retry-games' });
    } else if (props.status === 'empty') {
      body = StatusNotice({ message: '이용 가능한 게임이 없어요' });
    } else {
      body = '<ul class="section__list">' + props.games.map(GameCard).join('') + '</ul>';
    }
    return '' +
      '<section class="section" aria-label="' + e(props.title) + '">' +
        '<h2 class="section__title">' + e(props.title) + '</h2>' +
        body +
      '</section>';
  }

  /* ---------- Spinner ---------- */
  function Spinner() {
    return '<img class="spinner" src="' + ICON + 'spinner.svg" alt="불러오는 중" width="32" height="32">';
  }

  /* ---------- Game Hero (브릿지 게임 정보) ---------- */
  function GameHero(game) {
    return '' +
      '<section class="game-hero" aria-label="게임 정보">' +
        '<img class="game-hero__image" src="' + e(game.banner) + '" alt="' + e(game.title) + ' 대표 이미지">' +
        '<div class="game-hero__content">' +
          '<img class="game-hero__thumb" src="' + e(game.thumbnail) + '" alt="" width="48" height="48">' +
          '<div class="game-hero__info">' +
            '<h2 class="game-hero__title">' + e(game.title) + '</h2>' +
            '<p class="game-hero__desc">' + e(game.summary) + '</p>' +
          '</div>' +
          (game.genre ? '<span class="game-hero__genre">' + e(game.genre) + '</span>' : '') +
        '</div>' +
      '</section>';
  }

  /* ---------- Mission Section ---------- */
  function MissionSection(props) {
    if (props.status === 'error') {
      return '' +
        '<section class="mission-section" aria-label="미션">' +
          '<div class="mission-section__box mission-section__box--state">' +
            StatusNotice({ message: '미션 정보를 불러오지 못했어요', actionLabel: '새로고침', action: 'retry-missions' }) +
          '</div>' +
        '</section>';
    }
    return '' +
      '<section class="mission-section" aria-label="미션">' +
        '<ul class="mission-section__box">' +
          props.missions.map(function (m) {
            return '<li class="mission-item">' +
                '<p class="mission-item__text">' + e(m.text) + '</p>' +
                '<span class="mission-item__reward">' + e(m.reward) + '</span>' +
              '</li>';
          }).join('') +
        '</ul>' +
      '</section>';
  }

  /* ---------- Bottom CTA ---------- */
  function BottomCta(props) {
    return '' +
      '<div class="bottom-cta">' +
        '<div class="bottom-cta__fade" aria-hidden="true"></div>' +
        '<div class="bottom-cta__area">' +
          '<button type="button" class="btn-primary" data-action="' + e(props.action) + '">' + e(props.label) + '</button>' +
        '</div>' +
      '</div>';
  }

  /* ---------- Footer ---------- */
  function Footer() {
    return '' +
      '<footer class="footer">' +
        '<nav class="footer__links" aria-label="약관">' +
          '<button type="button" data-action="open-link" data-href="terms.html">이용약관</button>' +
          '<span aria-hidden="true">|</span>' +
          '<button type="button" data-action="open-link" data-href="privacy.html">개인정보처리방침</button>' +
        '</nav>' +
        '<p class="footer__copy">© 2026 <strong>GURUCOMPANY</strong>. All rights reserved.</p>' +
      '</footer>';
  }

  window.PB.ui = {
    Header: Header,
    BannerCarousel: BannerCarousel,
    DailyCheckCard: DailyCheckCard,
    AttendDay: AttendDay,
    AttendCta: AttendCta,
    GameSection: GameSection,
    GameCard: GameCard,
    GameCardSkeleton: GameCardSkeleton,
    StatusNotice: StatusNotice,
    Spinner: Spinner,
    GameHero: GameHero,
    MissionSection: MissionSection,
    BottomCta: BottomCta,
    Footer: Footer
  };
})(window);
