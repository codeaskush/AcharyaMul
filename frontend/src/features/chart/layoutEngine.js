/**
 * Family tree layout engine.
 *
 * Layout rules:
 * - 1 spouse: [male] ——— [female] (male left, female right)
 * - 2 spouses: [wife1] ——— [husband] ——— [wife2] (man in middle)
 * - Children of each marriage drop from that marriage's midpoint
 * - Children grouped by marriage_id, each group centered under its marriage line
 */

const NODE_W = 180;
const NODE_H = 70;
const H_GAP = 40;
const V_GAP = 120;
const COUPLE_GAP = 48;

export function buildLayout(persons, relationships, callbacks = {}) {
  if (!persons.length) return { nodes: [], edges: [], connectors: [], generationRows: [] };

  const personMap = {};
  persons.forEach(p => personMap[p.id] = p);

  const marriages = relationships.filter(r => r.type === 'marriage');
  const parentChild = relationships.filter(r => r.type === 'parent_child');

  // Build adjacency
  const spouseOf = {};
  marriages.forEach(m => {
    if (!spouseOf[m.person_a_id]) spouseOf[m.person_a_id] = [];
    if (!spouseOf[m.person_b_id]) spouseOf[m.person_b_id] = [];
    spouseOf[m.person_a_id].push({ spouseId: m.person_b_id, marriage: m });
    spouseOf[m.person_b_id].push({ spouseId: m.person_a_id, marriage: m });
  });

  const childrenOf = {};
  const hasParent = new Set();
  parentChild.forEach(r => {
    if (!childrenOf[r.person_a_id]) childrenOf[r.person_a_id] = [];
    childrenOf[r.person_a_id].push(r.person_b_id);
    hasParent.add(r.person_b_id);
  });

  // childId → marriage_id
  const childMarriageId = {};
  parentChild.forEach(pc => { childMarriageId[pc.person_b_id] = pc.marriage_id; });

  // Find roots
  const roots = persons.filter(p => {
    if (hasParent.has(p.id)) return false;
    const spouses = (spouseOf[p.id] || []).map(s => s.spouseId);
    return !spouses.some(sid => hasParent.has(sid));
  });
  if (roots.length === 0 && persons.length > 0) roots.push(persons[0]);

  // Build family units — one unit per family group (person + all spouses)
  const visited = new Set();
  const familyUnits = [];

  function buildUnits(personId, generation) {
    if (visited.has(personId)) return;
    visited.add(personId);

    const spouseEntries = spouseOf[personId] || [];
    const allSpouseIds = [];
    const unitMarriages = [];
    const allChildren = new Set(childrenOf[personId] || []);

    spouseEntries.forEach(({ spouseId, marriage }) => {
      if (!visited.has(spouseId)) {
        visited.add(spouseId);
        allSpouseIds.push(spouseId);
        unitMarriages.push(marriage);
        (childrenOf[spouseId] || []).forEach(cid => allChildren.add(cid));
      }
    });

    // Build members array based on spouse count
    let members;
    if (allSpouseIds.length === 0) {
      members = [personId];
    } else if (allSpouseIds.length === 1) {
      // 1 spouse: male left, female right
      const p = personMap[personId];
      const s = personMap[allSpouseIds[0]];
      members = orderSpouses(p, s).map(x => x.id);
    } else {
      // 2 spouses: [wife1, husband, wife2] — man in middle
      const p = personMap[personId];
      if (p.gender === 'male') {
        members = [allSpouseIds[0], personId, allSpouseIds[1]];
      } else {
        members = [allSpouseIds[0], allSpouseIds[1], personId];
      }
    }

    familyUnits.push({
      id: `unit-${personId}`,
      members,
      children: [...allChildren],
      generation,
      marriages: unitMarriages,
    });

    allChildren.forEach(cid => { if (!visited.has(cid)) buildUnits(cid, generation + 1); });
  }

  // Start from roots — prioritize persons with most spouses first
  // so the "hub" person (e.g. man with 2 wives) builds the unit, not a spouse
  const sortedRoots = [...roots].sort((a, b) => {
    const aSpouses = (spouseOf[a.id] || []).length;
    const bSpouses = (spouseOf[b.id] || []).length;
    return bSpouses - aSpouses; // most spouses first
  });
  sortedRoots.forEach(r => buildUnits(r.id, 0));
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

    // Place members in order (already arranged: [wife1, husband, wife2] or [male, female])
    unit.members.forEach((pid, idx) => {
      if (personPositions[pid]) return;
      const x = memberStartX + idx * (NODE_W + COUPLE_GAP);
      personPositions[pid] = { x, y };
      rfNodes.push({
        id: `p-${pid}`,
        type: 'personNode',
        position: { x, y },
        data: {
          person: personMap[pid],
          isPending: personMap[pid].status === 'pending',
          onViewDetails: callbacks.onViewDetails,
          onAddSpouse: callbacks.onAddSpouse,
          onAddChild: callbacks.onAddChild,
        },
      });
    });

    unitPositions[unit.id] = { x: startX, y, width: totalW };

    // Position children
    const childUnits = unit.children.map(cid =>
      familyUnits.find(u => u.members.includes(cid))
    ).filter(Boolean);
    const unique = [...new Map(childUnits.map(u => [u.id, u])).values()];

    if (unique.length > 0) {
      const childY = y + NODE_H + V_GAP;
      let childX = startX;

      unique.forEach(cu => {
        const cuW = getUnitWidth(cu);
        positionUnit(cu, childX, childY);
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

  // === CONNECTORS ===

  // Marriage lines + compute midpoints
  const marriageMidpoints = {};

  marriages.forEach(m => {
    const p1 = personPositions[m.person_a_id];
    const p2 = personPositions[m.person_b_id];
    if (!p1 || !p2) return;

    const leftX = Math.min(p1.x, p2.x);
    const rightX = Math.max(p1.x, p2.x);

    connectors.push({
      type: 'marriage',
      marriage_id: m.id,
      x1: leftX + NODE_W,
      y1: p1.y + NODE_H / 2,
      x2: rightX,
      y2: p2.y + NODE_H / 2,
      marriage_status: m.marriage_status,
    });

    marriageMidpoints[m.id] = {
      x: (leftX + NODE_W + rightX) / 2,
      y: p1.y + NODE_H / 2,
    };
  });

  // Parent-child connectors — drop from marriage midpoint or parent center
  parentChild.forEach(pc => {
    const childPos = personPositions[pc.person_b_id];
    const parentPos = personPositions[pc.person_a_id];
    if (!childPos || !parentPos) return;

    let dropX, dropY;

    if (pc.marriage_id && marriageMidpoints[pc.marriage_id]) {
      const mid = marriageMidpoints[pc.marriage_id];
      dropX = mid.x;
      dropY = mid.y;
    } else {
      dropX = parentPos.x + NODE_W / 2;
      dropY = parentPos.y + NODE_H;
    }

    connectors.push({
      type: 'parent-child',
      parentX: dropX,
      parentY: dropY,
      childX: childPos.x + NODE_W / 2,
      childY: childPos.y,
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

  return { nodes: rfNodes, edges: [], connectors, generationRows };
}

function orderSpouses(a, b) {
  if (a.gender === 'male' && b.gender === 'female') return [a, b];
  if (a.gender === 'female' && b.gender === 'male') return [b, a];
  return [a, b];
}
