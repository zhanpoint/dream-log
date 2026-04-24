"""Backward-compatible worker entry point."""

from app.cli import run_worker_command

def main() -> None:
    run_worker_command()


if __name__ == "__main__":
    main()
