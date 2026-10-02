---
updated: 2026-10-02
---

Ecosystems group projects on the [Ecosystems](/docs/contributors/ecosystems) page and in the Browse filters. You add, edit and remove them in **Ecosystems**, its own entry in the admin sidebar.

![Ecosystem Management, showing ecosystem cards with project and contributor counts](shot:admin-ecosystems-grid "Ecosystem Management")

Each card shows the ecosystem's logo, name, number of **Projects** and **Contributors**, its description, a **Visit Website** link if it has one, and its status.

## Add an ecosystem

1. **Choose Add New Ecosystem.**
2. **Fill in the details.**
   - **Ecosystem Name** is required: 2 to 100 characters, using letters, numbers, spaces and hyphens.
   - **Description** is optional, 10 to 500 characters. It appears on its card.
   - **Website URL** is optional and must start with `http://` or `https://`.
   - **Status** is **Active** or **Inactive**. Only active ecosystems are shown to contributors.
   - **About (detail page)** is a longer description for the ecosystem's own page.
3. **Upload a logo, if you have one.** Under **Logo (optional)**, choose **Upload image**. SVG, PNG, JPG and GIF files under 5MB are accepted. A preview appears next to the button.

   ![The Add New Ecosystem window with a name, description and logo preview](shot:admin-ecosystem-add-modal "Add New Ecosystem")

4. **Add detail-page content, if you want it.** Use **Add link** under **Links (detail page)**, **Add key area** under **Key Areas (detail page)** and **Add technology** under **Technologies (detail page)**. Empty rows are ignored.
5. **Choose Add Ecosystem.**

An ecosystem without a logo shows the first letter of its name instead.

## Edit an ecosystem

1. **Choose the pencil on its card.** The **Edit Ecosystem** window opens with the current details.
2. **Change what you need.** The fields are the same as when adding.
3. **Replace the logo, if needed.** Choose **Upload new image**. Leave it alone to keep the current logo. There is no way to remove a logo without replacing it.

   ![The Edit Ecosystem window with the current logo shown](shot:admin-ecosystem-edit-modal "Edit Ecosystem")

4. **Choose Update Ecosystem.** You'll see **Ecosystem updated successfully**.

Setting an ecosystem to **Inactive** hides it from contributors without deleting it. Its projects keep their ecosystem.

## Delete an ecosystem

1. **Choose the bin on its card.**
2. **Confirm with Delete.** Deleting cannot be undone.

   ![The Delete Ecosystem confirmation](shot:admin-ecosystem-delete-modal "Only an ecosystem with no projects can be deleted")

> [!WARNING]
> You can only delete an ecosystem that has no associated projects. If any project still belongs to it, the delete is refused. To take it out of view instead, set it to **Inactive**.
