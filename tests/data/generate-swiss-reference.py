"""Generate tests/data/swiss-reference.json (Swiss Ephemeris true node, Sun, 88° design instant).

Not run by the test suite. Swiss Ephemeris is not a dependency; use a throwaway venv:
  uv venv /tmp/swe && uv pip install -p /tmp/swe/bin/python pyswisseph
  # SE1 files (semo_18, sepl_18, seas_18) from https://github.com/aloistr/swisseph/tree/master/ephe
  /tmp/swe/bin/python -I tests/data/generate-swiss-reference.py EPHE_DIR tests/data/swiss-reference.json
"""
import json, random, sys
import swisseph as swe

swe.set_ephe_path(sys.argv[1])
FL = swe.FLG_SWIEPH
UNIX_JD = 2440587.5

def jd_of(ms): return UNIX_JD + ms / 86400000.0
def lon(jd, body):
    xx, ret = swe.calc_ut(jd, body, FL)
    assert ret & swe.FLG_SWIEPH, ret  # really used the .se1 files, not Moshier
    return xx[0]
def sdiff(a, b):
    d = (a - b) % 360.0
    return d - 360.0 if d > 180 else d

def design_ms(birth_ms):
    target = (lon(jd_of(birth_ms), swe.SUN) - 88) % 360
    lo, hi = birth_ms - 96 * 864e5, birth_ms - 84 * 864e5
    for _ in range(60):
        mid = (lo + hi) / 2
        if sdiff(lon(jd_of(mid), swe.SUN), target) > 0: hi = mid
        else: lo = mid
    return (lo + hi) / 2

def row(ms):
    d = design_ms(ms)
    return {
        'utMs': ms,
        'pSun': round(lon(jd_of(ms), swe.SUN), 7),
        'pNode': round(lon(jd_of(ms), swe.TRUE_NODE), 7),
        'dUtMs': round(d),
        'dSun': round(lon(jd_of(d), swe.SUN), 7),
        'dNode': round(lon(jd_of(d), swe.TRUE_NODE), 7),
    }

rng = random.Random(20261028)
start = -2208988800000  # 1900-01-01T00:00Z
end = 2524608000000     # 2050-01-01T00:00Z
births = [start + rng.randrange((end - start) // 60000) * 60000 for _ in range(1000)]
out = {
    'source': f'Swiss Ephemeris {swe.version} (pyswisseph), SE1 files, FLG_SWIEPH, SE_TRUE_NODE, tropical apparent ecliptic of date',
    'seed': 20261028, 'range': '1900-01-01..2050-01-01 UTC, whole minutes',
    'births': [row(ms) for ms in births],
}
json.dump(out, open(sys.argv[2], 'w'), separators=(',', ':'))
print(len(out['births']), 'rows;', out['source'])
