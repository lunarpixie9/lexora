"""End-to-end API flow on a throwaway SQLite database (no Whisper needed)."""
import os
import tempfile

import pytest

_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["STORAGE_DIR"] = _tmp
os.environ["WHISPER_MODEL"] = ""  # force the demo transcriber so tests stay fast
os.environ["PRONUNCIATION_MODEL"] = ""  # never download the phoneme model in tests
os.environ["PRELOAD_MODELS"] = "false"
os.environ["GEMINI_API_KEY"] = ""  # tests must never call the live API, key or no key
os.environ["SEED_DEMO"] = "true"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def teacher(client):
    r = client.post("/api/auth/login", data={"username": "teacher@lexora.demo", "password": "lexora123"})
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_health_and_demo_seed(client, teacher):
    assert client.get("/api/health").json()["database"]["ok"]
    kids = client.get("/api/children", headers=teacher).json()
    assert [k["first_name"] for k in kids] == ["Asha", "Rohan"]
    assert kids[0]["sessions_completed"] == 2 and kids[0]["is_demo"]


def test_seeded_report_has_all_groups(client, teacher):
    kids = client.get("/api/children", headers=teacher).json()
    sessions = client.get(f"/api/children/{kids[0]['id']}/sessions", headers=teacher).json()
    rep = client.get(f"/api/screenings/{sessions[0]['id']}/report", headers=teacher).json()
    assert set(rep["indicator"]["groups_present"]) == {"reading", "writing", "speech"}
    assert rep["indicator"]["session_mode"] == "demo"
    assert "not a diagnostic tool" in rep["disclaimer"]
    assert rep["reading"]["level"] and rep["error_profile"]["target_skills"]


def test_full_live_flow_with_ladder_rule(client, teacher):
    kids = client.get("/api/children", headers=teacher).json()
    rohan = kids[1]["id"]
    s = client.post("/api/screenings", json={"child_id": rohan}, headers=teacher).json()
    assert s["progress"]["total"] == 27
    reading = [t for t in s["tasks"] if t["kind"] == "reading"]
    for t in reading[:5]:  # capital letters all correct
        s = client.post(f"/api/screenings/{s['id']}/tasks/{t['id']}/mark", json={"correct": True}, headers=teacher).json()
    for t in reading[5:10]:  # small letters: 2 of 5 -> level failed
        s = client.post(f"/api/screenings/{s['id']}/tasks/{t['id']}/mark", json={"correct": t["order_index"] % 2 == 0}, headers=teacher).json()
    assert s["progress"]["skipped"] == 9  # 5 words + 4 sentences skipped as in ASER
    writing = [t for t in s["tasks"] if t["kind"] == "writing"]
    s = client.post(f"/api/screenings/{s['id']}/tasks/{writing[0]['id']}/text", json={"response_text": writing[0]["prompt_text"][::-1]}, headers=teacher).json()
    answered = next(t for t in s["tasks"] if t["id"] == writing[0]["id"])
    assert answered["response"]["text"]["accuracy"] == 0.0
    s = client.post(f"/api/screenings/{s['id']}/demo-fill", headers=teacher).json()
    assert s["progress"]["pending"] == 0 and s["mode"] == "demo"
    rep = client.post(f"/api/screenings/{s['id']}/complete", headers=teacher).json()
    assert rep["indicator"]["band"] in ("few_signals", "some_signals", "multiple_signals")
    assert rep["reading"]["level"] in ("Beginner", "Capital letter")
    # completed sessions reject further answers
    assert client.post(f"/api/screenings/{s['id']}/tasks/{writing[1]['id']}/text", json={"response_text": "x"}, headers=teacher).status_code == 409


def test_practice_generation_and_attempt(client, teacher):
    kids = client.get("/api/children", headers=teacher).json()
    acts = client.post("/api/practice/generate", json={"child_id": kids[1]["id"]}, headers=teacher).json()
    assert {a["kind"] for a in acts} == {"word_practice", "spelling", "reading", "story"}
    assert all(a["source"] == "deterministic" for a in acts)
    spelling = next(a for a in acts if a["kind"] == "spelling")
    answers = {str(i): it["word"] for i, it in enumerate(spelling["content"]["spelling"])}
    answers["0"] = answers["0"][::-1]
    r = client.post(f"/api/practice/{spelling['id']}/attempts", json={"answers": answers}, headers=teacher).json()
    assert r["total"] == len(answers) and r["correct"] == r["total"] - 1
    prog = client.get(f"/api/progress/{kids[1]['id']}", headers=teacher).json()
    assert prog["practice"] and prog["skills"]


def test_role_access_control(client, teacher):
    kids = client.get("/api/children", headers=teacher).json()
    child_tok = client.post("/api/auth/login", data={"username": "asha@child.lexora", "password": "lexora123"}).json()["access_token"]
    ch = {"Authorization": f"Bearer {child_tok}"}
    assert [k["first_name"] for k in client.get("/api/children", headers=ch).json()] == ["Asha"]
    assert client.get(f"/api/children/{kids[1]['id']}", headers=ch).status_code == 403
    assert client.post("/api/children", json={"first_name": "X", "age": 7, "class_grade": 2}, headers=ch).status_code == 403
    assert client.get("/api/children").status_code == 401


def test_register_and_create_child_with_pin(client):
    r = client.post("/api/auth/register", json={"email": "new.teacher@example.com", "password": "secret123", "full_name": "New Teacher", "role": "teacher"})
    assert r.status_code == 201
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    c = client.post("/api/children", json={"first_name": "Meera", "age": 9, "class_grade": 4, "consent_statement": "ok"}, headers=h).json()
    assert c["child_login"]["email"].endswith("@child.lexora") and len(c["child_login"]["pin"]) == 4
    login = client.post("/api/auth/login", data={"username": c["child_login"]["email"], "password": c["child_login"]["pin"]})
    assert login.status_code == 200 and login.json()["user"]["role"] == "child"


def test_teacher_can_review_marks_after_completion(client, teacher):
    kids = client.get("/api/children", headers=teacher).json()
    s = client.post("/api/screenings", json={"child_id": kids[1]["id"]}, headers=teacher).json()
    s = client.post(f"/api/screenings/{s['id']}/demo-fill", headers=teacher).json()
    before = client.post(f"/api/screenings/{s['id']}/complete", headers=teacher).json()
    prog_before = client.get(f"/api/progress/{kids[1]['id']}", headers=teacher).json()
    n_before = sum(1 for x in prog_before["screenings"] if x["session_id"] == s["id"])
    # flip every answered reading item to incorrect -> lower reading level, re-scored automatically
    reading = [t for t in s["tasks"] if t["kind"] == "reading" and t["status"] == "answered"]
    for t in reading:
        r = client.post(f"/api/screenings/{s['id']}/tasks/{t['id']}/mark", json={"correct": False, "mistakes": 2}, headers=teacher)
        assert r.status_code == 200
    after = client.get(f"/api/screenings/{s['id']}/report", headers=teacher).json()
    assert after["reading"]["level"] == "Beginner"
    assert after["indicator"]["score"] >= before["indicator"]["score"]
    prog_after = client.get(f"/api/progress/{kids[1]['id']}", headers=teacher).json()
    assert sum(1 for x in prog_after["screenings"] if x["session_id"] == s["id"]) == n_before == 1
    skipped = next(t for t in s["tasks"] if t["kind"] == "reading" and t["status"] == "skipped")
    assert client.post(f"/api/screenings/{s['id']}/tasks/{skipped['id']}/mark", json={"correct": True}, headers=teacher).status_code == 400


def test_child_cannot_generate_practice(client):
    tok = client.post("/api/auth/login", data={"username": "asha@child.lexora", "password": "lexora123"}).json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}
    kid = client.get("/api/children", headers=h).json()[0]
    assert client.post("/api/practice/generate", json={"child_id": kid["id"]}, headers=h).status_code == 403
    assert client.get(f"/api/practice?child_id={kid['id']}", headers=h).status_code == 200


def test_report_compares_with_previous_screening(client, teacher):
    kids = client.get("/api/children", headers=teacher).json()
    sessions = client.get(f"/api/children/{kids[0]['id']}/sessions", headers=teacher).json()  # newest first
    latest = client.get(f"/api/screenings/{sessions[0]['id']}/report", headers=teacher).json()
    oldest = client.get(f"/api/screenings/{sessions[-1]['id']}/report", headers=teacher).json()
    assert latest["previous"] and latest["previous"]["session_id"] == sessions[-1]["id"]
    assert abs(latest["previous"]["score_change"] - (latest["indicator"]["score"] - oldest["indicator"]["score"])) < 1e-6
    assert oldest["previous"] is None


def test_discard_in_progress_screening(client, teacher):
    kids = client.get("/api/children", headers=teacher).json()
    s = client.post("/api/screenings", json={"child_id": kids[1]["id"]}, headers=teacher).json()
    writing = next(t for t in s["tasks"] if t["kind"] == "writing")
    client.post(f"/api/screenings/{s['id']}/tasks/{writing['id']}/text", json={"response_text": "x"}, headers=teacher)
    assert client.delete(f"/api/screenings/{s['id']}", headers=teacher).status_code == 204
    assert client.get(f"/api/screenings/{s['id']}", headers=teacher).status_code == 404
    completed = [x for x in client.get(f"/api/children/{kids[0]['id']}/sessions", headers=teacher).json() if x["status"] == "completed"]
    assert client.delete(f"/api/screenings/{completed[0]['id']}", headers=teacher).status_code == 409


def test_teacher_can_correct_speech_transcript(client, teacher):
    kids = client.get("/api/children", headers=teacher).json()
    s = client.post("/api/screenings", json={"child_id": kids[1]["id"]}, headers=teacher).json()
    s = client.post(f"/api/screenings/{s['id']}/demo-fill", headers=teacher).json()
    client.post(f"/api/screenings/{s['id']}/complete", headers=teacher)
    speech = next(t for t in s["tasks"] if t["kind"] == "speech")
    before = client.get(f"/api/screenings/{s['id']}/report", headers=teacher).json()["speech"]
    # teacher writes down what the child actually said: only the first word of the passage
    r = client.post(f"/api/screenings/{s['id']}/tasks/{speech['id']}/transcript",
                    json={"transcript": speech["prompt_text"].split()[0]}, headers=teacher)
    assert r.status_code == 200
    after = client.get(f"/api/screenings/{s['id']}/report", headers=teacher).json()["speech"]
    assert after["engine"].endswith("(teacher-corrected)")
    assert after["whisper_transcript"] == before["transcript"]  # original kept for audit
    assert after["word_error_rate"] > before["word_error_rate"]
    assert after["duration_seconds"] == before["duration_seconds"]  # audio-derived values untouched
    # a task with no transcript cannot be corrected
    writing = next(t for t in s["tasks"] if t["kind"] == "writing")
    assert client.post(f"/api/screenings/{s['id']}/tasks/{writing['id']}/transcript", json={"transcript": "x"}, headers=teacher).status_code == 400
