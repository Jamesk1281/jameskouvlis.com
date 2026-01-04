export async function runInspectionTime(app) {
  const KEYS = { LEFT: "f", RIGHT: "j" };

  const PRACTICE_TRIALS = 7; // 7
  const REAL_TRIALS = 35; // 35

  const FIXATION_MS = 250;
  const PRE_MASK_MS = 100;
  const MASK_TOTAL_MS = 650;

  const FRAME_MS = 1000 / 60;
  const EXPOSURE_MIN = FRAME_MS;
  const EXPOSURE_MAX = 600;
  const EXPOSURE_START_PRACTICE = 220;
  const EXPOSURE_START_TEST = 220;

  const STEP_DOWN = 10;
  const STEP_UP = 10;

  const RESPONSE_MAX_MS = 6000;

  const STIM = {
    canvasSize: 220,
    xLeft: 80,
    xRight: 140,
    yCenter: 110,
    thickness: 6,
    baseLen: 120,
    deltaLen: 10,
    jitterLen: 8,
    lineColor: "#e8e8e8",
    bg: "#0f1115",
  };

  const trials = [];

  await showOverview(app, KEYS);

  await showBlockIT(app, {
    label: "Practice",
    nTrials: PRACTICE_TRIALS,
    KEYS,
    FIXATION_MS,
    PRE_MASK_MS,
    MASK_TOTAL_MS,
    RESPONSE_MAX_MS,
    trialsOut: trials,
    giveFeedback: true,
    exposureStart: EXPOSURE_START_PRACTICE,
    exposureMin: EXPOSURE_MIN,
    exposureMax: EXPOSURE_MAX,
    stepDown: STEP_DOWN,
    stepUp: STEP_UP,
    frameMs: FRAME_MS,
    STIM,
  });

  await showBlockIT(app, {
    label: "Test",
    nTrials: REAL_TRIALS,
    KEYS,
    FIXATION_MS,
    PRE_MASK_MS,
    MASK_TOTAL_MS,
    RESPONSE_MAX_MS,
    trialsOut: trials,
    giveFeedback: false,
    exposureStart: EXPOSURE_START_TEST,
    exposureMin: EXPOSURE_MIN,
    exposureMax: EXPOSURE_MAX,
    stepDown: STEP_DOWN,
    stepUp: STEP_UP,
    frameMs: FRAME_MS,
    STIM,
  });

  const testTrials = trials.filter((t) => t.block === "Test");
  const summary = computeITSummary(testTrials);

  await showComplete(app, summary);

  return { task: "inspection_time_line_masked", trials, summary };
}

function showOverview(app, KEYS) {
  return new Promise((resolve) => {
    app.innerHTML = `
      <h1>Task 1: Brief Lines</h1>
      <p style="margin-bottom: 14px;">
        Two lines will flash <strong>very briefly</strong> and then be covered by a mask.
        After the mask, decide which line was longer.
      </p>
      <div style="display:grid; grid-template-columns: 1.2fr 0.8fr; gap: 18px; align-items: start; max-width: 720px; margin: 14px auto 18px; text-align: left;">
        <div style="color:#b8b8b8;">
          <ul style="margin:0; padding-left:18px; line-height:1.6;">
            <li>Press <strong>${KEYS.LEFT.toUpperCase()}</strong> if the <strong>left</strong> line was longer.</li>
            <li>Press <strong>${KEYS.RIGHT.toUpperCase()}</strong> if the <strong>right</strong> line was longer.</li>
            <li>Sometimes it will feel too fast — that’s expected.</li>
            <li>Practice includes feedback. The test does not.</li>
          </ul>
        </div>
        <div style="border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 12px; text-align: center;">
          <div style="font-weight:600; margin-bottom:8px;">Example</div>
          <canvas id="overviewExample" width="180" height="140"
            style="display:block; margin:0 auto; border-radius:10px; background:#0f1115; border:1px solid rgba(255,255,255,0.10);"></canvas>
          <div style="color:#b8b8b8; font-size:0.9rem; margin-top:8px;">
            (Not timed)
          </div>
        </div>
      </div>
      <button id="beginBtn">Begin Practice</button>
    `;
    drawOverviewExample();
    document.getElementById("beginBtn").addEventListener("click", resolve);
  });
}

async function showBlockIT(app, opts) {
  const {
    label,
    nTrials,
    KEYS,
    FIXATION_MS,
    PRE_MASK_MS,
    MASK_TOTAL_MS,
    RESPONSE_MAX_MS,
    trialsOut,
    giveFeedback,
    exposureStart,
    exposureMin,
    exposureMax,
    stepDown,
    stepUp,
    frameMs,
    STIM,
  } = opts;

  await new Promise((resolve) => {
    app.innerHTML = `
      <h1>${label}</h1>
      <p style="color:#b8b8b8;">
        <strong>${KEYS.LEFT.toUpperCase()}</strong> = Left longer &nbsp;&nbsp;|&nbsp;&nbsp;
        <strong>${KEYS.RIGHT.toUpperCase()}</strong> = Right longer
      </p>
      <p style="color:#b8b8b8;">
        ${giveFeedback ? "Feedback is shown in practice." : "No feedback during the test."}
      </p>
      <button id="startBlockBtn">Start</button>
    `;
    document.getElementById("startBlockBtn").addEventListener("click", resolve);
  });

  let exposureMs = quantizeFramesFloor(exposureStart, frameMs);
  let correctStreak = 0;

  for (let i = 0; i < nTrials; i++) {
    const longerSide = Math.random() < 0.5 ? "LEFT" : "RIGHT";
    const correctKey = longerSide === "LEFT" ? KEYS.LEFT : KEYS.RIGHT;

    await showFixation(app, FIXATION_MS);

    const result = await runITTrial(app, {
      trialIndex: i + 1,
      block: label,
      longerSide,
      correctKey,
      allowedKeys: [KEYS.LEFT, KEYS.RIGHT],
      exposureMs,
      preMaskMs: PRE_MASK_MS,
      maskTotalMs: MASK_TOTAL_MS,
      responseMaxMs: RESPONSE_MAX_MS,
      KEYS,
      frameMs,
      STIM,
    });

    trialsOut.push(result);

    if (giveFeedback) await showFeedback(app, result.correct);

    if (result.correct) {
      if (++correctStreak >= 2) {
        exposureMs -= stepDown;
        correctStreak = 0;
      }
    } else {
      correctStreak = 0;
      exposureMs += stepUp;
    }

    exposureMs = quantizeFramesFloor(clamp(exposureMs, exposureMin, exposureMax), frameMs);
    await sleep(220);
  }
}

function showComplete(app, summary) {
  return new Promise((resolve) => {
    app.innerHTML = `
      <h1>Task Complete</h1>
      <p>Test accuracy: <strong>${Math.round(summary.accuracy * 100)}%</strong></p>
      <p>Estimated threshold (ms): <strong>${summary.thresholdMs ?? "—"}</strong></p>
      <button id="continueBtn">Continue</button>
    `;
    document.getElementById("continueBtn").addEventListener("click", resolve);
  });
}

async function runITTrial(app, {
  trialIndex,
  block,
  longerSide,
  correctKey,
  allowedKeys,
  exposureMs,
  preMaskMs,
  maskTotalMs,
  responseMaxMs,
  KEYS,
  frameMs,
  STIM,
}) {
  const jitter = randInt(-STIM.jitterLen, STIM.jitterLen);
  const baseLen = STIM.baseLen + jitter;

  const leftLen = longerSide === "LEFT" ? baseLen + STIM.deltaLen : baseLen;
  const rightLen = longerSide === "RIGHT" ? baseLen + STIM.deltaLen : baseLen;

  app.innerHTML = maskCanvasHtml(STIM.canvasSize, "maskA");
  paintLineMask("maskA", STIM);
  await sleep(preMaskMs);

  app.innerHTML = stimCanvasHtml(STIM.canvasSize, "stim");
  paintStimulus("stim", STIM, leftLen, rightLen);
  const stimFrames = Math.max(1, Math.floor(exposureMs / frameMs));
  await waitFrames(stimFrames);

  app.innerHTML = maskCanvasHtml(STIM.canvasSize, "maskB");
  const phases = 8;
  const seg = Math.floor(maskTotalMs / phases);

  for (let i = 0; i < phases; i++) {
    paintLineMask("maskB", STIM);
    await sleep(i === phases - 1 ? maskTotalMs - seg * (phases - 1) : seg);
  }

  app.innerHTML = `
    <h1 style="margin-bottom:12px;">${block}</h1>
    <p style="color:#b8b8b8; margin-top:0;">Trial ${trialIndex}</p>
    <div style="display:flex; justify-content:center; gap:18px; margin:12px auto 6px; max-width:520px; color:#b8b8b8;">
      <div><strong>${KEYS.LEFT.toUpperCase()}</strong> = Left longer</div>
      <div>|</div>
      <div><strong>${KEYS.RIGHT.toUpperCase()}</strong> = Right longer</div>
    </div>
    <div style="font-size:40px; text-align:center; padding:22px 0;">+</div>
  `;

  const key = await waitForFirstKeypress(allowedKeys, responseMaxMs);
  const correct = key === correctKey;

  return {
    task: "inspection_time_line_masked",
    block,
    trial: trialIndex,
    exposureMs,
    exposureFrames: stimFrames,
    longerSide,
    correctKey,
    responseKey: key,
    correct,
    timeout: key === null,
  };
}

function stimCanvasHtml(size, id) {
  return `
    <div style="display:flex; justify-content:center; align-items:center; height:240px;">
      <canvas id="${id}" width="${size}" height="${size}"
        style="border-radius:16px; border:1px solid rgba(255,255,255,0.12); background:#0f1115;"></canvas>
    </div>
  `;
}

function maskCanvasHtml(size, id) {
  return `
    <div style="display:flex; justify-content:center; align-items:center; height:240px;">
      <canvas id="${id}" width="${size}" height="${size}"
        style="border-radius:16px; border:1px solid rgba(255,255,255,0.16); background:#0f1115;"></canvas>
    </div>
  `;
}

function paintStimulus(canvasId, S, leftLen, rightLen) {
  const c = document.getElementById(canvasId);
  if (!c) return;
  const ctx = c.getContext("2d");

  ctx.fillStyle = S.bg;
  ctx.fillRect(0, 0, c.width, c.height);

  ctx.strokeStyle = S.lineColor;
  ctx.lineWidth = S.thickness;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(S.xLeft, S.yCenter - leftLen / 2);
  ctx.lineTo(S.xLeft, S.yCenter + leftLen / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(S.xRight, S.yCenter - rightLen / 2);
  ctx.lineTo(S.xRight, S.yCenter + rightLen / 2);
  ctx.stroke();
}

function paintLineMask(canvasId, S) {
  const c = document.getElementById(canvasId);
  if (!c) return;
  const ctx = c.getContext("2d");

  ctx.fillStyle = S.bg;
  ctx.fillRect(0, 0, c.width, c.height);

  const nLines = 70;
  for (let i = 0; i < nLines; i++) {
    ctx.strokeStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)";
    ctx.lineWidth = randInt(2, 7);
    ctx.beginPath();
    ctx.moveTo(randInt(0, c.width), randInt(0, c.height));
    ctx.lineTo(randInt(0, c.width), randInt(0, c.height));
    ctx.stroke();
  }
}

function showFixation(app, ms) {
  app.innerHTML = `<div style="font-size:40px; text-align:center; padding:80px 0;">+</div>`;
  return sleep(ms);
}

function showFeedback(app, correct) {
  return new Promise((resolve) => {
    app.innerHTML = `<p style="color:${correct ? "#86efac" : "#fca5a5"}; font-size:20px; text-align:center;">
      ${correct ? "Correct" : "Incorrect"}
    </p>`;
    setTimeout(resolve, 650);
  });
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

function computeITSummary(testTrials) {
  const n = testTrials.length;
  if (!n) return { accuracy: 0, thresholdMs: null };

  const accuracy = testTrials.filter((t) => t.correct).length / n;

  const tail = testTrials.slice(-24);
  const exposures = tail.map((t) => t.exposureMs).sort((a, b) => a - b);
  const thresholdMs = exposures.length ? exposures[Math.floor(exposures.length / 2)] : null;

  return { accuracy, thresholdMs };
}

function quantizeFramesFloor(ms, frameMs) {
  const q = Math.floor(ms / frameMs) * frameMs;
  return Math.max(frameMs, q);
}

function waitFrames(n) {
  return new Promise((resolve) => {
    let count = 0;
    function tick() {
      count++;
      if (count >= n) resolve();
      else requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

function randInt(lo, hi) {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function drawOverviewExample() {
  const c = document.getElementById("overviewExample");
  if (!c) return;
  const ctx = c.getContext("2d");

  ctx.fillStyle = "#0f1115";
  ctx.fillRect(0, 0, c.width, c.height);

  const xLeft = 65;
  const xRight = 115;
  const yCenter = 70;

  const leftLen = 92;
  const rightLen = 70;

  ctx.strokeStyle = "#e8e8e8";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(xLeft, yCenter - leftLen / 2);
  ctx.lineTo(xLeft, yCenter + leftLen / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(xRight, yCenter - rightLen / 2);
  ctx.lineTo(xRight, yCenter + rightLen / 2);
  ctx.stroke();
}