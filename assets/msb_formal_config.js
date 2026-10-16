// msb_formal_config.js - authoritative National competition format.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.NationalFormalMsbConfig = api;
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const NATIONAL_COMPETITION_FORMAT = "team";
  // Missing settings and legacy match documents keep the proven historical
  // format. New competition defaults are stored separately and may be changed
  // by an administrator before a match is started.
  const NATIONAL_TOTAL_ENDS = 6;
  const LEGACY_SCOREBOARD_CONFIG = Object.freeze({ regularEnds: 6, endDurationSeconds: 300 });
  const NATIONAL_SCOREBOARD_DEFAULT = Object.freeze({ regularEnds: 4, endDurationSeconds: 180 });
  const SCOREBOARD_CONFIG_SCHEMA_VERSION = "national_scoreboard_config_v1";
  const NATIONAL_CATEGORIES = Object.freeze([
    "cerebral_palsy",
    "intellectual",
    "physical",
    "children",
    "other",
    "inclusive",
    "senior"
  ]);
  const CATEGORY_FORMATS = Object.freeze(Object.fromEntries(
    NATIONAL_CATEGORIES.map(category => [category, Object.freeze({
      category,
      competitionFormat: NATIONAL_COMPETITION_FORMAT,
      totalEnds: NATIONAL_TOTAL_ENDS
    })])
  ));
  const TEAM_SCOREBOARD_CONFIG = Object.freeze({
    mode: "Team",
    competitionFormat: NATIONAL_COMPETITION_FORMAT,
    seconds: 300,
    label: "團體賽",
    warmUpOnly: false
  });

  function normalizeScoreboardConfig(value) {
    if (!value || typeof value !== "object") throw new Error("NATIONAL_SCOREBOARD_CONFIG_INVALID");
    const regularEnds = Number(value.regularEnds);
    const endDurationSeconds = Number(value.endDurationSeconds);
    if (!Number.isInteger(regularEnds) || regularEnds < 1 || regularEnds > 20
      || !Number.isInteger(endDurationSeconds) || endDurationSeconds < 60 || endDurationSeconds > 1800) {
      throw new Error("NATIONAL_SCOREBOARD_CONFIG_INVALID");
    }
    return Object.freeze({ regularEnds, endDurationSeconds });
  }

  function resolveScoreboardConfig({ snapshot, competitionDefault, hasCompetitionDefault } = {}) {
    if (snapshot != null) return normalizeScoreboardConfig(snapshot);
    if (hasCompetitionDefault) return normalizeScoreboardConfig(competitionDefault);
    return LEGACY_SCOREBOARD_CONFIG;
  }

  function gameConfig(mode, scoreboardConfig) {
    const name = String(mode || "").toLowerCase();
    if (name.includes("warmuponly") || name.includes("僅計時")) {
      return { mode: "WarmUpOnly", seconds: 120, ends: 0, label: "僅計時暖身", warmUpOnly: true };
    }

    const config = scoreboardConfig == null
      ? LEGACY_SCOREBOARD_CONFIG
      : normalizeScoreboardConfig(scoreboardConfig);
    return {
      ...TEAM_SCOREBOARD_CONFIG,
      seconds: config.endDurationSeconds,
      ends: config.regularEnds
    };
  }

  function formatForCategory(category) {
    const format = CATEGORY_FORMATS[String(category || "")];
    if (!format) throw new Error("NATIONAL_CATEGORY_INVALID");
    return { ...format };
  }

  function regularEndReports(endReports) {
    return (Array.isArray(endReports) ? endReports : [])
      .filter(report => report && report.type === "end")
      .slice()
      .sort((left, right) => Number(left.end) - Number(right.end));
  }

  function hasCompleteEndReports(endReports, regularEnds = NATIONAL_TOTAL_ENDS) {
    const requiredEnds = Number(regularEnds);
    if (!Number.isInteger(requiredEnds) || requiredEnds < 1 || requiredEnds > 20) return false;
    const reports = Array.isArray(endReports) ? endReports : [];
    if (reports.length !== requiredEnds) return false;
    const endNumbers = new Set(reports.map(report => Number(report && report.end)));
    return endNumbers.size === requiredEnds
      && Array.from({ length: requiredEnds }, (_, index) => index + 1)
        .every(endNumber => endNumbers.has(endNumber));
  }

  function hasCompleteRegularEndReports(endReports, regularEnds = NATIONAL_TOTAL_ENDS) {
    return hasCompleteEndReports(regularEndReports(endReports), regularEnds);
  }

  function readEndScore(report, side) {
    const nestedScore = report && report[side] && report[side].endScore;
    if (nestedScore != null) return Number(nestedScore);
    return Number(report && report[`${side}Score`]);
  }

  function endScorePair(report) {
    return {
      red: readEndScore(report, "red"),
      blue: readEndScore(report, "blue")
    };
  }

  function hasRecordedEndScore(report) {
    const scores = endScorePair(report);
    return Number.isFinite(scores.red)
      && Number.isFinite(scores.blue)
      && scores.red >= 0
      && scores.blue >= 0
      && (scores.red > 0 || scores.blue > 0);
  }

  function incompleteRegularEndNumbers(endReports, regularEnds = NATIONAL_TOTAL_ENDS) {
    const requiredEnds = Number(regularEnds);
    if (!Number.isInteger(requiredEnds) || requiredEnds < 1 || requiredEnds > 20) return [];
    const reportByEnd = new Map();
    regularEndReports(endReports).forEach(report => {
      reportByEnd.set(Number(report.end), report);
    });
    return Array.from({ length: requiredEnds }, (_, index) => index + 1)
      .filter(endNumber => !hasRecordedEndScore(reportByEnd.get(endNumber)));
  }

  function sumEndScores(endReports, requiredEnds = NATIONAL_TOTAL_ENDS) {
    const reports = Array.isArray(endReports) ? endReports.slice() : [];
    if (!hasCompleteEndReports(reports, requiredEnds)) {
      throw new Error("NATIONAL_END_REPORTS_INCOMPLETE");
    }
    return reports.reduce((totals, report) => {
      const red = readEndScore(report, "red");
      const blue = readEndScore(report, "blue");
      if (!Number.isFinite(red) || !Number.isFinite(blue)) {
        throw new Error("NATIONAL_END_SCORE_INVALID");
      }
      totals.red += red;
      totals.blue += blue;
      return totals;
    }, { red: 0, blue: 0 });
  }

  function sumRegularScores(endReports, regularEnds = NATIONAL_TOTAL_ENDS) {
    const reports = regularEndReports(endReports);
    if (!hasCompleteRegularEndReports(reports, regularEnds)) {
      throw new Error("NATIONAL_FORMAL_END_REPORTS_INCOMPLETE");
    }
    return sumEndScores(reports, regularEnds);
  }

  function winnerForRegularScores(scores) {
    if (!scores || scores.red === scores.blue) return null;
    return scores.red > scores.blue ? "red" : "blue";
  }

  return Object.freeze({
    NATIONAL_COMPETITION_FORMAT,
    NATIONAL_TOTAL_ENDS,
    LEGACY_SCOREBOARD_CONFIG,
    NATIONAL_SCOREBOARD_DEFAULT,
    SCOREBOARD_CONFIG_SCHEMA_VERSION,
    NATIONAL_CATEGORIES,
    gameConfig,
    normalizeScoreboardConfig,
    resolveScoreboardConfig,
    formatForCategory,
    regularEndReports,
    hasCompleteEndReports,
    hasCompleteRegularEndReports,
    readEndScore,
    endScorePair,
    hasRecordedEndScore,
    incompleteRegularEndNumbers,
    sumEndScores,
    sumRegularScores,
    winnerForRegularScores
  });
});
