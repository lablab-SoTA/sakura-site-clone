0. ゴール / 非ゴール

ゴール

ヒーローセクションのカルーセル操作感を改善（タッチ・マウス・キーボード・スクリーンリーダー）。

スマホでのサイズ不一致（ビューポート・アスペクト比・画像切り抜き）を是正。

縦スクロールと横スクロールの競合を解消（ホイール／タッチの意図判定と閾値管理）。

全体のモーション／スペーシング／ブレークポイントの統一指針を定義（トンマナ維持）。

非ゴール

色・タイポグラフィ・余白比率など視覚デザインの再設計はしない（既存値は尊重）。

外部ライブラリの大幅追加は原則避ける（ネイティブ scroll-snap + 最小 JS 方針）。

1. 変更方針（安全策）

破壊的変更の回避

既存の class 名や DOM 構造は維持。必要な箇所に data-carousel,data-slide 等の属性を追加するだけ。

CSS は衝突を避けるため プレフィックス .ux- を付与（例：.ux-carousel__viewport）。

イベントハンドリングの原則

ホイールイベントは {passive:false} で登録し、横移動に限定して preventDefault。
ただし端（edge）に到達したらバブリングを許可し、縦スクロールへ委譲。

タッチは touch-action と overscroll-behavior を適切に設定して競合を抑制。

アクセシビリティ

WAI-ARIA Carousel パターン準拠：aria-roledescription="carousel", aria-label, フォーカス移動、aria-live="polite"。

prefers-reduced-motion を尊重（自動アニメーション・スムーススクロールを停止）。

2. 実装対象（最小セット）

A. ヒーロー・カルーセル（必須）

ネイティブ scroll-snap を使用し、タッチ／ホイール／キーに一貫対応。

端でのホイール抑止解除、スワイプ慣性、フェード時間の統一（200ms）。

B. 横スクロール・セクション（任意複数）

縦と横の意図判定：|deltaX| > |deltaY| * 1.2 のときのみ横を捕捉。

edge での委譲：左端・右端では preventDefault を行わず縦スクロールを優先。

C. スマホ最適化

100dvh と env(safe-area-inset-*) に対応、画像は aspect-ratio + object-fit:cover。

フルードタイポ（clamp()）、画像 sizes/srcset、LCP 対策。

3. コーディング規約（抜粋）

単位：タイポ・スペースは rem、ライン長や高さは ch/rlh も可。

ブレークポイント（推奨）

--bp-sm: 480px, --bp-md: 768px, --bp-lg: 1024px, --bp-xl: 1280px
※ 既存 Tailwind 等があれば既存値を優先し、下記変数へマップ。

モーション：--ease-standard: cubic-bezier(.2,.0,.2,1), --dur-fast: 150ms, --dur-normal: 200ms, --dur-slow: 300ms
@media (prefers-reduced-motion: reduce) では 0ms に。

イベント：addEventListener('wheel', handler, {passive:false}); 以外は 基本 passive:true。

4. ドロップイン CSS（既存に追記）
/* ===== UX foundation (non-destructive) ===== */
:root {
  /* Breakpoints (map to existing if any) */
  --bp-sm: 480px; --bp-md: 768px; --bp-lg: 1024px; --bp-xl: 1280px;

  /* Motion & easing */
  --ease-standard: cubic-bezier(.2,.0,.2,1);
  --dur-fast: 150ms; --dur-normal: 200ms; --dur-slow: 300ms;

  /* Spacing scale (align with existing scale) */
  --space-1: .25rem; --space-2: .5rem; --space-3: .75rem; --space-4: 1rem;
}

/* Prefer dynamic viewport on mobile */
@supports (height: 100dvh) {
  .u-dvh { min-height: 100dvh; }
}

/* ===== Carousel base ===== */
[data-carousel] {
  position: relative;
}

.ux-carousel__viewport {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-inline: contain;
  scrollbar-width: none; /* Firefox */
}
.ux-carousel__viewport::-webkit-scrollbar { display: none; }

[data-slide] {
  scroll-snap-align: center;
  scroll-snap-stop: always; /* more deterministic */
}

/* Images in hero */
.ux-media-cover {
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;      /* 調整可 */
  object-fit: cover;
}
@media (max-width: 480px) {
  .ux-media-cover { aspect-ratio: 9 / 16; } /* ポートレート時の型崩れ回避 */
}

/* Controls (継ぎ足し・トンマナ合わせ) */
.ux-carousel__btn {
  position: absolute; inset-block: 50%;
  transform: translateY(-50%);
  inline-size: 2.5rem; block-size: 2.5rem;
  display: grid; place-items: center;
  border-radius: 9999px;
  background: color-mix(in oklab, Canvas 70%, transparent);
  transition: background var(--dur-fast) var(--ease-standard);
}
.ux-carousel__btn:hover { background: color-mix(in oklab, Canvas 85%, transparent); }
.ux-carousel__btn--prev { inset-inline-start: var(--space-3); }
.ux-carousel__btn--next { inset-inline-end: var(--space-3); }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .ux-carousel__viewport { scroll-behavior: auto; }
  .ux-animate { transition-duration: 0ms !important; animation: none !important; }
}


適用方法

ヒーローの外枠に data-carousel="hero" を付与。

スライド項目（画像やカード）に data-slide を付与。

スライドコンテナ要素（横方向スクロールする要素）に .ux-carousel__viewport を付与（既存 container にクラス追加だけで OK）。

画像タグに .ux-media-cover を追加。

5. ドロップイン JS（カルーセル & 横スクロール競合解消）

/public/js/ux-carousel.js（または src/lib/ux-carousel.ts）

/**
 * Minimal, accessible carousel controller using native scroll-snap.
 * Non-destructive: requires only data-attributes and one viewport class.
 */
type CarouselOptions = {
  autoplay?: boolean;
  intervalMs?: number;
  snapThresholdRatio?: number; // 判定をどれくらい横優先にするか（既定 1.2）
  onChange?: (index: number) => void;
};

export function initCarousel(root: HTMLElement, opts: CarouselOptions = {}) {
  const viewport = root.querySelector<HTMLElement>('.ux-carousel__viewport');
  const slides = Array.from(root.querySelectorAll<HTMLElement>('[data-slide]'));
  if (!viewport || slides.length === 0) return;

  const options = { autoplay: false, intervalMs: 5000, snapThresholdRatio: 1.2, ...opts };
  let current = 0;
  let autoplayTimer: number | null = null;
  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // A11y region
  root.setAttribute('role', 'region');
  root.setAttribute('aria-roledescription', 'carousel');
  if (!root.getAttribute('aria-label')) root.setAttribute('aria-label', 'Hero carousel');

  // Helpers
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(n, max));
  const toIndex = (i: number) => clamp(i, 0, slides.length - 1);

  function indexFromScrollLeft() {
    const w = viewport.clientWidth;
    const i = Math.round(viewport.scrollLeft / w);
    return toIndex(i);
  }

  function goTo(i: number) {
    current = toIndex(i);
    const x = slides[current].offsetLeft;
    viewport.scrollTo({ left: x, behavior: reducedMotion ? 'auto' : 'smooth' });
    opts.onChange?.(current);
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  // Wire buttons if present
  const btnPrev = root.querySelector<HTMLElement>('[data-carousel-prev]');
  const btnNext = root.querySelector<HTMLElement>('[data-carousel-next]');
  btnPrev?.addEventListener('click', prev);
  btnNext?.addEventListener('click', next);

  // Keyboard (when viewport is focused/hovered)
  function onKey(e: KeyboardEvent) {
    if (document.activeElement && !viewport.contains(document.activeElement) && !root.contains(document.activeElement)) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    if (e.key === 'Home') { e.preventDefault(); goTo(0); }
    if (e.key === 'End') { e.preventDefault(); goTo(slides.length - 1); }
  }
  window.addEventListener('keydown', onKey, { passive: false });

  // Wheel: capture only when the intent is horizontal and we are not at edges
  function onWheel(e: WheelEvent) {
    const ax = Math.abs(e.deltaX);
    const ay = Math.abs(e.deltaY);
    const mostlyHorizontal = ax > ay * (options.snapThresholdRatio || 1.2);

    const atStart = viewport.scrollLeft <= 0;
    const atEnd = Math.ceil(viewport.scrollLeft + viewport.clientWidth) >= viewport.scrollWidth;

    if (mostlyHorizontal) {
      // convert wheel vertical to horizontal scroll if needed
      const dx = (ax >= ay ? e.deltaX : e.deltaY);
      const nextLeft = viewport.scrollLeft + dx;
      const goingLeft = dx < 0;
      const goingRight = dx > 0;

      // If trying to go beyond edges, don't block page scroll
      if ((goingLeft && atStart) || (goingRight && atEnd)) return;
      e.preventDefault(); // passive:false で登録すること
      viewport.scrollLeft = nextLeft;
    }
  }
  viewport.addEventListener('wheel', onWheel as EventListener, { passive: false });

  // Track active slide on scroll end
  let scrollTimer: number | null = null;
  viewport.addEventListener('scroll', () => {
    if (scrollTimer) window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => {
      const i = indexFromScrollLeft();
      if (i !== current) {
        current = i;
        opts.onChange?.(current);
      }
    }, 100);
  }, { passive: true });

  // Autoplay (pause on user interaction)
  function startAutoplay() {
    if (!options.autoplay || reducedMotion) return;
    stopAutoplay();
    autoplayTimer = window.setInterval(() => {
      const atLast = current >= slides.length - 1;
      goTo(atLast ? 0 : current + 1);
    }, options.intervalMs);
  }
  function stopAutoplay() {
    if (autoplayTimer) { window.clearInterval(autoplayTimer); autoplayTimer = null; }
  }
  viewport.addEventListener('pointerdown', stopAutoplay, { passive: true });
  viewport.addEventListener('mouseenter', stopAutoplay, { passive: true });
  viewport.addEventListener('mouseleave', startAutoplay, { passive: true });
  startAutoplay();

  // Reduced motion listener
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
  mql.addEventListener?.('change', () => { reducedMotion = mql.matches; });

  // API exposure (optional)
  (root as any)._carousel = { goTo, next, prev, get index() { return current; } };
}

/** Horizontal sections: apply intent-aware wheel handling for any horizontally-scrollable container. */
export function bindHorizontalIntentScroll(container: HTMLElement, thresholdRatio = 1.2) {
  function onWheel(e: WheelEvent) {
    const ax = Math.abs(e.deltaX);
    const ay = Math.abs(e.deltaY);
    const mostlyHorizontal = ax > ay * thresholdRatio;

    const atStart = container.scrollLeft <= 0;
    const atEnd = Math.ceil(container.scrollLeft + container.clientWidth) >= container.scrollWidth;

    if (mostlyHorizontal) {
      const dx = (ax >= ay ? e.deltaX : e.deltaY);
      const goingLeft = dx < 0, goingRight = dx > 0;
      if ((goingLeft && atStart) || (goingRight && atEnd)) return; // let vertical scroll
      e.preventDefault();
      container.scrollLeft += dx;
    }
  }
  container.addEventListener('wheel', onWheel as EventListener, { passive: false });
}


適用方法

ヒーロー外枠（data-carousel="hero" を付けた要素）で initCarousel(el, { autoplay:true }) を呼ぶ。

横スクロール可能な各セクションのコンテナに対して bindHorizontalIntentScroll(el) を呼ぶ。

ビルド環境が TS の場合はそのまま、JS の場合は export を削除して <script> に貼り付け可能。

6. マークアップ最小変更例（既存構造を保持）
<section class="hero" data-carousel="hero" aria-label="トップの注目コンテンツ">
  <div class="hero-viewport ux-carousel__viewport" tabindex="0">
    <article class="hero-slide" data-slide>
      <img class="hero-img ux-media-cover" src="..." alt="..." />
      <!-- 既存の見出しやボタン群はそのまま -->
    </article>
    <article class="hero-slide" data-slide> ... </article>
    <!-- ... -->
  </div>

  <!-- 既存ボタンに data 属性だけ追加 -->
  <button class="hero-prev ux-carousel__btn ux-carousel__btn--prev" data-carousel-prev aria-label="前のスライド">◀</button>
  <button class="hero-next ux-carousel__btn ux-carousel__btn--next" data-carousel-next aria-label="次のスライド">▶</button>
</section>

<script type="module">
  import { initCarousel, bindHorizontalIntentScroll } from '/js/ux-carousel.js';
  const hero = document.querySelector('[data-carousel="hero"]');
  if (hero) initCarousel(hero, { autoplay: true, intervalMs: 5000 });

  // 横スクロールセクション
  document.querySelectorAll('.cards--horizontal, [data-scroll="x"]').forEach(el => {
    bindHorizontalIntentScroll(el as HTMLElement, 1.2);
  });
</script>

7. スマホ表示のサイズ・LCP最適化チェック

<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"> を採用。

画像：<img width height /> を必ず指定し、srcset + sizes で解像度分岐（LCP 対象は先出し）。

aspect-ratio を活用してレイアウトシフト抑制。

@supports (height: 100dvh) を使い、ヒーローの 最小高さを min-height: 100dvh 確保。

iOS ノッチ対応：padding-top: env(safe-area-inset-top) をヒーロー内の最上部要素に付与（必要に応じて）。

8. テスト手順（Pass/Fail 基準）

操作感

トラックパッド：横スワイプ時のみカルーセルが進み、縦にスクロールしたいときはページが縦に動く（Fail: 横に“引っかかる”）。

マウスホイール：横意図時のみ横移動（比率 1.2 以上）、端では縦スクロールへ委譲。

タッチ：軽いフリックで 1 枚送り、過剰な慣性はなし。端での弾み（バウンス）による戻りは無い。

レスポンシブ

360/390/414/430/480px 幅でヒーローの重要要素がクリップされない。

横カード群が1 カード ≒ 9/16 比で見切れず、スナップが適正。

アクセシビリティ

Tab/矢印キーでスライドが移動し、現在位置をスクリーンリーダーが読み上げ。

prefers-reduced-motion でアニメ停止。

パフォーマンス

Lighthouse モバイル LCP ≦ 2.5s（回線：Fast 3G 相当、端末：Mid-tier）。

9. 変更禁止事項（Codex への制約）

既存カラー・フォント・角丸・影の数値変更は禁止（利用箇所の整理のみ可）。

package.json の依存追加は要差分審査。原則はネイティブで実装。

既存クラス名・HTML 階層の変更は最小限。置換は data-* 属性の付与で代替。

グローバル wheel イベントの一括 preventDefault() は禁止。必ず対象要素に限定。

10. 作業手順（PR 単位）

PR-1: CSS と JS のドロップイン（クラス・属性追加のみ／動作確認）。

PR-2: ヒーローの data-* 付与と画像サイズ・aspect-ratio 付与。

PR-3: 横スクロールセクションのバインド（bindHorizontalIntentScroll 適用）。

PR-4: prefers-reduced-motion・viewport-fit 等の微修正。

PR-5: E2E チェック（端末幅バリエーション、アクセシビリティ、Lighthouse）。