import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import {
  parseReminderDaysBefore,
  reminderDaysLabel,
  reminderDaysSelectOptions,
} from "./content-reminder-options.ts";

test("parseReminderDaysBefore clamps and falls back", () => {
  assert.equal(parseReminderDaysBefore(1), 1);
  assert.equal(parseReminderDaysBefore("7"), 7);
  assert.equal(parseReminderDaysBefore(-3), 0);
  assert.equal(parseReminderDaysBefore(99), 30);
  assert.equal(parseReminderDaysBefore(undefined, 2), 2);
  assert.equal(parseReminderDaysBefore("nope", 1), 1);
});

test("reminderDaysLabel covers presets and custom values", () => {
  assert.equal(reminderDaysLabel(0), "El mismo día");
  assert.equal(reminderDaysLabel(1), "1 día antes");
  assert.equal(reminderDaysLabel(4), "4 días antes");
});

test("reminderDaysSelectOptions injects unknown current values", () => {
  const options = reminderDaysSelectOptions(4);
  assert.equal(options.some((option) => option.value === 4), true);
});
