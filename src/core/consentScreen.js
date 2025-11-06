import { assignCondition } from "./conditionManager.js";
import { loadTask1 } from "../tasks/task1/task1.js";

// Utility function to load an HTML file and inject it
async function loadTemplate(filePath) {
  const response = await fetch(filePath);
  if (!response.ok) {
    console.error(`Failed to load ${filePath}:`, response.statusText);
    return `<p style="color:red;">Error loading ${filePath}</p>`;
  }
  return await response.text();
}

// ------------------------------------------------------------------
// Consent Screen
// ------------------------------------------------------------------
export async function showConsentScreen() {
  const container = document.getElementById("task-container");
  container.innerHTML = await loadTemplate("./src/templates/consent.html");

  const checkbox = document.getElementById("consent-check");
  const continueBtn = document.getElementById("continue-btn");

  checkbox.addEventListener("change", () => {
    continueBtn.disabled = !checkbox.checked;
    continueBtn.style.cursor = checkbox.checked ? "pointer" : "not-allowed";
    continueBtn.style.background = checkbox.checked ? "#388e3c" : "#1976d2";
  });

  continueBtn.addEventListener("click", () => {
    const condition = assignCondition();
    showDemographicsScreen(condition);
  });
}

// ------------------------------------------------------------------
// Demographics Screen
// ------------------------------------------------------------------
async function showDemographicsScreen(condition) {
  const container = document.getElementById("task-container");
  container.innerHTML = await loadTemplate("./src/templates/demographics.html");

  document.getElementById("demographics-form").addEventListener("submit", (e) => {
    e.preventDefault();

    const demographics = {
      gender: document.getElementById("gender").value,
      age: document.getElementById("age").value,
      education: document.getElementById("education").value,
      culture: document.getElementById("culture").value
    };

    console.log("Demographics collected:", demographics);
    loadTask1(condition);
  });
}
