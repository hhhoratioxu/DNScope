# Security policy

## Supported versions

Security fixes are applied to the latest release of DNScope.

## Reporting a vulnerability

Please do not publish a working exploit in a public issue. Open a GitHub
Security Advisory for this repository, or contact the maintainer through the
email address listed on the GitHub profile.

Include the affected version, operating system, reproduction steps, and the
impact you observed. You should receive an acknowledgement within seven days.

## Network and privacy model

DNScope performs DNS requests directly from the user's device to the selected
resolver. Version 0.1 supports classic UDP DNS on port 53, which is not
encrypted. Network operators and the selected resolver may therefore observe
the queried domain names.

DNScope includes no analytics, advertising, account system, or remote telemetry.
Benchmark history is stored locally in the application's browser storage.
