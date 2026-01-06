import { runInspectionTime } from "./inspectionTime.js";
import { runDigitSpan } from "./digitSpan.js";
import { runFlanker } from "./flanker.js";

const app = document.getElementById("app");
let studyID = null;

const allResults = [];

function generateStudyID() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function transitionTo(renderFn) {
  app.classList.add("fade-out");

  setTimeout(() => {
    renderFn();
    app.classList.remove("fade-out");
  }, 180);
}

function renderFrontPage() {
  // if (localStorage.getItem("hasCompletedStudy")) {
  //   renderCompletionScreen();
  //   return;
  // }
  
  app.innerHTML = `
    <h1>Elementary Cognitive Tasks Study</h1>

    <p><strong>James Kouvlis</strong><br>
       Xaverian Brothers High School</p>

    <p>
      This project examines the relationship between performance on short
      cognitive tasks and standardized test scores. Participation is voluntary
      and takes approximately 10–15 minutes.
    </p>

    <button id="startBtn">Start</button>
  `;

  document.getElementById("startBtn").addEventListener("click", () => {
    studyID = localStorage.getItem("studyID") ?? generateStudyID();
    localStorage.setItem("studyID", studyID);
    //transitionTo(renderBeforeYouBegin);
  });
}

async function uploadResultsToAppsScript({ studyID, allResults }) {
  const ENDPOINT =
    "https://script.google.com/macros/s/AKfycbwVy3sRm6rJBp3SXua5DxgDwWb4xhYRs2NLTm3FV_Cug0aqhdRCYXBN5rnptuviJgl8Pw/exec";

  const body = JSON.stringify({ studyID, allResults });

  await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body,
  });
}

function renderScoreForm() {
  const FORM_EMBED_URL =
    "https://docs.google.com/forms/d/e/1FAIpQLSfmqJBfvgPSl_dcHT0TPE5h9Zku8SWFBSdPR7grVA3615Ov3w/viewform?embedded=true";

  const FORM_OPEN_URL =
    "https://docs.google.com/forms/d/e/1FAIpQLSfmqJBfvgPSl_dcHT0TPE5h9Zku8SWFBSdPR7grVA3615Ov3w/viewform";

  return new Promise((resolve) => {
    app.innerHTML = `
      <h1>Submit Your Test Score(s)</h1>

      <p style="color:#b8b8b8; line-height:1.6;">
        Final step: please enter your standardized test score(s) in the form below.
        If you have multiple (PSAT/SAT/ACT), enter whatever you have.
      </p>

      <div style="
        margin: 16px auto;
        max-width: 900px;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 12px;
        overflow: hidden;
        background: rgba(255,255,255,0.03);
        padding: 12px;
      ">
        <h2>Your Study ID</h2>

        <p style="font-size: 1.2rem; letter-spacing: 2px;">
          <strong>${studyID}</strong>
        </p>

        <p style="color:#b8b8b8;">
          Please enter this exact ID into the Google Form below.
        </p>

        <iframe
          src="${FORM_EMBED_URL}"
          style="width:100%; height:1400px; border:none;"
        >
          Loading…
        </iframe>
      </div>

      <p style="color:#b8b8b8; margin-top: 8px;">
        If the form does not load, open it here:
        <a href="${FORM_OPEN_URL}" target="_blank" rel="noopener noreferrer">
          Open form in a new tab
        </a>
      </p>

      <button id="doneBtn" style="margin-top: 16px;">
        I submitted the form
      </button>
    `;

    document.getElementById("doneBtn").addEventListener("click", resolve);
  });
}


function renderBeforeYouBegin() {
  app.innerHTML = `
    <h1>Before You Begin</h1>

    <p>
      This activity is part of a Xaverian Brothers High School Science Research & Capstone project examining the relationship between performance on
      short cognitive tasks and standardized test scores. Participation is voluntary, results and test scores are anonymous, and you may stop at any time.
    </p>

    <p>
      To participate, you must have at least one PSAT, SAT, or ACT score that you can report.
    </p>

    <label>
      <input type="checkbox" id="scoreCheck">
      I have a PSAT, SAT, or ACT score that I can anonymously report at the end of these tasks.
    </label>

    <br><br>

    <label>
      <input type="checkbox" id="assentCheck">
      I understand this study is voluntary and choose to participate.
    </label>

    <h2>Your Study ID</h2>

    <p style="font-size: 1.2rem; letter-spacing: 2px;">
      <strong>${studyID}</strong>
    </p>

    <p style="color:#b8b8b8;">
      Please copy this exact ID and enter it into the Google Form at the end of the test. You DO NOT need to memorize your results on these tests.
    </p>

    <br><br>

    <button id="continueBtn" disabled>Continue</button>
    <button id="backBtn">Back</button>
  `;

  const scoreCheck = document.getElementById("scoreCheck");
  const assentCheck = document.getElementById("assentCheck");
  const continueBtn = document.getElementById("continueBtn");

  function updateButton() {
    continueBtn.disabled = !(scoreCheck.checked && assentCheck.checked);
  }

  scoreCheck.addEventListener("change", updateButton);
  assentCheck.addEventListener("change", updateButton);

  continueBtn.addEventListener("click", async () => {
    const ITResults = await runInspectionTime(app);
    allResults.push(ITResults);

    const DSResults = await runDigitSpan(app);
    allResults.push(DSResults);

    const FResults = await runFlanker(app);
    allResults.push(FResults);

    await uploadResultsToAppsScript({ studyID, allResults });
    await renderScoreForm(app);

    transitionTo(renderCompletionScreen);
  });

  document.getElementById("backBtn").addEventListener("click", () => {
    transitionTo(renderFrontPage);
  });
}

function renderCompletionScreen() {
  app.innerHTML = `
    <h1>Study Complete</h1>

    <p style="margin-top: 16px;">
      Thank you for participating in this study.
    </p>

    <p style="color:#b8b8b8; line-height:1.6;">
      Your responses have been recorded. You may now close this tab.
    </p>
  `;
}

renderFrontPage();
