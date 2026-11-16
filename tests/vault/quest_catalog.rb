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

failures = []
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
