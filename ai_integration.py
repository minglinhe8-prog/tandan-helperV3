"""
销冠智语 AI 智能体 - 自包含版（零外部依赖）
直接嵌入 Streamlit 谈单助手应用
"""
import streamlit as st

# =========== 2027广州中考新政 ===========
GZ_POLICY = {
    "数学": 150, "语文": 140, "英语": 140, "物理": 100,
    "化学": 70, "道德与法治": 70, "历史": 70, "体育": 70,
    "总分": 810
}

DISTRICT_SCHOOLS = {
    "越秀": ["省实", "执信", "二中", "广大附中", "铁一", "七中", "十六中", "培正"],
    "天河": ["天河中学", "113中", "天河外国语", "广州中学"],
    "海珠": ["五中", "南武", "九十七中", "海珠实验"],
    "荔湾": ["真光", "一中", "四中", "西关外国语"],
    "白云": ["培英", "白云广雅", "白云华附", "白云省实"],
    "番禺": ["仲元", "番禺中学"],
    "黄埔": ["玉岩", "八十六中", "科学城中学"],
    "花都": ["秀全", "邝维煜纪念中学"],
    "增城": ["增城中学", "增城一中"],
    "从化": ["从化中学", "从化六中"],
    "南沙": ["南沙一中", "南沙广附"],
}


def analyze_student(grade, subject, score, district, target):
    """AI 推理引擎：返回结构化诊断"""
    try:
        score_num = int(score)
    except:
        score_num = 0

    full = GZ_POLICY.get(subject, 120)
    rate = score_num / full * 100

    if rate >= 90:
        level, emoji = "优秀", "🟢"
    elif rate >= 75:
        level, emoji = "良好", "🔵"
    elif rate >= 60:
        level, emoji = "中等", "🟡"
    elif rate >= 40:
        level, emoji = "薄弱", "🟠"
    else:
        level, emoji = "严重薄弱", "🔴"

    # 科目诊断
    diag = []
    if subject == "数学":
        if rate < 60:
            diag = ["计算基本功薄弱（有理数/方程运算），正确率低于60%",
                     "几何证明思路混乱，辅助线不知从何下手",
                     "函数概念不理解，数形结合能力差"]
        elif rate < 80:
            diag = ["综合题解题思路不够灵活，多种方法不会切换",
                     "压轴题分类讨论不完整，经常漏情况",
                     "考试时间分配不合理，前面小题花太多时间"]
        else:
            diag = ["压轴题思维深度不够，最后两问经常做不完",
                     "个别偏难怪题应变不足",
                     "可适当拓展竞赛思维为自主招生做准备"]
    elif subject == "英语":
        if rate < 60:
            diag = ["词汇量严重不足，中考1600词当前仅掌握不到一半",
                     "语法体系混乱，八大时态混成一团",
                     "阅读理解基本看不懂，生词比例过高"]
        elif rate < 80:
            diag = ["完形填空逻辑关系不清，上下文推断能力弱",
                     "写作句式单一，缺乏复合句和高级表达",
                     "阅读速度偏慢，一篇短文需要反复读几遍"]
        else:
            diag = ["深层阅读理解（推理判断/主旨大意）不稳定",
                     "写作高级表达积累不足，地道性需提升",
                     "听说考试信息转述需加强训练"]
    elif subject == "物理":
        diag = ["概念理解停留在记忆层面，缺乏实验直观理解",
                "计算题公式运用不熟练，单位换算经常出错",
                "实验探究题控制变量法和结论表述不规范"]
    elif subject == "化学":
        diag = ["元素符号和化合价记忆不牢，前20号元素未完全掌握",
                "化学方程式配平经常出错，反应条件遗漏",
                "酸碱盐的性质和反应规律理不清，推断题找不到突破口"]
    elif subject == "语文":
        diag = ["文言文实词虚词积累不足，课外文言文基本读不懂",
                "阅读理解答题不规范，缺少答题模板和套路",
                "作文素材陈旧立意不深，语言表达平淡"]
    else:
        diag = ["基础知识掌握不扎实",
                "综合应用能力较弱",
                "建议通过学科诊断精准定位薄弱知识点"]

    # 政策影响
    policy = []
    if subject == "数学":
        policy.append("2027新中考数学升至150分（原120），成为第一大学科，权重最高")
    if subject == "化学":
        policy.append("化学降至70分（原100），可适当减少化学学习时间，重点保物理")
    total_main = GZ_POLICY["数学"] + GZ_POLICY["语文"] + GZ_POLICY["英语"]
    policy.append(f"语数英三大科共{total_main}分，占总分{GZ_POLICY['总分']}分的{int(total_main / GZ_POLICY['总分'] * 100)}%")

    # 目标学校
    school_info = ""
    if target and target != "-":
        elite = ["华附", "省实", "执信", "广雅", "二中", "六中", "广大附", "铁一"]
        if any(s in target for s in elite):
            school_info = f"目标{target}属于广州前八所，录取线约720+。当前{subject}得分率{rate:.0f}%，{'已达到目标要求' if rate >= 90 else f'需提升至{int(full * 0.9)}分以上'}。"
        else:
            school_info = f"目标{target}，建议{subject}保持在{int(full * 0.85)}分以上。关注名额分配和校内排名。"

    # 建议
    recs = []
    if level in ("薄弱", "严重薄弱"):
        recs.append("立即从最基础的概念开始回补，不要跳步骤")
        recs.append(f"每周至少3次系统学习 + 每天30分钟专项练习")
    else:
        recs.append(f"针对最薄弱环节做专项突破，每攻克一个板块再进攻下一个")
        recs.append("每周1-2套限时模拟，训练考试节奏和心态")

    if grade == "初一":
        recs.append("初一打基础黄金期：养成错题本习惯 + 每日课后复习")
    elif grade == "初二":
        recs.append("初二暑假是最后的长假窗口：集中攻克薄弱 + 预习初三新课")
    else:
        recs.append("制定三阶段中考冲刺：基础夯实(9-12月) → 专项突破(1-3月) → 模拟冲刺(4-6月)")

    return dict(level=level, emoji=emoji, rate=rate, full=full, diag=diag,
                policy=policy, school_info=school_info, recs=recs)


def render_ai_panel():
    """在侧边栏渲染 AI 诊断面板"""
    st.markdown("---")
    with st.expander("🧠 AI 智能学情诊断", expanded=False):
        st.markdown("""
        <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:12px 16px;border-radius:10px;margin-bottom:12px;">
            <span style="color:white;font-weight:700;font-size:0.95rem;">AI 课程顾问</span>
            <span style="color:rgba(255,255,255,0.8);font-size:0.75rem;margin-left:6px;">输入分数，AI 自动分析</span>
        </div>
        """, unsafe_allow_html=True)

        c1, c2, c3 = st.columns(3)
        with c1:
            grade = st.selectbox("年级", ["初一", "初二", "初三"], key="aig")
        with c2:
            subject = st.selectbox("科目", ["数学", "英语", "语文", "物理", "化学"], key="ais")
        with c3:
            score = st.text_input("分数", placeholder="如: 72", key="aisc")

        c4, c5 = st.columns(2)
        with c4:
            district = st.selectbox("区域（可选）", ["-"] + list(DISTRICT_SCHOOLS.keys()), key="aid")
        with c5:
            schools = DISTRICT_SCHOOLS.get(district, []) if district != "-" else []
            target = st.selectbox("目标学校（可选）", ["-"] + schools, key="ait")

        if st.button("🔍 AI 智能分析", use_container_width=True, type="primary", key="aibtn"):
            if not score:
                st.warning("请输入分数")
                return

            r = analyze_student(grade, subject, score,
                                district if district != "-" else "",
                                target if target != "-" else "")

            col_a, col_b = st.columns(2)
            with col_a:
                st.metric("水平定位", f"{r['emoji']} {r['level']}",
                          delta=f"得分率 {r['rate']:.0f}%")
            with col_b:
                st.metric("满分", f"{r['full']}分（新中考）",
                          delta=f"当前 {score} 分")

            st.markdown("#### 🔍 失分原因分析")
            for d in r['diag']:
                st.markdown(f"- {d}")

            st.markdown("#### 📜 2027中考政策影响")
            for p in r['policy']:
                st.markdown(f"- {p}")

            if r['school_info']:
                st.markdown(f"#### 🎯 目标学校分析\n{r['school_info']}")

            st.markdown("#### 💡 AI 建议方案")
            for i, rec in enumerate(r['recs'], 1):
                st.markdown(f"{i}. {rec}")


def render_policy_card():
    """在侧边栏渲染中考政策卡片"""
    with st.expander("🏫 2027广州中考新政速览", expanded=False):
        st.markdown("**2027-2029年广州中考改革**（2025年6月发布）")
        st.caption("2027届中考生首批适用 · 总分810分不变")
        cols = st.columns(4)
        defaults = {"数学": 120, "语文": 120, "英语": 120, "物理": 100, "化学": 100,
                     "道德与法治": 90, "历史": 90, "体育": 70}
        for i, (name, val) in enumerate(GZ_POLICY.items()):
            if name == "总分":
                continue
            old = defaults.get(name, val)
            change = val - old
            emoji = "📈" if change > 0 else "📉" if change < 0 else "➡️"
            with cols[i % 4]:
                st.metric(f"{emoji} {name}", f"{val}分",
                          delta=f"{change:+d}" if change != 0 else None)
