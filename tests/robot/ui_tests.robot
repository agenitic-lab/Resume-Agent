*** Settings ***
Library    Browser
Suite Setup       New Browser    browser=chromium    headless=False
Suite Teardown    Close Browser

*** Variables ***
${FRONTEND_URL}    http://localhost:5173
${RESUME_BUILDER_PATH}    /resume-builder

*** Test Cases ***
Scenario: Navigate to Resume Builder and Check Title
    [Documentation]    Verify the user can access the Resume Builder page
    [Tags]             ui    smoke
    New Page    ${FRONTEND_URL}${RESUME_BUILDER_PATH}
    Get Title    contains    Resume Builder
    Take Screenshot

Scenario: Verify Template Selection
    [Documentation]    Verify template radio buttons are clickable
    [Tags]             ui
    New Page    ${FRONTEND_URL}${RESUME_BUILDER_PATH}
    Click       text="Classic"
    Get Element States    text="Classic"    contains    checked
    Take Screenshot
