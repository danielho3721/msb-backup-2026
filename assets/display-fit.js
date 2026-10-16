/* Display adapter only. Reads rendered text/geometry; writes font-size variables.
   It never reads or changes match state, timers, scores, reports or storage. */
(() => {
  "use strict";
  const main = document.querySelector("main.scoreboard-main");
  if (!main) return;

  const groups = [
    { selector: ".score-number", property: "--msb-score-fit", maxRem: 16 },
    { selector: ".timer-display", property: "--msb-timer-fit", maxRem: 8 },
    { selector: ".team-name", property: "--msb-name-fit", maxRem: 3.5 }
  ];
  const measure = document.createElement("span");
  measure.setAttribute("aria-hidden", "true");
  measure.dataset.msbFontMeasure = "";
  Object.assign(measure.style, {
    position: "fixed", top: "0", left: "0", visibility: "hidden",
    pointerEvents: "none", whiteSpace: "pre", width: "max-content",
    padding: "0", border: "0", margin: "0"
  });
  document.body.append(measure);
  const textRange = document.createRange();

  let queued = false;
  function fit() {
    queued = false;
    if (getComputedStyle(main).display !== "grid" || !main.clientWidth) return;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    for (const group of groups) {
      const cap = rem * group.maxRem;
      let fitted = cap;
      for (const element of main.querySelectorAll(group.selector)) {
        const style = getComputedStyle(element);
        const width = element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        const height = element.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
        if (width <= 0 || height <= 0) continue;
        const lineRatio = parseFloat(style.lineHeight) / parseFloat(style.fontSize);
        Object.assign(measure.style, {
          fontFamily: style.fontFamily, fontWeight: style.fontWeight,
          fontStyle: style.fontStyle, fontStretch: style.fontStretch,
          fontVariantNumeric: style.fontVariantNumeric, letterSpacing: style.letterSpacing,
          fontSize: `${cap}px`, lineHeight: String(Number.isFinite(lineRatio) ? lineRatio : 1.2)
        });
        measure.textContent = element instanceof HTMLInputElement
          ? (element.value || element.placeholder || " ")
          : (element.textContent.trim() || "0");
        const natural = measure.getBoundingClientRect();
        textRange.selectNodeContents(measure);
        const glyphs = textRange.getBoundingClientRect();
        // Leave a small inset for glyph bearings and fractional pixel rounding.
        fitted = Math.min(fitted, cap * Math.min((width - 4) / Math.max(1, natural.width, glyphs.width), (height - 2) / Math.max(1, natural.height, glyphs.height)));
      }
      const value = `${Math.max(1, Math.floor(fitted * 100) / 100)}px`;
      if (main.style.getPropertyValue(group.property) !== value) main.style.setProperty(group.property, value);
    }
  }
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(fit);
  }
  new ResizeObserver(schedule).observe(main);
  const observer = new ResizeObserver(schedule);
  for (const element of main.querySelectorAll(".team-panel, .score-number, .timer-display, .team-name")) observer.observe(element);
  new MutationObserver(schedule).observe(main, { childList: true, characterData: true, subtree: true });
  document.addEventListener("input", schedule, true);
  document.addEventListener("change", schedule, true);
  window.addEventListener("resize", schedule);
  window.addEventListener("load", schedule);
  document.fonts.ready.then(schedule);
  schedule();
})();
