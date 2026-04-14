/**
 * Horizontal family tree layout — progressive disclosure.
 *
 * - Only Gen 1 visible initially
 * - Each couple has a [+] button to reveal THEIR children
 * - Children grouped by parent couple (not mixed alphabetically)
 * - Layout: left to right, each generation is a column
 * - Spouses stacked vertically (husband above wife)
 *
 * Returns a tree structure that the renderer expands interactively.
 */

const NODE_W = 180;
const NODE_H = 60;
const V_GAP = 24;
const COUPLE_GAP = 30;
const GEN_GAP_X = 220;

export function buildHorizontalLayout(persons, relationships, expandedFamilies = new Set()) {
  if (!persons.length) return { nodes: [], connectors: [], familyTree: [], NODE_W, NODE_H };

  const personMap = {};
  persons.forEach(p => personMap[p.id] = p);

  const marriages = relationships.filter(r => r.type === 'marriage');
  const parentChild = relationships.filter(r => r.type === 'parent_child');

  // Build adjacency
  const spouseOf = {};
  const marriageById = {};
  marriages.forEach(m => {
    marriageById[m.id] = m;
    if (!spouseOf[m.person_a_id]) spouseOf[m.person_a_id] = [];
    if (!spouseOf[m.person_b_id]) spouseOf[m.person_b_id] = [];
    spouseOf[m.person_a_id].push({ spouseId: m.person_b_id, marriage: m });
    spouseOf[m.person_b_id].push({ spouseId: m.person_a_id, marriage: m });
  });

  const childrenOfParent = {};
  const hasParent = new Set();
  parentChild.forEach(r => {
    if (!childrenOfParent[r.person_a_id]) childrenOfParent[r.person_a_id] = [];
    childrenOfParent[r.person_a_id].push({ childId: r.person_b_id, marriageId: r.marriage_id });
    hasParent.add(r.person_b_id);
  });

  // Build family tree structure
  // A "family" = a couple (or single person) + their children grouped by marriage
  const visited = new Set();

  function buildFamily(personId) {
    if (visited.has(personId)) return null;
    visited.add(personId);

    const person = personMap[personId];
    if (!person) return null;

    const spouseEntries = spouseOf[personId] || [];
    const spouses = [];

    spouseEntries.forEach(({ spouseId, marriage }) => {
      if (!visited.has(spouseId)) {
        visited.add(spouseId);
        spouses.push({ person: personMap[spouseId], marriage });
      }
    });

    // Collect children grouped by marriage
    const childGroups = []; // [{marriageId, marriage, children: [family]}]
    const allChildIds = new Set();

    // From this person's children
    (childrenOfParent[personId] || []).forEach(({ childId, marriageId }) => {
      allChildIds.add(childId);
    });

    // From spouse's children
    spouses.forEach(s => {
      (childrenOfParent[s.person.id] || []).forEach(({ childId, marriageId }) => {
        allChildIds.add(childId);
      });
    });

    // Group by marriageId
    const childByMarriage = {};
    const allPcRels = [...(childrenOfParent[personId] || [])];
    spouses.forEach(s => {
      (childrenOfParent[s.person.id] || []).forEach(r => allPcRels.push(r));
    });

    allPcRels.forEach(({ childId, marriageId }) => {
      const mKey = marriageId || 'none';
      if (!childByMarriage[mKey]) childByMarriage[mKey] = new Set();
      childByMarriage[mKey].add(childId);
    });

    Object.entries(childByMarriage).forEach(([mKey, childIds]) => {
      const childFamilies = [];
      [...childIds].forEach(cid => {
        if (!visited.has(cid)) {
          const cf = buildFamily(cid);
          if (cf) childFamilies.push(cf);
        }
      });

      if (childFamilies.length > 0) {
        childGroups.push({
          marriageId: mKey === 'none' ? null : parseInt(mKey),
          children: childFamilies,
        });
      }
    });

    // Family key for expand/collapse tracking
    const familyKey = `family-${personId}`;
    const hasChildren = childGroups.some(g => g.children.length > 0);

    return {
      key: familyKey,
      primary: person,
      spouses,
      childGroups,
      hasChildren,
    };
  }

  // Find roots
  const roots = persons.filter(p => {
    if (hasParent.has(p.id)) return false;
    const sp = (spouseOf[p.id] || []).map(s => s.spouseId);
    return !sp.some(sid => hasParent.has(sid));
  }).sort((a, b) => (spouseOf[b.id]?.length || 0) - (spouseOf[a.id]?.length || 0));

  if (roots.length === 0 && persons.length > 0) roots.push(persons[0]);

  const familyTree = [];
  roots.forEach(r => {
    const f = buildFamily(r.id);
    if (f) familyTree.push(f);
  });
  // Catch any unvisited
  persons.forEach(p => {
    if (!visited.has(p.id)) {
      const f = buildFamily(p.id);
      if (f) familyTree.push(f);
    }
  });

  // === POSITIONING ===
  // Recursively position families. Only render children if family is expanded.
  const nodes = [];
  const connectors = [];
  const expandButtons = []; // [{x, y, familyKey, expanded, childCount}]

  let globalY = 50;

  function positionFamily(family, genColumn) {
    const x = 50 + genColumn * (NODE_W + GEN_GAP_X);
    const startY = globalY;

    // Primary person
    const primaryNode = {
      id: `p-${family.primary.id}`,
      person: family.primary,
      x, y: globalY,
      isPending: family.primary.status === 'pending',
    };
    nodes.push(primaryNode);
    const primaryPos = { x, y: globalY };
    globalY += NODE_H + COUPLE_GAP;

    // Spouses (stacked below primary)
    const spousePositions = [];
    family.spouses.forEach(s => {
      const sp = { x, y: globalY };
      spousePositions.push({ ...sp, marriage: s.marriage, person: s.person });
      nodes.push({
        id: `p-${s.person.id}`,
        person: s.person,
        x, y: globalY,
        isPending: s.person.status === 'pending',
      });
      globalY += NODE_H + COUPLE_GAP;

      // Marriage connector (vertical between primary and this spouse)
      connectors.push({
        type: 'marriage',
        marriage_id: s.marriage.id,
        x1: primaryPos.x + NODE_W / 2,
        y1: primaryPos.y + NODE_H,
        x2: sp.x + NODE_W / 2,
        y2: sp.y,
        marriage_status: s.marriage.marriage_status,
      });
    });

    globalY = globalY - COUPLE_GAP + V_GAP;

    // Expand button + children
    const isExpanded = expandedFamilies.has(family.key);
    const totalChildren = family.childGroups.reduce((sum, g) => sum + g.children.length, 0);

    if (family.hasChildren) {
      // Position expand button at the right edge of the couple, vertically centered
      const coupleTopY = primaryPos.y;
      const coupleBottomY = spousePositions.length > 0
        ? spousePositions[spousePositions.length - 1].y + NODE_H
        : primaryPos.y + NODE_H;
      const buttonY = (coupleTopY + coupleBottomY) / 2;

      expandButtons.push({
        x: x + NODE_W + 8,
        y: buttonY,
        familyKey: family.key,
        expanded: isExpanded,
        childCount: totalChildren,
      });

      if (isExpanded) {
        // Position children in next column, grouped by marriage
        family.childGroups.forEach(group => {
          // Marriage midpoint for connector source
          let sourceX = primaryPos.x + NODE_W;
          let sourceY;

          if (group.marriageId && spousePositions.length > 0) {
            const sp = spousePositions.find(s => s.marriage.id === group.marriageId);
            if (sp) {
              sourceY = (primaryPos.y + sp.y + NODE_H) / 2;
            } else {
              sourceY = primaryPos.y + NODE_H / 2;
            }
          } else {
            sourceY = primaryPos.y + NODE_H / 2;
          }

          group.children.forEach(childFamily => {
            const childStartY = globalY;
            positionFamily(childFamily, genColumn + 1);

            // Find the child primary node position
            const childNode = nodes.find(n => n.id === `p-${childFamily.primary.id}`);
            if (childNode) {
              // Calculate the vertical center of the child family block
              const childCenterY = childNode.y + NODE_H / 2;

              connectors.push({
                type: 'parent-child',
                sourceX,
                sourceY,
                targetX: childNode.x,
                targetY: childCenterY,
              });
            }
          });
        });
      }
    }
  }

  familyTree.forEach(family => {
    positionFamily(family, 0);
  });

  return { nodes, connectors, expandButtons, familyTree, NODE_W, NODE_H };
}
