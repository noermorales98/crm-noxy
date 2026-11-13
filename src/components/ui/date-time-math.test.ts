import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { addDays, addMonths, buildMonthGrid, formatDateLabel, formatTimeLabel, isIsoDate, parseTimeInput, timeSlots } from "./date-time-math.ts";

test("buildMonthGrid returns six weeks starting on Monday and marks days outside the month", () => {
  const grid = buildMonthGrid(2026, 10); // noviembre de 2026 (mes 0-11)
  assert.equal(grid.length, 42);
  assert.equal(grid[0].date, "2026-10-26", "November 2026 starts on a Sunday, so the grid starts on Monday 26 Oct");
  assert.equal(grid[0].inMonth, false);
  assert.equal(grid[6].date, "2026-11-01");
  assert.equal(grid[6].inMonth, true);
  assert.equal(grid.filter((cell) => cell.inMonth).length, 30);
  assert.equal(grid[41].date, "2026-12-06");
  const feb = buildMonthGrid(2028, 1);
  assert.equal(feb.filter((cell) => cell.inMonth).length, 29, "leap year");
});

test("addMonths and addDays move across month and year boundaries", () => {
  assert.deepEqual(addMonths(2026, 11, 1), { year: 2027, month: 0 });
  assert.deepEqual(addMonths(2026, 0, -1), { year: 2025, month: 11 });
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(addDays("2026-01-01", -1), "2025-12-31");
  assert.equal(addDays("2026-11-20", 7), "2026-11-27");
});

test("isIsoDate accepts real calendar days only", () => {
  assert.equal(isIsoDate("2026-11-20"), true);
  assert.equal(isIsoDate("2026-02-30"), false);
  assert.equal(isIsoDate("20-11-2026"), false);
  assert.equal(isIsoDate(""), false);
});

test("formatDateLabel writes the date in Spanish and handles empty values", () => {
  assert.equal(formatDateLabel("2026-11-20"), "vie, 20 nov 2026");
  assert.equal(formatDateLabel(""), "");
  assert.equal(formatDateLabel("basura"), "");
});

test("timeSlots lists the day in steps and formatTimeLabel uses a 12-hour clock", () => {
  const slots = timeSlots(30);
  assert.equal(slots.length, 48);
  assert.equal(slots[0], "00:00");
  assert.equal(slots[47], "23:30");
  assert.equal(timeSlots(15).length, 96);
  assert.equal(formatTimeLabel("00:00"), "12:00 a. m.");
  assert.equal(formatTimeLabel("12:00"), "12:00 p. m.");
  assert.equal(formatTimeLabel("10:30"), "10:30 a. m.");
  assert.equal(formatTimeLabel("15:05"), "3:05 p. m.");
  assert.equal(formatTimeLabel(""), "");
});

test("parseTimeInput understands typed times in several forms", () => {
  assert.equal(parseTimeInput("10:30"), "10:30");
  assert.equal(parseTimeInput("9:5"), "09:05");
  assert.equal(parseTimeInput("930"), "09:30");
  assert.equal(parseTimeInput("1430"), "14:30");
  assert.equal(parseTimeInput("3 pm"), "15:00");
  assert.equal(parseTimeInput("3:15 PM"), "15:15");
  assert.equal(parseTimeInput("12 am"), "00:00");
  assert.equal(parseTimeInput("12:30 p. m."), "12:30");
  assert.equal(parseTimeInput("25:00"), null);
  assert.equal(parseTimeInput("10:75"), null);
  assert.equal(parseTimeInput("hola"), null);
  assert.equal(parseTimeInput(""), null);
});
