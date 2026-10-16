#!/usr/bin/env python3
"""
RC-S380 タップ連携ブリッジ

ICカード（FeliCa、社員証など）をRC-S380にかざすと、
1) Supabase（ic_card_taps テーブル）にタップ記録を書き込み
2) 既定のブラウザで勤怠管理システムを開きます

Webアプリ側が、登録済みのカードであれば該当スタッフの
「今日を申請する」画面を自動で開き、時間外終了時刻を自動入力します。
（カードとスタッフの結びつけは、Webアプリの管理画面「ICカード」タブで行います）

── セットアップ（初回のみ）────────────────────────────────────────────
1. RC-S380 をPCにUSB接続する
2. Zadig (https://zadig.akeo.ie/) を使って、RC-S380 のドライバを
   「libusb-win32」または「WinUSB」に切り替える
   （Sony純正ドライバのままだと、このスクリプトからは読み取れません）
3. Python をインストールしていなければインストールする
4. このフォルダで次を実行する:
     pip install -r requirements.txt

── 実行 ────────────────────────────────────────────────────────────
     python tap_bridge.py

終了するには Ctrl+C を押してください。
PC起動時に自動で立ち上げたい場合は、Windowsのタスクスケジューラに
「ログオン時に実行」として登録してください。
"""

import time
import webbrowser
from datetime import datetime

import nfc
import requests

# ── 設定 ──────────────────────────────────────────────────────────────
SUPABASE_URL = "https://fjcvfytvwzfnmzqenijd.supabase.co"
SUPABASE_ANON_KEY = "sb_publishable_CHMeD996bMgWccBUhqft0g_kXZjNRob"
APP_URL = "https://clinic-attendance-bay.vercel.app"
COOLDOWN_SECONDS = 5  # 同じカードを連続で検知しないようにする間隔（秒）

HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}


def record_tap(idm: str) -> bool:
    """Supabase の ic_card_taps テーブルにタップ記録を書き込む"""
    tap_id = f"tap-{int(time.time() * 1000)}"
    payload = {
        "id": tap_id,
        "idm": idm,
        "tapped_at": datetime.now().astimezone().isoformat(),
        "consumed": False,
    }
    try:
        res = requests.post(
            f"{SUPABASE_URL}/rest/v1/ic_card_taps",
            headers=HEADERS,
            json=payload,
            timeout=10,
        )
    except requests.RequestException as e:
        print(f"⚠️ 通信エラー: {e}")
        return False

    if res.status_code >= 300:
        print(f"⚠️ Supabase書き込み失敗: {res.status_code} {res.text}")
        return False
    return True


def main():
    print("RC-S380 タップ連携ブリッジを起動しました。")
    print("カードリーダーにICカードをかざしてください（Ctrl+Cで終了）。\n")

    last_idm = None
    last_time = 0.0

    with nfc.ContactlessFrontend("usb") as clf:
        while True:
            tag = clf.connect(rdwr={"on-connect": lambda tag: False})
            if tag is None:
                continue

            idm = tag.identifier.hex()
            now = time.time()
            if idm == last_idm and (now - last_time) < COOLDOWN_SECONDS:
                continue  # 同じカードが乗ったままの連続検知を無視

            last_idm = idm
            last_time = now

            print(f"📇 カード検知: {idm}")
            if record_tap(idm):
                print("✅ 記録しました。ブラウザを開きます…\n")
                webbrowser.open(APP_URL)
            time.sleep(1)


if __name__ == "__main__":
    main()
