!(function () {
  "use strict";
  ((QuizEngine.prototype._injectExportButtons = function (t) {
    const e = document.createElement("div");
    e.className = "summary-export-wrap";
    const n = document.createElement("button");
    ((n.className = "summary-export-btn"),
      (n.innerHTML = "📋 Copy summary"),
      n.setAttribute("aria-label", "Copy score summary to clipboard"),
      n.addEventListener("click", () => this._copyResultsToClipboard(n)));
    const i = document.createElement("button");
    ((i.className = "summary-export-btn"),
      (i.innerHTML = "⬇️ Download PDF"),
      i.setAttribute("aria-label", "Download quiz results as PDF"),
      i.addEventListener("click", () => {
        (document.body.classList.add("print-summary-only"),
          window.print(),
          setTimeout(
            () => document.body.classList.remove("print-summary-only"),
            1e3,
          ));
      }),
      e.appendChild(n),
      e.appendChild(i));
    const s = t.querySelector("#summaryRetryBtn");
    s ? s.before(e) : t.appendChild(e);
  }),
    (QuizEngine.prototype._copyResultsToClipboard = async function (t) {
      const e = this._totalQuestions(),
        n = this._correctCount(),
        i = Math.round((n / e) * 100),
        s = this._formatTime(this._elapsedSeconds),
        o = i >= 70,
        a =
          document
            .getElementById("pageTitle")
            ?.textContent?.replace(/^📝\s*/, "") ??
          this.quizFile ??
          "Quiz",
        r = new Date().toLocaleDateString(void 0, {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        l = this.data.questions.filter((t) => this.state.flags[t.id]),
        c =
          l.length > 0
            ? [
                "─────────────────────",
                `Flagged questions (${l.length}):`,
                ...l.map((t) => {
                  const e = this.state.flags[t.id],
                    n = t.question
                      .replace(/<[^>]+>/g, "")
                      .trim()
                      .slice(0, 60);
                  return `  [${e}] Q${t.displayNumber}: ${n}${t.question.length > 60 ? "…" : ""}`;
                }),
              ]
            : [],
        u = Object.keys(this.state.ratings || {}),
        m = u.filter((t) => "got-it" === this.state.ratings[t]).length,
        d = u.filter((t) => "still-learning" === this.state.ratings[t]).length,
        p = [
          `📝 ${a}`,
          `📅 ${r}`,
          "─────────────────────",
          `Score:  ${n} / ${e}  (${i}%)`,
          "Result: " + (o ? "✅ PASSED" : "❌ NOT PASSED"),
          `Time:   ${s}`,
          ...c,
          ...(u.length > 0
            ? [
                "─────────────────────",
                `Study ratings: ✅ Got it: ${m}  🔁 Still learning: ${d}`,
              ]
            : []),
          "─────────────────────",
          o
            ? "Well done! " +
              (e - n > 0
                ? `Review ${e - n} missed question${e - n > 1 ? "s" : ""}.`
                : "Perfect score!")
            : "Need 70% to pass. Keep practising!",
        ].join("\n");
      try {
        (await navigator.clipboard.writeText(p),
          (t.innerHTML = "✅ Copied!"),
          setTimeout(() => {
            t.innerHTML = "📋 Copy summary";
          }, 2e3));
      } catch (e) {
        const n = document.createElement("textarea");
        ((n.value = p),
          (n.style.position = "fixed"),
          (n.style.opacity = "0"),
          document.body.appendChild(n),
          n.focus(),
          n.select(),
          document.execCommand("copy"),
          n.remove(),
          (t.innerHTML = "✅ Copied!"),
          setTimeout(() => {
            t.innerHTML = "📋 Copy summary";
          }, 2e3));
      }
    }));
})();
