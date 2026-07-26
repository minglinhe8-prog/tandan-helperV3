import streamlit as st
import os
import sys
import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional, Union
from collections import defaultdict
from PIL import Image
from ai_integration import render_ai_panel, render_policy_card

# ---------- 路径自适应 ----------
if getattr(sys, 'frozen', False):
    BASE_DIR = Path(sys.executable).parent
else:
    BASE_DIR = Path(__file__).parent

COURSE_DATA_DIR = BASE_DIR / "course_data"
USER_DATA_DIR = BASE_DIR / "userdata"
USER_DATA_DIR.mkdir(exist_ok=True)
FAVORITES_FILE = USER_DATA_DIR / "favorites.json"
HISTORY_FILE = USER_DATA_DIR / "history.json"
SEARCH_HISTORY_FILE = USER_DATA_DIR / "search_history.json"
LOG_FILE = USER_DATA_DIR / "app.log"
THUMB_CACHE_DIR = COURSE_DATA_DIR / ".thumb_cache"
THUMB_CACHE_DIR.mkdir(parents=True, exist_ok=True)

# ---------- 常量定义 ----------
GRADE_LIST = ["初一", "初二", "初三"]
SUBJECT_LIST = ["博文", "双语", "托管", "实验P", "实验C"]
COURSE_TYPES = ["线上", "线下"]
SEMESTERS = ["暑秋", "寒春"]
CLASS_LEVELS = ["志高", "行远", "精进", "超优"]

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".bmp"}
PDF_EXTS = {".pdf"}
PPT_EXTS = {".ppt", ".pptx"}
EXCEL_EXTS = {".xlsx", ".xls"}
ALL_EXTS = IMAGE_EXTS | PDF_EXTS | PPT_EXTS | EXCEL_EXTS

# ---------- 工具函数 ----------
def load_json(path: Path, default=None):
    try:
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return default if default is not None else []

def save_json(path: Path, data):
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        log(f"保存JSON失败: {path} - {e}")

def log(msg: str):
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"{datetime.now().isoformat()} - {msg}\n")
    except Exception:
        pass

def open_file(path: Path):
    if path.exists():
        try:
            if sys.platform == "win32":
                os.startfile(path)
            else:
                # 非 Windows 环境无法直接打开
                pass
        except Exception as e:
            log(f"打开文件失败: {path} - {e}")

def add_to_history(file_path: Path):
    history = load_json(HISTORY_FILE, [])
    entry = {
        "path": str(file_path),
        "name": file_path.name,
        "time": datetime.now().isoformat()
    }
    history = [h for h in history if h["path"] != entry["path"]]
    history.insert(0, entry)
    history = history[:20]
    save_json(HISTORY_FILE, history)

def add_search_history(keywords: Dict):
    history = load_json(SEARCH_HISTORY_FILE, [])
    entry = {"keywords": keywords, "time": datetime.now().isoformat()}
    history = [h for h in history if h["keywords"] != keywords]
    history.insert(0, entry)
    history = history[:5]
    save_json(SEARCH_HISTORY_FILE, history)

def toggle_favorite(file_path: Path):
    favs = load_json(FAVORITES_FILE, [])
    path_str = str(file_path)
    if path_str in favs:
        favs.remove(path_str)
    else:
        favs.append(path_str)
    save_json(FAVORITES_FILE, favs)
    return path_str in favs

def is_favorite(file_path: Path):
    favs = load_json(FAVORITES_FILE, [])
    return str(file_path) in favs

# ---------- 缩略图生成 ----------
def get_thumbnail(file_path: Path) -> Optional[Image.Image]:
    ext = file_path.suffix.lower()
    cache_key = file_path.name + str(file_path.stat().st_mtime)
    cache_file = THUMB_CACHE_DIR / f"{cache_key}.png"

    if cache_file.exists():
        try:
            return Image.open(cache_file)
        except Exception:
            cache_file.unlink(missing_ok=True)

    try:
        if ext in IMAGE_EXTS:
            img = Image.open(file_path)
            img.thumbnail((150, 150))
            img.save(cache_file)
            return img
        elif ext in PDF_EXTS:
            try:
                from pdf2image import convert_from_path
                images = convert_from_path(str(file_path), first_page=1, last_page=1, size=(150, None))
                if images:
                    img = images[0]
                    img.thumbnail((150, 150))
                    img.save(cache_file)
                    return img
            except ImportError:
                log("pdf2image未安装，无法生成PDF缩略图")
            except Exception as e:
                log(f"PDF缩略图失败: {file_path} - {e}")
    except Exception as e:
        log(f"缩略图生成失败: {file_path} - {e}")
    return None

def get_placeholder_html(ext: str, category: str = "") -> str:
    if ext in EXCEL_EXTS:
        icon, text, bg = "📊", "表格", "#ECFDF5"
    elif ext in PPT_EXTS:
        icon, text, bg = "📽️", "演示文稿", "#FFF7ED"
    elif ext in PDF_EXTS:
        icon, text, bg = "📄", "PDF 文档", "#FEF2F2"
    else:
        icon, text, bg = "📁", "文件", "#F1F5F9"

    # 按分类给文件类型图标上色
    cat_icons = {"课表": "🗓️", "课程大纲": "📖", "老师介绍": "👨‍🏫", "政策": "📋", "优惠价格": "💰"}
    cat_icon = cat_icons.get(category, "")

    return f"""
    <div style="display:flex;align-items:center;justify-content:center;height:140px;
                background:{bg};flex-direction:column;position:relative;">
        <span style="font-size:2.8rem;">{icon}</span>
        <span style="color:#94A3B8;font-size:0.75rem;font-weight:600;margin-top:4px;">{text}</span>
    </div>
    """

# ---------- 筛选匹配辅助 ----------
def match_any_keywords(text: str, values: Union[str, List[str]]) -> bool:
    if not values or values == "全部" or values == []:
        return True
    if isinstance(values, str):
        return values in text
    if isinstance(values, list):
        return any(v in text for v in values if v)
    return True

# ---------- 文件扫描器 ----------
def scan_course_table(keywords: dict):
    base = COURSE_DATA_DIR / "课表"
    results = []
    if not base.exists():
        return results
    grades = keywords.get("grades", [])
    semester = keywords.get("semester", "全部")
    ctype = keywords.get("course_type", "全部")
    if ctype == "线上":
        target_dirs = [base / "线上"] if (base / "线上").exists() else []
    elif ctype == "线下":
        target_dirs = [base / "线下"] if (base / "线下").exists() else []
    else:
        target_dirs = [base]
        for sub in ["线上", "线下"]:
            p = base / sub
            if p.exists():
                target_dirs.append(p)
    for scan_dir in target_dirs:
        for ext in IMAGE_EXTS | EXCEL_EXTS:
            for f in scan_dir.glob(f"*{ext}"):
                name = f.name
                if grades and not any(g in name for g in grades):
                    continue
                if semester != "全部" and semester not in name:
                    continue
                results.append(("课表", f))
    return results

def scan_syllabus(keywords: dict):
    """扫描课程大纲：按 线上/线下 → 年级 → 科目 目录层级过滤"""
    base = COURSE_DATA_DIR / "课程大纲"
    results = []
    if not base.exists():
        return results
    grades = keywords.get("grades", [])
    subjects = keywords.get("subjects", [])
    ctype = keywords.get("course_type", "全部")

    for root, dirs, files in os.walk(base):
        root_path = Path(root)
        # 计算相对路径层级
        rel = root_path.relative_to(base)
        parts = rel.parts  # e.g. ("线下", "初一", "博文") or ("线上", "博文")

        # 课程类型过滤 (一级目录)
        if ctype != "全部":
            if not parts or ctype not in parts[0]:
                continue

        # 年级过滤 (线下二级目录, 线上一级无年级则从文件名匹配)
        if grades:
            grade_in_path = any(g in str(part) for g in grades for part in parts)
            # 也检查父目录名
            parent_grade = any(g in root_path.parent.name for g in grades)
            if not (grade_in_path or parent_grade):
                # 最后兜底: 检查文件名
                skip_dir = True
                for file in files:
                    if any(g in file for g in grades):
                        skip_dir = False
                        break
                if skip_dir:
                    continue

        # 科目过滤 (末级目录名 或 文件名)
        for file in files:
            f = root_path / file
            if f.suffix.lower() not in (IMAGE_EXTS | PDF_EXTS | PPT_EXTS):
                continue
            name = f.name
            # 科目匹配: 目录名或文件名
            if subjects:
                dir_subject_match = any(s in str(part) for s in subjects for part in parts)
                file_subject_match = any(s in name for s in subjects)
                if not (dir_subject_match or file_subject_match):
                    continue
            results.append(("课程大纲", f))
    return results

def scan_teacher_intro(keywords: dict):
    base = COURSE_DATA_DIR / "老师介绍"
    results = []
    if not base.exists():
        return results
    subjects = keywords.get("subjects", [])
    teacher = keywords.get("teacher", "")
    for ext in IMAGE_EXTS | PDF_EXTS | PPT_EXTS:
        for f in base.glob(f"*{ext}"):
            name = f.name
            if not match_any_keywords(name, subjects):
                continue
            if teacher and teacher.strip() and teacher.strip() not in name:
                continue
            results.append(("老师介绍", f))
    return results

def scan_policy(keywords: dict):
    base = COURSE_DATA_DIR / "政策"
    results = []
    if not base.exists():
        return results
    grades = keywords.get("grades", [])
    for ext in IMAGE_EXTS | PDF_EXTS | PPT_EXTS:
        for f in base.glob(f"*{ext}"):
            if not match_any_keywords(f.name, grades):
                continue
            results.append(("政策", f))
    return results

def scan_discount(keywords: dict):
    base = COURSE_DATA_DIR / "优惠价格"
    results = []
    if not base.exists():
        return results
    grades = keywords.get("grades", [])
    for ext in IMAGE_EXTS | PDF_EXTS | PPT_EXTS:
        for f in base.glob(f"*{ext}"):
            if not match_any_keywords(f.name, grades):
                continue
            results.append(("优惠价格", f))
    return results

def search_all(keywords: dict):
    results = []
    results.extend(scan_course_table(keywords))
    results.extend(scan_syllabus(keywords))
    results.extend(scan_teacher_intro(keywords))
    results.extend(scan_policy(keywords))
    results.extend(scan_discount(keywords))
    return results

# ---------- 话术推荐 ----------
SCRIPTS_DIR = BASE_DIR / "scripts"
def get_related_scripts(file_category: str) -> List[str]:
    scripts = []
    if not SCRIPTS_DIR.exists():
        return []
    mapping = {
        "课表": [],
        "课程大纲": [],
        "老师介绍": [],
        "政策": ["升学政策.md"],
        "优惠价格": ["暑秋续班.md", "常见异议处理.md"]
    }
    files = mapping.get(file_category, [])
    for fname in files:
        fpath = SCRIPTS_DIR / fname
        if fpath.exists():
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    content = f.read()
                    if len(content) > 500:
                        content = content[:500] + "..."
                    scripts.append(content)
            except Exception as e:
                log(f"读取话术失败: {fpath} - {e}")
    return scripts

# ---------- UI 组件 ----------
GITHUB_RAW = "https://cdn.jsdelivr.net/gh/minglinhe8-prog/tandan-helper@master"

def get_file_url(file_path: Path) -> str:
    """获取文件的CDN访问URL。Excel/PPT用GitHub Raw绕过CDN限制"""
    rel = file_path.relative_to(BASE_DIR).as_posix()
    ext = file_path.suffix.lower()
    # jsDelivr对某些文件类型限流，Excel/PPT走GitHub Raw
    if ext in ('.xlsx', '.xls', '.pptx', '.ppt'):
        return f"https://raw.githubusercontent.com/minglinhe8-prog/tandan-helper/master/{rel}"
    return f"{GITHUB_RAW}/{rel}"

def resource_card(category: str, file_path: Path, index: int):
    ext = file_path.suffix.lower()
    thumb = get_thumbnail(file_path)
    fav = is_favorite(file_path)
    size_kb = file_path.stat().st_size / 1024
    file_url = get_file_url(file_path)

    # 文件类型标签
    ext_badge = {"png": "badge-png", "jpg": "badge-png", "jpeg": "badge-png",
                 "pdf": "badge-pdf", "xlsx": "badge-xlsx", "xls": "badge-xlsx",
                 "pptx": "badge-pptx", "ppt": "badge-pptx"}.get(ext[1:], "badge-png")

    with st.container():
        st.markdown(f'<div class="resource-card">', unsafe_allow_html=True)

        # 缩略图区域
        st.markdown(f'<div style="position:relative;">', unsafe_allow_html=True)
        st.markdown(f'<span class="card-type-badge {ext_badge}">{ext.upper()}</span>', unsafe_allow_html=True)
        if thumb:
            st.image(thumb, use_container_width=False, width=200)
        else:
            st.markdown(get_placeholder_html(ext, category), unsafe_allow_html=True)
        st.markdown('</div>', unsafe_allow_html=True)

        # 文件名
        st.markdown(f'<div class="card-body">', unsafe_allow_html=True)
        st.markdown(f'<div class="card-filename" title="{file_path.name}">{file_path.stem}</div>', unsafe_allow_html=True)
        st.markdown(f'<div class="card-meta-line">{size_kb:.0f} KB</div>', unsafe_allow_html=True)
        st.markdown('</div>', unsafe_allow_html=True)

        # 操作按钮行
        st.markdown(f'<div class="card-actions">', unsafe_allow_html=True)
        col_a, col_b, col_c = st.columns([1.5, 0.6, 1.5])
        with col_a:
            st.markdown(f"""
            <a href="{file_url}" target="_blank" rel="noopener"
               style="display:block;text-align:center;padding:8px;border-radius:10px;
               background:linear-gradient(135deg,#4F46E5,#7C3AED);color:white;
               font-weight:600;font-size:0.8rem;text-decoration:none;">
               📂 打开
            </a>
            """, unsafe_allow_html=True)
            add_to_history(file_path)
        with col_b:
            if st.button(("★" if fav else "☆"), key=f"fv_{index}_{file_path.name}", use_container_width=True):
                toggle_favorite(file_path)
                st.rerun()
        with col_c:
            if st.button("🔍 预览", key=f"pv_{index}_{file_path.name}", use_container_width=True):
                st.session_state.preview_file = file_path
                st.rerun()
        st.markdown('</div>', unsafe_allow_html=True)

        st.markdown('</div>', unsafe_allow_html=True)

    # 间距
    st.markdown('<div style="height:4px;"></div>', unsafe_allow_html=True)

# ---------- 自定义 CSS（全面美化） ----------
def inject_css():
    st.markdown("""
    <style>
        :root {
            --primary: #4F46E5;
            --primary-light: #EEF2FF;
            --primary-dark: #3730A3;
            --accent: #F59E0B;
            --bg: #F8FAFC;
            --card-bg: #FFFFFF;
            --text: #1E293B;
            --text-secondary: #64748B;
            --text-muted: #94A3B8;
            --border: #E2E8F0;
            --shadow-sm: 0 1px 3px rgba(0,0,0,0.04);
            --shadow: 0 4px 12px rgba(0,0,0,0.06);
            --shadow-hover: 0 8px 30px rgba(0,0,0,0.1);
            --shadow-lg: 0 12px 40px rgba(0,0,0,0.12);
            --radius: 14px;
            --radius-sm: 8px;
            --transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .stApp {
            background: linear-gradient(180deg, #F0F4FF 0%, #F8FAFC 200px);
            color: var(--text);
        }

        .main .block-container {
            padding-top: 1.5rem;
            padding-bottom: 2rem;
            max-width: 1440px;
        }

        /* ── 顶部标题栏 ── */
        .app-header {
            background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #A855F7 100%);
            border-radius: var(--radius);
            padding: 28px 32px;
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 4px 24px rgba(79,70,229,0.25);
        }
        .app-header h1 {
            color: white !important;
            font-size: 1.6rem !important;
            font-weight: 700 !important;
            margin: 0 !important;
            letter-spacing: -0.5px;
        }
        .app-header .header-subtitle {
            color: rgba(255,255,255,0.85);
            font-size: 0.85rem;
            margin-top: 4px;
        }
        .app-header .header-actions {
            display: flex;
            gap: 10px;
        }
        .app-header .header-btn {
            background: rgba(255,255,255,0.18);
            border: 1px solid rgba(255,255,255,0.25);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            transition: all var(--transition);
            backdrop-filter: blur(8px);
        }
        .app-header .header-btn:hover {
            background: rgba(255,255,255,0.3);
            border-color: rgba(255,255,255,0.4);
        }

        /* ── 统计卡片网格 ── */
        .stat-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 24px;
        }
        .stat-card {
            background: white;
            border-radius: var(--radius);
            padding: 20px 24px;
            box-shadow: var(--shadow-sm);
            border: 1px solid var(--border);
            transition: all var(--transition);
            position: relative;
            overflow: hidden;
        }
        .stat-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0;
            width: 4px;
            height: 100%;
            border-radius: 2px 0 0 2px;
        }
        .stat-card.s-blue::before { background: linear-gradient(180deg, #3B82F6, #6366F1); }
        .stat-card.s-green::before { background: linear-gradient(180deg, #10B981, #059669); }
        .stat-card.s-purple::before { background: linear-gradient(180deg, #8B5CF6, #7C3AED); }
        .stat-card.s-amber::before { background: linear-gradient(180deg, #F59E0B, #D97706); }
        .stat-card .stat-icon {
            font-size: 2rem;
            margin-bottom: 8px;
        }
        .stat-card .stat-value {
            font-size: 2rem;
            font-weight: 800;
            color: var(--text);
            line-height: 1;
        }
        .stat-card .stat-label {
            font-size: 0.8rem;
            color: var(--text-secondary);
            font-weight: 500;
            margin-top: 4px;
        }

        /* ── 侧边栏 ── */
        section[data-testid="stSidebar"] {
            background: linear-gradient(180deg, #FAFBFC 0%, #F1F5F9 100%);
            border-right: 1px solid var(--border);
        }
        section[data-testid="stSidebar"] .block-container {
            padding: 1.2rem 1.2rem;
        }
        section[data-testid="stSidebar"] .stSelectbox label,
        section[data-testid="stSidebar"] .stMultiselect label,
        section[data-testid="stSidebar"] .stTextInput label {
            font-size: 0.8rem;
            color: var(--text-secondary);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .sidebar-brand {
            text-align: center;
            padding: 8px 0 16px 0;
        }
        .sidebar-brand .brand-icon {
            font-size: 2.2rem;
        }
        .sidebar-brand .brand-name {
            font-size: 1.1rem;
            font-weight: 700;
            color: var(--primary);
        }

        /* ── 资源卡片 ── */
        .resource-card {
            background: var(--card-bg);
            border-radius: var(--radius);
            border: 1px solid var(--border);
            box-shadow: var(--shadow-sm);
            overflow: hidden;
            transition: all var(--transition);
            margin-bottom: 18px;
        }
        .resource-card:hover {
            box-shadow: var(--shadow-hover);
            transform: translateY(-3px);
            border-color: #C7D2FE;
        }
        .card-thumb-wrap {
            width: 100%;
            height: 140px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #F1F5F9;
            overflow: hidden;
        }
        .card-thumb-wrap img {
            width: 100%;
            height: 140px;
            object-fit: cover;
        }
        .card-type-badge {
            position: absolute;
            top: 10px;
            right: 10px;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 0.7rem;
            font-weight: 600;
            color: white;
            z-index: 1;
        }
        .badge-png { background: #3B82F6; }
        .badge-pdf { background: #EF4444; }
        .badge-xlsx { background: #10B981; }
        .badge-pptx { background: #F97316; }
        .card-body {
            padding: 12px 14px 8px 14px;
            text-align: center;
        }
        .card-filename {
            font-weight: 600;
            font-size: 0.82rem;
            color: var(--text);
            line-height: 1.4;
            margin-bottom: 4px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        .card-meta-line {
            font-size: 0.72rem;
            color: var(--text-muted);
            margin-bottom: 10px;
        }
        .card-actions {
            display: flex;
            gap: 6px;
            justify-content: center;
            padding: 0 14px 14px 14px;
        }
        .card-action-btn {
            flex: 1;
            padding: 7px 0;
            border-radius: 8px;
            border: 1px solid var(--border);
            background: white;
            color: var(--text);
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            transition: all var(--transition);
            text-align: center;
        }
        .card-action-btn:hover {
            background: var(--primary-light);
            border-color: var(--primary);
            color: var(--primary);
        }
        .card-action-btn.btn-fav {
            flex: 0 0 40px;
            font-size: 1rem;
        }
        .card-action-btn.btn-fav.active {
            background: #FEF3C7;
            border-color: #F59E0B;
            color: #D97706;
        }

        /* ── 分类标签 ── */
        .category-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 28px 0 16px 0;
            padding-bottom: 12px;
            border-bottom: 2px solid var(--border);
        }
        .category-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            flex-shrink: 0;
        }
        .cat-课表 .category-dot { background: #3B82F6; }
        .cat-课程大纲 .category-dot { background: #8B5CF6; }
        .cat-老师介绍 .category-dot { background: #F59E0B; }
        .cat-政策 .category-dot { background: #EF4444; }
        .cat-优惠价格 .category-dot { background: #10B981; }
        .category-title {
            font-size: 1.1rem;
            font-weight: 700;
            color: var(--text);
        }
        .category-count {
            background: #F1F5F9;
            color: var(--text-secondary);
            padding: 3px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
        }

        /* ── 按钮 ── */
        .stButton > button {
            border-radius: 10px;
            font-weight: 600;
            font-size: 0.82rem;
            padding: 8px 16px;
            transition: all var(--transition);
            border: 1px solid var(--border);
            background: white;
            color: var(--text);
            box-shadow: var(--shadow-sm);
        }
        .stButton > button:hover {
            background: var(--primary-light);
            border-color: var(--primary);
            color: var(--primary-dark);
            transform: translateY(-1px);
            box-shadow: var(--shadow);
        }
        .stButton > button:active { transform: translateY(0); }

        div[data-testid="stHorizontalBlock"] button[kind="primary"],
        button[kind="primary"] {
            background: linear-gradient(135deg, #4F46E5, #7C3AED) !important;
            color: white !important;
            border: none !important;
            box-shadow: 0 2px 12px rgba(79,70,229,0.3) !important;
        }
        div[data-testid="stHorizontalBlock"] button[kind="primary"]:hover,
        button[kind="primary"]:hover {
            box-shadow: 0 4px 20px rgba(79,70,229,0.45) !important;
            transform: translateY(-2px);
        }

        section[data-testid="stSidebar"] .stButton > button { width: 100%; }

        /* ── 指标卡 ── */
        [data-testid="stMetric"] {
            background: white;
            border-radius: var(--radius);
            padding: 16px 20px;
            box-shadow: var(--shadow-sm);
            border: 1px solid var(--border);
        }
        [data-testid="stMetric"] label { font-weight: 600; color: var(--text-secondary); font-size: 0.78rem; }
        [data-testid="stMetricValue"] { font-size: 2rem; font-weight: 800; color: var(--primary); }

        /* ── 通用 ── */
        h2 { font-weight: 700; font-size: 1.4rem; color: var(--text); margin-top: 0; }
        h3 { font-weight: 700; font-size: 1.1rem; color: var(--text); }
        hr { border: none; border-top: 1px solid var(--border); margin: 1rem 0; }

        /* ── 搜索历史 ── */
        .history-chip {
            display: inline-block;
            padding: 5px 14px;
            border-radius: 20px;
            font-size: 0.72rem;
            background: white;
            border: 1px solid var(--border);
            color: var(--text-secondary);
            cursor: pointer;
            margin: 3px 4px 3px 0;
            transition: all var(--transition);
        }
        .history-chip:hover {
            background: var(--primary-light);
            border-color: var(--primary);
            color: var(--primary);
        }

        /* ── 预览面板 ── */
        .preview-panel {
            background: white;
            border-radius: var(--radius);
            padding: 16px;
            box-shadow: var(--shadow-sm);
            border: 1px solid var(--border);
        }

        /* ── 空态 ── */
        .welcome-card {
            text-align: center;
            padding: 60px 40px;
            background: white;
            border-radius: var(--radius);
            box-shadow: var(--shadow-sm);
            border: 2px dashed var(--border);
        }
        .welcome-card .welcome-icon { font-size: 4rem; margin-bottom: 16px; }
        .welcome-card h2 { margin-bottom: 8px; }
        .welcome-card p { color: var(--text-secondary); font-size: 0.95rem; max-width: 500px; margin: 0 auto; }

        /* ── 提示/st.success等 ── */
        .stSuccess, .stWarning, .stInfo {
            border-radius: 10px !important;
            padding: 12px 16px !important;
            font-weight: 600;
        }

        /* ── 响应式 ── */

        /* 列布局自适应包裹 */
        div[data-testid="stHorizontalBlock"] {
            flex-wrap: wrap;
            gap: 8px;
        }

        /* iPad Pro / 大平板: ≤1024px */
        @media (max-width: 1024px) {
            .main .block-container { padding: 1rem 0.5rem; }
            .app-header {
                flex-direction: column;
                text-align: center;
                gap: 12px;
                padding: 20px 16px;
            }
            .app-header h1 { font-size: 1.3rem !important; }
            .stat-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
            .stat-card { padding: 14px 16px; }
            .stat-card .stat-value { font-size: 1.4rem; }
            .category-header { margin: 20px 0 10px 0; }
        }

        /* iPad mini / 小平板 / 手机横屏: ≤768px */
        @media (max-width: 768px) {
            .app-header {
                border-radius: 10px;
                padding: 16px 12px;
            }
            .app-header h1 { font-size: 1.15rem !important; }
            .app-header .header-subtitle { font-size: 0.72rem; }
            .stat-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
            .stat-card { padding: 12px 14px; border-radius: 10px; }
            .stat-card .stat-icon { font-size: 1.4rem; }
            .stat-card .stat-value { font-size: 1.2rem; }
            .stat-card .stat-label { font-size: 0.7rem; }
            .resource-card { border-radius: 10px; margin-bottom: 12px; }
            .card-thumb-wrap { height: 110px; }
            .card-thumb-wrap img { height: 110px; }
            .card-filename { font-size: 0.74rem; }
            .card-meta-line { font-size: 0.68rem; }
            .category-header { margin: 16px 0 8px 0; padding-bottom: 8px; }
            .category-title { font-size: 0.95rem; }
            .category-count { padding: 2px 10px; font-size: 0.7rem; }
            .stButton > button { font-size: 0.74rem; padding: 7px 10px; border-radius: 7px; }
            hr { margin: 0.5rem 0; }
        }

        /* 手机竖屏: ≤480px */
        @media (max-width: 480px) {
            .main .block-container { padding: 0.5rem 0; }
            .app-header {
                border-radius: 8px;
                padding: 12px 10px;
                margin-bottom: 14px;
            }
            .app-header h1 { font-size: 1rem !important; }
            .app-header .header-subtitle { font-size: 0.65rem; }
            .stat-grid { grid-template-columns: repeat(2, 1fr); gap: 6px; }
            .stat-card { padding: 10px 12px; border-radius: 8px; }
            .stat-card .stat-icon { font-size: 1.1rem; margin-bottom: 4px; }
            .stat-card .stat-value { font-size: 1.1rem; }
            .stat-card .stat-label { font-size: 0.65rem; }
            .resource-card { border-radius: 8px; margin-bottom: 10px; }
            .card-thumb-wrap { height: 90px; }
            .card-thumb-wrap img { height: 90px; }
            .card-filename { font-size: 0.68rem; }
            .card-meta-line { font-size: 0.62rem; margin-bottom: 6px; }
            .card-actions { padding: 0 8px 10px 8px; gap: 3px; }
            .card-action-btn { padding: 5px 0; font-size: 0.67rem; border-radius: 6px; }
            .card-type-badge { padding: 2px 7px; font-size: 0.6rem; border-radius: 8px; top: 6px; right: 6px; }
            .category-title { font-size: 0.85rem; }
            .category-count { font-size: 0.65rem; }
            .stButton > button { font-size: 0.68rem; padding: 8px 6px; min-height: 36px; }
            h3 { font-size: 0.9rem; }
            .welcome-card { padding: 30px 16px; }
            .welcome-card .welcome-icon { font-size: 2.5rem; }
            .welcome-card h2 { font-size: 1rem; }
            .welcome-card p { font-size: 0.78rem; }
        }
    </style>
    """, unsafe_allow_html=True)

# ---------- 主应用 ----------
def main():
    st.set_page_config(page_title="谈单助手", layout="wide")
    inject_css()

    defaults = {
        "results": [],
        "preview_file": None,
        "compare_list": [],
        "show_favorites": False,
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v

    # 顶部标题栏（渐变 Banner）
    st.markdown("""
    <div class="app-header">
        <div>
            <h1>📘 谈单助手</h1>
            <div class="header-subtitle">课程物料 · 话术辅助 · 快速检索</div>
        </div>
        <div class="header-actions">
    """, unsafe_allow_html=True)
    if st.button("⭐ 收藏夹", key="header_fav"):
        st.session_state.show_favorites = not st.session_state.show_favorites
        st.rerun()
    st.markdown("</div></div>", unsafe_allow_html=True)

    with st.sidebar:
        st.markdown("""
        <div class="sidebar-brand">
            <div class="brand-icon">📘</div>
            <div class="brand-name">谈单助手</div>
        </div>
        """, unsafe_allow_html=True)

        st.markdown("#### 🔍 筛选条件")

        # 预设值
        if "grade_preset" in st.session_state:
            grade_default = st.session_state.grade_preset
        else:
            grade_default = []
        if "semester_preset" in st.session_state:
            semester_idx = (["全部"] + SEMESTERS).index(st.session_state.semester_preset) if st.session_state.semester_preset in (["全部"] + SEMESTERS) else 0
        else:
            semester_idx = 0

        grades = st.multiselect("年级", GRADE_LIST, default=grade_default)
        subjects = st.multiselect("科目", SUBJECT_LIST, default=[])
        course_type = st.selectbox("课程类型", ["全部"] + COURSE_TYPES)
        semester = st.selectbox("学期", ["全部"] + SEMESTERS, index=semester_idx)
        teacher = st.text_input("老师姓名（可选）", value="", help="用于筛选老师介绍")

        with st.expander("⚡ 快捷场景", expanded=False):
            c1, c2 = st.columns(2)
            with c1:
                if st.button("🆕 新初一", key="quick_c1"):
                    st.session_state.grade_preset = ["初一"]
                    st.session_state.semester_preset = "暑秋"
                    st.rerun()
            with c2:
                if st.button("📋 全部课表", key="quick_all"):
                    st.session_state.results = scan_course_table({"grades":[],"semester":"全部","course_type":"全部"})
                    st.rerun()

        col_search, col_reset = st.columns(2)
        with col_search:
            if st.button("🔍 搜索资源", use_container_width=True, type="primary"):
                keywords = {
                    "grades": grades if grades else [],
                    "subjects": subjects if subjects else [],
                    "course_type": course_type,
                    "semester": semester,
                    "teacher": teacher.strip()
                }
                st.session_state.results = search_all(keywords)
                st.session_state.compare_list = []
                add_search_history(keywords)
        with col_reset:
            if st.button("🔄 重置", use_container_width=True):
                st.session_state.results = []
                st.session_state.preview_file = None
                for key in ["grade_preset", "semester_preset"]:
                    if key in st.session_state:
                        del st.session_state[key]
                st.rerun()

        st.markdown("---")
        st.caption("🕐 最近搜索")
        search_history = load_json(SEARCH_HISTORY_FILE, [])
        if search_history:
            for h in search_history[:5]:
                kw = h["keywords"]
                g = ",".join(kw.get('grades',[])) or "全部年级"
                s = ",".join(kw.get('subjects',[])) or "全部科目"
                t = kw.get('course_type','全部')
                desc = f"{g} · {s} · {t}"
                if st.button(desc, key=f"hist_{h['time']}"):
                    st.session_state.results = search_all(kw)
                    st.rerun()
        else:
            st.caption("暂无搜索记录")

    st.markdown("---")
    render_ai_panel()
    render_policy_card()

    # 预览面板
    if st.session_state.preview_file:
        file_path = st.session_state.preview_file
        st.sidebar.markdown("---")
        st.sidebar.markdown("#### 🔎 文件预览")
        st.sidebar.markdown(f"**{file_path.name}**")
        thumb = get_thumbnail(file_path)
        if thumb:
            st.sidebar.image(thumb, use_container_width=True)
        else:
            st.sidebar.markdown(get_placeholder_html(file_path.suffix.lower()), unsafe_allow_html=True)

        category = None
        for cat, f in st.session_state.results:
            if f == file_path:
                category = cat
                break
        scripts = get_related_scripts(category) if category else []
        if scripts:
            with st.sidebar.expander("💬 话术建议", expanded=True):
                for s in scripts:
                    st.markdown(s)

        file_url = get_file_url(file_path)
        st.sidebar.markdown(f"""
        <a href="{file_url}" target="_blank" rel="noopener"
           style="display:block;text-align:center;padding:10px;border-radius:10px;
           background:linear-gradient(135deg,#4F46E5,#7C3AED);color:white;
           font-weight:600;text-decoration:none;margin-bottom:8px;">
           📂 打开此文件
        </a>
        """, unsafe_allow_html=True)
        if st.sidebar.button("✕ 关闭预览", use_container_width=True):
            st.session_state.preview_file = None
            st.rerun()

    # 主内容区
    if st.session_state.show_favorites:
        st.markdown("### ❤️ 我的收藏")
        favs = load_json(FAVORITES_FILE, [])
        if not favs:
            st.markdown("""
            <div class="welcome-card">
                <div class="welcome-icon">⭐</div>
                <h2>暂无收藏</h2>
                <p>浏览资源时点击 ★ 即可收藏，方便快速查阅</p>
            </div>
            """, unsafe_allow_html=True)
        else:
            cols = st.columns(4)
            for i, path_str in enumerate(favs):
                f = Path(path_str)
                if f.exists():
                    with cols[i % 4]:
                        resource_card("收藏", f, i)
        if st.button("← 返回主界面", use_container_width=True):
            st.session_state.show_favorites = False
            st.rerun()
        return

    if not st.session_state.results:
        # ── 仪表盘 ──
        st.markdown('<div class="stat-grid">', unsafe_allow_html=True)

        cnt1 = len(list(COURSE_DATA_DIR.glob("课表/**/*"))) if (COURSE_DATA_DIR/"课表").exists() else 0
        cnt2 = len(list(COURSE_DATA_DIR.glob("课程大纲/**/*"))) if (COURSE_DATA_DIR/"课程大纲").exists() else 0
        cnt3 = 0
        for d in ["老师介绍", "政策", "优惠价格"]:
            p = COURSE_DATA_DIR / d
            if p.exists():
                cnt3 += len(list(p.glob("*")))

        stats = [
            ("🗓️", cnt1, "课表文件", "s-blue"),
            ("📖", cnt2, "课程大纲", "s-purple"),
            ("📋", cnt3, "师资 · 政策 · 优惠", "s-amber"),
            ("✅", "就绪", "数据状态", "s-green"),
        ]
        for icon, val, label, cls in stats:
            st.markdown(f"""
            <div class="stat-card {cls}">
                <div class="stat-icon">{icon}</div>
                <div class="stat-value">{val}</div>
                <div class="stat-label">{label}</div>
            </div>
            """, unsafe_allow_html=True)

        st.markdown('</div>', unsafe_allow_html=True)

        st.markdown("---")
        col_a, col_b = st.columns([1.5, 1])
        with col_a:
            st.markdown("### 💡 快速上手")
            st.markdown("""
            <div style="background:white;padding:20px 24px;border-radius:14px;box-shadow:0 1px 3px rgba(0,0,0,0.04);border:1px solid #E2E8F0;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                    <span style="background:#EEF2FF;color:#4F46E5;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8rem;">1</span>
                    <span style="font-weight:600;">在左侧选择筛选条件</span>
                </div>
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                    <span style="background:#FEF3C7;color:#D97706;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8rem;">2</span>
                    <span style="font-weight:600;">点击搜索资源查看匹配物料</span>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                    <span style="background:#ECFDF5;color:#059669;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8rem;">3</span>
                    <span style="font-weight:600;">预览/收藏/对比，辅助谈单</span>
                </div>
            </div>
            """, unsafe_allow_html=True)

        with col_b:
            recent_files = load_json(HISTORY_FILE, [])[:5]
            if recent_files:
                st.markdown("### 🕒 最近打开")
                for f in recent_files:
                    path = Path(f["path"])
                    if path.exists():
                        file_url = get_file_url(path)
                        st.markdown(f"""
                        <a href="{file_url}" target="_blank" rel="noopener"
                           style="color:#4F46E5;font-weight:500;display:block;padding:3px 0;">
                           📄 {path.name}
                        </a>
                        """, unsafe_allow_html=True)
            else:
                st.markdown("### 🕒 最近打开")
                st.caption("还没有打开过文件")
    else:
        results = st.session_state.results
        st.success(f"✅ 找到 {len(results)} 个资源 — 共 {len(set(c for c,_ in results))} 个分类")

        if st.session_state.compare_list:
            c1, c2 = st.columns([4, 1])
            with c1:
                st.warning(f"📊 对比模式：已选 {len(st.session_state.compare_list)} 个")
            with c2:
                if st.button("退出对比"):
                    st.session_state.compare_list = []
                    st.rerun()

        grouped = defaultdict(list)
        for cat, path in results:
            grouped[cat].append(path)

        CAT_COLORS = {
            "课表": ("#3B82F6", "cat-课表"),
            "课程大纲": ("#8B5CF6", "cat-课程大纲"),
            "老师介绍": ("#F59E0B", "cat-老师介绍"),
            "政策": ("#EF4444", "cat-政策"),
            "优惠价格": ("#10B981", "cat-优惠价格"),
        }

        for category, files in grouped.items():
            color, cls = CAT_COLORS.get(category, ("#64748B", ""))
            st.markdown(f"""
            <div class="category-header {cls}">
                <div class="category-dot"></div>
                <span class="category-title">{category}</span>
                <span class="category-count">{len(files)} 个文件</span>
            </div>
            """, unsafe_allow_html=True)

            cols = st.columns(4)
            for i, f in enumerate(files):
                with cols[i % 4]:
                    resource_card(category, f, i)
                    cb_key = f"cmp_{category}_{i}"
                    checked = f in st.session_state.compare_list
                    compare_val = st.checkbox("📊 加入对比", value=checked, key=cb_key)
                    if compare_val and f not in st.session_state.compare_list:
                        st.session_state.compare_list.append(f)
                    elif not compare_val and f in st.session_state.compare_list:
                        st.session_state.compare_list.remove(f)

        if len(st.session_state.compare_list) >= 2:
            with st.expander("🔍 对比视图", expanded=True):
                st.markdown("""
                <div style="background:#EEF2FF;padding:10px 16px;border-radius:10px;margin-bottom:12px;
                            color:#4F46E5;font-weight:600;font-size:0.85rem;">
                    📊 并排对比 · 拖动滚动条查看细节
                </div>
                """, unsafe_allow_html=True)
                compare_cols = st.columns(len(st.session_state.compare_list))
                for idx, f in enumerate(st.session_state.compare_list):
                    with compare_cols[idx]:
                        st.markdown(f"**{f.name}**")
                        st.caption(f"{f.stat().st_size/1024:.0f} KB")
                        thumb = get_thumbnail(f)
                        if thumb:
                            st.image(thumb, use_container_width=True)
                        else:
                            st.markdown(get_placeholder_html(f.suffix.lower()), unsafe_allow_html=True)
                        file_url = get_file_url(f)
                        st.markdown(f"""
                        <a href="{file_url}" target="_blank" rel="noopener"
                           style="display:block;text-align:center;padding:8px;border-radius:10px;
                           background:linear-gradient(135deg,#4F46E5,#7C3AED);color:white;
                           font-weight:600;font-size:0.8rem;text-decoration:none;">
                           📂 打开文件
                        </a>
                        """, unsafe_allow_html=True)

if __name__ == "__main__":
    main()