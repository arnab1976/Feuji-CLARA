#!/usr/bin/env python
import os
import sys


def main():
    try:
        from dotenv import load_dotenv
        from pathlib import Path
        load_dotenv(Path(__file__).resolve().parent.parent / ".env")
        load_dotenv(Path(__file__).resolve().parent / ".env")
    except Exception:
        pass
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "crosssell.settings")
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
