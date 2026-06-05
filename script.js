const cover = document.getElementById("cover");
const quizArea = document.getElementById("quizArea");
const zipInput = document.getElementById("zipInput");

const startBtn = document.getElementById("startBtn");
const continueBtn = document.getElementById("continueBtn");
const restartBtn = document.getElementById("restartBtn");

const questionEl = document.getElementById("question");
const answerEl = document.getElementById("answer");
const feedbackEl = document.getElementById("feedback");
const scoreEl = document.getElementById("score");

const submitBtn = document.getElementById("submitBtn");
const nextBtn = document.getElementById("nextBtn");
const saveBtn = document.getElementById("saveBtn");
const reviewBtn = document.getElementById("reviewBtn");

const endArea = document.getElementById("endArea");

const questionImage =
  document.getElementById("questionImage");

let words = [];
let remaining = [];
let current = null;

let correct = 0;
let answered = false;

let wrongSet = new Map();

const imageFiles = {};

/* ---------- 表紙 ---------- */

startBtn.onclick = () => {
  zipInput.value = "";
  zipInput.click();
};

continueBtn.onclick = () => {

  const saved =
    localStorage.getItem("quizState");

  if (!saved) {
    alert("続きデータがありません");
    return;
  }

  const data = JSON.parse(saved);

  words = data.words;
  remaining = data.remaining;
  correct = data.correct;
  wrongSet = new Map(data.wrongSet);

  startQuiz();
};

restartBtn.onclick = () => {
  location.reload();
};

/* ---------- ZIP読込 ---------- */

zipInput.addEventListener(
  "change",
  async e => {

    const file = e.target.files[0];

    if (!file) return;

    const zip =
      await JSZip.loadAsync(file);

    Object.keys(imageFiles)
      .forEach(k => delete imageFiles[k]);

    let csvText = "";

    const promises = [];

    zip.forEach((path, entry) => {

      if (
        path.toLowerCase()
          .endsWith("words.csv")
      ) {

        promises.push(

          entry.async("string")
            .then(text => {
              csvText = text;
            })

        );
      }

      if (
        /\.(jpg|jpeg|png|gif|webp)$/i
          .test(path)
      ) {

        promises.push(

          entry.async("blob")
            .then(blob => {

              const filename =
                path.split("/")
                  .pop();

              imageFiles[filename] =
                URL.createObjectURL(blob);

            })

        );
      }

    });

    await Promise.all(promises);

    words = csvText
      .split(/\r?\n/)
      .filter(line => line.trim())
      .map(line => {

        const cols = line.split(",");

        return [
          cols[0]?.trim() || "",
          cols[1]?.trim() || "",
          cols[2]?.trim() || ""
        ];

      });

    remaining = [...words];

    correct = 0;

    wrongSet.clear();

    startQuiz();

  }
);

/* ---------- 開始 ---------- */

function startQuiz() {

  cover.style.display = "none";

  quizArea.style.display = "block";

  endArea.style.display = "none";

  nextQuestion();

}

/* ---------- 次の問題 ---------- */

function nextQuestion() {

  if (remaining.length === 0) {
    finishQuiz();
    return;
  }

  current =
    remaining[
      Math.floor(
        Math.random() *
        remaining.length
      )
    ];

  answered = false;

  questionEl.textContent =
    "意味: " + current[1];

  if (
    current[2] &&
    imageFiles[current[2]]
  ) {

    questionImage.src =
      imageFiles[current[2]];

    questionImage.style.display =
      "block";

  } else {

    questionImage.style.display =
      "none";

  }

  answerEl.value = "";

  feedbackEl.textContent = "";

  scoreEl.textContent =
    `正解: ${correct}`;

  answerEl.focus();

  saveState();

}

/* ---------- 正規化 ---------- */

function normalize(str) {

  return str
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

}

/* ---------- カッコ対応 ---------- */

function generatePatterns(str) {

  let results = [str];

  const matches =
    [...str.matchAll(/\(.*?\)/g)];

  matches.forEach(match => {

    const full = match[0];

    const inside =
      full.slice(1, -1);

    const next = [];

    results.forEach(r => {

      next.push(
        r.replace(full, "")
      );

      next.push(
        r.replace(full, inside)
      );

    });

    results = next;

  });

  return [
    ...new Set(
      results.map(r =>
        normalize(
          r.replace(/\(~\)/g, "~")
        )
      )
    )
  ];
}

/* ---------- 判定 ---------- */

function checkAnswer() {

  if (answered) return;

  const user =
    normalize(answerEl.value);

  const answer =
    normalize(current[0]);

  const patterns =
    generatePatterns(answer);

  if (patterns.includes(user)) {

    correct++;

    remaining =
      remaining.filter(
        w => w !== current
      );

    feedbackEl.textContent =
      "正解！🎉";

  } else {

    feedbackEl.textContent =
      `不正解 ❌（正解: ${current[0]}）`;

    wrongSet.set(
      current[0],
      current[1]
    );

  }

  answered = true;

  scoreEl.textContent =
    `正解: ${correct}`;

  saveState();

}

submitBtn.onclick = checkAnswer;

nextBtn.onclick = nextQuestion;

answerEl.addEventListener(
  "keydown",
  e => {

    if (e.key !== "Enter")
      return;

    if (answered) {
      nextQuestion();
    } else {
      checkAnswer();
    }

  }
);
/* ---------- 終了 ---------- */

function finishQuiz() {

  questionEl.textContent =
    "終了！";

  questionImage.style.display =
    "none";

  feedbackEl.textContent =
    "お疲れさまでした";

  endArea.style.display =
    "flex";

  localStorage.removeItem(
    "quizState"
  );

}

/* ---------- 間違えた問題だけ復習 ---------- */

reviewBtn.onclick = () => {

  remaining =
    Array.from(
      wrongSet.entries()
    ).map(
      ([en, jp]) =>
        [en, jp, ""]
    );

  correct = 0;

  wrongSet.clear();

  endArea.style.display =
    "none";

  nextQuestion();

};

/* ---------- 間違えた問題をCSV保存 ---------- */

saveBtn.onclick = () => {

  if (wrongSet.size === 0) {

    alert(
      "保存する単語がありません"
    );

    return;

  }

  let csv = "";

  wrongSet.forEach(
    (jp, en) => {

      csv +=
        `${en},${jp}\n`;

    }
  );

  const blob =
    new Blob(
      [csv],
      {
        type: "text/csv"
      }
    );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href = url;

  a.download =
    "wrong_words.csv";

  a.click();

  URL.revokeObjectURL(url);

};

/* ---------- 続き保存 ---------- */

function saveState() {

  const data = {

    words,

    remaining,

    correct,

    wrongSet:
      Array.from(
        wrongSet.entries()
      )

  };

  localStorage.setItem(
    "quizState",
    JSON.stringify(data)
  );

}
