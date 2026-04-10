/**
 * Family tree layout engine — adapted from reference implementation.
 * Uses top-down recursive positioning with bottom-up width calculation.
 *
 * Outputs:
 * - nodes: React Flow nodes for persons
 * - edges: React Flow edges for marriage lines only
 * - connectors: Raw SVG connector data for parent-child lines (drawn as overlay)
 * - generationRows: Generation label data
 */

const NODE_W = 180;
const NODE_H = 70;
const H_GAP = 40;
const V_GAP = 120;
const COUPLE_GAP = 48;

export function buildLayout(persons, relationships) {
  if (!persons.length) return { nodes: [], edges: [], connectors: [], generationRows: [] };

  const personMap = {};
  persons.forEach(p => personMap[p.id] = p);

  const marriages = relationships.filter(r => r.type === 'marriage');
  const parentChild = relationships.filter(r => r.type === 'parent_child');

  // Build adjacency
  const spouseOf = {};
  const marriageOf = {};
  marriages.forEach(m => {
    if (!spouseOf[m.person_a_id]) spouseOf[m.person_a_id] = [];
    if (!spouseOf[m.person_b_id]) spouseOf[m.person_b_id] = [];
    spouseOf[m.person_a_id].push({ spouseId: m.person_b_id, marriage: m });
    spouseOf[m.person_b_id].push({ spouseId: m.person_a_id, marriage: m });
    marriageOf[m.person_a_id] = m;
    marriageOf[m.person_b_id] = m;
  });

  const childrenOf = {};
  const hasParent = new Set();
  parentChild.forEach(r => {
    if (!childrenOf[r.person_a_id]) childrenOf[r.person_a_id] = [];
    childrenOf[r.person_a_id].push(r.person_b_id);
    hasParent.add(r.person_b_id);
  });

  // Find roots (no parents, and spouse also has no parents)
  const roots = persons.filter(p => {
    if (hasParent.has(p.id)) return false;
    const spouses = (spouseOf[p.id] || []).map(s => s.spouseId);
    return !spouses.some(sid => hasParent.has(sid));
  });
  if (roots.length === 0 && persons.length > 0) roots.push(persons[0]);

  // Build family units
  const visited = new Set();
  const familyUnits = [];

  function buildUnits(personId, generation) {
    if (visited.has(personId)) return;
    visited.add(personId);

    const spouseEntries = spouseOf[personId] || [];

    if (spouseEntries.length === 0) {
      const myChildren = [...new Set(childrenOf[personId] || [])];
      familyUnits.push({
        id: `unit-${personId}`,
        members: [personId],
        children: myChildren,
        generation,
        marriage: null,
      });
      myChildren.forEach(cid => { if (!visited.has(cid)) buildUnits(cid, generation + 1); });
    } else {
      spouseEntries.forEach(({ spouseId, marriage }) => {
        if (visited.has(spouseId)) return;
        visited.add(spouseId);

        const p1Kids = new Set(childrenOf[personId] || []);
        const p2Kids = new Set(childrenOf[spouseId] || []);
        const coupleChildren = [...new Set([...p1Kids, ...p2Kids])];

        familyUnits.push({
          id: `unit-m-${marriage.id}`,
          members: [personId, spouseId],
          children: coupleChildren,
          generation,
          marriage,
        });

        coupleChildren.forEach(cid => { if (!visited.has(cid)) buildUnits(cid, generation + 1); });
      });
    }
  }

  roots.forEach(r => buildUnits(r.id, 0));
  persons.forEach(p => { if (!visited.has(p.id)) buildUnits(p.id, 0); });

  // Compute unit widths bottom-up
  function getUnitWidth(unit) {
    const memberW = unit.members.length * NODE_W + (unit.members.length - 1) * COUPLE_GAP;

    const childUnits = unit.children.map(cid =>
      familyUnits.find(u => u.members.includes(cid))
    ).filter(Boolean);
    const unique = [...new Map(childUnits.map(u => [u.id, u])).values()];

    let childrenW = 0;
    unique.forEach((cu, i) => {
      childrenW += getUnitWidth(cu);
      if (i < unique.length - 1) childrenW += H_GAP;
    });

    return Math.max(memberW, childrenW);
  }

  // Position units top-down
  const personPositions = {};
  const unitPositions = {};
  const rfNodes = [];
  const connectors = [];

  function positionUnit(unit, startX, y) {
    if (unitPositions[unit.id]) return;

    const memberW = unit.members.length * NODE_W + (unit.members.length - 1) * COUPLE_GAP;
    const totalW = getUnitWidth(unit);
    const memberStartX = startX + (totalW - memberW) / 2;

    // Order spouses: male left, female right
    const ordered = unit.members.length === 2
      ? orderSpouses(personMap[unit.members[0]], personMap[unit.members[1]]).map(p => p.id)
      : unit.members;

    ordered.forEach((pid, idx) => {
      if (personPositions[pid]) return;
      const x = memberStartX + idx * (NODE_W + COUPLE_GAP);
      personPositions[pid] = { x, y };
      rfNodes.push({
        id: `p-${pid}`,
        type: 'personNode',
        position: { x, y },
        data: { person: personMap[pid], isPending: personMap[pid].status === 'pending' },
      });
    });

    unitPositions[unit.id] = { x: startX, y, width: totalW };

    // Position children
    const childUnits = unit.children.map(cid =>
      familyUnits.find(u => u.members.includes(cid))
    ).filter(Boolean);
    const unique = [...new Map(childUnits.map(u => [u.id, u])).values()];

    if (unique.length > 0) {
      // Parent connection point (center of couple or single)
      let parentCenterX;
      if (ordered.length === 2) {
        const p1 = personPositions[ordered[0]];
        const p2 = personPositions[ordered[1]];
        parentCenterX = (p1.x + NODE_W + p2.x) / 2;
      } else {
        parentCenterX = personPositions[ordered[0]].x + NODE_W / 2;
      }
      // Start from marriage line level for couples, bottom of node for singles
      const parentBottomY = ordered.length === 2 ? y + NODE_H / 2 : y + NODE_H;

      let childX = startX;
      const childY = y + NODE_H + V_GAP;

      unique.forEach(cu => {
        const cuW = getUnitWidth(cu);
        positionUnit(cu, childX, childY);

        // Find the actual child person in this unit (the one in our children list)
        const actualChildId = cu.members.find(mid => unit.children.includes(mid)) || cu.members[0];
        const actualChildPos = personPositions[actualChildId];

        if (actualChildPos) {
          connectors.push({
            type: 'parent-child',
            parentX: parentCenterX,
            parentY: parentBottomY,
            childX: actualChildPos.x + NODE_W / 2,  // center of the actual child node
            childY: actualChildPos.y,                 // top edge of the actual child node
          });
        }

        childX += cuW + H_GAP;
      });
    }
  }

  // Position roots
  let rootX = 50;
  const rootGenUnits = familyUnits.filter(u => u.generation === 0);
  rootGenUnits.forEach(unit => {
    if (!unitPositions[unit.id]) {
      const w = getUnitWidth(unit);
      positionUnit(unit, rootX, 50);
      rootX += w + H_GAP * 2;
    }
  });

  // Marriage edges (React Flow handles these)
  const rfEdges = [];
  marriages.forEach(m => {
    const pA = personMap[m.person_a_id];
    const pB = personMap[m.person_b_id];
    if (!personPositions[pA.id] || !personPositions[pB.id]) return;
    const [left, right] = orderSpouses(pA, pB);

    // Marriage connector data for SVG overlay
    const p1 = personPositions[left.id];
    const p2 = personPositions[right.id];
    connectors.push({
      type: 'marriage',
      x1: p1.x + NODE_W,
      y1: p1.y + NODE_H / 2,
      x2: p2.x,
      y2: p2.y + NODE_H / 2,
      marriage_status: m.marriage_status,
    });
  });

  // Generation rows
  const genMap = {};
  rfNodes.forEach(n => {
    const gen = n.data.person.generation || 1;
    if (!genMap[gen]) genMap[gen] = [];
    genMap[gen].push(n.position.y);
  });

  let minX = Infinity, maxX = -Infinity;
  rfNodes.forEach(n => {
    minX = Math.min(minX, n.position.x);
    maxX = Math.max(maxX, n.position.x + NODE_W);
  });

  const sortedGens = Object.keys(genMap).map(Number).sort((a, b) => a - b);
  const globalMinX = minX - 100;
  const globalMaxX = maxX + 100;

  const generationRows = sortedGens.map((g) => ({
    generation: g,
    y: Math.min(...genMap[g]),
    minX: globalMinX,
    maxX: globalMaxX,
  }));

  return { nodes: rfNodes, edges: rfEdges, connectors, generationRows };
}

function orderSpouses(a, b) {
  if (a.gender === 'male' && b.gender === 'female') return [a, b];
  if (a.gender === 'female' && b.gender === 'male') return [b, a];
  return [a, b];
}
