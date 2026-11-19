# Water Focus skill-web mockup — second-iteration design audit

**Classification:** Visual design audit of a user-supplied high-fidelity screenshot, not testing a running game. This is the **second** screenshot after the first [skill-web audit](skill-web-visual-audit-2026-11-18.md). The image was inspected in the private conversation at **1672 × 941 pixels** and is **not committed to the public repository**. Describe visible features only; do not infer actual clickability or saved player state.  
**Verified current main source:** `6fb96df2957c93a9c59f7e280a287fdee75cdc6a` (game XP/rank/creatures/combat and project rules).  
**Element HQ working baseline:** `68415e280413d372a2130dd57f3a12ac93eab800` with [FQ-001](../../FUSION_QUALITY_LAW.md), [ten-tree feasibility](../skill-tree-feasibility-2026-11-18.md) and [current fusion decisions](../fusion-roster-decisions-2026-11-18.md).  
**Owner design state:** ten base schools, curated techniques; Rust/Sugar/Magnetism **recipe locks**, Glass exploratory, Magma paused. No new skill points or unlock-level rules approved.

## Verdict

**Keep the radial Water Focus plus dimmed outer constellation design.** It substantially improves layout clarity and shows how a cross-school gateway can appear without inventing a separate fusion school. Subjective visual direction **9/10**, information hierarchy **8/10**, prototype progression coherence **6/10**, playable-implementation readiness **4/10**. These ratings are editorial and **not** measured browser performance or usability.

## Compared with the previous screenshot

| Earlier finding | Version-two visible change | Audit verdict |
| --- | --- | --- |
| SW-01: `6 / 10 used` despite level 12 | Now `6 earned · 4 spent · 2 available` | **Improved**: arithmetic is internally consistent *only* under the unapproved one-point-per-even-level rule. New check-node ambiguity below. |
| SW-02: Rust labeled Discovered and immediately equippable | Separate `Recipe: Selected`, `Trial: Completed`, `Discovery: Unlocked` | **Partially improved**: wizard-state versus owner editorial lock still confused and playable Rust kit not verified. |
| SW-03: visually indistinguishable graph links | Node and edge legend now labels learned, available, locked and fusion gateway, with main/gateway/inactive lines | **Substantial improvement** but still needs concrete prerequisite arcs, player state and focus handling. |
| SW-04: Rust details lack mechanics | Rust inspector describes `Corrodes eligible defenses through water-driven oxidation` | **Not resolved**: no actual action/pip cost, duration, status limits, susceptible target or counter. |
| SW-05: duplicate level timelines | Left `Water Progress` list and bottom `Prototype Schedule` remain | **Not resolved**: precious horizontal space and duplicate status source. |
| SW-06: full web crowds Water | Selected `Water Focus` tab, three prominent Water branches, subdued nine partner hubs | **Resolved as a composition**; full outer ring is useful context at desktop size. |
| SW-07: prototype milestones look immutable | Bottom title now explicitly `Prototype Schedule` | **Improved**; left list still looks like authoritative game progression. |
| SW-09: designer rationale occupies a player UI panel | Right panel now explains Reactive Flow and Rust | **Resolved**. |
| SW-10: nodes lack cost/status meaning | Selected detail shows `Cost: 1 Mastery Point`, `Status: Available`, `Learn Node (1 Point)` | **Partial**; parent/child prerequisite semantics and point-source reconciliation remain unclear. |

## Current screenshot observations

- Top navigation names **Skill Trees, Fusion Library, Companions, Deck**, and the sub-tabs **Water Focus** (active), **Fusion Routes**, **Full Web**.
- Left summary: **Water Adept, Level 12, Rank 6; Mastery Points 6 earned / 4 spent / 2 available; Fusion Discoveries 1**.
- Water center links to **Pressure**, **Purification** and **Reactive Flow** with small checked, glowing available, and locked icons. Outer hub ring contains the other nine base elements; **Metal** leads visibly by a bright gold/cyan line to **Rust**.
- Selected top-right inspector: **Reactive Flow**; **Cost: 1 Mastery Point**; **Status: Available**; **Learn Node (1 Point)**; text about reactive countermeasures.
- Lower-right Rust panel: **Recipe: Selected**, **Trial: Completed**, **Discovery: Unlocked**, **Equip in Deck**. No pip/action cost, duration, material eligibility or counterplay shown.
- Left Level Progress lists `Lv. 3 Pressure branch opens` and `Lv. 5 Purification branch opens` with hollow markers, but `Lv. 7 Reactive Flow branch opens` and `Lv. 10 Rust trial opens` with green checks, despite the user being level 12.
- Bottom strip says **Water Mastery — Prototype Schedule**, with milestones `Lv. 2 First mastery point`, `Lv. 6 Secondary study opens`, `Lv. 10 Rust trial opens`, `Lv. 12 Rust discovered`.

## Second-iteration findings

| ID | Priority | Screenshot evidence | Risk / necessary design resolution |
| --- | --- | --- | --- |
| WF2-01 | **High** | Left shows **four points spent**, while at least **six small green checkmarked nodes** are visible in Pressure and Reactive Flow clusters, excluding the Water core. | If green checks equal purchased nodes, allocations exceed the budget. If some are free/quest-granted, label them `Free` or `Quest` and distinguish from `Spent point`. This is an **apparent** inconsistency pending defined node-cost rules, not a proven bug. |
| WF2-02 | **High** | `Reactive Flow` appears large/selected, has several checked neighboring nodes, while the inspector calls **Reactive Flow Available** and invites spending a point to learn it. | Decide whether the large node is a **branch name** or a **costed prerequisite**. If a prerequisite, descendants cannot already be learned; if a branch header, the inspector must identify the selected purchasable subnode instead. |
| WF2-03 | **High** | Rust has `Recipe: Selected`, `Discovery: Unlocked` and `Equip in Deck`, despite the currently selected recipe lacking a validated playable kit. | Distinguish **owner-selected design recipe** from **wizard's saved discovery**. Equip should only appear or enable when gameplay has a specified cost, compatible deck slot, valid unlock, and FQ-001 Q1–Q4 pass. In this image it remains **pure demo fiction**. |
| WF2-04 | **High** | Rust card gives no **pip/action cost, duration, stacking cap, eligible metal targets, cleanse/counter**. | Under [FQ-001](../../FUSION_QUALITY_LAW.md), Rust's playable kit cannot be accepted. Show `Mechanics: Design pending` and a counterplay research entry, not an unqualified full play button. |
| WF2-05 | Medium | The clear route visually runs **Metal → Rust** but the **Water → Rust** parent contribution is not explicitly shown as a second gateway input. | Two converging parent arrows or paired `Water` / `Metal` requirement badges should make the **Water + Metal** condition unambiguous without drawing the full web. |
| WF2-06 | Medium | In the left Water Progress list, past `branch opens` milestones alternate unchecked and checked. | Distinguish `Reached threshold` from `Node purchased` and `Quest completed`. At level 12, past threshold events should not appear pending just because the player didn't buy a branch. |
| WF2-07 | Medium | Both full-height left Progress list and bottom horizontal **Prototype Schedule** show milestone data. | Keep the bottom timeline as the only chronological control; make the left column **Current build**, **2 available points** and **Next recommended action**, or collapse one timeline at narrow widths. |
| WF2-08 | Medium | The center remains filled with tiny lights and small node glyphs; edge legend is improved but the image has no demonstrated input interaction. | Build keyboard-focusable node controls, pan/zoom, a text-list equivalent, adequate focus/contrast, reduced motion and 200%/400% zoom before accessibility claims. **UNVERIFIED** from a static image. |
| WF2-09 | Medium | Right detail says `Unlocks: Reactive Flow effects` and `Advanced Water techniques`, without names or measurable outcomes. | Every node detail should identify its **exact effect, cost, prerequisite, state change and respec consequence**. If not defined, mark as `TBD` rather than implying a real unlock. |
| WF2-10 | Low | Outer Metal hub is highlighted; other owner-locked **Magnetism** (Earth + Metal) and **Sugar** (Light + Plant) are not visible in this focused view. | Acceptable in Water Focus, **provided** the Full Web / Fusion Routes views expose both when relevant and keep Rust/Metal parent reuse legal. Don't imply that Metal is reserved exclusively for Rust. |

## Code-backed and design-backed truth table

| Statement | Status | Basis |
| --- | --- | --- |
| `Level 12 · Rank 6` | **Verified source consistency** | `rankFromLevel(12) = 6` in `shared/realms.ts` on the pinned current main |
| `6 earned · 4 spent · 2 available` | **Conditional illustration** | Matches proposed even-level mastery points: levels 2, 4, 6, 8, 10, 12 = 6; **mastery-point state is not implemented** |
| `Rust: Water + Metal` | **Owner-selected recipe** | Current Element HQ decision; does **not** mean playable kit or card approved |
| `Reactive Flow: 1 point` | **Unapproved proposal** | Skill-tree draft names the branch but does not define final node prices or prereqs |
| `Rust Trial at level 10; unlocked by 12` | **Unapproved proposed timeline** | Static mockup illustrates one possible path; no verified server claim, quest, or unlock rule |
| `Equip in Deck` | **Static mockup only** | Playable Rust card still requires design, card/deck state, server rules and validation |
| Screen readability and interaction | **Unverified** | Static PNG only; no DOM, browser actions, assistive-technology tests or mobile layout supplied |

## Prioritized redesign specification (no new locks)

1. **Resolve the point/node contract.** Chosen model for review: `total earned=6`, `purchased=4`, `available=2`; show **exactly four purchased 1-point nodes** or explain each extra checked node as free/quest-based. Display the selected **specific node name**, not an ambiguous parent label.
2. **Clarify prerequisites:** a clicked node panel lists `1 point`, `Requires: Water Attunement + prior node`, `Effect: TBD`, and `State: Available`. Branch headings are not purchasable if they're just section titles.
3. **Clarify the fusion gateway:** draw **Water + Metal → Rust** as two distinct contributing parent glyphs entering a shared diamond; keep the ornate outer ring dimmed.
4. **Differentiate editorial and in-game state:** `Rust recipe selected for design` belongs in project tools, not the player HUD. A **demo** can show `Wizard discovered Rust in example trial`, but label the scene as a prototype and do not imply that the current game supports the card.
5. **Right-hand inspector:** switch between `Node Details` and `Fusion Details`. For Rust, include `Action cost: TBD`, `Duration: TBD`, `Eligible targets: TBD`, `Counterplay: TBD`, and `Playable status: Not specified` until the design law's gates pass.
6. **Deduplicate milestones:** keep one bottom level strip; replace left long list with `Next goal`, `Current build`, `2 points available` and a small `Respec` affordance (respec cost itself undecided).
7. **Keep fantasy hierarchy:** Water hub and three branches remain large; distinct circle/check/lock/diamond states and cyan/gold differentiated routes remain. Reduce tiny unlabelled stars *only* where they compete with interactive node affordances.

## Acceptance checks for a future **interactive** prototype

- [ ] **Exact account arithmetic:** saved purchased nodes + free/granted nodes match 6 earned / 4 spent / 2 available in the illustrated level-12 test state.
- [ ] **State transitions:** an available node becomes purchased only after a valid 1-point transaction; descendants can't bypass required parents.
- [ ] **Clue versus recipe versus playable card:** editorial lock, quest discovery, deck equip and spell cast are separate states; no phantom Rust unlock.
- [ ] **FQ-001:** both parent contributions, distinct readable art, unique action/cost and counterplay all have evidence before gameplay acceptance.
- [ ] **All-race access:** no exclusive race perk or bonus mastery points is silently introduced; ten schools remain the only damage types.
- [ ] **Navigation and accessibility:** mouse, keyboard, screen reader, touch, 200%/400% zoom, reduced motion, narrow layout and no-color-only comprehension evaluated on a running UI.
- [ ] **Public-runner policy:** run the actual code/browser/persistence scenarios on standard public GitHub-hosted runners at an exact candidate SHA after implementation authorization.

**Runner limitation:** the public Element HQ documentation workflow can validate this report, its links and baseline figures, but **cannot inspect this private screenshot's pixels or verify a clickable game interface**. No screenshot asset, new gameplay implementation, merge or release is authorized by this audit.

**Recommendation:** approve the **visual direction**, not the mechanics. The next design iteration should focus on coherent purchased-node arithmetic, one explicit Rust two-parent gateway, and honest node/fusion status details—not extra decorative complexity.
