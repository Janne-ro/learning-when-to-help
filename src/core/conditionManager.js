// Simple function to randomly assign a condition
export function assignCondition() {
  const conditions = ["always", "never", "rl"];
  return conditions[Math.floor(Math.random() * conditions.length)];
}
