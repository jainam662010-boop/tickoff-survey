/* Survey engine: one screen at a time, schema-driven, no framework. */
(function () {
  "use strict";

  var schema = window.TICKOFF_SURVEY;
  var V = window.TickoffValidate;
  var cfg = window.TICKOFF_CONFIG || {};
  var STORAGE_KEY = "tickoff_survey_v3";
  var DEMO = !cfg.supabaseUrl || !cfg.supabaseAnonKey ||
    new URLSearchParams(window.location.search).has("demo");

  var state = {
    answers: {},
    persona: null,
    screens: [],
    index: 0,
    elapsedMs: 0,
    lastTick: Date.now(),
    submitting: false
  };

  var app = document.getElementById("app");
  var progressBar = document.getElementById("progress-bar");
  var stepLabel = document.getElementById("step-label");
  var backButton = document.getElementById("back");
  var nextButton = document.getElementById("next");
  var errorBox = document.getElementById("error");
  var notice = document.getElementById("notice");

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (key === "class") node.className = attrs[key];
      else if (key === "text") node.textContent = attrs[key];
      else if (key === "html") node.innerHTML = attrs[key];
      else if (key.indexOf("on") === 0) node.addEventListener(key.slice(2), attrs[key]);
      else if (attrs[key] !== null && attrs[key] !== undefined) node.setAttribute(key, attrs[key]);
    });
    (children || []).forEach(function (child) {
      if (child) node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    });
    return node;
  }

  function screensFor(persona) {
    if (!persona) return [schema.personaScreen];
    return [schema.personaScreen]
      .concat(schema.commonBefore)
      .concat(schema.extras[persona] || [])
      .concat(schema.commonAfter)
      .concat(schema.scenarios)
      .concat([schema.review]);
  }

  function clearOtherExtras(persona) {
    Object.keys(schema.extras).forEach(function (key) {
      if (key === persona) return;
      (schema.extras[key] || []).forEach(function (screen) {
        delete state.answers[screen.id];
      });
    });
  }

  function save() {
    var now = Date.now();
    state.elapsedMs += now - state.lastTick;
    state.lastTick = now;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: schema.version,
        answers: state.answers,
        persona: state.persona,
        index: state.index,
        elapsedMs: state.elapsedMs
      }));
    } catch (error) {
      /* private mode: keep going, just do not persist */
    }
  }

  function restore() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      var saved = JSON.parse(raw);
      if (saved.version !== schema.version) return false;
      state.answers = saved.answers || {};
      state.persona = saved.persona || null;
      state.screens = screensFor(state.persona);
      state.index = Math.min(saved.index || 0, state.screens.length - 1);
      state.elapsedMs = saved.elapsedMs || 0;
      return Object.keys(state.answers).length > 0;
    } catch (error) {
      return false;
    }
  }

  function setError(message) {
    if (!message) {
      errorBox.hidden = true;
      errorBox.textContent = "";
      return;
    }
    errorBox.hidden = false;
    errorBox.textContent = message;
  }

  function progress() {
    var total = state.screens.length - 1;
    var value = total <= 0 ? 0 : Math.round((state.index / total) * 100);
    progressBar.style.width = value + "%";
    progressBar.setAttribute("aria-valuenow", String(value));
    stepLabel.textContent = "Step " + (state.index + 1) + " of " + state.screens.length;
  }

  function setAnswer(key, value) {
    if (value === "" || value === null || (Array.isArray(value) && value.length === 0)) {
      delete state.answers[key];
    } else {
      state.answers[key] = value;
    }
    save();
  }

  function toggleMulti(screen, value) {
    var selected = (state.answers[screen.id] || []).slice();
    var at = selected.indexOf(value);
    if (at !== -1) {
      selected.splice(at, 1);
    } else {
      selected.push(value);
      var max = screen.max || 99;
      while (selected.length > max) selected.shift();
    }
    setAnswer(screen.id, selected);
    render();
  }

  function choiceCard(screen, option, selected, onPick) {
    return el("button", {
      type: "button",
      class: "card" + (selected ? " selected" : ""),
      role: "radio",
      "aria-checked": selected ? "true" : "false",
      onclick: onPick
    }, [
      el("span", { class: "card-label", text: option.label }),
      option.hint ? el("span", { class: "card-hint", text: option.hint }) : null
    ]);
  }

  function renderPersona(screen) {
    var wrap = el("div", { class: "cards" });
    schema.personas.forEach(function (persona) {
      wrap.appendChild(el("button", {
        type: "button",
        class: "card" + (state.answers.persona === persona.id ? " selected" : ""),
        role: "radio",
        "aria-checked": state.answers.persona === persona.id ? "true" : "false",
        onclick: function () {
          if (state.persona === persona.id) {
            go(1);
            return;
          }
          clearOtherExtras(persona.id);
          setAnswer("persona", persona.id);
          state.persona = persona.id;
          state.screens = screensFor(persona.id);
          state.index = 1;
          render();
        }
      }, [
        el("span", { class: "card-label", text: persona.label }),
        el("span", { class: "card-hint", text: persona.hint })
      ]));
    });
    return wrap;
  }

  function renderChoice(screen) {
    var options = screen.kind === "scenario" ? screen.options : V.optionValues(screen, schema, state.answers.persona);
    var wrap = el("div", { class: "cards" + (screen.kind === "scenario" ? " scenario" : "") });
    options.forEach(function (option) {
      var selected = state.answers[screen.id] === option.value;
      wrap.appendChild(choiceCard(screen, option, selected, function () {
        setAnswer(screen.id, option.value);
        if (screen.kind !== "scenario") {
          window.setTimeout(function () {
            if (state.answers[screen.id] === option.value) go(1);
          }, 220);
        } else {
          render();
        }
      }));
    });

    if (screen.kind === "scenario") {
      var why = el("input", {
        type: "text",
        class: "input",
        maxlength: "120",
        placeholder: "Why? Optional, one line",
        value: state.answers[screen.id + "_why"] || ""
      });
      why.addEventListener("input", function () { setAnswer(screen.id + "_why", why.value); });
      wrap.appendChild(el("label", { class: "why" }, [el("span", { class: "field-label", text: "Why (optional)" }), why]));
    }
    return wrap;
  }

  function renderMulti(screen) {
    var selected = state.answers[screen.id] || [];
    var options = V.optionValues(screen, schema, state.answers.persona);
    var wrap = el("div", { class: "cards" });
    options.forEach(function (option) {
      var isOn = selected.indexOf(option.value) !== -1;
      wrap.appendChild(choiceCard(screen, option, isOn, function () {
        toggleMulti(screen, option.value);
      }));
    });
    wrap.appendChild(el("p", {
      class: "counter",
      text: selected.length + " selected" + (screen.max && screen.max < 99 ? " / " + screen.max : "")
    }));
    return wrap;
  }

  function timeInput(key, label, value) {
    var input = el("input", { type: "time", class: "input time", step: "300", value: value || "" });
    input.addEventListener("input", function () { setAnswer(key, input.value); });
    return el("label", { class: "field" }, [el("span", { class: "field-label", text: label }), input]);
  }

  function renderTimepair(screen) {
    var wrap = el("div", { class: "time-grid" });
    screen.fields.forEach(function (field) {
      wrap.appendChild(timeInput(field.key, field.label, state.answers[field.key]));
    });
    if (screen.checkbox) {
      var box = el("input", { type: "checkbox", id: "cb-" + screen.checkbox.key });
      box.checked = !!state.answers[screen.checkbox.key];
      box.addEventListener("change", function () {
        setAnswer(screen.checkbox.key, box.checked ? true : "");
        render();
      });
      wrap.appendChild(el("label", { class: "checkbox", for: "cb-" + screen.checkbox.key }, [box, " " + screen.checkbox.label]));
    }
    return wrap;
  }

  function renderCue(screen) {
    var name = el("input", {
      type: "text",
      class: "input",
      maxlength: "60",
      placeholder: screen.namePlaceholder,
      value: state.answers.cue_name || ""
    });
    name.addEventListener("input", function () { setAnswer("cue_name", name.value); });
    var time = el("input", { type: "time", class: "input time", step: "300", value: state.answers.cue_time || "" });
    time.addEventListener("input", function () { setAnswer("cue_time", time.value); });
    return el("div", { class: "time-grid" }, [
      el("label", { class: "field" }, [el("span", { class: "field-label", text: "Routine" }), name]),
      el("label", { class: "field" }, [el("span", { class: "field-label", text: "At" }), time])
    ]);
  }

  function renderText(screen) {
    var value = state.answers[screen.id] || "";
    var multiline = (screen.maxLength || 0) > 120;
    var input = el(multiline ? "textarea" : "input", {
      type: multiline ? null : "text",
      class: "input" + (multiline ? " textarea" : ""),
      maxlength: String(screen.maxLength || 200),
      placeholder: screen.placeholder || "",
      rows: multiline ? "3" : null
    });
    input.value = value;
    input.addEventListener("input", function () { setAnswer(screen.id, input.value); });
    return el("label", { class: "field" }, [input]);
  }

  function displayAnswer(screen) {
    var answer = state.answers[screen.id];
    if (screen.kind === "persona") {
      var persona = schema.personas.find(function (item) { return item.id === answer; });
      return persona ? persona.label : "";
    }
    if (screen.kind === "choice") return V.labelFor(screen, schema, state.answers.persona, answer) || "";
    if (screen.kind === "multi") return (answer || []).join(", ");
    if (screen.kind === "text") return answer || "";
    if (screen.kind === "timepair") {
      var text = screen.fields.map(function (field) {
        return field.label + " " + (state.answers[field.key] || "?");
      }).join(", ");
      if (screen.checkbox && state.answers[screen.checkbox.key]) {
        text += " (" + screen.checkbox.label.toLowerCase() + ")";
      }
      return text;
    }
    if (screen.kind === "cue") {
      return state.answers.cue_name
        ? state.answers.cue_name + " at " + (state.answers.cue_time || "?")
        : "";
    }
    if (screen.kind === "scenario") {
      var option = screen.options.find(function (item) { return item.value === answer; });
      return answer && option ? answer + ") " + option.label : "";
    }
    return answer ? String(answer) : "";
  }

  function renderReview() {
    var list = el("dl", { class: "review" });
    state.screens.forEach(function (screen, index) {
      if (screen.kind === "review" || screen.kind === "persona") return;
      var value = displayAnswer(screen);
      if (!value) return;
      var row = el("div", { class: "review-row" }, [
        el("dt", { text: screen.title }),
        el("dd", { text: value }),
        el("button", {
          type: "button",
          class: "edit",
          text: "Edit",
          onclick: function () { state.index = index; render(); }
        })
      ]);
      list.appendChild(row);
    });
    var note = el("p", {
      class: "fineprint",
      text: "Anonymous: no name, email or phone number is collected. Answers are stored with a random id so duplicates can be removed."
    });
    return el("div", {}, [list, note]);
  }

  function render() {
    var screen = state.screens[state.index];
    app.innerHTML = "";
    setError("");

    var title = el("h1", { class: "question", text: screen.title });
    var help = screen.help ? el("p", { class: "help", text: screen.help }) : null;
    var body;

    if (screen.kind === "persona") body = renderPersona(screen);
    else if (screen.kind === "choice" || screen.kind === "scenario") body = renderChoice(screen);
    else if (screen.kind === "multi") body = renderMulti(screen);
    else if (screen.kind === "timepair") body = renderTimepair(screen);
    else if (screen.kind === "cue") body = renderCue(screen);
    else if (screen.kind === "text") body = renderText(screen);
    else body = renderReview();

    app.appendChild(el("div", { class: "screen" }, [title, help, body]));
    progress();

    backButton.disabled = state.index === 0;
    backButton.textContent = "Back";
    nextButton.textContent = screen.kind === "review" ? "Submit" : "Continue";
    nextButton.disabled = state.submitting;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function go(delta) {
    var screen = state.screens[state.index];
    if (delta > 0) {
      var error = V.validateScreen(screen, state.answers, schema);
      if (error) {
        setError(error);
        return;
      }
      if (screen.kind === "review") {
        submit();
        return;
      }
    }
    state.index = Math.max(0, Math.min(state.screens.length - 1, state.index + delta));
    save();
    render();
  }

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (char) {
      var random = Math.random() * 16 | 0;
      var value = char === "x" ? random : (random & 0x3 | 0x8);
      return value.toString(16);
    });
  }

  function respondentId() {
    var key = "tickoff_respondent_id";
    var existing = window.localStorage.getItem(key);
    if (existing) return existing;
    var created = uuid();
    try { window.localStorage.setItem(key, created); } catch (error) { /* ignore */ }
    return created;
  }

  function buildRow() {
    var payload = V.normalize(state.answers);
    payload.persona = state.persona;
    return {
      respondent_id: respondentId(),
      persona: state.persona,
      form_version: schema.version,
      duration_ms: Math.min(7200000, state.elapsedMs + (Date.now() - state.lastTick)),
      payload: payload
    };
  }

  function download(row) {
    var blob = new Blob([JSON.stringify(row, null, 2)], { type: "application/json" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "tickoff-answers-" + row.respondent_id.slice(0, 8) + ".json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  }

  function post(row) {
    var base = String(cfg.supabaseUrl || "").replace(/\/+$/, "");
    return fetch(base + "/rest/v1/" + (cfg.table || "survey_responses"), {
      method: "POST",
      headers: {
        apikey: cfg.supabaseAnonKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(row)
    });
  }

  function done(mode, row) {
    state.submitting = false;
    try { window.localStorage.removeItem(STORAGE_KEY); } catch (error) { /* ignore */ }
    document.querySelector(".shell").classList.add("done");
    app.innerHTML = "";
    var thanks = el("div", { class: "screen thanks" }, [
      el("h1", { class: "question", text: mode === "demo" ? "Answers ready" : "Thanks. That actually helps." }),
      el("p", {
        class: "help",
        text: mode === "demo"
          ? "This form is running without a database, so your answers were downloaded as a JSON file. Send it back to whoever shared the link."
          : "Your answers are in. Nothing identifying was collected."
      }),
      el("div", { class: "done-actions" }, [
        el("button", { type: "button", class: "primary", text: "Download my answers", onclick: function () { download(row); } }),
        el("button", { type: "button", class: "ghost", text: "Start over", onclick: reset })
      ])
    ]);
    app.appendChild(thanks);
    document.getElementById("footer").hidden = true;
    document.getElementById("header").hidden = true;
  }

  function reset() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem("tickoff_respondent_id");
    } catch (error) { /* ignore */ }
    window.location.href = window.location.pathname;
  }

  function submit() {
    if (state.submitting) return;
    state.submitting = true;
    nextButton.disabled = true;
    nextButton.textContent = "Sending...";
    var row = buildRow();

    if (DEMO) {
      download(row);
      done("demo", row);
      return;
    }

    post(row).then(function (response) {
      if (response.ok || response.status === 409) {
        done("ok", row);
        return;
      }
      return response.text().then(function (text) {
        throw new Error(text || ("HTTP " + response.status));
      });
    }).catch(function (error) {
      state.submitting = false;
      nextButton.disabled = false;
      nextButton.textContent = "Submit";
      setError("Could not send: " + error.message + ". Your answers are saved on this device - try again.");
    });
  }

  backButton.addEventListener("click", function () { go(-1); });
  nextButton.addEventListener("click", function () { go(1); });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      var tag = (event.target.tagName || "").toLowerCase();
      if (tag === "textarea" || tag === "button") return;
      event.preventDefault();
      go(1);
    }
  });

  window.addEventListener("beforeunload", save);

  var resumed = restore();
  if (!state.persona) state.screens = [schema.personaScreen];
  if (resumed) {
    notice.hidden = false;
    notice.textContent = "Resumed where you left off.";
    window.setTimeout(function () { notice.hidden = true; }, 4000);
  }
  render();
})();
