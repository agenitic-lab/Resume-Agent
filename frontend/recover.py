import os

log_file = r'C:\Users\ADMIN\.gemini\antigravity\brain\218be2e6-b122-408b-a087-05139d2ac0c9\.system_generated\logs\overview.txt'
out_file = r'C:\Users\ADMIN\Desktop\AiResume\Resume-Agent\frontend\src\pages\ResumeBuilder_recovered.jsx'

with open(log_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Look for the last time the file contents were displayed or written fully
# Usually view_file output says "File Path: `file:///c:/.../ResumeBuilder.jsx`" and "Total Lines: <number>"
# and then "Showing lines 1 to X".
capturing = False
recovered_lines = []

for line in lines:
    if "File Path: `file:///c:/Users/ADMIN/Desktop/AiResume/Resume-Agent/frontend/src/pages/ResumeBuilder.jsx`" in line or "TargetFile: \"c:\\Users\\ADMIN\\Desktop\\AiResume\\Resume-Agent\\frontend\\src\\pages\\ResumeBuilder.jsx\"" in line or "Created file file:///c:/Users/ADMIN/Desktop/AiResume/Resume-Agent/frontend/src/pages/ResumeBuilder.jsx" in line or "import React" in line:
        pass

# The best way to recover is to grab the diffs or just read the original file if it was backed up
# Does replace_file_content make a backup? 
pass
