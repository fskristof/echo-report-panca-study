"""
Hungarian number words -> digits.

    "negyvennyolc"               -> "48"
    "egy egész harminchárom"     -> "1,33"
    "kétszázhuszonöt"            -> "225"
    "kettes-hármas"              -> "2-3"
    "1 kötőjel 2"                -> "1-2"
    "1.8"                        -> "1,8"   (Whisper sometimes writes a decimal point)

The word "egy" is also the Hungarian indefinite article ("van egy excentrikus jet"),
so by default a lone "egy" is only turned into 1 when a number word or "egész" /
"kötőjel" follows it. With aggressive=True every "egy" becomes 1; that version is used
only for checking that a value really appears in the transcript, never shown to you.
"""

import re

# Building blocks of Hungarian number words, with their values.
# "kett", "hárm", "het" only occur with an ending ("kettes", "hármas", "hetes").
UNITS = {"nulla": 0, "egy": 1, "kettő": 2, "két": 2, "kett": 2, "három": 3, "hárm": 3,
         "négy": 4, "öt": 5, "hat": 6, "hét": 7, "het": 7, "nyolc": 8, "kilenc": 9}
TENS = {"tíz": 10, "tizen": 10, "húsz": 20, "huszon": 20, "harminc": 30, "negyven": 40,
        "ötven": 50, "hatvan": 60, "hetven": 70, "nyolcvan": 80, "kilencven": 90}
MULTIPLIERS = {"száz": 100, "ezer": 1000}
PIECES = {**UNITS, **TENS, **MULTIPLIERS}
# Longest first, so "hatvan" is matched before "hat", "ötven" before "öt".
PIECE_ORDER = sorted(PIECES, key=len, reverse=True)

# Endings that may follow a number word: "kettes", "hármas", "ötös", "tízre" ...
ENDINGS = ("", "es", "as", "os", "ös", "ra", "re", "ig", "ből", "ból", "t", "at", "et")

# Stems that are only valid with an ending (never on their own)
NEEDS_ENDING = {"kett", "hárm", "het"}


def word_to_int(word):
    """Value of a single Hungarian number word, or None if it isn't one."""
    w = word.lower()
    for ending in ENDINGS:
        if ending and not w.endswith(ending):
            continue
        stem = w[: len(w) - len(ending)] if ending else w
        value = _parse_stem(stem, ending)
        if value is not None:
            return value
    return None


def _parse_stem(stem, ending):
    if not stem:
        return None
    pieces = []
    rest = stem
    while rest:
        for piece in PIECE_ORDER:
            if rest.startswith(piece):
                pieces.append(piece)
                rest = rest[len(piece):]
                break
        else:
            return None                       # something that isn't a number piece
    if pieces[-1] in NEEDS_ENDING and not ending:
        return None
    if pieces[-1] in ("tizen", "huszon"):     # "tizen" needs a unit after it
        return None
    total = current = 0
    for piece in pieces:
        value = PIECES[piece]
        if piece == "ezer":
            total += (current or 1) * 1000
            current = 0
        elif piece == "száz":
            current = (current or 1) * 100
        else:
            current += value
    return total + current


# One "word" = letters (including Hungarian accents); everything else is kept as is.
WORD = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿŐőŰű]+")


def words_to_digits(text, aggressive=False):
    """Replace number words in a text with digits, then join decimals and ranges."""
    tokens = WORD.split(text)
    words = WORD.findall(text)
    out = [tokens[0]]
    for i, word in enumerate(words):
        value = word_to_int(word)
        if value is not None and word.lower() == "egy" and not aggressive:
            next_word = words[i + 1].lower() if i + 1 < len(words) else ""
            between = tokens[i + 1]
            # keep "egy" as a word unless a number / egész / kötőjel follows directly
            if not (between.strip(" ,") == "" and
                    (next_word in ("egész", "kötőjel", "kötője")
                     or word_to_int(next_word) is not None)):
                value = None
        out.append(str(value) if value is not None else word)
        out.append(tokens[i + 1])
    text = "".join(out)

    # "1 egész 33" -> "1,33"
    text = re.sub(r"(\d+)\s+egész\s+(\d+)", r"\1,\2", text)
    # "1 kötőjel 2", "1 kötője, 2" -> "1-2"
    text = re.sub(r"(\d+)\s*,?\s*kötőjel?\s*,?\s*(\d+)", r"\1-\2", text)
    # "1.8" -> "1,8" (a decimal point between digits)
    text = re.sub(r"(?<=\d)\.(?=\d)", ",", text)
    return text


if __name__ == "__main__":
    # Quick self-test: run  .venv\Scripts\python.exe hu_numbers.py
    tests = {
        "negyvennyolc": "48",
        "egy egész harminchárom": "1,33",
        "nulla egész három": "0,3",
        "kétszázhuszonöt": "225",
        "százhúsz": "120",
        "ezerkétszáz": "1200",
        "tizenkettő": "12",
        "kettes-hármas": "2-3",
        "legyen inkább hármas": "legyen inkább 3",
        "az AI egy kötőjel kettő": "az AI 1-2",
        "AI pedig egy kötője, kettő": "AI pedig 1-2",
        "van egy excentrikus jet": "van egy excentrikus jet",
        "egy egész kereken": "1 egész kereken",     # = exactly 1,0
        "beáramlás 99.70": "beáramlás 99,70",
        "hat hét": "6 7",
        "hatvan": "60",
        "ötven per harminc": "50 per 30",
        "hetes": "7",
        "hátsó fal": "hátsó fal",
        "a hét": "a 7",
    }
    failed = 0
    for given, expected in tests.items():
        got = words_to_digits(given)
        mark = "ok " if got == expected else "BAD"
        failed += got != expected
        print(f"{mark} {given!r:36} -> {got!r}   (expected {expected!r})")
    print("aggressive:", words_to_digits("az MI egy, van egy jet", aggressive=True))
    print("all passed" if not failed else f"{failed} FAILED")
    raise SystemExit(1 if failed else 0)   # a failure must also fail the automatic check (exit code)
