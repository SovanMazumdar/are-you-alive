document.addEventListener("DOMContentLoaded", () => {
    const tabs = document.querySelectorAll("[data-settings-tab]");
    const panels = document.querySelectorAll("[data-settings-panel]");
    const profileForm = document.getElementById("profile-form");
    const profileStatus = document.getElementById("profile-save-status");

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const target = tab.dataset.settingsTab;

            tabs.forEach((item) => {
                const isActive = item === tab;
                item.classList.toggle("active", isActive);
                item.setAttribute("aria-selected", String(isActive));
            });

            panels.forEach((panel) => {
                panel.hidden = panel.dataset.settingsPanel !== target;
            });
        });
    });

    async function loadProfile() {
        try {
            const response = await fetch("/api/profile");
            if (!response.ok) {
                throw new Error("Unable to load profile");
            }

            const profile = await response.json();
            Object.entries(profile).forEach(([key, value]) => {
                const field = profileForm?.elements[key];
                if (field) {
                    field.value = value || "";
                }
            });
        } catch (error) {
            if (profileStatus) {
                profileStatus.textContent = "Profile details could not be loaded.";
            }
        }
    }

    profileForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        profileStatus.textContent = "Saving profile...";

        const data = Object.fromEntries(new FormData(profileForm).entries());

        try {
            const response = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error("Unable to save profile");
            }

            profileStatus.textContent = "Profile saved.";
        } catch (error) {
            profileStatus.textContent = "Profile could not be saved. Please try again.";
        }
    });

    loadProfile();
});
