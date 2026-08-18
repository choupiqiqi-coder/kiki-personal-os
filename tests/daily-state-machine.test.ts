import assert from "node:assert/strict";import test from "node:test";import {transitionDailyState} from "../src/lib/daily/state-machine.ts";
test("完整 Morning Day Evening 状态链",()=>{let state=transitionDailyState("not_started","start_morning");assert.equal(state,"morning_planning");state=transitionDailyState(state,"complete_morning");assert.equal(state,"active_day");state=transitionDailyState(state,"start_evening");assert.equal(state,"evening_review");assert.equal(transitionDailyState(state,"complete_evening"),"completed")});
test("跳过晨间仍进入 Day",()=>assert.equal(transitionDailyState("not_started","skip_morning"),"active_day"));
test("查看页面不能成为状态事件",()=>assert.throws(()=>transitionDailyState("active_day","start_morning")));
