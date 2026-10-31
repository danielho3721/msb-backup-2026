// Pure end/break/tie-break flow decisions for msb_ios.html (no DOM, no Firebase).
(function attachMsbBreakFlow(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MsbBreakFlow = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const BREAK_SECONDS = 60;
  const SIDES = new Set(["red", "blue"]);

  function nextTieBreakCount(currentCount) {
    const count = Number(currentCount);
    return Number.isInteger(count) && count >= 0 ? count + 1 : 1;
  }

  // After a regular end is recorded: break before the next end, choose a tie-break starter, or end.
  function afterRegularEnd({ currentEnd, totalEnds, redScore, blueScore }) {
    if (Number(currentEnd) < Number(totalEnds)) return { type: "break", nextEnd: Number(currentEnd) + 1 };
    if (Number(redScore) === Number(blueScore)) return { type: "chooseTieBreakStarter" };
    return { type: "endMatch" };
  }

  // After a tie-break end: another tie-break (choose starter again) or end with a winner.
  function afterTieBreakEnd({ red, blue }) {
    if (Number(red) === Number(blue)) return { type: "chooseTieBreakStarter" };
    return { type: "endMatch", winner: Number(red) > Number(blue) ? "red" : "blue" };
  }

  // The TB number the break leads into: the current one when continueTieBreakFlow already
  // advanced the count (TB 2…), otherwise the first one.
  function upcomingTieBreakCount(tieBreak) {
    const tb = tieBreak || {};
    return tb.active ? Number(tb.count) : nextTieBreakCount(tb.count);
  }

  const tieBreakBreakLabel = count => `準備決勝局 TB ${count}`;
  const regularBreakLabel = nextEnd => `準備第 ${nextEnd} 局`;

  function pendingTieBreak(tieBreak, starter, breakTimeLeft = BREAK_SECONDS) {
    if (!SIDES.has(starter)) return null;
    return { starter, count: upcomingTieBreakCount(tieBreak), breakTimeLeft: clampSeconds(breakTimeLeft) };
  }

  function clampSeconds(value) {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) ? Math.min(BREAK_SECONDS, Math.max(0, n)) : BREAK_SECONDS;
  }

  // Ending a break: a tie-break break never touches currentEnd numbering or resets the end.
  function finishBreakAction({ pendingNextEnd, pendingTieBreak: pending }) {
    if (pending && SIDES.has(pending.starter)) return { type: "startTieBreak", starter: pending.starter };
    if (pendingNextEnd != null) return { type: "regularEnd", nextEnd: pendingNextEnd };
    return { type: "none" };
  }

  // Restoring saved progress: the saved tie-break break only applies when it still matches the
  // saved tie-break state; a tie-break waiting for a starter reopens the starter choice.
  function restoreAction(progress) {
    const tb = progress && progress.tieBreak || {};
    const pending = progress && progress.pendingTieBreak;
    if (tb.winner) return { type: "none" };
    if (pending && SIDES.has(pending.starter) && Number(pending.count) === upcomingTieBreakCount(tb)
      && (tb.active || tb.required)) {
      return { type: "tieBreakBreak", starter: pending.starter, count: Number(pending.count),
        breakTimeLeft: clampSeconds(pending.breakTimeLeft) };
    }
    if ((tb.required && !tb.active) || (tb.active && !SIDES.has(tb.starter))) return { type: "chooseTieBreakStarter" };
    return { type: "none" };
  }

  return Object.freeze({ BREAK_SECONDS, nextTieBreakCount, afterRegularEnd, afterTieBreakEnd, upcomingTieBreakCount,
    tieBreakBreakLabel, regularBreakLabel, pendingTieBreak, finishBreakAction, restoreAction });
});
