# payments/daraja.py
import base64
from django.conf import settings
from django.utils import timezone

import requests

DEFAULT_MPESA_AUTH_URL = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
DEFAULT_MPESA_STK_URL = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SmartOnlineMarketPlace/1.0"


def _require_setting(name: str) -> str:
    val = getattr(settings, name, None)
    if val is None:
        raise ValueError(f"Missing setting: {name}")
    val = str(val).strip()
    if not val:
        raise ValueError(f"Missing setting: {name}")
    return val


def normalize_phone(phone: str) -> str:
    """
    Accepts: 07..., 7..., 2547..., +2547...
    Returns: 2547XXXXXXXX
    """
    p = (phone or "").strip().replace(" ", "").replace("-", "")
    if p.startswith("+"):
        p = p[1:]
    if p.startswith("0") and len(p) == 10:
        p = "254" + p[1:]
    if p.startswith("7") and len(p) == 9:
        p = "254" + p
    return p


def get_access_token() -> str:
    consumer_key = _require_setting("MPESA_CONSUMER_KEY")
    consumer_secret = _require_setting("MPESA_CONSUMER_SECRET")

    auth = base64.b64encode(f"{consumer_key}:{consumer_secret}".encode("utf-8")).decode("utf-8")

    headers = {
        "Authorization": f"Basic {auth}",
        "Accept": "application/json",
        "User-Agent": UA,
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
    }

    auth_url = getattr(settings, "MPESA_AUTH_URL", "") or DEFAULT_MPESA_AUTH_URL

    try:
        s = requests.Session()
        s.trust_env = False  # ignore proxy env vars
        resp = s.get(auth_url, headers=headers, timeout=30)

        if resp.status_code != 200:
            # Safaricom sandbox sometimes returns empty body via WAF; include headers for debugging
            raise ValueError(
                f"M-Pesa auth failed ({resp.status_code}). "
                f"Body: {resp.text!r}. "
                f"Headers: {dict(resp.headers)}"
            )

        data = resp.json()
        token = data.get("access_token")
        if not token:
            raise ValueError(f"No access_token in M-Pesa auth response: {data}")

        return token

    except requests.RequestException as e:
        raise ValueError(f"M-Pesa auth request failed: {str(e)}") from e


def _mock_stk_response(phone: str):
    """
    Mimic Daraja behavior in dev.
    - 254708374149 -> success
    - 254708374150 -> fail
    """
    ts = int(timezone.now().timestamp())
    checkout = f"ws_CO_{ts}"
    merchant = f"mock_{ts}"

    if phone == "254708374150":
        return {
            "ResponseCode": "1",
            "ResponseDescription": "Mock: rejected",
            "CheckoutRequestID": checkout,
            "MerchantRequestID": merchant,
            "_http_status": 200,
        }

    # default success (including 254708374149)
    return {
        "ResponseCode": "0",
        "ResponseDescription": "Mock STK Push initiated",
        "CheckoutRequestID": checkout,
        "MerchantRequestID": merchant,
        "_http_status": 200,
    }


def stk_push(phone_number, amount, account_reference, callback_url):
    """
    Returns Daraja JSON (success or error-like dict).
    Never raises requests exceptions to calling code (we convert to dict).
    """
    try:
        # allow passing empty callback_url, fallback to settings
        if not callback_url:
            callback_url = getattr(settings, "MPESA_STK_CALLBACK_URL", "") or getattr(settings, "MPESA_CALLBACK_URL", "")

        if not callback_url or not str(callback_url).startswith(("http://", "https://")):
            raise ValueError("Invalid callback_url. Must be a full http(s) URL.")

        phone = normalize_phone(phone_number)

        # ✅ Mock mode: skip real Daraja (useful when OAuth blocked)
        if getattr(settings, "MPESA_MOCK", False):
            return _mock_stk_response(phone)

        shortcode = _require_setting("MPESA_SHORTCODE")
        passkey = _require_setting("MPESA_PASSKEY")
        token = get_access_token()

        # Daraja expects an integer amount (>= 1)
        amt = int(float(amount))
        if amt < 1:
            amt = 1

        now = timezone.localtime(timezone.now())
        timestamp = now.strftime("%Y%m%d%H%M%S")
        password = base64.b64encode(f"{shortcode}{passkey}{timestamp}".encode("utf-8")).decode("utf-8")

        payload = {
            "BusinessShortCode": shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amt,
            "PartyA": phone,
            "PartyB": shortcode,
            "PhoneNumber": phone,
            "CallBackURL": str(callback_url),
            "AccountReference": str(account_reference),
            "TransactionDesc": f"Payment for order {account_reference}",
        }

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": UA,
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
        }

        stk_url = getattr(settings, "MPESA_STK_URL", "") or DEFAULT_MPESA_STK_URL

        s = requests.Session()
        s.trust_env = False
        resp = s.post(stk_url, json=payload, headers=headers, timeout=30)

        try:
            data = resp.json()
        except Exception:
            data = {
                "ResponseCode": "1",
                "ResponseDescription": "Non-JSON response from Daraja",
                "status_code": resp.status_code,
                "text": resp.text,
            }

        data["_http_status"] = resp.status_code
        return data

    except Exception as e:
        return {
            "ResponseCode": "1",
            "ResponseDescription": str(e),
            "error": str(e),
        }
