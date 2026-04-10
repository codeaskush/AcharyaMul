from datetime import date

import nepali_datetime


def ad_to_bs(ad_date: date | None) -> str | None:
    if ad_date is None:
        return None
    try:
        bs_date = nepali_datetime.date.from_datetime_date(ad_date)
        return bs_date.strftime("%Y-%m-%d")
    except (ValueError, OverflowError):
        return None


def date_to_display(ad_date: date | None) -> dict | None:
    if ad_date is None:
        return None
    return {
        "ad": ad_date,
        "bs": ad_to_bs(ad_date),
    }
