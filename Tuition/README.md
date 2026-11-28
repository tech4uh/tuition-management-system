# Tuition Management System

A web-based Tuition Management System designed to simplify batch/group organization, student profile management, and teacher operations through a clean, unified dashboard.

## Live Demo
🔗 **Live Application:** [https://tuition-management-system-self.vercel.app/](https://tuition-management-system-self.vercel.app/)

---

## Key Features
- **Teacher Login & Authentication:** Dedicated teacher login to securely access and manage tuition operations.
- **Batch & Group Management:** Create, organize, and manage separate batches or subject groups effortlessly.
- **Student Profiles:** Maintain complete student records, personal details, and group assignments in one place.
- **Interactive Dashboard:** Quick and intuitive interface to add, view, and update student and group information.
- **Monthly Fees:** The first fee becomes due one month after the student's joining date.

---

## How to Use
1. Visit the live application: [tuition-management-system-self.vercel.app](https://tuition-management-system-self.vercel.app/)
2. Log in using **Teacher Credentials**.
3. Create tuition batches or groups from the dashboard.
4. Add student profiles and assign them to their respective groups.

---

## Offline Use
- Open the app and log in once while online so its files and your account are available on this device.
- Install the app from your browser if you want to open it like a standalone app. The first visit/install needs internet.
- After that, groups, students, payments, and profile edits are saved on this device while offline.
- Pending changes sync automatically when the internet returns. Keep the app's browser data and account until it reconnects; use **Profile → Backup** for an extra copy.
- Offline changes are device-local until synced, so they will not appear on another device without an internet connection.
- If the same account is edited on another device while this one is offline, this device's pending copy syncs first. Avoid editing the same account on multiple devices until sync completes.

---

## Run Locally

```bash
# Clone the repository
git clone [https://github.com/tech4uh/tuition-management-system.git](https://github.com/tech4uh/tuition-management-system.git)

# Navigate to the project folder
cd tuition-management-system

# Install dependencies (if applicable)
npm install

# Start the development server
npm run dev
