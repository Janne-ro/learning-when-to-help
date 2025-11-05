import { log } from "../../core/dataLogger.js";
import { loadTask2 } from "../task2/task2.js";

export function loadTask1(condition) {
  const container = document.getElementById("task-container");
  const aiAllowed = condition === "always";

  container.innerHTML = `
    <section>
      <h2>Task 1</h2>
      <p>${aiAllowed 
          ? "You may use the AI helper below." 
          : "Please complete this task without AI assistance."}</p>

      <textarea id="response" rows="6" cols="60" placeholder="Type your answer..."></textarea>
      <br>

      ${aiAllowed ? `<button id="ai-btn">Ask AI for help</button>` : ""}
      <button id="submit-btn">Submit</button>

      <div id="ai-output" style="margin-top:10px;"></div>
    </section>
  `;

  if (aiAllowed) {
    document.getElementById("ai-btn").addEventListener("click", async () => {
      const userInput = document.getElementById("response").value;
      const suggestion = await mockGenAI(userInput);
      document.getElementById("ai-output").innerHTML =
        `<p><strong>AI Suggestion:</strong> ${suggestion}</p>`;
      log("aiHelpUsed", { input: userInput, suggestion });
    });
  }

  document.getElementById("submit-btn").addEventListener("click", () => {
    const answer = document.getElementById("response").value;
    log("task1Submitted", { condition, answer });
    loadTask2(condition); // move to next task
  });
}

async function mockGenAI(prompt) {
  // Later: replace with real GenAI API call
  return `Here's a helpful idea for your text: "${prompt}"`;
}
