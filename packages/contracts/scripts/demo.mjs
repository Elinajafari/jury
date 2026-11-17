// Put the demo on the explorer: a crown taken, a crown held, the refusals and the payout.
//
//   pnpm demo:contract        (after pnpm deploy:contract)
//
// One contest, three entrants. Ann's answer clears the bar and takes the crown.
// Ben's answer is more concrete and takes it from her. Cal's answer is vaguer
// and fails to. The sponsor's own entry and a second entry by Ann are refused
// for free. When the window closes the prize is paid to the champion.

import { readFileSync, writeFileSync } from "node:fs";
import { RECORD_FILE, accountFrom, balanceOf, clientFor, fundAccount, loadEnv, network, readRetry, recorder, sleep, sourceSha256 } from "./lib.mjs";

loadEnv();
const net = network();
const record = JSON.parse(readFileSync(RECORD_FILE, "utf8"));
if (record.source_sha256 !== sourceSha256()) throw new Error("jury.py changed since it was deployed; run pnpm deploy:contract first");
const address = record.contract;
const GEN = 10n ** 18n;
const PRIZE = GEN / 100n;
const WINDOW = 420n;

const QUESTION = "Why should a city plant more street trees? Answer in a few sentences.";
const RUBRIC = "A better answer gives concrete, checkable benefits (shade, heat, air, flooding) and avoids slogans.";
const ANN = "Street trees give shade in summer, which keeps sidewalks cooler, and their roots soak up some rain after storms.";
const BEN = "Street trees shade asphalt and lower street temperatures by several degrees, absorb rainfall to ease flooding, and trap fine dust from traffic.";
const CAL = "Trees are lovely and everybody loves them because nature is wonderful and gives us peace and happiness in the city.";

const ROLES = ["sponsor", "ann", "ben", "cal"];
const who = Object.fromEntries(ROLES.map((k) => [k, accountFrom(`${k.toUpperCase()}_PRIVATE_KEY`, net)]));
const as = Object.fromEntries(ROLES.map((k) => [k, clientFor(net, who[k])]));
const ro = clientFor(net, null);
const read = (fn, args = []) => readRetry(() => ro.readContract({ address, functionName: fn, args }));
const plain = (v) => JSON.parse(JSON.stringify(v, (_, x) => (typeof x === "bigint" ? Number(x) : x instanceof Map ? Object.fromEntries(x) : x)));
const rec = recorder();
const w = (k, fn, args, opts) => rec.write(as[k], who[k], address, fn, args, opts);

console.log(`\ncontract ${address}`);
if (Number(await read("count")) !== 0) throw new Error("the demo expects a fresh contract");
if (net.name === "studionet") await fundAccount(net, ro, who.sponsor.address, GEN);

const benBefore = await balanceOf(ro, who.ben.address);
await w("sponsor", "open", [QUESTION, RUBRIC, WINDOW], { step: "the sponsor pays the prize in", value: PRIZE });
await w("sponsor", "enter", [0n, ANN], { step: "the sponsor enters their own contest: refused", expect: "refused" });
await w("ann", "enter", [0n, ANN], { step: "first answer clears the bar and takes the crown" });
await w("ann", "enter", [0n, BEN], { step: "a second answer by the same entrant: refused", expect: "refused" });
await w("ben", "enter", [0n, BEN], { step: "a more concrete answer challenges and takes the crown" });
await w("cal", "enter", [0n, CAL], { step: "a vaguer answer challenges and fails to" });
await w("cal", "settle", [0n], { step: "settle before the window closes: refused", expect: "refused" });

const mid = plain(await read("contest", [0n]));
const closes = Date.parse(mid.closes_at);
const waitMs = closes - Date.now() + 20_000;
if (waitMs > 0) {
  console.log(`\nwaiting ${Math.ceil(waitMs / 1000)}s for the window to close`);
  await sleep(waitMs);
}
await w("cal", "settle", [0n], { step: "settle after the window closes: the prize goes to the champion" });
await w("cal", "settle", [0n], { step: "settle again: refused", expect: "refused" });

let benAfter = await balanceOf(ro, who.ben.address);
for (let i = 0; i < 20 && benAfter <= benBefore; i++) { await sleep(10_000); benAfter = await balanceOf(ro, who.ben.address); } // the payout lands after the receipt
record.steps.push(...rec.steps);
record.demo = {
  question: QUESTION, rubric: RUBRIC, prize_wei: String(PRIZE),
  contest: plain(await read("contest", [0n])),
  entries: plain(await read("entries_of", [0n])),
  held_after: String(await read("held_total")),
  champion_balance_before: String(benBefore), champion_balance_after: String(benAfter),
  champion_gain: String(benAfter - benBefore),
  accounts: Object.fromEntries(ROLES.map((k) => [k, who[k].address])),
};
writeFileSync(RECORD_FILE, JSON.stringify(record, null, 2) + "\n");
console.log(`\nchampion gained ${benAfter - benBefore} wei; record written\n`);
