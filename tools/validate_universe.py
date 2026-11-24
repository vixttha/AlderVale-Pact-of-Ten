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
source_path='art/avarn/3d/source/avarn-v1.glb'
if source_path in tracked:
    import hashlib
    from avarn_intake import SOURCE_SHA, SOURCE_SIZE
    source=root/source_path
    assert source.stat().st_size==SOURCE_SIZE, 'Avarn source size mismatch'
    with source.open('rb') as stream:
        assert hashlib.file_digest(stream,'sha256').hexdigest()==SOURCE_SHA, 'Avarn source digest mismatch'
    tracked.remove(source_path)
assert tracked=={'README.md','DECISIONS.md','WORK-QUEUE.md','canon/registry.json','canon/world-and-story.md','tools/validate_universe.py','.github/workflows/universe-validate.yml','canon/pact-of-ten.md','canon/source-pins.json','VERSION','canon/founders-and-mythology.md','canon/covenants-and-derived-schools.md','canon/fire-founding-partnership.md','art/open-hearth/01-hearthstone.svg','art/open-hearth/02-forged-ring.svg','art/open-hearth/03-ember-gate.svg','art/open-hearth/04-shared-flame.svg','art/open-hearth/05-kilnback-seal.svg','art/open-hearth/README.md','tools/open_hearth_requirements.txt','tools/export_open_hearth.py','art/open-hearth/review-b/01-open-circlet.svg','art/open-hearth/review-b/02-hearth-gate.svg','art/open-hearth/review-b/03-oath-of-embers.svg','art/open-hearth/review-b/04-kilnback-seal.svg','art/open-hearth/review-b/05-keeper-of-warmth.svg','art/open-hearth/review-b/README.md','art/open-hearth/hearth-gate-r1/01-hero.svg','art/open-hearth/hearth-gate-r1/02-simple-icon.svg','art/open-hearth/hearth-gate-r1/03-monochrome.svg','art/open-hearth/hearth-gate-r1/04-dark-background.svg','art/open-hearth/hearth-gate-r1/README.md','art/open-hearth/hearth-gate-r2/01-hero.svg','art/open-hearth/hearth-gate-r2/02-simple-icon.svg','art/open-hearth/hearth-gate-r2/03-monochrome.svg','art/open-hearth/hearth-gate-r2/04-dark-background.svg','art/open-hearth/hearth-gate-r2/README.md','art/open-hearth/hearth-gate-r3/01-hero.svg','art/open-hearth/hearth-gate-r3/02-simple-icon.svg','art/open-hearth/hearth-gate-r3/03-monochrome.svg','art/open-hearth/hearth-gate-r3/04-dark-background.svg','art/open-hearth/hearth-gate-r3/05-stone-relief.svg','art/open-hearth/hearth-gate-r3/06-forged-metal.svg','art/open-hearth/hearth-gate-r3/07-ceremonial-banner.svg','art/open-hearth/hearth-gate-r3/README.md','tools/hearth_gate_3d.py','tools/prepare_hearth_gate_3d.py','tools/validate_hearth_gate_3d.py','.github/workflows/hearth-gate-3d.yml','art/open-hearth/hearth-gate-r3/3D-EVALUATION.md','art/avarn/concepts-a/01-kilnback-colossus.svg','art/avarn/concepts-a/02-cinder-crowned.svg','art/avarn/concepts-a/03-ember-vault.svg','art/avarn/concepts-a/04-caldera-warden.svg','art/avarn/concepts-a/05-ashveil-pilgrim.svg','art/avarn/concepts-a/README.md','tools/export_avarn_concepts.py','art/avarn/hybrid-r2/README.md','art/avarn/3d/README.md','tools/avarn_intake.py','tools/test_avarn_intake.py','.github/workflows/avarn-3d.yml','tools/avarn_blender_trial.py'}
pins=json.loads((root/'canon/source-pins.json').read_text())
assert (root/'VERSION').read_text().strip()==pins['workspace_version']=='0.0.5-candidate'
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
            assert r['status']==('approved_direction' if r['id'] in {'AV-PACT-001','AV-ARCH-001','AV-COVMODEL-001','AV-DOSSIER-001'} else 'candidate')
            assert r['document'] in {'canon/pact-of-ten.md','canon/founders-and-mythology.md','canon/covenants-and-derived-schools.md','canon/fire-founding-partnership.md'} and (root/r['document']).is_file()
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
print('Founding alignment: ten magician delegates, ten non-playable mythical representatives, ten coalitions, ten linked cities; standalone production specifications remain candidate; Fire historical foundation tracked separately.')

def covenant_check(records):
    idx={r['id']:r for r in records}
    cov=[r for r in records if r['kind']=='founding_covenant']
    assert len(cov)==10 and {r['school'] for r in cov}==set(element['schools'])
    assert len({r['founder_id'] for r in cov})==len({r['sovereign_id'] for r in cov})==10
    for r in cov:
        a,b=idx[r['founder_id']],idx[r['sovereign_id']]
        assert a['kind']=='founder' and b['kind']=='mythic_representative' and a['school']==b['school']==r['school']
        assert r['status']=='candidate' and r['voluntary'] is True and r['ownership'] is False and r['grants_school_access'] is False
        assert set(r['depends_on'])=={a['id'],b['id'],'AV-PACT-001','AV-COVMODEL-001'}
covenant_check(rows)
for mode in ('wrong_school','ownership','access_grant','duplicate_pair'):
    fixture=copy.deepcopy(rows)
    a,b=[r for r in fixture if r['kind']=='founding_covenant'][:2]
    if mode=='wrong_school':
        a['sovereign_id'],b['sovereign_id']=b['sovereign_id'],a['sovereign_id']
        for pair in (a,b): pair['depends_on']=[pair['founder_id'],pair['sovereign_id'],'AV-PACT-001','AV-COVMODEL-001']
    elif mode=='ownership': a['ownership']=True
    elif mode=='access_grant': a['grants_school_access']=True
    else: a['founder_id']=b['founder_id']; a['sovereign_id']=b['sovereign_id']
    try: covenant_check(fixture)
    except AssertionError: pass
    else: raise AssertionError('covenant negative fixture passed: '+mode)
print('Covenant alignment: ten voluntary candidate pairs; four negative fixtures rejected; no ownership or affinity grant.')

assert f"/blob/{element['reviewed_candidate']}/element-hq/designs/derived-schools-and-sovereigns.md" in (root/'canon/covenants-and-derived-schools.md').read_text()
assert pins['game_main'] in (root/'README.md').read_text()
assert 'canon/covenants-and-derived-schools.md' in (root/'README.md').read_text()
print('Source-pin and documentation cross-reference checks passed.')

def decision_check(records):
    idx={r['id']:r for r in records}
    approved={r['id'] for r in records if r['status']=='approved_direction' and 'document' in r}
    assert approved=={'AV-PACT-001','AV-ARCH-001','AV-COVMODEL-001','AV-DOSSIER-001'}
    a,c=idx['AV-ARCH-001'],idx['AV-COVMODEL-001']
    assert a['approved_scope']=='ten_base_affinities_expandable_derived_traditions_only' and a['base_affinity_count']==10 and a['max_equipped_affinities']==2 and a['derived_affinity_slots'] is False
    assert c['approved_scope']=='independent_voluntary_partnership_only' and c['voluntary'] is True and c['ownership'] is False and c['grants_school_access'] is False and c['divine_veto'] is False
    dossiers=[r for r in records if r['kind']=='partnership_dossier']
    assert len(dossiers)==1
    d=dossiers[0]
    assert d['id']=='AV-DOSSIER-001' and d['school']=='Fire' and d['status']=='approved_direction' and d['approved_scope']=='historical_foundation_only' and d['approved_source_sha']=='6e523bc81c263b489f61485f77fa61c49fe6149d'
    for field,kind in [('founder_id','founder'),('sovereign_id','mythic_representative'),('covenant_id','founding_covenant'),('city_id','city'),('civilization_id','founding_civilization')]:
        target=idx[d[field]]
        assert target['kind']==kind and target['school']==d['school'] and target['status']=='candidate'
    assert idx[d['covenant_id']]['founder_id']==d['founder_id'] and idx[d['covenant_id']]['sovereign_id']==d['sovereign_id']
    assert {'AV-ARCH-001','AV-COVMODEL-001',d['covenant_id'],d['city_id'],d['civilization_id']}<=set(d['depends_on'])
    assert d['document']=='canon/fire-founding-partnership.md'
decision_check(rows)
for record,field,value in [('AV-ARCH-001','base_affinity_count',11),('AV-ARCH-001','derived_affinity_slots',True),('AV-COVMODEL-001','divine_veto',True),('AV-DOSSIER-001','approved_scope','all_art_and_gameplay'),('AV-DOSSIER-001','sovereign_id','AV-MYTHIC-002')]:
    fixture=copy.deepcopy(rows)
    next(r for r in fixture if r['id']==record)[field]=value
    try: decision_check(fixture)
    except AssertionError: pass
    else: raise AssertionError('negative decision fixture accepted: '+field)
doc=(root/'canon/fire-founding-partnership.md').read_text()
for h in ('## Identity and language','## Maren Voss','## Avarn','## Shared chronology','## What both gave up','## Civilization','## Symbols and historical evidence','## Present-day relevance','## Review disposition'):
    assert h in doc
assert 'AV-3D-001' in doc and 'No new Fire fusion' in doc and 'awaiting owner review' in doc
print('Owner decisions: two architecture approvals, ten standalone candidate covenants, Fire historical foundation accepted only; five negative fixtures rejected.')
