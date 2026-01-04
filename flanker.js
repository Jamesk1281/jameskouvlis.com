export async function runFlanker(app) {
  const KEYS = { LEFT: "f", RIGHT: "j" };

  const PRACTICE_TRIALS = 7; // 7
  const TEST_TRIALS = 25; // 25

  const FIX_MS = 400;
  const ITI_MS = 600;
  const MAX_RT_MS = 2500;
  const FEEDBACK_MS = 500;

  const FLANKERS = 2;
  const STIM_FONT_PX = 52;

  const trials = [];

  await showOverview(app, KEYS);

  await runBlock(app, {
    label: "Practice",
    nTrials: PRACTICE_TRIALS,
    KEYS,
    FIX_MS,
    ITI_MS,
    MAX_RT_MS,
    FLANKERS,
    STIM_FONT_PX,
    giveFeedback: true,
    trialsOut: trials,
  });

  await runBlock(app, {
    label: "Test",
    nTrials: TEST_TRIALS,
    KEYS,
    FIX_MS,
    ITI_MS,
    MAX_RT_MS,
    FLANKERS,
    STIM_FONT_PX,
    giveFeedback: false,
    trialsOut: trials,
  });

  const testTrials = trials.filter((t) => t.block === "Test");
  const summary = computeFlankerSummary(testTrials);

  await showComplete(app, summary);

  return {
    task: "flanker_arrows_2afc",
    trials,
    summary,
  };
}

function showOverview(app, KEYS) {
  return new Promise((resolve) => {
    app.innerHTML = `
      <h1>Task 3: Flanker</h1>

      <p style="margin-bottom: 14px;">
        A row of arrows will appear. Respond to the <strong>center arrow</strong> only.
        Ignore the arrows on the sides.
      </p>

      <div style="max-width:620px; margin: 12px auto 18px; text-align:left; color:#b8b8b8;">
        <ul style="margin:0; padding-left:18px; line-height:1.6;">
          <li><strong>${KEYS.LEFT.toUpperCase()}</strong> = center arrow points <strong>left</strong></li>
          <li><strong>${KEYS.RIGHT.toUpperCase()}</strong> = center arrow points <strong>right</strong></li>
          <li>Be as fast and accurate as you can.</li>
          <li>Practice includes feedback. The test does not.</li>
        </ul>
      </div>

      <div style="
        max-width:620px;
        margin: 8px auto 18px;
        padding: 14px;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 12px;
        text-align: center;
      ">
        <div style="color:#b8b8b8; margin-bottom: 8px;">Example</div>
        <div style="font-size:46px; letter-spacing: 6px;">
          &larr;&larr;<span style="text-decoration: underline;">&larr;</span>&larr;&larr;
        </div>
        <div style="color:#b8b8b8; margin-top: 8px; font-size:0.95rem;">
          Respond LEFT (center arrow underlined)
        </div>
      </div>

      <button id="beginBtn">Begin Practice</button>
    `;

    document.getElementById("beginBtn").addEventListener("click", resolve);
  });
}

async function runBlock(app, opts) {
  const {
    label,
    nTrials,
    KEYS,
    FIX_MS,
    ITI_MS,
    MAX_RT_MS,
    FLANKERS,
    STIM_FONT_PX,
    giveFeedback,
    trialsOut,
  } = opts;

  await new Promise((resolve) => {
    app.innerHTML = `
      <h1>${label}</h1>
      <p style="color:#b8b8b8;">
        <strong>${KEYS.LEFT.toUpperCase()}</strong> = Left &nbsp;&nbsp;|&nbsp;&nbsp;
        <strong>${KEYS.RIGHT.toUpperCase()}</strong> = Right
      </p>
      <p style="color:#b8b8b8;">
        ${giveFeedback ? "Feedback is shown in practice." : "No feedback during the test."}
      </p>
      <button id="startBtn">Start</button>
    `;
    document.getElementById("startBtn").addEventListener("click", resolve);
  });

  const plan = buildTrialPlan(nTrials);

  for (let i = 0; i < plan.length; i++) {
    const t = plan[i];

    await showFixation(app, FIX_MS);

    const result = await runSingleFlankerTrial(app, {
      block: label,
      trialIndex: i + 1,
      KEYS,
      MAX_RT_MS,
      FLANKERS,
      STIM_FONT_PX,
      ...t,
    });

    trialsOut.push(result);

    if (giveFeedback) {
      await showFeedback(app, result.correct, FEEDBACK_STYLE(result));
    }

    await sleep(ITI_MS);
  }
}

async function runSingleFlankerTrial(app, {
  block,
  trialIndex,
  congruency,
  targetDir,
  KEYS,
  MAX_RT_MS,
  FLANKERS,
  STIM_FONT_PX,
}) {
  const correctKey = targetDir === "left" ? KEYS.LEFT : KEYS.RIGHT;
  const flankDir =
    congruency === "congruent"
      ? targetDir
      : targetDir === "left"
        ? "right"
        : "left";
  const stim = makeArrowRow(flankDir, targetDir, FLANKERS);

  app.innerHTML = `
    <div style="text-align:center; padding: 54px 0 18px;">
      <div style="
        font-size:${STIM_FONT_PX}px;
        letter-spacing: 6px;
        user-select: none;
      ">${stim}</div>
      <div style="color:#b8b8b8; margin-top: 14px; font-size:0.95rem;">
        ${block} — Trial ${trialIndex}
      </div>
    </div>
  `;

  const t0 = performance.now();

  const key = await waitForFirstKeypress([KEYS.LEFT, KEYS.RIGHT], MAX_RT_MS);
  const rt = key ? performance.now() - t0 : null;
  const correct = key === correctKey;

  app.innerHTML = `<div style="font-size:40px; text-align:center; padding:80px 0;">+</div>`;

  return {
    task: "flanker_arrows_2afc",
    block,
    trial: trialIndex,
    congruency,
    targetDir,
    flankDir,
    stimulus: stripTags(stim),
    correctKey,
    responseKey: key,
    correct,
    rtMs: rt,
    timeout: key === null,
  };
}

function makeArrow(dir) {
  return dir === "left" ? "&larr;" : "&rarr;";
}

function makeArrowRow(flankDir, targetDir, nFlankersEachSide) {
  const flank = makeArrow(flankDir);
  const target = makeArrow(targetDir);
  const left = Array.from({ length: nFlankersEachSide }, () => flank).join("");
  const right = Array.from({ length: nFlankersEachSide }, () => flank).join("");
  return `${left}<span style="text-decoration: underline;">${target}</span>${right}`;
}

function computeFlankerSummary(testTrials) {
  const valid = testTrials.filter((t) => !t.timeout);
  const acc = testTrials.length
    ? valid.filter((t) => t.correct).length / testTrials.length
    : 0;

  const correctTrials = valid.filter((t) => t.correct && typeof t.rtMs === "number");

  const cong = correctTrials
    .filter((t) => t.congruency === "congruent")
    .map((t) => t.rtMs);
  const incong = correctTrials
    .filter((t) => t.congruency === "incongruent")
    .map((t) => t.rtMs);

  const meanCong = mean(cong);
  const meanIncong = mean(incong);

  const interferenceMs =
    Number.isFinite(meanCong) && Number.isFinite(meanIncong)
      ? meanIncong - meanCong
      : NaN;

  return {
    accuracy: acc,
    meanRtCongruentMs: finiteOrNull(meanCong),
    meanRtIncongruentMs: finiteOrNull(meanIncong),
    interferenceMs: finiteOrNull(interferenceMs),
    nTrials: testTrials.length,
    nTimeouts: testTrials.filter((t) => t.timeout).length,
  };
}

function showComplete(app, summary) {
  return new Promise((resolve) => {
    app.innerHTML = `
      <h1>Task Complete</h1>

      <p>Accuracy: <strong>${Math.round(summary.accuracy * 100)}%</strong></p>

      <p style="margin-top: 10px;">
        Mean RT (congruent): <strong>${summary.meanRtCongruentMs ?? "—"} ms</strong><br>
        Mean RT (incongruent): <strong>${summary.meanRtIncongruentMs ?? "—"} ms</strong><br>
        Interference (incong − cong): <strong>${summary.interferenceMs ?? "—"} ms</strong>
      </p>

      <p style="color:#b8b8b8; max-width: 560px; margin: 12px auto 18px;">
        Interference reflects the added time needed to respond when the surrounding arrows conflict with the center arrow.
      </p>

      <button id="continueBtn">Continue</button>
    `;

    document.getElementById("continueBtn").addEventListener("click", resolve);
  });
}

function buildTrialPlan(n) {
  const cells = [
    { targetDir: "left", congruency: "congruent" },
    { targetDir: "left", congruency: "incongruent" },
    { targetDir: "right", congruency: "congruent" },
    { targetDir: "right", congruency: "incongruent" },
  ];

  const plan = [];
  const reps = Math.floor(n / cells.length);
  const remainder = n % cells.length;

  for (let r = 0; r < reps; r++) {
    for (const c of cells) plan.push({ ...c });
  }

  for (let i = 0; i < remainder; i++) {
    plan.push({ ...cells[Math.floor(Math.random() * cells.length)] });
  }

  shuffleInPlace(plan);
  return plan;
}

function showFixation(app, ms) {
  app.innerHTML = `<div style="font-size:40px; text-align:center; padding:80px 0;">+</div>`;
  return sleep(ms);
}

function showFeedback(app, correct, { textColor }) {
  return new Promise((resolve) => {
    app.innerHTML = `
      <p style="color:${textColor}; font-size:22px; text-align:center; padding:40px 0;">
        ${correct ? "Correct" : "Incorrect"}
      </p>
    `;
    setTimeout(resolve, 500);
  });
}

function FEEDBACK_STYLE(result) {
  return { textColor: result.correct ? "#86efac" : "#fca5a5" };
}

function waitForFirstKeypress(validKeys, timeoutMs) {
  return new Promise((resolve) => {
    let done = false;

    const finish = (v) => {
      if (done) return;
      done = true;
      window.removeEventListener("keydown", onKeyDown, true);
      clearTimeout(timer);
      resolve(v);
    };

    const onKeyDown = (e) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (validKeys.includes(k)) finish(k);
    };

    window.addEventListener("keydown", onKeyDown, true);
    const timer = setTimeout(() => finish(null), timeoutMs);
  });
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function mean(arr) {
  if (!arr.length) return NaN;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function finiteOrNull(x) {
  return Number.isFinite(x) ? Math.round(x) : null;
}

function stripTags(html) {
  return html.replace(/<[^>]*>/g, "");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}