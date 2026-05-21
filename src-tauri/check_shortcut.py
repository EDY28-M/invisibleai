import subprocess
import os

cwd = "/Volumes/Mac/juniorbardales/Documents/cluely/InvisibleAI/src-tauri"
print("Running cargo check...")
res = subprocess.run(["cargo", "check"], cwd=cwd, capture_output=True, text=True)
print("STDOUT:")
print(res.stdout)
print("STDERR:")
print(res.stderr)
