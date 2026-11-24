import copy,json,re,pathlib
root=pathlib.Path(__file__).resolve().parent
schema=json.loads((root/'registry.schema.json').read_text())
data=json.loads((root/'registry.json').read_text())
S=set(schema['properties']['recipes']['items']['properties']['parents']['items']['enum']); G={'Q1','Q2','Q3','Q4'}
def validate(d):
    assert set(d)=={'schema_version','recipes'} and type(d['schema_version']) is int and d['schema_version']==1 and isinstance(d['recipes'],list)
    seen=set()
    for r in d['recipes']:
        assert set(r)==set(schema['properties']['recipes']['items']['required']) or set(r)-set(schema['properties']['recipes']['items']['required']) <= {'approval_ref','implementation_ref'} and set(schema['properties']['recipes']['items']['required']) <= set(r)
        assert isinstance(r['id'],str) and re.fullmatch(r'fusion\.[a-z][a-z0-9_]*',r['id']) and r['id'] not in seen
        seen.add(r['id']); assert isinstance(r['name'],str) and r['name'].strip() and type(r['revision']) is int and r['revision']>=1
        assert isinstance(r['parents'],list) and len(r['parents'])==2 and len(set(r['parents']))==2 and set(r['parents'])<=S
        assert r['status'] in {'exploratory','selected','paused','retired','playable'} and set(r['gates'])==G
        for gate in r['gates'].values():
            assert set(gate)=={'status','evidence'} and gate['status'] in {'PASS','FAIL','UNVERIFIED'} and isinstance(gate['evidence'],list) and all(isinstance(e,str) and e.strip() for e in gate['evidence'])
        assert type(r['gameplay_approved']) is bool and type(r['implementation_verified']) is bool
        for key in ('approval_ref','implementation_ref'):
            if key in r: assert isinstance(r[key],str) and r[key].strip()
        k=r['kit']
        if k is not None:
            assert set(k)=={'prerequisite_node_ids','discovery_id','effect_id','pip_cost'} and type(k['pip_cost']) is int and k['pip_cost']>=0
            assert isinstance(k['prerequisite_node_ids'],list) and len(k['prerequisite_node_ids'])>0 and len(set(k['prerequisite_node_ids']))==len(k['prerequisite_node_ids']) and all(isinstance(x,str) and x.strip() for x in k['prerequisite_node_ids'])
            assert all(isinstance(k[x],str) and k[x].strip() for x in ('discovery_id','effect_id'))
        if r['status']=='playable':
            assert r['gameplay_approved'] and r['implementation_verified'] and k is not None and r.get('approval_ref') and r.get('implementation_ref') and all(g['status']=='PASS' and g['evidence'] for g in r['gates'].values())
validate(data)
assert {r['id']:set(r['parents']) for r in data['recipes'] if r['status']=='selected'}=={'fusion.rust':{'water','metal'},'fusion.sugar':{'light','plant'},'fusion.magnetism':{'earth','metal'}}
assert not any(r['status']=='playable' for r in data['recipes'])
x=copy.deepcopy(data); other=copy.deepcopy(x['recipes'][0]); other.update(id='fusion.fixture',name='Fixture',status='exploratory'); x['recipes'].append(other); validate(x)
for mutate in (lambda x:x['recipes'].append(copy.deepcopy(x['recipes'][0])),lambda x:x['recipes'][0].update(parents=['water','water']),lambda x:x['recipes'][0].update(parents=['water','rust']),lambda x:x['recipes'][0].update(status='playable'),lambda x:x['recipes'][0].update(revision=True)):
    x=copy.deepcopy(data); mutate(x)
    try: validate(x)
    except AssertionError: pass
    else: raise AssertionError('negative case accepted')
print('Fusion registry: selected recipes retained, extra same-pair candidate accepted, five negative cases rejected. No playable entries; design checks only.')
