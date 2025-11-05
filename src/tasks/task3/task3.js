import { log, exportLogs } from "../../core/dataLogger.js";

export function loadTask3(condition) {
  const container = document.getElementById("task-container");
  const aiAllowed = condition === "always";

  container.innerHTML = `
    <section>
      <h2>Task 3</h2>
      <p>${aiAllowed
        ? "You can use the AI helper one last time below."
        : "Please complete this final task without AI help."}</p>

      <textarea id="response" rows="6" cols="60" placeholder="Type your final answer..."></textarea>
      <br>

      ${aiAllowed ? `<button id="ai-btn">Ask AI for help</button>` : ""}
      <button id="submit-btn">Finish</button>

      <div id="ai-output" style="margin-top:10px;"></div>
    </section>
  `;

  if (aiAllowed) {
    document.getElementById("ai-btn").addEventListener("click", async () => {
      const userInput = document.getElementById("response").value;
      const suggestion = await mockGenAI(userInput);
      document.getElementById("ai-output").innerHTML =
        `<p><strong>AI Suggestion:</strong> ${suggestion}</p>`;
      log("aiHelpUsed_Task3", { input: userInput, suggestion });
    });
  }

  document.getElementById("submit-btn").addEventListener("click", () => {
    const answer = document.getElementById("response").value;
    log("task3Submitted", { condition, answer });
    exportLogs(); // download all logs
    container.innerHTML = `
      <h3>Thank you! You’ve completed all tasks.</h3>
      <p>Your responses have been saved.</p>
    `;
  });
}

async function mockGenAI(prompt) {
  return `Final suggestion for your answer: "${prompt}"`;
}
