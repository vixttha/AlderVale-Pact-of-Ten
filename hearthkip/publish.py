"""One non-force Git push to the approved output ref; read back public bytes."""
import hashlib,json,os,sys,subprocess,tempfile,shutil,time,urllib.request
from pathlib import Path
REPO="vixttha/AlderVale-Pact-of-Ten"
BRANCH="AAGP-Asset-Output"
SEED="3e419fb6fa19f36925e9b179da666d1095197ecb"
PREFIX="hearthkip/r1"
def require(ok,msg):
    if not ok: raise RuntimeError(msg)
def git(*args,env=None):
    return subprocess.check_output(["git",*args],env=env,text=True).strip()
def digest(b): return hashlib.sha256(b).hexdigest()
src=Path(sys.argv[1])
require(os.environ["GITHUB_REPOSITORY"]==REPO and os.environ["GITHUB_REF"]=="refs/heads/AlderVale-Asset-Generation","wrong source ref")
require(git("rev-parse","HEAD")==os.environ["GITHUB_SHA"],"wrong checkout")
require(json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())["repository"]["private"] is False,"repository must be public")
record=json.loads((src/"publication.json").read_text())
require(record["source_commit"]==os.environ["GITHUB_SHA"] and record["input_kind"]=="hearthkip-r1-approved","receipt scope")
allowed={"candidate.glb","viewer.html","viewer-LICENSE.txt","all-angles.png","inspection.zip"}|{n+".png" for n in ("front","rear","left","right","top","underside","three-quarter")}
require(set(record["files"])==allowed and {p.name for p in src.iterdir()}==allowed|{"publication.json"},"unexpected output")
require(sum(p.stat().st_size for p in src.iterdir())<=32*1024*1024,"output size")
for n,r in record["files"].items():
    p=src/n;require(p.is_file() and not p.is_symlink() and p.stat().st_size==r["bytes"] and digest(p.read_bytes())==r["sha256"],"file mismatch")
remote="https://github.com/"+REPO+".git"
with tempfile.TemporaryDirectory() as tmp:
    work=Path(tmp)/"output"
    # Public reads do not require a write credential.
    clean=os.environ.copy();clean.pop("AAGP_PUSH_TOKEN",None)
    git("clone","--depth","1","--single-branch","--branch",BRANCH,remote,str(work),env=clean)
    require(git("-C",str(work),"rev-parse","HEAD",env=clean)==SEED,"output branch changed; refusing overwrite")
    target=work/PREFIX;target.mkdir(parents=True,exist_ok=False)
    for p in src.iterdir():shutil.copyfile(p,target/p.name)
    git("-C",str(work),"add","--",PREFIX,env=clean)
    changed=set(git("-C",str(work),"diff","--cached","--name-only",env=clean).splitlines())
    require(changed=={PREFIX+"/"+n for n in allowed|{"publication.json"}},"unexpected staged paths")
    git("-C",str(work),"-c","user.name=github-actions[bot]","-c","user.email=41898282+github-actions[bot]@users.noreply.github.com","commit","-m","AAGP Hearthkip R1 inspection "+record["source_commit"],env=clean)
    result=git("-C",str(work),"rev-parse","HEAD",env=clean)
    ask=Path(tmp)/"askpass";ask.write_text('#!/bin/sh\ncase "$1" in *Username*) printf "%s\\n" x-access-token;; *) printf "%s\\n" "$AAGP_PUSH_TOKEN";; esac\n');ask.chmod(0o700)
    tokenenv=dict(os.environ,GIT_ASKPASS=str(ask),GIT_TERMINAL_PROMPT="0")
    require(bool(tokenenv.get("AAGP_PUSH_TOKEN")),"missing token")
    git("-C",str(work),"-c","credential.helper=","push","origin","HEAD:refs/heads/"+BRANCH,env=tokenenv)
    require(git("ls-remote",remote,"refs/heads/"+BRANCH,env=clean).split()[0]==result,"remote ref mismatch")
    # Fetch by immutable commit, without credentials. Verify every remote byte.
    for n in sorted(allowed|{"publication.json"}):
        url="https://raw.githubusercontent.com/"+REPO+"/"+result+"/"+PREFIX+"/"+n
        expected=(src/n).read_bytes()
        for attempt in range(5):
            try:
                with urllib.request.urlopen(url,timeout=30) as response: data=response.read(len(expected)+1)
                require(data==expected,"remote bytes differ: "+n);break
            except Exception:
                if attempt==4: raise
                time.sleep(2)
    receipt={"status":"pass","source_commit":record["source_commit"],"output_commit":result,"branch":BRANCH,"prefix":PREFIX,"remote_files_verified":len(allowed)+1,"publication_sha256":digest((src/"publication.json").read_bytes()),"files":record["files"]}
    print(json.dumps(receipt,indent=2),flush=True)
    with open(os.environ["GITHUB_STEP_SUMMARY"],"a") as s:s.write("\nPublic delivery verified:\n\n"+json.dumps(receipt,indent=2)+"\n")
