# frozen_string_literal: true

require 'json'
require 'open3'

export = <<~JAVASCRIPT
  import { CAMPUS_NPCS, CAMPUS_QUESTS } from './shared/world.ts';

  console.log(JSON.stringify({ npcs: CAMPUS_NPCS, quests: CAMPUS_QUESTS }));
JAVASCRIPT

root = File.expand_path('../..', __dir__)
output, stderr, status = Open3.capture3(
  'node', '--input-type=module', '--eval', export, chdir: root
)
abort "Could not export the AlderVale quest catalog: #{stderr}" unless status.success?

output.force_encoding(Encoding::UTF_8)
abort 'Quest catalog export is not valid UTF-8' unless output.valid_encoding?

catalog = JSON.parse(output)
quests = catalog.fetch('quests')
npcs = catalog.fetch('npcs')
abort 'Quest catalog is empty' if quests.empty?

# Public quest reward contract. Review changes to these values alongside the
# quest descriptions and any reward changes recorded in GitHub issue #13.
expected_rewards = {
  'q_first_duel' => { 'rewardXp' => 90, 'rewardFlorins' => 110, 'rewardShards' => 3 },
  'q_bond_arbor' => { 'rewardXp' => 140, 'rewardFlorins' => 160, 'rewardShards' => 4 },
  'q_rare_trial' => { 'rewardXp' => 260, 'rewardFlorins' => 320, 'rewardShards' => 8 }
}.freeze

failures = []
quests_by_id = quests.group_by { |quest| quest.fetch('id') }
expected_rewards.each do |quest_id, expected|
  matches = quests_by_id.fetch(quest_id, [])
  if matches.size != 1
    failures << "#{quest_id}: expected exactly one quest, found #{matches.size}"
    next
  end

  actual = matches.first.slice(*expected.keys)
  failures << "#{quest_id}: expected #{expected.inspect}, got #{actual.inspect}" unless expected.eql?(actual)
end

npcs_by_name = npcs.group_by { |npc| npc.fetch('name') }
quests.each do |quest|
  id = quest.fetch('id')
  giver = quest.fetch('giverNpc')
  count = npcs_by_name.fetch(giver, []).length
  failures << "#{id}: expected one NPC named #{giver.inspect}, found #{count}" unless count == 1

  %w[title description giverNpc].each do |field|
    value = quest.fetch(field)
    if !value.is_a?(String) || value.strip.empty? || value.match?(/[\u0000-\u001F\u007F\uFFFD]/)
      failures << "#{id}: #{field} is empty or contains a control or replacement character"
    end
  end
end

abort failures.join("\n") unless failures.empty?

puts "PASS: #{quests.length} quest entries have usable text and an unambiguous giver among #{npcs.length} campus NPCs"

puts "PASS: G13-004 verified #{expected_rewards.size} published reward schedules"
