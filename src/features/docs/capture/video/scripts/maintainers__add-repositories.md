# Add your repositories

Length target: 60-90 seconds. Persona: maintainer. Start: /dashboard?tab=maintainers&view=maintainer

## 1
Say: [calm] Your repositories come to Grainlify through the Grainlify GitHub App. You choose which repositories it can see, and ONLY public ones are ever listed.
Do: Show the Maintainers page on the **Dashboard** tab, signed in as owen-maintains.

## 2
Say: [friendly] Open the repository selector. Your repositories are grouped by owner, and Add a repository is at the bottom.
Do: Click **Select repositories**. Click the owner name "owen-labs" to expand it. Move the pointer to **Add a repository**.

## 3
Say: [matter-of-fact] Grainlify shows what the app asks GitHub for. [pause] It reads your code, pull requests and organisation members, and it can write to issues, so it can post comments and assign contributors.
Do: Click **Add a repository**. The **Install Grainlify GitHub App** window opens. Scroll slowly past **Required permissions** to **You stay in control**.

## 4
Say: [confident] Choose Install GitHub App and GitHub opens. Pick only the repositories you want on Grainlify, then install.
Do: Point at **Install GitHub App** without clicking, then click **Cancel**. Cut to a title card: "On GitHub: choose Only select repositories, pick yours, and install."

## 5
Say: [reassuring] GitHub sends you back to Grainlify's Discover page, in the contributor view. Your repositories are being added in the background.
Do: Load /dashboard?github_app_installed=true (fixture with owen-labs/relay-sdk needing setup). Discover shows.

## 6
Say: [warmly] Switch to the maintainer view... After a moment, a setup window opens for one of your new repositories.
Do: Click **MAINTAINER**. Wait for the **New Project Setup** window for owen-labs/relay-sdk.

## 7
Say: [pleased] Fill it in and save, and the project is listed for contributors. If you added several repositories, the others wait in the selector with Complete setup beside them.
Do: Choose an ecosystem from **Select an ecosystem**, click **Save & Continue**. The window shows **Project details saved.** and closes. Click **Select repositories**, expand "owen-labs", and point at relay-sdk, which now shows **Edit**.
