import json, subprocess, sys, os
from tools import install, session
repo = "vixttha/AlderVale-Pact-of-Ten"
expected = "0201113fd6143aee086e98d72ca523d37c97d648"
candidate = "bdf82c0859a2d7511bc643f270e4612a94ef6727"
class ReadOnly(install.GitHub):
    def request(self, method, path, body=None):
        if method != "GET":
            raise AssertionError("Read-only acceptance")
        return super().request(method, path, body)
api = ReadOnly(os.environ["GH_TOKEN"])
state = session.load(api, repo, expected)
report = session.inspect(api, state)
assert state["manifest"]["source_sha"] == "4fc9ac47462101b941ea2f78fc939d42a9de0032"
assert report["installed_sha"] == expected and report["repository"] == repo
assert report["product_sha"] == "a6c2060b8175f505cc6327ccb5658cc00a458b24" and report["status"] == "resume"
assert report["issue"]["number"] == 70 and report["issue"]["version"] == "v0.0.0.1"
assert report["active"]["phase"] == "Validate" and report["active"]["candidate_sha"] == candidate
assert report["active"]["pull_request"] == 185 and report["owner_merge_required"]
assert not report["evidence_verified"] and state["manifest"]["enforcement"] == "disabled"
assert len(state["handoff"]["history"]) == 1 and state["handoff"]["history"][0]["disposition"] == "rework"
assert session.inspect(api, state, requested=13)["status"] == "blocked_other_active_issue"
try:
    session.claim(api,state,13,["other"],"competing worker")
except ValueError as exc:
    assert "Another issue owns" in str(exc)
else:
    raise AssertionError("Competing claim accepted")
try:
    session.load(api,repo,"a29ca8b2756a5847c093548ee4d931773c137804")
except ValueError as exc:
    assert "advanced" in str(exc)
else:
    raise AssertionError("Stale installed SHA accepted")
second = json.loads(subprocess.check_output([sys.executable,"-m","tools.session","--target",repo,"--expected-sha",expected,"inspect"],text=True))
assert second == report
print(json.dumps({"kind":"fresh_read_only_process_recovery","report":report,"same_result_in_second_process":True,"competing_claim_refused":True,"stale_state_refused":True,"source_pin_verified":True,"independent_llm":False,"run":os.environ["GITHUB_RUN_ID"],"attempt":os.environ["GITHUB_RUN_ATTEMPT"]},indent=2))
