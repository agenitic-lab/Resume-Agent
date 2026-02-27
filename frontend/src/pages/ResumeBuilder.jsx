import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createResume, getResumeLatexSource, downloadResume, generateResumeBullets, generateResumeSummary, generateProjectBullets, getApiKeyStatus, getTemplatePreference } from '../services/api';
import toast from 'react-hot-toast';
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Skeleton } from '../components/ui/skeleton';
import PdfViewer from '../components/PdfViewer';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
                <div className="absolute z-50 w-full bg-surface border border-gray-200 rounded-xl shadow-xl mt-1 overflow-hidden">
                    {filtered.map((s, i) => (
                        <button key={i} onMouseDown={() => handleSelect(s)}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-brand hover:text-black transition-colors font-medium">
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
                className="w-full p-2 bg-secondary rounded-lg border border-gray-100 text-left text-sm flex items-center justify-between"
            >
                <span className={value ? 'text-primary' : 'text-gray-500'}>
                    {value || placeholder}
                </span>
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </button>

            {open && (
                <div className="absolute z-50 w-64 bg-surface border border-gray-200 rounded-2xl shadow-2xl mt-1 p-3 left-0">
                    {/* Year selector */}
                    <div className="mb-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Year</label>
                        <div className="grid grid-cols-4 gap-1 max-h-28 overflow-y-auto">
                            {years.map(y => (
                                <button key={y} type="button"
                                    onClick={() => setSelectedYear(String(y))}
                                    className={`text-xs py-1 rounded-lg font-medium transition-all ${selectedYear === String(y) ? 'bg-brand text-white' : 'hover:bg-secondary text-secondary'}`}>
                                    {y}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Month selector */}
                    <div className="mb-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Month</label>
                        <div className="grid grid-cols-4 gap-1">
                            {MONTHS.map(m => (
                                <button key={m} type="button"
                                    onClick={() => {
                                        setSelectedMonth(m);
                                        if (selectedYear) handleSelect(m, selectedYear);
                                    }}
                                    className={`text-xs py-1 rounded-lg font-medium transition-all ${selectedMonth === m ? 'bg-brand text-white' : 'hover:bg-secondary text-secondary'}`}>
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
                className="w-full p-2 bg-secondary rounded-lg border border-gray-100 text-left text-sm flex items-center justify-between">
                <span className={value ? 'text-primary' : 'text-gray-500'}>{value || placeholder}</span>
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </button>
            {open && (
                <div className="absolute z-50 w-48 bg-surface border border-gray-200 rounded-2xl shadow-2xl mt-1 p-3 left-0">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Select Year</label>
                    <div className="grid grid-cols-3 gap-1 max-h-40 overflow-y-auto">
                        {years.map(y => (
                            <button key={y} type="button"
                                onClick={() => { onChange(String(y)); setOpen(false); }}
                                className={`text-xs py-1.5 rounded-lg font-medium transition-all ${value === String(y) ? 'bg-brand text-white' : 'hover:bg-secondary text-secondary'
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
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [resumeId, setResumeId] = useState(null);
    const [previewHtml, setPreviewHtml] = useState(null);
    const [selectedTemplate, setSelectedTemplate] = useState('clean_modern');
    const [skillInput, setSkillInput] = useState('');
    const [errors, setErrors] = useState({});
    const [hasApiKey, setHasApiKey] = useState(null); // null = loading, true/false = resolved
    const [latexCode, setLatexCode] = useState('');
    const [isCompiling, setIsCompiling] = useState(false);

    useEffect(() => {
        getTemplatePreference().then(res => {
            if (res && res.template_id) {
                setSelectedTemplate(res.template_id);
            }
        }).catch(err => {
            console.error("Failed to fetch template preference:", err);
            // Fallback to clean_modern if fetching fails
            setSelectedTemplate('clean_modern');
        });
    }, []);

    // Check whether the user has a stored API key on mount.
    // All AI generation features require it — surface a clear warning early.
    useEffect(() => {
        getApiKeyStatus()
            .then(status => setHasApiKey(Boolean(status.has_api_key)))
            .catch(() => setHasApiKey(false));
    }, []);

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
            case 4: // Links
                if (formData.contact.linkedin && !urlRegex.test(formData.contact.linkedin)) newErrors.linkedin = 'Invalid LinkedIn URL';
                if (formData.contact.portfolio && !urlRegex.test(formData.contact.portfolio)) newErrors.portfolio = 'Invalid Portfolio URL';
                if (formData.contact.github && !urlRegex.test(formData.contact.github)) newErrors.github = 'Invalid GitHub URL';
                if (formData.contact.twitter && !urlRegex.test(formData.contact.twitter)) newErrors.twitter = 'Invalid Twitter URL';
                if (formData.contact.behance && !urlRegex.test(formData.contact.behance)) newErrors.behance = 'Invalid Behance URL';
                if (formData.contact.medium && !urlRegex.test(formData.contact.medium)) newErrors.medium = 'Invalid Medium URL';
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
            case 9: // Summary
                if (formData.contact.summary.trim().length < 50) newErrors.summary = 'Summary should be at least 50 characters for a professional look.';
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
        `w-full px-5 py-4 bg-white border rounded-xl focus:ring-2 focus:ring-brand focus:border-transparent text-primary outline-none transition-all text-base font-medium ${errors[key] ? 'border-red-500 ring-1 ring-red-500 bg-red-50' : 'border-gray-100'
        }`;
    const hasAutoCompiled = useRef(false);

    const handleSaveAndPreview = async () => {
        setLoading(true);
        try {
            // 1. Save resume to get ID
            const res = await createResume(formData);
            setResumeId(res.resume_id);

            // 2. Fetch raw LaTeX source for the editor
            const sourceData = await getResumeLatexSource(res.resume_id, selectedTemplate);
            if (sourceData && sourceData.latex_code) {
                setLatexCode(sourceData.latex_code);
                hasAutoCompiled.current = false; // Reset so useEffect will auto-compile the new source
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate preview");
        } finally {
            setLoading(false);
        }
    };

    const compileLatex = useCallback(async (code) => {
        setIsCompiling(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/latex/compile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latex_code: code }),
            });

            if (!response.ok) {
                let detail = 'LaTeX compilation failed';
                try {
                    const errData = await response.json();
                    detail = errData.detail || errData.message || detail;
                } catch { /* non-JSON response */ }
                throw new Error(detail);
            }

            const blob = await response.blob();

            if (previewHtml) {
                window.URL.revokeObjectURL(previewHtml);
            }

            setPreviewHtml(window.URL.createObjectURL(blob));
        } catch (err) {
            toast.error(`Failed to compile LaTeX: ${err.message}`);
        } finally {
            setIsCompiling(false);
        }
    }, [previewHtml]);

    // auto-compile when latex code is first loaded
    useEffect(() => {
        if (latexCode && !hasAutoCompiled.current) {
            hasAutoCompiled.current = true;
            compileLatex(latexCode);
        }
    }, [latexCode, compileLatex]);

    const handleRecompile = () => compileLatex(latexCode);

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



    const handleGenerateSummary = async () => {
        if (!formData.field) { toast.error("Please enter a Target Job Title first (Step 3)."); return; }
        const toastId = toast.loading("AI is writing your professional summary...");
        try {
            const data = await generateResumeSummary({
                current_role: formData.field,
                experience_level: formData.experience_level || "Mid",
                keywords: formData.skills,
                experience: formData.experience,
                projects: formData.projects,
                education: formData.education,
                skills: formData.skills
            });
            if (data.summary) {
                updateField('contact.summary', data.summary);
                toast.success("Summary generated!", { id: toastId });
            } else {
                toast.error("No summary was generated.", { id: toastId });
            }
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Failed to generate summary.", { id: toastId });
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
            toast.error(error.message || "Failed to generate bullets.", { id: toastId });
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
            toast.error(error.message || "Failed to generate project bullets.", { id: toastId });
        }
    };

    // ── AI Button ──
    const AIButton = ({ onClick, label = "AI Generate" }) => (
        <Button onClick={onClick} variant="outline" size="sm" type="button"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide border-gray-200 hover:bg-brand/10 hover:text-brand hover:border-brand/30 transition-all rounded-lg">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {label}
        </Button>
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
            <div className="w-16 h-20 shrink-0 bg-secondary p-1 rounded-md border border-gray-100">
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
                <div className="text-center space-y-8 py-6">
                    <div className="text-7xl animate-bounce duration-[3s]">📄</div>
                    <p className="text-slate-600 text-lg leading-relaxed font-medium">Create a professional, ATS-optimized resume for any field. Fill in each section and use the AI buttons to generate content automatically.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">
                        <div className="p-4 bg-secondary rounded-2xl border border-gray-100 shadow-sm">✨ AI-Powered</div>
                        <div className="p-4 bg-secondary rounded-2xl border border-gray-100 shadow-sm">🎯 ATS-Friendly</div>
                        <div className="p-4 bg-secondary rounded-2xl border border-gray-100 shadow-sm">📥 PDF Export</div>
                    </div>
                </div>
            )
        },
        {
            title: "Who are you?",
            subtitle: "Let's start with your contact details.",
            render: () => (
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                        <input placeholder="e.g. John Doe" value={formData.contact.name} onChange={e => updateField('contact.name', e.target.value)}
                            className={inputClass('name')} />
                        {err('name')}
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                        <input placeholder="e.g. john@example.com" type="email" value={formData.contact.email} onChange={e => updateField('contact.email', e.target.value)}
                            className={inputClass('email')} />
                        {err('email')}
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Phone Number</label>
                        <input placeholder="e.g. +1 (555) 000-0000" value={formData.contact.phone} onChange={e => updateField('contact.phone', e.target.value)}
                            className={inputClass('phone')} />
                        {err('phone')}
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Current Location</label>
                        <input placeholder="e.g. New York, USA" value={formData.contact.location} onChange={e => updateField('contact.location', e.target.value)}
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
                <div className="space-y-6 text-left">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Target Job Title</label>
                        <AutocompleteInput
                            value={formData.field}
                            onChange={val => updateField('field', val)}
                            placeholder="e.g. Full Stack Developer"
                            className={inputClass('field')}
                            suggestions={JOB_TITLE_SUGGESTIONS}
                        />
                        {err('field')}
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Experience Level</label>
                        <select value={formData.experience_level} onChange={e => updateField('experience_level', e.target.value)}
                            className={inputClass('experience_level')}>
                            <option value="">Select Level...</option>
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
                    <div className="space-y-5 text-left">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">LinkedIn Profile</label>
                            <div className="flex gap-2">
                                <input placeholder="Profile URL" value={formData.contact.linkedin} onChange={e => updateField('contact.linkedin', e.target.value)}
                                    className={`flex-1 p-4 bg-secondary border rounded-xl focus:border-brand-primary text-primary outline-none transition-all text-base font-medium ${errors.linkedin ? 'border-red-500/50 bg-red-500/5' : 'border-gray-100'}`} />
                                <input placeholder="Label" value={formData.contact.linkedin_label} onChange={e => updateField('contact.linkedin_label', e.target.value)}
                                    className="w-full sm:w-1/3 p-4 bg-secondary border border-gray-100 rounded-xl focus:border-brand-primary text-primary outline-none transition-all text-base font-medium" />
                            </div>
                            {err('linkedin')}
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Portfolio / Personal Website</label>
                            <div className="flex gap-2">
                                <input placeholder="Website URL" value={formData.contact.portfolio} onChange={e => updateField('contact.portfolio', e.target.value)}
                                    className={`flex-1 p-4 bg-secondary border rounded-xl focus:border-brand-primary text-primary outline-none transition-all text-base font-medium ${errors.portfolio ? 'border-red-500/50 bg-red-500/5' : 'border-gray-100'}`} />
                                <input placeholder="Label" value={formData.contact.portfolio_label} onChange={e => updateField('contact.portfolio_label', e.target.value)}
                                    className="w-full sm:w-1/3 p-4 bg-secondary border border-gray-100 rounded-xl focus:border-brand-primary text-primary outline-none transition-all text-base font-medium" />
                            </div>
                            {err('portfolio')}
                        </div>
                        {(isTech || !role) && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">GitHub Repository</label>
                                <div className="flex gap-2">
                                    <input placeholder="GitHub URL" value={formData.contact.github} onChange={e => updateField('contact.github', e.target.value)}
                                        className={`flex-1 p-4 bg-secondary border rounded-xl focus:border-brand-primary text-primary outline-none transition-all text-base font-medium ${errors.github ? 'border-red-500/50 bg-red-500/5' : 'border-gray-100'}`} />
                                    <input placeholder="Label" value={formData.contact.github_label} onChange={e => updateField('contact.github_label', e.target.value)}
                                        className="w-full sm:w-1/3 p-4 bg-secondary border border-gray-100 rounded-xl focus:border-brand-primary text-primary outline-none transition-all text-base font-medium" />
                                </div>
                                {err('github')}
                            </div>
                        )}
                        {isDesign && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Behance Portfolio</label>
                                <input placeholder="Behance URL" value={formData.contact.behance} onChange={e => updateField('contact.behance', e.target.value)} className="w-full p-4 bg-secondary border border-gray-100 rounded-xl focus:border-brand-primary text-primary outline-none transition-all text-base font-medium" />
                            </div>
                        )}
                        {(isWriter || !role) && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Medium / Blog</label>
                                <input placeholder="Medium URL" value={formData.contact.medium} onChange={e => updateField('contact.medium', e.target.value)} className="w-full p-4 bg-secondary border border-gray-100 rounded-xl focus:border-brand-primary text-primary outline-none transition-all text-base font-medium" />
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Social / Other (Twitter, etc.)</label>
                            <input placeholder="Profile URL" value={formData.contact.twitter} onChange={e => updateField('contact.twitter', e.target.value)} className="w-full p-4 bg-secondary border border-gray-100 rounded-xl focus:border-brand-primary text-primary outline-none transition-all text-base font-medium" />
                        </div>
                        {!role && (
                            <p className="text-xs text-slate-500 mt-2 font-medium italic">💡 Set your Target Job Title to see role-specific suggestions.</p>
                        )}
                    </div>
                );
            }
        },
        {
            title: "Work Experience",
            subtitle: "Add your relevant job history.",
            render: () => (
                <div className="space-y-10">
                    {formData.experience.map((exp, idx) => (
                        <div key={idx} className="bg-surface border border-gray-100 rounded-[2rem] p-8 shadow-2xl shadow-black/5 relative transition-all hover:shadow-black/10">
                            {/* Card Header */}
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <span className="text-xs font-black uppercase tracking-[0.2em] text-brand bg-brand/5 px-3 py-1 rounded-full mb-3 inline-block">
                                        Work Experience #{idx + 1}
                                    </span>
                                    <h3 className="text-2xl font-black text-primary tracking-tight">
                                        {exp.title || "Job Title"}
                                    </h3>
                                    <p className="text-slate-500 font-semibold mt-1">
                                        {exp.company || "Company Name"}
                                    </p>
                                </div>
                                <button
                                    onClick={() => removeExperience(idx)}
                                    className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                    title="Remove Experience"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Form Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Job Title</label>
                                    <AutocompleteInput
                                        value={exp.title}
                                        onChange={val => updateExperience(idx, 'title', val)}
                                        placeholder="e.g. Software Engineer"
                                        className={`p-4 bg-secondary rounded-xl border w-full text-base font-medium transition-all focus:ring-2 focus:ring-brand/20 ${errors[`exp_title_${idx}`] ? 'border-red-500/30 bg-red-50/50' : 'border-gray-100 hover:border-gray-200'}`}
                                        suggestions={JOB_TITLE_SUGGESTIONS}
                                    />
                                    {err(`exp_title_${idx}`)}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Company</label>
                                    <input
                                        placeholder="e.g. Google"
                                        value={exp.company}
                                        onChange={e => updateExperience(idx, 'company', e.target.value)}
                                        className={`p-4 bg-secondary rounded-xl border w-full text-base font-medium transition-all focus:ring-2 focus:ring-brand/20 ${errors[`exp_company_${idx}`] ? 'border-red-500/30 bg-red-50/50' : 'border-gray-100 hover:border-gray-200'}`}
                                    />
                                    {err(`exp_company_${idx}`)}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Start Date</label>
                                    <MonthYearPicker
                                        value={exp.start_date}
                                        onChange={val => updateExperience(idx, 'start_date', val)}
                                        placeholder="Select Date"
                                    />
                                    {err(`exp_start_${idx}`)}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">End Date</label>
                                    <MonthYearPicker
                                        value={exp.end_date}
                                        onChange={val => updateExperience(idx, 'end_date', val)}
                                        placeholder="Present"
                                        allowPresent={true}
                                    />
                                </div>
                            </div>

                            {/* Detail Section */}
                            <div className="pt-8 border-t border-gray-100 space-y-6">
                                <div className="flex justify-between items-end pb-2">
                                    <div>
                                        <h4 className="text-sm font-black text-secondary uppercase tracking-[0.15em] mb-1">Impact & Responsibilities</h4>
                                        <p className="text-xs text-slate-500 font-medium italic">Describe your key achievements using action verbs.</p>
                                    </div>
                                    <AIButton onClick={() => handleGenerateBullets(idx)} />
                                </div>

                                <div className="space-y-4">
                                    {exp.details.map((detail, dIdx) => (
                                        <div key={dIdx} className="group flex gap-3 items-center animate-in fade-in slide-in-from-left-2 duration-300">
                                            <div className="w-2 h-2 rounded-full bg-brand/30 shrink-0 group-hover:bg-brand transition-colors" />
                                            <input
                                                placeholder="e.g. Optimized database queries reducing latency by 40%"
                                                value={detail}
                                                onChange={e => updateExperienceDetail(idx, dIdx, e.target.value)}
                                                className="flex-1 p-4 bg-secondary/70 rounded-xl border border-transparent hover:border-gray-200 focus:border-brand/30 focus:bg-white text-base text-primary transition-all outline-none font-medium"
                                            />
                                            <button
                                                onClick={() => removeExperienceDetail(idx, dIdx)}
                                                className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all font-bold"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => addExperienceDetail(idx)}
                                    className="w-full py-5 mt-2 border-2 border-dotted border-gray-200 rounded-xl text-xs font-black text-slate-400 uppercase tracking-widest hover:border-brand/30 hover:text-brand hover:bg-brand/5 transition-all shadow-sm"
                                >
                                    + Add Bullet Point
                                </button>
                            </div>
                        </div>
                    ))}
                    <button
                        onClick={addExperience}
                        className="w-full py-6 border-2 border-dashed border-gray-200 rounded-[2rem] text-slate-500 font-black uppercase tracking-[0.2em] text-sm hover:border-brand hover:text-brand hover:bg-brand/5 transition-all shadow-md flex items-center justify-center gap-3 group"
                    >
                        <span className="text-2xl group-hover:scale-125 transition-transform">+</span> Add New Work Experience
                    </button>
                </div>
            )
        },
        {
            title: "Projects",
            subtitle: "Showcase your key projects — great for any field.",
            render: () => (
                <div className="space-y-10">
                    {formData.projects.map((proj, idx) => (
                        <div key={idx} className="bg-surface border border-gray-100 rounded-[2rem] p-8 shadow-2xl shadow-black/5 relative transition-all hover:shadow-black/10">
                            {/* Card Header */}
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <span className="text-xs font-black uppercase tracking-[0.2em] text-purple-600 bg-purple-50 px-3 py-1 rounded-full mb-3 inline-block">
                                        Project / Initiative #{idx + 1}
                                    </span>
                                    <h3 className="text-2xl font-black text-primary tracking-tight">
                                        {proj.title || "Project Title"}
                                    </h3>
                                    <p className="text-slate-500 font-semibold mt-1">
                                        {proj.role || "Your Role"}
                                    </p>
                                </div>
                                <button
                                    onClick={() => removeProject(idx)}
                                    className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                    title="Remove Project"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Form Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Project Name</label>
                                    <input
                                        placeholder="e.g. AI Portfolio Generator"
                                        value={proj.title}
                                        onChange={e => updateProject(idx, 'title', e.target.value)}
                                        className={`p-4 bg-secondary rounded-xl border w-full text-base font-medium transition-all focus:ring-2 focus:ring-purple-500/20 ${errors[`proj_title_${idx}`] ? 'border-red-500/30 bg-red-50/50' : 'border-gray-100 hover:border-gray-200'}`}
                                    />
                                    {err(`proj_title_${idx}`)}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Your Role</label>
                                    <input
                                        placeholder="e.g. Lead Frontend Engineer"
                                        value={proj.role}
                                        onChange={e => updateProject(idx, 'role', e.target.value)}
                                        className="p-4 bg-secondary rounded-xl border border-gray-100 hover:border-gray-200 w-full text-base font-medium transition-all focus:ring-2 focus:ring-purple-500/20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Project Category</label>
                                    <input
                                        placeholder="e.g. E-commerce, Mobile App"
                                        value={proj.type}
                                        onChange={e => updateProject(idx, 'type', e.target.value)}
                                        className="p-4 bg-secondary rounded-xl border border-gray-100 hover:border-gray-200 w-full text-base font-medium transition-all focus:ring-2 focus:ring-purple-500/20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Stack / Tools</label>
                                    <input
                                        placeholder="e.g. React, Node.js, AWS"
                                        value={proj.tools}
                                        onChange={e => updateProject(idx, 'tools', e.target.value)}
                                        className="p-4 bg-secondary rounded-xl border border-gray-100 hover:border-gray-200 w-full text-base font-medium transition-all focus:ring-2 focus:ring-purple-500/20"
                                    />
                                </div>
                            </div>

                            {/* Detail Section */}
                            <div className="pt-8 border-t border-gray-100 space-y-6">
                                <div className="flex justify-between items-end pb-2">
                                    <div>
                                        <h4 className="text-sm font-black text-secondary uppercase tracking-[0.15em] mb-1">Highlights & Achievements</h4>
                                        <p className="text-xs text-slate-500 font-medium italic">Describe what you built and the impact it had.</p>
                                    </div>
                                    <AIButton onClick={() => handleGenerateProjectBullets(idx)} label="AI Describe" />
                                </div>

                                <div className="space-y-4">
                                    {proj.details.map((detail, dIdx) => (
                                        <div key={dIdx} className="group flex gap-3 items-center animate-in fade-in slide-in-from-left-2 duration-300">
                                            <div className="w-2 h-2 rounded-full bg-purple-500/30 shrink-0 group-hover:bg-purple-500 transition-colors" />
                                            <input
                                                placeholder="e.g. Scaled system to handle 10k+ concurrent users"
                                                value={detail}
                                                onChange={e => updateProjectDetail(idx, dIdx, e.target.value)}
                                                className="flex-1 p-4 bg-secondary/70 rounded-xl border border-transparent hover:border-gray-200 focus:border-purple-500/30 focus:bg-white text-base text-primary transition-all outline-none font-medium"
                                            />
                                            <button
                                                onClick={() => removeProjectDetail(idx, dIdx)}
                                                className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all font-bold"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => addProjectDetail(idx)}
                                    className="w-full py-5 mt-2 border-2 border-dotted border-gray-200 rounded-xl text-xs font-black text-slate-400 uppercase tracking-widest hover:border-purple-500/30 hover:text-purple-500 hover:bg-purple-50/5 transition-all shadow-sm"
                                >
                                    + Add Detail Point
                                </button>
                            </div>
                        </div>
                    ))}
                    <button
                        onClick={addProject}
                        className="w-full py-6 border-2 border-dashed border-gray-100 rounded-[2rem] text-slate-500 font-black uppercase tracking-[0.2em] text-sm hover:border-purple-500 hover:text-purple-500 hover:bg-purple-50/5 transition-all shadow-md flex items-center justify-center gap-3 group"
                    >
                        <span className="text-2xl group-hover:scale-125 transition-transform">+</span> Add New Project / Initiative
                    </button>
                </div>
            )
        },
        {
            title: "Education",
            subtitle: "Your academic background.",
            render: () => (
                <div className="space-y-8">
                    {formData.education.map((edu, idx) => (
                        <div key={idx} className="bg-surface border border-gray-100 rounded-[2rem] p-8 shadow-2xl shadow-black/5 relative transition-all hover:shadow-black/10">
                            {/* Card Header */}
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <span className="text-xs font-black uppercase tracking-[0.2em] text-brand bg-brand/5 px-3 py-1 rounded-full mb-3 inline-block">
                                        Education #{idx + 1}
                                    </span>
                                    <h3 className="text-2xl font-black text-primary tracking-tight">
                                        {edu.degree || "Degree / Certification"}
                                    </h3>
                                    <p className="text-slate-500 font-semibold mt-1">
                                        {edu.school || "University / Institution"}
                                    </p>
                                </div>
                                <button
                                    onClick={() => removeEducation(idx)}
                                    className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                    title="Remove Education"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Degree / Course</label>
                                    <input
                                        placeholder="e.g. B.Sc. Computer Science"
                                        value={edu.degree}
                                        onChange={e => updateEducation(idx, 'degree', e.target.value)}
                                        className={`p-4 bg-secondary rounded-xl border w-full text-base font-medium transition-all focus:ring-2 focus:ring-brand/20 ${errors[`edu_degree_${idx}`] ? 'border-red-500/30 bg-red-50/50' : 'border-gray-100 hover:border-gray-200'}`}
                                    />
                                    {errors[`edu_degree_${idx}`] && <p className="text-xs font-bold text-red-400 mt-1 ml-1 italic">{errors[`edu_degree_${idx}`]}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Institution</label>
                                    <input
                                        placeholder="e.g. Stanford University"
                                        value={edu.school}
                                        onChange={e => updateEducation(idx, 'school', e.target.value)}
                                        className={`p-4 bg-secondary rounded-xl border w-full text-base font-medium transition-all focus:ring-2 focus:ring-brand/20 ${errors[`edu_school_${idx}`] ? 'border-red-500/30 bg-red-50/50' : 'border-gray-100 hover:border-gray-200'}`}
                                    />
                                    {errors[`edu_school_${idx}`] && <p className="text-xs font-bold text-red-400 mt-1 ml-1 italic">{errors[`edu_school_${idx}`]}</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Start Year</label>
                                        <YearPicker
                                            value={edu.start_year}
                                            onChange={val => updateEducation(idx, 'start_year', val)}
                                            placeholder="YYYY"
                                        />
                                        {err(`edu_start_${idx}`)}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">End Year / Expected</label>
                                        <YearPicker
                                            value={edu.end_year}
                                            onChange={val => updateEducation(idx, 'end_year', val)}
                                            placeholder="YYYY"
                                            allowPresent={true}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    <button
                        onClick={addEducation}
                        className="w-full py-6 border-2 border-dashed border-gray-100 rounded-[2rem] text-slate-500 font-black uppercase tracking-[0.2em] text-sm hover:border-brand hover:text-brand hover:bg-brand/5 transition-all shadow-md flex items-center justify-center gap-3 group"
                    >
                        <span className="text-2xl group-hover:scale-125 transition-transform">+</span> Add Education Entry
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
                                <div key={idx} className="flex items-center gap-2 bg-brand/10 text-brand px-3 py-1 rounded-full text-sm font-bold border border-brand-primary/20">
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
                            className="w-full p-3 bg-secondary border border-gray-200 rounded-xl focus:border-brand-primary text-primary outline-none"
                        />

                        {/* Suggestions */}
                        {suggestions.length > 0 && (
                            <div className="pt-4">
                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                                    💡 Suggested for <span className="text-brand">{formData.field || 'your role'}</span>
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {suggestions.slice(0, 16).map((s, i) => (
                                        <Button variant="outline" size="sm" key={i} onClick={() => addSkill(s)}
                                            className="text-xs rounded-full border-gray-200 text-slate-600 hover:border-brand hover:text-brand hover:bg-brand/5 border shadow-none font-semibold px-4 py-2">
                                            + {s}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            title: "Professional Summary",
            subtitle: "A brief overview of your career and value.",
            render: () => (
                <div className="space-y-6">
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Summary</label>
                            <p className="text-xs text-slate-500 font-medium italic">A brief overview of your career and value.</p>
                        </div>
                        <AIButton onClick={handleGenerateSummary} label="AI Auto-Write" />
                    </div>
                    <div>
                        <textarea
                            value={formData.contact.summary}
                            onChange={e => updateField('contact.summary', e.target.value)}
                            placeholder="e.g. Results-oriented professional with 3+ years of experience..."
                            className={`w-full p-5 bg-secondary border rounded-2xl focus:border-brand-primary text-primary outline-none transition-all h-48 leading-relaxed resize-none text-base font-medium ${errors.summary ? 'border-red-500/50 bg-red-500/5' : 'border-gray-100 hover:border-gray-200'}`}
                        />
                        {err('summary')}
                    </div>
                    <p className="text-xs text-slate-500 font-medium bg-secondary/50 p-3 rounded-lg border border-gray-100 flex items-center gap-2">
                        <span>💡</span> Click "AI Auto-Write" to generate a detailed summary based on your experience and skills.
                    </p>
                </div>
            )
        },
        {
            title: "Review & Generate",
            subtitle: "Generate and refine your resume.",
            render: () => (
                <div className="space-y-6">


                    <Button size="lg" onClick={handleSaveAndPreview} disabled={loading}
                        className="w-full h-14 rounded-xl font-black uppercase tracking-widest text-white shadow-xl disabled:opacity-50">
                        {loading ? 'Generating...' : '✨ Generate Preview'}
                    </Button>

                    {resumeId && (
                        <div className="animate-fade-in space-y-4">
                            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-400 font-bold mb-8">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Resume Generated Successfully!
                            </div>

                            {latexCode ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {/* LaTeX Editor */}
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 italic">Resume Editor</label>
                                            </div>
                                            <textarea
                                                value={latexCode}
                                                onChange={(e) => setLatexCode(e.target.value)}
                                                className="w-full h-[500px] md:h-[800px] p-4 md:p-6 bg-secondary border border-gray-100 rounded-xl text-primary focus:outline-none focus:border-brand-primary/30 transition-all font-mono text-xs leading-relaxed resize-none shadow-inner"
                                            />
                                        </div>

                                        {/* PDF Preview */}
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 italic">Visual Preview</label>
                                                <Button
                                                    onClick={handleRecompile}
                                                    disabled={isCompiling}
                                                    size="sm"
                                                    className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isCompiling
                                                        ? 'bg-secondary text-gray-500 cursor-not-allowed'
                                                        : 'bg-brand hover:bg-brand-hover text-white shadow-lg shadow-black/10'
                                                        }`}
                                                >
                                                    {isCompiling ? (
                                                        <>
                                                            <div className="w-3 h-3 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
                                                            <span>Updating...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                            </svg>
                                                            <span>Refresh View</span>
                                                        </>
                                                    )}
                                                </Button>
                                            </div>

                                            <div className="relative h-[500px] md:h-[800px] bg-white border border-gray-200 rounded-xl shadow-sm">
                                                {previewHtml ? (
                                                    <PdfViewer
                                                        url={previewHtml}
                                                        filename="resume_preview.pdf"
                                                        className="rounded-xl"
                                                        title="PDF Preview"
                                                    />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-gray-500">
                                                        {isCompiling ? (
                                                            <div className="w-full h-full p-6 space-y-3">
                                                                <Skeleton className="h-8 w-3/4 mx-auto" />
                                                                <Skeleton className="h-4 w-full" />
                                                                <Skeleton className="h-4 w-full" />
                                                                <Skeleton className="h-4 w-5/6" />
                                                                <Skeleton className="h-4 w-full" />
                                                                <Skeleton className="h-4 w-4/5" />
                                                            </div>
                                                        ) : (
                                                            <div className="text-center px-8">
                                                                <svg className="w-16 h-16 mx-auto mb-6 text-border-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                </svg>
                                                                <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Preview not ready. <br />Click "Refresh View" above.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end mt-10">
                                        <button
                                            onClick={handleDownload}
                                            disabled={!previewHtml || isCompiling}
                                            className={`px-8 py-4 rounded-2xl font-semibold text-sm tracking-wide transition-all flex items-center gap-3 ${previewHtml && !isCompiling
                                                ? 'bg-brand text-white hover:bg-brand-hover shadow-xl shadow-brand/10 active:scale-95'
                                                : 'bg-secondary text-gray-500 cursor-not-allowed shadow-none border border-gray-100'
                                                }`}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                            <span>Download Final PDF</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-[600px] border border-gray-200 rounded-2xl overflow-hidden bg-secondary">
                                    {previewHtml && (
                                        previewHtml.startsWith('blob:')
                                            ? <iframe src={previewHtml} className="w-full h-full" title="Preview" />
                                            : <iframe srcDoc={previewHtml} className="w-full h-full" title="Preview" />
                                    )}
                                </div>
                            )}
                            <Button variant="outline" size="lg" onClick={handleDownload}
                                className="w-full h-14 border-2 rounded-xl font-bold uppercase tracking-widest text-gray-500 hover:text-primary transition-all text-xs flex items-center justify-center gap-2">
                                📥 Native PDF Download
                            </Button>
                            <p className="text-xs text-slate-500 text-center px-4 leading-relaxed font-medium">
                                💡 <b className="text-slate-700">Recommended:</b> Use the "Print" button. <br />
                                <b className="text-slate-700">Important:</b> In the print window, uncheck <b>"Headers and footers"</b> to get a clean PDF.
                            </p>
                        </div>
                    )}
                </div>
            )
        }
    ];

    const isLastStep = currentStep === steps.length - 1;

    return (
        <div className="min-h-screen bg-primary flex flex-col">
            {/* API Key Warning Banner */}
            {hasApiKey === false && (
                <div className="w-full px-6 pt-6">
                    <Card className="max-w-2xl mx-auto border-l-4 border-l-brand rounded-2xl p-6 shadow-xl shadow-black/5 flex items-start gap-5">
                        <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-base font-black text-text-primary mb-1 italic tracking-tighter uppercase">Groq API Key Required for AI Features</h3>
                            <p className="text-text-secondary text-sm font-medium mb-3 leading-relaxed">
                                The AI summary, bullet point, and project description generators need your Groq API key.
                                Get a free key from{' '}
                                <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer"
                                    className="text-brand-primary hover:underline font-black">
                                    console.groq.com/keys
                                </a>
                            </p>
                            <Button
                                onClick={() => navigate('/settings')}
                                variant="outline"
                                className="rounded-xl font-black text-[10px] uppercase tracking-widest">
                                Go to Settings
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-secondary">
                <div
                    className="h-full bg-gradient-to-r from-brand-primary to-brand-hover transition-all duration-500 ease-out"
                    style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
                <div className="w-full max-w-2xl">
                    <div className="text-center mb-4">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                            Step {currentStep + 1} of {steps.length}
                        </span>
                    </div>

                    <div className="mb-8 text-center">
                        <h1 className="text-3xl md:text-4xl font-black text-primary mb-3 tracking-tight">
                            {steps[currentStep].title}
                        </h1>
                        <p className="text-gray-500 font-medium text-lg">
                            {steps[currentStep].subtitle}
                        </p>
                    </div>

                    <Card className="rounded-3xl p-8 shadow-xl shadow-black/5 mb-8">
                        {steps[currentStep].render()}
                    </Card>

                    <div className="flex justify-between items-center px-4">
                        <Button
                            variant="ghost"
                            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                            disabled={currentStep === 0}
                            className={`font-bold text-gray-500 uppercase tracking-widest text-xs hover:text-gray-900 transition-colors ${currentStep === 0 ? 'opacity-0 cursor-default' : ''}`}>
                            ← Back
                        </Button>

                        <div className="flex gap-1.5">
                            {steps.map((_, idx) => (
                                <button key={idx} onClick={() => setCurrentStep(idx)}
                                    className={`rounded-full transition-all ${idx === currentStep ? 'w-6 h-2 bg-brand' : 'w-2 h-2 bg-border-muted hover:bg-border-subtle'}`}
                                />
                            ))}
                        </div>

                        {!isLastStep ? (
                            <Button
                                onClick={handleNext}
                                className="rounded-full px-8 py-6 font-bold uppercase tracking-widest text-xs text-white shadow-lg transition-transform hover:scale-105 active:scale-95">
                                Next →
                            </Button>
                        ) : (
                            <div className="w-24" />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
