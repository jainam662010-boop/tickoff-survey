/* Shared validation and normalisation. Runs in the browser and in node tests. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.TickoffValidate = factory();
  }
})(typeof self !== "undefined" ? self : globalThis, function () {
  "use strict";

  var FOCUS_MINUTES = {
    "under 1": 45,
    "1-2": 90,
    "2-3": 150,
    "3-4": 210,
    "4+": 270
  };

  function parseTime(value) {
    if (value === null || value === undefined) return null;
    var text = String(value).trim().toLowerCase();
    if (!text) return null;
    var meridiem = null;
    if (/(am|pm)$/.test(text)) {
      meridiem = text.slice(-2);
      text = text.slice(0, -2).trim();
    }
    var parts = text.split(":");
    if (parts.length < 2) return null;
    var hours = parseInt(parts[0], 10);
    var minutes = parseInt(parts[1], 10);
    if (!isFinite(hours) || !isFinite(minutes)) return null;
    if (minutes < 0 || minutes > 59) return null;
    if (meridiem) {
      if (hours < 1 || hours > 12) return null;
      hours = (hours % 12) + (meridiem === "pm" ? 12 : 0);
    }
    if (hours < 0 || hours > 24) return null;
    return hours * 60 + minutes;
  }

  function formatTime(minutes) {
    if (minutes === null || minutes === undefined) return "";
    var h = Math.floor(minutes / 60);
    var m = minutes % 60;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  }

  function awakeSpan(answers) {
    var wake = parseTime(answers.wake);
    var bed = parseTime(answers.bed);
    if (wake === null || bed === null) return null;
    var span = answers.after_midnight ? (bed - wake + 1440) % 1440 : bed - wake;
    return span;
  }

  function optionValues(screen, schema, persona) {
    var options = screen.optionsByPersona && schema.subjects[persona]
      ? schema.subjects[persona]
      : screen.options || [];
    return options.map(function (option) {
      return typeof option === "string" ? { value: option, label: option } : option;
    });
  }

  function labelFor(screen, schema, persona, value) {
    var found = optionValues(screen, schema, persona).find(function (option) {
      return option.value === value;
    });
    return found ? found.label : value;
  }

  function validateScreen(screen, answers, schema) {
    var persona = answers.persona;

    if (screen.kind === "persona") {
      if (!schema.personas.some(function (item) { return item.id === persona; })) {
        return "Pick the option that fits you best.";
      }
      return null;
    }

    if (screen.kind === "choice" || screen.kind === "scenario") {
      var chosen = answers[screen.id];
      if (!chosen) return "Pick one option.";
      var allowed = optionValues(screen, schema, persona).map(function (option) {
        return option.value;
      });
      if (allowed.indexOf(chosen) === -1) return "Pick one of the listed options.";
      if (screen.kind === "scenario" && String(answers[screen.id + "_why"] || "").length > 120) {
        return "Keep the why under 120 characters.";
      }
      return null;
    }

    if (screen.kind === "multi") {
      var selected = answers[screen.id] || [];
      var min = screen.min === undefined ? 1 : screen.min;
      var max = screen.max === undefined ? 99 : screen.max;
      if (selected.length < min) {
        return min === 1 ? "Pick at least one." : "Pick at least " + min + ".";
      }
      if (selected.length > max) {
        return "Pick at most " + max + ".";
      }
      return null;
    }

    if (screen.kind === "text") {
      var text = String(answers[screen.id] || "").trim();
      if (screen.required !== false && !text) return "This one is required.";
      var limit = screen.maxLength || 200;
      if (text.length > limit) return "Keep it under " + limit + " characters.";
      if (text.length && text.length < (screen.minLength || 0)) return "A little more detail, please.";
      return null;
    }

    if (screen.kind === "timepair") {
      for (var i = 0; i < screen.fields.length; i += 1) {
        var field = screen.fields[i];
        var value = answers[field.key];
        if (!value) return "Fill in " + field.label.toLowerCase() + ".";
        if (parseTime(value) === null) return "That time does not look right.";
      }
      if (screen.validate === "wakebed") {
        var wake = parseTime(answers.wake);
        var bed = parseTime(answers.bed);
        if (!answers.after_midnight && bed <= wake) {
          return "Bedtime is before wake-up time. Tick “I sleep after midnight” if that is right.";
        }
        var span = awakeSpan(answers);
        if (span !== null && span < 300) {
          return "That leaves less than 5 hours awake. Check the times.";
        }
        if (span !== null && span > 1200) {
          return "That is more than 20 hours awake. Check the times.";
        }
      }
      if (screen.validate === "busy") {
        var start = parseTime(answers.busy_start);
        var end = parseTime(answers.busy_end);
        if (end <= start) return "End time must be after start time.";
        if (end - start < 30) return "That block is under 30 minutes. Check the times.";
      }
      return null;
    }

    if (screen.kind === "cue") {
      var name = String(answers.cue_name || "").trim();
      var time = answers.cue_time;
      if (name && !time) return "Add the time for that routine.";
      if (!name && time) return "Name the routine, or clear the time.";
      if (name.length > 60) return "Keep the routine name under 60 characters.";
      if (time && parseTime(time) === null) return "That time does not look right.";
      return null;
    }

    if (screen.kind === "review") {
      return null;
    }

    return null;
  }

  function normalize(answers) {
    var out = {};
    Object.keys(answers).forEach(function (key) {
      var value = answers[key];
      if (value === undefined || value === null) return;
      if (typeof value === "string") {
        var trimmed = value.trim();
        if (trimmed) out[key] = trimmed;
        return;
      }
      if (Array.isArray(value)) {
        out[key] = value.slice();
        return;
      }
      out[key] = value;
    });
    return out;
  }

  function focusMinutes(bucket) {
    return FOCUS_MINUTES[bucket] || null;
  }

  function qualityFlags(answers) {
    var flags = [];
    if (!answers.s1 || !answers.s2 || !answers.s3 || !answers.s4 || !answers.s5 || !answers.s6 || !answers.s7 || !answers.s8) {
      flags.push("missing_scenarios");
    }
    var span = awakeSpan(answers);
    if (span !== null && span < 480) flags.push("short_day");
    var focus = FOCUS_MINUTES[answers.focus_bucket];
    if (focus && span !== null && focus > span) flags.push("focus_exceeds_awake");
    return flags;
  }

  return {
    FOCUS_MINUTES: FOCUS_MINUTES,
    parseTime: parseTime,
    formatTime: formatTime,
    awakeSpan: awakeSpan,
    optionValues: optionValues,
    labelFor: labelFor,
    validateScreen: validateScreen,
    normalize: normalize,
    focusMinutes: focusMinutes,
    qualityFlags: qualityFlags
  };
});
