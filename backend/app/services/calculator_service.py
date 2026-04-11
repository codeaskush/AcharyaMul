"""
Relationship calculator — finds the path between two persons
by traversing marriage + parent-child links using BFS.

Returns the relationship chain and kinship terms (English + Nepali).
"""
from collections import deque

from sqlalchemy.orm import Session

from app.models.person import Person
from app.models.relationship import Relationship
from app.models.enums import RelationshipType
from app.services.kinship_terms import get_kinship_term, simplify_path


def find_relationship(db: Session, from_id: int, to_id: int):
    """
    BFS from person `from_id` to person `to_id`.
    Returns path with relationship steps and kinship terms.
    """
    if from_id == to_id:
        return {"path": [], "english": "Self", "nepali": "आफू", "chain": "You"}

    # Build adjacency graph from all relationships
    relationships = db.query(Relationship).all()
    persons = {p.id: p for p in db.query(Person).all()}

    # adjacency: person_id -> [(neighbor_id, step_type, rel)]
    adj = {}

    for r in relationships:
        if r.type == RelationshipType.marriage:
            # Bidirectional: spouse
            _add_edge(adj, r.person_a_id, r.person_b_id, "spouse", r)
            _add_edge(adj, r.person_b_id, r.person_a_id, "spouse", r)
        elif r.type == RelationshipType.parent_child:
            # person_a is parent, person_b is child
            parent = persons.get(r.person_a_id)
            child = persons.get(r.person_b_id)
            if parent and child:
                # Parent → Child: step is "son" or "daughter"
                child_step = "son" if child.gender.value == "male" else "daughter"
                _add_edge(adj, r.person_a_id, r.person_b_id, child_step, r)

                # Child → Parent: step is "father" or "mother"
                parent_step = "father" if parent.gender.value == "male" else "mother"
                _add_edge(adj, r.person_b_id, r.person_a_id, parent_step, r)

    # BFS
    queue = deque()
    queue.append((from_id, []))  # (current_person, path_so_far)
    visited = {from_id}

    while queue:
        current, path = queue.popleft()

        for neighbor_id, step_type, rel in adj.get(current, []):
            if neighbor_id in visited:
                continue

            new_path = path + [{
                "person_id": neighbor_id,
                "person_name": _person_name(persons.get(neighbor_id)),
                "step": step_type,
            }]

            if neighbor_id == to_id:
                # Found! Compute kinship terms
                steps = [s["step"] for s in new_path]
                english, nepali = get_kinship_term(steps)

                # Build readable chain
                chain_parts = [_person_name(persons.get(from_id))]
                for s in new_path:
                    chain_parts.append(f"→ ({s['step']}) {s['person_name']}")
                chain = " ".join(chain_parts)

                simplified = simplify_path(steps)

                return {
                    "path": new_path,
                    "steps": steps,
                    "simplified": simplified,
                    "english": english,
                    "nepali": nepali,
                    "chain": chain,
                }

            visited.add(neighbor_id)
            queue.append((neighbor_id, new_path))

    return {"path": [], "english": "No relation found", "nepali": "कुनै सम्बन्ध भेटिएन", "chain": ""}


def get_step_options(db: Session, from_id: int, relation: str):
    """
    For the path builder: given a person and a relation type,
    return all matching persons.
    """
    relationships = db.query(Relationship).all()
    persons = {p.id: p for p in db.query(Person).all()}

    results = []

    for r in relationships:
        if r.type == RelationshipType.marriage and relation == "spouse":
            if r.person_a_id == from_id:
                results.append(_person_summary(persons.get(r.person_b_id)))
            elif r.person_b_id == from_id:
                results.append(_person_summary(persons.get(r.person_a_id)))

        elif r.type == RelationshipType.parent_child:
            parent = persons.get(r.person_a_id)
            child = persons.get(r.person_b_id)

            if relation == "father" and r.person_b_id == from_id and parent and parent.gender.value == "male":
                results.append(_person_summary(parent))
            elif relation == "mother" and r.person_b_id == from_id and parent and parent.gender.value == "female":
                results.append(_person_summary(parent))
            elif relation == "son" and r.person_a_id == from_id and child and child.gender.value == "male":
                results.append(_person_summary(child))
            elif relation == "daughter" and r.person_a_id == from_id and child and child.gender.value == "female":
                results.append(_person_summary(child))
            elif relation == "child" and r.person_a_id == from_id and child:
                results.append(_person_summary(child))

    # Siblings: find persons sharing a parent
    if relation in ("brother", "sister"):
        # Find parents of from_id
        parent_ids = set()
        for r in relationships:
            if r.type == RelationshipType.parent_child and r.person_b_id == from_id:
                parent_ids.add(r.person_a_id)

        # Find other children of those parents
        for r in relationships:
            if r.type == RelationshipType.parent_child and r.person_a_id in parent_ids and r.person_b_id != from_id:
                sibling = persons.get(r.person_b_id)
                if sibling:
                    if relation == "brother" and sibling.gender.value == "male":
                        results.append(_person_summary(sibling))
                    elif relation == "sister" and sibling.gender.value == "female":
                        results.append(_person_summary(sibling))

    # Deduplicate
    seen = set()
    unique = []
    for r in results:
        if r and r["id"] not in seen:
            seen.add(r["id"])
            unique.append(r)

    return unique


def _add_edge(adj, from_id, to_id, step, rel):
    if from_id not in adj:
        adj[from_id] = []
    adj[from_id].append((to_id, step, rel))


def _person_name(person):
    if not person:
        return "Unknown"
    return f"{person.first_name} {person.last_name or ''}".strip()


def _person_summary(person):
    if not person:
        return None
    return {
        "id": person.id,
        "first_name": person.first_name,
        "last_name": person.last_name,
        "gender": person.gender.value,
        "generation": person.generation,
    }
