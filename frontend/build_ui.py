import os

file_path = r'c:\Users\ADMIN\Desktop\AiResume\Resume-Agent\frontend\src\pages\ResumeBuilder.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    orig_content = f.read()

content = orig_content

# 1. Update Stepper Banner spacing
content = content.replace('className="w-full bg-white border-b border-gray-200 shadow-sm pt-8 pb-4 mb-8 sticky top-0 z-10"',
                          'className="w-full bg-white border-b border-gray-200 shadow-sm pt-4 pb-2 mb-4 sticky top-0 z-10"')
content = content.replace('<h1 className="text-xl font-bold mb-6 text-gray-800">Resume Creation Process</h1>',
                          '<h1 className="text-lg font-bold mb-3 text-gray-800">Resume Creation Process</h1>')

# 2. Add custom_sections to initial state
content = content.replace('experience: [], projects: [], education: [], skills: []',
                          'experience: [], projects: [], education: [], skills: [], custom_sections: []')

# 3. Add Custom Sections functionality code
custom_sec_code = """
    const addCustomSection = (type, defaultTitle) => {
        setFormData(prev => ({
            ...prev,
            custom_sections: [...(prev.custom_sections || []), { id: Date.now().toString(), type, title: defaultTitle, items: [{ title: '', subtitle: '', date: '', details: [''] }] }]
        }));
        setShowCustomTemplates(false);
    };

    const removeCustomSection = (secIndex) => {
        setFormData(prev => {
            const newSecs = [...prev.custom_sections];
            newSecs.splice(secIndex, 1);
            return { ...prev, custom_sections: newSecs };
        });
    };

    const updateCustomSection = (secIndex, field, value) => {
        setFormData(prev => {
            const newSecs = [...prev.custom_sections];
            newSecs[secIndex] = { ...newSecs[secIndex], [field]: value };
            return { ...prev, custom_sections: newSecs };
        });
    };

    const addCustomItem = (secIndex) => {
        setFormData(prev => {
            const newSecs = [...prev.custom_sections];
            newSecs[secIndex].items.push({ title: '', subtitle: '', date: '', details: [''] });
            return { ...prev, custom_sections: newSecs };
        });
    };

    const removeCustomItem = (secIndex, itemIndex) => {
        setFormData(prev => {
            const newSecs = [...prev.custom_sections];
            newSecs[secIndex].items.splice(itemIndex, 1);
            return { ...prev, custom_sections: newSecs };
        });
    };

    const updateCustomItem = (secIndex, itemIndex, field, value) => {
        setFormData(prev => {
            const newSecs = [...prev.custom_sections];
            newSecs[secIndex].items[itemIndex] = { ...newSecs[secIndex].items[itemIndex], [field]: value };
            return { ...prev, custom_sections: newSecs };
        });
    };
    
    const [showCustomTemplates, setShowCustomTemplates] = useState(false);
    
    // --- Render Functions ---
"""
content = content.replace('// --- Render Functions ---', custom_sec_code)

# 4. Extract Summary section using split
start_idx = content.find('<AccordionItem id="summary"')
end_idx = content.find('</AccordionItem>', start_idx) + len('</AccordionItem>')
summary_code = content[start_idx:end_idx]

# Remove it from its original place
content = content[:start_idx] + content[end_idx:]

# 5. Add Custom Sections UI and Summary at the end of Step 1
end_step1_target = '</div>\n\n            <div className="text-right pb-10">'
new_sections = """
                <AccordionItem id="custom" title="Custom Sections" openSection={openSection} toggleSection={toggleSection}>
                    <div className="space-y-8">
                        {(!formData.custom_sections || formData.custom_sections.length === 0) && !showCustomTemplates && (
                            <div className="text-center py-4">
                                <p className="text-sm text-gray-500 mb-4">No custom sections added yet.</p>
                                <Button variant="outline" onClick={() => setShowCustomTemplates(true)} className="rounded-xl border-dashed border-2 font-bold px-6">+ Add New Custom Section</Button>
                            </div>
                        )}
                        
                        {(formData.custom_sections || []).map((sec, secIdx) => (
                            <div key={sec.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-6 relative">
                                <button onClick={() => removeCustomSection(secIdx)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-red-100 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center">✕</button>
                                <div className="mb-6">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 block mb-2">Section Title</label>
                                    <input value={sec.title} onChange={e => updateCustomSection(secIdx, 'title', e.target.value)} className="w-full px-5 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-transparent text-primary outline-none transition-all text-base font-bold" />
                                </div>
                                
                                <div className="space-y-6">
                                    {sec.items.map((item, itemIdx) => (
                                        <div key={itemIdx} className="bg-white border border-gray-100 p-5 rounded-xl relative">
                                            <button onClick={() => removeCustomItem(secIdx, itemIdx)} className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-gray-200 text-gray-500 hover:bg-red-500 hover:text-white flex items-center justify-center text-xs">✕</button>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <input placeholder="Title / Role / Award Name" value={item.title} onChange={e => updateCustomItem(secIdx, itemIdx, 'title', e.target.value)} className={inputClass('none')} />
                                                <input placeholder="Subtitle / Organization (Optional)" value={item.subtitle} onChange={e => updateCustomItem(secIdx, itemIdx, 'subtitle', e.target.value)} className={inputClass('none')} />
                                            </div>
                                            <div className="mb-4">
                                                <input placeholder="Date / Duration (Optional)" value={item.date} onChange={e => updateCustomItem(secIdx, itemIdx, 'date', e.target.value)} className={inputClass('none')} />
                                            </div>
                                            <textarea value={item.details[0]} onChange={e => {
                                                const newDetails = [...item.details];
                                                newDetails[0] = e.target.value;
                                                updateCustomItem(secIdx, itemIdx, 'details', newDetails);
                                            }} className="w-full p-3 bg-secondary border border-gray-100 rounded-xl resize-none outline-none min-h-[80px] text-sm" placeholder="Description or bullet points..." />
                                        </div>
                                    ))}
                                    <button onClick={() => addCustomItem(secIdx)} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl font-bold text-gray-500 hover:text-brand hover:border-brand transition-colors text-sm">+ Add Item to {sec.title}</button>
                                </div>
                            </div>
                        ))}
                        
                        {((formData.custom_sections || []).length > 0 || showCustomTemplates) && !showCustomTemplates && (
                             <div className="text-center mt-4">
                                <Button variant="outline" onClick={() => setShowCustomTemplates(true)} className="rounded-xl border-dashed border-2 font-bold px-6">+ Add Another Custom Section</Button>
                             </div>
                        )}

                        {showCustomTemplates && (
                            <div className="bg-white border border-gray-200 border-dashed rounded-2xl p-6">
                                <h3 className="text-sm font-bold text-gray-800 text-center mb-6">Choose a Section Template</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {[
                                        { type: 'certifications', icon: '🏆', title: 'Certifications', desc: 'Add certifications' },
                                        { type: 'awards', icon: '🏅', title: 'Awards & Recognition', desc: 'Add awards & recognition' },
                                        { type: 'achievements', icon: '🌟', title: 'Achievements', desc: 'Add achievements' },
                                        { type: 'publications', icon: '📚', title: 'Publications', desc: 'Add publications' },
                                        { type: 'languages', icon: '🗣️', title: 'Languages', desc: 'Add languages' },
                                        { type: 'volunteer', icon: '🤝', title: 'Volunteer Experience', desc: 'Add volunteer experience' },
                                        { type: 'custom', icon: '+', title: 'Custom Section', desc: 'Create your own section' }
                                    ].map(tpl => (
                                        <button key={tpl.type} onClick={() => addCustomSection(tpl.type, tpl.title)} className="flex flex-col items-start p-4 border border-gray-100 rounded-xl hover:border-brand hover:bg-brand/5 text-left transition-all">
                                            <div className="flex items-center gap-2 mb-1"><span className="text-lg">{tpl.icon}</span><span className="font-bold text-gray-800 text-sm">{tpl.title}</span></div>
                                            <span className="text-xs text-gray-500">{tpl.desc}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="text-center mt-6">
                                    <button onClick={() => setShowCustomTemplates(false)} className="text-xs font-bold text-gray-400 hover:text-gray-600">Cancel</button>
                                </div>
                            </div>
                        )}
                    </div>
                </AccordionItem>
""" + "\n" + summary_code + "\n" + '            </div>\n\n            <div className="text-right pb-10">'

content = content.replace(end_step1_target, new_sections)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("UI edits successful")
