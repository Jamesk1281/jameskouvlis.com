export async function runDigitSpan(app) {
  const PRACTICE_TRIALS = 3; // 3

  const DIGIT_MS = 900;
  const GAP_MS = 250;

  const START_SPAN = 3;
  const MAX_SPAN = 12;
  const TRIALS_PER_SPAN = 2;

  const trials = [];

  await showOverview(app);

  await runPractice(app, {
    nTrials: PRACTICE_TRIALS,
    digitMs: DIGIT_MS,
    gapMs: GAP_MS,
    trialsOut: trials,
  });

  const { maxSpan, stopReason } = await runAdaptiveTest(app, {
    startSpan: START_SPAN,
    maxSpanLimit: MAX_SPAN,
    trialsPerSpan: TRIALS_PER_SPAN,
    digitMs: DIGIT_MS,
    gapMs: GAP_MS,
    trialsOut: trials,
  });

  const summary = computeSummary(
    trials.filter((t) => t.block === "Test"),
    maxSpan,
    stopReason
  );

  await showComplete(app, summary);

  return {
    task: "digit_span_forward",
    trials,
    summary,
  };
}

function showOverview(app) {
  return new Promise((resolve) => {
    app.innerHTML = `
      <h1>Task 2: Digit Span</h1>

      <p style="margin-bottom: 14px;">
        You will see a sequence of digits, one at a time.
        After the sequence ends, type the digits <strong>in the same order</strong>.
      </p>

      <div style="max-width:560px; margin: 10px auto 18px; text-align:left; color:#b8b8b8;">
        <ul style="margin:0; padding-left:18px; line-height:1.6;">
          <li>Try to be accurate. Speed is not important.</li>
          <li>Do not write anything down.</li>
          <li>You’ll do a short practice first.</li>
        </ul>
      </div>

      <button id="beginBtn">Begin Practice</button>
    `;

    document.getElementById("beginBtn").addEventListener("click", resolve);
  });
}

async function runPractice(app, { nTrials, digitMs, gapMs, trialsOut }) {
  await new Promise((resolve) => {
    app.innerHTML = `
      <h1>Practice</h1>
      <p style="color:#b8b8b8;">You’ll get feedback during practice.</p>
      <button id="startBtn">Start</button>
    `;
    document.getElementById("startBtn").addEventListener("click", resolve);
  });

  const practiceSpans = [3, 4, 4].slice(0, nTrials);

  for (let i = 0; i < practiceSpans.length; i++) {
    const span = practiceSpans[i];
    const seq = generateDigitSequence(span);

    const result = await runSingleTrial(app, {
      block: "Practice",
      trialIndex: i + 1,
      span,
      sequence: seq,
      digitMs,
      gapMs,
    });

    trialsOut.push(result);

    await showFeedback(app, result.correct);
    await sleep(350);
  }
}

async function runAdaptiveTest(app, {
  startSpan,
  maxSpanLimit,
  trialsPerSpan,
  digitMs,
  gapMs,
  trialsOut,
}) {
  await new Promise((resolve) => {
    app.innerHTML = `
      <h1>Test</h1>
      <p style="color:#b8b8b8;">No feedback during the test.</p>
      <button id="startBtn">Start</button>
    `;
    document.getElementById("startBtn").addEventListener("click", resolve);
  });

  let span = startSpan;
  let maxSpanAchieved = startSpan - 1;

  while (span <= maxSpanLimit) {
    let correctCount = 0;

    for (let t = 0; t < trialsPerSpan; t++) {
      const seq = generateDigitSequence(span);

      const result = await runSingleTrial(app, {
        block: "Test",
        trialIndex: trialsOut.filter((x) => x.block === "Test").length + 1,
        span,
        sequence: seq,
        digitMs,
        gapMs,
      });

      trialsOut.push(result);
      if (result.correct) correctCount += 1;

      await sleep(250);
    }

    if (correctCount >= 1) {
      maxSpanAchieved = Math.max(maxSpanAchieved, span);
      span += 1;
    } else {
      return {
        maxSpan: maxSpanAchieved,
        stopReason: `0/${trialsPerSpan} at span ${span}`,
      };
    }
  }

  return {
    maxSpan: maxSpanAchieved,
    stopReason: `Reached max span limit (${maxSpanLimit})`,
  };
}

async function runSingleTrial(app, {
  block,
  trialIndex,
  span,
  sequence,
  digitMs,
  gapMs,
}) {
  await new Promise((resolve) => {
    app.innerHTML = `
      <h1 style="margin-bottom:10px;">${block}</h1>
      <p style="color:#b8b8b8; margin-top:0;">Sequence length: <strong>${span}</strong></p>
      <button id="showBtn">Show Digits</button>
    `;
    document.getElementById("showBtn").addEventListener("click", resolve);
  });

  for (let i = 0; i < sequence.length; i++) {
    app.innerHTML = `<div style="font-size:56px; text-align:center; padding:70px 0;">${sequence[i]}</div>`;
    await sleep(digitMs);

    app.innerHTML = `<div style="font-size:56px; text-align:center; padding:70px 0;">&nbsp;</div>`;
    await sleep(gapMs);
  }

  const { typed, submitted } = await getTypedResponse(app, {
    prompt: `Type the digits in order (length ${span})`,
    maxLen: span,
  });

  const correct = submitted && typed === sequence.join("");

  return {
    task: "digit_span_forward",
    block,
    trial: trialIndex,
    span,
    sequence: sequence.join(""),
    response: typed,
    correct,
    submitted,
  };
}

function getTypedResponse(app, { prompt, maxLen }) {
  return new Promise((resolve) => {
    app.innerHTML = `
      <h1 style="margin-bottom:10px;">Response</h1>
      <p style="color:#b8b8b8; margin-top:0;">${prompt}</p>

      <input id="resp" inputmode="numeric" autocomplete="off"
        style="
          width: 220px;
          padding: 10px 12px;
          font-size: 20px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.04);
          color: #e6e6e6;
          outline: none;
          text-align: center;
        "
      />

      <div style="margin-top:14px;">
        <button id="submitBtn">Submit</button>
      </div>

      <p id="hint" style="color:#b8b8b8; margin-top:10px; font-size:0.9rem;">
        (Digits only, max ${maxLen})
      </p>
    `;

    const input = document.getElementById("resp");
    const submitBtn = document.getElementById("submitBtn");

    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "").slice(0, maxLen);
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitBtn.click();
    });

    input.focus();

    submitBtn.addEventListener("click", () => {
      resolve({ typed: input.value, submitted: true });
    });
  });
}

function showFeedback(app, correct) {
  return new Promise((resolve) => {
    app.innerHTML = `<p style="color:${correct ? "#86efac" : "#fca5a5"}; font-size:22px; text-align:center; padding:40px 0;">
      ${correct ? "Correct" : "Incorrect"}
    </p>`;
    setTimeout(resolve, 650);
  });
}

function showComplete(app, summary) {
  return new Promise((resolve) => {
    app.innerHTML = `
      <h1>Task Complete</h1>
      <p>Max span achieved: <strong>${summary.maxSpan}</strong></p>
      <p>Test accuracy: <strong>${Math.round(summary.accuracy * 100)}%</strong></p>
      <p style="color:#b8b8b8;">Stop reason: ${summary.stopReason}</p>
      <button id="continueBtn">Continue</button>
    `;
    document.getElementById("continueBtn").addEventListener("click", resolve);
  });
}

function computeSummary(testTrials, maxSpan, stopReason) {
  const n = testTrials.length || 0;
  const c = testTrials.filter((t) => t.correct).length;
  const accuracy = n ? c / n : 0;
  return { maxSpan, accuracy, stopReason };
}

function generateDigitSequence(n) {
  const arr = [];
  for (let i = 0; i < n; i++) arr.push(Math.floor(Math.random() * 10));
  return arr;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
