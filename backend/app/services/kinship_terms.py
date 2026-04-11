"""
Nepali kinship terminology engine.

Maps relationship paths to culturally correct Nepali terms.
Uses path simplification to reduce long BFS paths into recognizable kinship patterns.

Path notation: sequence of steps from person A to person B.
Each step is one of: father, mother, spouse, son, daughter, brother, sister
"""

# === SIMPLIFICATION RULES ===
# Applied repeatedly until no more reductions possible.
# Each rule: (pattern_tuple, replacement_tuple)
# Order matters — more specific patterns first.

SIMPLIFICATION_RULES = [
    # Sibling recognition: parent → child (same parent) = sibling
    # father/mother → son = brother
    # father/mother → daughter = sister
    # These are already in the map, but needed for deeper simplification

    # Maternal uncle: mother → father → son = mama
    (("mother", "father", "son"), ("mama",)),
    # Maternal aunt: mother → father → daughter = maiju
    (("mother", "father", "daughter"), ("maiju",)),
    # Paternal uncle: father → father → son = kaka
    (("father", "father", "son"), ("kaka",)),
    # Paternal aunt: father → father → daughter = phupu
    (("father", "father", "daughter"), ("phupu",)),

    # Grandparent shortcuts
    (("father", "father"), ("grandfather_paternal",)),
    (("mother", "father"), ("grandfather_maternal",)),
    (("father", "mother"), ("grandmother_paternal",)),
    (("mother", "mother"), ("grandmother_maternal",)),

    # Sibling via parent
    (("father", "son"), ("brother",)),
    (("father", "daughter"), ("sister",)),
    (("mother", "son"), ("brother",)),
    (("mother", "daughter"), ("sister",)),

    # Uncle/aunt's child = cousin
    (("kaka", "son"), ("cousin_brother_paternal",)),
    (("kaka", "daughter"), ("cousin_sister_paternal",)),
    (("phupu", "son"), ("cousin_brother_paternal",)),
    (("phupu", "daughter"), ("cousin_sister_paternal",)),
    (("mama", "son"), ("cousin_brother_maternal",)),
    (("mama", "daughter"), ("cousin_sister_maternal",)),
    (("maiju", "son"), ("cousin_brother_maternal",)),
    (("maiju", "daughter"), ("cousin_sister_maternal",)),

    # Cousin's child = nephew/niece of sorts (bhanja/bhanji or bhatija/bhatiji)
    (("brother", "son"), ("nephew_brother",)),
    (("brother", "daughter"), ("niece_brother",)),
    (("sister", "son"), ("nephew_sister",)),
    (("sister", "daughter"), ("niece_sister",)),

    # Spouse shortcuts
    (("kaka", "spouse"), ("kaki",)),
    (("phupu", "spouse"), ("phupaju",)),
    (("mama", "spouse"), ("maiju_wife",)),

    # Grandchild
    (("son", "son"), ("grandson",)),
    (("son", "daughter"), ("granddaughter",)),
    (("daughter", "son"), ("grandson_d",)),
    (("daughter", "daughter"), ("granddaughter_d",)),

    # In-laws
    (("spouse", "father"), ("father_in_law",)),
    (("spouse", "mother"), ("mother_in_law",)),
    (("son", "spouse"), ("daughter_in_law",)),
    (("daughter", "spouse"), ("son_in_law",)),
    (("spouse", "brother"), ("brother_in_law",)),
    (("spouse", "sister"), ("sister_in_law",)),
]


# === FINAL TERM MAP ===
# Maps simplified path tokens (after all reductions) to (english, nepali)
TERM_MAP = {
    # Direct
    ("father",): ("Father", "बुवा"),
    ("mother",): ("Mother", "आमा"),
    ("son",): ("Son", "छोरा"),
    ("daughter",): ("Daughter", "छोरी"),
    ("spouse",): ("Spouse", "श्रीमान/श्रीमती"),
    ("brother",): ("Brother", "दाइ/भाइ"),
    ("sister",): ("Sister", "दिदी/बहिनी"),

    # Grandparents
    ("grandfather_paternal",): ("Paternal Grandfather", "हजुरबुवा"),
    ("grandfather_maternal",): ("Maternal Grandfather", "हजुरबुवा"),
    ("grandmother_paternal",): ("Paternal Grandmother", "हजुरआमा"),
    ("grandmother_maternal",): ("Maternal Grandmother", "हजुरआमा"),

    # Uncles & Aunts
    ("kaka",): ("Paternal Uncle", "काका/ठूलोबुवा"),
    ("phupu",): ("Paternal Aunt", "फुपू"),
    ("mama",): ("Maternal Uncle", "मामा"),
    ("maiju",): ("Maternal Aunt", "माइजू"),

    # Uncle/Aunt spouses
    ("kaki",): ("Paternal Uncle's Wife", "काकी"),
    ("phupaju",): ("Paternal Aunt's Husband", "फुपाजु"),
    ("maiju_wife",): ("Maternal Uncle's Wife", "माइजू"),

    # Cousins
    ("cousin_brother_paternal",): ("Paternal Cousin Brother", "भाइ/दाइ"),
    ("cousin_sister_paternal",): ("Paternal Cousin Sister", "बहिनी/दिदी"),
    ("cousin_brother_maternal",): ("Maternal Cousin Brother", "भाइ/दाइ"),
    ("cousin_sister_maternal",): ("Maternal Cousin Sister", "बहिनी/दिदी"),

    # Nephew/Niece
    ("nephew_brother",): ("Nephew (Brother's Son)", "भतिजा"),
    ("niece_brother",): ("Niece (Brother's Daughter)", "भतिजी"),
    ("nephew_sister",): ("Nephew (Sister's Son)", "भान्जा"),
    ("niece_sister",): ("Niece (Sister's Daughter)", "भान्जी"),

    # Grandchildren
    ("grandson",): ("Grandson", "नाति"),
    ("granddaughter",): ("Granddaughter", "नातिनी"),
    ("grandson_d",): ("Grandson (Daughter's)", "नाति"),
    ("granddaughter_d",): ("Granddaughter (Daughter's)", "नातिनी"),

    # In-laws
    ("father_in_law",): ("Father-in-law", "ससुरा"),
    ("mother_in_law",): ("Mother-in-law", "सासू"),
    ("daughter_in_law",): ("Daughter-in-law", "बुहारी"),
    ("son_in_law",): ("Son-in-law", "ज्वाइँ"),
    ("brother_in_law",): ("Brother-in-law", "साला/जेठाजु"),
    ("sister_in_law",): ("Sister-in-law", "साली"),

    # === COMPOUND TERMS (prefix + base) ===
    # Father's X
    ("father", "kaka"): ("Father's Paternal Uncle", "हजुरबुवाका काका"),
    ("father", "mama"): ("Father's Maternal Uncle", "हजुरबुवाका मामा"),
    ("father", "phupu"): ("Father's Paternal Aunt", "हजुरबुवाकी फुपू"),
    ("father", "brother"): ("Father's Brother", "काका/ठूलोबुवा"),
    ("father", "sister"): ("Father's Sister", "फुपू"),
    ("father", "cousin_brother_paternal"): ("Father's Paternal Cousin", "काका (cousin)"),
    ("father", "cousin_brother_maternal"): ("Father's Maternal Cousin", "काका (maternal cousin)"),
    ("father", "cousin_sister_paternal"): ("Father's Paternal Cousin Sister", "फुपू (cousin)"),
    ("father", "cousin_sister_maternal"): ("Father's Maternal Cousin Sister", "फुपू (maternal cousin)"),

    # Mother's X
    ("mother", "brother"): ("Maternal Uncle", "मामा"),
    ("mother", "sister"): ("Mother's Sister", "सानीआमा/ठूलीआमा"),
    ("mother", "kaka"): ("Mother's Paternal Uncle", "हजुरबुवाका काका"),
    ("mother", "mama"): ("Mother's Maternal Uncle", "हजुरबुवाका मामा"),

    # Father's cousin's son = cousin uncle
    ("father", "cousin_brother_paternal", "son"): ("Cousin Uncle's Son (Paternal)", "भाइ/दाइ"),
    ("father", "cousin_brother_maternal", "son"): ("Cousin Uncle's Son (Maternal)", "भाइ/दाइ"),

    # Self
    (): ("Self", "आफू"),
}


def simplify_path(steps):
    """
    Repeatedly apply simplification rules to reduce a raw BFS path
    into higher-level kinship tokens.

    Example: ['father', 'mother', 'father', 'son', 'son']
           → ['father', 'mama', 'son']        (after mama rule)
           → ['father', 'cousin_brother_maternal']  (after mama+son rule)
    """
    path = list(steps)
    changed = True
    max_iterations = 20  # safety limit

    while changed and max_iterations > 0:
        changed = False
        max_iterations -= 1

        for pattern, replacement in SIMPLIFICATION_RULES:
            plen = len(pattern)
            i = 0
            while i <= len(path) - plen:
                if tuple(path[i:i + plen]) == pattern:
                    path = path[:i] + list(replacement) + path[i + plen:]
                    changed = True
                    break  # restart after each replacement
                i += 1
            if changed:
                break

    return path


def get_kinship_term(path_steps):
    """
    Given a list of raw relationship steps, simplify and return (english, nepali) kinship terms.
    """
    if not path_steps:
        return ("Self", "आफू")

    # Simplify the path
    simplified = simplify_path(path_steps)
    key = tuple(simplified)

    # Exact match in term map
    if key in TERM_MAP:
        return TERM_MAP[key]

    # Try progressively shorter suffixes (for compound terms)
    # e.g., if ('father', 'cousin_brother_maternal') not found, try just ('cousin_brother_maternal',)
    for start in range(len(simplified)):
        suffix = tuple(simplified[start:])
        if suffix in TERM_MAP:
            # Build prefix description
            prefix_parts = []
            for token in simplified[:start]:
                if token in _TOKEN_LABELS:
                    prefix_parts.append(_TOKEN_LABELS[token] + "'s")
                else:
                    prefix_parts.append(token.replace('_', ' ').title() + "'s")

            eng, nep = TERM_MAP[suffix]
            if prefix_parts:
                prefix = " ".join(prefix_parts)
                return (f"{prefix} {eng}", f"{prefix} {nep}")
            return (eng, nep)

    # Fallback: build descriptive term from simplified tokens
    parts = []
    for token in simplified:
        label = _TOKEN_LABELS.get(token, token.replace('_', ' ').title())
        parts.append(label)

    english = "'s ".join(parts)
    return (english, english)


# Human-readable labels for simplified tokens
_TOKEN_LABELS = {
    "father": "Father",
    "mother": "Mother",
    "son": "Son",
    "daughter": "Daughter",
    "spouse": "Spouse",
    "brother": "Brother",
    "sister": "Sister",
    "kaka": "Paternal Uncle (काका)",
    "phupu": "Paternal Aunt (फुपू)",
    "mama": "Maternal Uncle (मामा)",
    "maiju": "Maternal Aunt (माइजू)",
    "kaki": "Uncle's Wife (काकी)",
    "phupaju": "Aunt's Husband (फुपाजु)",
    "cousin_brother_paternal": "Paternal Cousin Brother",
    "cousin_sister_paternal": "Paternal Cousin Sister",
    "cousin_brother_maternal": "Maternal Cousin Brother",
    "cousin_sister_maternal": "Maternal Cousin Sister",
    "nephew_brother": "Nephew (भतिजा)",
    "niece_brother": "Niece (भतिजी)",
    "nephew_sister": "Nephew (भान्जा)",
    "niece_sister": "Niece (भान्जी)",
    "grandfather_paternal": "Paternal Grandfather",
    "grandfather_maternal": "Maternal Grandfather",
    "grandmother_paternal": "Paternal Grandmother",
    "grandmother_maternal": "Maternal Grandmother",
    "grandson": "Grandson",
    "granddaughter": "Granddaughter",
    "father_in_law": "Father-in-law",
    "mother_in_law": "Mother-in-law",
    "daughter_in_law": "Daughter-in-law",
    "son_in_law": "Son-in-law",
    "brother_in_law": "Brother-in-law",
    "sister_in_law": "Sister-in-law",
}
