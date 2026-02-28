import os
import re

file_path = r'c:\Users\ADMIN\Desktop\AiResume\Resume-Agent\frontend\src\pages\ResumeBuilder.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update imports
old_import = "import { createResume, getResumeLatexSource, downloadResume, generateResumeBullets, generateResumeSummary, generateProjectBullets, getApiKeyStatus, getTemplatePreference } from '../services/api';"
new_import = "import { createResume, getResumeLatexSource, downloadResume, generateResumeBullets, generateResumeSummary, generateProjectBullets, getApiKeyStatus, getTemplatePreference, analyzeResumeForATS } from '../services/api';"
text = text.replace(old_import, new_import)

# 2. Remove validateStep, handleNext, handleSaveAndPreview
# These are unused and cause eslint errors
text = re.sub(r'    // ── Validation ──\s*const validateStep = \(\) => \{[\s\S]*?return true;\n    \};\n', '', text)
text = re.sub(r'    const handleNext = \(\) => \{[\s\S]*?    \};\n', '', text)
text = re.sub(r'    const handleSaveAndPreview = async \(\) => \{[\s\S]*?finally \{\n            setLoading\(false\);\n        \}\n    \};\n', '', text)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Cleaned up unused variables and updated imports.")
