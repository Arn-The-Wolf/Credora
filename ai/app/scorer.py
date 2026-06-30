"""Credora AI Credit Scoring Engine — alternative data for thin-file borrowers."""



from __future__ import annotations



from pathlib import Path

from typing import Any

import json



MODEL_DIR = Path(__file__).parent / "models"

MODEL_DIR.mkdir(exist_ok=True)

MODEL_VERSION = "2.0"



EMPLOYMENT_MAP = {

    "employed": 1.0,

    "full_time": 1.0,

    "part_time": 0.75,

    "self-employed": 0.85,

    "self_employed": 0.85,

    "business_owner": 0.9,

    "contract": 0.75,

    "unemployed": 0.3,

    "student": 0.5,

    "retired": 0.6,

}



LOAN_TYPE_CONFIG = {

    "personal": {"base_apr": 9.5, "risk_weight": 1.0, "max_dti": 0.43},

    "business": {"base_apr": 11.0, "risk_weight": 1.15, "max_dti": 0.50},

    "mortgage": {"base_apr": 6.5, "risk_weight": 0.85, "max_dti": 0.36},

    "auto": {"base_apr": 7.5, "risk_weight": 0.95, "max_dti": 0.40},

    "education": {"base_apr": 5.5, "risk_weight": 0.80, "max_dti": 0.45},

}

LOAN_TYPE_ENCODE = {
    "personal": 0.2,
    "business": 0.45,
    "mortgage": 0.15,
    "auto": 0.35,
    "education": 0.25,
}



_ml_available = False

_regressor = None

_classifier = None



try:

    import joblib

    import numpy as np

    from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor

    from sklearn.model_selection import train_test_split



    _ml_available = True

except ImportError:

    np = None  # type: ignore

    joblib = None  # type: ignore





def _encode_employment(status: str) -> float:

    key = status.lower().replace(" ", "_") if status else "employed"

    return EMPLOYMENT_MAP.get(key, 0.7)





def _parse_float(value: Any, default: float = 0.0) -> float:

    try:

        return float(str(value).replace(",", "").replace("$", ""))

    except (TypeError, ValueError):

        return default





def _sector_adjustment(loan_type: str, sector: dict[str, Any] | None) -> tuple[float, float, list[dict[str, int]]]:

    """Returns (score_delta, prob_delta, extra_factors)."""

    if not sector:

        return 0.0, 0.0, []



    loan_type = loan_type.lower()

    score_delta = 0.0

    prob_delta = 0.0

    extra: list[dict[str, int]] = []



    if loan_type == "business":

        years = _parse_float(sector.get("yearsInOperation"))

        revenue = _parse_float(sector.get("annualRevenue"))

        employees = _parse_float(sector.get("numberOfEmployees"), 1)

        if years >= 3:

            score_delta += 20

            prob_delta += 0.05

        elif years >= 1:

            score_delta += 10

        if revenue > 100000:

            score_delta += 15

            prob_delta += 0.04

        ct = sector.get("collateralType", "none")

        if ct and str(ct).lower() not in ("none", ""):

            cv = _parse_float(sector.get("collateralValue"))

            if cv > 0:

                score_delta += 20

                prob_delta += 0.06

            extra.append({"name": "Business Collateral", "value": min(100, int(cv / 5000))})

        extra.append({"name": "Business Stability", "value": min(100, int(years * 20 + employees * 5))})



    elif loan_type == "mortgage":

        ltv = _parse_float(sector.get("ltv_ratio"))

        if ltv == 0:

            pv = _parse_float(sector.get("propertyValue"))

            dp = _parse_float(sector.get("downPayment"))

            loan_amt = _parse_float(sector.get("loanAmount"))

            if pv > 0:

                ltv = loan_amt / pv

        if 0 < ltv <= 0.80:

            score_delta += 25

            prob_delta += 0.08

        elif ltv <= 0.90:

            score_delta += 10

        elif ltv > 0.95:

            score_delta -= 30

            prob_delta -= 0.15

        occupancy = sector.get("occupancyType", "primary")

        if occupancy == "primary":

            score_delta += 5

        extra.append({"name": "LTV Ratio", "value": max(0, 100 - int(ltv * 100))})



    elif loan_type == "auto":

        year = int(_parse_float(sector.get("vehicleYear"), 2020))

        condition = sector.get("vehicleCondition", "used")

        age = max(0, 2026 - year)

        if condition == "new" and age <= 1:

            score_delta += 10

        elif age > 10:

            score_delta -= 15

            prob_delta -= 0.05

        extra.append({"name": "Vehicle Quality", "value": max(0, 100 - age * 8)})



    elif loan_type == "education":

        program = sector.get("programType", "undergraduate")

        if program in ("graduate", "professional"):

            score_delta += 15

            prob_delta += 0.05

        if sector.get("cosignerName"):

            score_delta += 25

            prob_delta += 0.08

            extra.append({"name": "Cosigner Strength", "value": 85})

        tuition = _parse_float(sector.get("tuitionCost"))

        if tuition > 0:

            extra.append({"name": "Program Value", "value": min(100, int(tuition / 1000))})



    elif loan_type == "personal":

        existing_debt = _parse_float(sector.get("existingDebt"))

        if existing_debt > 0:

            extra.append({"name": "Debt Burden", "value": max(0, 100 - int(existing_debt / 50))})



    return score_delta, prob_delta, extra





def _format_kes(amount: float) -> str:
    if amount >= 1_000_000:
        return f"KES {amount / 1_000_000:.1f}M"
    return f"KES {int(amount):,}"


def _sector_feature_vector(loan_type: str, sector: dict[str, Any] | None, loan_amount: float = 0.0) -> list[float]:
    """Normalized sector/collateral features for ML matrix (v2.0)."""
    sector = sector or {}
    lt = (loan_type or "personal").lower()
    ltv = 0.0
    vehicle_age = 0.0
    revenue_ratio = 0.0
    business_years = 0.0
    cosigner = 0.0
    collateral_secured = 0.0

    if lt == "mortgage":
        pv = _parse_float(sector.get("propertyValue"))
        dp = _parse_float(sector.get("downPayment"))
        amt = _parse_float(sector.get("loanAmount"), loan_amount)
        if pv > 0:
            ltv = min(1.0, amt / pv if amt > 0 else max(0.0, 1.0 - dp / pv))
    elif lt == "auto":
        year = int(_parse_float(sector.get("vehicleYear"), 2020))
        vehicle_age = min(1.0, max(0, 2026 - year) / 15.0)
        vp = _parse_float(sector.get("vehiclePrice"))
        amt = _parse_float(sector.get("loanAmount"), loan_amount)
        if vp > 0:
            ltv = min(1.0, amt / vp)
    elif lt == "business":
        rev = _parse_float(sector.get("annualRevenue"))
        amt = _parse_float(sector.get("loanAmount"), loan_amount)
        if rev > 0:
            revenue_ratio = min(1.0, amt / rev)
        business_years = min(1.0, _parse_float(sector.get("yearsInOperation")) / 10.0)
        ct = sector.get("collateralType", "none")
        if ct and str(ct).lower() != "none":
            collateral_secured = 1.0
    elif lt == "education":
        if sector.get("cosignerName"):
            cosigner = 1.0

    return [ltv, vehicle_age, revenue_ratio, business_years, cosigner, collateral_secured]


def _encode_loan_type(loan_type: str) -> float:
    return LOAN_TYPE_ENCODE.get((loan_type or "personal").lower(), 0.3)


def _generate_training_data(n: int = 5000):

    rng = np.random.default_rng(42)

    income = rng.lognormal(mean=7.5, sigma=0.6, size=n)

    mobile_money = income * rng.uniform(0.2, 1.5, n)

    utility_score = rng.integers(20, 100, n)

    loan_amount = income * rng.uniform(0.5, 8, n)

    term = rng.choice([12, 24, 36, 48, 60], n)

    existing_score = rng.integers(300, 850, n)

    emp_keys = list(EMPLOYMENT_MAP.keys())

    emp_encoded = np.array([EMPLOYMENT_MAP[rng.choice(emp_keys)] for _ in range(n)])

    type_keys = list(LOAN_TYPE_ENCODE.keys())
    loan_type_enc = np.array([LOAN_TYPE_ENCODE[rng.choice(type_keys)] for _ in range(n)])

    ltv_feat = rng.uniform(0.3, 0.95, n)
    vehicle_age_feat = rng.uniform(0, 0.8, n)
    revenue_ratio_feat = rng.uniform(0.05, 0.5, n)
    business_years_feat = rng.uniform(0, 1, n)
    cosigner_feat = rng.integers(0, 2, n).astype(float)
    collateral_feat = rng.integers(0, 2, n).astype(float)

    debt_to_income = loan_amount / (income * 12 + 1)

    features = np.column_stack([
        income, mobile_money, utility_score, debt_to_income, term, existing_score, emp_encoded, loan_type_enc,
        ltv_feat, vehicle_age_feat, revenue_ratio_feat, business_years_feat, cosigner_feat, collateral_feat,
    ])

    alt_data_boost = (mobile_money / (income + 1)) * 30 + utility_score * 0.3

    thin_file_boost = np.where(existing_score < 500, alt_data_boost * 0.5, 0)

    sector_boost = (1 - ltv_feat) * 40 + business_years_feat * 25 + cosigner_feat * 20 + collateral_feat * 15

    credit_scores = np.clip(

        existing_score * 0.4 + alt_data_boost + thin_file_boost + sector_boost + income / 100 - debt_to_income * 80 + emp_encoded * 50 - loan_type_enc * 40,

        300, 850,

    ).astype(int)

    approval_prob = 1 / (1 + np.exp(-(credit_scores - 550) / 60 + debt_to_income * 3))

    approved = (approval_prob + rng.normal(0, 0.15, n) > 0.5).astype(int)
    # Ensure both outcomes exist for classifier training
    counts = np.bincount(approved, minlength=2)
    if counts[0] < 50:
        approved[rng.choice(n, size=50, replace=False)] = 0
    if counts[1] < 50:
        approved[rng.choice(n, size=50, replace=False)] = 1

    return features, credit_scores, approved





def train_and_save_models() -> None:

    global _regressor, _classifier

    if not _ml_available:

        return

    classifier_path = MODEL_DIR / "approval_classifier.joblib"

    regressor_path = MODEL_DIR / "credit_score_regressor.joblib"
    meta_path = MODEL_DIR / "model_meta.json"

    if classifier_path.exists() and regressor_path.exists() and meta_path.exists():
        try:
            meta = json.loads(meta_path.read_text())
            if meta.get("version") == MODEL_VERSION:
                _regressor = joblib.load(regressor_path)
                _classifier = joblib.load(classifier_path)
                return
        except Exception:
            classifier_path.unlink(missing_ok=True)
            regressor_path.unlink(missing_ok=True)
            meta_path.unlink(missing_ok=True)

    X, y_score, y_approve = _generate_training_data()

    X_train, _, ys_train, _, ya_train, _ = train_test_split(
        X, y_score, y_approve, test_size=0.2, random_state=42
    )
    if len(np.unique(ya_train)) < 2:
        ya_train[0] = 0
        ya_train[1] = 1

    _regressor = GradientBoostingRegressor(n_estimators=120, max_depth=5, learning_rate=0.08, subsample=0.85, random_state=42)

    _regressor.fit(X_train, ys_train)

    _classifier = GradientBoostingClassifier(n_estimators=120, max_depth=5, learning_rate=0.08, subsample=0.85, random_state=42)

    try:
        _classifier.fit(X_train, ya_train)
    except ValueError:
        _classifier = None

    joblib.dump(_regressor, regressor_path)

    if _classifier is not None:
        joblib.dump(_classifier, classifier_path)
    meta_path.write_text(json.dumps({"version": MODEL_VERSION, "samples": len(X)}))





def _rule_based_score(

    income: float, mobile: float, utility: int, dti: float, emp: float,

    existing: int, loan_amount: float, loan_type: str = "personal",

) -> tuple[int, float]:

    config = LOAN_TYPE_CONFIG.get(loan_type.lower(), LOAN_TYPE_CONFIG["personal"])

    alt_boost = (mobile / (income + 1)) * 30 + utility * 0.3

    thin_boost = alt_boost * 0.5 if existing < 500 else 0

    base = existing if existing > 0 else 550

    credit_score = int(max(300, min(850, base * 0.4 + alt_boost + thin_boost + income / 100 - dti * 80 + emp * 50)))

    approve_prob = max(0.05, min(0.98, 1 / (1 + pow(2.718, -((credit_score - 550) / 60 + dti * 3)))))

    if existing < 500 and mobile > income * 0.3:

        credit_score = min(850, credit_score + 25)

        approve_prob = min(0.98, approve_prob + 0.1)

    if dti > config["max_dti"]:

        credit_score = max(300, credit_score - 40)

        approve_prob = max(0.05, approve_prob - 0.2)

    approve_prob = max(0.05, min(0.98, approve_prob / config["risk_weight"]))

    return credit_score, approve_prob





def predict_credit(

    monthly_income: float,

    employment_status: str,

    loan_amount: float,

    loan_term_months: int,

    existing_credit_score: int,

    mobile_money_avg: float,

    utility_payment_score: int,

    loan_type: str = "personal",

    sector_details: dict[str, Any] | None = None,

) -> dict[str, Any]:

    income = max(monthly_income, 1)

    mobile = mobile_money_avg if mobile_money_avg > 0 else income * 0.5

    utility = max(0, min(100, utility_payment_score))

    dti = loan_amount / (income * 12 + 1)

    emp = _encode_employment(employment_status)

    existing = existing_credit_score if existing_credit_score > 0 else 0

    loan_type = (loan_type or "personal").lower()

    config = LOAN_TYPE_CONFIG.get(loan_type, LOAN_TYPE_CONFIG["personal"])



    if _ml_available and _regressor is not None and _classifier is not None:

        sector_input = {**(sector_details or {}), "loanAmount": str(loan_amount)}
        sector_vec = _sector_feature_vector(loan_type, sector_input, loan_amount)

        features = np.array([[
            income, mobile, utility, dti, loan_term_months, existing, emp, _encode_loan_type(loan_type),
            *sector_vec,
        ]])

        credit_score = int(np.clip(_regressor.predict(features)[0], 300, 850))

        approve_prob = float(_classifier.predict_proba(features)[0][1])

        if existing < 500 and mobile > income * 0.3:

            credit_score = min(850, credit_score + 25)

            approve_prob = min(0.98, approve_prob + 0.1)

    else:

        credit_score, approve_prob = _rule_based_score(

            income, mobile, utility, dti, emp, existing, loan_amount, loan_type

        )



    score_delta, prob_delta, sector_factors = _sector_adjustment(loan_type, sector_details)

    credit_score = int(max(300, min(850, credit_score + score_delta)))

    approve_prob = max(0.05, min(0.98, approve_prob + prob_delta))



    if dti > config["max_dti"]:

        approve_prob = max(0.05, approve_prob - 0.15)



    recommended = loan_amount * (0.9 if approve_prob >= 0.7 else 0.7 if approve_prob >= 0.5 else 0.5)

    apr = max(config["base_apr"], config["base_apr"] + 8 - (credit_score - 300) / 50)

    recommendation = "APPROVE" if approve_prob >= 0.75 else "REJECT" if approve_prob < 0.4 else "REVIEW"



    factors = [

        {"name": "Credit Score", "value": min(100, int((credit_score - 300) / 5.5))},

        {"name": "Income", "value": min(100, int(income / 100))},

        {"name": "Debt-to-Income", "value": max(0, 100 - int(dti * 200))},

        {"name": "Employment", "value": int(emp * 100)},

        {"name": "Mobile Money", "value": min(100, int(mobile / income * 40))},

        {"name": "Utility Payments", "value": utility},

    ] + sector_factors



    amounts = [5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000, 2000000]

    amount_options = [

        {"name": _format_kes(a), "value": min(100, int(approve_prob * 100 * (1 - abs(a - recommended) / (recommended + 1))))}

        for a in amounts if a <= loan_amount * 2 or a <= 500000

    ]



    type_label = loan_type.replace("_", " ").title()

    summary = (

        f"{type_label} loan assessment using salary ({_format_kes(income)}/mo), mobile money ({_format_kes(mobile)}/mo avg), "

        f"utility score ({utility}/100). Credit score: {credit_score}. Approval probability: {approve_prob:.0%}. "

        f"Estimated APR: {apr:.1f}%."

    )

    return {

        "credit_score": credit_score,

        "approval_probability": round(approve_prob, 4),

        "recommended_amount": round(recommended, 2),

        "estimated_apr": round(apr, 2),

        "recommendation": recommendation,

        "summary": summary,

        "factors": factors,

        "amount_options": amount_options,

        "loan_type": loan_type,

    }

