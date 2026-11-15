import React from 'react';
import { CAMPUS_NPCS, CAMPUS_QUESTS, ZONES, type ZoneId } from '../../../shared/world.ts';
import { RESOURCES, type ResourceId } from '../../../shared/economy.ts';
import type { LivePlayerPresence } from '../../../server/wsHub.ts';

interface MmoMinimapProps {
  zone: ZoneId;
  playerPos: { x: number; z: number; rotY: number };
  remotePlayers: LivePlayerPresence[];
  completedQuestIds: string[];
  onOpenWorldMap: () => void;
}

const QUEST_GIVER_BY_NPC_NAME: Record<string, string> = {};
for (const q of CAMPUS_QUESTS) {
  QUEST_GIVER_BY_NPC_NAME[q.giverNpc] = q.id;
}

const PORTALS_BY_ZONE: Record<ZoneId, { x: number; z: number; color: string; label: string }[]> = {
  hub: [
    { x: -13, z: 12, color: '#ff6e42', label: 'Amphitheater' },
    { x: 13, z: 12, color: '#5cd66c', label: 'Arbor' },
    { x: 0, z: -17, color: '#ffbe4d', label: 'Sanctuary' },
  ],
  amphitheater: [{ x: 0, z: 17.5, color: '#38a3a5', label: 'Commons' }],
  arbor: [{ x: -11, z: 14.5, color: '#38a3a5', label: 'Commons' }],
  sanctuary: [{ x: 0, z: 11.2, color: '#38a3a5', label: 'Commons' }],
};

export const MmoMinimap: React.FC<MmoMinimapProps> = ({
  zone,
  playerPos,
  remotePlayers,
  completedQuestIds,
  onOpenWorldMap,
}) => {
  const islandRadius = zone === 'sanctuary' ? 14 : 24;
  const mapRadiusPx = 56;
  const center = 72;

  const toSvg = (wx: number, wz: number) => {
    const scale = mapRadiusPx / islandRadius;
    return {
      cx: center + wx * scale,
      cy: center + wz * scale,
    };
  };

  const pSvg = toSvg(playerPos.x, playerPos.z);
  const arrowDeg = 180 - (playerPos.rotY * 180) / Math.PI;
  const zoneNpcs = CAMPUS_NPCS.filter((n) => n.zone === zone);
  const portals = PORTALS_BY_ZONE[zone];

  const resourceNodes =
    zone === 'hub' || zone === 'arbor'
      ? (Object.keys(RESOURCES) as ResourceId[]).map((rId, idx) => {
          const ang = idx * 1.25 + 0.6;
          return {
            id: rId,
            color: RESOURCES[rId].colorHex,
            ...toSvg(Math.cos(ang) * 14.8, Math.sin(ang) * 14.8),
          };
        })
      : [];

  return (
    <div className="pointer-events-auto flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onOpenWorldMap}
        title="Open Waystone Campus Map"
        className="storybook-dark-panel group relative rounded-full p-1.5 transition-transform hover:scale-[1.02]"
      >
        <svg width={144} height={144} viewBox="0 0 144 144" className="block">
          {/* Outer Compass Ring */}
          <circle cx={center} cy={center} r={66} fill="#162036" stroke="#d4a13e" strokeOpacity={0.55} strokeWidth={1.5} />
          <circle cx={center} cy={center} r={mapRadiusPx} fill={zone === 'sanctuary' ? '#3a324d' : zone === 'amphitheater' ? '#49423a' : '#26443f'} stroke="#7de2d1" strokeOpacity={0.3} strokeWidth={1} />

          {/* Plaza / Ring Landmark */}
          {zone === 'hub' && (
            <>
              <circle cx={center} cy={center} r={(11.4 / islandRadius) * mapRadiusPx} fill="#5b5347" fillOpacity={0.65} stroke="#d7c7a9" strokeOpacity={0.35} strokeWidth={1} />
              <circle cx={center} cy={center + (1 / islandRadius) * mapRadiusPx} r={3.5} fill="#8ef0ff" />
            </>
          )}
          {zone === 'amphitheater' && (
            <circle cx={center} cy={center} r={(6.8 / islandRadius) * mapRadiusPx} fill="none" stroke="#ffb554" strokeWidth={2} strokeOpacity={0.75} />
          )}
          {zone === 'arbor' && (
            <>
              <circle cx={center} cy={center - (4.5 / islandRadius) * mapRadiusPx} r={(5.5 / islandRadius) * mapRadiusPx} fill="#467a73" fillOpacity={0.5} stroke="#b7f2e3" strokeOpacity={0.55} strokeWidth={1} />
              <rect
                x={center + (8.8 / islandRadius) * mapRadiusPx}
                y={center + (0.3 / islandRadius) * mapRadiusPx}
                width={(4.4 / islandRadius) * mapRadiusPx}
                height={(9.8 / islandRadius) * mapRadiusPx}
                rx={1.5}
                fill="#8d5f3c"
                stroke="#d4a13e"
                strokeWidth={0.6}
              />
            </>
          )}

          {/* Compass Cardinal Letters */}
          <text x={center} y={11} textAnchor="middle" fill="#f4c98b" fontSize="8" fontWeight="bold">N</text>
          <text x={center} y={139} textAnchor="middle" fill="#b7c2d6" fontSize="7" fontWeight="bold">S</text>
          <text x={9} y={center + 2.5} textAnchor="middle" fill="#b7c2d6" fontSize="7" fontWeight="bold">W</text>
          <text x={135} y={center + 2.5} textAnchor="middle" fill="#b7c2d6" fontSize="7" fontWeight="bold">E</text>

          {/* Resource Nodes */}
          {resourceNodes.map((node) => (
            <rect
              key={node.id}
              x={node.cx - 2.2}
              y={node.cy - 2.2}
              width={4.4}
              height={4.4}
              transform={`rotate(45 ${node.cx} ${node.cy})`}
              fill={node.color}
              stroke="#121829"
              strokeWidth={0.6}
            />
          ))}

          {/* Portals */}
          {portals.map((pt, i) => (
            <g key={i} transform={`translate(${toSvg(pt.x, pt.z).cx}, ${toSvg(pt.x, pt.z).cy})`}>
              <circle r={4.5} fill={pt.color} fillOpacity={0.28} />
              <polygon points="0,-4 3.5,0 0,4 -3.5,0" fill={pt.color} stroke="#ffffff" strokeWidth={0.8} />
            </g>
          ))}

          {/* NPCs + Gold Quest Markers */}
          {zoneNpcs.map((npc) => {
            const pos = toSvg(npc.position[0], npc.position[2]);
            const qId = QUEST_GIVER_BY_NPC_NAME[npc.name];
            const hasQuest = Boolean(qId && !completedQuestIds.includes(qId));
            return (
              <g key={npc.id} transform={`translate(${pos.cx}, ${pos.cy})`}>
                <circle r={3.4} fill={hasQuest ? '#ffd166' : '#f7f0e2'} stroke="#1b2338" strokeWidth={1} />
                {hasQuest && (
                  <text y={-5} textAnchor="middle" fill="#ffd166" fontSize="9" fontWeight="900">!</text>
                )}
              </g>
            );
          })}

          {/* Remote Players in Zone */}
          {remotePlayers.map((rp) => {
            const pos = toSvg(rp.x, rp.z);
            return (
              <circle
                key={rp.sessionId}
                cx={pos.cx}
                cy={pos.cy}
                r={3.2}
                fill={rp.inDuel ? '#ff8a4c' : '#6fffe9'}
                stroke="#0f172a"
                strokeWidth={1}
              />
            );
          })}

          {/* Local Player Directional Chevron */}
          <g transform={`translate(${pSvg.cx}, ${pSvg.cy}) rotate(${arrowDeg})`}>
            <polygon points="0,-6 4.4,4.5 0,2.2 -4.4,4.5" fill="#ffffff" stroke="#d9532f" strokeWidth={1.3} />
          </g>
        </svg>
      </button>

      <div className="storybook-dark-panel rounded-xl px-2.5 py-1 text-[10px] font-mono-num text-[#e2d8c5] flex items-center gap-2">
        <span>{ZONES[zone].name.split(' ')[0]}</span>
        <span className="text-[#6fffe9]">{remotePlayers.length + 1} Online</span>
        <span className="opacity-75">
          ({Math.round(playerPos.x)}, {Math.round(playerPos.z)})
        </span>
      </div>
    </div>
  );
};
