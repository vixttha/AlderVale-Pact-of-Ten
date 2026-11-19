local epsilon = 1 / 1024
local cases = {
  {id = "G20-001", name = "open ground", scenarios = {
    {name = "straight", limit = 12, start = {1, -2}, moves = {{3, 0}}, expected = {{4, -2}}, wrong = {1, -2}},
    {name = "diagonal-past-distant-obstacle", limit = 12, start = {-2, 1},
      circles = {{-5, -5, 2}}, moves = {{3, 3}}, expected = {{1, 4}}},
    {name = "stationary", limit = 12, start = {1, 2}, moves = {{0, 0}}, expected = {{1, 2}}},
  }},
  {id = "G20-002", name = "island boundary", scenarios = {
    {name = "just-outside", limit = 5, start = {4, 0}, moves = {{1 + epsilon, 0}},
      expected = {{4, 0}}, wrong = {5 + epsilon, 0}},
    {name = "exact-axis-edge", limit = 5, start = {4, 0}, moves = {{1, 0}}, expected = {{5, 0}}},
    {name = "exact-diagonal-edge", limit = 5, start = {2, 3}, moves = {{1, 1}}, expected = {{3, 4}}},
    {name = "just-inside", limit = 5, start = {4, 0}, moves = {{1 - epsilon, 0}}, expected = {{5 - epsilon, 0}}},
  }},
  {id = "G20-003", name = "glancing collision", scenarios = {
    -- The 3:4 ray reaches a radius of 10 at (6, 8). The next displacement is perpendicular to the ray.
    {name = "project-and-continue", limit = 30, start = {-1, 12}, circles = {{0, 0, 10}},
      moves = {{4, -8}, {4, -3}}, expected = {{6, 8}, {10, 5}}, wrong = {3, 4}},
    {name = "offset-obstacle", limit = 30, start = {1, 10}, circles = {{2, -2, 10}},
      moves = {{4, -8}, {4, -3}}, expected = {{8, 6}, {12, 3}}},
    {name = "tangent-contact", limit = 30, start = {6, 11}, circles = {{0, 0, 10}},
      moves = {{0, -3}}, expected = {{6, 8}}},
  }},
  {id = "G20-004", name = "direct center hit", scenarios = {
    {name = "exact-offset-center", limit = 15, start = {2, 3}, circles = {{2, -1, 3}},
      moves = {{0, -4}}, expected = {{2, 3}}, wrong = {2, -1}},
    {name = "near-center-still-projects", limit = 15, start = {2, 3}, circles = {{2, -1, 3}},
      moves = {{epsilon, -4}}, expected = {{5, -1}}},
  }},
  {id = "G20-005", name = "obstacle near island edge", scenarios = {
    -- The requested step ends at 9, inside the island. The obstacle perimeter on that ray is at 12.
    {name = "outward-push-is-rejected", limit = 10, start = {4, 0}, circles = {{8, 0, 4}},
      moves = {{5, 0}}, expected = {{4, 0}}, wrong = {12, 0}},
    {name = "inward-push-is-accepted", limit = 10, start = {3, 0}, circles = {{8, 0, 4}},
      moves = {{4, 0}}, expected = {{4, 0}}},
    {name = "projection-exactly-on-edge", limit = 10, start = {3, 0}, circles = {{7, 0, 3}},
      moves = {{6, 0}}, expected = {{10, 0}}},
  }},
}

local function number_text(value)
  return ("%.17g"):format(value)
end

local function transform(point, swap, sign_x, sign_z, scale)
  local x, z = point[1], point[2]
  if swap then x, z = z, x end
  return {x * sign_x * scale, z * sign_z * scale}
end

local function make_fixtures()
  local fixtures = {}
  local geometry = 0
  for _, swap in ipairs({false, true}) do
    for _, sign_x in ipairs({1, -1}) do
      for _, sign_z in ipairs({1, -1}) do
        for _, scale in ipairs({0.5, 1, 2}) do
          geometry = geometry + 1
          local function convert(point)
            return transform(point, swap, sign_x, sign_z, scale)
          end
          for _, case in ipairs(cases) do
            for _, scenario in ipairs(case.scenarios) do
              local fixture = {
                id = case.id, key = scenario.name .. "-" .. geometry,
                limit = scenario.limit * scale, start = convert(scenario.start),
                circles = {}, moves = {}, expected = {},
              }
              for _, circle in ipairs(scenario.circles or {}) do
                local center = convert(circle)
                fixture.circles[#fixture.circles + 1] = {center[1], center[2], circle[3] * scale}
              end
              for i, move in ipairs(scenario.moves) do
                fixture.moves[i] = convert(move)
                fixture.expected[i] = convert(scenario.expected[i])
              end
              if scenario.wrong then fixture.wrong = convert(scenario.wrong) end
              fixtures[#fixtures + 1] = fixture
            end
          end
        end
      end
    end
  end
  return fixtures
end

local function encode_vectors(vectors)
  local encoded = {}
  for i, vector in ipairs(vectors) do
    local components = {}
    for j, value in ipairs(vector) do components[j] = number_text(value) end
    encoded[i] = table.concat(components, ",")
  end
  return table.concat(encoded, ";")
end

local function emit(fixtures)
  for _, fixture in ipairs(fixtures) do
    print(table.concat({
      fixture.id, fixture.key, number_text(fixture.limit),
      encode_vectors({fixture.start}), encode_vectors(fixture.circles),
      encode_vectors(fixture.moves),
    }, "\t"))
  end
end

local function coordinates_match(expected, x, z, limit)
  local tolerance = 1e-9 * math.max(1, limit)
  return x ~= nil and z ~= nil and math.abs(x - expected[1]) <= tolerance
    and math.abs(z - expected[2]) <= tolerance
end

local function verify(fixtures, path)
  local input = assert(io.open(path, "r"))
  local checkpoints, counts, controls = 0, {}, {}
  for _, fixture in ipairs(fixtures) do
    local id = fixture.id
    for index, expected in ipairs(fixture.expected) do
      local label = ("%s %s step %d"):format(id, fixture.key, index)
      local line = assert(input:read("l"), label .. " is missing from observations")
      local received_id, key, step, x, z = line:match("^([^\t]+)\t([^\t]+)\t(%d+)\t([^\t]+)\t([^\t]+)$")
      assert(received_id == id and key == fixture.key and tonumber(step) == index,
        label .. " received unexpected row " .. line)
      assert(coordinates_match(expected, tonumber(x), tonumber(z), fixture.limit),
        ("%s expected (%s, %s), got (%s, %s)"):format(label,
          number_text(expected[1]), number_text(expected[2]), x, z))
      if index == 1 and fixture.wrong and not controls[id] then
        assert(not coordinates_match(expected, fixture.wrong[1], fixture.wrong[2], fixture.limit),
          label .. " accepted its incorrect outcome")
        controls[id] = true
      end
      checkpoints = checkpoints + 1
    end
    counts[id] = (counts[id] or 0) + 1
  end
  assert(input:read("l") == nil, "Unexpected extra observation")
  assert(input:close())
  for _, case in ipairs(cases) do
    assert(controls[case.id], "Missing negative control for " .. case.id)
    print(("%s PASS %s (%d scenarios; incorrect outcome rejected)"):format(
      case.id, case.name, counts[case.id]))
  end
  print(("Lua campus movement: %d/%d passed, %d scenarios, %d checkpoints"):format(
    #cases, #cases, #fixtures, checkpoints))
end

local fixtures = make_fixtures()
if arg[1] == "fixtures" and #arg == 1 then
  emit(fixtures)
elseif arg[1] == "verify" and #arg == 2 then
  verify(fixtures, arg[2])
else
  error("Usage: movement-contracts.lua fixtures | verify OBSERVATIONS")
end
