from datetime import UTC, datetime, timedelta, timezone

from app.utils.datetime import ensure_tz, ensure_utc, isoformat_utc


def test_ensure_utc_coerces_naive():
    naive = datetime(2025, 1, 1, 12, 30)  # noqa: DTZ001
    ensured = ensure_utc(naive)
    assert ensured.tzinfo == UTC
    assert ensured.hour == 12


def test_ensure_utc_preserves_zone():
    aware = datetime(2025, 1, 1, 12, 30, tzinfo=timezone(timedelta(hours=2)))
    ensured = ensure_utc(aware)
    assert ensured.tzinfo == UTC


def test_isoformat_utc_uses_z_suffix():
    dt = datetime(2025, 1, 1, 0, 0, tzinfo=UTC)
    assert isoformat_utc(dt).endswith("Z")


def test_ensure_tz_sets_timezone():
    dt = datetime(2025, 1, 1, 10, 0)  # noqa: DTZ001
    custom_tz = UTC
    localized = ensure_tz(dt, custom_tz)
    assert localized.tzinfo == custom_tz
