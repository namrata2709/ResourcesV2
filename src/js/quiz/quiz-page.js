!(function () {
  "use strict";
  const e = new URLSearchParams(window.location.search).get("quiz");
  function n() {
    if (!e)
      return (
        (function () {
          const e = document.getElementById("questionsContainer");
          if (!e) return;
          e.innerHTML =
            '\n            <div class="error">\n                <h2>No quiz specified</h2>\n                <p>Please select a quiz from the list.</p>\n                <a href="quiz-index.html" class="back-btn" style="margin-top:1rem;display:inline-block;">\n                    ← Go to Quiz List\n                </a>\n            </div>\n        ';
        })(),
        void document.getElementById("pageLoader")?.classList.add("hidden")
      );
    [
      "js/quiz/quiz-engine.js",
      "js/quiz/quiz-toolbar.js",
      "js/quiz/quiz-print.js",
      "js/quiz/quiz-search.js",
      "js/quiz/quiz-export.js",
    ].forEach((e) => {
      const n = document.createElement("script");
      ((n.src = e),
        (n.async = !1),
        (n.onload = () => {}),
        (n.onerror = () => {}),
        document.body.appendChild(n));
    });
  }
  ((window.QuizPageFile = e || null),
    "loading" === document.readyState
      ? document.addEventListener("DOMContentLoaded", n)
      : n());
})();
