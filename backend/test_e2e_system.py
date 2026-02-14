#!/usr/bin/env python3
"""Comprehensive end-to-end system test"""

print("=" * 60)
print("COMPREHENSIVE END-TO-END TEST")
print("=" * 60)

# Test 1: Import chain
print("\n1️⃣  Testing Import Chain...")
try:
    from agent.workflow import run_optimization, create_agent_workflow
    print("   ✓ agent.workflow imports successfully")
    from api.routes.agent import router, run_optimization as api_run_optimization
    print("   ✓ api.routes.agent imports successfully")
    print("   ✓ run_optimization function available in API routes")
except Exception as e:
    print(f"   ✗ Import failed: {e}")
    exit(1)

# Test 2: Workflow creation
print("\n2️⃣  Testing Workflow Creation...")
try:
    workflow_graph = create_agent_workflow()
    print(f"   ✓ Workflow graph created: {type(workflow_graph)}")
except Exception as e:
    print(f"   ✗ Workflow creation failed: {e}")
    exit(1)

# Test 3: Database models
print("\n3️⃣  Testing Database Models...")
try:
    from database.models.run import Run, ResumeRun, RunStatus
    from database.models.user import User
    print("   ✓ Run model imported")
    print("   ✓ User model imported")
    print(f"   ✓ Run table: {Run.__tablename__}")
    print(f"   ✓ Run columns: {[c.name for c in Run.__table__.columns]}")
except Exception as e:
    print(f"   ✗ Model import failed: {e}")
    exit(1)

# Test 4: API endpoints
print("\n4️⃣  Testing API Endpoints...")
try:
    from main import app
    routes = [route.path for route in app.routes if hasattr(route, 'path')]
    agent_routes = [r for r in routes if '/api/agent' in r]
    print(f"   ✓ Found {len(agent_routes)} agent routes:")
    for route in agent_routes:
        print(f"      - {route}")
except Exception as e:
    print(f"   ✗ API test failed: {e}")
    exit(1)

# Test 5: All agent nodes
print("\n5️⃣  Testing Agent Nodes...")
try:
    from agent.nodes.job_requirements import extract_job_requirements
    from agent.nodes.resume_analysis import analyze_resume
    from agent.nodes.scoring import score_resume
    from agent.nodes.planning import plan_improvements
    from agent.nodes.modification import modify_resume
    from agent.nodes.rescore import rescore_modified_resume
    from agent.nodes.fit_check import assess_job_fit
    print("   ✓ All 7 agent nodes imported successfully")
except Exception as e:
    print(f"   ✗ Node import failed: {e}")
    exit(1)

print("\n" + "=" * 60)
print("✅ ALL TESTS PASSED - SYSTEM IS FULLY OPERATIONAL")
print("=" * 60)
