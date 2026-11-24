import json, pathlib, re, subprocess, os
root=pathlib.Path(__file__).resolve().parents[1]
registry=json.loads((root/'canon/registry.json').read_text())
assert registry['schema_version']==1 and registry['world_id']=='aldervale'
rows=registry['records']; ids=[r['id'] for r in rows]
assert len(ids)==len(set(ids)) and all(re.fullmatch(r'AV-[A-Z]+-\d{3}',i) for i in ids)
assert all(r['status'] in {'approved_direction','candidate','existing_roster','unwritten'} for r in rows)
assert all(r['name'].strip() for r in rows)
cities=[r for r in rows if r['kind']=='city']; assert len(cities)==10 and all(r['status']=='candidate' for r in cities)
assert {r['school'] for r in cities}=={'Fire','Water','Lightning','Frost','Wind','Earth','Light','Dark','Metal','Plant'}
assert len({r['name'].casefold() for r in cities})==10
assert len([r for r in rows if r['kind']=='playable_race'])==13
assert len([r for r in rows if r['kind']=='creature_class'])==6
assert [r['status'] for r in rows if r['kind']=='campaign']==['unwritten']
assert 'Rowan is rejected' in (root/'DECISIONS.md').read_text()
assert 'every designated special accessory' in (root/'DECISIONS.md').read_text()
assert 'FQ-001' in (root/'DECISIONS.md').read_text()
tracked=set(subprocess.check_output(['git','ls-files'],cwd=root,text=True).splitlines())
assert tracked=={'README.md','DECISIONS.md','WORK-QUEUE.md','canon/registry.json','canon/world-and-story.md','tools/validate_universe.py','.github/workflows/universe-validate.yml'}
sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
assert sha==os.environ['GITHUB_SHA']
print(f'Universe registry: {len(rows)} records; 10 candidate cities, 13 races, six creature classes; isolated tree; checkout {sha}. Structural evidence only.')
