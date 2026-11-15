export type LoopStepId =
  | "title"
  | "wizard"
  | "zone"
  | "solo-duel"
  | "persist"
  | "webgl";

export type LoopStep = {
  id: LoopStepId;
  playerSees: string;
  code: string;
  automatedCheck: string;
};

export const loopSteps: LoopStep[] = [
  {
    id: "title",
    playerSees: "The title studio, not a blank page.",
    code: "App renders TitleWizardStudio while activeWizard is null.",
    automatedCheck: "No browser test on this branch. The title path is the early return in src/App.tsx.",
  },
  {
    id: "wizard",
    playerSees: "One guest wizard is created and enters the world.",
    code: "handleCreateWizard writes a guest bundle, then enterWorld. Cap is 3 wizards. createStarterWizard builds the deck and currencies.",
    automatedCheck: "No UI enrollment test. Starter decks are checked in tests/vault/gameData.test.ts.",
  },
  {
    id: "zone",
    playerSees: "One realm and one zone. New wizards spawn in the hub.",
    code: "Realms are breeze, horizon, and everpeak. Zones are hub, amphitheater, arbor, and sanctuary. enterWorld sets zone to hub.",
    automatedCheck: "tests/vault/gameData.test.ts checks NPC zones. No movement test.",
  },
  {
    id: "solo-duel",
    playerSees: "One solo skirmish can be won.",
    code: "DuelArenaModal.launchSolo builds a local duel. A solo win in handleDuelFinished pays XP and florins, then applySagaEvent(wizard, 'solo-win') completes q_first_duel once.",
    automatedCheck: "tests/vault/guestQuestSave.test.ts covers the quest payout. It does not open the duel UI.",
  },
  {
    id: "persist",
    playerSees: "Reload keeps the wizard, florins, and quest progress. The player returns to the title and enters that wizard again.",
    code: "Guest bundles use localStorage key aldervale_guest_<realm>_v1 through loadGuestRealm and saveGuestRealm. activeWizard starts null, and selectedRealm starts as breeze. Zone, settings, and overlay are not stored. saveGuestRealm ignores storage failures.",
    automatedCheck: "G13-001 in tests/vault/guestQuestSave.test.ts reloads one breeze wizard and checks that a second solo-win does not pay again.",
  },
  {
    id: "webgl",
    playerSees: "If WebGL cannot be created, a recovery panel replaces a blank world.",
    code: "WorldViewport and AvatarPreview3D construct WebGLRenderer with no failure path. WorldViewport shows Restoring 3D Sky-Canvas after a lost context. AvatarPreview3D does not. Creation failure is uncaught in both.",
    automatedCheck: "No test covers a failed WebGL constructor.",
  },
];

export const parkedWork = [
  "Bazaar buy settlement",
  "House persistence",
  "Peer trade",
  "Authenticated cloud-save strategy",
  "PvP security program",
  "New GLB pipeline",
  "CI expansion beyond the current Test Vault workflow",
];

export type NextSlice = {
  sliceId: "webgl-create-failure";
  reason: string;
  acceptance: string;
  files: string[];
  test: string;
  leaveAlone: string[];
};

export const nextSlice: NextSlice = {
  sliceId: "webgl-create-failure",
  reason: "The other five loop steps have a code path. Returning to the title after reload is expected. WebGL creation failure does not have a path.",
  acceptance: "If the world renderer cannot be created, the player sees a recovery panel and can leave the world. The title form stays usable if the portrait preview cannot be created.",
  files: [
    "src/engine/worldViewport.tsx",
    "src/engine/avatarPreview3d.tsx",
  ],
  test: "Add one deterministic test or a small harness that simulates a failed renderer and expects the recovery text. Do not add a workflow job.",
  leaveAlone: parkedWork,
};
