import zipfile, os, sys

output_path = sys.argv[1]

items = [
    "node_modules",
    "test",
    "wdio.conf.ts",
    "tsconfig.json",
    "package.json",
    "package-lock.json",
]

EXCLUDE_DIRS = {
    os.path.normpath("node_modules/.cache"),
}

def is_excluded(filepath):
    for excl in EXCLUDE_DIRS:
        if filepath.startswith(excl + os.sep) or filepath == excl:
            return True
    return False

total = 0
for item in items:
    if os.path.isfile(item):
        total += 1
    else:
        for root, dirs, files in os.walk(item):
            if is_excluded(root):
                dirs.clear()
                continue
            total += len(files)

print(f"TOTAL:{total}", flush=True)

processed = 0
with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
    for item in items:
        if os.path.isfile(item):
            zf.write(item, item.replace(os.sep, "/"))
            processed += 1
            print(f"FILE:{processed}", flush=True)
        else:
            for root, dirs, files in os.walk(item):
                if is_excluded(root):
                    dirs.clear()
                    continue
                for file in files:
                    filepath = os.path.join(root, file)
                    arcname = filepath.replace(os.sep, "/")
                    zf.write(filepath, arcname)
                    processed += 1
                    print(f"FILE:{processed}", flush=True)
