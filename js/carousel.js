/*!
 * carousel.js — 상단 배너 무한 스와이프
 * - 터치: 브라우저 기본 스크롤 + scroll-snap (한 장씩, 가운데 정렬)
 * - 마우스(PC): 드래그로 넘기기 / 키보드 ←→
 * - 무한 루프: 앞뒤에 복제 배너를 붙여 두고, 복제 배너에서 멈추면 같은 위치의 실제 배너로 순간 이동
 * - 화면 크기가 바뀌어도 현재 배너를 가운데로 유지
 * - 자동 넘김: options.autoplay(ms) 마다 다음 배너로. 손으로 넘기는 중·화면이 안 보일 때는 멈춤
 *
 * React 이식 시: useInfiniteCarousel(ref, { initialIndex }) 훅으로 그대로 옮기면 됩니다.
 */
(function (window) {
  'use strict';

  var SWIPE_THRESHOLD = 40;   // 마우스로 이 이상 끌면 다음/이전 장
  var SETTLE_DELAY = 120;     // 스크롤이 멈췄다고 판단하는 시간(ms)

  function mount(track, options) {
    var opts = options || {};
    var real = Array.prototype.slice.call(track.children);
    var count = real.length;
    if (!count) return null;

    var loop = opts.loop !== false && count > 1;
    var cloneCount = loop ? Math.min(2, count) : 0;

    /* ---------- 복제 배너 붙이기 ---------- */
    function makeClone(node) {
      var clone = node.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.setAttribute('data-clone', '');
      clone.removeAttribute('id');
      Array.prototype.forEach.call(clone.querySelectorAll('[id]'), function (el) { el.removeAttribute('id'); });
      Array.prototype.forEach.call(clone.querySelectorAll('a, button, [tabindex]'), function (el) { el.setAttribute('tabindex', '-1'); });
      return clone;
    }
    if (loop) {
      for (var i = 0; i < cloneCount; i++) {
        track.insertBefore(makeClone(real[count - 1 - i]), track.firstChild);   // 앞쪽: 마지막 배너들
        track.appendChild(makeClone(real[i]));                                    // 뒤쪽: 첫 배너들
      }
    }
    var slides = Array.prototype.slice.call(track.children);

    var index = clamp(opts.initialIndex || 0, 0, count - 1);   // 실제 배너 기준 index

    function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }
    function toDom(realIndex) { return realIndex + cloneCount; }
    function toReal(domIndex) { return ((domIndex - cloneCount) % count + count) % count; }

    function offsetFor(domIndex) {
      var slide = slides[domIndex];
      var trackRect = track.getBoundingClientRect();
      var slideRect = slide.getBoundingClientRect();
      var center = slideRect.left - trackRect.left + track.scrollLeft + slideRect.width / 2;
      return center - track.clientWidth / 2;
    }

    function nearestDom() {
      var center = track.scrollLeft + track.clientWidth / 2;
      var best = 0;
      var bestDist = Infinity;
      for (var d = 0; d < slides.length; d++) {
        var dist = Math.abs(offsetFor(d) + track.clientWidth / 2 - center);
        if (dist < bestDist) { bestDist = dist; best = d; }
      }
      return best;
    }

    /* 스냅 없이 즉시 이동 (복제 → 실제 배너로 바꿔치기할 때) */
    function jump(domIndex) {
      var prev = track.style.scrollSnapType;
      track.style.scrollSnapType = 'none';
      track.scrollLeft = offsetFor(domIndex);
      track.getBoundingClientRect();           // 강제 리플로우
      track.style.scrollSnapType = prev;
    }

    function setIndex(realIndex) {
      if (realIndex === index) return;
      index = realIndex;
      track.setAttribute('data-index', String(realIndex));
      if (typeof opts.onChange === 'function') opts.onChange(realIndex);
    }

    /* 멈춘 위치가 복제 배너면 실제 배너로 순간 이동 */
    function settle() {
      if (drag) return;
      var dom = nearestDom();
      var realIdx = toReal(dom);
      if (loop && (dom < cloneCount || dom >= cloneCount + count)) jump(toDom(realIdx));
      setIndex(realIdx);
      startAuto();
    }

    /* step: +1 다음, -1 이전 (무한) */
    function move(step) {
      var dom = clamp(nearestDom() + step, 0, slides.length - 1);
      if (!loop) dom = clamp(dom, 0, count - 1);
      track.scrollTo({ left: offsetFor(dom), behavior: 'smooth' });
    }

    function goTo(realIndex, smooth) {
      var dom = toDom(clamp(realIndex, 0, count - 1));
      if (smooth) track.scrollTo({ left: offsetFor(dom), behavior: 'smooth' });
      else jump(dom);
      setIndex(toReal(dom));
    }

    /* ---------- 스크롤 종료 감지 ---------- */
    var settleTimer = null;
    track.addEventListener('scroll', function () {
      stopAuto();
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settle, SETTLE_DELAY);
    }, { passive: true });
    if ('onscrollend' in window) {
      track.addEventListener('scrollend', function () {
        clearTimeout(settleTimer);
        settle();
      });
    }

    /* ---------- 자동 넘김 ---------- */
    var autoplayMs = opts.autoplay || 0;
    var autoTimer = null;
    var userActive = false;          // 터치/드래그 중

    function stopAuto() { clearTimeout(autoTimer); autoTimer = null; }
    function startAuto() {
      stopAuto();
      if (!autoplayMs || count < 2 || userActive || document.hidden) return;
      autoTimer = setTimeout(function () { move(1); }, autoplayMs);
    }

    // 손으로 만지는 동안 멈추고, 손을 떼고 배너가 멈추면 다시 3초 카운트
    track.addEventListener('touchstart', function () { userActive = true; stopAuto(); }, { passive: true });
    track.addEventListener('touchend', function () { userActive = false; }, { passive: true });
    track.addEventListener('touchcancel', function () { userActive = false; }, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopAuto(); else startAuto();
    });

    /* ---------- 마우스 드래그 ---------- */
    var drag = null;
    var suppressClick = false;

    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, left: track.scrollLeft, moved: 0 };
      stopAuto();
      track.classList.add('is-dragging');
      track.setPointerCapture(e.pointerId);
    });

    track.addEventListener('pointermove', function (e) {
      if (!drag) return;
      drag.moved = e.clientX - drag.x;
      track.scrollLeft = drag.left - drag.moved;
    });

    function endDrag(e) {
      if (!drag) return;
      var moved = drag.moved;
      var startLeft = drag.left;
      drag = null;
      track.classList.remove('is-dragging');
      if (e && track.hasPointerCapture && track.hasPointerCapture(e.pointerId)) track.releasePointerCapture(e.pointerId);
      suppressClick = Math.abs(moved) > 5;

      // 드래그 시작 시점의 배너 기준으로 한 장만 이동
      var startDom = 0;
      var best = Infinity;
      for (var d = 0; d < slides.length; d++) {
        var dist = Math.abs(offsetFor(d) - startLeft);
        if (dist < best) { best = dist; startDom = d; }
      }
      var target = startDom;
      if (moved <= -SWIPE_THRESHOLD) target = startDom + 1;
      else if (moved >= SWIPE_THRESHOLD) target = startDom - 1;
      target = clamp(target, 0, slides.length - 1);
      track.scrollTo({ left: offsetFor(target), behavior: 'smooth' });
    }
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);

    track.addEventListener('click', function (e) {
      if (suppressClick) { e.preventDefault(); e.stopPropagation(); suppressClick = false; }
    }, true);

    /* ---------- 키보드 ---------- */
    track.setAttribute('tabindex', '0');
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); move(1); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); move(-1); }
    });

    /* ---------- 리사이즈 ---------- */
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { jump(toDom(index)); }, 100);
    });

    track.setAttribute('data-index', String(index));
    jump(toDom(index));
    startAuto();

    return {
      goTo: goTo,
      next: function () { move(1); },
      prev: function () { move(-1); },
      getIndex: function () { return index; },
      play: startAuto,
      pause: stopAuto
    };
  }

  window.PB = window.PB || {};
  window.PB.Carousel = { mount: mount };
})(window);
