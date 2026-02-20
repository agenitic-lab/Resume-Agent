import React, { useState, useRef } from 'react';
import { createResume, getResumePreview, downloadResume, generateResumeBullets, generateResumeSummary, generateProjectBullets } from '../services/api';
import toast from 'react-hot-toast';

// ─── Job Title Suggestions ─────────────────────────────────────────────────
const JOB_TITLE_SUGGESTIONS = [
    // Tech
    "Full Stack Developer", "Frontend Developer", "Backend Developer",
    "Software Engineer", "Senior Software Engineer", "Lead Software Engineer",
    "Python Developer", "React Developer", "Node.js Developer",
    "Django Developer", "FastAPI Developer", "Java Developer",
    "DevOps Engineer", "Cloud Engineer", "AWS Solutions Architect",
    "Data Engineer", "Data Scientist", "Machine Learning Engineer",
    "AI Engineer", "Mobile Developer", "iOS Developer", "Android Developer",
    "UI/UX Designer", "QA Engineer", "Database Administrator",
    "Site Reliability Engineer", "Blockchain Developer", "Cybersecurity Engineer",
    // Business
    "Product Manager", "Project Manager", "Business Analyst",
    "Marketing Manager", "Digital Marketing Specialist", "Content Strategist",
    "Sales Manager", "Account Manager", "Operations Manager",
    "HR Manager", "Recruiter", "Financial Analyst", "Accountant",
    // Healthcare
    "Registered Nurse", "Physician", "Pharmacist", "Medical Assistant",
    "Physical Therapist", "Dentist", "Healthcare Administrator",
    // Education
    "Teacher", "Professor", "Curriculum Developer", "School Counselor",
    // Design
    "Graphic Designer", "Product Designer", "Motion Designer", "Brand Designer",
    // Legal & Finance
    "Lawyer", "Paralegal", "Investment Banker", "Financial Advisor",
];

// ─── Field-Aware Skill Suggestions ────────────────────────────────────────
const SKILL_SUGGESTIONS_BY_FIELD = {
    // Tech / Dev
    "developer": ["JavaScript", "TypeScript", "React", "Node.js", "Python", "Django", "FastAPI", "REST APIs", "PostgreSQL", "MongoDB", "Docker", "Git", "AWS", "CI/CD", "HTML", "CSS", "Redux", "GraphQL"],
    "engineer": ["System Design", "Algorithms", "Data Structures", "Java", "C++", "Python", "Kubernetes", "Docker", "AWS", "Microservices", "SQL", "Git", "Linux", "Agile"],
    "data": ["Python", "SQL", "Pandas", "NumPy", "Machine Learning", "TensorFlow", "PyTorch", "Tableau", "Power BI", "Spark", "Hadoop", "Statistics", "R", "Data Visualization"],
    "devops": ["Docker", "Kubernetes", "CI/CD", "Jenkins", "Terraform", "AWS", "Azure", "GCP", "Linux", "Bash", "Ansible", "Monitoring", "Git", "Helm"],
    "designer": ["Figma", "Adobe XD", "Photoshop", "Illustrator", "Sketch", "Prototyping", "Wireframing", "User Research", "Typography", "Color Theory", "Motion Design"],
    // Business
    "manager": ["Leadership", "Strategic Planning", "Team Management", "Budgeting", "Stakeholder Management", "Agile", "Scrum", "KPIs", "Communication", "Problem Solving"],
    "analyst": ["Data Analysis", "Excel", "SQL", "Power BI", "Tableau", "Business Intelligence", "Reporting", "Requirements Gathering", "Process Improvement", "JIRA"],
    "marketing": ["SEO", "SEM", "Google Analytics", "Social Media Marketing", "Content Marketing", "Email Marketing", "HubSpot", "Copywriting", "Brand Strategy", "Campaign Management"],
    "sales": ["CRM", "Salesforce", "Lead Generation", "Negotiation", "Cold Calling", "Account Management", "B2B Sales", "Pipeline Management", "Customer Success"],
    "hr": ["Recruitment", "Onboarding", "Performance Management", "HRIS", "Employee Relations", "Talent Acquisition", "Compensation & Benefits", "Labor Law", "Training & Development"],
    // Healthcare
    "nurse": ["Patient Care", "Clinical Assessment", "IV Therapy", "Electronic Health Records", "BLS/ACLS", "Medication Administration", "Wound Care", "Team Collaboration"],
    "doctor": ["Clinical Diagnosis", "Patient Management", "Medical Research", "Electronic Health Records", "Surgery", "Pharmacology", "Patient Communication"],
    // Education
    "teacher": ["Curriculum Development", "Classroom Management", "Lesson Planning", "Student Assessment", "Differentiated Instruction", "Google Classroom", "Communication"],
    // Finance
    "accountant": ["Financial Reporting", "GAAP", "QuickBooks", "Excel", "Tax Preparation", "Auditing", "Budgeting", "Accounts Payable", "Accounts Receivable"],
    "finance": ["Financial Modeling", "Valuation", "Excel", "Bloomberg", "Investment Analysis", "Risk Management", "Portfolio Management", "Financial Reporting"],
    // Legal
    "lawyer": ["Legal Research", "Contract Drafting", "Litigation", "Negotiation", "Client Counseling", "Legal Writing", "Due Diligence", "Compliance"],
    // Default
    "default": ["Communication", "Problem Solving", "Teamwork", "Leadership", "Time Management", "Critical Thinking", "Adaptability", "Microsoft Office", "Project Management"],
};

function getSkillSuggestions(field, existingSkills) {
    const fieldLower = (field || '').toLowerCase();
    let suggestions = [...SKILL_SUGGESTIONS_BY_FIELD.default];

    for (const [key, skills] of Object.entries(SKILL_SUGGESTIONS_BY_FIELD)) {
        if (key !== 'default' && fieldLower.includes(key)) {
            suggestions = [...skills, ...SKILL_SUGGESTIONS_BY_FIELD.default];
            break;
        }
    }

    return suggestions.filter(s => !existingSkills.includes(s));
}

// ─── Autocomplete Input ────────────────────────────────────────────────────
function AutocompleteInput({ value, onChange, placeholder, className, suggestions }) {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filtered, setFiltered] = useState([]);
    const inputRef = useRef(null);

    const handleChange = (e) => {
        const val = e.target.value;
        onChange(val);
        if (val.length > 0) {
            const matches = suggestions.filter(s =>
                s.toLowerCase().includes(val.toLowerCase())
            ).slice(0, 6);
            setFiltered(matches);
            setShowSuggestions(matches.length > 0);
        } else {
            setShowSuggestions(false);
        }
    };

    const handleSelect = (suggestion) => {
        onChange(suggestion);
        setShowSuggestions(false);
    };

    return (
        <div className="relative">
            <input
                ref={inputRef}
                value={value}
                onChange={handleChange}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onFocus={() => { if (value.length > 0 && filtered.length > 0) setShowSuggestions(true); }}
                placeholder={placeholder}
                className={className}
                autoComplete="off"
            />
            {showSuggestions && (
                <div className="absolute z-50 w-full bg-bg-surface border border-border-muted rounded-xl shadow-xl mt-1 overflow-hidden">
                    {filtered.map((s, i) => (
                        <button key={i} onMouseDown={() => handleSelect(s)}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-brand-primary hover:text-black transition-colors font-medium">
                            {s}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Month/Year Date Picker ────────────────────────────────────────────────
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function MonthYearPicker({ value, onChange, placeholder, allowPresent = false }) {
    const [open, setOpen] = useState(false);
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 30 }, (_, i) => currentYear - i);
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const ref = useRef(null);

    React.useEffect(() => {
        if (value && value !== 'Present') {
            const parts = value.split(' ');
            if (parts.length === 2) {
                setSelectedMonth(parts[0]);
                setSelectedYear(parts[1]);
            }
        }
    }, [value]);

    const handleSelect = (month, year) => {
        const formatted = `${month} ${year}`;
        onChange(formatted);
        setSelectedMonth(month);
        setSelectedYear(year);
        setOpen(false);
    };

    const handlePresent = () => {
        onChange('Present');
        setSelectedMonth('');
        setSelectedYear('');
        setOpen(false);
    };

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full p-2 bg-bg-secondary rounded-lg border border-border-subtle text-left text-sm flex items-center justify-between"
            >
                <span className={value ? 'text-text-primary' : 'text-text-muted'}>
                    {value || placeholder}
                </span>
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </button>

            {open && (
                <div className="absolute z-50 w-64 bg-bg-surface border border-border-muted rounded-2xl shadow-2xl mt-1 p-3 left-0">
                    {/* Year selector */}
                    <div className="mb-3">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1 block">Year</label>
                        <div className="grid grid-cols-4 gap-1 max-h-28 overflow-y-auto">
                            {years.map(y => (
                                <button key={y} type="button"
                                    onClick={() => setSelectedYear(String(y))}
                                    className={`text-xs py-1 rounded-lg font-medium transition-all ${selectedYear === String(y) ? 'bg-brand-primary text-black' : 'hover:bg-bg-secondary text-text-secondary'}`}>
                                    {y}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Month selector */}
                    <div className="mb-3">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1 block">Month</label>
                        <div className="grid grid-cols-4 gap-1">
                            {MONTHS.map(m => (
                                <button key={m} type="button"
                                    onClick={() => {
                                        setSelectedMonth(m);
                                        if (selectedYear) handleSelect(m, selectedYear);
                                    }}
                                    className={`text-xs py-1 rounded-lg font-medium transition-all ${selectedMonth === m ? 'bg-brand-primary text-black' : 'hover:bg-bg-secondary text-text-secondary'}`}>
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                    {allowPresent && (
                        <button type="button" onClick={handlePresent}
                            className="w-full text-xs py-1.5 rounded-lg bg-blue-500/10 text-blue-400 font-bold hover:bg-blue-500/20 transition-colors">
                            Present / Current
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Year Picker (for Education) ──────────────────────────────────────────
function YearPicker({ value, onChange, placeholder, allowPresent = false }) {
    const [open, setOpen] = useState(false);
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 30 }, (_, i) => currentYear - i);
    const ref = useRef(null);

    React.useEffect(() => {
        const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button type="button" onClick={() => setOpen(!open)}
                className="w-full p-2 bg-bg-secondary rounded-lg border border-border-subtle text-left text-sm flex items-center justify-between">
                <span className={value ? 'text-text-primary' : 'text-text-muted'}>{value || placeholder}</span>
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </button>
            {open && (
                <div className="absolute z-50 w-48 bg-bg-surface border border-border-muted rounded-2xl shadow-2xl mt-1 p-3 left-0">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">Select Year</label>
                    <div className="grid grid-cols-3 gap-1 max-h-40 overflow-y-auto">
                        {years.map(y => (
                            <button key={y} type="button"
                                onClick={() => { onChange(String(y)); setOpen(false); }}
                                className={`text-xs py-1.5 rounded-lg font-medium transition-all ${value === String(y) ? 'bg-brand-primary text-black' : 'hover:bg-bg-secondary text-text-secondary'
                                    }`}>
                                {y}
                            </button>
                        ))}
                    </div>
                    {allowPresent && (
                        <button type="button" onClick={() => { onChange('Present'); setOpen(false); }}
                            className="w-full mt-2 text-xs py-1.5 rounded-lg bg-blue-500/10 text-blue-400 font-bold hover:bg-blue-500/20 transition-colors">
                            Present / Current
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function ResumeBuilder() {
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [resumeId, setResumeId] = useState(null);
    const [previewHtml, setPreviewHtml] = useState(null);
    const [selectedTemplate, setSelectedTemplate] = useState('classic');
    const [skillInput, setSkillInput] = useState('');
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        field: '',
        experience_level: '',
        contact: {
            name: '',
            email: '',
            phone: '',
            location: '',
            linkedin: '',
            linkedin_label: '',
            github: '',
            github_label: '',
            portfolio: '',
            portfolio_label: '',
            twitter: '',
            behance: '',
            medium: '',
            summary: ''
        },
        experience: [],
        projects: [],
        education: [],
        skills: []
    });

    const updateField = (path, value) => {
        setFormData(prev => {
            const newData = JSON.parse(JSON.stringify(prev));
            const keys = path.split('.');
            let current = newData;
            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newData;
        });
    };

    // ── Skills ──
    const addSkill = (skill) => {
        if (!skill.trim() || formData.skills.includes(skill.trim())) return;
        setFormData(prev => ({ ...prev, skills: [...prev.skills, skill.trim()] }));
    };
    const removeSkill = (index) => {
        setFormData(prev => ({ ...prev, skills: prev.skills.filter((_, i) => i !== index) }));
    };

    // ── Experience ──
    const addExperience = () => {
        setFormData(prev => ({
            ...prev,
            experience: [...prev.experience, { title: '', company: '', start_date: '', end_date: '', details: [''] }]
        }));
    };
    const updateExperience = (index, field, value) => {
        setFormData(prev => {
            const newExp = [...prev.experience];
            newExp[index] = { ...newExp[index], [field]: value };
            return { ...prev, experience: newExp };
        });
    };
    const updateExperienceDetail = (expIndex, detailIndex, value) => {
        setFormData(prev => {
            const newExp = [...prev.experience];
            const details = [...newExp[expIndex].details];
            details[detailIndex] = value;
            newExp[expIndex] = { ...newExp[expIndex], details };
            return { ...prev, experience: newExp };
        });
    };
    const addExperienceDetail = (expIndex) => {
        setFormData(prev => {
            const newExp = [...prev.experience];
            newExp[expIndex] = { ...newExp[expIndex], details: [...newExp[expIndex].details, ''] };
            return { ...prev, experience: newExp };
        });
    };
    const removeExperienceDetail = (expIndex, detailIndex) => {
        setFormData(prev => {
            const newExp = [...prev.experience];
            newExp[expIndex] = { ...newExp[expIndex], details: newExp[expIndex].details.filter((_, i) => i !== detailIndex) };
            return { ...prev, experience: newExp };
        });
    };
    const removeExperience = (index) => {
        setFormData(prev => ({ ...prev, experience: prev.experience.filter((_, i) => i !== index) }));
    };

    // ── Projects ──
    const addProject = () => {
        setFormData(prev => ({
            ...prev,
            projects: [...prev.projects, { title: '', role: '', type: '', tools: '', details: [''] }]
        }));
    };
    const updateProject = (index, field, value) => {
        setFormData(prev => {
            const newProj = [...prev.projects];
            newProj[index] = { ...newProj[index], [field]: value };
            return { ...prev, projects: newProj };
        });
    };
    const updateProjectDetail = (projIndex, detailIndex, value) => {
        setFormData(prev => {
            const newProj = [...prev.projects];
            const details = [...newProj[projIndex].details];
            details[detailIndex] = value;
            newProj[projIndex] = { ...newProj[projIndex], details };
            return { ...prev, projects: newProj };
        });
    };
    const addProjectDetail = (projIndex) => {
        setFormData(prev => {
            const newProj = [...prev.projects];
            newProj[projIndex] = { ...newProj[projIndex], details: [...newProj[projIndex].details, ''] };
            return { ...prev, projects: newProj };
        });
    };
    const removeProjectDetail = (projIndex, detailIndex) => {
        setFormData(prev => {
            const newProj = [...prev.projects];
            newProj[projIndex] = { ...newProj[projIndex], details: newProj[projIndex].details.filter((_, i) => i !== detailIndex) };
            return { ...prev, projects: newProj };
        });
    };
    const removeProject = (index) => {
        setFormData(prev => ({ ...prev, projects: prev.projects.filter((_, i) => i !== index) }));
    };

    // ── Education ──
    const addEducation = () => {
        setFormData(prev => ({
            ...prev,
            education: [...prev.education, { degree: '', school: '', start_year: '', end_year: '' }]
        }));
    };
    const updateEducation = (index, field, value) => {
        setFormData(prev => {
            const newEdu = [...prev.education];
            newEdu[index] = { ...newEdu[index], [field]: value };
            return { ...prev, education: newEdu };
        });
    };
    const removeEducation = (index) => {
        setFormData(prev => ({ ...prev, education: prev.education.filter((_, i) => i !== index) }));
    };

    // ── Validation ──
    const validateStep = () => {
        const newErrors = {};
        const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
        const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-s.]?[0-9]{3}[-s.]?[0-9]{4,6}$/;

        switch (currentStep) {
            case 1: // Contact
                if (!formData.contact.name.trim()) newErrors.name = 'Full name is required';
                if (!formData.contact.email.trim()) newErrors.email = 'Email is required';
                else if (!emailRegex.test(formData.contact.email)) newErrors.email = 'Please enter a valid email (e.g., name@gmail.com)';
                if (!formData.contact.phone.trim()) newErrors.phone = 'Phone number is required';
                else if (!phoneRegex.test(formData.contact.phone.replace(/\s/g, ''))) newErrors.phone = 'Enter a valid phone number';
                if (!formData.contact.location.trim()) newErrors.location = 'Location is required';
                break;
            case 2: // Target role
                if (!formData.field.trim()) newErrors.field = 'Target job title is required';
                if (!formData.experience_level) newErrors.experience_level = 'Please select an experience level';
                break;
            case 3: // Links
                if (formData.contact.linkedin && !urlRegex.test(formData.contact.linkedin)) newErrors.linkedin = 'Invalid LinkedIn URL';
                if (formData.contact.portfolio && !urlRegex.test(formData.contact.portfolio)) newErrors.portfolio = 'Invalid Portfolio URL';
                if (formData.contact.github && !urlRegex.test(formData.contact.github)) newErrors.github = 'Invalid GitHub URL';
                if (formData.contact.twitter && !urlRegex.test(formData.contact.twitter)) newErrors.twitter = 'Invalid Twitter URL';
                if (formData.contact.behance && !urlRegex.test(formData.contact.behance)) newErrors.behance = 'Invalid Behance URL';
                if (formData.contact.medium && !urlRegex.test(formData.contact.medium)) newErrors.medium = 'Invalid Medium URL';
                break;
            case 4: // Summary
                if (formData.contact.summary.trim().length < 50) newErrors.summary = 'Summary should be at least 50 characters for a professional look.';
                break;
            case 5: // Experience
                formData.experience.forEach((exp, i) => {
                    if (!exp.title.trim()) newErrors[`exp_title_${i}`] = 'Job title is required';
                    if (!exp.company.trim()) newErrors[`exp_company_${i}`] = 'Company is required';
                    if (!exp.start_date) newErrors[`exp_start_${i}`] = 'Start date is required';
                });
                break;
            case 6: // Projects
                formData.projects.forEach((proj, i) => {
                    if (!proj.title.trim()) newErrors[`proj_title_${i}`] = 'Project name is required';
                });
                break;
            case 7: // Education
                formData.education.forEach((edu, i) => {
                    if (!edu.degree.trim()) newErrors[`edu_degree_${i}`] = 'Degree is required';
                    if (!edu.school.trim()) newErrors[`edu_school_${i}`] = 'School is required';
                });
                break;
            case 8: // Skills
                if (formData.skills.length === 0) newErrors.skills = 'Please add at least one skill';
                break;
            default:
                break;
        }
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            toast.error('Please fix the errors before proceeding.');
            return false;
        }
        return true;
    };

    const handleNext = () => {
        if (validateStep()) {
            setErrors({});
            setCurrentStep(prev => Math.min(steps.length - 1, prev + 1));
        }
    };

    // ── Error helper ──
    const err = (key) => errors[key] ? (
        <p className="text-xs text-red-500 mt-1 font-medium">{errors[key]}</p>
    ) : null;

    const inputClass = (key) =>
        `w-full p-4 bg-bg-secondary border rounded-xl focus:border-brand-primary text-text-primary outline-none transition-all ${errors[key] ? 'border-red-500/50 bg-red-500/5' : 'border-border-subtle'
        }`;
    const handleSaveAndPreview = async () => {
        setLoading(true);
        try {
            const res = await createResume(formData);
            setResumeId(res.resume_id);
            const html = await getResumePreview(res.resume_id, selectedTemplate);
            setPreviewHtml(html);
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate preview");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!resumeId) return;
        const toastId = toast.loading("Generating PDF...");
        try {
            const blob = await downloadResume(resumeId, selectedTemplate);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `resume-${selectedTemplate}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast.success("Download started", { id: toastId });
        } catch (error) {
            console.error(error);
            const msg = error.message.toLowerCase();
            if (msg.includes("gtk3") || msg.includes("unavailable") || error.status === 503) {
                toast.error("Download failed. PLEASE USE THE 'PRINT / SAVE AS PDF (BROWSER)' BUTTON BELOW INSTEAD.", { id: toastId, duration: 8000 });
            } else {
                toast.error(error.message || "Download failed.", { id: toastId });
            }
        }
    };

    const handlePrint = () => {
        if (!previewHtml) return;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(previewHtml);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    const handleGenerateSummary = async () => {
        if (!formData.field) { toast.error("Please enter a Target Job Title first (Step 3)."); return; }
        const toastId = toast.loading("AI is writing your professional summary...");
        try {
            const data = await generateResumeSummary({
                current_role: formData.field,
                experience_level: formData.experience_level || "Mid",
                keywords: formData.skills
            });
            if (data.summary) {
                updateField('contact.summary', data.summary);
                toast.success("Summary generated!", { id: toastId });
            } else {
                toast.error("No summary was generated.", { id: toastId });
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate summary.", { id: toastId });
        }
    };

    const handleGenerateBullets = async (index) => {
        const exp = formData.experience[index];
        if (!exp.title) { toast.error("Please enter a Job Title first."); return; }
        const toastId = toast.loading("AI is writing your bullet points...");
        try {
            const data = await generateResumeBullets({ role: exp.title, technologies: formData.skills, keywords: [], field: formData.field });
            if (data.bullets && data.bullets.length > 0) {
                setFormData(prev => {
                    const newExp = [...prev.experience];
                    const currentDetails = newExp[index].details.filter(d => d.trim() !== '');
                    newExp[index] = { ...newExp[index], details: [...currentDetails, ...data.bullets] };
                    return { ...prev, experience: newExp };
                });
                toast.success("Bullets generated!", { id: toastId });
            } else {
                toast.error("No bullets were generated.", { id: toastId });
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate bullets.", { id: toastId });
        }
    };

    const handleGenerateProjectBullets = async (index) => {
        const proj = formData.projects[index];
        if (!proj.title) { toast.error("Please enter a Project Name first."); return; }
        const toastId = toast.loading("AI is writing project descriptions...");
        try {
            const data = await generateProjectBullets({
                project_name: proj.title,
                project_type: proj.type || "Professional Project",
                role: proj.role || formData.field || "Developer",
                technologies: proj.tools ? proj.tools.split(',').map(s => s.trim()) : formData.skills,
                keywords: [],
                field: formData.field
            });
            if (data.bullets && data.bullets.length > 0) {
                setFormData(prev => {
                    const newProj = [...prev.projects];
                    const currentDetails = newProj[index].details.filter(d => d.trim() !== '');
                    newProj[index] = { ...newProj[index], details: [...currentDetails, ...data.bullets] };
                    return { ...prev, projects: newProj };
                });
                toast.success("Project bullets generated!", { id: toastId });
            } else {
                toast.error("No bullets were generated.", { id: toastId });
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate project bullets.", { id: toastId });
        }
    };

    // ── AI Button ──
    const AIButton = ({ onClick, label = "AI Generate" }) => (
        <button onClick={onClick}
            className="flex items-center gap-1 text-xs bg-purple-500/10 text-purple-400 px-2.5 py-1.5 rounded-lg font-bold uppercase hover:bg-purple-500/20 transition-colors border border-purple-500/20">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {label}
        </button>
    );

    // ── Template Preview Component (CSS-based) ──
    const TemplatePreview = ({ type }) => {
        const layouts = {
            modern: (
                <div className="w-full h-full bg-white flex overflow-hidden rounded shadow-inner">
                    <div className="w-1/3 bg-neutral-800 h-full p-1 space-y-1">
                        <div className="w-2/3 h-2 bg-neutral-600 rounded-px" />
                        <div className="w-full h-1 bg-neutral-700 rounded-px" />
                        <div className="w-full h-1 bg-neutral-700 rounded-px" />
                    </div>
                    <div className="flex-1 p-1 space-y-1.5">
                        <div className="w-1/2 h-2 bg-neutral-200 rounded-px" />
                        <div className="w-full h-1 bg-neutral-100 rounded-px" />
                        <div className="w-full h-1 bg-neutral-100 rounded-px" />
                        <div className="w-full h-1 bg-neutral-100 rounded-px" />
                    </div>
                </div>
            ),
            classic: (
                <div className="w-full h-full bg-white p-2 flex flex-col items-center space-y-1 shadow-inner rounded">
                    <div className="w-1/2 h-2 bg-neutral-300 rounded-px" />
                    <div className="w-1/3 h-1 bg-neutral-200 rounded-px" />
                    <div className="flex gap-1 py-1">
                        <div className="w-1 h-1 bg-neutral-400 rounded-full" />
                        <div className="w-1 h-1 bg-neutral-400 rounded-full" />
                        <div className="w-1 h-1 bg-neutral-400 rounded-full" />
                        <div className="w-1 h-1 bg-neutral-400 rounded-full" />
                    </div>
                    <div className="w-full h-px bg-neutral-200" />
                    <div className="w-full h-1 bg-neutral-100 rounded-px" />
                    <div className="w-full h-1 bg-neutral-100 rounded-px" />
                    <div className="w-full h-px bg-neutral-200" />
                    <div className="flex w-full justify-between gap-1">
                        <div className="w-1/2 h-1 bg-neutral-100 rounded-px" />
                        <div className="w-1/4 h-1 bg-neutral-100 rounded-px" />
                    </div>
                </div>
            ),
            executive: (
                <div className="w-full h-full bg-white p-2 flex flex-col items-center space-y-1 shadow-inner rounded">
                    <div className="w-1/3 h-1.5 bg-neutral-400 rounded-px" />
                    <div className="w-full h-2 bg-neutral-100 rounded-px mt-2" />
                    <div className="w-full h-px bg-neutral-200" />
                    <div className="w-full h-1 bg-neutral-50 rounded-px" />
                    <div className="w-full h-1 bg-neutral-50 rounded-px" />
                </div>
            ),
            diamond: (
                <div className="w-full h-full bg-white p-2 space-y-2 shadow-inner rounded">
                    <div className="w-2/3 h-2 bg-neutral-200 mx-auto" />
                    <div className="space-y-1">
                        <div className="flex items-center gap-1"><div className="w-1 h-1 bg-neutral-400 rotate-45" /><div className="flex-1 h-1 bg-neutral-100" /></div>
                        <div className="flex items-center gap-1 pl-2"><div className="w-full h-0.5 bg-neutral-50" /></div>
                        <div className="w-full border-t border-dotted border-neutral-200 mt-1" />
                        <div className="flex items-center gap-1"><div className="w-1 h-1 bg-neutral-400 rotate-45" /><div className="flex-1 h-1 bg-neutral-100" /></div>
                    </div>
                </div>
            ),
            twocol: (
                <div className="w-full h-full bg-white flex overflow-hidden rounded shadow-inner">
                    <div className="w-2/3 p-2 space-y-2 border-r border-neutral-100">
                        <div className="w-1/2 h-2 bg-neutral-200" />
                        <div className="w-full h-1 bg-neutral-100" />
                        <div className="w-full h-1 bg-neutral-100" />
                    </div>
                    <div className="flex-1 p-2 space-y-2 bg-neutral-50">
                        <div className="w-full h-1.5 bg-neutral-200" />
                        <div className="w-full h-1 bg-neutral-100" />
                    </div>
                </div>
            ),
            sharp: (
                <div className="w-full h-full bg-white p-2 space-y-2 shadow-inner rounded">
                    <div className="flex justify-between items-center mb-2">
                        <div className="w-1/3 h-3 bg-neutral-800" />
                        <div className="w-1/3 h-1 bg-neutral-200" />
                    </div>
                    <div className="w-1/2 h-2 bg-neutral-400" />
                    <div className="w-full border-b-2 border-neutral-800" />
                    <div className="w-full h-1 bg-neutral-100" />
                </div>
            ),
            accent: (
                <div className="w-full h-full bg-white p-2 space-y-2 shadow-inner rounded">
                    <div className="w-2/3 h-3 bg-neutral-900 mx-auto" />
                    <div className="space-y-1">
                        <div className="w-1/2 h-1.5 bg-blue-500" />
                        <div className="w-full h-1 bg-neutral-100" />
                        <div className="w-1/2 h-1.5 bg-blue-500" />
                        <div className="w-full h-1 bg-neutral-100" />
                    </div>
                </div>
            ),
            centered: (
                <div className="w-full h-full bg-white p-2 flex flex-col items-center space-y-1 shadow-inner rounded">
                    <div className="w-2/3 h-3 bg-neutral-800 mt-1" />
                    <div className="w-1/2 h-1.5 bg-neutral-200 italic font-serif" />
                    <div className="w-full h-px bg-neutral-300 my-1" />
                    <div className="w-full flex gap-1 mt-1">
                        <div className="flex-1 h-3 bg-neutral-50 border border-neutral-100" />
                        <div className="flex-1 h-3 bg-neutral-50 border border-neutral-100" />
                        <div className="flex-1 h-3 bg-neutral-50 border border-neutral-100" />
                    </div>
                </div>
            ),
            serifpro: (
                <div className="w-full h-full bg-white p-2 flex flex-col items-center space-y-1 shadow-inner rounded">
                    <div className="w-1/2 h-3 bg-neutral-900" />
                    <div className="flex gap-2 mb-2"><div className="w-1 h-1 bg-neutral-400 rounded-full" /><div className="w-1 h-1 bg-neutral-400 rounded-full" /><div className="w-1 h-1 bg-neutral-400 rounded-full" /></div>
                    <div className="w-full text-left h-2 bg-neutral-100 font-bold uppercase tracking-tighter" />
                    <div className="w-full h-px bg-neutral-900 mb-1" />
                    <div className="w-full h-1 bg-neutral-50 mb-1" />
                    <div className="w-full h-1 bg-neutral-50" />
                </div>
            ),
            minimal: (
                <div className="w-full h-full bg-white p-2 flex flex-col items-center space-y-1 shadow-inner rounded">
                    <div className="w-1/3 h-2 bg-neutral-300 mb-4" />
                    <div className="w-full flex gap-1">
                        {[1, 2, 3, 4].map(i => <div key={i} className="flex-1 h-2 bg-neutral-100" />)}
                    </div>
                    <div className="w-full h-2 bg-neutral-200 mt-2" />
                    <div className="w-full h-1 bg-neutral-50" />
                </div>
            )
        };
        return (
            <div className="w-16 h-20 shrink-0 bg-bg-secondary p-1 rounded-md border border-border-subtle">
                {layouts[type] || layouts.classic}
            </div>
        );
    };

    // ── Steps ──
    const steps = [
        {
            title: "Welcome! Let's build your resume.",
            subtitle: "We'll guide you through each section. It only takes a few minutes.",
            render: () => (
                <div className="text-center space-y-6 py-4">
                    <div className="text-6xl">📄</div>
                    <p className="text-text-secondary leading-relaxed">Create a professional, ATS-optimized resume for any field. Fill in each section and use the AI buttons to generate content automatically.</p>
                    <div className="grid grid-cols-3 gap-3 text-xs text-text-muted font-bold uppercase tracking-widest">
                        <div className="p-3 bg-bg-secondary rounded-xl border border-border-subtle">✨ AI-Powered</div>
                        <div className="p-3 bg-bg-secondary rounded-xl border border-border-subtle">🎯 ATS-Friendly</div>
                        <div className="p-3 bg-bg-secondary rounded-xl border border-border-subtle">📥 PDF Export</div>
                    </div>
                </div>
            )
        },
        {
            title: "Who are you?",
            subtitle: "Let's start with your contact details.",
            render: () => (
                <div className="space-y-4">
                    <div>
                        <input placeholder="Full Name *" value={formData.contact.name} onChange={e => updateField('contact.name', e.target.value)}
                            className={inputClass('name')} />
                        {err('name')}
                    </div>
                    <div>
                        <input placeholder="Email Address *" type="email" value={formData.contact.email} onChange={e => updateField('contact.email', e.target.value)}
                            className={inputClass('email')} />
                        {err('email')}
                    </div>
                    <div>
                        <input placeholder="Phone Number *" value={formData.contact.phone} onChange={e => updateField('contact.phone', e.target.value)}
                            className={inputClass('phone')} />
                        {err('phone')}
                    </div>
                    <div>
                        <input placeholder="City, Country *" value={formData.contact.location} onChange={e => updateField('contact.location', e.target.value)}
                            className={inputClass('location')} />
                        {err('location')}
                    </div>
                </div>
            )
        },
        {
            title: "What's your target role?",
            subtitle: "This helps us tailor suggestions and content.",
            render: () => (
                <div className="space-y-4">
                    <div>
                        <AutocompleteInput
                            value={formData.field}
                            onChange={val => updateField('field', val)}
                            placeholder="Target Job Title * (e.g. Full Stack Developer, Nurse, Teacher)"
                            className={inputClass('field')}
                            suggestions={JOB_TITLE_SUGGESTIONS}
                        />
                        {err('field')}
                    </div>
                    <div>
                        <select value={formData.experience_level} onChange={e => updateField('experience_level', e.target.value)}
                            className={inputClass('experience_level')}>
                            <option value="">Select Experience Level *</option>
                            <option value="Entry">Entry Level (0-2 years)</option>
                            <option value="Mid">Mid Level (3-5 years)</option>
                            <option value="Senior">Senior Level (5+ years)</option>
                            <option value="Executive">Executive</option>
                        </select>
                        {err('experience_level')}
                    </div>
                </div>
            )
        },
        {
            title: "Where can we find you online?",
            subtitle: "Add links relevant to your field — they boost credibility.",
            render: () => {
                // Show relevant link fields based on the target role
                const role = formData.field.toLowerCase();
                const isTech = ["developer", "engineer", "devops", "data", "ml", "ai", "programmer"].some(k => role.includes(k));
                const isDesign = ["designer", "ux", "ui", "graphic", "creative", "artist"].some(k => role.includes(k));
                const isWriter = ["writer", "content", "journalist", "blogger", "medium"].some(k => role.includes(k));

                return (
                    <div className="space-y-3">
                        <div>
                            <div className="flex items-center gap-3">
                                <span className="text-lg">🔗</span>
                                <div className="flex-1 flex gap-2">
                                    <input placeholder="LinkedIn URL" value={formData.contact.linkedin} onChange={e => updateField('contact.linkedin', e.target.value)}
                                        className={`flex-1 p-3 bg-bg-secondary border rounded-xl focus:border-brand-primary text-text-primary outline-none transition-all text-sm ${errors.linkedin ? 'border-red-500/50 bg-red-500/5' : 'border-border-subtle'}`} />
                                    <input placeholder="Display Text (e.g. LinkedIn)" value={formData.contact.linkedin_label} onChange={e => updateField('contact.linkedin_label', e.target.value)}
                                        className="w-1/3 p-3 bg-bg-secondary border border-border-subtle rounded-xl focus:border-brand-primary text-text-primary outline-none transition-all text-sm" />
                                </div>
                            </div>
                            {err('linkedin')}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <span className="text-lg">🌐</span>
                                <div className="flex-1 flex gap-2">
                                    <input placeholder="Portfolio / Website URL" value={formData.contact.portfolio} onChange={e => updateField('contact.portfolio', e.target.value)}
                                        className={`flex-1 p-3 bg-bg-secondary border rounded-xl focus:border-brand-primary text-text-primary outline-none transition-all text-sm ${errors.portfolio ? 'border-red-500/50 bg-red-500/5' : 'border-border-subtle'}`} />
                                    <input placeholder="Display Text (e.g. Website)" value={formData.contact.portfolio_label} onChange={e => updateField('contact.portfolio_label', e.target.value)}
                                        className="w-1/3 p-3 bg-bg-secondary border border-border-subtle rounded-xl focus:border-brand-primary text-text-primary outline-none transition-all text-sm" />
                                </div>
                            </div>
                            {err('portfolio')}
                        </div>
                        {(isTech || !role) && (
                            <div>
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">🐙</span>
                                    <div className="flex-1 flex gap-2">
                                        <input placeholder="GitHub URL" value={formData.contact.github} onChange={e => updateField('contact.github', e.target.value)}
                                            className={`flex-1 p-3 bg-bg-secondary border rounded-xl focus:border-brand-primary text-text-primary outline-none transition-all text-sm ${errors.github ? 'border-red-500/50 bg-red-500/5' : 'border-border-subtle'}`} />
                                        <input placeholder="Display Text (e.g. GitHub)" value={formData.contact.github_label} onChange={e => updateField('contact.github_label', e.target.value)}
                                            className="w-1/3 p-3 bg-bg-secondary border border-border-subtle rounded-xl focus:border-brand-primary text-text-primary outline-none transition-all text-sm" />
                                    </div>
                                </div>
                                {err('github')}
                            </div>
                        )}
                        {isDesign && (
                            <div className="flex items-center gap-3 ml-11">
                                <input placeholder="Behance URL" value={formData.contact.behance} onChange={e => updateField('contact.behance', e.target.value)} className="flex-1 p-3 bg-bg-secondary border border-border-subtle rounded-xl focus:border-brand-primary text-text-primary outline-none transition-all text-sm" />
                            </div>
                        )}
                        {(isWriter || !role) && (
                            <div className="flex items-center gap-3 ml-11">
                                <input placeholder="Medium / Blog URL" value={formData.contact.medium} onChange={e => updateField('contact.medium', e.target.value)} className="flex-1 p-3 bg-bg-secondary border border-border-subtle rounded-xl focus:border-brand-primary text-text-primary outline-none transition-all text-sm" />
                            </div>
                        )}
                        <div className="flex items-center gap-3 ml-11">
                            <input placeholder="Twitter / X URL (optional)" value={formData.contact.twitter} onChange={e => updateField('contact.twitter', e.target.value)} className="flex-1 p-3 bg-bg-secondary border border-border-subtle rounded-xl focus:border-brand-primary text-text-primary outline-none transition-all text-sm" />
                        </div>
                        {!role && (
                            <p className="text-xs text-text-muted mt-2">💡 Set your Target Job Title (Step 3) to see role-specific link suggestions.</p>
                        )}
                    </div>
                );
            }
        },
        {
            title: "Professional Summary",
            subtitle: "A brief overview of your career and value.",
            render: () => (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-text-secondary">Summary</label>
                        <AIButton onClick={handleGenerateSummary} label="AI Auto-Write" />
                    </div>
                    <div>
                        <textarea
                            value={formData.contact.summary}
                            onChange={e => updateField('contact.summary', e.target.value)}
                            placeholder="e.g. Results-oriented professional with 3+ years of experience..."
                            className={`w-full p-4 bg-bg-secondary border rounded-xl focus:border-brand-primary text-text-primary outline-none transition-all h-36 leading-relaxed resize-none ${errors.summary ? 'border-red-500/50 bg-red-500/5' : 'border-border-subtle'}`}
                        />
                        {err('summary')}
                    </div>
                    <p className="text-xs text-text-muted">💡 Click "AI Auto-Write" to generate a strong summary based on your target role and skills.</p>
                </div>
            )
        },
        {
            title: "Work Experience",
            subtitle: "Add your relevant job history.",
            render: () => (
                <div className="space-y-6">
                    {formData.experience.map((exp, idx) => (
                        <div key={idx} className="p-4 bg-bg-secondary border border-border-muted rounded-xl shadow-sm relative">
                            <button onClick={() => removeExperience(idx)} className="absolute top-2 right-2 text-red-400 hover:text-red-500 font-bold p-2">✕</button>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <AutocompleteInput
                                        value={exp.title}
                                        onChange={val => updateExperience(idx, 'title', val)}
                                        placeholder="Job Title *"
                                        className={`p-2 bg-bg-surface rounded-lg border w-full text-sm ${errors[`exp_title_${idx}`] ? 'border-red-500/50 bg-red-500/5' : 'border-border-muted'}`}
                                        suggestions={JOB_TITLE_SUGGESTIONS}
                                    />
                                    {err(`exp_title_${idx}`)}
                                </div>
                                <div>
                                    <input placeholder="Company / Organization *" value={exp.company} onChange={e => updateExperience(idx, 'company', e.target.value)}
                                        className={`p-2 bg-bg-surface rounded-lg border w-full text-sm ${errors[`exp_company_${idx}`] ? 'border-red-500/50 bg-red-500/5' : 'border-border-muted'}`} />
                                    {err(`exp_company_${idx}`)}
                                </div>
                                <div>
                                    <MonthYearPicker
                                        value={exp.start_date}
                                        onChange={val => updateExperience(idx, 'start_date', val)}
                                        placeholder="Start Date *"
                                    />
                                    {err(`exp_start_${idx}`)}
                                </div>
                                <MonthYearPicker
                                    value={exp.end_date}
                                    onChange={val => updateExperience(idx, 'end_date', val)}
                                    placeholder="End Date"
                                    allowPresent={true}
                                />
                            </div>
                            <div className="space-y-2 pl-4 border-l-2 border-border-muted">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-text-muted uppercase">Responsibilities / Achievements</span>
                                    <AIButton onClick={() => handleGenerateBullets(idx)} />
                                </div>
                                {exp.details.map((detail, dIdx) => (
                                    <div key={dIdx} className="flex gap-2">
                                        <input placeholder="• Key achievement or responsibility" value={detail} onChange={e => updateExperienceDetail(idx, dIdx, e.target.value)} className="flex-1 p-2 bg-bg-surface rounded-lg border border-border-muted text-sm text-text-primary" />
                                        <button onClick={() => removeExperienceDetail(idx, dIdx)} className="text-red-400 hover:text-red-600 px-1 transition-colors">✕</button>
                                    </div>
                                ))}
                                <button onClick={() => addExperienceDetail(idx)} className="text-xs text-brand-primary font-bold uppercase tracking-wide hover:underline">+ Add Bullet Point</button>
                            </div>
                        </div>
                    ))}
                    <button onClick={addExperience} className="w-full py-3 border-2 border-dashed border-border-muted rounded-xl text-text-muted font-bold hover:border-brand-primary hover:text-brand-primary transition-all">
                        + Add Job
                    </button>
                </div>
            )
        },
        {
            title: "Projects",
            subtitle: "Showcase your key projects — great for any field.",
            render: () => (
                <div className="space-y-6">
                    {formData.projects.map((proj, idx) => (
                        <div key={idx} className="p-4 bg-bg-secondary border border-border-muted rounded-xl shadow-sm relative">
                            <button onClick={() => removeProject(idx)} className="absolute top-2 right-2 text-red-400 hover:text-red-500 font-bold p-2">✕</button>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <input placeholder="Project / Initiative Name *" value={proj.title} onChange={e => updateProject(idx, 'title', e.target.value)}
                                        className={`p-2 bg-bg-surface rounded-lg border w-full text-sm ${errors[`proj_title_${idx}`] ? 'border-red-500/50 bg-red-500/5' : 'border-border-muted'}`} />
                                    {err(`proj_title_${idx}`)}
                                </div>
                                <input placeholder="Your Role (e.g. Lead Developer)" value={proj.role} onChange={e => updateProject(idx, 'role', e.target.value)} className="p-2 bg-bg-surface rounded-lg border border-border-muted w-full text-sm text-text-primary" />
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <input placeholder="Project Type (e.g. E-commerce, SaaS)" value={proj.type} onChange={e => updateProject(idx, 'type', e.target.value)}
                                    className="p-2 bg-bg-surface rounded-lg border border-border-muted w-full text-sm text-text-primary" />
                                <input placeholder="Technologies used (e.g. React, Node.js)" value={proj.tools} onChange={e => updateProject(idx, 'tools', e.target.value)}
                                    className="p-2 bg-bg-surface rounded-lg border border-border-muted w-full text-sm text-text-primary" />
                            </div>
                            <div className="space-y-2 pl-4 border-l-2 border-purple-500/30">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-text-muted uppercase">Project Highlights</span>
                                    <AIButton onClick={() => handleGenerateProjectBullets(idx)} label="AI Describe" />
                                </div>
                                {proj.details.map((detail, dIdx) => (
                                    <div key={dIdx} className="flex gap-2">
                                        <input placeholder="• What you built and its impact" value={detail} onChange={e => updateProjectDetail(idx, dIdx, e.target.value)} className="flex-1 p-2 bg-bg-surface rounded-lg border border-border-muted text-sm text-text-primary" />
                                        <button onClick={() => removeProjectDetail(idx, dIdx)} className="text-red-400 hover:text-red-600 px-1 transition-colors">✕</button>
                                    </div>
                                ))}
                                <button onClick={() => addProjectDetail(idx)} className="text-xs text-purple-400 font-bold uppercase tracking-wide hover:underline">+ Add Point</button>
                            </div>
                        </div>
                    ))}
                    <button onClick={addProject} className="w-full py-3 border-2 border-dashed border-purple-500/20 rounded-xl text-purple-400 font-bold hover:border-purple-400 hover:text-purple-300 transition-all">
                        + Add Project / Initiative
                    </button>
                </div>
            )
        },
        {
            title: "Education",
            subtitle: "Your academic background.",
            render: () => (
                <div className="space-y-4">
                    {formData.education.map((edu, idx) => (
                        <div key={idx} className="p-4 bg-bg-secondary border border-border-muted rounded-xl shadow-sm relative">
                            <button onClick={() => removeEducation(idx)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 font-bold px-2 transition-colors">✕</button>
                            <div className="grid grid-cols-1 gap-3">
                                <div>
                                    <input
                                        placeholder="Degree / Certification (e.g. B.Sc. Computer Science)"
                                        value={edu.degree}
                                        onChange={e => updateEducation(idx, 'degree', e.target.value)}
                                        className={`p-2 bg-bg-surface rounded-lg border w-full text-sm text-text-primary ${errors[`edu_degree_${idx}`] ? 'border-red-500/50 bg-red-500/5' : 'border-border-muted'
                                            }`}
                                    />
                                    {errors[`edu_degree_${idx}`] && <p className="text-xs text-red-400 mt-1">{errors[`edu_degree_${idx}`]}</p>}
                                </div>
                                <div>
                                    <input
                                        placeholder="University / Institution"
                                        value={edu.school}
                                        onChange={e => updateEducation(idx, 'school', e.target.value)}
                                        className={`p-2 bg-bg-surface rounded-lg border w-full text-sm text-text-primary ${errors[`edu_school_${idx}`] ? 'border-red-500/50 bg-red-500/5' : 'border-border-muted'
                                            }`}
                                    />
                                    {errors[`edu_school_${idx}`] && <p className="text-xs text-red-400 mt-1">{errors[`edu_school_${idx}`]}</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1 block">Start Year *</label>
                                        <YearPicker
                                            value={edu.start_year}
                                            onChange={val => updateEducation(idx, 'start_year', val)}
                                            placeholder="Start Year *"
                                        />
                                        {err(`edu_start_${idx}`)}
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1 block">End Year / Graduation</label>
                                        <YearPicker
                                            value={edu.end_year}
                                            onChange={val => updateEducation(idx, 'end_year', val)}
                                            placeholder="End Year"
                                            allowPresent={true}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    <button onClick={addEducation} className="w-full py-3 border-2 border-dashed border-border-muted rounded-xl text-text-muted font-bold hover:border-brand-primary hover:text-brand-primary transition-all">
                        + Add Education
                    </button>
                </div>
            )
        },
        {
            title: "Skills",
            subtitle: "Add your top skills — we'll suggest based on your role.",
            render: () => {
                const suggestions = getSkillSuggestions(formData.field, formData.skills);
                return (
                    <div className="space-y-4">
                        {/* Added skills */}
                        <div className="flex flex-wrap gap-2 min-h-[40px]">
                            {formData.skills.map((skill, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-brand-primary/10 text-brand-primary px-3 py-1 rounded-full text-sm font-bold border border-brand-primary/20">
                                    {skill}
                                    <button onClick={() => removeSkill(idx)} className="hover:text-red-400 transition-colors">✕</button>
                                </div>
                            ))}
                        </div>

                        {/* Manual input */}
                        <input
                            value={skillInput}
                            onChange={e => setSkillInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addSkill(skillInput);
                                    setSkillInput('');
                                }
                            }}
                            placeholder="Type a skill and press Enter..."
                            className="w-full p-3 bg-bg-secondary border border-border-muted rounded-xl focus:border-brand-primary text-text-primary outline-none"
                        />

                        {/* Suggestions */}
                        {suggestions.length > 0 && (
                            <div>
                                <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2">
                                    💡 Suggested for <span className="text-brand-primary">{formData.field || 'your role'}</span>
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {suggestions.slice(0, 16).map((s, i) => (
                                        <button key={i} onClick={() => addSkill(s)}
                                            className="text-xs px-3 py-1.5 rounded-full border border-border-muted text-text-secondary hover:border-brand-primary hover:text-brand-primary hover:bg-brand-primary/5 transition-all font-medium">
                                            + {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            title: "Review & Generate",
            subtitle: "Choose a template and create your resume.",
            render: () => (
                <div className="space-y-6">
                    {/* Template grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { id: 'classic', icon: '📋', name: 'Classic Serif', desc: 'Traditional single-column serif. Best for corporate & legal.' },
                            { id: 'executive', icon: '🏛️', name: 'Executive', desc: 'Clean serif with profile section. Best for senior roles.' },
                            { id: 'diamond', icon: '♦️', name: 'Diamond', desc: 'Diamond bullets & dotted lines. Best for professional services.' },
                            { id: 'sharp', icon: '⚡', name: 'Sharp', desc: 'Bold sans-serif with underlines. Best for marketing & sales.' },
                            { id: 'twocol', icon: '📐', name: 'Two Column', desc: 'Experience left, skills right. Best for engineers & analysts.' },
                            { id: 'accent', icon: '🔵', name: 'Accent', desc: 'Colored company names & achievement grid. Best for finance & audit.' },
                            { id: 'centered', icon: '🎯', name: 'Centered', desc: 'Centered italic headers, 3-col achievements. Best for analysts.' },
                            { id: 'serifpro', icon: '📜', name: 'Serif Pro', desc: 'Icon contacts, justified text, serif. Best for product & management.' },
                            { id: 'minimal', icon: '🪶', name: 'Minimal', desc: 'Education-first, 4-col skills grid. Best for data & engineering.' },
                        ].map(t => (
                            <button key={t.id} onClick={() => setSelectedTemplate(t.id)}
                                className={`p-3 rounded-2xl border-2 text-left transition-all flex gap-3 h-full items-start ${selectedTemplate === t.id ? 'border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary' : 'border-border-muted hover:border-border-subtle bg-bg-surface'}`}>
                                <TemplatePreview type={t.id} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-sm truncate text-text-primary">{t.name}</span>
                                        {selectedTemplate === t.id && <span className="text-brand-primary text-[10px] font-black shrink-0">✓</span>}
                                    </div>
                                    <div className="text-[10px] text-text-muted leading-tight line-clamp-2">{t.desc}</div>
                                </div>
                            </button>
                        ))}
                    </div>

                    <button onClick={handleSaveAndPreview} disabled={loading}
                        className="w-full py-4 bg-brand-primary text-black rounded-xl font-black uppercase tracking-widest hover:bg-brand-hover transition-all shadow-xl shadow-brand-primary/20 disabled:opacity-50">
                        {loading ? 'Generating...' : '✨ Generate Preview'}
                    </button>

                    {resumeId && (
                        <div className="animate-fade-in space-y-4">
                            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-400 font-bold">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Resume Generated Successfully!
                            </div>
                            <div className="h-[600px] border border-border-muted rounded-2xl overflow-hidden bg-bg-secondary">
                                {previewHtml && <iframe srcDoc={previewHtml} className="w-full h-full" title="Preview" />}
                            </div>
                            <button onClick={handlePrint}
                                className="w-full py-4 bg-brand-primary text-black rounded-xl font-black uppercase tracking-widest hover:bg-brand-hover transition-all shadow-xl shadow-brand-primary/20 flex items-center justify-center gap-2">
                                🖨️ Print / Save as PDF (Browser)
                            </button>
                            <div className="relative flex items-center py-1">
                                <div className="flex-grow border-t border-border-muted"></div>
                                <span className="flex-shrink mx-4 text-text-muted text-[10px] font-bold uppercase tracking-widest">or try</span>
                                <div className="flex-grow border-t border-border-muted"></div>
                            </div>
                            <button onClick={handleDownload}
                                className="w-full py-3 border-2 border-border-muted text-text-muted rounded-xl font-bold uppercase tracking-widest hover:border-text-primary hover:text-text-primary transition-all text-xs flex items-center justify-center gap-2">
                                📥 Native PDF Download
                            </button>
                            <p className="text-[10px] text-text-muted text-center px-4 leading-relaxed">
                                💡 <b>Recommended:</b> Use the "Print" button. <br />
                                <b>Important:</b> In the print window, uncheck <b>"Headers and footers"</b> to get a clean PDF.
                            </p>
                        </div>
                    )}
                </div>
            )
        }
    ];

    const isLastStep = currentStep === steps.length - 1;

    return (
        <div className="min-h-screen bg-bg-primary flex flex-col">
            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-bg-secondary">
                <div
                    className="h-full bg-gradient-to-r from-brand-primary to-brand-hover transition-all duration-500 ease-out"
                    style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
                <div className="w-full max-w-2xl">
                    <div className="text-center mb-4">
                        <span className="text-xs font-bold text-text-muted uppercase tracking-widest">
                            Step {currentStep + 1} of {steps.length}
                        </span>
                    </div>

                    <div className="mb-8 text-center">
                        <h1 className="text-3xl md:text-4xl font-black text-text-primary mb-3 tracking-tight">
                            {steps[currentStep].title}
                        </h1>
                        <p className="text-text-muted font-medium text-lg">
                            {steps[currentStep].subtitle}
                        </p>
                    </div>

                    <div className="bg-bg-surface rounded-3xl p-8 shadow-xl shadow-black/5 border border-border-muted mb-8">
                        {steps[currentStep].render()}
                    </div>

                    <div className="flex justify-between items-center px-4">
                        <button
                            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                            disabled={currentStep === 0}
                            className={`font-bold text-text-muted uppercase tracking-widest text-xs hover:text-text-primary transition-colors ${currentStep === 0 ? 'opacity-0 cursor-default' : ''}`}>
                            ← Back
                        </button>

                        <div className="flex gap-1.5">
                            {steps.map((_, idx) => (
                                <button key={idx} onClick={() => setCurrentStep(idx)}
                                    className={`rounded-full transition-all ${idx === currentStep ? 'w-6 h-2 bg-brand-primary' : 'w-2 h-2 bg-border-muted hover:bg-border-subtle'}`}
                                />
                            ))}
                        </div>

                        {!isLastStep ? (
                            <button
                                onClick={handleNext}
                                className="bg-brand-primary text-black px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-brand-hover transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-brand-primary/20">
                                Next →
                            </button>
                        ) : (
                            <div className="w-24" />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
