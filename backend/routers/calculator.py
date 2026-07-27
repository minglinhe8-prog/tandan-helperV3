"""价格计算器配置管理 — 读写 data.json / rules.json"""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import CalculatorConfig
from auth_utils import get_current_user, get_current_admin_user
from datetime import datetime

router = APIRouter(prefix="/api/calculator", tags=["calculator"])

# 默认值（首次部署时填充）
DEFAULT_DATA = {
    "grades": {
        "初一": {
            "线下": {
                "暑假":   {"old": 3240, "new": 3240, "hours": 12, "subjects": ["双语","益智","实验P","博文"]},
                "秋季":   {"old": 4590, "new": 4590, "hours": 17, "subjects": ["双语","益智","实验P","博文"]},
                "暑假CY": {"old": 3960, "new": 3960, "hours": 12, "subjects": ["双语","益智","博文"]},
                "秋季CY": {"old": 5610, "new": 5610, "hours": 17, "subjects": ["双语","益智","博文"]}
            },
            "线上": {
                "暑假": {"old": 2160, "new": 2160, "hours": 12, "subjects": ["双语","益智"]},
                "秋季": {"old": 3060, "new": 3060, "hours": 17, "subjects": ["双语","益智"]}
            }
        },
        "初二": {
            "线下": {
                "暑假":   {"old": 3240, "new": 3240, "hours": 12, "subjects": ["双语","益智","博文","实验P","实验C"]},
                "秋季":   {"old": 4590, "new": 4590, "hours": 17, "subjects": ["双语","益智","博文","实验P","实验C"]},
                "暑假CY": {"old": 3960, "new": 3960, "hours": 12, "subjects": ["双语","益智","博文","实验P","实验C"]},
                "秋季CY": {"old": 5610, "new": 5610, "hours": 17, "subjects": ["双语","益智","博文","实验P","实验C"]}
            },
            "线上": {
                "暑假": {"old": 2160, "new": 2160, "hours": 12, "subjects": ["双语","益智","博文","实验P","实验C"]},
                "秋季": {"old": 3060, "new": 3060, "hours": 17, "subjects": ["双语","益智","博文","实验P","实验C"]}
            }
        }
    }
}

DEFAULT_RULES = {
    "s1": {
        "identities": {"new": "新生", "old": "春季在读老生"},
        "rules": {
            "初一": {
                "new": {"discountType": "percentage", "scope": "global",
                    "tiers": [{"maxN":0,"note":"0科","rate":1},{"maxN":1,"note":"1科 → 98折","rate":0.98},{"maxN":2,"note":"2科 → 96折","rate":0.96},{"maxN":999,"note":"3科+ → 94折","rate":0.94}]},
                "old": {"discountType": "percentage", "scope": "global",
                    "tiers": [{"maxN":0,"note":"0科","rate":1},{"maxN":1,"note":"1科 → 98折","rate":0.98},{"maxN":2,"note":"2科 → 96折","rate":0.96},{"maxN":4,"note":"4科 → 94折","rate":0.94},{"maxN":999,"note":"6科+ → 94折","rate":0.94}]}
            },
            "初二": {
                "new": {"discountType": "percentage", "scope": "global",
                    "tiers": [{"maxN":0,"note":"0科","rate":1},{"maxN":1,"note":"1科 → 98折","rate":0.98},{"maxN":2,"note":"2科 → 96折","rate":0.96},{"maxN":999,"note":"3科+ → 94折","rate":0.94}]},
                "old": {"discountType": "percentage", "scope": "global",
                    "tiers": [{"maxN":0,"note":"0科","rate":1},{"maxN":1,"note":"1科 → 98折","rate":0.98},{"maxN":2,"note":"2科 → 96折","rate":0.96},{"maxN":5,"note":"3-5科 → 93折","rate":0.93},{"maxN":999,"note":"6科+ → 92折","rate":0.92}]}
            }
        },
        "sections": [
            {"name": "线下课程", "quarters": ["暑假","秋季","暑假CY","秋季CY"], "type": "线下"},
            {"name": "线上课程", "quarters": ["暑假","秋季"], "type": "线上"}
        ],
        "title": "暑秋通用（260701）"
    },
    "s2": {
        "identities": {"new": "不在读/不限对象", "old": "暑在读老生续秋/续班"},
        "rules": {
            "初一": {
                "new": {"discountType": "perQuarter",
                    "quarters": {
                        "暑假": {"discountType":"fixed","scope":"row","tiers":[{"amount":0,"maxN":0},{"amount":100,"maxN":1},{"amount":261,"maxN":2},{"amount":907,"maxN":3},{"amount":948,"maxN":999}]},
                        "暑假CY": {"discountType":"percentage","scope":"row","tiers":[{"maxN":0,"rate":1},{"maxN":1,"rate":0.95},{"maxN":2,"rate":0.9},{"maxN":999,"rate":0.88}]},
                        "秋季": {"discountType":"fixed","scope":"crossSection","crossKeys":["线下秋季","线下秋季CY","线上秋季"],"tiers":[{"amount":0,"maxN":0},{"amount":160,"maxN":1},{"amount":360,"maxN":2},{"amount":600,"maxN":3},{"amount":700,"maxN":999}]},
                        "秋季CY": {"discountType":"fixed","scope":"crossSection","crossKeys":["线下秋季","线下秋季CY","线上秋季"],"tiers":[{"amount":0,"maxN":0},{"amount":160,"maxN":1},{"amount":360,"maxN":2},{"amount":600,"maxN":3},{"amount":700,"maxN":999}]}
                    }},
                "old": [
                    {"discountType":"fixed","scope":"crossSection","sectionType":"线下","crossKeys":["线下秋季","线下秋季CY","线上秋季"],"tiers":[{"amount":0,"maxN":0},{"amount":200,"maxN":1},{"amount":400,"maxN":2},{"amount":700,"maxN":3},{"amount":800,"maxN":999}]},
                    {"discountType":"fixed","scope":"crossSection","sectionType":"线上","crossKeys":["线下秋季","线下秋季CY","线上秋季"],"tiers":[{"amount":0,"maxN":0},{"amount":200,"maxN":1},{"amount":400,"maxN":2},{"amount":700,"maxN":3},{"amount":800,"maxN":999}]}
                ]
            },
            "初二": {
                "new": [
                    {"discountType":"percentage","scope":"global","sectionType":"*",
                        "tiers":[{"maxN":0,"note":"0科","rate":1},{"maxN":1,"note":"1科 → 98折","rate":0.98},{"maxN":2,"note":"2科 → 96折","rate":0.96},{"maxN":999,"note":"3科+ → 94折","rate":0.94}]}
                ],
                "old": [
                    {"discountType":"fixed","scope":"section","sectionType":"线下",
                        "tiers":[{"amount":0,"maxN":0},{"amount":160,"maxN":1},{"amount":280,"maxN":2},{"amount":360,"maxN":999}]},
                    {"discountType":"fixed","scope":"row","sectionType":"线上",
                        "tiers":[{"amount":0,"maxN":0},{"amount":120,"maxN":1},{"amount":180,"maxN":2},{"amount":220,"maxN":999}]}
                ]
            }
        },
        "sections": {
            "初一": {
                "new": [
                    {"name":"线下课程","quarters":["暑假","秋季","暑假CY","秋季CY"],"type":"线下"},
                    {"name":"线上课程","quarters":["暑假","秋季"],"type":"线上"}
                ],
                "old": [
                    {"name":"线下课程","quarters":["秋季","秋季CY"],"type":"线下"},
                    {"name":"线上课程","quarters":["秋季"],"type":"线上"}
                ]
            },
            "初二": {
                "new": [
                    {"name":"线下课程","quarters":["暑假","秋季","暑假CY","秋季CY"],"type":"线下"},
                    {"name":"线上课程","quarters":["暑假","秋季"],"type":"线上"}
                ],
                "old": [
                    {"name":"线下课程","quarters":["秋季","秋季CY"],"type":"线下"},
                    {"name":"线上课程","quarters":["秋季"],"type":"线上"}
                ]
            }
        },
        "title": "续班纳新（260717/260702）"
    }
}

DEFAULTS = {"data": DEFAULT_DATA, "rules": DEFAULT_RULES}


def _get(key: str, db: Session):
    row = db.query(CalculatorConfig).filter(CalculatorConfig.key == key).first()
    if row:
        return json.loads(row.payload)
    # 没有则初始化为默认值
    payload = json.dumps(DEFAULTS[key], ensure_ascii=False)
    db.add(CalculatorConfig(key=key, payload=payload))
    db.commit()
    return DEFAULTS[key]


@router.get("/data")
def get_data(db: Session = Depends(get_db), _: object = Depends(get_current_user)):
    return _get("data", db)


@router.get("/rules")
def get_rules(db: Session = Depends(get_db), _: object = Depends(get_current_user)):
    return _get("rules", db)


@router.put("/data")
def update_data(payload: dict, db: Session = Depends(get_db), admin: object = Depends(get_current_admin_user)):
    row = db.query(CalculatorConfig).filter(CalculatorConfig.key == "data").first()
    js = json.dumps(payload, ensure_ascii=False)
    if row:
        row.payload = js
        row.updated_at = datetime.utcnow()
        row.updated_by = admin.id
    else:
        db.add(CalculatorConfig(key="data", payload=js, updated_by=admin.id))
    db.commit()
    return {"message": "data 已更新"}


@router.put("/rules")
def update_rules(payload: dict, db: Session = Depends(get_db), admin: object = Depends(get_current_admin_user)):
    row = db.query(CalculatorConfig).filter(CalculatorConfig.key == "rules").first()
    js = json.dumps(payload, ensure_ascii=False)
    if row:
        row.payload = js
        row.updated_at = datetime.utcnow()
        row.updated_by = admin.id
    else:
        db.add(CalculatorConfig(key="rules", payload=js, updated_by=admin.id))
    db.commit()
    return {"message": "rules 已更新"}