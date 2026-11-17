# Jury

A prize that stays with the best answer, decided one challenge at a time.

A sponsor pays a prize in for a question and a rubric. Anyone may enter an answer while the contest is open. The first answer must clear a bar. Every answer after it is a **challenge to the current champion**: validators read the two side by side and the challenger takes the crown only if it is clearly better. When the contest closes the prize is paid to whoever holds the crown.

## Why it is different

* **A tournament, not a score.** Models are unreliable at grading one answer on a scale and good at "which of these two is better?". The contract only ever asks that.
* **Both orders, or the champion stays.** Each challenge is asked twice, with the answers swapped and the options renumbered. The challenger wins only if it is chosen both times; a split, a tie or a different answer in each order keeps the champion.
* **Nothing to bribe or flatter.** The model is never shown the prize, the entrants or how many entered, and every caller string is fenced before it enters the prompt.
* **State across transactions.** The crown is held in storage and moves from one transaction to the next, so the final winner is the product of many separate consensus rounds.
* **A broken model moves nothing.** An unusable answer is retried once, then raised as `[LLM_ERROR]`, which no validator agrees with.

```
open(question, rubric, window)  payable   the sponsor pays the prize in
enter(id, answer)               anyone but the sponsor, once per contest
settle(id)                      after close: pays the champion, or returns the prize if nobody cleared the bar
```

## Run it

```bash
pnpm install
pnpm test               # 42 tests against a GenVM simulator
pnpm lint:genvm         # genvm-lint on the contract
pnpm deploy:contract    # deploy to StudioNet from a throwaway wallet
pnpm demo:contract      # a crown taken, a crown held, the refusals and the payout, on the explorer
pnpm verify:contract    # the source on chain is the file in this repository
```

## On chain

See [`packages/contracts/deployments/studionet.json`](packages/contracts/deployments/studionet.json) for the address, every transaction hash, each refusal sentence and the champion's balance before and after.

MIT.
