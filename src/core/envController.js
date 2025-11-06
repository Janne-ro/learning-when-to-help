import { showConsentScreen } from "./consentScreen.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Environment controller loaded");
  showConsentScreen(); // start with consent
});