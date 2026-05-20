import os
import shutil

base_path = "/Volumes/Mac/juniorbardales/Documents/cluely/InvisibleAI/src"

try:
    os.rename(os.path.join(base_path, "pages"), os.path.join(base_path, "screens"))
    print("Renamed pages to screens")
except Exception as e:
    print("Error renaming pages:", e)

try:
    os.rename(os.path.join(base_path, "routes"), os.path.join(base_path, "navigation"))
    print("Renamed routes to navigation")
except Exception as e:
    print("Error renaming routes:", e)
