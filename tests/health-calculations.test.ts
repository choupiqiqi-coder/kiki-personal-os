import assert from "node:assert/strict";
import test from "node:test";
import { calculateBmi, calculateBmr, calculateCalorieBalance, calculateCycleStats, calculateMetCalories, calculateNutrition, calculateTdee } from "../src/lib/health/calculations.ts";

test("BMI and Mifflin-St Jeor BMR", () => { assert.equal(calculateBmi(60, 165), 22); assert.equal(calculateBmr({ weightKg: 60, heightCm: 165, age: 30, sex: "female" }), 1320); assert.equal(calculateBmr({ weightKg: 60, heightCm: 165, age: 30 }), null); });
test("TDEE and MET use centralized formulas", () => { assert.equal(calculateTdee(1320, "sedentary", 200), 1784); assert.equal(calculateMetCalories({ met: 6, weightKg: 60, durationMinutes: 30 }), 189); assert.equal(calculateMetCalories({ met: null, weightKg: 60, durationMinutes: 30 }), null); });
test("nutrition and calorie balance are deterministic", () => { assert.deepEqual(calculateNutrition([{ caloriesKcal: 100, proteinG: 5 }, { caloriesKcal: 250, carbsG: 30 }]), { caloriesKcal: 350, proteinG: 5, carbsG: 30, fatG: 0 }); assert.equal(calculateCalorieBalance(1800, 2200), -400); });
test("cycle average and next expected date", () => { assert.deepEqual(calculateCycleStats(["2026-06-01", "2026-06-29", "2026-07-28"]), { lengths: [28, 29], latestLength: 29, averageLength: 29, nextExpectedDate: "2026-08-26", highlyVariable: false }); });
test("invalid inputs are safe", () => { assert.equal(calculateBmi(0, 165), null); assert.equal(calculateTdee(null), null); assert.equal(calculateCalorieBalance(undefined, 2200), null); });
