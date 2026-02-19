*** Settings ***
Library    RequestsLibrary
Library    Collections

*** Variables ***
${BASE_URL}    http://localhost:8000
${API_PREFIX}  /api/resume

*** Test Cases ***
Scenario: Generate ATS Bullets
    [Documentation]    Test the AI-powered bullet generation endpoint
    [Tags]             api    ai
    ${payload}=    Create Dictionary    role=Software Engineer    technologies=${{ ["Python", "React"] }}    keywords=${{ ["Optimization", "Scalability"] }}
    ${response}=   POST    ${BASE_URL}${API_PREFIX}/generate-bullets    json=${payload}
    Status Should Be    200    ${response}
    ${bullets}=    Get From Dictionary    ${response.json()}    bullets
    Should Not Be Empty    ${bullets}
    Log Many    ${bullets}

Scenario: Generate Resume Summary
    [Documentation]    Test the AI-powered summary generation endpoint
    [Tags]             api    ai
    ${payload}=    Create Dictionary    current_role=Backend Dev    experience_level=Mid-Level    keywords=${{ ["FastAPI", "PostgreSQL"] }}
    ${response}=   POST    ${BASE_URL}${API_PREFIX}/generate-summary    json=${payload}
    Status Should Be    200    ${response}
    Dictionary Should Contain Key    ${response.json()}    summary
    ${summary}=    Get From Dictionary    ${response.json()}    summary
    Log    Generated Summary: ${summary}
