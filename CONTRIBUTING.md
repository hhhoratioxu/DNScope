# Contributing to DNScope

Thanks for helping improve DNScope.

1. Fork the repository and create a focused branch.
2. Install dependencies with `npm install`.
3. Run `npm run check` before opening a pull request.
4. Describe the user-visible change and include screenshots for interface work.

Please keep network operations in the Electron main process. The renderer must
not receive unrestricted Node.js access, raw IPC access, or secrets.

Bug reports should include the DNScope version, operating system, selected
resolver, record type, and a minimal domain that reproduces the problem. Remove
private hostnames and local IP addresses before sharing logs publicly.
