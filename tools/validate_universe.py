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
assert tracked=={'README.md','DECISIONS.md','WORK-QUEUE.md','canon/registry.json','canon/world-and-story.md','tools/validate_universe.py','.github/workflows/universe-validate.yml','canon/pact-of-ten.md','canon/source-pins.json','VERSION','canon/founders-and-mythology.md','canon/covenants-and-derived-schools.md'}
pins=json.loads((root/'canon/source-pins.json').read_text())
assert (root/'VERSION').read_text().strip()==pins['workspace_version']=='0.0.4-candidate'
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
            assert r['status']==('approved_direction' if r['id']=='AV-PACT-001' else 'candidate')
            assert r['document'] in {'canon/pact-of-ten.md','canon/founders-and-mythology.md','canon/covenants-and-derived-schools.md'} and (root/r['document']).is_file()
            assert r['id'] in (root/r['document']).read_text()
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
    node=next(r for r in fixture if r['id']=='AV-ERA-004')
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

byid={r['id']:r for r in rows}
assert byid['AV-PACT-001']['approved_scope']=='meaning_and_three_obligations_only'
assert byid['AV-PACT-001']['status']=='approved_direction'
for kind in ('founder','mythic_representative','founding_civilization'):
    group=[r for r in rows if r['kind']==kind]
    assert len(group)==10 and {r['school'] for r in group}==set(element['schools']) and all(r['status']=='candidate' for r in group)
for r in rows:
    if r['kind']=='founder': assert byid[r['race_id']]['kind']=='playable_race' and r['race_id'] in r['depends_on']
    if r['kind']=='mythic_representative': assert r['domain']=='base' and r['playable'] is False and byid[r['creature_class_id']]['name']=='Divine being'
    if r['kind']=='city': assert any(byid[d]['kind']=='founding_civilization' and byid[d]['school']==r['school'] for d in r['depends_on'])
assert sum(r['kind']=='founder' for r in (byid[d] for d in byid['AV-EVENT-002']['depends_on']))==10
print('Founding alignment: ten magician delegates, ten non-playable mythical representatives, ten coalitions, ten linked cities; meaning-only acceptance.')

def covenant_check(records):
    idx={r['id']:r for r in records}
    cov=[r for r in records if r['kind']=='founding_covenant']
    assert len(cov)==10 and {r['school'] for r in cov}==set(element['schools'])
    assert len({r['founder_id'] for r in cov})==len({r['sovereign_id'] for r in cov})==10
    for r in cov:
        a,b=idx[r['founder_id']],idx[r['sovereign_id']]
        assert a['kind']=='founder' and b['kind']=='mythic_representative' and a['school']==b['school']==r['school']
        assert r['status']=='candidate' and r['voluntary'] is True and r['ownership'] is False and r['grants_school_access'] is False
        assert set(r['depends_on'])=={a['id'],b['id'],'AV-PACT-001'}
covenant_check(rows)
for mode in ('wrong_school','ownership','access_grant','duplicate_pair'):
    fixture=copy.deepcopy(rows)
    a,b=[r for r in fixture if r['kind']=='founding_covenant'][:2]
    if mode=='wrong_school':
        a['sovereign_id'],b['sovereign_id']=b['sovereign_id'],a['sovereign_id']
        for pair in (a,b): pair['depends_on']=[pair['founder_id'],pair['sovereign_id'],'AV-PACT-001']
    elif mode=='ownership': a['ownership']=True
    elif mode=='access_grant': a['grants_school_access']=True
    else: a['founder_id']=b['founder_id']; a['sovereign_id']=b['sovereign_id']
    try: covenant_check(fixture)
    except AssertionError: pass
    else: raise AssertionError('covenant negative fixture passed: '+mode)
print('Covenant alignment: ten voluntary candidate pairs; four negative fixtures rejected; no ownership or affinity grant.')
