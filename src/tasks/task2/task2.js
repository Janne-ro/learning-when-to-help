import { log } from "../../core/dataLogger.js";
import { loadTask3 } from "../task3/task3.js";

export function loadTask2(condition) {
  const container = document.getElementById("task-container");
  const aiAllowed = condition === "always";

  container.innerHTML = `
    <section>
      <h2>Task 2</h2>
      <p>${aiAllowed
        ? "You can again use the AI helper below."
        : "Please complete this task without AI help."}</p>

      <textarea id="response" rows="6" cols="60" placeholder="Type your answer..."></textarea>
      <br>

      ${aiAllowed ? `<button id="ai-btn">Ask AI for help</button>` : ""}
      <button id="submit-btn">Next</button>

      <div id="ai-output" style="margin-top:10px;"></div>
    </section>
  `;

  if (aiAllowed) {
    document.getElementById("ai-btn").addEventListener("click", async () => {
      const userInput = document.getElementById("response").value;
      const suggestion = await mockGenAI(userInput);
      document.getElementById("ai-output").innerHTML =
        `<p><strong>AI Suggestion:</strong> ${suggestion}</p>`;
      log("aiHelpUsed_Task2", { input: userInput, suggestion });
    });
  }

  document.getElementById("submit-btn").addEventListener("click", () => {
    const answer = document.getElementById("response").value;
    log("task2Submitted", { condition, answer });
    loadTask3(condition); // proceed to Task 3
  });
}

async function mockGenAI(prompt) {
  return `Suggestion based on your text: "${prompt}"`;
}
