import os
import uuid

from fastapi import UploadFile

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
MAX_SIZE_BYTES = 2 * 1024 * 1024  # 2MB


def ensure_upload_dir():
    os.makedirs(UPLOAD_DIR, exist_ok=True)


async def save_photo(file: UploadFile) -> str:
    ensure_upload_dir()

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"File type {ext} not allowed. Use JPEG or PNG.")

    content = await file.read()
    if len(content) > MAX_SIZE_BYTES:
        raise ValueError("File too large. Maximum size is 2MB.")

    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    return f"/uploads/{filename}"


def delete_photo(photo_url: str | None):
    if not photo_url:
        return
    filename = photo_url.split("/")[-1]
    filepath = os.path.join(UPLOAD_DIR, filename)
    if os.path.exists(filepath):
        os.remove(filepath)
