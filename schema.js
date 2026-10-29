/* Survey definition. Branches live here, not in the UI code. */
(function () {
  "use strict";

  function choices() {
    return Array.prototype.slice.call(arguments).map(function (value) {
      if (typeof value === "string") return { value: value, label: value };
      return value;
    });
  }

  function abc(a, b, c) {
    return [
      { value: "A", label: a },
      { value: "B", label: b },
      { value: "C", label: c }
    ];
  }

  var PERSONAS = [
    { id: "jee", label: "JEE aspirant", hint: "Class 11, 12 or a dropper" },
    { id: "neet", label: "NEET aspirant", hint: "Class 11, 12 or a dropper" },
    { id: "c10", label: "Class 10", hint: "Boards next year or this year" },
    { id: "c12", label: "Class 12", hint: "Boards, any stream" },
    { id: "dev", label: "Working or developer", hint: "Job, internship or building things" }
  ];

  var SUBJECTS = {
    jee: choices("Physics", "Chemistry", "Maths", "Organic chemistry", "Physical chemistry", "Inorganic chemistry"),
    neet: choices("Physics", "Chemistry", "Biology", "Botany", "Zoology", "Organic chemistry"),
    c10: choices("Maths", "Science", "Social science", "English", "Hindi or another language", "Computer applications"),
    c12: choices("Physics", "Chemistry", "Maths", "Biology", "English", "Accountancy", "Economics", "Business studies"),
    dev: choices("DSA", "System design", "A specific language", "Frontend", "Backend", "Data / ML", "Communication")
  };

  var PERSONA_SCREEN = {
    id: "persona",
    kind: "persona",
    title: "First, which one are you?",
    help: "This changes the next few questions, so you only answer what applies to you."
  };

  var COMMON_BEFORE = [
    {
      id: "goal",
      kind: "text",
      title: "My goal in one line",
      help: "e.g. 90%+ boards, top 1000 rank, ship my side project by December",
      placeholder: "Type your goal",
      required: true,
      maxLength: 120
    },
    {
      id: "weak_subjects",
      kind: "multi",
      title: "Your weakest areas",
      help: "Pick up to 2. Tap a selected one to remove it.",
      min: 1,
      max: 2,
      optionsByPersona: true
    }
  ];

  var COMMON_AFTER = [
    {
      id: "rhythm",
      kind: "timepair",
      title: "Your normal day",
      help: "Rough times are fine. Use the checkbox if you usually sleep past midnight.",
      fields: [
        { key: "wake", label: "I wake up at" },
        { key: "bed", label: "I go to sleep at" }
      ],
      checkbox: { key: "after_midnight", label: "I usually sleep after midnight" },
      validate: "wakebed"
    },
    {
      id: "busy",
      kind: "timepair",
      title: "School, college or work",
      help: "Your main fixed block. If it changes daily, use an average day.",
      fields: [
        { key: "busy_start", label: "Starts at" },
        { key: "busy_end", label: "Ends at" }
      ],
      validate: "busy"
    },
    {
      id: "peak",
      kind: "choice",
      title: "When is your head sharpest?",
      options: choices(
        { value: "morning", label: "Morning", hint: "6-10 am" },
        { value: "afternoon", label: "Afternoon", hint: "3-6 pm" },
        { value: "night", label: "Night", hint: "7-10 pm" }
      )
    },
    {
      id: "focus_bucket",
      kind: "choice",
      title: "Focused hours you can realistically give",
      help: "On a normal day, not your best day.",
      options: choices("under 1", "1-2", "2-3", "3-4", "4+")
    },
    {
      id: "struggles",
      kind: "multi",
      title: "What gets in the way?",
      help: "Pick everything that applies.",
      min: 1,
      max: 6,
      options: choices("Procrastination", "Phone", "Low energy", "Inconsistent", "Overwhelmed", "Other")
    },
    {
      id: "quit_reason",
      kind: "text",
      title: "The last time you quit a routine, why?",
      help: "One line. Optional, but it changes the advice more than any other answer.",
      placeholder: "e.g. fell sick for a week and never restarted",
      required: false,
      maxLength: 160
    },
    {
      id: "reminder",
      kind: "choice",
      title: "Best reminder for you",
      options: choices("Gentle notification", "Loud alarm", "Both", "Widget only")
    },
    {
      id: "widget_use",
      kind: "choice",
      title: "Would you use a home-screen widget daily?",
      help: "A small box with a Start button and today's plan.",
      options: choices("Yes", "Maybe", "No")
    },
    {
      id: "cue",
      kind: "cue",
      title: "A daily routine you almost never skip",
      help: "Optional, but it lets the app attach study to something you already do. e.g. tea after waking, walk after dinner.",
      namePlaceholder: "e.g. tea right after waking"
    }
  ];

  var EXTRAS = {
    jee: [
      {
        id: "attempt_year",
        kind: "choice",
        title: "Which attempt?",
        options: choices("2027", "2028", "2029 or later", "Not decided")
      },
      {
        id: "target_band",
        kind: "choice",
        title: "Your realistic target",
        options: choices("Top 1000", "1000-5000", "5000-15000", "15000+", "Not sure yet")
      },
      {
        id: "coaching_hours",
        kind: "choice",
        title: "Coaching or tuition per day",
        options: choices("None", "Up to 2 hours", "2-4 hours", "4+ hours")
      },
      {
        id: "mock_day",
        kind: "choice",
        title: "Usual mock-test day",
        options: choices("Sunday", "Saturday", "A weekday", "No fixed day")
      }
    ],
    neet: [
      {
        id: "attempt_year",
        kind: "choice",
        title: "Which attempt?",
        options: choices("2027", "2028", "2029 or later", "Not decided")
      },
      {
        id: "target_band",
        kind: "choice",
        title: "Your realistic target",
        options: choices("650+", "600-650", "550-600", "Below 550", "Not sure yet")
      },
      {
        id: "coaching_hours",
        kind: "choice",
        title: "Coaching or tuition per day",
        options: choices("None", "Up to 2 hours", "2-4 hours", "4+ hours")
      },
      {
        id: "mock_day",
        kind: "choice",
        title: "Usual mock-test day",
        options: choices("Sunday", "Saturday", "A weekday", "No fixed day")
      }
    ],
    c10: [
      {
        id: "board_year",
        kind: "choice",
        title: "Boards in",
        options: choices("2027", "2028", "2029")
      },
      {
        id: "target_percent",
        kind: "choice",
        title: "Your target",
        options: choices("95%+", "90-95%", "85-90%", "Below 85%")
      },
      {
        id: "tuition_hours",
        kind: "choice",
        title: "Tuition per day",
        options: choices("None", "Up to 1 hour", "1-2 hours", "2+ hours")
      }
    ],
    c12: [
      {
        id: "board_year",
        kind: "choice",
        title: "Boards in",
        options: choices("2027", "2028", "2029")
      },
      {
        id: "stream",
        kind: "choice",
        title: "Your stream",
        options: choices("PCM", "PCB", "PCMB", "Commerce", "Humanities")
      },
      {
        id: "target_percent",
        kind: "choice",
        title: "Your target",
        options: choices("95%+", "90-95%", "85-90%", "Below 85%")
      },
      {
        id: "tuition_hours",
        kind: "choice",
        title: "Tuition per day",
        options: choices("None", "Up to 1 hour", "1-2 hours", "2+ hours")
      }
    ],
    dev: [
      {
        id: "work_mode",
        kind: "choice",
        title: "Your situation",
        options: choices("Student", "Working full-time", "Working part-time", "Freelance")
      },
      {
        id: "meetings_per_day",
        kind: "choice",
        title: "Meetings on a normal day",
        options: choices("None", "1-2", "3-4", "5+")
      },
      {
        id: "commute_minutes",
        kind: "choice",
        title: "One-way commute",
        options: choices("0", "Up to 30 min", "30-60 min", "60+ min")
      },
      {
        id: "deep_work_goal",
        kind: "choice",
        title: "Deep work you want per day",
        options: choices("30 min", "60 min", "90 min", "2 hours", "3+ hours")
      }
    ]
  };

  var SCENARIOS = [
    {
      id: "s1",
      kind: "scenario",
      title: "Quick situations: a 45-minute homework task, due tomorrow",
      help: "Answer what you would actually do. The school day ends at 15:00 and you feel tired around 16:00.",
      options: abc(
        "2-minute start, then the rest at 16:00",
        "Two 25-minute rounds at 16:00 with a 5-minute break",
        "One 45-minute block at 20:00 after dinner"
      )
    },
    {
      id: "s2",
      kind: "scenario",
      title: "40 minutes of revision, phone nearby",
      help: "The phone keeps pulling you away.",
      options: abc(
        "40 min right after school, phone in another room",
        "Four 10-minute pieces across the day",
        "40 min at 6:30 am"
      )
    },
    {
      id: "s3",
      kind: "scenario",
      title: "90 minutes of deep work",
      help: "Meetings 10:00-12:00 and 14:00-15:00.",
      options: abc("9:00-10:30", "15:30-17:00", "Three 30-minute pieces between meetings")
    },
    {
      id: "s4",
      kind: "scenario",
      title: "You missed yesterday completely",
      help: "Nothing got done. Today is a normal day otherwise.",
      options: abc(
        "Do today's plan plus yesterday's",
        "Do a 10-minute minimum today and continue normally tomorrow",
        "Skip and restart on the weekend"
      )
    },
    {
      id: "s5",
      kind: "scenario",
      title: "Three subjects of homework",
      help: "2 hours total, evening 18:00-21:00.",
      options: abc(
        "One long block per subject",
        "25-minute rounds, switching subjects",
        "Hardest subject first, easiest last"
      )
    },
    {
      id: "s6",
      kind: "scenario",
      title: "Low energy day with 6 tasks planned",
      help: "You slept badly and the list is long.",
      options: abc("Do all six, but shorter", "Pick the top 2 only", "Postpone everything to tomorrow")
    },
    {
      id: "s7",
      kind: "scenario",
      title: "Exam in 7 days, one weak topic",
      help: "Everything else is on track.",
      options: abc(
        "One long block daily",
        "Two short blocks daily: morning and before sleep",
        "Test yourself on day 1, then review on days 2-7"
      )
    },
    {
      id: "s8",
      kind: "scenario",
      title: "A task starts at 18:00",
      help: "Which reminder would actually get you started?",
      options: abc(
        "Notification at 17:55",
        "Loud alarm at 18:00",
        "Notification at 17:30 and alarm at 18:00"
      )
    }
  ];

  var REVIEW = { id: "review", kind: "review", title: "One last look" };

  window.TICKOFF_SURVEY = {
    version: "2026-10-29b",
    personas: PERSONAS,
    personaScreen: PERSONA_SCREEN,
    subjects: SUBJECTS,
    commonBefore: COMMON_BEFORE,
    commonAfter: COMMON_AFTER,
    extras: EXTRAS,
    scenarios: SCENARIOS,
    review: REVIEW,
    scenarioIds: SCENARIOS.map(function (item) { return item.id; })
  };
})();
