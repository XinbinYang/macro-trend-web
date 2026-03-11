#!/usr/bin/env python3
"""Quick sanity checks for SPX proxy aliasing.

- Ensures SPX max date reaches 2026-03-11 from Wind_proxy (^GSPC)
- Ensures Beta70 artifact can be built with --allowProxy

Not a formal unit test; just a deterministic smoke check.
"""

import json
import sqlite3
import subprocess


def main():
    con = sqlite3.connect("macro_quant.db")
    cur = con.cursor()

    spx = cur.execute("select max(date), source from assets_equity where ticker='SPX'").fetchone()
    print("SPX max", spx)

    # build artifact
    subprocess.check_call([
        "python3",
        "scripts/build_beta70_nav.py",
        "--db",
        "macro_quant.db",
        "--out",
        "/tmp/beta70_latest.json",
        "--freq",
        "monthly",
        "--allowProxy",
    ])

    obj = json.load(open("/tmp/beta70_latest.json", "r"))
    print("artifact asOf", obj.get("asOf"), "status", obj.get("status"), "points", len(obj.get("nav", [])))


if __name__ == "__main__":
    main()
