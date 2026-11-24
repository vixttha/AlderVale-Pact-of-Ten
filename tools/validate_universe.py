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
assert [r['status'] for r in rows if r['kind']=='campaign']==['candidate']
assert 'Rowan is rejected' in (root/'DECISIONS.md').read_text()
assert 'every designated special accessory' in (root/'DECISIONS.md').read_text()
assert 'FQ-001' in (root/'DECISIONS.md').read_text()
tracked=set(subprocess.check_output(['git','ls-files'],cwd=root,text=True).splitlines())
assert tracked=={'README.md','DECISIONS.md','WORK-QUEUE.md','canon/registry.json','canon/world-and-story.md','tools/validate_universe.py','.github/workflows/universe-validate.yml','canon/pact-of-ten.md','canon/source-pins.json','VERSION'}
pins=json.loads((root/'canon/source-pins.json').read_text())
assert (root/'VERSION').read_text().strip()==pins['workspace_version']=='0.0.2-candidate'
element=pins['element_hq']
assert set(element['schools'])=={r['school'] for r in cities}
assert len(element['oppositions'])==5 and {frozenset(p) for p in element['oppositions']}=={frozenset(p) for p in [('Fire','Water'),('Lightning','Frost'),('Wind','Earth'),('Light','Dark'),('Metal','Plant')]}
assert {r['id']:set(r['parents']) for r in element['selected_recipes']}=={'fusion.rust':{'Water','Metal'},'fusion.sugar':{'Light','Plant'},'fusion.magnetism':{'Earth','Metal'}}
assert not element['merged'] and not element['playable_recipes'] and set(element['laws'])=={'EA-001','FQ-001'}
assert all(re.fullmatch('[0-9a-f]{40}',s) for s in [pins['game_main'],element['canonical_base'],element['reviewed_candidate']])
def graph_check(records):
    graph={r['id']:r.get('depends_on',[]) for r in records}
    assert len(graph)==len(records)
    for r in records:
        for target in graph[r['id']]:
            assert target in graph and target!=r['id']
        if 'document' in r:
            assert r['status']=='candidate' and r['document']=='canon/pact-of-ten.md' and (root/r['document']).is_file()
    visiting=set(); done=set()
    def visit(node):
        assert node not in visiting, 'cycle: '+node
        if node in done: return
        visiting.add(node)
        for target in graph[node]: visit(target)
        visiting.remove(node); done.add(node)
    for node in graph: visit(node)
    return graph
graph=graph_check(rows)
for r in rows:
    if r.get('document')=='canon/pact-of-ten.md': assert r['id'] in (root/r['document']).read_text()
import copy
for mode in ('dangling','cycle','promotion'):
    fixture=copy.deepcopy(rows)
    node=next(r for r in fixture if r['id']=='AV-PACT-001')
    if mode=='dangling': node['depends_on']=['AV-MISSING-001']
    elif mode=='cycle': node['depends_on']=['AV-STORY-001']
    else: node['status']='approved_direction'
    try: graph_check(fixture)
    except AssertionError: pass
    else: raise AssertionError('negative fixture passed: '+mode)
print(f'Canon dependency graph: {len(graph)} nodes, {sum(map(len,graph.values()))} edges; dangling, cycle and premature promotion fixtures rejected.')
sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
assert sha==os.environ['GITHUB_SHA']
print(f'Universe registry: {len(rows)} records; 10 candidate cities, 13 races, six creature classes; isolated tree; checkout {sha}. Structural evidence only.')
