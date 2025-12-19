# Deployment Guidelines

- Provision Raspberry Pi devices via Ansible playbooks under `deployment/ansible`.
- Keep roles modular (`hotspot`, `backend`, `frontend`); share defaults through group vars.
- Store hotspot configs as Jinja templates in `infrastructure/templates`; render with secrets provided via Ansible Vault.
- Scripts in `deployment/scripts` must be idempotent and safe to re-run.
- Manage services with systemd units (e.g., `meeting-backend.service`, `meeting-frontend.service`).
- Document external dependencies (hostapd, dnsmasq, Redis, PostgreSQL) and ensure they start on boot.
- Capture logs with `journalctl` instructions and rotate using `logrotate`.

